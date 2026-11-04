import { useState } from 'react'

interface DialogueExportPDFProps {
  nbCircuits: number
  onAnnuler: () => void
  onConfirmer: (inclureCircuits: boolean) => void
}

// Demande, avant de générer le dossier, si les plans de câblage par circuit (un par
// circuit, chacun sur sa page) doivent être inclus — coûteux en pages pour un gros projet,
// donc une option à cocher plutôt qu'un ajout systématique.
export function DialogueExportPDF({ nbCircuits, onAnnuler, onConfirmer }: DialogueExportPDFProps) {
  const [inclureCircuits, setInclureCircuits] = useState(false)

  return (
    <div className="dialogue-fond">
      <div className="dialogue">
        <h3>Dossier PDF</h3>
        <p className="dialogue-note">
          Plan annoté, nomenclature, conformité par pièce, tableau et métré.
        </p>
        <label className="champ-case">
          <input
            type="checkbox"
            checked={inclureCircuits}
            disabled={nbCircuits === 0}
            onChange={(e) => setInclureCircuits(e.target.checked)}
          />
          <span>
            Ajouter un plan de câblage par circuit ({nbCircuits} circuit{nbCircuits > 1 ? 's' : ''}, chacun sur sa
            propre page)
          </span>
        </label>
        {nbCircuits === 0 && <p className="dialogue-note">Aucun circuit créé pour l'instant.</p>}
        <div className="dialogue-actions">
          <button className="btn" onClick={onAnnuler}>
            Annuler
          </button>
          <button className="btn btn-accent" onClick={() => onConfirmer(inclureCircuits)}>
            Générer le PDF
          </button>
        </div>
      </div>
    </div>
  )
}
