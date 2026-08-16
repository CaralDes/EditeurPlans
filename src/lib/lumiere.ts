import type { Echelle, Organe, TypeOrgane } from '../types'
import { metresVersPx } from './echelle'

// Simulation d'éclairage volontairement approximative : une nappe lumineuse circulaire
// par luminaire, dont le rayon dépend du flux et de la hauteur de la source. Elle ne
// tient pas compte des murs (le plan n'est qu'une image, sans géométrie exploitable)
// ni des réflexions. Elle sert à juger l'implantation — « ai-je un coin sombre ? » —
// pas à produire un calcul d'éclairement réglementaire.

export interface ParamsLuminaire {
  fluxLm: number
  temperatureK: number
}

export const LUMINAIRES: Record<string, ParamsLuminaire> = {
  'point-lumineux': { fluxLm: 1200, temperatureK: 2700 },
  applique: { fluxLm: 600, temperatureK: 2700 },
  spot: { fluxLm: 400, temperatureK: 3000 },
  'reglette-led': { fluxLm: 1800, temperatureK: 4000 },
}

export function estLuminaire(type: TypeOrgane): boolean {
  return type in LUMINAIRES
}

export function paramsParDefaut(type: TypeOrgane): ParamsLuminaire | undefined {
  return LUMINAIRES[type]
}

export const TEMPERATURES = [
  { k: 2700, label: '2700 K — blanc chaud' },
  { k: 3000, label: '3000 K — blanc chaud+' },
  { k: 4000, label: '4000 K — blanc neutre' },
  { k: 5000, label: '5000 K — blanc froid' },
  { k: 6500, label: '6500 K — lumière du jour' },
]

/**
 * Couleur perçue d'une source, d'après sa température de couleur.
 * Approximation classique du corps noir (méthode de Tanner Helland), suffisamment
 * fidèle sur la plage 1000–40000 K pour un rendu à l'écran.
 */
export function kelvinVersRvb(kelvin: number): { r: number; v: number; b: number } {
  const t = Math.min(40000, Math.max(1000, kelvin)) / 100
  const borne = (x: number) => Math.round(Math.min(255, Math.max(0, x)))

  const r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592)
  const v = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492)
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307

  return { r: borne(r), v: borne(v), b: borne(b) }
}

/**
 * Rayon de la nappe lumineuse au sol, en mètres.
 * Le flux fixe la taille de base ; la hauteur de la source l'élargit (une source haute
 * éclaire plus large mais plus faiblement), dans des bornes raisonnables.
 */
export function rayonEclairageM(fluxLm: number, hauteurSourceM: number): number {
  const base = Math.sqrt(Math.max(fluxLm, 1)) / 12
  const facteurHauteur = Math.min(2, Math.max(0.5, hauteurSourceM / 2.5))
  return base * facteurHauteur
}

export interface Nappe {
  id: string
  x: number
  y: number
  rayonPx: number
  couleur: { r: number; v: number; b: number }
  /** Part du flux nominal, sert à atténuer les grandes nappes qui sont plus diffuses. */
  intensite: number
}

/** Rayon utilisé faute d'échelle calée, pour que le mode reste lisible malgré tout. */
const PX_PAR_METRE_PAR_DEFAUT = 40

export function nappesLumineuses(
  organes: Organe[],
  echelle: Echelle | null,
  hauteurSousPlafondM: number,
): Nappe[] {
  return organes.filter((o) => estLuminaire(o.type)).map((o) => {
    const defauts = paramsParDefaut(o.type)!
    const flux = o.fluxLm ?? defauts.fluxLm
    const temperature = o.temperatureK ?? defauts.temperatureK

    // Un luminaire de plafond rayonne depuis le plafond ; une applique depuis sa
    // hauteur de pose.
    const hauteurSource = o.pose === 'plafond' ? hauteurSousPlafondM : o.hauteurM || hauteurSousPlafondM
    const rayonM = rayonEclairageM(flux, hauteurSource)
    const rayonPx = metresVersPx(rayonM, echelle) ?? rayonM * PX_PAR_METRE_PAR_DEFAUT

    return {
      id: o.id,
      x: o.x,
      y: o.y,
      rayonPx,
      couleur: kelvinVersRvb(temperature),
      intensite: Math.min(1, flux / 1500),
    }
  })
}
