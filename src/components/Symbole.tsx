import { Circle, Group } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { SYMBOL_DEFS } from '../symbols/definitions'
import { COULEUR_ELECTRICITE } from '../lib/couleurs'
import type { TypeOrgane } from '../types'

interface SymboleProps {
  type: TypeOrgane
  x: number
  y: number
  rotation?: number
  scale?: number
  color?: string
  onClick?: (e: KonvaEventObject<MouseEvent | TouchEvent>) => void
  onDragEnd?: (x: number, y: number) => void
  draggable?: boolean
  listening?: boolean
}

// Un symbole est toujours dessiné dans une boîte de référence 48×48 (voir definitions.tsx)
// et positionné ici par son centre : x,y est le point d'implantation réel sur le plan.
export function Symbole({
  type,
  x,
  y,
  rotation = 0,
  scale = 1,
  color = COULEUR_ELECTRICITE,
  onClick,
  onDragEnd,
  draggable = false,
  listening = true,
}: SymboleProps) {
  const def = SYMBOL_DEFS[type]
  return (
    <Group
      x={x}
      y={y}
      offsetX={24}
      offsetY={24}
      rotation={rotation}
      scaleX={scale}
      scaleY={scale}
      draggable={draggable}
      listening={listening}
      // Sélection sur mousedown/touchstart plutôt que click/tap : ces derniers sont annulés
      // par Konva dès que la souris bouge un peu entre l'appui et le relâchement (le Group
      // étant draggable, le moindre tremblement démarre un glissement) — ce qui faisait
      // échouer la sélection sans prévenir. mousedown fire toujours, avant cette ambiguïté.
      onMouseDown={onClick}
      onTouchStart={onClick}
      onDragEnd={(e) => onDragEnd?.(e.target.x(), e.target.y())}
    >
      {/* Zone de clic invisible, plus resserrée que la boîte 48×48 complète : les symboles ne
          sont que des traits fins sans remplissage, donc sans cette zone Konva ne détecterait
          le clic que sur le tracé lui-même. Une zone trop large ferait au contraire chevaucher
          deux organes posés proches l'un de l'autre, et Konva sélectionnerait le mauvais. */}
      <Circle x={24} y={24} radius={18} fill="transparent" />
      {def.render(color)}
    </Group>
  )
}
