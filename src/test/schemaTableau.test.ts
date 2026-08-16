import { describe, expect, it } from 'vitest'
import { calculerLayoutSchema, construireSchemaTableau } from '../lib/schemaTableau'
import type { Circuit, Tableau } from '../types'

const tableau: Tableau = {
  id: 'tab-1',
  type: 'divisionnaire',
  x: 0,
  y: 0,
  hauteurM: 1.1,
  differentiels: [
    { id: 'ddr-a', type: 'A', calibreA: 40 },
    { id: 'ddr-ac', type: 'AC', calibreA: 40 },
  ],
}

function circuit(patch: Partial<Circuit> & Pick<Circuit, 'id'>): Circuit {
  return {
    libelle: 'Circuit',
    famille: 'prises',
    regleId: null,
    sectionMm2: 1.5,
    calibreA: 16,
    ddrId: null,
    organes: [],
    ...patch,
  }
}

describe('construireSchemaTableau', () => {
  it('regroupe chaque circuit sous son différentiel', () => {
    const circuits: Circuit[] = [
      circuit({ id: 'c1', libelle: 'Prises salon', regleId: 'prises-16A-2.5', sectionMm2: 2.5, calibreA: 20, ddrId: 'ddr-ac', organes: ['o1', 'o2'] }),
      circuit({ id: 'c2', libelle: 'Plaque', regleId: 'plaque-cuisson', sectionMm2: 6, calibreA: 32, ddrId: 'ddr-a', organes: ['o3'] }),
    ]
    const schema = construireSchemaTableau(tableau, circuits)

    expect(schema.branches).toHaveLength(2)
    const brancheA = schema.branches.find((b) => b.differentiel.id === 'ddr-a')!
    const brancheAC = schema.branches.find((b) => b.differentiel.id === 'ddr-ac')!
    expect(brancheA.circuits.map((c) => c.id)).toEqual(['c2'])
    expect(brancheAC.circuits.map((c) => c.id)).toEqual(['c1'])
    expect(schema.circuitsSansDifferentiel).toHaveLength(0)
  })

  it('un circuit conforme à la règle ne porte aucune alerte', () => {
    const circuits: Circuit[] = [
      circuit({ id: 'c1', regleId: 'prises-16A-2.5', sectionMm2: 2.5, calibreA: 20, ddrId: 'ddr-ac', organes: [] }),
    ]
    const schema = construireSchemaTableau(tableau, circuits)
    const c1 = schema.branches[1]!.circuits[0]!
    expect(c1.conforme).toBe(true)
    expect(c1.alertes).toEqual([])
  })

  it('signale un calibre ou une section modifiés à la main', () => {
    const circuits: Circuit[] = [
      // Calibre/section corrects pour prises-16A-2.5 : 2.5mm² / 20A. Ici, tout est décalé.
      circuit({ id: 'c1', regleId: 'prises-16A-2.5', sectionMm2: 1.5, calibreA: 16, ddrId: 'ddr-ac' }),
    ]
    const schema = construireSchemaTableau(tableau, circuits)
    const c1 = schema.branches[1]!.circuits[0]!
    expect(c1.conforme).toBe(false)
    expect(c1.alertes.some((a) => a.includes('Disjoncteur'))).toBe(true)
    expect(c1.alertes.some((a) => a.includes('Section'))).toBe(true)
  })

  it('signale un différentiel du mauvais type (ex. plaque de cuisson sous un DDR AC)', () => {
    const circuits: Circuit[] = [
      circuit({ id: 'c1', regleId: 'plaque-cuisson', sectionMm2: 6, calibreA: 32, ddrId: 'ddr-ac' }),
    ]
    const schema = construireSchemaTableau(tableau, circuits)
    const c1 = schema.branches[1]!.circuits[0]! // sous ddr-ac, alors que le type A est requis
    expect(c1.conforme).toBe(false)
    expect(c1.alertes.some((a) => a.includes('Différentiel'))).toBe(true)
  })

  it('signale un dépassement du nombre maximal de points du circuit', () => {
    const circuits: Circuit[] = [
      circuit({
        id: 'c1',
        regleId: 'prises-16A-2.5', // maxOrganes: 12
        sectionMm2: 2.5,
        calibreA: 20,
        ddrId: 'ddr-ac',
        organes: Array.from({ length: 13 }, (_, i) => `o${i}`),
      }),
    ]
    const schema = construireSchemaTableau(tableau, circuits)
    const c1 = schema.branches[1]!.circuits[0]!
    expect(c1.conforme).toBe(false)
    expect(c1.alertes.some((a) => a.includes('maximum'))).toBe(true)
  })

  it('signale un différentiel qui protège plus de 8 circuits', () => {
    const huit = Array.from({ length: 8 }, (_, i) => circuit({ id: `c${i}`, ddrId: 'ddr-ac' }))
    const schemaOk = construireSchemaTableau(tableau, huit)
    expect(schemaOk.branches.find((b) => b.differentiel.id === 'ddr-ac')!.alertes).toEqual([])

    const neuf = [...huit, circuit({ id: 'c8', ddrId: 'ddr-ac' })]
    const schemaTrop = construireSchemaTableau(tableau, neuf)
    const brancheTrop = schemaTrop.branches.find((b) => b.differentiel.id === 'ddr-ac')!
    expect(brancheTrop.alertes).toHaveLength(1)
    expect(brancheTrop.alertes[0]).toContain('9 circuits')

    // L'en-tête du différentiel passe alors en alerte dans le schéma rendu.
    const entete = calculerLayoutSchema(schemaTrop).entetes.find((e) => e.libelle.includes('AC'))!
    expect(entete.alerte).toBe(true)
  })

  it('range dans "circuitsSansDifferentiel" tout circuit sans ddrId, ou dont le ddrId ne correspond à aucun différentiel du tableau', () => {
    const circuits: Circuit[] = [
      circuit({ id: 'c1', ddrId: null }),
      circuit({ id: 'c2', ddrId: 'ddr-inexistant' }),
    ]
    const schema = construireSchemaTableau(tableau, circuits)
    expect(schema.circuitsSansDifferentiel.map((c) => c.id).sort()).toEqual(['c1', 'c2'])
    expect(schema.circuitsSansDifferentiel.every((c) => !c.conforme)).toBe(true)
    expect(schema.circuitsSansDifferentiel.every((c) => c.alertes.some((a) => a.includes('différentiel')))).toBe(true)
  })
})

