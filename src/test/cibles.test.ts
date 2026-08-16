import { describe, expect, it } from 'vitest'
import { RAYON_CAPTURE_ECRAN, cibleLaPlusProche, type Cible } from '../lib/cibles'

const A: Cible = { id: 'A', x: 100, y: 100 }
const B: Cible = { id: 'B', x: 135, y: 100 } // 35 unités de plan à droite de A
const cibles = [A, B]

describe('sélection de la cible la plus proche', () => {
  it('retient la cible la plus proche du curseur, pas la dernière dessinée', () => {
    // Curseur nettement plus près de A que de B : c'est A qui doit sortir, alors que
    // B est dessiné après lui (et l'emporterait avec une détection par ordre de tracé).
    expect(cibleLaPlusProche({ x: 105, y: 100 }, cibles, 1)?.id).toBe('A')
    expect(cibleLaPlusProche({ x: 130, y: 100 }, cibles, 1)?.id).toBe('B')
  })

  it('reste sélectionnable une fois le plan dézoomé — le cas qui échouait', () => {
    // À l'échelle 0,3 (plan large ramené à l'écran), une zone de capture définie en
    // coordonnées du plan deviendrait minuscule. Ici le rayon est exprimé en pixels
    // écran, donc il couvre au contraire une plus grande portion du plan.
    const loin = { x: 100 + 60, y: 100 } // 60 unités de plan de A
    expect(cibleLaPlusProche(loin, [A], 0.3)?.id).toBe('A')
    // Le même écart, plan zoomé, sort de la zone de capture : le rayon perçu à
    // l'écran est identique dans les deux cas.
    expect(cibleLaPlusProche(loin, [A], 2)).toBeNull()
  })

  it('le rayon de capture vaut toujours le même nombre de pixels écran', () => {
    for (const echelle of [0.2, 0.5, 1, 2, 4]) {
      const limiteInterieure = { x: 100 + (RAYON_CAPTURE_ECRAN / echelle) * 0.95, y: 100 }
      const limiteExterieure = { x: 100 + (RAYON_CAPTURE_ECRAN / echelle) * 1.05, y: 100 }
      expect(cibleLaPlusProche(limiteInterieure, [A], echelle)?.id).toBe('A')
      expect(cibleLaPlusProche(limiteExterieure, [A], echelle)).toBeNull()
    }
  })

  it('ne retient rien quand le curseur est dans le vide', () => {
    expect(cibleLaPlusProche({ x: 900, y: 900 }, cibles, 1)).toBeNull()
  })

  it('départage deux organes qui se chevauchent selon la distance au curseur', () => {
    // Curseur exactement entre les deux, décalé d'un cheveu vers B.
    expect(cibleLaPlusProche({ x: 118, y: 100 }, cibles, 1)?.id).toBe('B')
    expect(cibleLaPlusProche({ x: 117, y: 100 }, cibles, 1)?.id).toBe('A')
  })

  it('ne renvoie rien sans aucune cible', () => {
    expect(cibleLaPlusProche({ x: 100, y: 100 }, [], 1)).toBeNull()
  })
})
