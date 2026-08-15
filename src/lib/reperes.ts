import type { Organe, TypeOrgane } from '../types'

const PREFIXES: Record<TypeOrgane, string> = {
  prise16A: 'PC',
  'prise16A-double': 'PC',
  'prise16A-etanche': 'PC',
  prise32A: 'PZ',
  'prise-commandee': 'PK',
  'prise-rj45': 'RJ',
  'prise-tv': 'TV',
  'point-lumineux': 'EC',
  applique: 'AP',
  spot: 'SP',
  'reglette-led': 'RL',
  'interrupteur-simple': 'INT',
  'va-et-vient': 'VV',
  'bouton-poussoir': 'BP',
  variateur: 'VAR',
  'detecteur-presence': 'DET',
  daaf: 'DAAF',
  'alim-lave-vaisselle': 'LV',
  'alim-lave-linge': 'LL',
  'alim-seche-linge': 'SL',
  'alim-four': 'FR',
  'alim-plaque': 'PLQ',
  'alim-refrigerateur': 'RF',
  'alim-congelateur': 'CG',
  'chauffe-eau': 'ECS',
  vmc: 'VMC',
  'volet-roulant': 'VR',
  'radiateur-electrique': 'RAD',
  'seche-serviette': 'SS',
  'plancher-chauffant': 'PCH',
  'tableau-principal': 'TGBT',
  'tableau-divisionnaire': 'TD',
  gtl: 'GTL',
  'boite-derivation': 'BD',
}

export function prefixePour(type: TypeOrgane): string {
  return PREFIXES[type]
}

export function prochainRepere(organes: Organe[], type: TypeOrgane): string {
  const prefixe = PREFIXES[type]
  let max = 0
  for (const o of organes) {
    if (!o.repere.startsWith(prefixe + '-')) continue
    const n = Number(o.repere.slice(prefixe.length + 1))
    if (Number.isFinite(n) && n > max) max = n
  }
  const n = max + 1
  return `${prefixe}-${String(n).padStart(2, '0')}`
}
