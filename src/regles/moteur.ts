import regles from './nfc15100.json'
import type { Organe, Piece, PoseHauteur, TypePiece } from '../types'

interface EquipementPiece {
  type: TypePiece
  libelle: string
  prisesMin: number
  prisesRegle: string
  /** Séjour : 1 prise par tranche de N m², en plus du plancher prisesMin. */
  prisesParTrancheM2?: number
  /** Cuisine : part des prises qui doit se trouver au-dessus du plan de travail. */
  prisesPlanTravailMin?: number
  /** Prises de communication (RJ45) exigées dans la pièce. */
  rj45Min?: number
  seuilM2?: number
  prisesMinAuDela?: number
  prisesMinSousSeuil?: number
  eclairageMin: number
  source: string
}

interface CircuitDef {
  id: string
  libelle: string
  famille: string
  sectionMm2: number
  calibreA: number
  maxOrganes?: number
  puissanceMaxW?: number
  note?: string
  source: string
}

interface HauteurPoseDef {
  pose: PoseHauteur
  hauteurM: number | null
  regle: string
  source: string
}

const REGLES = regles as {
  version: string
  avertissement: string
  equipementParPiece: EquipementPiece[]
  circuits: CircuitDef[]
  hauteursPose: HauteurPoseDef[]
  tableau: {
    differentielsMin: number
    maxCircuitsParDifferentiel: number
    maxCircuitsParDifferentielRegle: string
    maxCircuitsParDifferentielSource: string
    typeAImposePour: string[]
    [cle: string]: unknown
  }
  circuitsEclairage: {
    nombreMin: number
    nombreMinAuDelaSeuil: number
    seuilSurfaceM2: number
    regle: string
    source: string
  }
  chuteDeTensionMax: { eclairage: number; prises: number; source: string }
}

const parType = new Map(REGLES.equipementParPiece.map((e) => [e.type, e]))
const circuitsParId = new Map(REGLES.circuits.map((c) => [c.id, c]))
const hauteursParPose = new Map(REGLES.hauteursPose.map((h) => [h.pose, h]))

export function versionRegles(): string {
  return REGLES.version
}

export function avertissementRegles(): string {
  return REGLES.avertissement
}

export function circuitDef(id: string): CircuitDef | undefined {
  return circuitsParId.get(id)
}

export function hauteurRecommandee(pose: PoseHauteur): HauteurPoseDef | undefined {
  return hauteursParPose.get(pose)
}

// Différentiel 30 mA de type A imposé pour certains circuits (plaque, lave-linge, IRVE...) ;
// type AC accepté partout ailleurs. Voir nfc15100.json → tableau.typeAImposePour.
export function typeDifferentielRequis(circuitDefId: string): 'A' | 'AC' {
  return REGLES.tableau.typeAImposePour.includes(circuitDefId) ? 'A' : 'AC'
}

export function differentielsMinimum(): number {
  return REGLES.tableau.differentielsMin
}

// Un même interrupteur différentiel ne doit pas protéger plus de N circuits.
export function maxCircuitsParDifferentiel(): number {
  return REGLES.tableau.maxCircuitsParDifferentiel
}

export function regleMaxCircuitsParDifferentiel(): { regle: string; source: string } {
  return {
    regle: REGLES.tableau.maxCircuitsParDifferentielRegle,
    source: REGLES.tableau.maxCircuitsParDifferentielSource,
  }
}

// Nombre de circuits d'éclairage indépendants attendus : 2 au-delà du seuil de surface
// habitable, pour qu'un défaut ne plonge pas tout le logement dans le noir.
export function circuitsEclairageMin(surfaceHabitableM2: number): {
  nombre: number
  regle: string
  source: string
} {
  const def = REGLES.circuitsEclairage
  const nombre = surfaceHabitableM2 > def.seuilSurfaceM2 ? def.nombreMinAuDelaSeuil : def.nombreMin
  return { nombre, regle: def.regle, source: def.source }
}

