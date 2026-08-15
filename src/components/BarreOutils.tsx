import { useRef } from 'react'
import { useProjectStore } from '../store/useProjectStore'

export function BarreOutils() {
  const inputRef = useRef<HTMLInputElement>(null)
  const projet = useProjectStore((s) => s.projet)
  const outil = useProjectStore((s) => s.outil)
  const setOutil = useProjectStore((s) => s.setOutil)
  const chargerPlan = useProjectStore((s) => s.chargerPlan)
  const setNomProjet = useProjectStore((s) => s.setNomProjet)
  const setHauteurSousPlafond = useProjectStore((s) => s.setHauteurSousPlafond)
  const undo = useProjectStore((s) => s.undo)
  const redo = useProjectStore((s) => s.redo)
  const peutUndo = useProjectStore((s) => s.past.length > 0)
  const peutRedo = useProjectStore((s) => s.future.length > 0)

  function surImport(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0]
    if (!fichier) return
    const lecteur = new FileReader()
    lecteur.onload = () => {
      if (typeof lecteur.result === 'string') chargerPlan(lecteur.result)
    }
    lecteur.readAsDataURL(fichier)
    e.target.value = ''
  }

  return (
    <div className="barre-outils">
      <div className="barre-groupe">
        <input
          className="champ-nom"
          value={projet.nom}
          onChange={(e) => setNomProjet(e.target.value)}
          aria-label="Nom du projet"
        />
      </div>

      <div className="barre-groupe">
        <button className="btn" onClick={() => inputRef.current?.click()}>
          Charger le plan (JPG)
        </button>
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={surImport} />

        <button
          className={`btn${outil.kind === 'calibrer' ? ' actif' : ''}`}
          disabled={!projet.plan.image}
          onClick={() => setOutil(outil.kind === 'calibrer' ? { kind: 'select' } : { kind: 'calibrer' })}
        >
          Caler l'échelle
        </button>

        <button
          className={`btn${outil.kind === 'select' ? ' actif' : ''}`}
          onClick={() => setOutil({ kind: 'select' })}
        >
          Sélectionner
        </button>
      </div>

      <div className="barre-groupe">
        <label className="champ-inline">
          Hauteur sous plafond
          <input
            type="number"
            step={0.05}
            min={2}
            max={4}
            value={projet.plan.hauteurSousPlafond}
            onChange={(e) => setHauteurSousPlafond(Number(e.target.value))}
          />
          m
        </label>
      </div>

      <div className="barre-groupe">
        <button className="btn" disabled={!peutUndo} onClick={undo} title="Annuler (Ctrl+Z)">
          ↶ Annuler
        </button>
        <button className="btn" disabled={!peutRedo} onClick={redo} title="Refaire (Ctrl+Shift+Z)">
          ↷ Refaire
        </button>
      </div>
    </div>
  )
}
