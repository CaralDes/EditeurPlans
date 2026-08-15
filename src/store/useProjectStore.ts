import { create } from 'zustand'
import { SYMBOL_META, type Calque, CALQUES_ORDRE } from '../symbols/meta'
import { prochainRepere } from '../lib/reperes'
import { calculerEchelle } from '../lib/echelle'
import { suggererCircuit } from '../lib/circuits'
import { idUnique } from '../lib/id'
import { circuitDef, hauteurRecommandee, typeDifferentielRequis } from '../regles/moteur'
import {
  projetVide,
  type Cheminement,
  type Circuit,
  type FamilleCircuit,
  type ModeCheminement,
  type Organe,
  type Point,
  type Projet,
  type Tableau,
  type TypeOrgane,
} from '../types'

export type Outil =
  | { kind: 'select' }
  | { kind: 'calibrer' }
  | { kind: 'poser'; type: TypeOrgane }
  | { kind: 'tableau'; type: 'principal' | 'divisionnaire' }
  | { kind: 'cable'; circuitId: string; organeId: string; mode: ModeCheminement }

interface ProjectState {
  projet: Projet
  selection: string[]
  outil: Outil
  calquesVisibles: Record<Calque, boolean>
  pointCalibration: Point | null // premier clic en attente du second, en mode 'calibrer'
  distanceEnAttente: { a: Point; b: Point } | null // deux points posés, en attente de la saisie de distance
  pointsCableEnCours: Point[] | null // tracé en cours, en mode 'cable'

  past: Projet[]
  future: Projet[]

  chargerPlan: (image: string) => void
  chargerProjet: (projet: Projet) => void
  setNomProjet: (nom: string) => void
  setHauteurSousPlafond: (m: number) => void

  setOutil: (outil: Outil) => void
  clicCalibration: (p: Point) => void
  annulerCalibration: () => void
  confirmerEchelle: (distanceReelleM: number, coteSur: string) => void

  ajouterOrgane: (type: TypeOrgane, x: number, y: number) => string
  deplacerOrgane: (id: string, x: number, y: number) => void
  updateOrgane: (id: string, patch: Partial<Organe>) => void
  supprimerOrganes: (ids: string[]) => void
  dupliquerOrganes: (ids: string[]) => void

  setSelection: (ids: string[]) => void
  toggleSelection: (id: string) => void

  toggleCalque: (calque: Calque) => void

  poserTableau: (type: 'principal' | 'divisionnaire', x: number, y: number) => string
  deplacerTableau: (id: string, x: number, y: number) => void
  supprimerTableau: (id: string) => void

  creerCircuit: (organeIds: string[]) => string
  renommerCircuit: (id: string, libelle: string) => void
  updateCircuit: (id: string, patch: Partial<Pick<Circuit, 'sectionMm2' | 'calibreA'>>) => void
  retirerOrganeDuCircuit: (organeId: string) => void
  supprimerCircuit: (id: string) => void

  clicCable: (p: Point) => void
  setModeCableEnCours: (mode: ModeCheminement) => void
  finaliserCable: () => void
  annulerCable: () => void
  supprimerCheminement: (id: string) => void

  undo: () => void
  redo: () => void
}

const calquesInitiaux = Object.fromEntries(CALQUES_ORDRE.map((c) => [c, true])) as Record<Calque, boolean>

