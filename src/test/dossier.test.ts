import { describe, expect, it } from 'vitest'
import { construireDossier, echapper } from '../lib/dossier'
import { projetVide } from '../types'
import type { Organe, Piece, Projet } from '../types'

const DATE = '2026-08-16T10:00:00.000Z'

function organe(id: string, type: Organe['type'], pieceId: string | null, pose: Organe['pose'] = 'basse'): Organe {
  return {
    id,
    type,
    pieceId,
    x: 0,
    y: 0,
    rotation: 0,
    hauteurM: 0.05,
    pose,
    postes: 1,
    ip: null,
    circuitId: null,
    repere: id,
    note: '',
  }
}

function piece(id: string, nom: string, type: Piece['type'], surfaceM2: number): Piece {
  return { id, nom, type, polygone: [], surfaceM2 }
}

function projetExemple(): Projet {
  return {
    ...projetVide('Extension Sud'),
    plan: { image: '', echelle: { pxParMetre: 100, coteSur: 'mur nord' }, hauteurSousPlafond: 2.5 },
    pieces: [piece('P1', 'Séjour', 'sejour', 20), piece('P2', 'Cuisine', 'cuisine', 9)],
    organes: [
      organe('o1', 'prise16A', 'P1'),
      organe('o2', 'prise16A', 'P1'),
      organe('o3', 'point-lumineux', 'P1', 'plafond'),
      organe('o4', 'prise16A', 'P2', 'plan-travail'),
    ],
  }
}

describe('echapper', () => {
  it('neutralise le balisage venant du nom saisi par l’utilisateur', () => {
    expect(echapper('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
    )
  })
})

describe('construireDossier', () => {
  it('produit un document HTML autonome titré au nom du projet', () => {
    const html = construireDossier(projetExemple(), null, DATE)
    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html).toContain('<title>Extension Sud — dossier électrique</title>')
    expect(html).toContain('<h1>Extension Sud</h1>')
    // Le style est embarqué : le dossier s'imprime correctement dans une fenêtre vierge.
    expect(html).toContain('@page')
  })

  it('reporte l’échelle et la hauteur sous plafond dans l’en-tête', () => {
    const html = construireDossier(projetExemple(), null, DATE)
    expect(html).toContain('calée sur mur nord')
    expect(html).toContain('hauteur sous plafond 2.5 m')
  })

  it('signale une échelle non calée plutôt que d’inventer une valeur', () => {
    const projet = { ...projetExemple(), plan: { image: '', echelle: null, hauteurSousPlafond: 2.5 } }
    expect(construireDossier(projet, null, DATE)).toContain('échelle non calée')
  })

  it('dresse la nomenclature du matériel posé avec les quantités', () => {
    const html = construireDossier(projetExemple(), null, DATE)
    expect(html).toContain('Nomenclature du matériel')
    expect(html).toContain('Prise 16 A')
    expect(html).toContain('4 appareil(s) au total.')
  })

  it('reprend la conformité par pièce, y compris les manques', () => {
    const html = construireDossier(projetExemple(), null, DATE)
    expect(html).toContain('Conformité par pièce')
    expect(html).toContain('Séjour')
    expect(html).toContain('Cuisine')
    // Le séjour de 20 m² exige 5 prises et n'en a que 2 : la pièce doit ressortir en manque.
    expect(html).toContain('2 / 5')
    expect(html).toContain('pièce(s) sous les minimums retenus')
  })

  it('intègre le plan quand une image est fournie, et le dit quand il n’y en a pas', () => {
    const avec = construireDossier(projetExemple(), 'data:image/png;base64,AAAA', DATE)
    expect(avec).toContain('<img class="plan" src="data:image/png;base64,AAAA"')

    const sans = construireDossier(projetExemple(), null, DATE)
    expect(sans).toContain('Aucun plan à afficher.')
  })

  it('indique l’absence de tableau au lieu de laisser la section vide', () => {
    const html = construireDossier(projetExemple(), null, DATE)
    expect(html).toContain('Aucun tableau posé.')
  })

  it('rappelle la version de la base de règles et son avertissement', () => {
    const html = construireDossier(projetExemple(), null, DATE)
    expect(html).toContain('nfc15100@')
    expect(html).toContain('ne constituent pas un document de conformité')
  })

  it('échappe le nom du projet dans le titre comme dans le corps', () => {
    const projet = { ...projetExemple(), nom: '<img src=x onerror=alert(1)>' }
    const html = construireDossier(projet, null, DATE)
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;img src=x')
  })

  it('reste utilisable sur un projet entièrement vide', () => {
    const html = construireDossier(projetVide('Vide'), null, DATE)
    expect(html).toContain('<h1>Vide</h1>')
    expect(html).toContain('Aucune pièce tracée')
    expect(html).toContain('0 appareil(s) au total.')
  })
})
