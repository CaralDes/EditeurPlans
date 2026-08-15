import { get, set } from 'idb-keyval'
import type { Projet } from '../types'

// Sauvegarde silencieuse en arrière-plan : le filet de sécurité qui évite de perdre
// le travail en cours si l'onglet se ferme par accident. L'enregistrement explicite
// (fichierProjet.ts) reste le geste volontaire pour archiver ou partager un projet.
const CLE = 'cuivre-projet-auto'

export async function chargerAutosave(): Promise<Projet | null> {
  try {
    const projet = await get<Projet>(CLE)
    return projet ?? null
  } catch {
    return null
  }
}

export async function enregistrerAutosave(projet: Projet): Promise<void> {
  try {
    await set(CLE, projet)
  } catch {
    // Quota IndexedDB dépassé ou navigateur en navigation privée : on ignore
    // silencieusement, l'enregistrement explicite reste disponible.
  }
}
