import { describe, expect, it } from 'vitest'
import { resumeCircuits, totauxParSection } from '../lib/metre'
import { projetVide } from '../types'
import type { Circuit, Organe, Tableau } from '../types'

const echelle = { pxParMetre: 100, coteSur: 'test' } // 100 px = 1 m

function organe(id: string, hauteurM: number, circuitId: string): Organe {
  return {
    id,
    type: 'point-lumineux',
    pieceId: null,
    x: 0,
    y: 0,
    rotation: 0,
    hauteurM,
    pose: 'plafond',
    postes: 1,
    ip: null,
    circuitId,
    repere: `L-${id}`,
    note: '',
  }
}

function circuit(id: string, organes: string[]): Circuit {
  return {
    id,
    libelle: 'Éclairage',
    famille: 'eclairage',
    regleId: null,
    sectionMm2: 1.5,
    calibreA: 16,
    ddrId: null,
    organes,
  }
}

const tableau: Tableau = {
  id: 'tab-1',
  type: 'divisionnaire',
  x: 500,
  y: 500,
  hauteurM: 1.1,
  differentiels: [],
}

describe('resumeCircuits — câbles groupés', () => {
  it('un seul câble desservant 2 organes couvre les deux : aucun organe manquant, une longueur totale', () => {
    const projet = {
      ...projetVide(),
      plan: { ...projetVide().plan, echelle, hauteurSousPlafond: 2.5 },
      tableaux: [tableau],
      organes: [organe('o1', 2.5, 'c1'), organe('o2', 2.5, 'c1')],
      circuits: [circuit('c1', ['o1', 'o2'])],
      cheminements: [
        {
          id: 'cable-1',
          circuitId: 'c1',
          mode: 'plafond' as const,
          points: [
            { x: 0, y: 0 },
            { x: 500, y: 500 },
          ],
          organes: ['o1', 'o2'],
          versNoeud: tableau.id,
        },
      ],
    }

    const [ligne] = resumeCircuits(projet)
    expect(ligne!.organesNonCables).toEqual([])
    expect(ligne!.cablesManquants).toBe(0)
    expect(ligne!.cheminements).toHaveLength(1)
    expect(ligne!.longueurTotaleM).not.toBeNull()
  })

  it('un organe non rattaché à aucun câble reste signalé comme manquant même si un autre organe du circuit est câblé', () => {
    const projet = {
      ...projetVide(),
      plan: { ...projetVide().plan, echelle, hauteurSousPlafond: 2.5 },
      tableaux: [tableau],
      organes: [organe('o1', 2.5, 'c1'), organe('o2', 2.5, 'c1')],
      circuits: [circuit('c1', ['o1', 'o2'])],
      cheminements: [
        {
          id: 'cable-1',
          circuitId: 'c1',
          mode: 'plafond' as const,
          points: [
            { x: 0, y: 0 },
            { x: 500, y: 500 },
          ],
          organes: ['o1'],
          versNoeud: tableau.id,
        },
      ],
    }

    const [ligne] = resumeCircuits(projet)
    expect(ligne!.organesNonCables).toEqual(['o2'])
    expect(ligne!.cablesManquants).toBe(1)
    expect(ligne!.longueurTotaleM).toBeNull() // un câble manque : pas de total tant que tout n'est pas tracé
  })
})

describe('totauxParSection', () => {
  it('ignore les circuits sans longueur calculable', () => {
    const lignes = resumeCircuits({
      ...projetVide(),
      plan: { ...projetVide().plan, echelle: null },
      tableaux: [tableau],
      organes: [organe('o1', 2.5, 'c1')],
      circuits: [circuit('c1', ['o1'])],
      cheminements: [
        {
          id: 'cable-1',
          circuitId: 'c1',
          mode: 'plafond' as const,
          points: [
            { x: 0, y: 0 },
            { x: 500, y: 500 },
          ],
          organes: ['o1'],
          versNoeud: tableau.id,
        },
      ],
    })
    expect(totauxParSection(lignes)).toEqual([])
  })
})
