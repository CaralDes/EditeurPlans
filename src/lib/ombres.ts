import type { Mur, Point } from '../types'

// Calcul de la zone visible depuis une source ponctuelle (polygone de visibilité), en
// tenant compte des murs comme occultants. Algorithme par balayage angulaire : on trace
// un rayon vers chaque sommet de mur (± un epsilon, pour capter net le bord de l'ombre),
// plus une série de rayons régulièrement espacés pour arrondir les zones dégagées, et on
// retient pour chacun la première intersection avec un mur. Les murs sont traités par
// leur ligne centrale, pleine hauteur : l'épaisseur ne joue aucun rôle dans cette
// géométrie, seulement dans son rendu (voir PlanCanvas).

export interface Segment {
  a: Point
  b: Point
}

export function mursEnSegments(murs: Mur[]): Segment[] {
  const segments: Segment[] = []
  for (const mur of murs) {
    for (let i = 1; i < mur.points.length; i++) {
      segments.push({ a: mur.points[i - 1]!, b: mur.points[i]! })
    }
  }
  return segments
}

// Intersection d'un rayon (origine + direction, t ≥ 0) avec un segment [a,b] (u ∈ [0,1]).
// Renvoie la distance t le long du rayon si elle existe, sinon null (parallèles ou hors
// bornes). Résolution par déterminant, sans division par une composante qui pourrait
// être nulle (rayon horizontal ou vertical).
function intersectionRayonSegment(origine: Point, dx: number, dy: number, a: Point, b: Point): number | null {
  const sx = b.x - a.x
  const sy = b.y - a.y
  const denom = sx * dy - sy * dx
  if (Math.abs(denom) < 1e-9) return null // rayon parallèle au segment
  const t = (sx * (a.y - origine.y) - sy * (a.x - origine.x)) / denom
  const u = (dx * (a.y - origine.y) - dy * (a.x - origine.x)) / denom
  if (t < 0 || u < 0 || u > 1) return null
  return t
}

const RESOLUTION_ANGULAIRE = 96 // rayons uniformes : arrondit les zones sans mur à proximité
const EPSILON_ANGLE = 1e-4 // écart de part et d'autre de chaque coin, pour un bord d'ombre net

// Seuil (en px du plan) au-delà duquel deux rayons angulairement voisins mais de distance
// très différente sont considérés comme encadrant une frontière d'ombre non résolue.
const SEUIL_DISCONTINUITE_PX = 2
const PROFONDEUR_RAFFINEMENT_MAX = 22

function distanceLeLongDuRayon(origine: Point, angle: number, segments: Segment[], rayonMax: number): number {
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  let distance = rayonMax
  for (const seg of segments) {
    const t = intersectionRayonSegment(origine, dx, dy, seg.a, seg.b)
    if (t !== null && t < distance) distance = t
  }
  return distance
}

interface Echantillon {
  angle: number
  distance: number
}

// Insère récursivement, entre deux échantillons voisins, tout point intermédiaire
// nécessaire pour que l'arête du polygone ne « saute » pas par-dessus un mur.
//
// Le simple balayage à résolution fixe (grille + coins ± epsilon) est insuffisant : un
// mur isolé dont une extrémité est exposée laisse la lumière la contourner (correct,
// c'est de la vraie occultation par un occultant fini) — mais la frontière entre « juste
// caché par le mur » et « juste après son extrémité, donc à nouveau visible jusqu'au
// rayon max » peut se trouver n'importe où entre deux rayons voisins de la grille, à une
// résolution bien plus fine que son pas de 3,75°. Sans raffinement, l'arête reliant le
// point proche (contre le mur) au point lointain (rayon max) coupe alors en ligne droite
// à travers ce qui devrait rester dans l'ombre — visible comme une fine raie de lumière
// parasite traversant le mur. La bissection angulaire retrouve cette frontière avec la
// précision voulue, quelle qu'en soit la cause géométrique exacte.
function raffiner(
  origine: Point,
  segments: Segment[],
  rayonMax: number,
  gauche: Echantillon,
  droite: Echantillon,
  profondeur: number,
  sortie: Echantillon[],
): void {
  if (profondeur >= PROFONDEUR_RAFFINEMENT_MAX) return
  if (Math.abs(gauche.distance - droite.distance) <= SEUIL_DISCONTINUITE_PX) return

  const angle = (gauche.angle + droite.angle) / 2
  const milieu: Echantillon = { angle, distance: distanceLeLongDuRayon(origine, angle, segments, rayonMax) }
  raffiner(origine, segments, rayonMax, gauche, milieu, profondeur + 1, sortie)
  sortie.push(milieu)
  raffiner(origine, segments, rayonMax, milieu, droite, profondeur + 1, sortie)
}

export function polygoneVisibilite(origine: Point, segments: Segment[], rayonMax: number): Point[] {
  const angles = new Set<number>()
  // Même convention que Math.atan2 (utilisé juste en dessous pour les coins de mur) :
  // (-π, π]. Générer la grille dans [0, 2π) mélangerait deux repères différents pour le
  // même cercle une fois trié — un coin à 270° vaut -π/2 en atan2 mais 3π/2 dans une
  // grille [0,2π), les deux se retrouvant à des extrémités opposées du tableau trié, ce
  // qui casse l'hypothèse d'adjacence dont dépend le raffinement ci-dessous.
  for (let i = 0; i < RESOLUTION_ANGULAIRE; i++) {
    angles.add(-Math.PI + (i / RESOLUTION_ANGULAIRE) * Math.PI * 2)
  }
  for (const seg of segments) {
    for (const p of [seg.a, seg.b]) {
      const angle = Math.atan2(p.y - origine.y, p.x - origine.x)
      angles.add(angle)
      angles.add(angle - EPSILON_ANGLE)
      angles.add(angle + EPSILON_ANGLE)
    }
  }

  const tries = [...angles].sort((a, b) => a - b)
  const echantillons: Echantillon[] = tries.map((angle) => ({
    angle,
    distance: distanceLeLongDuRayon(origine, angle, segments, rayonMax),
  }))

  const complet: Echantillon[] = []
  for (let i = 0; i < echantillons.length; i++) {
    const gauche = echantillons[i]!
    complet.push(gauche)
    const dernier = i === echantillons.length - 1
    // Pour la dernière paire (retour au premier point, le polygone étant fermé), l'angle
    // de droite doit continuer au-delà de 2π plutôt que revenir en arrière — sans
    // conséquence sur cos/sin, corrects pour tout angle réel.
    const droite = dernier ? { angle: echantillons[0]!.angle + Math.PI * 2, distance: echantillons[0]!.distance } : echantillons[i + 1]!
    raffiner(origine, segments, rayonMax, gauche, droite, 0, complet)
  }

  return complet.map((e) => ({
    x: origine.x + Math.cos(e.angle) * e.distance,
    y: origine.y + Math.sin(e.angle) * e.distance,
  }))
}
