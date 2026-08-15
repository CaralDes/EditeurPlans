import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Le site est publié sur GitHub Pages sous /EditeurPlans/.
// En dev et en preview local, on reste à la racine.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/EditeurPlans/' : '/',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}))
