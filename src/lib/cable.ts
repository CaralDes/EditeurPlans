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
// un câble monte de chaque organe qu'il dessert jusqu'au plafond (ou au sol technique)
// puis redescend vers le tableau, ce qu'un simple mesurage du trait sur le plan ignore.
// Voir le plan de développement pour la formule complète et ses sources.
//
//   mode 'plafond'        : le câble grimpe jusqu'au plafond à chaque bout, et à chaque
//                           organe désservi en chemin (guirlande de spots, par exemple)
//   autres modes (sol...) : le câble part du sol, la remontée se limite à la hauteur
//                           de pose de chaque organe desservi et du tableau
export function longueurCableM(
  cheminement: Cheminement,
  hauteursOrganesM: number[],
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
      ? hauteursOrganesM.reduce((somme, h) => somme + (hauteurSousPlafondM - h), 0) +
        (hauteurSousPlafondM - hauteurTableauM)
      : hauteursOrganesM.reduce((somme, h) => somme + h, 0) + hauteurTableauM

  return (longueur2Dm + vertical) * (1 + majoration) + reserveM
}

// Compatibilité ascendante : avant les câbles groupés, un cheminement ne portait qu'un
// seul organe (deOrgane: string) au lieu d'une liste. Convertit à la volée les projets
// (.cuivre ou auto-sauvegarde) enregistrés avant ce changement.
export function migrerCheminements(cheminements: unknown[]): Cheminement[] {
  return (cheminements as Array<Cheminement & { deOrgane?: string }>)
    .map((c) => (Array.isArray(c.organes) ? (c as Cheminement) : { ...c, organes: c.deOrgane ? [c.deOrgane] : [] }))
    .filter((c) => c.organes.length > 0)
}
