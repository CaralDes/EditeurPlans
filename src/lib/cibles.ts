import type { Point } from '../types'

// Rayon de capture autour du curseur, exprimé en PIXELS ÉCRAN et non en coordonnées
// du plan : c'est le point clé. Une zone définie dans le repère du plan rétrécit avec
// le zoom — sur un plan dézoomé pour tenir à l'écran, elle devient un point de quelques
// pixels, impossible à viser. Exprimée en pixels écran, la zone de capture garde la
// même taille perçue quel que soit le niveau de zoom.
export const RAYON_CAPTURE_ECRAN = 26

export interface Cible {
  id: string
  x: number
  y: number
}

/**
 * Renvoie la cible la plus proche du point donné, dans la limite du rayon de capture.
 *
 * On choisit explicitement la plus proche du curseur, plutôt que de laisser la
 * détection de collision décider : quand deux organes se chevauchent, celle-ci
 * retiendrait le dernier dessiné, ce qui n'a aucun rapport avec l'intention de
 * l'utilisateur et sélectionne un élément voisin au lieu de celui visé.
 */
export function cibleLaPlusProche(point: Point, cibles: Cible[], echelleVue: number): Cible | null {
  const rayonPlan = RAYON_CAPTURE_ECRAN / echelleVue
  const rayonCarre = rayonPlan * rayonPlan

  let meilleure: Cible | null = null
  let meilleureDistance = Number.POSITIVE_INFINITY

  for (const cible of cibles) {
    const dx = cible.x - point.x
    const dy = cible.y - point.y
    const distance = dx * dx + dy * dy
    if (distance <= rayonCarre && distance < meilleureDistance) {
      meilleureDistance = distance
      meilleure = cible
    }
  }

  return meilleure
}
