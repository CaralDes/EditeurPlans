import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Chemins relatifs pour les ressources produites par le build : l'application
// fonctionne alors quel que soit le chemin où elle est servie — à la racine d'un
// serveur local, ou sous un sous-dossier comme /EditeurPlans/ sur GitHub Pages.
// Un chemin absolu codé en dur casserait dès que le site est servi ailleurs.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
