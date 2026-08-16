import { useEffect, useState } from 'react'
import { BarreOutils } from './components/BarreOutils'
import { Palette } from './components/Palette'
import { PlanCanvas } from './components/PlanCanvas'
import { PanneauProprietes } from './components/PanneauProprietes'
import { PanneauCircuits } from './components/PanneauCircuits'
import { PanneauPieces } from './components/PanneauPieces'
import { PanneauMurs } from './components/PanneauMurs'
import { DialogueEchelle } from './components/DialogueEchelle'
import { useProjectStore } from './store/useProjectStore'
import { useAutosave } from './lib/useAutosave'

type Onglet = 'proprietes' | 'murs' | 'pieces' | 'circuits'

export default function App() {
  useAutosave()
  const [onglet, setOnglet] = useState<Onglet>('proprietes')
  const selection = useProjectStore((s) => s.selection)
  const outil = useProjectStore((s) => s.outil)
  const supprimerOrganes = useProjectStore((s) => s.supprimerOrganes)
  const dupliquerOrganes = useProjectStore((s) => s.dupliquerOrganes)
  const setOutil = useProjectStore((s) => s.setOutil)
  const finaliserCable = useProjectStore((s) => s.finaliserCable)
  const finaliserPiece = useProjectStore((s) => s.finaliserPiece)
  const finaliserMur = useProjectStore((s) => s.finaliserMur)
  const undo = useProjectStore((s) => s.undo)
  const redo = useProjectStore((s) => s.redo)

  useEffect(() => {
    function surTouche(e: KeyboardEvent) {
      const cible = e.target as HTMLElement
      if (cible.tagName === 'INPUT' || cible.tagName === 'TEXTAREA' || cible.tagName === 'SELECT') return

      if (e.key === 'Escape') setOutil({ kind: 'select' })
      else if (e.key === 'Enter' && outil.kind === 'cable') finaliserCable()
      else if (e.key === 'Enter' && outil.kind === 'piece') finaliserPiece()
      else if (e.key === 'Enter' && outil.kind === 'mur') finaliserMur()
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
  }, [
    selection,
    outil,
    supprimerOrganes,
    dupliquerOrganes,
    setOutil,
    finaliserCable,
    finaliserPiece,
    finaliserMur,
    undo,
    redo,
  ])

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
          <div className="onglets">
            <button className={`onglet${onglet === 'proprietes' ? ' actif' : ''}`} onClick={() => setOnglet('proprietes')}>
              Propriétés
            </button>
            <button className={`onglet${onglet === 'murs' ? ' actif' : ''}`} onClick={() => setOnglet('murs')}>
              Murs
            </button>
            <button className={`onglet${onglet === 'pieces' ? ' actif' : ''}`} onClick={() => setOnglet('pieces')}>
              Pièces
            </button>
            <button className={`onglet${onglet === 'circuits' ? ' actif' : ''}`} onClick={() => setOnglet('circuits')}>
              Circuits & câblage
            </button>
          </div>
          {onglet === 'proprietes' && <PanneauProprietes />}
          {onglet === 'murs' && <PanneauMurs />}
          {onglet === 'pieces' && <PanneauPieces />}
          {onglet === 'circuits' && <PanneauCircuits />}
        </aside>
      </div>
      <DialogueEchelle />
    </div>
  )
}
