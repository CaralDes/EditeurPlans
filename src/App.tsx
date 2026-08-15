import { useEffect } from 'react'
import { BarreOutils } from './components/BarreOutils'
import { Palette } from './components/Palette'
import { PlanCanvas } from './components/PlanCanvas'
import { PanneauProprietes } from './components/PanneauProprietes'
import { DialogueEchelle } from './components/DialogueEchelle'
import { useProjectStore } from './store/useProjectStore'

export default function App() {
  const selection = useProjectStore((s) => s.selection)
  const supprimerOrganes = useProjectStore((s) => s.supprimerOrganes)
  const dupliquerOrganes = useProjectStore((s) => s.dupliquerOrganes)
  const setOutil = useProjectStore((s) => s.setOutil)
  const undo = useProjectStore((s) => s.undo)
  const redo = useProjectStore((s) => s.redo)

  useEffect(() => {
    function surTouche(e: KeyboardEvent) {
      const cible = e.target as HTMLElement
      if (cible.tagName === 'INPUT' || cible.tagName === 'TEXTAREA' || cible.tagName === 'SELECT') return

      if (e.key === 'Escape') setOutil({ kind: 'select' })
      else if ((e.key === 'Delete' || e.key === 'Backspace') && selection.length > 0) supprimerOrganes(selection)
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd' && selection.length > 0) {
        e.preventDefault()
        dupliquerOrganes(selection)
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      }
    }
    window.addEventListener('keydown', surTouche)
    return () => window.removeEventListener('keydown', surTouche)
  }, [selection, supprimerOrganes, dupliquerOrganes, setOutil, undo, redo])

  return (
    <div className="app">
      <BarreOutils />
      <div className="app-corps">
        <aside className="app-palette">
          <Palette />
        </aside>
        <main className="app-canevas">
          <PlanCanvas />
        </main>
        <aside className="app-panneau">
          <PanneauProprietes />
        </aside>
      </div>
      <DialogueEchelle />
    </div>
  )
}
