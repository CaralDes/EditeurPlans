import type { Circuit, Organe, Projet } from '../types'
import { circuitDef, typeDifferentielRequis } from '../regles/moteur'
import { longueurCableM } from './cable'

export interface LigneCircuit {
  circuit: Circuit
  libelleRegle: string | null
  organesCount: number
  cablesTraces: number
  cablesManquants: number
  longueurTotaleM: number | null // null si un câble manque ou si l'échelle n'est pas calée
  depasseMax: boolean
  maxOrganes: number | null
  typeDifferentiel: 'A' | 'AC'
}

export interface TotalSection {
  sectionMm2: number
  longueurM: number
}

// Vue d'ensemble par circuit : organes rattachés, câbles tracés/manquants, longueur totale,
// dépassement du nombre maximal de points par circuit, type de différentiel requis.
export function resumeCircuits(projet: Projet): LigneCircuit[] {
  const tableau = projet.tableaux[0]
  const organesParId = new Map(projet.organes.map((o) => [o.id, o]))

  return projet.circuits.map((circuit) => {
    const def = circuit.regleId ? circuitDef(circuit.regleId) : undefined
    const cheminementsDuCircuit = projet.cheminements.filter((c) => c.circuitId === circuit.id)
    const cablesTraces = cheminementsDuCircuit.length
    const cablesManquants = Math.max(0, circuit.organes.length - cablesTraces)

    let longueurTotaleM: number | null = cablesManquants > 0 || !tableau ? null : 0
    if (longueurTotaleM === 0) {
      for (const cheminement of cheminementsDuCircuit) {
        const organe = organesParId.get(cheminement.deOrgane) as Organe | undefined
        if (!organe || !tableau) {
          longueurTotaleM = null
          break
        }
        const longueur = longueurCableM(
          cheminement,
          organe.hauteurM,
          tableau.hauteurM,
          projet.plan.hauteurSousPlafond,
          projet.plan.echelle,
          projet.parametres.majorationChute,
          projet.parametres.longueurRaccordTableau,
        )
        if (longueur === null) {
          longueurTotaleM = null
          break
        }
        longueurTotaleM += longueur
      }
    }

    return {
      circuit,
      libelleRegle: def?.libelle ?? null,
      organesCount: circuit.organes.length,
      cablesTraces,
      cablesManquants,
      longueurTotaleM,
      depasseMax: def?.maxOrganes !== undefined && circuit.organes.length > def.maxOrganes,
      maxOrganes: def?.maxOrganes ?? null,
      typeDifferentiel: circuit.regleId ? typeDifferentielRequis(circuit.regleId) : 'AC',
    }
  })
}

// Total de mètres de conducteur par section (mm²), tous circuits confondus — la ligne
// principale du métré d'approvisionnement (achat des tourets de câble).
export function totauxParSection(lignes: LigneCircuit[]): TotalSection[] {
  const parSection = new Map<number, number>()
  for (const ligne of lignes) {
    if (ligne.longueurTotaleM === null) continue
    const section = ligne.circuit.sectionMm2
    parSection.set(section, (parSection.get(section) ?? 0) + ligne.longueurTotaleM)
  }
  return [...parSection.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([sectionMm2, longueurM]) => ({ sectionMm2, longueurM }))
}
