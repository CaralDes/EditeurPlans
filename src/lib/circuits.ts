import type { TypeOrgane } from '../types'

// Circuit suggéré (identifiant dans src/regles/nfc15100.json) par type d'organe, quand
// un rattachement automatique a du sens. Les organes absents de cette table (DAAF —
// autonome par obligation légale, pas câblé —, tableaux, GTL, boîte de dérivation) ne
// se rattachent à aucun circuit : ce sont soit hors périmètre, soit des équipements de
// distribution eux-mêmes.
export const CIRCUIT_SUGGERE: Partial<Record<TypeOrgane, string>> = {
  prise16A: 'prises-16A-2.5',
  'prise16A-double': 'prises-16A-2.5',
  'prise16A-etanche': 'prises-16A-2.5',
  'prise-commandee': 'prises-16A-2.5',
  'prise-rj45': 'prises-16A-2.5',
  'prise-tv': 'prises-16A-2.5',
  prise32A: 'plaque-cuisson',

  'point-lumineux': 'eclairage',
  applique: 'eclairage',
  spot: 'eclairage',
  'reglette-led': 'eclairage',
  'interrupteur-simple': 'eclairage',
  'va-et-vient': 'eclairage',
  'bouton-poussoir': 'eclairage',
  variateur: 'eclairage',
  'detecteur-presence': 'eclairage',

  'alim-lave-vaisselle': 'lave-vaisselle',
  'alim-lave-linge': 'lave-linge',
  'alim-seche-linge': 'seche-linge',
  'alim-four': 'four',
  'alim-plaque': 'plaque-cuisson',
  'alim-hotte': 'hotte',
  'alim-refrigerateur': 'refrigerateur-congelateur',
  'alim-congelateur': 'refrigerateur-congelateur',
  'chauffe-eau': 'chauffe-eau',
  vmc: 'vmc',
  'volet-roulant': 'volets-roulants',

  // Convecteurs/sèche-serviette/plancher : 16 A par défaut (≤ 3000 W) ; à repasser en
  // 20 A manuellement si la puissance cumulée du circuit dépasse ce seuil.
  'radiateur-electrique': 'chauffage-16A',
  'seche-serviette': 'chauffage-16A',
  'plancher-chauffant': 'chauffage-16A',
}

export function suggererCircuit(type: TypeOrgane): string | undefined {
  return CIRCUIT_SUGGERE[type]
}
