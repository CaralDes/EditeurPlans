import type { Circuit, Differentiel, Organe, Tableau } from '../types'
import { circuitDef, maxCircuitsParDifferentiel, soclesDesIds, typeDifferentielRequis } from '../regles/moteur'

// Regroupe les circuits d'un tableau par différentiel (comme un vrai schéma unifilaire)
// et signale, pour chacun, les écarts avec la règle NF C 15-100 dont il est issu — calibre
// ou section modifiés à la main, différentiel du mauvais type, nombre de points dépassé.
// C'est la même logique de conformité que verifierPiece (regles/moteur.ts), appliquée ici
// au triplet circuit/disjoncteur/différentiel plutôt qu'à une pièce.

export interface BrancheCircuit {
  id: string
  libelle: string
  calibreA: number
  sectionMm2: number
  nbOrganes: number
  conforme: boolean
  alertes: string[]
}

export interface BrancheDifferentiel {
  differentiel: Differentiel
  circuits: BrancheCircuit[]
  /** Alertes portant sur le différentiel lui-même, pas sur l'un de ses circuits. */
  alertes: string[]
}

export interface SchemaTableauData {
  tableau: Tableau
  branches: BrancheDifferentiel[]
  circuitsSansDifferentiel: BrancheCircuit[]
}

function evaluerCircuit(
  circuit: Circuit,
  typeDifferentielParent: Differentiel['type'] | null,
  orpheline: boolean,
  organesParId: Map<string, Organe>,
): BrancheCircuit {
  const def = circuit.regleId ? circuitDef(circuit.regleId) : undefined
  const alertes: string[] = []
  // Le maximum de points d'un circuit se compte en socles : une prise double en occupe 2.
  const nbSocles = soclesDesIds(circuit.organes, organesParId)

  if (orpheline) {
    alertes.push('Aucun différentiel valide assigné dans ce tableau')
  } else if (circuit.regleId && typeDifferentielParent) {
    const requis = typeDifferentielRequis(circuit.regleId)
    if (requis !== typeDifferentielParent) {
      alertes.push(`Différentiel type ${typeDifferentielParent} posé, type ${requis} requis`)
    }
  }

  if (def?.maxOrganes !== undefined && nbSocles > def.maxOrganes) {
    alertes.push(`${nbSocles} points posés, ${def.maxOrganes} maximum recommandé`)
  }
  if (def && circuit.calibreA !== def.calibreA) {
    alertes.push(`Disjoncteur ${circuit.calibreA} A posé, ${def.calibreA} A recommandé`)
  }
  if (def && circuit.sectionMm2 !== def.sectionMm2) {
    alertes.push(`Section ${circuit.sectionMm2} mm² posée, ${def.sectionMm2} mm² recommandée`)
  }

  return {
    id: circuit.id,
    libelle: circuit.libelle,
    calibreA: circuit.calibreA,
    sectionMm2: circuit.sectionMm2,
    nbOrganes: nbSocles,
    conforme: alertes.length === 0,
    alertes,
  }
}

export function construireSchemaTableau(
  tableau: Tableau,
  circuits: Circuit[],
  organes: Organe[] = [],
): SchemaTableauData {
  const idsDifferentiels = new Set(tableau.differentiels.map((d) => d.id))
  const organesParId = new Map(organes.map((o) => [o.id, o]))

  const maxCircuits = maxCircuitsParDifferentiel()

  const branches: BrancheDifferentiel[] = tableau.differentiels.map((differentiel) => {
    const circuitsDuDdr = circuits
      .filter((c) => c.ddrId === differentiel.id)
      .map((c) => evaluerCircuit(c, differentiel.type, false, organesParId))
    const alertes: string[] = []
    if (circuitsDuDdr.length > maxCircuits) {
      alertes.push(`${circuitsDuDdr.length} circuits sur ce différentiel, ${maxCircuits} maximum`)
    }
    return { differentiel, circuits: circuitsDuDdr, alertes }
  })

  const circuitsSansDifferentiel = circuits
    .filter((c) => !c.ddrId || !idsDifferentiels.has(c.ddrId))
    .map((c) => evaluerCircuit(c, null, true, organesParId))

  return { tableau, branches, circuitsSansDifferentiel }
}

// --- Géométrie du schéma (positions des boîtes et des traits de liaison) ---
// Calculée séparément du rendu SVG pour rester testable sans Konva ni DOM.

export interface Boite {
  x: number
  y: number
  largeur: number
  hauteur: number
}

export interface EnteteGroupe extends Boite {
  libelle: string
  alerte: boolean // groupe « sans différentiel », ou différentiel portant ses propres alertes
  alertes: string[]
}

export interface BoiteCircuit extends Boite {
  circuit: BrancheCircuit
}

