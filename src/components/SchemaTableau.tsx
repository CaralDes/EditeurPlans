import { calculerLayoutSchema, type SchemaTableauData } from '../lib/schemaTableau'

const MARGE = 12

export function SchemaTableau({ schema }: { schema: SchemaTableauData }) {
  const layout = calculerLayoutSchema(schema)
  const largeurVue = layout.largeur + MARGE * 2
  const hauteurVue = layout.hauteur + MARGE * 2

  return (
    <div className="schema-tableau-scroll">
      <svg width={largeurVue} height={hauteurVue} className="schema-tableau-svg">
        <g transform={`translate(${MARGE},${MARGE})`}>
          {layout.lignes.map((l, i) => (
            <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} className="schema-trait" />
          ))}

          <g>
            <rect
              x={layout.tableau.x}
              y={layout.tableau.y}
              width={layout.tableau.largeur}
              height={layout.tableau.hauteur}
              rx={4}
              className="schema-boite schema-boite-tableau"
            />
            <text
              x={layout.tableau.x + layout.tableau.largeur / 2}
              y={layout.tableau.y + layout.tableau.hauteur / 2}
              className="schema-texte schema-texte-tableau"
            >
              {layout.tableau.libelle}
            </text>
          </g>

          {layout.entetes.map((e) => (
            <g key={e.libelle + e.x}>
              <rect
                x={e.x}
                y={e.y}
                width={e.largeur}
                height={e.hauteur}
                rx={4}
                className={`schema-boite${e.alerte ? ' schema-boite-alerte' : ' schema-boite-differentiel'}`}
              >
                {e.alertes.length > 0 && <title>{e.alertes.join(' · ')}</title>}
              </rect>
              <text x={e.x + e.largeur / 2} y={e.y + e.hauteur / 2} className="schema-texte">
                {e.libelle}
                {e.alerte ? ' ⚠' : ''}
              </text>
            </g>
          ))}

          {layout.circuits.map((c) => (
            <g key={c.circuit.id}>
              <rect
                x={c.x}
                y={c.y}
                width={c.largeur}
                height={c.hauteur}
                rx={4}
                className={`schema-boite${c.circuit.conforme ? '' : ' schema-boite-alerte'}`}
              >
                {!c.circuit.conforme && <title>{c.circuit.alertes.join(' · ')}</title>}
              </rect>
              <text x={c.x + c.largeur / 2} y={c.y + 16} className="schema-texte schema-texte-calibre">
                {c.circuit.calibreA} A · {c.circuit.sectionMm2} mm²
              </text>
              <text x={c.x + c.largeur / 2} y={c.y + 33} className="schema-texte schema-texte-libelle">
                {tronquer(c.circuit.libelle, 16)}
              </text>
              <text x={c.x + c.largeur / 2} y={c.y + 49} className="schema-texte schema-texte-note">
                {c.circuit.nbOrganes} pt{c.circuit.nbOrganes > 1 ? 's' : ''}
                {!c.circuit.conforme ? ' ⚠' : ''}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  )
}

function tronquer(texte: string, max: number): string {
  return texte.length > max ? `${texte.slice(0, max - 1)}…` : texte
}
