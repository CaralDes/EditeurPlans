import { useState } from 'react'
import { useProjectStore } from '../store/useProjectStore'
import { distancePx } from '../lib/echelle'

export function DialogueEchelle() {
  const distanceEnAttente = useProjectStore((s) => s.distanceEnAttente)
  const confirmerEchelle = useProjectStore((s) => s.confirmerEchelle)
  const annulerCalibration = useProjectStore((s) => s.annulerCalibration)
  const [distance, setDistance] = useState('')
  const [libelle, setLibelle] = useState('')

  if (!distanceEnAttente) return null
  const px = distancePx(distanceEnAttente.a, distanceEnAttente.b)

  function valider() {
    const d = Number(distance.replace(',', '.'))
    if (!Number.isFinite(d) || d <= 0) return
    confirmerEchelle(d, libelle || `cote de ${d} m`)
    setDistance('')
    setLibelle('')
  }

  return (
    <div className="dialogue-fond">
      <div className="dialogue">
        <h3>Distance réelle de cette cote</h3>
        <p className="dialogue-note">{px.toFixed(0)} px mesurés sur le plan entre les deux points cliqués.</p>
        <label className="champ-bloc">
          Distance réelle (mètres)
          <input
            autoFocus
            type="text"
            inputMode="decimal"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && valider()}
            placeholder="4.20"
          />
        </label>
        <label className="champ-bloc">
          Repère de la cote (optionnel)
          <input
            type="text"
            value={libelle}
            onChange={(e) => setLibelle(e.target.value)}
            placeholder="ex. mur nord"
          />
        </label>
        <div className="dialogue-actions">
          <button className="btn" onClick={annulerCalibration}>
            Annuler
          </button>
          <button className="btn btn-accent" onClick={valider}>
            Valider l'échelle
          </button>
        </div>
      </div>
    </div>
  )
}
