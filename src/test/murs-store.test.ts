import { beforeEach, describe, expect, it } from 'vitest'
import { useProjectStore } from '../store/useProjectStore'
import type { Projet } from '../types'

function reset() {
  useProjectStore.setState((s) => ({
    projet: {
      ...s.projet,
      murs: [],
      plan: { ...s.projet.plan, echelle: { pxParMetre: 100, coteSur: 'test' }, hauteurSousPlafond: 2.5 },
    },
    selection: [],
    outil: { kind: 'select' },
    pointsMurEnCours: null,
    past: [],
    future: [],
  }))
}

describe('tracé de mur', () => {
  beforeEach(reset)

  it('clicMur + finaliserMur crée un mur avec l’épaisseur par défaut', () => {
    useProjectStore.getState().setOutil({ kind: 'mur' })
    useProjectStore.getState().clicMur({ x: 0, y: 0 })
    useProjectStore.getState().clicMur({ x: 300, y: 0 })
    const id = useProjectStore.getState().finaliserMur()

    const mur = useProjectStore.getState().projet.murs.find((m) => m.id === id)!
    expect(mur).toBeDefined()
    expect(mur.points).toEqual([{ x: 0, y: 0 }, { x: 300, y: 0 }])
    expect(mur.epaisseurM).toBeGreaterThan(0)
    expect(useProjectStore.getState().outil.kind).toBe('select')
  })

  it('refuse de créer un mur avec moins de 2 points', () => {
    useProjectStore.getState().setOutil({ kind: 'mur' })
    useProjectStore.getState().clicMur({ x: 0, y: 0 })
    const id = useProjectStore.getState().finaliserMur()
    expect(id).toBe('')
    expect(useProjectStore.getState().projet.murs).toHaveLength(0)
  })

  it('annulerMur ne crée aucun mur', () => {
    useProjectStore.getState().setOutil({ kind: 'mur' })
    useProjectStore.getState().clicMur({ x: 0, y: 0 })
    useProjectStore.getState().clicMur({ x: 300, y: 0 })
    useProjectStore.getState().annulerMur()
    expect(useProjectStore.getState().projet.murs).toHaveLength(0)
    expect(useProjectStore.getState().pointsMurEnCours).toBeNull()
  })

  it('updateMur modifie l’épaisseur sans toucher au tracé', () => {
    useProjectStore.getState().setOutil({ kind: 'mur' })
    useProjectStore.getState().clicMur({ x: 0, y: 0 })
    useProjectStore.getState().clicMur({ x: 300, y: 0 })
    const id = useProjectStore.getState().finaliserMur()

    useProjectStore.getState().updateMur(id, { epaisseurM: 0.2 })
    const mur = useProjectStore.getState().projet.murs.find((m) => m.id === id)!
    expect(mur.epaisseurM).toBe(0.2)
    expect(mur.points).toEqual([{ x: 0, y: 0 }, { x: 300, y: 0 }])
  })

  it('supprimerMur retire le mur du projet', () => {
    useProjectStore.getState().setOutil({ kind: 'mur' })
    useProjectStore.getState().clicMur({ x: 0, y: 0 })
    useProjectStore.getState().clicMur({ x: 300, y: 0 })
    const id = useProjectStore.getState().finaliserMur()

    useProjectStore.getState().supprimerMur(id)
    expect(useProjectStore.getState().projet.murs).toHaveLength(0)
  })

  it('chargerProjet accepte un projet enregistré avant l’introduction des murs (champ absent)', () => {
    const { murs: _murs, ...projetSansMurs } = useProjectStore.getState().projet
    useProjectStore.getState().chargerProjet(projetSansMurs as unknown as Projet)
    expect(useProjectStore.getState().projet.murs).toEqual([])
  })
})
