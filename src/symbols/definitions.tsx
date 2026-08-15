import type { ReactNode } from 'react'
import { Arc, Circle, Line, Rect, Text } from 'react-konva'
import type { PoseHauteur, TypeOrgane } from '../types'

// Chaque symbole est dessiné dans une boîte de référence 48×48, centrée en (24,24).
// Le composant Symbole (src/components/Symbole.tsx) l'entoure d'un Group positionné,
// pivoté et mis à l'échelle : ce fichier ne connaît que la géométrie, pas la position.

export type Calque =
  | 'prises'
  | 'eclairage'
  | 'specialises'
  | 'chauffage'
  | 'volets'
  | 'vdi'
  | 'distribution'

export interface SymbolDef {
  label: string
  calque: Calque
  poseDefaut: PoseHauteur
  render: (color: string) => ReactNode
}

const M = 'monospace'

function priseBase(color: string, r = 12, cx = 24, cy = 26) {
  return (
    <>
      <Arc x={cx} y={cy} innerRadius={0} outerRadius={r} angle={180} rotation={180} stroke={color} strokeWidth={1.7} />
      <Line points={[cx - r, cy, cx + r, cy]} stroke={color} strokeWidth={1.7} lineCap="round" />
      <Line points={[cx, cy - r - 4, cx, cy - r + 4]} stroke={color} strokeWidth={1.7} lineCap="round" />
      <Line points={[cx - 7, cy - r + 4, cx + 7, cy - r + 4]} stroke={color} strokeWidth={1.7} lineCap="round" />
    </>
  )
}

function pointLumineux(color: string, r = 9) {
  const k = r * 0.75
  return (
    <>
      <Circle x={24} y={24} radius={r} stroke={color} strokeWidth={1.7} />
      <Line points={[24 - k, 24 - k, 24 + k, 24 + k]} stroke={color} strokeWidth={1.7} lineCap="round" />
      <Line points={[24 + k, 24 - k, 24 - k, 24 + k]} stroke={color} strokeWidth={1.7} lineCap="round" />
    </>
  )
}

function commandeBase(color: string, lames: number) {
  const lignes = []
  for (let i = 0; i < lames; i++) {
    const dx = i * 5
    lignes.push(
      <Line key={i} points={[18 + dx, 40 - dx, 34, 24 - dx]} stroke={color} strokeWidth={1.7} lineCap="round" />,
    )
  }
  return (
    <>
      <Line points={[8, 40, 18, 40]} stroke={color} strokeWidth={1.7} lineCap="round" />
      <Circle x={18} y={40} radius={2.6} fill={color} />
      {lignes}
    </>
  )
}

function appareilBox(color: string, code: string, w = 30, h = 20) {
  const x = 24 - w / 2
  const y = 24 - h / 2
  return (
    <>
      <Rect x={x} y={y} width={w} height={h} cornerRadius={2} stroke={color} strokeWidth={1.7} />
      <Text x={x} y={24 - 5} width={w} align="center" text={code} fontSize={10} fontStyle="700" fontFamily={M} fill={color} />
    </>
  )
}