export const PRISES_TYPES = new Set([
  'prise16A',
  'prise16A-double',
  'prise16A-etanche',
  'prise-commandee',
])

export interface ConformitePiece {
  piece: Piece
  prisesPosees: number
  prisesRequises: number
  eclairagePose: number
  eclairageRequis: number
  /** Prises de communication RJ45 (0/0 quand la pièce n'en exige pas). */
  rj45Posees: number
  rj45Requises: number
  /** Cuisine : prises posées au-dessus du plan de travail (0/0 ailleurs). */
  prisesPlanTravailPosees: number
  prisesPlanTravailRequises: number
  /** true quand la surface est inconnue (échelle non calée) : les seuils par surface sont alors indécidables. */
  surfaceInconnue: boolean
  ok: boolean
  regle: EquipementPiece | undefined
}

export function verifierPiece(piece: Piece, organes: Organe[]): ConformitePiece {
  const regle = parType.get(piece.type)
  const dansPiece = organes.filter((o) => o.pieceId === piece.id)
  const prisesPosees = dansPiece.filter((o) => PRISES_TYPES.has(o.type)).length
  const eclairagePose = dansPiece.filter((o) =>
    ['point-lumineux', 'applique', 'spot', 'reglette-led'].includes(o.type),
  ).length
  const rj45Posees = dansPiece.filter((o) => o.type === 'prise-rj45').length
  const prisesPlanTravailPosees = dansPiece.filter(
    (o) => PRISES_TYPES.has(o.type) && o.pose === 'plan-travail',
  ).length

  // Sans échelle calée, la surface vaut 0 : ce n'est pas « une petite pièce », c'est une
  // surface inconnue. On s'en tient alors au minimum de base, sans appliquer les seuils
  // par surface — sinon une cuisine non calibrée passerait silencieusement de 6 à 3 prises.
  const surfaceInconnue = piece.surfaceM2 <= 0

  let prisesRequises = regle?.prisesMin ?? 0
  if (!surfaceInconnue && regle) {
    if (regle.seuilM2 !== undefined && regle.prisesMinSousSeuil !== undefined && piece.surfaceM2 <= regle.seuilM2) {
      prisesRequises = regle.prisesMinSousSeuil
    } else if (regle.seuilM2 !== undefined && regle.prisesMinAuDela !== undefined && piece.surfaceM2 > regle.seuilM2) {
      prisesRequises = regle.prisesMinAuDela
    }
    // Séjour : 1 prise par tranche entamée de N m², le plancher prisesMin restant prioritaire.
    if (regle.prisesParTrancheM2 !== undefined) {
      prisesRequises = Math.max(prisesRequises, Math.ceil(piece.surfaceM2 / regle.prisesParTrancheM2))
    }
  }

  const eclairageRequis = regle?.eclairageMin ?? 0
  const rj45Requises = regle?.rj45Min ?? 0
  // La part « plan de travail » ne peut pas dépasser le nombre de prises réellement exigé
  // (cuisine ≤ 4 m² : 3 prises au total, donc pas 4 au-dessus du plan de travail).
  const prisesPlanTravailRequises = Math.min(regle?.prisesPlanTravailMin ?? 0, prisesRequises)

  return {
    piece,
    prisesPosees,
    prisesRequises,
    eclairagePose,
    eclairageRequis,
    rj45Posees,
    rj45Requises,
    prisesPlanTravailPosees,
    prisesPlanTravailRequises,
    surfaceInconnue,
    ok:
      prisesPosees >= prisesRequises &&
      eclairagePose >= eclairageRequis &&
      rj45Posees >= rj45Requises &&
      prisesPlanTravailPosees >= prisesPlanTravailRequises,
    regle,
  }
}

export function verifierToutesPieces(pieces: Piece[], organes: Organe[]): ConformitePiece[] {
  return pieces.map((p) => verifierPiece(p, organes))
}