export interface Ligne {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface LayoutSchema {
  largeur: number
  hauteur: number
  tableau: Boite & { libelle: string }
  entetes: EnteteGroupe[]
  circuits: BoiteCircuit[]
  lignes: Ligne[]
}

const LARGEUR_CIRCUIT = 96
const HAUTEUR_CIRCUIT = 62
const ECART_CIRCUIT = 10
const LARGEUR_MIN_GROUPE = 108
const LARGEUR_MAX_ENTETE = 132
const HAUTEUR_ENTETE = 44
const ECART_GROUPE = 22
const HAUTEUR_TABLEAU = 40
const ECART_VERTICAL = 24

function largeurGroupe(nbCircuits: number): number {
  if (nbCircuits === 0) return LARGEUR_MIN_GROUPE
  return Math.max(LARGEUR_MIN_GROUPE, nbCircuits * LARGEUR_CIRCUIT + (nbCircuits - 1) * ECART_CIRCUIT)
}

export function calculerLayoutSchema(schema: SchemaTableauData): LayoutSchema {
  const groupes: { libelle: string; alerte: boolean; alertes: string[]; circuits: BrancheCircuit[] }[] =
    schema.branches.map((b) => ({
      libelle: `Différentiel ${b.differentiel.type} · ${b.differentiel.calibreA} A`,
      alerte: b.alertes.length > 0,
      alertes: b.alertes,
      circuits: b.circuits,
    }))
  if (schema.circuitsSansDifferentiel.length > 0) {
    groupes.push({
      libelle: 'Sans différentiel',
      alerte: true,
      alertes: ['Ces circuits ne sont rattachés à aucun différentiel du tableau'],
      circuits: schema.circuitsSansDifferentiel,
    })
  }

  const largeursGroupes = groupes.map((g) => largeurGroupe(g.circuits.length))
  const largeurTotale = Math.max(
    LARGEUR_MIN_GROUPE,
    largeursGroupes.reduce((a, b) => a + b, 0) + ECART_GROUPE * Math.max(0, groupes.length - 1),
  )

  const yTableau = 0
  const yGroupe = yTableau + HAUTEUR_TABLEAU + ECART_VERTICAL
  const yCircuit = yGroupe + HAUTEUR_ENTETE + ECART_VERTICAL
  const hauteur = groupes.length > 0 ? yCircuit + HAUTEUR_CIRCUIT : yTableau + HAUTEUR_TABLEAU

  const largeurTableauBoite = Math.min(170, largeurTotale)
  const tableau = {
    x: (largeurTotale - largeurTableauBoite) / 2,
    y: yTableau,
    largeur: largeurTableauBoite,
    hauteur: HAUTEUR_TABLEAU,
    libelle: schema.tableau.type === 'divisionnaire' ? 'Tableau divisionnaire' : 'Tableau principal',
  }

  const entetes: EnteteGroupe[] = []
  const circuits: BoiteCircuit[] = []
  const lignes: Ligne[] = []
  const centreTableauX = tableau.x + tableau.largeur / 2
  const yBusHaut = yTableau + HAUTEUR_TABLEAU + ECART_VERTICAL / 2
  const centresGroupes: number[] = []

  let xCursor = 0
  for (let i = 0; i < groupes.length; i++) {
    const groupe = groupes[i]!
    const largeurG = largeursGroupes[i]!
    const centreG = xCursor + largeurG / 2
    centresGroupes.push(centreG)

    const largeurEntete = Math.min(largeurG, LARGEUR_MAX_ENTETE)
    entetes.push({
      x: centreG - largeurEntete / 2,
      y: yGroupe,
      largeur: largeurEntete,
      hauteur: HAUTEUR_ENTETE,
      libelle: groupe.libelle,
      alerte: groupe.alerte,
      alertes: groupe.alertes,
    })

    const nbCircuits = groupe.circuits.length
    const largeurOccupee = nbCircuits * LARGEUR_CIRCUIT + Math.max(0, nbCircuits - 1) * ECART_CIRCUIT
    let xCircuit = centreG - largeurOccupee / 2
    const yBusBas = yGroupe + HAUTEUR_ENTETE + ECART_VERTICAL / 2
    const centresCircuits: number[] = []

    for (const circuit of groupe.circuits) {
      circuits.push({ x: xCircuit, y: yCircuit, largeur: LARGEUR_CIRCUIT, hauteur: HAUTEUR_CIRCUIT, circuit })
      centresCircuits.push(xCircuit + LARGEUR_CIRCUIT / 2)
      xCircuit += LARGEUR_CIRCUIT + ECART_CIRCUIT
    }

    if (centresCircuits.length > 0) {
      lignes.push({ x1: centreG, y1: yGroupe + HAUTEUR_ENTETE, x2: centreG, y2: yBusBas })
      if (centresCircuits.length > 1) {
        lignes.push({ x1: centresCircuits[0]!, y1: yBusBas, x2: centresCircuits.at(-1)!, y2: yBusBas })
      }
      for (const cx of centresCircuits) {
        lignes.push({ x1: cx, y1: yBusBas, x2: cx, y2: yCircuit })
      }
    }

    xCursor += largeurG + ECART_GROUPE
  }

  if (groupes.length > 0) {
    lignes.push({ x1: centreTableauX, y1: tableau.y + HAUTEUR_TABLEAU, x2: centreTableauX, y2: yBusHaut })
    if (centresGroupes.length > 1) {
      lignes.push({ x1: centresGroupes[0]!, y1: yBusHaut, x2: centresGroupes.at(-1)!, y2: yBusHaut })
    }
    for (const cx of centresGroupes) {
      lignes.push({ x1: cx, y1: yBusHaut, x2: cx, y2: yGroupe })
    }
  }

  return { largeur: largeurTotale, hauteur, tableau, entetes, circuits, lignes }
}
