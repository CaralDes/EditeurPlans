import { useProjectStore } from '../store/useProjectStore'
import { longueurMurM } from '../lib/murs'

export function PanneauMurs() {
  const projet = useProjectStore((s) => s.projet)
  const outil = useProjectStore((s) => s.outil)
  const setOutil = useProjectStore((s) => s.setOutil)
  const updateMur = useProjectStore((s) => s.updateMur)
  const supprimerMur = useProjectStore((s) => s.supprimerMur)

  return (
    <div className="panneau-circuits">
      <section>
        <h4>Murs</h4>
        <p className="panneau-note" style={{ marginBottom: 10 }}>
          Trace les murs du plan (traits, pas forcément fermés) : ils servent de repère visuel
          et, plus tard, à occulter la lumière du mode Ombres et lumières.
        </p>
        <button
          className={`btn btn-accent${outil.kind === 'mur' ? ' actif' : ''}`}
          onClick={() => setOutil(outil.kind === 'mur' ? { kind: 'select' } : { kind: 'mur' })}
        >
          {outil.kind === 'mur' ? 'Tracé en cours…' : '+ Nouveau mur'}
        </button>
        {!projet.plan.echelle && (
          <p className="panneau-alerte" style={{ marginTop: 8 }}>
            Échelle non calée : les longueurs resteront à 0 m tant que le plan n'est pas calibré.
          </p>
        )}
      </section>

      <section>
        <h4>Murs tracés ({projet.murs.length})</h4>
        {projet.murs.length === 0 && <p className="panneau-note">Aucun mur tracé pour l'instant.</p>}
        <div className="liste-circuits">
          {projet.murs.map((mur, i) => {
            const longueur = longueurMurM(mur, projet.plan.echelle)
            return (
              <div key={mur.id} className="carte-circuit">
                <div className="carte-circuit-entete">
                  <b>Mur {i + 1}</b>
                  <button className="btn-lien" onClick={() => supprimerMur(mur.id)}>
                    Supprimer
                  </button>
                </div>
                <div className="carte-circuit-specs">
                  <label className="champ-epaisseur-mur">
                    Épaisseur
                    <input
                      type="number"
                      min={0.03}
                      max={0.6}
                      step={0.01}
                      value={mur.epaisseurM}
                      onChange={(e) => updateMur(mur.id, { epaisseurM: Math.max(0.03, Number(e.target.value) || 0) })}
                    />
                    m
                  </label>
                  <span className="tag-spec">{longueur !== null ? `${longueur.toFixed(1)} m` : '— m'}</span>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
