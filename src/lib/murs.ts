import { distancePx, pxVersMetres } from './echelle'
import type { Echelle, Mur, Point } from '../types'

function longueurPolylignePx(points: Point[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += distancePx(points[i - 1]!, points[i]!)
  }
  return total
}

export function longueurMurM(mur: Mur, echelle: Echelle | null): number | null {
  if (mur.points.length < 2) return null
  return pxVersMetres(longueurPolylignePx(mur.points), echelle)
}
