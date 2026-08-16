import { Line, Rect } from 'react-konva'
import type { Nappe } from '../lib/lumiere'

interface CalqueEclairageProps {
  nappes: Nappe[]
  largeur: number
  hauteur: number
  /** 0 = plein jour (aucun assombrissement), 1 = nuit noire. */
  intensiteNuit: number
}

function aplatirRelatif(n: Nappe): number[] {
  return n.polygone.flatMap((p) => [p.x - n.x, p.y - n.y])
}

/**
 * Rendu de l'ambiance lumineuse, en deux passes sur un même calque Konva :
 *   1. un voile sombre couvrant le plan, que chaque luminaire vient creuser
 *      (composition « destination-out ») pour dégager sa nappe de lumière ;
 *   2. une teinte additive à la couleur de la source, qui donne son caractère
 *      chaud ou froid à chaque nappe.
 *
 * Chaque nappe est découpée par son polygone de visibilité (occulté par les murs, voir
 * lib/ombres.ts) plutôt qu'un simple cercle : le dégradé radial reste ancré sur la
 * source, mais s'arrête net à l'ombre portée d'un mur au lieu de le traverser.
 *
 * Les deux passes doivent rester dans le même calque : la composition Konva opère
 * sur le canevas du calque, et serait sans effet d'un calque à l'autre.
 */
export function CalqueEclairage({ nappes, largeur, hauteur, intensiteNuit }: CalqueEclairageProps) {
  return (
    <>
      <Rect x={0} y={0} width={largeur} height={hauteur} fill="#0a0f18" opacity={intensiteNuit} listening={false} />

      {nappes.map((n) => (
        <Line
          key={`creux-${n.id}`}
          x={n.x}
          y={n.y}
          points={aplatirRelatif(n)}
          closed
          fillRadialGradientStartPoint={{ x: 0, y: 0 }}
          fillRadialGradientStartRadius={0}
          fillRadialGradientEndPoint={{ x: 0, y: 0 }}
          fillRadialGradientEndRadius={n.rayonPx}
          fillRadialGradientColorStops={[
            0,
            `rgba(0,0,0,${0.96 * n.intensite})`,
            0.45,
            `rgba(0,0,0,${0.72 * n.intensite})`,
            0.75,
            `rgba(0,0,0,${0.34 * n.intensite})`,
            1,
            'rgba(0,0,0,0)',
          ]}
          globalCompositeOperation="destination-out"
          listening={false}
        />
      ))}

      {nappes.map((n) => {
        const { r, v, b } = n.couleur
        return (
          <Line
            key={`teinte-${n.id}`}
            x={n.x}
            y={n.y}
            points={aplatirRelatif(n)}
            closed
            fillRadialGradientStartPoint={{ x: 0, y: 0 }}
            fillRadialGradientStartRadius={0}
            fillRadialGradientEndPoint={{ x: 0, y: 0 }}
            fillRadialGradientEndRadius={n.rayonPx}
            fillRadialGradientColorStops={[
              0,
              `rgba(${r},${v},${b},${0.3 * n.intensite})`,
              0.6,
              `rgba(${r},${v},${b},${0.12 * n.intensite})`,
              1,
              `rgba(${r},${v},${b},0)`,
            ]}
            globalCompositeOperation="lighter"
            listening={false}
          />
        )
      })}
    </>
  )
}
