import type Konva from 'konva'

// Petit registre du Stage Konva courant. L'export du dossier a besoin d'une image du plan,
// mais il est déclenché depuis la barre d'outils, loin du canevas : plutôt que de faire
// remonter une ref à travers l'arbre React, PlanCanvas s'enregistre ici au montage.

let stageCourant: Konva.Stage | null = null

export function enregistrerStage(stage: Konva.Stage | null): void {
  stageCourant = stage
}

/**
 * Image PNG (data URI) du plan entier, pas seulement de la portion à l'écran : le zoom et
 * le déplacement en cours sont neutralisés le temps de la capture, puis restaurés — sinon
 * le dossier imprimé ne montrerait que ce que l'utilisateur regardait au moment du clic.
 * Renvoie null s'il n'y a pas de canevas, ou si le navigateur refuse d'exporter le canvas.
 */
export function capturerPlan(largeurMaxPx = 1600): string | null {
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
    return stage.toDataURL({ pixelRatio: 1 })
  } catch {
    // Canvas « taint » (image de fond d'une autre origine) : on préfère un dossier sans
    // plan à un export qui échoue.
    return null
  } finally {
    stage.scale(scaleAvant)
    stage.position(positionAvant)
    stage.size(tailleAvant)
    stage.draw()
  }
}