export const SYMBOL_DEFS: Record<TypeOrgane, SymbolDef> = {
  // ---- prises ----
  prise16A: {
    label: 'Prise 16 A',
    calque: 'prises',
    poseDefaut: 'basse',
    render: (c) => priseBase(c),
  },
  'prise16A-double': {
    label: 'Prise double',
    calque: 'prises',
    poseDefaut: 'basse',
    render: (c) => (
      <>
        {priseBase(c, 9, 17, 26)}
        {priseBase(c, 9, 31, 26)}
      </>
    ),
  },
  'prise16A-etanche': {
    label: 'Prise étanche IP44',
    calque: 'prises',
    poseDefaut: 'basse',
    render: (c) => (
      <>
        <Rect x={9} y={12} width={30} height={28} cornerRadius={3} stroke={c} strokeWidth={1.3} dash={[3, 2]} />
        {priseBase(c)}
      </>
    ),
  },
  prise32A: {
    label: 'Prise 32 A (plaque)',
    calque: 'prises',
    poseDefaut: 'haute',
    render: (c) => (
      <>
        {priseBase(c, 13, 24, 24)}
        <Text x={0} y={40} width={48} align="center" text="32A" fontSize={8} fontFamily={M} fill={c} />
      </>
    ),
  },
  'prise-commandee': {
    label: 'Prise commandée',
    calque: 'prises',
    poseDefaut: 'basse',
    render: (c) => (
      <>
        {priseBase(c)}
        <Line points={[32, 16, 40, 8]} stroke={c} strokeWidth={2} lineCap="round" />
        <Line points={[40, 8, 35, 8]} stroke={c} strokeWidth={2} lineCap="round" />
        <Line points={[40, 8, 40, 13]} stroke={c} strokeWidth={2} lineCap="round" />
      </>
    ),
  },
  'prise-rj45': {
    label: 'Prise RJ45',
    calque: 'vdi',
    poseDefaut: 'basse',
    render: (c) => (
      <>
        <Rect x={9} y={16} width={30} height={18} cornerRadius={1.5} stroke={c} strokeWidth={1.7} />
        <Line points={[9, 22, 39, 22]} stroke={c} strokeWidth={1.7} />
        <Rect x={15} y={27} width={6} height={4} stroke={c} strokeWidth={1.3} />
        <Rect x={27} y={27} width={6} height={4} stroke={c} strokeWidth={1.3} />
      </>
    ),
  },
  'prise-tv': {
    label: 'Prise TV',
    calque: 'vdi',
    poseDefaut: 'basse',
    render: (c) => (
      <>
        {priseBase(c, 12, 24, 24)}
        <Line points={[20, 6, 24, 12, 28, 6]} stroke={c} strokeWidth={1.5} lineCap="round" />
      </>
    ),
  },

  // ---- éclairage ----
  'point-lumineux': {
    label: 'Point lumineux',
    calque: 'eclairage',
    poseDefaut: 'plafond',
    render: (c) => pointLumineux(c),
  },
  applique: {
    label: 'Applique murale',
    calque: 'eclairage',
    poseDefaut: 'plafond',
    render: (c) => (
      <>
        <Line points={[12, 8, 12, 40]} stroke={c} strokeWidth={1.7} />
        <Line points={[12, 24, 18, 24]} stroke={c} strokeWidth={1.7} />
        <Circle x={26} y={24} radius={8} stroke={c} strokeWidth={1.7} />
        <Line points={[20.3, 18.3, 31.7, 29.7]} stroke={c} strokeWidth={1.7} lineCap="round" />
        <Line points={[31.7, 18.3, 20.3, 29.7]} stroke={c} strokeWidth={1.7} lineCap="round" />
      </>
    ),
  },
  spot: {
    label: 'Spot encastré',
    calque: 'eclairage',
    poseDefaut: 'plafond',
    render: (c) => (
      <>
        <Circle x={24} y={24} radius={10} stroke={c} strokeWidth={1.7} />
        <Circle x={24} y={24} radius={3.4} fill={c} />
      </>
    ),
  },
  'reglette-led': {
    label: 'Réglette LED',
    calque: 'eclairage',
    poseDefaut: 'plafond',
    render: (c) => (
      <>
        <Rect x={7} y={19} width={34} height={10} cornerRadius={1.5} stroke={c} strokeWidth={1.7} />
        <Line points={[7, 24, 41, 24]} stroke={c} strokeWidth={1.2} />
      </>
    ),
  },
  'interrupteur-simple': {
    label: 'Interrupteur simple',
    calque: 'eclairage',
    poseDefaut: 'commande',
    render: (c) => commandeBase(c, 1),
  },
  'va-et-vient': {
    label: 'Va-et-vient',
    calque: 'eclairage',
    poseDefaut: 'commande',
    render: (c) => commandeBase(c, 2),
  },
  'bouton-poussoir': {
    label: 'Bouton poussoir',
    calque: 'eclairage',
    poseDefaut: 'commande',
    render: (c) => (
      <>
        <Line points={[8, 40, 18, 40]} stroke={c} strokeWidth={1.7} lineCap="round" />
        <Circle x={18} y={40} radius={2.6} fill={c} />
        <Line points={[18, 40, 32, 26]} stroke={c} strokeWidth={1.7} lineCap="round" />
        <Circle x={35} y={23} radius={5} stroke={c} strokeWidth={1.7} />
      </>
    ),
  },
  variateur: {
    label: 'Variateur',
    calque: 'eclairage',
    poseDefaut: 'commande',
    render: (c) => (
      <>
        {commandeBase(c, 1)}
        <Line points={[10, 14, 14, 20, 18, 10, 22, 20, 26, 14]} stroke={c} strokeWidth={1.3} lineCap="round" tension={0.4} />
      </>
    ),
  },
  'detecteur-presence': {
    label: 'Détecteur de présence',
    calque: 'eclairage',
    poseDefaut: 'plafond',
    render: (c) => (
      <>
        <Circle x={24} y={24} radius={10} stroke={c} strokeWidth={1.7} />
        <Line points={[24, 14, 24, 34]} stroke={c} strokeWidth={1.7} />
        <Line points={[34, 24, 39, 24]} stroke={c} strokeWidth={1.7} />
        <Line points={[31.5, 16.5, 35.5, 12.5]} stroke={c} strokeWidth={1.7} lineCap="round" />
        <Line points={[31.5, 31.5, 35.5, 35.5]} stroke={c} strokeWidth={1.7} lineCap="round" />
      </>
    ),
  },
  daaf: {
    label: 'DAAF (détecteur fumée)',
    calque: 'eclairage',
    poseDefaut: 'plafond',
    render: (c) => (
      <>
        <Circle x={24} y={24} radius={11} stroke={c} strokeWidth={1.7} />
        <Arc x={24} y={24} innerRadius={6} outerRadius={6} angle={140} rotation={200} stroke={c} strokeWidth={1.7} />
        <Circle x={24} y={24} radius={2} fill={c} />
      </>
    ),
  },

  // ---- spécialisés / gros électroménager ----
  'alim-lave-vaisselle': { label: 'Lave-vaisselle', calque: 'specialises', poseDefaut: 'basse', render: (c) => appareilBox(c, 'LV') },
  'alim-lave-linge': { label: 'Lave-linge', calque: 'specialises', poseDefaut: 'basse', render: (c) => appareilBox(c, 'LL') },
  'alim-seche-linge': { label: 'Sèche-linge', calque: 'specialises', poseDefaut: 'basse', render: (c) => appareilBox(c, 'SL') },
  'alim-four': { label: 'Four', calque: 'specialises', poseDefaut: 'basse', render: (c) => appareilBox(c, 'F') },
  'alim-plaque': { label: 'Plaque de cuisson', calque: 'specialises', poseDefaut: 'haute', render: (c) => appareilBox(c, 'PLQ') },
  'alim-refrigerateur': { label: 'Réfrigérateur', calque: 'specialises', poseDefaut: 'basse', render: (c) => appareilBox(c, 'RF') },
  'alim-congelateur': { label: 'Congélateur', calque: 'specialises', poseDefaut: 'basse', render: (c) => appareilBox(c, 'CG') },
  'chauffe-eau': {
    label: 'Chauffe-eau',
    calque: 'specialises',
    poseDefaut: 'haute',
    render: (c) => (
      <>
        <Rect x={13} y={8} width={22} height={32} cornerRadius={10} stroke={c} strokeWidth={1.7} />
        <Text x={13} y={19} width={22} align="center" text="ECS" fontSize={8} fontStyle="700" fontFamily={M} fill={c} />
      </>
    ),
  },
  vmc: {
    label: 'VMC',
    calque: 'specialises',
    poseDefaut: 'plafond',
    render: (c) => (
      <>
        <Circle x={24} y={24} radius={12} stroke={c} strokeWidth={1.7} />
        <Line points={[24, 24, 24, 13]} stroke={c} strokeWidth={1.7} lineCap="round" tension={1} />
        <Line points={[24, 24, 35, 24]} stroke={c} strokeWidth={1.7} lineCap="round" tension={1} />
        <Line points={[24, 24, 24, 35]} stroke={c} strokeWidth={1.7} lineCap="round" tension={1} />
        <Line points={[24, 24, 13, 24]} stroke={c} strokeWidth={1.7} lineCap="round" tension={1} />
      </>
    ),
  },
  'volet-roulant': {
    label: 'Volet roulant',
    calque: 'volets',
    poseDefaut: 'haute',
    render: (c) => (
      <>
        <Rect x={7} y={12} width={24} height={24} cornerRadius={1.5} stroke={c} strokeWidth={1.7} />
        <Line points={[7, 19, 31, 19]} stroke={c} strokeWidth={1.2} />
        <Line points={[7, 26, 31, 26]} stroke={c} strokeWidth={1.2} />
        <Line points={[7, 33, 31, 33]} stroke={c} strokeWidth={1.2} />
        <Circle x={39} y={24} radius={6} stroke={c} strokeWidth={1.7} />
        <Text x={33} y={20.5} width={12} align="center" text="M" fontSize={8} fontStyle="700" fontFamily={M} fill={c} />
      </>
    ),
  },

  // ---- chauffage électrique ----
  'radiateur-electrique': {
    label: 'Radiateur électrique',
    calque: 'chauffage',
    poseDefaut: 'basse',
    render: (c) => (
      <>
        <Rect x={8} y={15} width={32} height={18} cornerRadius={1.5} stroke={c} strokeWidth={1.7} />
        <Line points={[15, 15, 15, 33]} stroke={c} strokeWidth={1.3} />
        <Line points={[22, 15, 22, 33]} stroke={c} strokeWidth={1.3} />
        <Line points={[29, 15, 29, 33]} stroke={c} strokeWidth={1.3} />
        <Line points={[36, 15, 36, 33]} stroke={c} strokeWidth={1.3} />
      </>
    ),
  },
  'seche-serviette': {
    label: 'Sèche-serviette',
    calque: 'chauffage',
    poseDefaut: 'haute',
    render: (c) => (
      <>
        <Rect x={14} y={7} width={20} height={34} cornerRadius={1.5} stroke={c} strokeWidth={1.7} />
        {[13, 18, 23, 28, 33, 38].map((y) => (
          <Line key={y} points={[14, y, 34, y]} stroke={c} strokeWidth={1.2} />
        ))}
      </>
    ),
  },
  'plancher-chauffant': {
    label: 'Plancher chauffant',
    calque: 'chauffage',
    poseDefaut: 'basse',
    render: (c) => (
      <>
        <Rect x={8} y={8} width={32} height={32} cornerRadius={1.5} stroke={c} strokeWidth={1.5} />
        <Line points={[8, 20, 20, 8]} stroke={c} strokeWidth={1} />
        <Line points={[8, 32, 32, 8]} stroke={c} strokeWidth={1} />
        <Line points={[16, 40, 40, 16]} stroke={c} strokeWidth={1} />
        <Line points={[28, 40, 40, 28]} stroke={c} strokeWidth={1} />
        <Text x={8} y={20} width={32} align="center" text="PC" fontSize={9} fontStyle="700" fontFamily={M} fill={c} />
      </>
    ),
  },

  // ---- distribution ----
  'tableau-principal': {
    label: 'Tableau principal',
    calque: 'distribution',
    poseDefaut: 'commande',
    render: (c) => (
      <>
        <Rect x={8} y={10} width={32} height={28} cornerRadius={1.5} stroke={c} strokeWidth={1.9} />
        <Line points={[8, 38, 40, 10]} stroke={c} strokeWidth={1.2} />
        <Line points={[8, 28, 30, 10]} stroke={c} strokeWidth={1.2} />
        <Line points={[8, 18, 20, 10]} stroke={c} strokeWidth={1.2} />
        <Line points={[18, 38, 40, 20]} stroke={c} strokeWidth={1.2} />
        <Line points={[28, 38, 40, 30]} stroke={c} strokeWidth={1.2} />
        <Text x={8} y={41} width={32} align="center" text="TGBT" fontSize={7} fontStyle="700" fontFamily={M} fill={c} />
      </>
    ),
  },
  'tableau-divisionnaire': {
    label: 'Tableau divisionnaire',
    calque: 'distribution',
    poseDefaut: 'commande',
    render: (c) => (
      <>
        <Rect x={9} y={11} width={30} height={26} cornerRadius={1.5} stroke={c} strokeWidth={1.7} dash={[4, 2]} />
        <Line points={[9, 37, 39, 11]} stroke={c} strokeWidth={1} />
        <Line points={[9, 24, 22, 11]} stroke={c} strokeWidth={1} />
        <Line points={[22, 37, 39, 20]} stroke={c} strokeWidth={1} />
        <Text x={9} y={40} width={30} align="center" text="TD" fontSize={7} fontStyle="700" fontFamily={M} fill={c} />
      </>
    ),
  },
  gtl: {
    label: 'GTL / coffret communication',
    calque: 'distribution',
    poseDefaut: 'commande',
    render: (c) => (
      <>
        <Rect x={10} y={8} width={28} height={32} cornerRadius={1.5} stroke={c} strokeWidth={1.7} />
        <Line points={[10, 20, 38, 20]} stroke={c} strokeWidth={1.3} />
        <Line points={[10, 30, 38, 30]} stroke={c} strokeWidth={1.3} />
      </>
    ),
  },
  'boite-derivation': {
    label: 'Boîte de dérivation',
    calque: 'distribution',
    poseDefaut: 'plafond',
    render: (c) => (
      <>
        <Circle x={24} y={24} radius={8} stroke={c} strokeWidth={1.6} />
        <Line points={[17, 24, 31, 24]} stroke={c} strokeWidth={1.6} />
        <Line points={[24, 17, 24, 31]} stroke={c} strokeWidth={1.6} />
      </>
    ),
  },
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
