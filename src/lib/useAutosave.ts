import { useEffect, useState } from 'react'
import { useProjectStore } from '../store/useProjectStore'
import { chargerAutosave, enregistrerAutosave } from './autosave'

const DELAI_DEBOUNCE_MS = 600

// Restaure l'auto-sauvegarde au démarrage, puis réenregistre en arrière-plan (avec un
// léger anti-rebond) à chaque changement du projet. N'écrit rien tant que la tentative
// de restauration initiale n'est pas résolue, pour ne pas écraser une sauvegarde
// existante avec le projet vierge le temps de la lecture asynchrone.
export function useAutosave(): boolean {
  const [pret, setPret] = useState(false)

  useEffect(() => {
    let annule = false
    chargerAutosave().then((projet) => {
      if (annule) return
      if (projet) useProjectStore.getState().chargerProjet(projet)
      setPret(true)
    })
    return () => {
      annule = true
    }
  }, [])

  useEffect(() => {
    if (!pret) return
    let minuteur: ReturnType<typeof setTimeout> | undefined
    const desabonner = useProjectStore.subscribe((state, precedent) => {
      if (state.projet === precedent.projet) return
      if (minuteur) clearTimeout(minuteur)
      minuteur = setTimeout(() => enregistrerAutosave(state.projet), DELAI_DEBOUNCE_MS)
    })
    return () => {
      desabonner()
      if (minuteur) clearTimeout(minuteur)
    }
  }, [pret])

  return pret
}
