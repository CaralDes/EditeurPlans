import type Konva from 'konva'

// Petit registre du Stage Konva courant. L'export du dossier a besoin d'une image du plan,
// mais il est déclenché depuis la barre d'outils, loin du canevas : plutôt que de faire
// remonter une ref à travers l'arbre React, PlanCanvas s'enregistre ici au montage.

let stageCourant: Konva.Stage | null = null

export function enregistrerStage(stage: Konva.Stage | null): void {
  stageCourant = stage
}

// Neutralise le zoom et le déplacement en cours le temps d'une capture, pour que l'image
// montre le plan entier (pas seulement ce que l'utilisateur regardait au moment du clic),
// puis les restaure — y compris si `fn` lève. Renvoie null s'il n'y a pas de canevas.
function avecPlanEntier<T>(largeurMaxPx: number, fn: (stage: Konva.Stage) => T): T | null {
  const stage = stageCourant
  if (!stage) return null

  const fond = stage.findOne('.fond-plan')
  const scaleAvant = { x: stage.scaleX(), y: stage.scaleY() }
  const positionAvant = { x: stage.x(), y: stage.y() }
  const tailleAvant = { width: stage.width(), height: stage.height() }

  try {
    if (fond) {
      const largeur = fond.width()
      const hauteur = fond.height()
      if (largeur > 0 && hauteur > 0) {
        const ratio = Math.min(1, largeurMaxPx / largeur)
        stage.scale({ x: ratio, y: ratio })
        stage.position({ x: 0, y: 0 })
        stage.size({ width: Math.round(largeur * ratio), height: Math.round(hauteur * ratio) })
        stage.draw()
      }
    }
    return fn(stage)
  } finally {
    stage.scale(scaleAvant)
    stage.position(positionAvant)
    stage.size(tailleAvant)
    stage.draw()
  }
}

/**
 * Image PNG (data URI) du plan entier. Renvoie null s'il n'y a pas de canevas, ou si le
 * navigateur refuse d'exporter le canvas (image de fond d'une autre origine, par exemple) —
 * on préfère alors un dossier sans plan à un export qui échoue.
 */
export function capturerPlan(largeurMaxPx = 1600): string | null {
  return avecPlanEntier(largeurMaxPx, (stage) => {
    try {
      return stage.toDataURL({ pixelRatio: 1 })
    } catch {
      return null
    }
  })
}

/**
 * Image PNG (data URI) du plan entier, mais où seuls les câbles du circuit `circuitId`
 * restent visibles — les symboles, pièces et murs restent affichés pour le repère, les
 * câbles des autres circuits sont masqués le temps de la capture puis restaurés. Les
 * cheminements doivent porter `name="cheminement"` et `id={leur id}` dans PlanCanvas pour
 * être retrouvés ici ; voir le rendu des câbles dans PlanCanvas.tsx.
 */
export function capturerCircuit(
  circuitId: string,
  cheminements: { id: string; circuitId: string }[],
  largeurMaxPx = 1600,
): string | null {
  return avecPlanEntier(largeurMaxPx, (stage) => {
    const idsDuCircuit = new Set(cheminements.filter((c) => c.circuitId === circuitId).map((c) => c.id))
    const noeuds = stage.find('.cheminement')
    const visibiliteAvant = noeuds.map((n) => n.visible())
    try {
      noeuds.forEach((n) => n.visible(idsDuCircuit.has(n.id())))
      stage.draw()
      return stage.toDataURL({ pixelRatio: 1 })
    } catch {
      return null
    } finally {
      noeuds.forEach((n, i) => n.visible(visibiliteAvant[i]!))
      stage.draw()
    }
  })
}
