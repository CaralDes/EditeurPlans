import { CALQUES_ORDRE, CALQUE_LABELS, SYMBOL_DEFS } from '../symbols/definitions'
import type { TypeOrgane } from '../types'
import { useProjectStore } from '../store/useProjectStore'
import { SymbolePreview } from './SymbolePreview'

// Le tableau principal et le tableau divisionnaire ne se posent plus comme des organes
// génériques : ce sont de vraies entités Tableau (avec différentiels), posées depuis le
// panneau Circuits & câblage, pour pouvoir servir de point d'arrivée aux câbles.
const NON_POSABLES_DEPUIS_PALETTE = new Set<TypeOrgane>(['tableau-principal', 'tableau-divisionnaire'])

const TYPES_PAR_CALQUE = (() => {
  const map = new Map<string, TypeOrgane[]>()
  for (const [type, def] of Object.entries(SYMBOL_DEFS) as [TypeOrgane, (typeof SYMBOL_DEFS)[TypeOrgane]][]) {
    if (NON_POSABLES_DEPUIS_PALETTE.has(type)) continue
    const liste = map.get(def.calque) ?? []
    liste.push(type)
    map.set(def.calque, liste)
  }
  return map
})()

export function Palette() {
  const outil = useProjectStore((s) => s.outil)
  const setOutil = useProjectStore((s) => s.setOutil)
  const calquesVisibles = useProjectStore((s) => s.calquesVisibles)
  const toggleCalque = useProjectStore((s) => s.toggleCalque)

  return (
    <div className="palette">
      {CALQUES_ORDRE.map((calque) => (
        <section key={calque} className="palette-groupe">
          <header className="palette-entete">
            <span>{CALQUE_LABELS[calque]}</span>
            <label className="palette-oeil" title="Afficher / masquer ce calque sur le plan">
              <input type="checkbox" checked={calquesVisibles[calque]} onChange={() => toggleCalque(calque)} />
            </label>
          </header>
          <div className="palette-grille">
            {(TYPES_PAR_CALQUE.get(calque) ?? []).map((type) => {
              const actif = outil.kind === 'poser' && outil.type === type
              return (
                <button
                  key={type}
                  className={`palette-item${actif ? ' actif' : ''}`}
                  onClick={() => setOutil(actif ? { kind: 'select' } : { kind: 'poser', type })}
                  title={SYMBOL_DEFS[type].label}
                >
                  <span className="icone-chip">
                    <SymbolePreview type={type} color={actif ? '#ffffff' : '#16222c'} />
                  </span>
                  <span>{SYMBOL_DEFS[type].label}</span>
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
