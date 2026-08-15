import { create } from 'zustand'
import { SYMBOL_DEFS, type Calque, CALQUES_ORDRE } from '../symbols/definitions'
import { prochainRepere } from '../lib/reperes'
import { calculerEchelle } from '../lib/echelle'
import { projetVide, type Organe, type Point, type Projet, type TypeOrgane } from '../types'

export type Outil = { kind: 'select' } | { kind: 'calibrer' } | { kind: 'poser'; type: TypeOrgane }

interface ProjectState {
  projet: Projet
  selection: string[]
  outil: Outil
  calquesVisibles: Record<Calque, boolean>
  pointCalibration: Point | null // premier clic en attente du second, en mode 'calibrer'
  distanceEnAttente: { a: Point; b: Point } | null // deux points posés, en attente de la saisie de distance

  past: Projet[]
  future: Projet[]

  chargerPlan: (image: string) => void
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

  past: [],
  future: [],

  chargerPlan: (image) => {
    const p = get().projet
    commit(set, get, { ...p, plan: { ...p.plan, image, echelle: null } })
  },

  setNomProjet: (nom) => {
    const p = get().projet
    commit(set, get, { ...p, nom })
  },

  setHauteurSousPlafond: (m) => {
    const p = get().projet
    commit(set, get, { ...p, plan: { ...p.plan, hauteurSousPlafond: m } })
  },

  setOutil: (outil) => set({ outil, pointCalibration: null, distanceEnAttente: null }),

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
    const def = SYMBOL_DEFS[type]
    const id = `${type}-${Date.now()}-${Math.round(Math.random() * 1000)}`
    const organe: Organe = {
      id,
      type,
      pieceId: null,
      x,
      y,
      rotation: 0,
      hauteurM: 0,
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
    commit(set, get, { ...p, organes: p.organes.filter((o) => !idSet.has(o.id)) })
    set({ selection: [] })
  },

  dupliquerOrganes: (ids) => {
    const p = get().projet
    const idSet = new Set(ids)
    const copies: Organe[] = []
    for (const o of p.organes) {
      if (!idSet.has(o.id)) continue
      const id = `${o.type}-${Date.now()}-${Math.round(Math.random() * 1000)}-${copies.length}`
      copies.push({ ...o, id, x: o.x + 24, y: o.y + 24, repere: prochainRepere([...p.organes, ...copies], o.type) })
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
