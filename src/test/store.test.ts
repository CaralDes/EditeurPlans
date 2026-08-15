import { beforeEach, describe, expect, it } from 'vitest'
import { useProjectStore } from '../store/useProjectStore'

function reset() {
  useProjectStore.setState((s) => ({
    projet: { ...s.projet, organes: [], pieces: [], circuits: [], cheminements: [], tableaux: [] },
    selection: [],
    past: [],
    future: [],
  }))
}

describe('ajouterOrgane — hauteur par défaut', () => {
  beforeEach(reset)

  it('une prise 16 A se pose à 5 cm (basse), pas à 0', () => {
    const id = useProjectStore.getState().ajouterOrgane('prise16A', 100, 100)
    const o = useProjectStore.getState().projet.organes.find((x) => x.id === id)
    expect(o?.pose).toBe('basse')
    expect(o?.hauteurM).toBeCloseTo(0.05)
  })

  it('une prise 32 A (plaque) se pose à 12 cm, pas à 1,30 m', () => {
    const id = useProjectStore.getState().ajouterOrgane('prise32A', 100, 100)
    const o = useProjectStore.getState().projet.organes.find((x) => x.id === id)
    expect(o?.pose).toBe('cuisson')
    expect(o?.hauteurM).toBeCloseTo(0.12)
  })

  it('un chauffe-eau se pose haut (1,30 m), pas à 12 cm', () => {
    const id = useProjectStore.getState().ajouterOrgane('chauffe-eau', 100, 100)
    const o = useProjectStore.getState().projet.organes.find((x) => x.id === id)
    expect(o?.pose).toBe('haute')
    expect(o?.hauteurM).toBeCloseTo(1.3)
  })

  it('un volet roulant et un sèche-serviette se posent haut, comme le chauffe-eau', () => {
    const idVolet = useProjectStore.getState().ajouterOrgane('volet-roulant', 100, 100)
    const idSs = useProjectStore.getState().ajouterOrgane('seche-serviette', 120, 120)
    const organes = useProjectStore.getState().projet.organes
    expect(organes.find((x) => x.id === idVolet)?.hauteurM).toBeCloseTo(1.3)
    expect(organes.find((x) => x.id === idSs)?.hauteurM).toBeCloseTo(1.3)
  })

  it('un point lumineux au plafond ne porte pas de hauteur absolue fixe (0, résolu via hauteurSousPlafond)', () => {
    const id = useProjectStore.getState().ajouterOrgane('point-lumineux', 100, 100)
    const o = useProjectStore.getState().projet.organes.find((x) => x.id === id)
    expect(o?.pose).toBe('plafond')
    expect(o?.hauteurM).toBe(0)
  })
})
