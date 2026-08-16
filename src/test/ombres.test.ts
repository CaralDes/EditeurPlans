import { describe, expect, it } from 'vitest'
import { mursEnSegments, polygoneVisibilite } from '../lib/ombres'
import type { Mur, Point } from '../types'

function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

describe('mursEnSegments', () => {
  it('convertit une polyligne de 3 points en 2 segments consécutifs', () => {
    const murs: Mur[] = [
      {
        id: 'm1',
        epaisseurM: 0.1,
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 },
        ],
      },
    ]
    const segments = mursEnSegments(murs)
    expect(segments).toHaveLength(2)
    expect(segments[0]).toEqual({ a: { x: 0, y: 0 }, b: { x: 100, y: 0 } })
    expect(segments[1]).toEqual({ a: { x: 100, y: 0 }, b: { x: 100, y: 100 } })
  })

  it('un mur à un seul point ne produit aucun segment', () => {
    const murs: Mur[] = [{ id: 'm1', epaisseurM: 0.1, points: [{ x: 0, y: 0 }] }]
    expect(mursEnSegments(murs)).toHaveLength(0)
  })
})

describe('polygoneVisibilite', () => {
  const origine = { x: 0, y: 0 }
  const rayonMax = 100

  it('sans mur, approxime un cercle plein de rayon rayonMax', () => {
    const polygone = polygoneVisibilite(origine, [], rayonMax)
    expect(polygone.length).toBeGreaterThan(50)
    for (const p of polygone) {
      expect(distance(origine, p)).toBeCloseTo(rayonMax, 5)
    }
  })

  it('un mur qui traverse tout un côté bloque la lumière de ce côté, mais pas de l’autre', () => {
    // Mur vertical à x=20, bien plus long que rayonMax : aucun rayon ne peut contourner
    // ses extrémités dans le cercle de portée testé, donc tout ce qui est à droite de
    // l'origine doit rester bloqué à x<=20.
    const segments = mursEnSegments([
      { id: 'm1', epaisseurM: 0.1, points: [{ x: 20, y: -1000 }, { x: 20, y: 1000 }] },
    ])
    const polygone = polygoneVisibilite(origine, segments, rayonMax)

    // Aucun point du polygone ne doit dépasser le mur (x <= 20 + marge flottante).
    for (const p of polygone) {
      expect(p.x).toBeLessThanOrEqual(20.01)
    }
    // Mais côté opposé (x très négatif), la lumière porte toujours jusqu'au rayon max.
    const pointsGauche = polygone.filter((p) => p.x < -90)
    expect(pointsGauche.length).toBeGreaterThan(0)
  })

  it('une boîte fermée avec une ouverture ne laisse la lumière sortir que par l’ouverture', () => {
    // Boîte 40x40 centrée sur l'origine, avec une ouverture de 10 sur le côté droit.
    const segments = mursEnSegments([
      { id: 'nord', epaisseurM: 0.1, points: [{ x: -20, y: -20 }, { x: 20, y: -20 }] },
      { id: 'sud', epaisseurM: 0.1, points: [{ x: -20, y: 20 }, { x: 20, y: 20 }] },
      { id: 'ouest', epaisseurM: 0.1, points: [{ x: -20, y: -20 }, { x: -20, y: 20 }] },
      // Est : deux segments avec un trou entre y=-5 et y=5.
      { id: 'est-haut', epaisseurM: 0.1, points: [{ x: 20, y: -20 }, { x: 20, y: -5 }] },
      { id: 'est-bas', epaisseurM: 0.1, points: [{ x: 20, y: 5 }, { x: 20, y: 20 }] },
    ])
    const rayon = 200
    const polygone = polygoneVisibilite(origine, segments, rayon)

    // Aucun point ne doit s'échapper loin au-delà des murs, sauf ceux qui passent par le trou.
    const echappes = polygone.filter((p) => distance(origine, p) > 50)
    for (const p of echappes) {
      // Ces points ne peuvent exister que dans le cône de l'ouverture (x > 20, |y| petit).
      expect(p.x).toBeGreaterThan(19)
    }
    expect(echappes.length).toBeGreaterThan(0) // au moins un rayon passe bien par le trou
  })
})
