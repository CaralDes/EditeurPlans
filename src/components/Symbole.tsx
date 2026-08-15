import { Group, Rect } from 'react-konva'
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
      onClick={onClick}
      onTap={onClick}
      onDragEnd={(e) => onDragEnd?.(e.target.x(), e.target.y())}
    >
      {/* Zone de clic invisible : les symboles ne sont que des traits fins sans remplissage,
          donc sans cette zone, Konva ne détecte le clic/glisser que sur le tracé lui-même
          (quelques pixels de large) et non sur toute la tuile de l'icône. */}
      <Rect x={0} y={0} width={48} height={48} fill="transparent" />
      {def.render(color)}
    </Group>
  )
}
