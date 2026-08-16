import { describe, expect, it } from 'vitest'
import { centreEtiquette, pointDansPolygone, recalculerAppartenances, trouverPieceContenant } from '../lib/pieces'
import type { Organe, Piece } from '../types'

const carre = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
]

function organe(id: string, x: number, y: number, pieceId: string | null = null): Organe {
  return {
    id,
    type: 'prise16A',
    pieceId,
    x,
    y,
    rotation: 0,
    hauteurM: 0.05,
    pose: 'basse',
    postes: 1,
    ip: null,
    circuitId: null,
    repere: 'PC-01',
    note: '',
  }
}

function piece(id: string, polygone = carre): Piece {
  return { id, nom: 'Test', type: 'autre', polygone, surfaceM2: 1 }
}

describe('pointDansPolygone', () => {
  it('détecte un point à l’intérieur', () => {
    expect(pointDansPolygone({ x: 50, y: 50 }, carre)).toBe(true)
  })

  it('détecte un point à l’extérieur', () => {
    expect(pointDansPolygone({ x: 150, y: 50 }, carre)).toBe(false)
  })

  it('refuse un polygone dégénéré (moins de 3 sommets)', () => {
    expect(pointDansPolygone({ x: 1, y: 1 }, [{ x: 0, y: 0 }, { x: 10, y: 10 }])).toBe(false)
  })
})

describe('centreEtiquette', () => {
  it('renvoie le centre d’un carré', () => {
    expect(centreEtiquette(carre)).toEqual({ x: 50, y: 50 })
  })
})

describe('trouverPieceContenant', () => {
  it('renvoie la première pièce dont le polygone contient le point', () => {
    const pieces = [piece('P1'), piece('P2', carre.map((p) => ({ x: p.x + 200, y: p.y })))]
    expect(trouverPieceContenant({ x: 50, y: 50 }, pieces)).toBe('P1')
    expect(trouverPieceContenant({ x: 250, y: 50 }, pieces)).toBe('P2')
    expect(trouverPieceContenant({ x: 1000, y: 1000 }, pieces)).toBeNull()
  })
})

describe('recalculerAppartenances', () => {
  it('rattache un organe qui se trouve dans une pièce', () => {
    const organes = [organe('O1', 50, 50)]
    const pieces = [piece('P1')]
    const resultat = recalculerAppartenances(organes, pieces)
    expect(resultat[0]!.pieceId).toBe('P1')
  })

  it('détache un organe déplacé hors de toute pièce', () => {
    const organes = [organe('O1', 50, 50, 'P1')]
    const resultat = recalculerAppartenances(organes, [])
    expect(resultat[0]!.pieceId).toBeNull()
  })

  it('ne crée pas de nouvelle référence quand le rattachement ne change pas', () => {
    const organes = [organe('O1', 50, 50, 'P1')]
    const pieces = [piece('P1')]
    const resultat = recalculerAppartenances(organes, pieces)
    expect(resultat[0]).toBe(organes[0]) // même référence : aucune écriture inutile
  })
})
