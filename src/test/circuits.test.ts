import { beforeEach, describe, expect, it } from 'vitest'
import { useProjectStore } from '../store/useProjectStore'

function reset() {
  useProjectStore.setState((s) => ({
    projet: {
      ...s.projet,
      organes: [],
      pieces: [],
      circuits: [],
      cheminements: [],
      tableaux: [],
      plan: { ...s.projet.plan, echelle: { pxParMetre: 100, coteSur: 'test' }, hauteurSousPlafond: 2.5 },
    },
    selection: [],
    outil: { kind: 'select' },
    pointsCableEnCours: null,
    past: [],
    future: [],
  }))
}

describe('tableau divisionnaire', () => {
  beforeEach(reset)

  it('poserTableau crée un tableau avec les 2 différentiels minimum (type A et AC)', () => {
    const id = useProjectStore.getState().poserTableau('divisionnaire', 50, 60)
    const tableau = useProjectStore.getState().projet.tableaux.find((t) => t.id === id)
    expect(tableau).toBeDefined()
    expect(tableau!.differentiels).toHaveLength(2)
    expect(tableau!.differentiels.map((d) => d.type).sort()).toEqual(['A', 'AC'])
  })
})

describe('création de circuit', () => {
  beforeEach(reset)

  it('suggère automatiquement la section/calibre du circuit prises générales (2,5 mm² / 20 A, différentiel AC)', () => {
    useProjectStore.getState().poserTableau('divisionnaire', 0, 0)
    const idOrgane = useProjectStore.getState().ajouterOrgane('prise16A', 10, 10)
    const idCircuit = useProjectStore.getState().creerCircuit([idOrgane])

    const circuit = useProjectStore.getState().projet.circuits.find((c) => c.id === idCircuit)!
    expect(circuit.sectionMm2).toBe(2.5)
    expect(circuit.calibreA).toBe(20)

    const tableau = useProjectStore.getState().projet.tableaux[0]!
    const differentiel = tableau.differentiels.find((d) => d.id === circuit.ddrId)!
    expect(differentiel.type).toBe('AC')

    const organe = useProjectStore.getState().projet.organes.find((o) => o.id === idOrgane)!
    expect(organe.circuitId).toBe(idCircuit)
  })

  it('suggère 6 mm² / 32 A et un différentiel de type A pour la plaque de cuisson', () => {
    useProjectStore.getState().poserTableau('divisionnaire', 0, 0)
    const idOrgane = useProjectStore.getState().ajouterOrgane('alim-plaque', 10, 10)
    const idCircuit = useProjectStore.getState().creerCircuit([idOrgane])

    const circuit = useProjectStore.getState().projet.circuits.find((c) => c.id === idCircuit)!
    expect(circuit.sectionMm2).toBe(6)
    expect(circuit.calibreA).toBe(32)

    const tableau = useProjectStore.getState().projet.tableaux[0]!
    const differentiel = tableau.differentiels.find((d) => d.id === circuit.ddrId)!
    expect(differentiel.type).toBe('A')
  })

  it('déplacer un organe vers un nouveau circuit le retire proprement de l’ancien', () => {
    const idOrgane = useProjectStore.getState().ajouterOrgane('prise16A', 10, 10)
    const idCircuit1 = useProjectStore.getState().creerCircuit([idOrgane])
    const idCircuit2 = useProjectStore.getState().creerCircuit([idOrgane])

    const { circuits, organes } = useProjectStore.getState().projet
    const circuit1 = circuits.find((c) => c.id === idCircuit1)!
    const circuit2 = circuits.find((c) => c.id === idCircuit2)!
    expect(circuit1.organes).not.toContain(idOrgane)
    expect(circuit2.organes).toContain(idOrgane)
    expect(organes.find((o) => o.id === idOrgane)!.circuitId).toBe(idCircuit2)
  })
})

