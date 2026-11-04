import { useRef, useState } from 'react'
import { useProjectStore } from '../store/useProjectStore'
import { FichierProjetInvalide, analyser, declencherTelechargement, lireFichier, nomFichier, serialiser } from '../lib/fichierProjet'
import { construireDossier, imprimerDossier } from '../lib/dossier'
import { capturerCircuit, capturerPlan } from '../lib/apercuPlan'
import { DialogueExportPDF } from './DialogueExportPDF'

export function BarreOutils() {
  const inputRef = useRef<HTMLInputElement>(null)
  const inputProjetRef = useRef<HTMLInputElement>(null)
  const [erreurOuverture, setErreurOuverture] = useState<string | null>(null)
  const [dialogueExportOuvert, setDialogueExportOuvert] = useState(false)
  const projet = useProjectStore((s) => s.projet)
  const outil = useProjectStore((s) => s.outil)
  const setOutil = useProjectStore((s) => s.setOutil)
  const chargerPlan = useProjectStore((s) => s.chargerPlan)
  const chargerProjet = useProjectStore((s) => s.chargerProjet)
  const setNomProjet = useProjectStore((s) => s.setNomProjet)
  const setHauteurSousPlafond = useProjectStore((s) => s.setHauteurSousPlafond)
  const undo = useProjectStore((s) => s.undo)
  const redo = useProjectStore((s) => s.redo)
  const peutUndo = useProjectStore((s) => s.past.length > 0)
  const peutRedo = useProjectStore((s) => s.future.length > 0)
  const modeEclairage = useProjectStore((s) => s.modeEclairage)
  const toggleModeEclairage = useProjectStore((s) => s.toggleModeEclairage)
  const intensiteNuit = useProjectStore((s) => s.intensiteNuit)
  const setIntensiteNuit = useProjectStore((s) => s.setIntensiteNuit)

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

  function surEnregistrer() {
    declencherTelechargement(serialiser(projet), nomFichier(projet))
  }

  function surExporterDossier() {
    setDialogueExportOuvert(true)
  }

  function surConfirmerExport(inclureCircuits: boolean) {
    setDialogueExportOuvert(false)
    const imagePlan = capturerPlan()
    let plansParCircuit: Map<string, string> | undefined
    if (inclureCircuits && projet.circuits.length > 0) {
      plansParCircuit = new Map()
      for (const circuit of projet.circuits) {
        const image = capturerCircuit(circuit.id, projet.cheminements)
        if (image) plansParCircuit.set(circuit.id, image)
      }
    }
    const html = construireDossier(projet, imagePlan, new Date().toISOString(), plansParCircuit)
    if (!imprimerDossier(html)) {
      setErreurOuverture("L'impression a été bloquée par le navigateur — autorise les fenêtres surgissantes.")
    } else {
      setErreurOuverture(null)
    }
  }

  async function surOuvrir(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0]
    e.target.value = ''
    if (!fichier) return
    const aDuContenu = projet.organes.length > 0 || Boolean(projet.plan.image)
    if (aDuContenu && !window.confirm('Remplacer le projet actuel par ce fichier ? Le travail non enregistré sera perdu.')) {
      return
    }
    try {
      const texte = await lireFichier(fichier)
      const projetOuvert = analyser(texte)
      chargerProjet(projetOuvert)
      setErreurOuverture(null)
    } catch (err) {
      setErreurOuverture(err instanceof FichierProjetInvalide ? err.message : "Impossible d'ouvrir ce fichier.")
    }
  }

  return (
    <>
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
        <button className="btn" onClick={surEnregistrer} title="Télécharger le projet (.cuivre)">
          Enregistrer
        </button>
        <button className="btn" onClick={() => inputProjetRef.current?.click()} title="Ouvrir un fichier .cuivre">
          Ouvrir…
        </button>
        <input ref={inputProjetRef} type="file" accept=".cuivre,application/json" hidden onChange={surOuvrir} />
        <button
          className="btn"
          onClick={surExporterDossier}
          title="Dossier imprimable : plan, nomenclature, conformité, tableau et métré (« Enregistrer au format PDF »)"
        >
          Dossier PDF…
        </button>
        {erreurOuverture && <span className="barre-erreur">{erreurOuverture}</span>}
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
        <button
          className={`btn${modeEclairage ? ' actif' : ''}`}
          onClick={toggleModeEclairage}
          title="Simuler l'ambiance lumineuse des luminaires posés"
        >
          ☾ Ombres et lumières
        </button>
        {modeEclairage && (
          <label className="champ-inline" title="Obscurité de fond, pour juger le contraste">
            Ambiance
            <input
              type="range"
              min={0.3}
              max={1}
              step={0.02}
              value={intensiteNuit}
              onChange={(e) => setIntensiteNuit(Number(e.target.value))}
            />
          </label>
        )}
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
    {dialogueExportOuvert && (
      <DialogueExportPDF
        nbCircuits={projet.circuits.length}
        onAnnuler={() => setDialogueExportOuvert(false)}
        onConfirmer={surConfirmerExport}
      />
    )}
    </>
  )
}
