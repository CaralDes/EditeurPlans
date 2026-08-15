import type { Echelle, Point } from '../types'

export function distancePx(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

export function calculerEchelle(a: Point, b: Point, distanceReelleM: number, coteSur: string): Echelle {
  const px = distancePx(a, b)
  return { pxParMetre: px / distanceReelleM, coteSur }
}

export function pxVersMetres(px: number, echelle: Echelle | null): number | null {
  if (!echelle || echelle.pxParMetre <= 0) return null
  return px / echelle.pxParMetre
}

export function metresVersPx(m: number, echelle: Echelle | null): number | null {
  if (!echelle || echelle.pxParMetre <= 0) return null
  return m * echelle.pxParMetre
}

// Aire d'un polygone en pixels² (formule du lacet), convertie en m² via l'échelle.
export function aireM2(polygone: Point[], echelle: Echelle | null): number | null {
  if (!echelle || echelle.pxParMetre <= 0 || polygone.length < 3) return null
  let aire = 0
  for (let i = 0; i < polygone.length; i++) {
    const p1 = polygone[i]!
    const p2 = polygone[(i + 1) % polygone.length]!
    aire += p1.x * p2.y - p2.x * p1.y
  }
  aire = Math.abs(aire) / 2
  const m2ParPx2 = 1 / (echelle.pxParMetre * echelle.pxParMetre)
  return aire * m2ParPx2
}
