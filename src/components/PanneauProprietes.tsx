import { useProjectStore } from '../store/useProjectStore'
import { SYMBOL_DEFS } from '../symbols/definitions'
import { hauteurRecommandee } from '../regles/moteur'
import { TEMPERATURES, estLuminaire, paramsParDefaut, rayonEclairageM } from '../lib/lumiere'
import type { PoseHauteur } from '../types'

const POSES: { valeur: PoseHauteur; label: string }[] = [
  { valeur: 'basse', label: 'Basse (prise standard)' },
  { valeur: 'plan-travail', label: 'Plan de travail' },
  { valeur: 'cuisson', label: 'Cuisson (plaque, 32 A)' },
  { valeur: 'haute', label: 'Haute murale (appareil)' },
  { valeur: 'hotte', label: 'Hotte' },
  { valeur: 'commande', label: 'Commande (inter.)' },
  { valeur: 'plafond', label: 'Plafond' },
]

export function PanneauProprietes() {
  const projet = useProjectStore((s) => s.projet)
  const selection = useProjectStore((s) => s.selection)
  const updateOrgane = useProjectStore((s) => s.updateOrgane)
  const supprimerOrganes = useProjectStore((s) => s.supprimerOrganes)
  const dupliquerOrganes = useProjectStore((s) => s.dupliquerOrganes)

  if (selection.length === 0) {
    return (
      <div className="panneau-proprietes panneau-vide">
        <p>Sélectionne un organe sur le plan pour voir et modifier ses propriétés — hauteur de pose, repère, orientation.</p>
      </div>
    )
  }

  if (selection.length > 1) {
    return (
      <div className="panneau-proprietes">
        <h3>{selection.length} organes sélectionnés</h3>
        <div className="panneau-actions">
          <button className="btn" onClick={() => dupliquerOrganes(selection)}>
            Dupliquer
          </button>
          <button className="btn btn-danger" onClick={() => supprimerOrganes(selection)}>
            Supprimer
          </button>
        </div>
      </div>
    )
  }

  const organe = projet.organes.find((o) => o.id === selection[0])
  if (!organe) return null

  const def = SYMBOL_DEFS[organe.type]
  const recommandation = hauteurRecommandee(organe.pose)

  return (
    <div className="panneau-proprietes">
      <h3>{def.label}</h3>
      <div className="panneau-repere">{organe.repere}</div>

      <label className="champ-bloc">
        Hauteur de pose
        <select
          value={organe.pose}
          onChange={(e) => {
            const pose = e.target.value as PoseHauteur
            const reco = hauteurRecommandee(pose)
            updateOrgane(organe.id, { pose, hauteurM: reco?.hauteurM ?? organe.hauteurM })
          }}
        >
          {POSES.map((p) => (
            <option key={p.valeur} value={p.valeur}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      {recommandation && <p className="panneau-note">{recommandation.regle}</p>}

      <label className="champ-bloc">
        Hauteur d'axe (mètres)
        <input
          type="number"
          step={0.01}
          min={0}
          max={3}
          value={organe.hauteurM}
          onChange={(e) => updateOrgane(organe.id, { hauteurM: Number(e.target.value) })}
        />
      </label>

      <label className="champ-bloc">
        Orientation
        <div className="champ-rotation">
          <button className="btn" onClick={() => updateOrgane(organe.id, { rotation: (organe.rotation - 15 + 360) % 360 })}>
            ↺
          </button>
          <span>{organe.rotation}°</span>
          <button className="btn" onClick={() => updateOrgane(organe.id, { rotation: (organe.rotation + 15) % 360 })}>
            ↻
          </button>
        </div>
      </label>

      {(organe.type === 'prise16A-double' || organe.type === 'prise16A') && (
        <label className="champ-bloc">
          Nombre de postes
          <input
            type="number"
            min={1}
            max={4}
            value={organe.postes}
            onChange={(e) => updateOrgane(organe.id, { postes: Number(e.target.value) })}
          />
        </label>
      )}

      {estLuminaire(organe.type) &&
        (() => {
          const defauts = paramsParDefaut(organe.type)!
          const flux = organe.fluxLm ?? defauts.fluxLm
          const temperature = organe.temperatureK ?? defauts.temperatureK
          const hauteurSource =
            organe.pose === 'plafond' ? projet.plan.hauteurSousPlafond : organe.hauteurM || projet.plan.hauteurSousPlafond
          return (
            <>
              <h4 className="panneau-sous-titre">Éclairage</h4>
              <label className="champ-bloc">
                Flux lumineux (lumens)
                <input
                  type="number"
                  step={50}
                  min={50}
                  max={10000}
                  value={flux}
                  onChange={(e) => updateOrgane(organe.id, { fluxLm: Number(e.target.value) })}
                />
              </label>
              <label className="champ-bloc">
                Température de couleur
                <select
                  value={temperature}
                  onChange={(e) => updateOrgane(organe.id, { temperatureK: Number(e.target.value) })}
                >
                  {TEMPERATURES.map((t) => (
                    <option key={t.k} value={t.k}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <p className="panneau-note">
                Nappe éclairée d'environ {rayonEclairageM(flux, hauteurSource).toFixed(1)} m de rayon. Visible via
                « Ombres et lumières ».
              </p>
            </>
          )
        })()}

      <label className="champ-bloc">
        Note
        <textarea
          rows={2}
          value={organe.note}
          onChange={(e) => updateOrgane(organe.id, { note: e.target.value })}
          placeholder="ex. derrière le meuble TV"
        />
      </label>

      <div className="panneau-actions">
        <button className="btn" onClick={() => dupliquerOrganes(selection)}>
          Dupliquer
        </button>
        <button className="btn btn-danger" onClick={() => supprimerOrganes(selection)}>
          Supprimer
        </button>
      </div>
    </div>
  )
}