describe('calculerLayoutSchema', () => {
  it('place un en-tête et une boîte de circuit par circuit, sans chevauchement horizontal', () => {
    const circuits: Circuit[] = [
      circuit({ id: 'c1', ddrId: 'ddr-ac' }),
      circuit({ id: 'c2', ddrId: 'ddr-ac' }),
      circuit({ id: 'c3', ddrId: 'ddr-a' }),
    ]
    const schema = construireSchemaTableau(tableau, circuits)
    const layout = calculerLayoutSchema(schema)

    expect(layout.entetes).toHaveLength(2)
    expect(layout.circuits).toHaveLength(3)

    const boitesTriees = [...layout.circuits].sort((a, b) => a.x - b.x)
    for (let i = 1; i < boitesTriees.length; i++) {
      expect(boitesTriees[i]!.x).toBeGreaterThanOrEqual(boitesTriees[i - 1]!.x + boitesTriees[i - 1]!.largeur)
    }
  })

  it('ajoute un en-tête "Sans différentiel" marqué en alerte quand nécessaire', () => {
    const circuits: Circuit[] = [circuit({ id: 'c1', ddrId: null })]
    const schema = construireSchemaTableau(tableau, circuits)
    const layout = calculerLayoutSchema(schema)

    const enteteAlerte = layout.entetes.find((e) => e.alerte)
    expect(enteteAlerte).toBeDefined()
    expect(enteteAlerte!.libelle).toContain('Sans différentiel')
  })

  it('reste cohérent sans aucun circuit (juste le tableau et ses différentiels)', () => {
    const schema = construireSchemaTableau(tableau, [])
    const layout = calculerLayoutSchema(schema)
    expect(layout.entetes).toHaveLength(2)
    expect(layout.circuits).toHaveLength(0)
    expect(layout.largeur).toBeGreaterThan(0)
    expect(layout.hauteur).toBeGreaterThan(0)
  })
})
