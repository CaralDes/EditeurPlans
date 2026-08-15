import { describe, expect, it } from 'vitest'
import { aireM2, calculerEchelle, metresVersPx, pxVersMetres } from '../lib/echelle'

describe('calibration et conversions d’échelle', () => {
  it('déduit les pixels par mètre depuis deux points et une distance réelle', () => {
    const echelle = calculerEchelle({ x: 0, y: 0 }, { x: 200, y: 0 }, 4, 'mur nord 4,00 m')
    expect(echelle.pxParMetre).toBe(50)
  })

  it('convertit correctement dans les deux sens', () => {
    const echelle = { pxParMetre: 84, coteSur: 'test' }
    expect(pxVersMetres(84, echelle)).toBeCloseTo(1)
    expect(metresVersPx(1, echelle)).toBeCloseTo(84)
  })

  it('renvoie null sans échelle définie', () => {
    expect(pxVersMetres(100, null)).toBeNull()
    expect(metresVersPx(1, null)).toBeNull()
  })

  it('calcule la surface d’un rectangle 4 m × 5 m', () => {
    const echelle = { pxParMetre: 50, coteSur: 'test' }
    const polygone = [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 200, y: 250 },
      { x: 0, y: 250 },
    ]
    expect(aireM2(polygone, echelle)).toBeCloseTo(20, 5)
  })
})