describe('tracé de câble', () => {
  beforeEach(reset)

  it('clicCable + finaliserCable produit un cheminement rattaché au bon organe et circuit', () => {
    const idTableau = useProjectStore.getState().poserTableau('divisionnaire', 500, 500)
    const idOrgane = useProjectStore.getState().ajouterOrgane('prise16A', 10, 10)
    const idCircuit = useProjectStore.getState().creerCircuit([idOrgane])

    useProjectStore.getState().setOutil({ kind: 'cable', circuitId: idCircuit, organeId: idOrgane, mode: 'plafond' })
    useProjectStore.getState().clicCable({ x: 10, y: 10 })
    useProjectStore.getState().clicCable({ x: 500, y: 500 })
    useProjectStore.getState().finaliserCable()

    const cheminements = useProjectStore.getState().projet.cheminements
    expect(cheminements).toHaveLength(1)
    expect(cheminements[0]!.deOrgane).toBe(idOrgane)
    expect(cheminements[0]!.circuitId).toBe(idCircuit)
    expect(cheminements[0]!.versNoeud).toBe(idTableau)
    expect(useProjectStore.getState().outil.kind).toBe('select')
  })

  it('annulerCable ne produit aucun cheminement', () => {
    const idOrgane = useProjectStore.getState().ajouterOrgane('prise16A', 10, 10)
    const idCircuit = useProjectStore.getState().creerCircuit([idOrgane])
    useProjectStore.getState().setOutil({ kind: 'cable', circuitId: idCircuit, organeId: idOrgane, mode: 'plafond' })
    useProjectStore.getState().clicCable({ x: 10, y: 10 })
    useProjectStore.getState().annulerCable()
    expect(useProjectStore.getState().projet.cheminements).toHaveLength(0)
  })

  it('retracer un câble remplace le précédent au lieu de le dupliquer', () => {
    useProjectStore.getState().poserTableau('divisionnaire', 500, 500)
    const idOrgane = useProjectStore.getState().ajouterOrgane('prise16A', 10, 10)
    const idCircuit = useProjectStore.getState().creerCircuit([idOrgane])

    useProjectStore.getState().setOutil({ kind: 'cable', circuitId: idCircuit, organeId: idOrgane, mode: 'plafond' })
    useProjectStore.getState().clicCable({ x: 10, y: 10 })
    useProjectStore.getState().clicCable({ x: 200, y: 200 })
    useProjectStore.getState().finaliserCable()

    useProjectStore.getState().setOutil({ kind: 'cable', circuitId: idCircuit, organeId: idOrgane, mode: 'sol' })
    useProjectStore.getState().clicCable({ x: 10, y: 10 })
    useProjectStore.getState().clicCable({ x: 500, y: 500 })
    useProjectStore.getState().finaliserCable()

    const cheminements = useProjectStore.getState().projet.cheminements
    expect(cheminements).toHaveLength(1)
    expect(cheminements[0]!.mode).toBe('sol')
  })

  it('supprimer un organe câblé retire aussi son cheminement et sa place dans le circuit', () => {
    useProjectStore.getState().poserTableau('divisionnaire', 500, 500)
    const idOrgane = useProjectStore.getState().ajouterOrgane('prise16A', 10, 10)
    const idCircuit = useProjectStore.getState().creerCircuit([idOrgane])
    useProjectStore.getState().setOutil({ kind: 'cable', circuitId: idCircuit, organeId: idOrgane, mode: 'plafond' })
    useProjectStore.getState().clicCable({ x: 10, y: 10 })
    useProjectStore.getState().clicCable({ x: 500, y: 500 })
    useProjectStore.getState().finaliserCable()

    useProjectStore.getState().supprimerOrganes([idOrgane])

    const { circuits, cheminements } = useProjectStore.getState().projet
    expect(cheminements).toHaveLength(0)
    expect(circuits.find((c) => c.id === idCircuit)!.organes).not.toContain(idOrgane)
  })
})
