import { describe, expect, it } from 'vitest'
import { longueurMurM } from '../lib/murs'
import type { Mur } from '../types'

const echelle = { pxParMetre: 100, coteSur: 'test' } // 100 px = 1 m

describe('longueurMurM', () => {
  it('additionne la longueur de chaque segment de la polyligne', () => {
    const mur: Mur = {
      id: 'm1',
      epaisseurM: 0.1,
      points: [
        { x: 0, y: 0 },
        { x: 300, y: 0 }, // 3 m
        { x: 300, y: 400 }, // + 4 m = 7 m
      ],
    }
    expect(longueurMurM(mur, echelle)).toBeCloseTo(7, 5)
  })

  it('renvoie null sans échelle calée', () => {
    const mur: Mur = { id: 'm1', epaisseurM: 0.1, points: [{ x: 0, y: 0 }, { x: 100, y: 0 }] }
    expect(longueurMurM(mur, null)).toBeNull()
  })

  it('renvoie null avec un seul point', () => {
    const mur: Mur = { id: 'm1', epaisseurM: 0.1, points: [{ x: 0, y: 0 }] }
    expect(longueurMurM(mur, echelle)).toBeNull()
  })
})
