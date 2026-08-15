import { Layer, Stage } from 'react-konva'
import { Symbole } from './Symbole'
import type { TypeOrgane } from '../types'

const TAILLE = 56

export function SymbolePreview({ type, color = '#16222c' }: { type: TypeOrgane; color?: string }) {
  return (
    <Stage width={TAILLE} height={TAILLE} listening={false}>
      <Layer>
        <Symbole type={type} x={TAILLE / 2} y={TAILLE / 2} scale={(TAILLE / 48) * 0.95} color={color} listening={false} />
      </Layer>
    </Stage>
  )
}
