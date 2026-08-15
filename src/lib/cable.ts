import { distancePx, pxVersMetres } from './echelle'
import type { Cheminement, Echelle, Point } from '../types'

function longueurPolylignePx(points: Point[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += distancePx(points[i - 1]!, points[i]!)
  }
  return total
}

// Longueur de câble réelle, pas seulement la longueur à plat du tracé sur le plan :
// un câble monte de l'organe au plafond (ou au sol technique) puis redescend vers le
// tableau, ce qu'un simple mesurage du trait sur le plan ignore. Voir le plan de
// développement pour la formule complète et ses sources.
//
//   mode 'plafond'        : le câble grimpe jusqu'au plafond à chaque bout
//   autres modes (sol...) : le câble part du sol, la remontée se limite à la hauteur
//                           de pose de chaque extrémité
export function longueurCableM(
  cheminement: Cheminement,
  hauteurOrganeM: number,
  hauteurTableauM: number,
  hauteurSousPlafondM: number,
  echelle: Echelle | null,
  majoration: number,
  reserveM: number,
): number | null {
  if (cheminement.points.length < 2) return null
  const longueur2Dm = pxVersMetres(longueurPolylignePx(cheminement.points), echelle)
  if (longueur2Dm === null) return null

  const vertical =
    cheminement.mode === 'plafond'
      ? hauteurSousPlafondM - hauteurOrganeM + (hauteurSousPlafondM - hauteurTableauM)
      : hauteurOrganeM + hauteurTableauM

  return (longueur2Dm + vertical) * (1 + majoration) + reserveM
}
