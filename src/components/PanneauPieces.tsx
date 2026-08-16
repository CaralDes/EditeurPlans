import { useProjectStore } from '../store/useProjectStore'
import { verifierPiece } from '../regles/moteur'
import type { TypePiece } from '../types'

const LIBELLES_TYPE: Record<TypePiece, string> = {
  sejour: 'Séjour',
  cuisine: 'Cuisine',
  chambre: 'Chambre',
  'salle-de-bain': 'Salle de bains',
  wc: 'WC',
  circulation: 'Circulation',
  cellier: 'Cellier',
  garage: 'Garage',
  exterieur: 'Extérieur',
  autre: 'Autre',
}

const ORDRE_TYPE: TypePiece[] = [
  'sejour',
  'cuisine',
  'chambre',
  'salle-de-bain',
  'circulation',
  'cellier',
  'garage',
  'wc',
  'exterieur',
  'autre',
]

export function PanneauPieces() {
  const projet = useProjectStore((s) => s.projet)
  const outil = useProjectStore((s) => s.outil)
  const setOutil = useProjectStore((s) => s.setOutil)
  const pieceSelectionnee = useProjectStore((s) => s.pieceSelectionnee)
  const setPieceSelectionnee = useProjectStore((s) => s.setPieceSelectionnee)
  const renommerPiece = useProjectStore((s) => s.renommerPiece)
  const changerTypePiece = useProjectStore((s) => s.changerTypePiece)
  const supprimerPiece = useProjectStore((s) => s.supprimerPiece)

  const organesHorsPiece = projet.organes.filter((o) => o.pieceId === null).length

  return (
    <div className="panneau-circuits">
      <section>
        <h4>Zonage</h4>
        <p className="panneau-note" style={{ marginBottom: 10 }}>
          Trace le contour de chaque pièce : la surface se calcule depuis l'échelle du plan, et les organes déjà
          posés à l'intérieur s'y rattachent automatiquement — y compris s'ils sont déplacés ensuite.
        </p>
        <button
          className={`btn btn-accent${outil.kind === 'piece' ? ' actif' : ''}`}
          onClick={() => setOutil(outil.kind === 'piece' ? { kind: 'select' } : { kind: 'piece' })}
        >
          {outil.kind === 'piece' ? 'Tracé en cours…' : '+ Nouvelle pièce'}
        </button>
        {!projet.plan.echelle && (
          <p className="panneau-alerte" style={{ marginTop: 8 }}>
            Échelle non calée : les surfaces resteront à 0 m² tant que le plan n'est pas calibré.
          </p>
        )}
        {organesHorsPiece > 0 && (
          <p className="panneau-note" style={{ marginTop: 8 }}>
            {organesHorsPiece} organe(s) hors de toute pièce tracée.
          </p>
        )}
      </section>

      <section>
        <h4>Pièces ({projet.pieces.length})</h4>
        {projet.pieces.length === 0 && <p className="panneau-note">Aucune pièce tracée pour l'instant.</p>}
        <div className="liste-circuits">
          {projet.pieces.map((piece) => {
            const conformite = verifierPiece(piece, projet.organes)
            const active = pieceSelectionnee === piece.id
            return (
              <div
                key={piece.id}
                className={`carte-circuit carte-piece${active ? ' carte-active' : ''}`}
                onClick={() => setPieceSelectionnee(active ? null : piece.id)}
              >
                <div className="carte-circuit-entete">
                  <input
                    className="champ-nom-piece"
                    value={piece.nom}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => renommerPiece(piece.id, e.target.value)}
                  />
                  <button
                    className="btn-lien"
                    onClick={(e) => {
                      e.stopPropagation()
                      supprimerPiece(piece.id)
                    }}
                  >
                    Supprimer
                  </button>
                </div>
                <div className="carte-circuit-specs">
                  <select
                    value={piece.type}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => changerTypePiece(piece.id, e.target.value as TypePiece)}
                  >
                    {ORDRE_TYPE.map((t) => (
                      <option key={t} value={t}>
                        {LIBELLES_TYPE[t]}
                      </option>
                    ))}
                  </select>
                  <span className="tag-spec">{piece.surfaceM2 > 0 ? `${piece.surfaceM2.toFixed(1)} m²` : '— m²'}</span>
                </div>

                <ul className="liste-organes-circuit">
                  <li>
                    <span>Prises</span>
                    <span className={conformite.prisesPosees >= conformite.prisesRequises ? 'badge-ok' : 'badge-manque'}>
                      {conformite.prisesPosees} / {conformite.prisesRequises}
                    </span>
                  </li>
                  <li>
                    <span>Éclairage</span>
                    <span
                      className={conformite.eclairagePose >= conformite.eclairageRequis ? 'badge-ok' : 'badge-manque'}
                    >
                      {conformite.eclairagePose} / {conformite.eclairageRequis}
                    </span>
                  </li>
                </ul>
                {conformite.regle && (
                  <p className="panneau-note">
                    {conformite.regle.prisesRegle} — <em>{conformite.regle.source}</em>
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
