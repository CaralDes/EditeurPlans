import type { Organe, Piece, Point, Projet } from '../types'
import { aireM2 } from './echelle'

// Test d'appartenance par lancer de rayon (ray casting) : compte combien de fois une
// demi-droite horizontale partant du point traverse les côtés du polygone. Un nombre
// impair de traversées signifie que le point est à l'intérieur.
export function pointDansPolygone(p: Point, polygone: Point[]): boolean {
  if (polygone.length < 3) return false
  let dedans = false
  for (let i = 0, j = polygone.length - 1; i < polygone.length; j = i++) {
    const pi = polygone[i]!
    const pj = polygone[j]!
    const traverse = pi.y > p.y !== pj.y > p.y && p.x < ((pj.x - pi.x) * (p.y - pi.y)) / (pj.y - pi.y) + pi.x
    if (traverse) dedans = !dedans
  }
  return dedans
}

// Centre géométrique simple (moyenne des sommets) : suffisant pour placer une étiquette
// lisible sur une pièce de forme raisonnable, pas besoin du vrai centroïde pondéré par
// aire pour cet usage.
export function centreEtiquette(polygone: Point[]): Point {
  const n = polygone.length
  const somme = polygone.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
  return { x: somme.x / n, y: somme.y / n }
}

export function trouverPieceContenant(p: Point, pieces: Piece[]): string | null {
  for (const piece of pieces) {
    if (pointDansPolygone(p, piece.polygone)) return piece.id
  }
  return null
}

// Rattache chaque organe à la pièce dont le polygone le contient, ou le détache (null)
// s'il n'en a plus. Appelé après tout changement de position d'organe ou de contour de
// pièce, pour que le rattachement reste toujours exact sans geste manuel — c'est ce qui
// permet au panneau de conformité d'être réellement « en direct ».
export function recalculerAppartenances(organes: Organe[], pieces: Piece[]): Organe[] {
  return organes.map((o) => {
    const pieceId = trouverPieceContenant({ x: o.x, y: o.y }, pieces)
    return pieceId === o.pieceId ? o : { ...o, pieceId }
  })
}

export function avecAppartenancesRecalculees(projet: Projet): Projet {
  return { ...projet, organes: recalculerAppartenances(projet.organes, projet.pieces) }
}

export function surfaceCalculee(polygone: Point[], projet: Projet): number {
  return aireM2(polygone, projet.plan.echelle) ?? 0
}
