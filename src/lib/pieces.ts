import type { Organe, Piece, Point, Projet } from '../types'
import { aireM2 } from './echelle'

// Test d'appartenance par lancer de rayon (ray casting) : compte combien de fois une
// demi-droite horizontale partant du point traverse les côtés du polygone. Un nombre
// impair de traversées signifie que le point est à l'intérieur.
export function pointDansPolygone(p: Point, polygone: Point[]): boolean {
  if (polygone.length < 3) return false
  let dedans = false
  for (let i = 0, j = polygone.length - 1; i < polygone.length; j = i++) {
    const pi = polygone[i]!
    const pj = polygone[j]!
    const traverse = pi.y > p.y !== pj.y > p.y && p.x < ((pj.x - pi.x) * (p.y - pi.y)) / (pj.y - pi.y) + pi.x
    if (traverse) dedans = !dedans
  }
  return dedans
}

// Moyenne simple des sommets. Pour un rectangle ou une forme convexe, elle coïncide à
// peu près avec le centre visuel — mais pour une pièce en L, en T ou en U (le cas
// courant, pas l'exception), elle peut tomber dans le renfoncement, hors de la pièce.
// N'est plus utilisée que comme dernier repli dans pointEtiquette ci-dessous.
function moyenneSommets(polygone: Point[]): Point {
  const n = polygone.length
  const somme = polygone.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
  return { x: somme.x / n, y: somme.y / n }
}

function aireSignee(polygone: Point[]): number {
  let aire = 0
  for (let i = 0; i < polygone.length; i++) {
    const p1 = polygone[i]!
    const p2 = polygone[(i + 1) % polygone.length]!
    aire += p1.x * p2.y - p2.x * p1.y
  }
  return aire / 2
}

// Centroïde pondéré par l'aire (formule standard du centroïde d'un polygone simple).
// Contrairement à la moyenne des sommets, il tient compte de la forme réelle : sur un
// L asymétrique (l'écrasante majorité des pièces en L réelles), il reste correctement
// à l'intérieur.
function centroidePondere(polygone: Point[]): Point | null {
  let cx = 0
  let cy = 0
  for (let i = 0; i < polygone.length; i++) {
    const p1 = polygone[i]!
    const p2 = polygone[(i + 1) % polygone.length]!
    const croise = p1.x * p2.y - p2.x * p1.y
    cx += (p1.x + p2.x) * croise
    cy += (p1.y + p2.y) * croise
  }
  const a = aireSignee(polygone)
  if (Math.abs(a) < 1e-6) return null // polygone dégénéré (aire quasi nulle)
  return { x: cx / (6 * a), y: cy / (6 * a) }
}

interface Triangle {
  a: Point
  b: Point
  c: Point
}

function aireTriangle(t: Triangle): number {
  return Math.abs((t.b.x - t.a.x) * (t.c.y - t.a.y) - (t.c.x - t.a.x) * (t.b.y - t.a.y)) / 2
}

// Test d'appartenance à un triangle par comparaison de signe (méthode barycentrique).
// Inclut le bord — volontairement conservateur pour la détection d'oreille ci-dessous.
function dansTriangle(p: Point, t: Triangle): boolean {
  const d1 = (p.x - t.b.x) * (t.a.y - t.b.y) - (t.a.x - t.b.x) * (p.y - t.b.y)
  const d2 = (p.x - t.c.x) * (t.b.y - t.c.y) - (t.b.x - t.c.x) * (p.y - t.c.y)
  const d3 = (p.x - t.a.x) * (t.c.y - t.a.y) - (t.c.x - t.a.x) * (p.y - t.a.y)
  const aNeg = d1 < 0 || d2 < 0 || d3 < 0
  const aPos = d1 > 0 || d2 > 0 || d3 > 0
  return !(aNeg && aPos)
}

