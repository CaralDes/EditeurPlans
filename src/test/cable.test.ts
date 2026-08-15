import { describe, expect, it } from 'vitest'
import { longueurCableM } from '../lib/cable'
import type { Cheminement } from '../types'

const echelle = { pxParMetre: 100, coteSur: 'test' } // 100 px = 1 m

function cheminement(mode: Cheminement['mode'], longueur2Dpx: number): Cheminement {
  return {
    id: 'c1',
    circuitId: 'circuit-1',
    mode,
    points: [
      { x: 0, y: 0 },
      { x: longueur2Dpx, y: 0 },
    ],
    deOrgane: 'organe-1',
    versNoeud: 'tableau-1',
  }
}

describe('longueurCableM', () => {
  it('mode plafond : ajoute la remontée au plafond aux deux extrémités', () => {
    // 1000 px = 10 m à plat ; organe à 0,05 m, tableau à 1,10 m, plafond à 2,50 m
    const longueur = longueurCableM(cheminement('plafond', 1000), 0.05, 1.1, 2.5, echelle, 0.1, 1)
    // vertical = (2.5-0.05) + (2.5-1.10) = 2.45 + 1.40 = 3.85
    // (10 + 3.85) * 1.1 + 1 = 16.235
    expect(longueur).toBeCloseTo(16.235, 3)
  })

  it('mode sol : la remontée se limite à la hauteur de pose de chaque extrémité', () => {
    const longueur = longueurCableM(cheminement('sol', 1000), 0.05, 1.1, 2.5, echelle, 0.1, 1)
    // vertical = 0.05 + 1.10 = 1.15 ; (10 + 1.15) * 1.1 + 1 = 13.265
    expect(longueur).toBeCloseTo(13.265, 3)
  })

  it('un cheminement plus haut (plafond) donne un câble plus long que le même tracé au sol', () => {
    const auPlafond = longueurCableM(cheminement('plafond', 1000), 0.05, 1.1, 2.5, echelle, 0.1, 1)!
    const auSol = longueurCableM(cheminement('sol', 1000), 0.05, 1.1, 2.5, echelle, 0.1, 1)!
    expect(auPlafond).toBeGreaterThan(auSol)
  })

  it('renvoie null sans échelle calée', () => {
    expect(longueurCableM(cheminement('plafond', 1000), 0.05, 1.1, 2.5, null, 0.1, 1)).toBeNull()
  })

  it('renvoie null avec un tracé à un seul point', () => {
    const c = cheminement('plafond', 1000)
    c.points = [{ x: 0, y: 0 }]
    expect(longueurCableM(c, 0.05, 1.1, 2.5, echelle, 0.1, 1)).toBeNull()
  })
})
