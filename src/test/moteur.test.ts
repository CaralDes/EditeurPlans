import { describe, expect, it } from 'vitest'
import { circuitDef, circuitsEclairageMin, maxCircuitsParDifferentiel, verifierPiece } from '../regles/moteur'
import type { Organe, Piece } from '../types'

function organe(type: Organe['type'], pieceId: string, pose: Organe['pose'] = 'basse'): Organe {
  return {
    id: Math.random().toString(36),
    type,
    pieceId,
    x: 0,
    y: 0,
    rotation: 0,
    hauteurM: 0,
    pose,
    postes: 1,
    ip: null,
    circuitId: null,
    repere: 'X-00',
    note: '',
  }
}

describe('moteur de règles NF C 15-100', () => {
  // Le séjour suit « 1 prise par tranche de 4 m², minimum 5 ». La tranche est comptée
  // entamée (ceil) : c'est le sens usuel de « tranche » et, en cas d'ambiguïté, le sens
  // prudent pour un outil qui signale des manques.
  it('un petit séjour reste au plancher de 5 prises', () => {
    const sejour: Piece = { id: 'P1', nom: 'Séjour', type: 'sejour', polygone: [], surfaceM2: 18 }
    const conformite = verifierPiece(sejour, [])
    expect(conformite.prisesRequises).toBe(5) // ceil(18/4) = 5, égal au plancher
    expect(conformite.ok).toBe(false)
  })

  it('un séjour de 24,6 m² exige 7 prises (1 par tranche de 4 m²)', () => {
    const sejour: Piece = { id: 'P1', nom: 'Séjour', type: 'sejour', polygone: [], surfaceM2: 24.6 }
    expect(verifierPiece(sejour, []).prisesRequises).toBe(7)
  })

  it('un séjour de 28 m² exige 7 prises, et 1 de plus par tranche de 4 m² au-delà', () => {
    const a28: Piece = { id: 'P1', nom: 'Séjour', type: 'sejour', polygone: [], surfaceM2: 28 }
    const a32: Piece = { id: 'P1', nom: 'Séjour', type: 'sejour', polygone: [], surfaceM2: 32 }
    const a40: Piece = { id: 'P1', nom: 'Séjour', type: 'sejour', polygone: [], surfaceM2: 40 }
    expect(verifierPiece(a28, []).prisesRequises).toBe(7)
    expect(verifierPiece(a32, []).prisesRequises).toBe(8)
    expect(verifierPiece(a40, []).prisesRequises).toBe(10)
  })

  it('un séjour exige 2 prises RJ45', () => {
    const sejour: Piece = { id: 'P1', nom: 'Séjour', type: 'sejour', polygone: [], surfaceM2: 18 }
    const conformite = verifierPiece(sejour, [organe('prise-rj45', 'P1')])
    expect(conformite.rj45Requises).toBe(2)
    expect(conformite.rj45Posees).toBe(1)
    expect(conformite.ok).toBe(false)
  })

  it('une cuisine de plus de 4 m² exige 6 prises dont 4 au-dessus du plan de travail', () => {
    const cuisine: Piece = { id: 'P2', nom: 'Cuisine', type: 'cuisine', polygone: [], surfaceM2: 9 }
    const organes = [
      ...Array.from({ length: 4 }, () => organe('prise16A', 'P2', 'plan-travail')),
      ...Array.from({ length: 2 }, () => organe('prise16A', 'P2')),
      organe('point-lumineux', 'P2'),
    ]
    const conformite = verifierPiece(cuisine, organes)
    expect(conformite.prisesRequises).toBe(6)
    expect(conformite.prisesPlanTravailRequises).toBe(4)
    expect(conformite.prisesPlanTravailPosees).toBe(4)
    expect(conformite.ok).toBe(true)
  })

  it('les 6 prises d’une cuisine ne suffisent pas si aucune n’est au plan de travail', () => {
    const cuisine: Piece = { id: 'P2', nom: 'Cuisine', type: 'cuisine', polygone: [], surfaceM2: 9 }
    const organes = [...Array.from({ length: 6 }, () => organe('prise16A', 'P2')), organe('point-lumineux', 'P2')]
    const conformite = verifierPiece(cuisine, organes)
    expect(conformite.prisesPosees).toBe(6)
    expect(conformite.prisesPlanTravailPosees).toBe(0)
    expect(conformite.ok).toBe(false)
  })

  // Sans échelle calée, la surface vaut 0. C'est une surface inconnue, pas une petite
  // pièce : appliquer le seuil « ≤ 4 m² » ferait silencieusement tomber l'exigence de
  // la cuisine de 6 à 3 prises.
  it('une cuisine sans échelle calée reste à 6 prises, et le signale', () => {
    const cuisine: Piece = { id: 'P2', nom: 'Cuisine', type: 'cuisine', polygone: [], surfaceM2: 0 }
    const conformite = verifierPiece(cuisine, [])
    expect(conformite.surfaceInconnue).toBe(true)
    expect(conformite.prisesRequises).toBe(6)
  })

  it('une vraie petite cuisine (≤ 4 m²) tombe bien à 3 prises', () => {
    const cuisine: Piece = { id: 'P2', nom: 'Cuisine', type: 'cuisine', polygone: [], surfaceM2: 3.5 }
    const conformite = verifierPiece(cuisine, [])
    expect(conformite.surfaceInconnue).toBe(false)
    expect(conformite.prisesRequises).toBe(3)
    // La part « plan de travail » ne peut pas dépasser le total exigé.
    expect(conformite.prisesPlanTravailRequises).toBeLessThanOrEqual(3)
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

  it('le chauffage 16 A / 1,5 mm² est limité à 3500 W, le 20 A / 2,5 mm² à 4500 W', () => {
    expect(circuitDef('chauffage-16A')?.puissanceMaxW).toBe(3500)
    expect(circuitDef('chauffage-20A')?.puissanceMaxW).toBe(4500)
  })

  it('un différentiel ne protège pas plus de 8 circuits', () => {
    expect(maxCircuitsParDifferentiel()).toBe(8)
  })

  it('exige 2 circuits d’éclairage au-delà de 35 m² habitables, 1 en deçà', () => {
    expect(circuitsEclairageMin(30).nombre).toBe(1)
    expect(circuitsEclairageMin(60).nombre).toBe(2)
  })
})
