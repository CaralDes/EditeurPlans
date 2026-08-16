import { useProjectStore } from '../store/useProjectStore'
import { suggererCircuit } from '../lib/circuits'
import { circuitDef, circuitsEclairageMin } from '../regles/moteur'
import { resumeCircuits, totauxParSection } from '../lib/metre'
import { construireSchemaTableau } from '../lib/schemaTableau'
import { SchemaTableau } from './SchemaTableau'

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

  // Les pièces « extérieur » ne comptent pas dans la surface habitable qui déclenche
  // l'exigence de deux circuits d'éclairage indépendants.
  const surfaceHabitable = projet.pieces
    .filter((p) => p.type !== 'exterieur')
    .reduce((somme, p) => somme + p.surfaceM2, 0)
  const regleEclairage = circuitsEclairageMin(surfaceHabitable)
  const circuitsEclairagePoses = projet.circuits.filter((c) => c.famille === 'eclairage').length
  const eclairageInsuffisant = surfaceHabitable > 0 && circuitsEclairagePoses < regleEclairage.nombre

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

      {tableau && (
        <section>
          <h4>Schéma du tableau</h4>
          <p className="panneau-note" style={{ marginBottom: 10 }}>
            Un disjoncteur par circuit, sous son différentiel. Une boîte en rouge signale un
            écart avec la règle NF C 15-100 : calibre ou section modifiés à la main, mauvais
            type de différentiel, ou trop de points sur le circuit — survole-la pour le détail.
          </p>
          <SchemaTableau schema={construireSchemaTableau(tableau, projet.circuits, projet.organes)} />
          {eclairageInsuffisant && (
            <p className="panneau-alerte">
              {circuitsEclairagePoses} circuit(s) d'éclairage pour {surfaceHabitable.toFixed(0)} m² habitables,{' '}
              {regleEclairage.nombre} attendu(s) — {regleEclairage.regle}.
            </p>
          )}
        </section>
      )}

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
        {lignes.some((l) => l.organesNonCables.length > 0) && (
          <p className="panneau-note" style={{ marginBottom: 10 }}>
            Pour qu'un seul câble desserve plusieurs organes non câblés (plusieurs spots en
            guirlande, par exemple) : sélectionne-les sur le plan (clic + Maj), le bouton de
            câblage groupé apparaît sous le circuit concerné.
          </p>
        )}
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

              {ligne.cheminements.length > 0 && (
                <ul className="liste-cables-circuit">
                  {ligne.cheminements.map((chem) => {
                    const reperes = chem.organes
                      .map((oid) => projet.organes.find((o) => o.id === oid)?.repere)
                      .filter((r): r is string => Boolean(r))
                      .join(', ')
                    const enTrainDeRetracer = outil.kind === 'cable' && outil.cheminementId === chem.id
                    return (
                      <li key={chem.id}>
                        <span>
                          Câble{chem.organes.length > 1 ? ` (×${chem.organes.length})` : ''} → {reperes || '—'}
                        </span>
                        <button
                          className={`btn-lien${enTrainDeRetracer ? ' actif' : ''}`}
                          disabled={!tableau}
                          title={tableau ? undefined : "Pose d'abord le tableau"}
                          onClick={() =>
                            setOutil({
                              kind: 'cable',
                              circuitId: ligne.circuit.id,
                              organeIds: chem.organes,
                              mode: chem.mode,
                              cheminementId: chem.id,
                            })
                          }
                        >
                          Retracer
                        </button>
                        <button className="btn-lien" onClick={() => supprimerCheminement(chem.id)}>
                          ✕
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}

              <ul className="liste-organes-circuit">
                {ligne.circuit.organes.map((oid) => {
                  const organe = projet.organes.find((o) => o.id === oid)
                  if (!organe) return null
                  const cable = ligne.cheminements.find((c) => c.organes.includes(oid))
                  const enTrainDeTracer =
                    outil.kind === 'cable' && !outil.cheminementId && outil.organeIds.length === 1 && outil.organeIds[0] === oid
                  return (
                    <li key={oid}>
                      <span>{organe.repere}</span>
                      {cable ? (
                        <span className="badge-ok">câblé</span>
                      ) : (
                        <>
                          <span className="badge-manque">non câblé</span>
                          <button
                            className={`btn-lien${enTrainDeTracer ? ' actif' : ''}`}
                            disabled={!tableau}
                            title={tableau ? undefined : "Pose d'abord le tableau"}
                            onClick={() => setOutil({ kind: 'cable', circuitId: ligne.circuit.id, organeIds: [oid], mode: 'plafond' })}
                          >
                            Tracer seul
                          </button>
                        </>
                      )}
                      <button className="btn-lien" onClick={() => retirerOrganeDuCircuit(oid)}>
                        retirer
                      </button>
                    </li>
                  )
                })}
              </ul>

              {(() => {
                const selectionGroupable = selection.filter((id) => ligne.organesNonCables.includes(id))
                if (selectionGroupable.length < 2 || !tableau) return null
                return (
                  <div className="cablage-groupe">
                    <p className="panneau-note">
                      {selectionGroupable.length} organe(s) non câblé(s) sélectionné(s) sur le plan.
                    </p>
                    <button
                      className="btn btn-accent"
                      onClick={() =>
                        setOutil({ kind: 'cable', circuitId: ligne.circuit.id, organeIds: selectionGroupable, mode: 'plafond' })
                      }
                    >
                      Tracer un seul câble pour ces {selectionGroupable.length} organes
                    </button>
                  </div>
                )
              })()}

              <p className="panneau-note">
                {ligne.longueurTotaleM !== null
                  ? `Longueur totale estimée : ${ligne.longueurTotaleM.toFixed(1)} m`
                  : ligne.cablesManquants > 0
                    ? `${ligne.cablesManquants} organe(s) restant(s) à câbler`
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
