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
    pointsPieceEnCours: null,
    pieceSelectionnee: null,
    past: [],
    future: [],
  }))
}

const carre = [
  { x: 0, y: 0 },
  { x: 400, y: 0 }, // 4 m de large à 100 px/m
  { x: 400, y: 400 },
  { x: 0, y: 400 },
] // 4 m × 4 m = 16 m²

describe('tracé de pièce', () => {
  beforeEach(reset)

  it('clicPiece + finaliserPiece crée une pièce dont la surface est calculée depuis l’échelle', () => {
    useProjectStore.getState().setOutil({ kind: 'piece' })
    for (const p of carre) useProjectStore.getState().clicPiece(p)
    const id = useProjectStore.getState().finaliserPiece()

    const piece = useProjectStore.getState().projet.pieces.find((pc) => pc.id === id)!
    expect(piece).toBeDefined()
    expect(piece.surfaceM2).toBeCloseTo(16, 5)
    expect(piece.type).toBe('autre')
    expect(useProjectStore.getState().outil.kind).toBe('select')
    expect(useProjectStore.getState().pieceSelectionnee).toBe(id)
  })

  it('refuse de créer une pièce avec moins de 3 points', () => {
    useProjectStore.getState().setOutil({ kind: 'piece' })
    useProjectStore.getState().clicPiece({ x: 0, y: 0 })
    useProjectStore.getState().clicPiece({ x: 10, y: 10 })
    const id = useProjectStore.getState().finaliserPiece()
    expect(id).toBe('')
    expect(useProjectStore.getState().projet.pieces).toHaveLength(0)
  })

  it('annulerPiece ne crée aucune pièce', () => {
    useProjectStore.getState().setOutil({ kind: 'piece' })
    for (const p of carre) useProjectStore.getState().clicPiece(p)
    useProjectStore.getState().annulerPiece()
    expect(useProjectStore.getState().projet.pieces).toHaveLength(0)
    expect(useProjectStore.getState().pointsPieceEnCours).toBeNull()
  })

  it('un organe posé à l’intérieur du contour est rattaché automatiquement', () => {
    useProjectStore.getState().setOutil({ kind: 'piece' })
    for (const p of carre) useProjectStore.getState().clicPiece(p)
    const idPiece = useProjectStore.getState().finaliserPiece()

    const idOrgane = useProjectStore.getState().ajouterOrgane('prise16A', 200, 200)
    const organe = useProjectStore.getState().projet.organes.find((o) => o.id === idOrgane)!
    expect(organe.pieceId).toBe(idPiece)
  })

  it('déplacer un organe hors du contour le détache, et vice versa', () => {
    useProjectStore.getState().setOutil({ kind: 'piece' })
    for (const p of carre) useProjectStore.getState().clicPiece(p)
    const idPiece = useProjectStore.getState().finaliserPiece()

    const idOrgane = useProjectStore.getState().ajouterOrgane('prise16A', 200, 200)
    expect(useProjectStore.getState().projet.organes[0]!.pieceId).toBe(idPiece)

    useProjectStore.getState().deplacerOrgane(idOrgane, 5000, 5000)
    expect(useProjectStore.getState().projet.organes[0]!.pieceId).toBeNull()

    useProjectStore.getState().deplacerOrgane(idOrgane, 200, 200)
    expect(useProjectStore.getState().projet.organes[0]!.pieceId).toBe(idPiece)
  })

  it('supprimer une pièce détache les organes qu’elle contenait', () => {
    useProjectStore.getState().setOutil({ kind: 'piece' })
    for (const p of carre) useProjectStore.getState().clicPiece(p)
    const idPiece = useProjectStore.getState().finaliserPiece()
    useProjectStore.getState().ajouterOrgane('prise16A', 200, 200)

    useProjectStore.getState().supprimerPiece(idPiece)
    expect(useProjectStore.getState().projet.pieces).toHaveLength(0)
    expect(useProjectStore.getState().projet.organes[0]!.pieceId).toBeNull()
    expect(useProjectStore.getState().pieceSelectionnee).toBeNull()
  })

  it('renommerPiece et changerTypePiece modifient la pièce sans toucher au contour', () => {
    useProjectStore.getState().setOutil({ kind: 'piece' })
    for (const p of carre) useProjectStore.getState().clicPiece(p)
    const id = useProjectStore.getState().finaliserPiece()

    useProjectStore.getState().renommerPiece(id, 'Séjour')
    useProjectStore.getState().changerTypePiece(id, 'sejour')

    const piece = useProjectStore.getState().projet.pieces.find((pc) => pc.id === id)!
    expect(piece.nom).toBe('Séjour')
    expect(piece.type).toBe('sejour')
    expect(piece.polygone).toEqual(carre)
  })
})
