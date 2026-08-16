import type { Cheminement, Circuit, Organe, Projet } from '../types'
import { circuitDef, soclesDesIds, typeDifferentielRequis } from '../regles/moteur'
import { longueurCableM } from './cable'

export interface LigneCircuit {
  circuit: Circuit
  libelleRegle: string | null
  organesCount: number
  cheminements: Cheminement[] // câbles physiques tracés pour ce circuit — un câble peut desservir plusieurs organes
  organesNonCables: string[] // organes du circuit non encore desservis par un câble
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
    const organesCablesIds = new Set(cheminementsDuCircuit.flatMap((c) => c.organes))
    const organesNonCables = circuit.organes.filter((oid) => !organesCablesIds.has(oid))
    const cablesTraces = cheminementsDuCircuit.length
    const cablesManquants = organesNonCables.length

    let longueurTotaleM: number | null = cablesManquants > 0 || !tableau ? null : 0
    if (longueurTotaleM === 0) {
      for (const cheminement of cheminementsDuCircuit) {
        const hauteursOrganesM = cheminement.organes.map((oid) => (organesParId.get(oid) as Organe | undefined)?.hauteurM)
        if (!tableau || hauteursOrganesM.some((h) => h === undefined)) {
          longueurTotaleM = null
          break
        }
        const longueur = longueurCableM(
          cheminement,
          hauteursOrganesM as number[],
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

    // En socles : une prise double occupe 2 des 12 points d'un circuit 2,5 mm².
    const soclesDuCircuit = soclesDesIds(circuit.organes, organesParId)

    return {
      circuit,
      libelleRegle: def?.libelle ?? null,
      organesCount: soclesDuCircuit,
      cheminements: cheminementsDuCircuit,
      organesNonCables,
      cablesTraces,
      cablesManquants,
      longueurTotaleM,
      depasseMax: def?.maxOrganes !== undefined && soclesDuCircuit > def.maxOrganes,
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
