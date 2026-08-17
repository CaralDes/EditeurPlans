import { beforeEach, describe, expect, it } from 'vitest'
import { useProjectStore } from '../store/useProjectStore'
import { resumeCircuits } from '../lib/metre'
import { construireSchemaTableau } from '../lib/schemaTableau'

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

  it('suggère 2,5 mm² / 20 A et un différentiel AC pour la hotte (pas de type A imposé)', () => {
    useProjectStore.getState().poserTableau('divisionnaire', 0, 0)
    const idOrgane = useProjectStore.getState().ajouterOrgane('alim-hotte', 10, 10)
    const idCircuit = useProjectStore.getState().creerCircuit([idOrgane])

    const circuit = useProjectStore.getState().projet.circuits.find((c) => c.id === idCircuit)!
    expect(circuit.sectionMm2).toBe(2.5)
    expect(circuit.calibreA).toBe(20)

    const tableau = useProjectStore.getState().projet.tableaux[0]!
    const differentiel = tableau.differentiels.find((d) => d.id === circuit.ddrId)!
    expect(differentiel.type).toBe('AC')
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

describe('décompte en socles', () => {
  beforeEach(reset)

  it('une prise double est posée avec 2 postes par défaut', () => {
    const id = useProjectStore.getState().ajouterOrgane('prise16A-double', 10, 10)
    const organe = useProjectStore.getState().projet.organes.find((o) => o.id === id)!
    expect(organe.postes).toBe(2)
  })

  it('une prise simple reste à 1 poste', () => {
    const id = useProjectStore.getState().ajouterOrgane('prise16A', 10, 10)
    expect(useProjectStore.getState().projet.organes.find((o) => o.id === id)!.postes).toBe(1)
  })

  it('le remplissage d’un circuit se compte en socles, pas en boîtes', () => {
    useProjectStore.getState().poserTableau('divisionnaire', 0, 0)
    // 7 prises doubles = 14 socles, au-delà des 12 admis en 2,5 mm².
    const ids = Array.from({ length: 7 }, (_, i) =>
      useProjectStore.getState().ajouterOrgane('prise16A-double', i * 10, 10),
    )
    const idCircuit = useProjectStore.getState().creerCircuit(ids)

    const projet = useProjectStore.getState().projet
    const ligne = resumeCircuits(projet).find((l) => l.circuit.id === idCircuit)!
    expect(ligne.organesCount).toBe(14)
    expect(ligne.depasseMax).toBe(true)

    const schema = construireSchemaTableau(projet.tableaux[0]!, projet.circuits, projet.organes)
    const brancheCircuit = schema.branches.flatMap((b) => b.circuits).find((c) => c.id === idCircuit)!
    expect(brancheCircuit.nbOrganes).toBe(14)
    expect(brancheCircuit.alertes.some((a) => a.includes('14 points'))).toBe(true)
  })

  it('chargerProjet relève à 2 postes les prises doubles d’un projet enregistré avant le décompte en socles', () => {
    const id = useProjectStore.getState().ajouterOrgane('prise16A-double', 10, 10)
    const p = useProjectStore.getState().projet
    // Reproduit l'ancien format : toutes les prises doubles enregistrées avec postes: 1.
    const ancien = { ...p, organes: p.organes.map((o) => ({ ...o, postes: 1 })) }

    useProjectStore.getState().chargerProjet(ancien)
    expect(useProjectStore.getState().projet.organes.find((o) => o.id === id)!.postes).toBe(2)
  })

  it('chargerProjet conserve un réglage explicite au-delà du défaut', () => {
    const id = useProjectStore.getState().ajouterOrgane('prise16A-double', 10, 10)
    const p = useProjectStore.getState().projet
    const avecQuatre = { ...p, organes: p.organes.map((o) => ({ ...o, postes: 4 })) }

    useProjectStore.getState().chargerProjet(avecQuatre)
    expect(useProjectStore.getState().projet.organes.find((o) => o.id === id)!.postes).toBe(4)
  })
})

describe('tracé de câble', () => {
  beforeEach(reset)

  it('clicCable + finaliserCable produit un cheminement rattaché au bon organe et circuit', () => {
    const idTableau = useProjectStore.getState().poserTableau('divisionnaire', 500, 500)
    const idOrgane = useProjectStore.getState().ajouterOrgane('prise16A', 10, 10)
    const idCircuit = useProjectStore.getState().creerCircuit([idOrgane])

    useProjectStore.getState().setOutil({ kind: 'cable', circuitId: idCircuit, organeIds: [idOrgane], mode: 'plafond' })
    useProjectStore.getState().clicCable({ x: 10, y: 10 })
    useProjectStore.getState().clicCable({ x: 500, y: 500 })
    useProjectStore.getState().finaliserCable()

    const cheminements = useProjectStore.getState().projet.cheminements
    expect(cheminements).toHaveLength(1)
    expect(cheminements[0]!.organes).toEqual([idOrgane])
    expect(cheminements[0]!.circuitId).toBe(idCircuit)
    expect(cheminements[0]!.versNoeud).toBe(idTableau)
    expect(useProjectStore.getState().outil.kind).toBe('select')
  })

  it('annulerCable ne produit aucun cheminement', () => {
    const idOrgane = useProjectStore.getState().ajouterOrgane('prise16A', 10, 10)
    const idCircuit = useProjectStore.getState().creerCircuit([idOrgane])
    useProjectStore.getState().setOutil({ kind: 'cable', circuitId: idCircuit, organeIds: [idOrgane], mode: 'plafond' })
    useProjectStore.getState().clicCable({ x: 10, y: 10 })
    useProjectStore.getState().annulerCable()
    expect(useProjectStore.getState().projet.cheminements).toHaveLength(0)
  })

  it('retracer un câble remplace le précédent au lieu de le dupliquer', () => {
    useProjectStore.getState().poserTableau('divisionnaire', 500, 500)
    const idOrgane = useProjectStore.getState().ajouterOrgane('prise16A', 10, 10)
    const idCircuit = useProjectStore.getState().creerCircuit([idOrgane])

    useProjectStore.getState().setOutil({ kind: 'cable', circuitId: idCircuit, organeIds: [idOrgane], mode: 'plafond' })
    useProjectStore.getState().clicCable({ x: 10, y: 10 })
    useProjectStore.getState().clicCable({ x: 200, y: 200 })
    useProjectStore.getState().finaliserCable()

    useProjectStore.getState().setOutil({ kind: 'cable', circuitId: idCircuit, organeIds: [idOrgane], mode: 'sol' })
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
    useProjectStore.getState().setOutil({ kind: 'cable', circuitId: idCircuit, organeIds: [idOrgane], mode: 'plafond' })
    useProjectStore.getState().clicCable({ x: 10, y: 10 })
    useProjectStore.getState().clicCable({ x: 500, y: 500 })
    useProjectStore.getState().finaliserCable()

    useProjectStore.getState().supprimerOrganes([idOrgane])

    const { circuits, cheminements } = useProjectStore.getState().projet
    expect(cheminements).toHaveLength(0)
    expect(circuits.find((c) => c.id === idCircuit)!.organes).not.toContain(idOrgane)
  })

  it('un seul câble peut desservir plusieurs organes du même circuit (guirlande de spots)', () => {
    useProjectStore.getState().poserTableau('divisionnaire', 500, 500)
    const idSpot1 = useProjectStore.getState().ajouterOrgane('spot', 10, 10)
    const idSpot2 = useProjectStore.getState().ajouterOrgane('spot', 60, 10)
    const idSpot3 = useProjectStore.getState().ajouterOrgane('spot', 110, 10)
    const idCircuit = useProjectStore.getState().creerCircuit([idSpot1, idSpot2, idSpot3])

    useProjectStore.getState().setOutil({
      kind: 'cable',
      circuitId: idCircuit,
      organeIds: [idSpot1, idSpot2, idSpot3],
      mode: 'plafond',
    })
    useProjectStore.getState().clicCable({ x: 10, y: 10 })
    useProjectStore.getState().clicCable({ x: 110, y: 10 })
    useProjectStore.getState().clicCable({ x: 500, y: 500 })
    useProjectStore.getState().finaliserCable()

    const cheminements = useProjectStore.getState().projet.cheminements
    expect(cheminements).toHaveLength(1)
    expect(cheminements[0]!.organes).toEqual([idSpot1, idSpot2, idSpot3])
    expect(useProjectStore.getState().outil.kind).toBe('select')
  })

  it('retracer un câble groupé (via cheminementId) remplace le même câble sans le dupliquer', () => {
    useProjectStore.getState().poserTableau('divisionnaire', 500, 500)
    const idSpot1 = useProjectStore.getState().ajouterOrgane('spot', 10, 10)
    const idSpot2 = useProjectStore.getState().ajouterOrgane('spot', 60, 10)
    const idCircuit = useProjectStore.getState().creerCircuit([idSpot1, idSpot2])

    useProjectStore.getState().setOutil({ kind: 'cable', circuitId: idCircuit, organeIds: [idSpot1, idSpot2], mode: 'plafond' })
    useProjectStore.getState().clicCable({ x: 10, y: 10 })
    useProjectStore.getState().clicCable({ x: 500, y: 500 })
    useProjectStore.getState().finaliserCable()
    const idCable = useProjectStore.getState().projet.cheminements[0]!.id

    useProjectStore.getState().setOutil({
      kind: 'cable',
      circuitId: idCircuit,
      organeIds: [idSpot1, idSpot2],
      mode: 'sol',
      cheminementId: idCable,
    })
    useProjectStore.getState().clicCable({ x: 10, y: 10 })
    useProjectStore.getState().clicCable({ x: 500, y: 500 })
    useProjectStore.getState().finaliserCable()

    const cheminements = useProjectStore.getState().projet.cheminements
    expect(cheminements).toHaveLength(1)
    expect(cheminements[0]!.id).toBe(idCable)
    expect(cheminements[0]!.mode).toBe('sol')
    expect(cheminements[0]!.organes).toEqual([idSpot1, idSpot2])
  })

  it('supprimer un seul organe desservi par un câble groupé le détache sans supprimer le câble des autres', () => {
    useProjectStore.getState().poserTableau('divisionnaire', 500, 500)
    const idSpot1 = useProjectStore.getState().ajouterOrgane('spot', 10, 10)
    const idSpot2 = useProjectStore.getState().ajouterOrgane('spot', 60, 10)
    const idCircuit = useProjectStore.getState().creerCircuit([idSpot1, idSpot2])

    useProjectStore.getState().setOutil({ kind: 'cable', circuitId: idCircuit, organeIds: [idSpot1, idSpot2], mode: 'plafond' })
    useProjectStore.getState().clicCable({ x: 10, y: 10 })
    useProjectStore.getState().clicCable({ x: 500, y: 500 })
    useProjectStore.getState().finaliserCable()

    useProjectStore.getState().supprimerOrganes([idSpot1])

    const { cheminements, circuits } = useProjectStore.getState().projet
    expect(cheminements).toHaveLength(1)
    expect(cheminements[0]!.organes).toEqual([idSpot2])
    expect(circuits.find((c) => c.id === idCircuit)!.organes).toEqual([idSpot2])
  })
})
