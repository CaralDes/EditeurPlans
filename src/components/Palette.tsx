import { CALQUES_ORDRE, CALQUE_LABELS, SYMBOL_DEFS } from '../symbols/definitions'
import type { TypeOrgane } from '../types'
import { useProjectStore } from '../store/useProjectStore'
import { SymbolePreview } from './SymbolePreview'

const TYPES_PAR_CALQUE = (() => {
  const map = new Map<string, TypeOrgane[]>()
  for (const [type, def] of Object.entries(SYMBOL_DEFS) as [TypeOrgane, (typeof SYMBOL_DEFS)[TypeOrgane]][]) {
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
                  <SymbolePreview type={type} color={actif ? '#9a5f26' : '#1d2b38'} />
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
