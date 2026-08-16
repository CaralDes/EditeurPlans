import { Group } from 'react-konva'
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
  konvaId?: string
  listening?: boolean
}

// Un symbole est purement visuel : il ne porte aucun gestionnaire d'événement et ne
// participe pas à la détection de collision (listening={false} par défaut sur le plan).
// La sélection et le déplacement sont pilotés par PlanCanvas, qui retient l'organe le
// plus proche du curseur — voir lib/cibles.ts pour la raison de ce choix.
//
// Il est toujours dessiné dans une boîte de référence 48×48 (voir definitions.tsx) et
// positionné ici par son centre : x,y est le point d'implantation réel sur le plan.
export function Symbole({
  type,
  x,
  y,
  rotation = 0,
  scale = 1,
  color = COULEUR_ELECTRICITE,
  konvaId,
  listening = false,
}: SymboleProps) {
  const def = SYMBOL_DEFS[type]
  return (
    <Group
      id={konvaId}
      x={x}
      y={y}
      offsetX={24}
      offsetY={24}
      rotation={rotation}
      scaleX={scale}
      scaleY={scale}
      listening={listening}
    >
      {def.render(color)}
    </Group>
  )
}