// Triangulation par découpe d'oreilles (ear clipping) : valable pour tout polygone simple,
// convexe ou concave, sans hypothèse de forme. Chaque triangle découpé est garanti
// entièrement à l'intérieur du polygone d'origine — contrairement au centroïde pondéré ou
// au centre de la boîte englobante, qui peuvent l'un comme l'autre tomber hors du contour
// sur une forme très concave (un L aux bras étroits, un U profond…), comme démontré dans
// src/test/pieces.test.ts. Sert de filet de sécurité final dans pointEtiquette.
function trianguler(polygone: Point[]): Triangle[] {
  const sens = aireSignee(polygone) >= 0 ? 1 : -1 // 1 = sens trigonométrique (CCW)
  let sommets = polygone.map((p) => ({ p }))
  const triangles: Triangle[] = []

  let garde = 0
  while (sommets.length > 3 && garde < polygone.length * polygone.length + 8) {
    garde++
    let decoupe = false
    for (let i = 0; i < sommets.length; i++) {
      const prev = sommets[(i - 1 + sommets.length) % sommets.length]!.p
      const cur = sommets[i]!.p
      const next = sommets[(i + 1) % sommets.length]!.p

      const croise = (cur.x - prev.x) * (next.y - prev.y) - (next.x - prev.x) * (cur.y - prev.y)
      const convexe = sens > 0 ? croise > 0 : croise < 0
      if (!convexe) continue // sommet réflexe : ne peut pas être une oreille

      const oreille: Triangle = { a: prev, b: cur, c: next }
      const contientAutreSommet = sommets.some(
        (s) => s.p !== prev && s.p !== cur && s.p !== next && dansTriangle(s.p, oreille),
      )
      if (contientAutreSommet) continue

      triangles.push(oreille)
      sommets.splice(i, 1)
      decoupe = true
      break
    }
    if (!decoupe) break // polygone dégénéré ou auto-intersectant : on s'arrête proprement
  }
  if (sommets.length === 3) triangles.push({ a: sommets[0]!.p, b: sommets[1]!.p, c: sommets[2]!.p })
  return triangles
}

// Point où placer l'étiquette (nom + surface) d'une pièce, garanti à l'intérieur du
// contour pour tout polygone simple — y compris les pièces en L, en T ou en U, bien plus
// fréquentes en réalité que les pièces parfaitement rectangulaires.
export function pointEtiquette(polygone: Point[]): Point {
  const centroide = centroidePondere(polygone)
  if (centroide && pointDansPolygone(centroide, polygone)) return centroide

  const xs = polygone.map((p) => p.x)
  const ys = polygone.map((p) => p.y)
  const centreBoite = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }
  if (pointDansPolygone(centreBoite, polygone)) return centreBoite

  // Les deux replis ci-dessus peuvent échouer sur une forme très concave (voir le
  // commentaire de trianguler). La triangulation garantit un point réellement intérieur :
  // on prend le centre du plus grand triangle, pour rester lisible dans la plus grande
  // partie visible de la pièce plutôt que dans un recoin étroit.
  const triangles = trianguler(polygone)
  if (triangles.length > 0) {
    const plusGrand = triangles.reduce((max, t) => (aireTriangle(t) > aireTriangle(max) ? t : max))
    return {
      x: (plusGrand.a.x + plusGrand.b.x + plusGrand.c.x) / 3,
      y: (plusGrand.a.y + plusGrand.b.y + plusGrand.c.y) / 3,
    }
  }
  // Dernier repli, uniquement pour un polygone dégénéré (moins de 3 sommets utiles).
  return moyenneSommets(polygone)
}

export function trouverPieceContenant(p: Point, pieces: Piece[]): string | null {
  for (const piece of pieces) {
    if (pointDansPolygone(p, piece.polygone)) return piece.id
  }
  return null
}

// Rattache chaque organe à la pièce dont le polygone le contient, ou le détache (null)
// s'il n'en a plus. Appelé après tout changement de position d'organe ou de contour de
// pièce, pour que le rattachement reste toujours exact sans geste manuel — c'est ce qui
// permet au panneau de conformité d'être réellement « en direct ».
export function recalculerAppartenances(organes: Organe[], pieces: Piece[]): Organe[] {
  return organes.map((o) => {
    const pieceId = trouverPieceContenant({ x: o.x, y: o.y }, pieces)
    return pieceId === o.pieceId ? o : { ...o, pieceId }
  })
}

export function avecAppartenancesRecalculees(projet: Projet): Projet {
  return { ...projet, organes: recalculerAppartenances(projet.organes, projet.pieces) }
}

export function surfaceCalculee(polygone: Point[], projet: Projet): number {
  return aireM2(polygone, projet.plan.echelle) ?? 0
}