function commit(set: (fn: (s: ProjectState) => Partial<ProjectState>) => void, get: () => ProjectState, next: Projet) {
  const s = get()
  set(() => ({
    projet: next,
    past: [...s.past, s.projet].slice(-100),
    future: [],
  }))
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projet: projetVide('Extension'),
  selection: [],
  outil: { kind: 'select' },
  calquesVisibles: calquesInitiaux,
  pointCalibration: null,
  distanceEnAttente: null,
  pointsCableEnCours: null,

  past: [],
  future: [],

  chargerPlan: (image) => {
    const p = get().projet
    commit(set, get, { ...p, plan: { ...p.plan, image, echelle: null } })
  },

  // Remplace tout le projet courant (ouverture d'un fichier .cuivre, ou restauration
  // de l'auto-sauvegarde) : repart d'un historique vierge, pas d'un commit incrémental.
  chargerProjet: (projet) => {
    set({
      projet,
      selection: [],
      outil: { kind: 'select' },
      pointCalibration: null,
      distanceEnAttente: null,
      pointsCableEnCours: null,
      past: [],
      future: [],
    })
  },

  setNomProjet: (nom) => {
    const p = get().projet
    commit(set, get, { ...p, nom })
  },

  setHauteurSousPlafond: (m) => {
    const p = get().projet
    commit(set, get, { ...p, plan: { ...p.plan, hauteurSousPlafond: m } })
  },

  setOutil: (outil) =>
    set({ outil, pointCalibration: null, distanceEnAttente: null, pointsCableEnCours: null }),

  clicCalibration: (point) => {
    const { pointCalibration } = get()
    if (!pointCalibration) {
      set({ pointCalibration: point })
    } else {
      set({ pointCalibration: null, distanceEnAttente: { a: pointCalibration, b: point } })
    }
  },

  annulerCalibration: () => set({ pointCalibration: null, distanceEnAttente: null }),

  confirmerEchelle: (distanceReelleM, coteSur) => {
    const { distanceEnAttente, projet } = get()
    if (!distanceEnAttente || distanceReelleM <= 0) return
    const echelle = calculerEchelle(distanceEnAttente.a, distanceEnAttente.b, distanceReelleM, coteSur)
    commit(set, get, { ...projet, plan: { ...projet.plan, echelle } })
    set({ distanceEnAttente: null, outil: { kind: 'select' } })
  },

  ajouterOrgane: (type, x, y) => {
    const p = get().projet
    const def = SYMBOL_META[type]
    const id = idUnique(type)
    const organe: Organe = {
      id,
      type,
      pieceId: null,
      x,
      y,
      rotation: 0,
      hauteurM: hauteurRecommandee(def.poseDefaut)?.hauteurM ?? 0,
      pose: def.poseDefaut,
      postes: 1,
      ip: null,
      circuitId: null,
      repere: prochainRepere(p.organes, type),
      note: '',
    }
    commit(set, get, { ...p, organes: [...p.organes, organe] })
    set({ selection: [id] })
    return id
  },

  deplacerOrgane: (id, x, y) => {
    const p = get().projet
    commit(set, get, { ...p, organes: p.organes.map((o) => (o.id === id ? { ...o, x, y } : o)) })
  },

  updateOrgane: (id, patch) => {
    const p = get().projet
    commit(set, get, { ...p, organes: p.organes.map((o) => (o.id === id ? { ...o, ...patch } : o)) })
  },

  supprimerOrganes: (ids) => {
    const p = get().projet
    const idSet = new Set(ids)
    commit(set, get, {
      ...p,
      organes: p.organes.filter((o) => !idSet.has(o.id)),
      circuits: p.circuits.map((c) => ({ ...c, organes: c.organes.filter((id) => !idSet.has(id)) })),
      cheminements: p.cheminements.filter((c) => !idSet.has(c.deOrgane)),
    })
    set({ selection: [] })
  },

  dupliquerOrganes: (ids) => {
    const p = get().projet
    const idSet = new Set(ids)
    const copies: Organe[] = []
    for (const o of p.organes) {
      if (!idSet.has(o.id)) continue
      const id = idUnique(o.type)
      // Une copie repart sans circuit ni câble : le rattachement doit rester un choix explicite.
      copies.push({
        ...o,
        id,
        x: o.x + 24,
        y: o.y + 24,
        circuitId: null,
        repere: prochainRepere([...p.organes, ...copies], o.type),
      })
    }
    commit(set, get, { ...p, organes: [...p.organes, ...copies] })
    set({ selection: copies.map((c) => c.id) })
  },

  setSelection: (ids) => set({ selection: ids }),
  toggleSelection: (id) =>
    set((s) => ({
      selection: s.selection.includes(id) ? s.selection.filter((i) => i !== id) : [...s.selection, id],
    })),

  toggleCalque: (calque) =>
    set((s) => ({ calquesVisibles: { ...s.calquesVisibles, [calque]: !s.calquesVisibles[calque] } })),

  // v1 : un seul tableau divisionnaire par projet (voir lib/metre.ts, qui ne lit que le
  // premier). Seedé avec les 2 différentiels 30 mA minimum imposés par la norme.
  poserTableau: (type, x, y) => {
    const p = get().projet
    const id = idUnique('tableau')
    const tableau: Tableau = {
      id,
      type,
      x,
      y,
      hauteurM: hauteurRecommandee('commande')?.hauteurM ?? 1.1,
      differentiels: [
        { id: `${id}-ddr-a`, type: 'A', calibreA: 40 },
        { id: `${id}-ddr-ac`, type: 'AC', calibreA: 40 },
      ],
    }
    commit(set, get, { ...p, tableaux: [...p.tableaux, tableau] })
    set({ outil: { kind: 'select' }, selection: [id] })
    return id
  },

  deplacerTableau: (id, x, y) => {
    const p = get().projet
    commit(set, get, { ...p, tableaux: p.tableaux.map((t) => (t.id === id ? { ...t, x, y } : t)) })
  },

  supprimerTableau: (id) => {
    const p = get().projet
    commit(set, get, {
      ...p,
      tableaux: p.tableaux.filter((t) => t.id !== id),
      circuits: p.circuits.map((c) => ({ ...c, ddrId: null })),
    })
  },

  creerCircuit: (organeIds) => {
    const p = get().projet
    if (organeIds.length === 0) return ''
    const idSet = new Set(organeIds)
    const premier = p.organes.find((o) => organeIds.includes(o.id))
    const regleId = premier ? suggererCircuit(premier.type) : undefined
    const def = regleId ? circuitDef(regleId) : undefined
    const tableau = p.tableaux[0]
    const typeRequis = regleId ? typeDifferentielRequis(regleId) : 'AC'
    const ddrId = tableau?.differentiels.find((d) => d.type === typeRequis)?.id ?? null

    const id = idUnique('circuit')
    const circuit: Circuit = {
      id,
      libelle: def?.libelle ?? 'Nouveau circuit',
      famille: (def?.famille as FamilleCircuit | undefined) ?? 'prises',
      regleId: regleId ?? null,
      sectionMm2: def?.sectionMm2 ?? 1.5,
      calibreA: def?.calibreA ?? 16,
      ddrId,
      organes: organeIds,
    }
    commit(set, get, {
      ...p,
      // Retire ces organes de tout circuit auquel ils appartenaient déjà (pas de référence
      // obsolète) et abandonne leur éventuel câble tracé : il appartenait à l'ancien circuit.
      circuits: [...p.circuits.map((c) => ({ ...c, organes: c.organes.filter((oid) => !idSet.has(oid)) })), circuit],
      organes: p.organes.map((o) => (idSet.has(o.id) ? { ...o, circuitId: id } : o)),
      cheminements: p.cheminements.filter((c) => !idSet.has(c.deOrgane)),
    })
    set({ selection: [] })
    return id
  },

  renommerCircuit: (id, libelle) => {
    const p = get().projet
    commit(set, get, { ...p, circuits: p.circuits.map((c) => (c.id === id ? { ...c, libelle } : c)) })
  },

  updateCircuit: (id, patch) => {
    const p = get().projet
    commit(set, get, { ...p, circuits: p.circuits.map((c) => (c.id === id ? { ...c, ...patch } : c)) })
  },

  retirerOrganeDuCircuit: (organeId) => {
    const p = get().projet
    const organe = p.organes.find((o) => o.id === organeId)
    if (!organe?.circuitId) return
    const circuitId = organe.circuitId
    commit(set, get, {
      ...p,
      organes: p.organes.map((o) => (o.id === organeId ? { ...o, circuitId: null } : o)),
      circuits: p.circuits.map((c) =>
        c.id === circuitId ? { ...c, organes: c.organes.filter((id) => id !== organeId) } : c,
      ),
      cheminements: p.cheminements.filter((c) => c.deOrgane !== organeId),
    })
  },

  supprimerCircuit: (id) => {
    const p = get().projet
    commit(set, get, {
      ...p,
      circuits: p.circuits.filter((c) => c.id !== id),
      organes: p.organes.map((o) => (o.circuitId === id ? { ...o, circuitId: null } : o)),
      cheminements: p.cheminements.filter((c) => c.circuitId !== id),
    })
  },

  clicCable: (point) => {
    const s = get()
    if (s.outil.kind !== 'cable') return
    set({ pointsCableEnCours: [...(s.pointsCableEnCours ?? []), point] })
  },

  setModeCableEnCours: (mode) =>
    set((s) => (s.outil.kind === 'cable' ? { outil: { ...s.outil, mode } } : {})),

  finaliserCable: () => {
    const s = get()
    if (s.outil.kind !== 'cable' || !s.pointsCableEnCours || s.pointsCableEnCours.length < 2) {
      set({ pointsCableEnCours: null })
      return
    }
    const { circuitId, organeId, mode } = s.outil
    const tableau = s.projet.tableaux[0]
    const p = s.projet
    const cheminement: Cheminement = {
      id: idUnique('cable'),
      circuitId,
      mode,
      points: s.pointsCableEnCours,
      deOrgane: organeId,
      versNoeud: tableau?.id ?? 'TAB',
    }
    // Un nouveau tracé remplace l'éventuel câble déjà posé pour ce même organe sur ce circuit.
    commit(set, get, {
      ...p,
      cheminements: [
        ...p.cheminements.filter((c) => !(c.circuitId === circuitId && c.deOrgane === organeId)),
        cheminement,
      ],
    })
    set({ pointsCableEnCours: null, outil: { kind: 'select' } })
  },

  annulerCable: () => set({ pointsCableEnCours: null, outil: { kind: 'select' } }),

  supprimerCheminement: (id) => {
    const p = get().projet
    commit(set, get, { ...p, cheminements: p.cheminements.filter((c) => c.id !== id) })
  },

  undo: () => {
    const s = get()
    const prev = s.past.at(-1)
    if (!prev) return
    set({
      projet: prev,
      past: s.past.slice(0, -1),
      future: [s.projet, ...s.future].slice(0, 100),
    })
  },

  redo: () => {
    const s = get()
    const next = s.future[0]
    if (!next) return
    set({
      projet: next,
      past: [...s.past, s.projet].slice(-100),
      future: s.future.slice(1),
    })
  },
}))
