import regles from './nfc15100.json'
import type { Organe, Piece, PoseHauteur, TypePiece } from '../types'

interface EquipementPiece {
  type: TypePiece
  libelle: string
  prisesMin: number
  prisesRegle: string
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
  tableau: Record<string, unknown>
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

  // Lecture à deux paliers (par surface), la plus largement reprise dans les guides consultés :
  // cuisine ≤ 4 m² → palier bas ; séjour > 28 m² → palier haut ; sinon le minimum de base.
  let prisesRequises = regle?.prisesMin ?? 0
  if (regle?.seuilM2 !== undefined && regle.prisesMinSousSeuil !== undefined && piece.surfaceM2 <= regle.seuilM2) {
    prisesRequises = regle.prisesMinSousSeuil
  } else if (regle?.seuilM2 !== undefined && regle.prisesMinAuDela !== undefined && piece.surfaceM2 > regle.seuilM2) {
    prisesRequises = regle.prisesMinAuDela
  }

  const eclairageRequis = regle?.eclairageMin ?? 0

  return {
    piece,
    prisesPosees,
    prisesRequises,
    eclairagePose,
    eclairageRequis,
    ok: prisesPosees >= prisesRequises && eclairagePose >= eclairageRequis,
    regle,
  }
}

export function verifierToutesPieces(pieces: Piece[], organes: Organe[]): ConformitePiece[] {
  return pieces.map((p) => verifierPiece(p, organes))
}
