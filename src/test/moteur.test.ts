import { describe, expect, it } from 'vitest'
import { circuitDef, verifierPiece } from '../regles/moteur'
import type { Organe, Piece } from '../types'

function organe(type: Organe['type'], pieceId: string): Organe {
  return {
    id: Math.random().toString(36),
    type,
    pieceId,
    x: 0,
    y: 0,
    rotation: 0,
    hauteurM: 0,
    pose: 'basse',
    postes: 1,
    ip: null,
    circuitId: null,
    repere: 'X-00',
    note: '',
  }
}

describe('moteur de règles NF C 15-100', () => {
  it('un séjour de 24,6 m² exige 5 prises minimum', () => {
    const sejour: Piece = { id: 'P1', nom: 'Séjour', type: 'sejour', polygone: [], surfaceM2: 24.6 }
    const conformite = verifierPiece(sejour, [])
    expect(conformite.prisesRequises).toBe(5)
    expect(conformite.ok).toBe(false)
  })

  it('un séjour de plus de 28 m² exige 7 prises', () => {
    const sejour: Piece = { id: 'P1', nom: 'Séjour', type: 'sejour', polygone: [], surfaceM2: 32 }
    const conformite = verifierPiece(sejour, [])
    expect(conformite.prisesRequises).toBe(7)
  })

  it('une cuisine de plus de 4 m² exige 6 prises', () => {
    const cuisine: Piece = { id: 'P2', nom: 'Cuisine', type: 'cuisine', polygone: [], surfaceM2: 9 }
    const organes = [...Array.from({ length: 6 }, () => organe('prise16A', 'P2')), organe('point-lumineux', 'P2')]
    const conformite = verifierPiece(cuisine, organes)
    expect(conformite.prisesRequises).toBe(6)
    expect(conformite.ok).toBe(true)
  })

  it('la plaque de cuisson est en 6 mm² / 32 A, un seul point', () => {
    const def = circuitDef('plaque-cuisson')
    expect(def?.sectionMm2).toBe(6)
    expect(def?.calibreA).toBe(32)
    expect(def?.maxOrganes).toBe(1)
  })

  it('les prises générales en 2,5 mm² acceptent 12 socles maximum', () => {
    const def = circuitDef('prises-16A-2.5')
    expect(def?.maxOrganes).toBe(12)
  })
})
