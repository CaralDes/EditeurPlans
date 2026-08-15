// Modèle de données du projet Cuivre.
// Un seul document JSON (le fichier .cuivre), rien de dérivé n'est stocké :
// surfaces, longueurs de câble et conformité sont recalculées depuis ces données.

export type PoseHauteur = 'basse' | 'plan-travail' | 'cuisson' | 'haute' | 'hotte' | 'plafond' | 'commande'

export type TypeOrgane =
  // prises
  | 'prise16A'
  | 'prise16A-double'
  | 'prise16A-etanche'
  | 'prise32A'
  | 'prise-commandee'
  | 'prise-rj45'
  | 'prise-tv'
  // éclairage
  | 'point-lumineux'
  | 'applique'
  | 'spot'
  | 'reglette-led'
  | 'interrupteur-simple'
  | 'va-et-vient'
  | 'bouton-poussoir'
  | 'variateur'
  | 'detecteur-presence'
  | 'daaf'
  // spécialisés / gros électroménager
  | 'alim-lave-vaisselle'
  | 'alim-lave-linge'
  | 'alim-seche-linge'
  | 'alim-four'
  | 'alim-plaque'
  | 'alim-refrigerateur'
  | 'alim-congelateur'
  | 'chauffe-eau'
  | 'vmc'
  | 'volet-roulant'
  // chauffage électrique
  | 'radiateur-electrique'
  | 'seche-serviette'
  | 'plancher-chauffant'
  // distribution
  | 'tableau-principal'
  | 'tableau-divisionnaire'
  | 'gtl'
  | 'boite-derivation'

export type TypePiece =
  | 'sejour'
  | 'cuisine'
  | 'chambre'
  | 'salle-de-bain'
  | 'wc'
  | 'circulation'
  | 'cellier'
  | 'garage'
  | 'exterieur'
  | 'autre'

export type FamilleCircuit =
  | 'prises'
  | 'prises-cuisine'
  | 'eclairage'
  | 'specialise'
  | 'volets'
  | 'chauffage'
  | 'vmc'
  | 'communication'

export type ModeCheminement = 'plafond' | 'sol' | 'plinthe' | 'cloison' | 'enterre'

export interface Point {
  x: number
  y: number
}

export interface Echelle {
  pxParMetre: number
  coteSur: string
}

export interface Plan {
  image: string // data URI
  echelle: Echelle | null
  hauteurSousPlafond: number // mètres
}

export interface Piece {
  id: string
  nom: string
  type: TypePiece
  polygone: Point[]
  surfaceM2: number
}

export interface Organe {
  id: string
  type: TypeOrgane
  pieceId: string | null
  x: number
  y: number
  rotation: number // degrés
  hauteurM: number
  pose: PoseHauteur
  postes: number
  ip: string | null
  circuitId: string | null
  repere: string // ex. "PC-07", attribué par famille
  note: string
}

export interface Circuit {
  id: string
  libelle: string
  famille: FamilleCircuit
  sectionMm2: number
  calibreA: number
  ddrId: string | null
  organes: string[]
}

export interface Cheminement {
  id: string
  circuitId: string
  mode: ModeCheminement
  points: Point[]
  deOrgane: string
  versNoeud: string // id d'un organe tableau ou "TAB"
}

export interface Differentiel {
  id: string
  type: 'AC' | 'A' | 'F' | 'B'
  calibreA: number
}

export interface Tableau {
  id: string
  type: 'principal' | 'divisionnaire'
  x: number
  y: number
  hauteurM: number
  differentiels: Differentiel[]
}

export interface Parametres {
  majorationChute: number // ex. 0.10 pour 10 %
  longueurRaccordTableau: number // mètres, réserve par câble
  reglesRef: string // ex. "nfc15100@2026-08"
}

export interface Projet {
  version: 1
  nom: string
  plan: Plan
  pieces: Piece[]
  organes: Organe[]
  circuits: Circuit[]
  cheminements: Cheminement[]
  tableaux: Tableau[]
  parametres: Parametres
}

export function projetVide(nom = 'Nouveau projet'): Projet {
  return {
    version: 1,
    nom,
    plan: { image: '', echelle: null, hauteurSousPlafond: 2.5 },
    pieces: [],
    organes: [],
    circuits: [],
    cheminements: [],
    tableaux: [],
    parametres: {
      majorationChute: 0.1,
      longueurRaccordTableau: 1.0,
      reglesRef: 'nfc15100@2026-08',
    },
  }
}
