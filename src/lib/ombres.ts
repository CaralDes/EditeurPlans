import type { Mur, Point } from '../types'

// Calcul de la zone visible depuis une source ponctuelle (polygone de visibilité), en
// tenant compte des murs comme occultants. Algorithme par balayage angulaire : on trace
// un rayon vers chaque sommet de mur (± un epsilon, pour capter net le bord de l'ombre),
// plus une série de rayons régulièrement espacés pour arrondir les zones dégagées, et on
// retient pour chacun la première intersection avec un mur. Les murs sont traités par
// leur ligne centrale, pleine hauteur : l'épaisseur ne joue aucun rôle dans cette
// géométrie, seulement dans son rendu (voir PlanCanvas).

export interface Segment {
  a: Point
  b: Point
}

export function mursEnSegments(murs: Mur[]): Segment[] {
  const segments: Segment[] = []
  for (const mur of murs) {
    for (let i = 1; i < mur.points.length; i++) {
      segments.push({ a: mur.points[i - 1]!, b: mur.points[i]! })
    }
  }
  return segments
}

// Intersection d'un rayon (origine + direction, t ≥ 0) avec un segment [a,b] (u ∈ [0,1]).
// Renvoie la distance t le long du rayon si elle existe, sinon null (parallèles ou hors
// bornes). Résolution par déterminant, sans division par une composante qui pourrait
// être nulle (rayon horizontal ou vertical).
function intersectionRayonSegment(origine: Point, dx: number, dy: number, a: Point, b: Point): number | null {
  const sx = b.x - a.x
  const sy = b.y - a.y
  const denom = sx * dy - sy * dx
  if (Math.abs(denom) < 1e-9) return null // rayon parallèle au segment
  const t = (sx * (a.y - origine.y) - sy * (a.x - origine.x)) / denom
  const u = (dx * (a.y - origine.y) - dy * (a.x - origine.x)) / denom
  if (t < 0 || u < 0 || u > 1) return null
  return t
}

const RESOLUTION_ANGULAIRE = 96 // rayons uniformes : arrondit les zones sans mur à proximité
const EPSILON_ANGLE = 1e-4 // écart de part et d'autre de chaque coin, pour un bord d'ombre net

export function polygoneVisibilite(origine: Point, segments: Segment[], rayonMax: number): Point[] {
  const angles = new Set<number>()
  for (let i = 0; i < RESOLUTION_ANGULAIRE; i++) {
    angles.add((i / RESOLUTION_ANGULAIRE) * Math.PI * 2)
  }
  for (const seg of segments) {
    for (const p of [seg.a, seg.b]) {
      const angle = Math.atan2(p.y - origine.y, p.x - origine.x)
      angles.add(angle)
      angles.add(angle - EPSILON_ANGLE)
      angles.add(angle + EPSILON_ANGLE)
    }
  }

  return [...angles].sort((a, b) => a - b).map((angle) => {
    const dx = Math.cos(angle)
    const dy = Math.sin(angle)
    let distance = rayonMax
    for (const seg of segments) {
      const t = intersectionRayonSegment(origine, dx, dy, seg.a, seg.b)
      if (t !== null && t < distance) distance = t
    }
    return { x: origine.x + dx * distance, y: origine.y + dy * distance }
  })
}
