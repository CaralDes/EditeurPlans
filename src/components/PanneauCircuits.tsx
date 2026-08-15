import { useProjectStore } from '../store/useProjectStore'
import { suggererCircuit } from '../lib/circuits'
import { circuitDef } from '../regles/moteur'
import { resumeCircuits, totauxParSection } from '../lib/metre'

export function PanneauCircuits() {
  const projet = useProjectStore((s) => s.projet)
  const selection = useProjectStore((s) => s.selection)
  const outil = useProjectStore((s) => s.outil)
  const setOutil = useProjectStore((s) => s.setOutil)
  const supprimerTableau = useProjectStore((s) => s.supprimerTableau)
  const creerCircuit = useProjectStore((s) => s.creerCircuit)
  const supprimerCircuit = useProjectStore((s) => s.supprimerCircuit)
  const retirerOrganeDuCircuit = useProjectStore((s) => s.retirerOrganeDuCircuit)
  const supprimerCheminement = useProjectStore((s) => s.supprimerCheminement)

  const tableau = projet.tableaux[0]
  const lignes = resumeCircuits(projet)
  const totaux = totauxParSection(lignes)

  const selectionLibre = selection.filter((id) => {
    const o = projet.organes.find((x) => x.id === id)
    return o && !o.circuitId
  })
  const premierType = selectionLibre.length > 0 ? projet.organes.find((o) => o.id === selectionLibre[0])?.type : undefined
  const regleSuggeree = premierType ? suggererCircuit(premierType) : undefined
  const defSuggeree = regleSuggeree ? circuitDef(regleSuggeree) : undefined

  return (
    <div className="panneau-circuits">
      <section>
        <h4>Tableau</h4>
        {tableau ? (
          <div className="carte-tableau">
            <div>
              <b>{tableau.type === 'divisionnaire' ? 'Tableau divisionnaire' : 'Tableau principal'}</b>
              <p className="panneau-note">
                Différentiels : {tableau.differentiels.map((d) => `${d.type} ${d.calibreA} A`).join(' · ')}
              </p>
            </div>
            <button
              className="btn btn-danger"
              onClick={() => {
                if (window.confirm('Supprimer le tableau ? Les longueurs de câble ne seront plus calculables.')) {
                  supprimerTableau(tableau.id)
                }
              }}
            >
              Supprimer
            </button>
          </div>
        ) : (
          <div className="panneau-vide">
            <p>Pose le tableau divisionnaire pour pouvoir créer des circuits et calculer les longueurs de câble.</p>
            <button className="btn btn-accent" onClick={() => setOutil({ kind: 'tableau', type: 'divisionnaire' })}>
              + Tableau divisionnaire
            </button>{' '}
            <button className="btn-lien" onClick={() => setOutil({ kind: 'tableau', type: 'principal' })}>
              ou poser un tableau principal
            </button>
          </div>
        )}
      </section>

      <section>
        <h4>Nouveau circuit</h4>
        {selectionLibre.length === 0 ? (
          <p className="panneau-note">
            Sélectionne un ou plusieurs organes sur le plan (outil Sélectionner) pour les regrouper en circuit.
          </p>
        ) : (
          <div className="nouveau-circuit">
            <p>{selectionLibre.length} organe(s) sélectionné(s)</p>
            {defSuggeree && (
              <p className="panneau-note">
                Suggestion : {defSuggeree.libelle} — {defSuggeree.sectionMm2} mm², disjoncteur {defSuggeree.calibreA} A
              </p>
            )}
            <button className="btn btn-accent" onClick={() => creerCircuit(selectionLibre)}>
              Créer le circuit
            </button>
          </div>
        )}
      </section>

      <section>
        <h4>Circuits ({lignes.length})</h4>
        {lignes.length === 0 && <p className="panneau-note">Aucun circuit créé pour l'instant.</p>}
        <div className="liste-circuits">
          {lignes.map((ligne) => (
            <div key={ligne.circuit.id} className="carte-circuit">
              <div className="carte-circuit-entete">
                <b>{ligne.circuit.libelle}</b>
                <button className="btn-lien" onClick={() => supprimerCircuit(ligne.circuit.id)}>
                  Supprimer
                </button>
              </div>
              <div className="carte-circuit-specs">
                <span className="tag-spec">{ligne.circuit.sectionMm2} mm²</span>
                <span className="tag-spec">{ligne.circuit.calibreA} A</span>
                <span className="tag-spec">Différentiel {ligne.typeDifferentiel}</span>
              </div>
              {ligne.depasseMax && (
                <p className="panneau-alerte">
                  {ligne.organesCount} organes posés, {ligne.maxOrganes} maximum pour ce circuit — envisage de le
                  scinder en deux.
                </p>
              )}
              <ul className="liste-organes-circuit">
                {ligne.circuit.organes.map((oid) => {
                  const organe = projet.organes.find((o) => o.id === oid)
                  if (!organe) return null
                  const cheminement = projet.cheminements.find(
                    (c) => c.circuitId === ligne.circuit.id && c.deOrgane === oid,
                  )
                  const enTrainDeTracer = outil.kind === 'cable' && outil.organeId === oid
                  return (
                    <li key={oid}>
                      <span>{organe.repere}</span>
                      {cheminement && <span className="badge-ok">câblé</span>}
                      <button
                        className={`btn-lien${enTrainDeTracer ? ' actif' : ''}`}
                        disabled={!tableau}
                        title={tableau ? undefined : "Pose d'abord le tableau"}
                        onClick={() => setOutil({ kind: 'cable', circuitId: ligne.circuit.id, organeId: oid, mode: 'plafond' })}
                      >
                        {cheminement ? 'Retracer' : 'Tracer le câble'}
                      </button>
                      {cheminement && (
                        <button className="btn-lien" onClick={() => supprimerCheminement(cheminement.id)}>
                          ✕
                        </button>
                      )}
                      <button className="btn-lien" onClick={() => retirerOrganeDuCircuit(oid)}>
                        retirer
                      </button>
                    </li>
                  )
                })}
              </ul>
              <p className="panneau-note">
                {ligne.longueurTotaleM !== null
                  ? `Longueur totale estimée : ${ligne.longueurTotaleM.toFixed(1)} m`
                  : ligne.cablesManquants > 0
                    ? `${ligne.cablesManquants} câble(s) restant(s) à tracer`
                    : "l'échelle du plan n'est pas calée"}
              </p>
            </div>
          ))}
        </div>
      </section>

      {totaux.length > 0 && (
        <section>
          <h4>Métré — mètres de conducteur</h4>
          <table className="table-metre">
            <thead>
              <tr>
                <th>Section</th>
                <th>Longueur</th>
              </tr>
            </thead>
            <tbody>
              {totaux.map((t) => (
                <tr key={t.sectionMm2}>
                  <td>{t.sectionMm2} mm²</td>
                  <td>{t.longueurM.toFixed(1)} m</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}
