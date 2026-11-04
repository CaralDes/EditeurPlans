import { describe, expect, it } from 'vitest'
import { capturerCircuit, capturerPlan, enregistrerStage } from '../lib/apercuPlan'

// Fausse « scène » Konva minimale : juste assez pour exercer la logique de capturerPlan /
// capturerCircuit (redimensionnement temporaire, restauration, filtrage des cheminements)
// sans dépendre du vrai Konva — ce module n'importe que des types Konva (effacés à la
// compilation), donc rien n'empêche de le tester avec un objet simulé sous Vitest.
function creerFausseScene(opts: {
  largeurFond?: number
  hauteurFond?: number
  cheminements?: { id: string }[]
  echoueSurToDataURL?: boolean
}) {
  const etat = { scaleX: 1, scaleY: 1, x: 10, y: 20, width: 800, height: 600 }
  let nbDraw = 0
  const visibiliteParId = new Map((opts.cheminements ?? []).map((c) => [c.id, true]))
  let visibiliteAuMomentDuRendu: Record<string, boolean> | undefined

  const fond =
    opts.largeurFond !== undefined ? { width: () => opts.largeurFond!, height: () => opts.hauteurFond! } : null

  const noeudsCheminements = (opts.cheminements ?? []).map((c) => ({
    id: () => c.id,
    visible: (v?: boolean) => {
      if (v === undefined) return visibiliteParId.get(c.id)!
      visibiliteParId.set(c.id, v)
      return undefined
    },
  }))

  const stage = {
    findOne: (sel: string) => (sel === '.fond-plan' ? fond : null),
    find: (sel: string) => (sel === '.cheminement' ? noeudsCheminements : []),
    scaleX: () => etat.scaleX,
    scaleY: () => etat.scaleY,
    x: () => etat.x,
    y: () => etat.y,
    width: () => etat.width,
    height: () => etat.height,
    scale: (v: { x: number; y: number }) => {
      etat.scaleX = v.x
      etat.scaleY = v.y
    },
    position: (v: { x: number; y: number }) => {
      etat.x = v.x
      etat.y = v.y
    },
    size: (v: { width: number; height: number }) => {
      etat.width = v.width
      etat.height = v.height
    },
    draw: () => {
      nbDraw++
    },
    toDataURL: () => {
      // C'est ici, et non à chaque draw(), que la vraie capture se ferait (les pixels déjà
      // dessinés) — on « photographie » donc la visibilité au moment précis de cet appel,
      // y compris le dessin de restauration que finally déclenche après coup.
      visibiliteAuMomentDuRendu = Object.fromEntries(visibiliteParId)
      if (opts.echoueSurToDataURL) throw new Error('canvas tainted')
      return `data:image/png;base64,FAKE(${etat.scaleX.toFixed(2)},${etat.width})`
    },
  }

  return {
    stage: stage as unknown as Parameters<typeof enregistrerStage>[0],
    etat,
    nbDraw: () => nbDraw,
    visibiliteFinale: () => Object.fromEntries(visibiliteParId),
    visibiliteJusteAvantCapture: () => visibiliteAuMomentDuRendu,
  }
}

describe('capturerPlan', () => {
  it('renvoie null sans scène enregistrée', () => {
    enregistrerStage(null)
    expect(capturerPlan()).toBeNull()
  })

  it('redimensionne pour tenir dans largeurMaxPx, puis restaure la scène telle quelle', () => {
    const { stage, etat } = creerFausseScene({ largeurFond: 3200, hauteurFond: 1600 })
    enregistrerStage(stage)

    const image = capturerPlan(1600)
    expect(image).toBe('data:image/png;base64,FAKE(0.50,1600)') // ratio 1600/3200 = 0.5

    // La scène retrouve exactement son état d'avant capture.
    expect(etat).toEqual({ scaleX: 1, scaleY: 1, x: 10, y: 20, width: 800, height: 600 })
    enregistrerStage(null)
  })

  it('ne réduit jamais au-delà de 1:1 quand le plan est plus petit que largeurMaxPx', () => {
    const { stage } = creerFausseScene({ largeurFond: 400, hauteurFond: 300 })
    enregistrerStage(stage)
    expect(capturerPlan(1600)).toBe('data:image/png;base64,FAKE(1.00,400)')
    enregistrerStage(null)
  })

  it('renvoie null plutôt que de lever si toDataURL échoue (canvas « taint »), et restaure quand même', () => {
    const { stage, etat } = creerFausseScene({ largeurFond: 1000, hauteurFond: 800, echoueSurToDataURL: true })
    enregistrerStage(stage)
    expect(capturerPlan(1600)).toBeNull()
    expect(etat.scaleX).toBe(1) // restauré malgré l'échec
    enregistrerStage(null)
  })
})

describe('capturerCircuit', () => {
  it('ne laisse visible que les câbles du circuit demandé au moment de la capture', () => {
    const { stage, visibiliteJusteAvantCapture, visibiliteFinale } = creerFausseScene({
      largeurFond: 1000,
      hauteurFond: 800,
      cheminements: [{ id: 'cable-1' }, { id: 'cable-2' }, { id: 'cable-3' }],
    })
    enregistrerStage(stage)

    const cheminements = [
      { id: 'cable-1', circuitId: 'circuit-A' },
      { id: 'cable-2', circuitId: 'circuit-B' },
      { id: 'cable-3', circuitId: 'circuit-A' },
    ]
    const image = capturerCircuit('circuit-A', cheminements)

    expect(image).not.toBeNull()
    expect(visibiliteJusteAvantCapture()).toEqual({ 'cable-1': true, 'cable-2': false, 'cable-3': true })
    // Une fois la capture terminée, tout redevient visible comme avant l'appel.
    expect(visibiliteFinale()).toEqual({ 'cable-1': true, 'cable-2': true, 'cable-3': true })
    enregistrerStage(null)
  })

  it('masque tous les câbles quand le circuit n’en a aucun, sans échouer', () => {
    const { stage, visibiliteJusteAvantCapture } = creerFausseScene({
      largeurFond: 1000,
      hauteurFond: 800,
      cheminements: [{ id: 'cable-1' }],
    })
    enregistrerStage(stage)
    const image = capturerCircuit('circuit-vide', [{ id: 'cable-1', circuitId: 'circuit-A' }])
    expect(image).not.toBeNull()
    expect(visibiliteJusteAvantCapture()).toEqual({ 'cable-1': false })
    enregistrerStage(null)
  })

  it('restaure la visibilité même si toDataURL échoue', () => {
    const { stage, visibiliteFinale } = creerFausseScene({
      largeurFond: 1000,
      hauteurFond: 800,
      cheminements: [{ id: 'cable-1' }, { id: 'cable-2' }],
      echoueSurToDataURL: true,
    })
    enregistrerStage(stage)
    const image = capturerCircuit('circuit-A', [
      { id: 'cable-1', circuitId: 'circuit-A' },
      { id: 'cable-2', circuitId: 'circuit-B' },
    ])
    expect(image).toBeNull()
    expect(visibiliteFinale()).toEqual({ 'cable-1': true, 'cable-2': true })
    enregistrerStage(null)
  })

  it('renvoie null sans scène enregistrée', () => {
    enregistrerStage(null)
    expect(capturerCircuit('circuit-A', [])).toBeNull()
  })
})
