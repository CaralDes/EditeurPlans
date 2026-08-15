import type { PoseHauteur, TypeOrgane } from '../types'

// Métadonnées pures des symboles (label, calque, pose par défaut) : aucune dépendance
// à react-konva ici. La logique métier (store, moteur de règles) importe ce module,
// jamais definitions.tsx — sous Node/Vitest, react-konva entraîne le module Konva
// « node », qui exige le paquet natif `canvas`. Seuls les composants d'affichage
// (Symbole, Palette, PlanCanvas, SymbolePreview) ont besoin du rendu et importent
// definitions.tsx.

export type Calque =
  | 'prises'
  | 'eclairage'
  | 'specialises'
  | 'chauffage'
  | 'volets'
  | 'vdi'
  | 'distribution'

export interface SymboleMeta {
  label: string
  calque: Calque
  poseDefaut: PoseHauteur
}

export const SYMBOL_META: Record<TypeOrgane, SymboleMeta> = {
  // ---- prises ----
  prise16A: { label: 'Prise 16 A', calque: 'prises', poseDefaut: 'basse' },
  'prise16A-double': { label: 'Prise double', calque: 'prises', poseDefaut: 'basse' },
  'prise16A-etanche': { label: 'Prise étanche IP44', calque: 'prises', poseDefaut: 'basse' },
  prise32A: { label: 'Prise 32 A (plaque)', calque: 'prises', poseDefaut: 'cuisson' },
  'prise-commandee': { label: 'Prise commandée', calque: 'prises', poseDefaut: 'basse' },
  'prise-rj45': { label: 'Prise RJ45', calque: 'vdi', poseDefaut: 'basse' },
  'prise-tv': { label: 'Prise TV', calque: 'vdi', poseDefaut: 'basse' },

  // ---- éclairage ----
  'point-lumineux': { label: 'Point lumineux', calque: 'eclairage', poseDefaut: 'plafond' },
  applique: { label: 'Applique murale', calque: 'eclairage', poseDefaut: 'plafond' },
  spot: { label: 'Spot encastré', calque: 'eclairage', poseDefaut: 'plafond' },
  'reglette-led': { label: 'Réglette LED', calque: 'eclairage', poseDefaut: 'plafond' },
  'interrupteur-simple': { label: 'Interrupteur simple', calque: 'eclairage', poseDefaut: 'commande' },
  'va-et-vient': { label: 'Va-et-vient', calque: 'eclairage', poseDefaut: 'commande' },
  'bouton-poussoir': { label: 'Bouton poussoir', calque: 'eclairage', poseDefaut: 'commande' },
  variateur: { label: 'Variateur', calque: 'eclairage', poseDefaut: 'commande' },
  'detecteur-presence': { label: 'Détecteur de présence', calque: 'eclairage', poseDefaut: 'plafond' },
  daaf: { label: 'DAAF (détecteur fumée)', calque: 'eclairage', poseDefaut: 'plafond' },

  // ---- spécialisés / gros électroménager ----
  'alim-lave-vaisselle': { label: 'Lave-vaisselle', calque: 'specialises', poseDefaut: 'basse' },
  'alim-lave-linge': { label: 'Lave-linge', calque: 'specialises', poseDefaut: 'basse' },
  'alim-seche-linge': { label: 'Sèche-linge', calque: 'specialises', poseDefaut: 'basse' },
  'alim-four': { label: 'Four', calque: 'specialises', poseDefaut: 'basse' },
  'alim-plaque': { label: 'Plaque de cuisson', calque: 'specialises', poseDefaut: 'cuisson' },
  'alim-refrigerateur': { label: 'Réfrigérateur', calque: 'specialises', poseDefaut: 'basse' },
  'alim-congelateur': { label: 'Congélateur', calque: 'specialises', poseDefaut: 'basse' },
  'chauffe-eau': { label: 'Chauffe-eau', calque: 'specialises', poseDefaut: 'haute' },
  vmc: { label: 'VMC', calque: 'specialises', poseDefaut: 'plafond' },
  'volet-roulant': { label: 'Volet roulant', calque: 'volets', poseDefaut: 'haute' },

  // ---- chauffage électrique ----
  'radiateur-electrique': { label: 'Radiateur électrique', calque: 'chauffage', poseDefaut: 'basse' },
  'seche-serviette': { label: 'Sèche-serviette', calque: 'chauffage', poseDefaut: 'haute' },
  'plancher-chauffant': { label: 'Plancher chauffant', calque: 'chauffage', poseDefaut: 'basse' },

  // ---- distribution ----
  'tableau-principal': { label: 'Tableau principal', calque: 'distribution', poseDefaut: 'commande' },
  'tableau-divisionnaire': { label: 'Tableau divisionnaire', calque: 'distribution', poseDefaut: 'commande' },
  gtl: { label: 'GTL / coffret communication', calque: 'distribution', poseDefaut: 'commande' },
  'boite-derivation': { label: 'Boîte de dérivation', calque: 'distribution', poseDefaut: 'plafond' },
}

export const CALQUE_LABELS: Record<Calque, string> = {
  prises: 'Prises',
  eclairage: 'Éclairage',
  specialises: 'Spécialisés',
  chauffage: 'Chauffage',
  volets: 'Volets',
  vdi: 'VDI / réseau',
  distribution: 'Distribution',
}

export const CALQUES_ORDRE: Calque[] = [
  'distribution',
  'prises',
  'eclairage',
  'specialises',
  'chauffage',
  'volets',
  'vdi',
]
