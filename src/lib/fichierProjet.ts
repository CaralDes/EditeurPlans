import type { Projet } from '../types'

export const EXTENSION = '.cuivre'

export function nomFichier(projet: Projet): string {
  const base = projet.nom.trim() || 'projet'
  const nettoye = base
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
  return `${nettoye || 'projet'}${EXTENSION}`
}

export function serialiser(projet: Projet): string {
  return JSON.stringify(projet, null, 2)
}

// Vérification structurelle légère : pas de schéma complet, juste assez pour refuser
// un fichier qui n'est manifestement pas un projet Cuivre plutôt que de charger n'importe quoi.
export function estProjetValide(valeur: unknown): valeur is Projet {
  if (typeof valeur !== 'object' || valeur === null) return false
  const v = valeur as Record<string, unknown>
  return (
    v.version === 1 &&
    typeof v.nom === 'string' &&
    typeof v.plan === 'object' &&
    v.plan !== null &&
    Array.isArray(v.pieces) &&
    Array.isArray(v.organes) &&
    Array.isArray(v.circuits) &&
    Array.isArray(v.cheminements) &&
    Array.isArray(v.tableaux) &&
    typeof v.parametres === 'object' &&
    v.parametres !== null
  )
}

export class FichierProjetInvalide extends Error {}

export function analyser(texte: string): Projet {
  let valeur: unknown
  try {
    valeur = JSON.parse(texte)
  } catch {
    throw new FichierProjetInvalide("Ce fichier n'est pas un JSON valide.")
  }
  if (!estProjetValide(valeur)) {
    throw new FichierProjetInvalide("Ce fichier ne ressemble pas à un projet Cuivre (.cuivre).")
  }
  return valeur
}

export function declencherTelechargement(contenu: string, nom: string): void {
  const blob = new Blob([contenu], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const lien = document.createElement('a')
  lien.href = url
  lien.download = nom
  document.body.appendChild(lien)
  lien.click()
  lien.remove()
  URL.revokeObjectURL(url)
}

export function lireFichier(fichier: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader()
    lecteur.onload = () => {
      if (typeof lecteur.result === 'string') resolve(lecteur.result)
      else reject(new FichierProjetInvalide('Lecture du fichier impossible.'))
    }
    lecteur.onerror = () => reject(new FichierProjetInvalide('Lecture du fichier impossible.'))
    lecteur.readAsText(fichier)
  })
}
