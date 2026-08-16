import { describe, expect, it } from 'vitest'
import { aireM2 } from '../lib/echelle'
import { pointDansPolygone, pointEtiquette, recalculerAppartenances, trouverPieceContenant } from '../lib/pieces'
import type { Organe, Piece } from '../types'

const carre = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
]

// Pièce en L « courante » : le bras (60 % de la largeur) couvre plus de la moitié du
// contour, comme la plupart des pièces en L réelles. Le centroïde pondéré tombe bien à
// l'intérieur ici.
const lCourant = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 60 },
  { x: 60, y: 60 },
  { x: 60, y: 100 },
  { x: 0, y: 100 },
]

// Pièce en L « extrême » : bras étroits (30 % de la largeur), le renfoncement manquant
// dépasse la moitié de la boîte englobante. Ce cas fait sortir à la fois le centroïde
// pondéré ET le centre de la boîte englobante hors du contour — c'est le cas qui justifie
// le filet de sécurité par triangulation dans pointEtiquette.
const lExtreme = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 30 },
  { x: 30, y: 30 },
  { x: 30, y: 100 },
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

  it('gère une pièce en L : intérieur, extérieur et renfoncement manquant', () => {
    expect(pointDansPolygone({ x: 20, y: 20 }, lCourant)).toBe(true) // dans le bras bas
    expect(pointDansPolygone({ x: 20, y: 80 }, lCourant)).toBe(true) // dans le bras gauche
    expect(pointDansPolygone({ x: 80, y: 80 }, lCourant)).toBe(false) // dans le renfoncement manquant
    expect(pointDansPolygone({ x: 150, y: 50 }, lCourant)).toBe(false) // hors de la boîte englobante
  })
})

describe('aireM2 (pièce en L)', () => {
  it('calcule l’aire réelle d’un L, pas celle de sa boîte englobante', () => {
    // lCourant = carré 100×100 duquel un carré 40×40 est retranché → 10000-1600 = 8400
    const echelle = { pxParMetre: 100, coteSur: 'test' } // 100 px = 1 m → aires en m² = px²/10000
    expect(aireM2(lCourant, echelle)).toBeCloseTo(0.84, 5)
  })
})

describe('pointEtiquette', () => {
  it('renvoie le centre d’un carré', () => {
    expect(pointEtiquette(carre)).toEqual({ x: 50, y: 50 })
  })

  it('reste à l’intérieur d’une pièce en L courante (centroïde pondéré)', () => {
    const p = pointEtiquette(lCourant)
    expect(pointDansPolygone(p, lCourant)).toBe(true)
  })

  it('reste à l’intérieur d’une pièce en L extrême, même quand centroïde, boîte englobante ET moyenne des sommets sortent tous du contour', () => {
    // Vérifie d'abord l'hypothèse : centroïde pondéré, centre de la boîte et moyenne
    // naïve des sommets tombent tous les trois hors du L (dans le renfoncement manquant).
    const centreBoite = { x: 50, y: 50 }
    expect(pointDansPolygone(centreBoite, lExtreme)).toBe(false)
    const moyenneSommetsNaive = { x: (0 + 100 + 100 + 30 + 30 + 0) / 6, y: (0 + 0 + 30 + 30 + 100 + 100) / 6 }
    expect(pointDansPolygone(moyenneSommetsNaive, lExtreme)).toBe(false)

    const p = pointEtiquette(lExtreme)
    expect(pointDansPolygone(p, lExtreme)).toBe(true)
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
