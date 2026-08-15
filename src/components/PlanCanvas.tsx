import { useRef, useState } from 'react'
import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { Circle, Image as KonvaImage, Layer, Line, Stage } from 'react-konva'
import { useProjectStore } from '../store/useProjectStore'
import { useHtmlImage } from '../lib/useHtmlImage'
import { Symbole } from './Symbole'
import { SYMBOL_DEFS } from '../symbols/definitions'
import type { ModeCheminement, Point, TypeOrgane } from '../types'

const ZOOM_MIN = 0.15
const ZOOM_MAX = 8
const ZOOM_PAS = 1.06

const LIBELLES_MODE: Record<ModeCheminement, string> = {
  plafond: 'Plafond',
  sol: 'Sol / dalle',
  plinthe: 'Plinthe',
  cloison: 'Cloison',
  enterre: 'Enterré',
}

function pointeurSurPlan(stage: Konva.Stage): Point | null {
  const p = stage.getPointerPosition()
  if (!p) return null
  const t = stage.getAbsoluteTransform().copy().invert()
  return t.point(p)
}

function aplatir(points: Point[]): number[] {
  return points.flatMap((p) => [p.x, p.y])
}

export function PlanCanvas() {
  const conteneurRef = useRef<HTMLDivElement | null>(null)
  const [taille, setTaille] = useState({ w: 800, h: 600 })
  const [vue, setVue] = useState({ scale: 1, x: 0, y: 0 })

  const projet = useProjectStore((s) => s.projet)
  const outil = useProjectStore((s) => s.outil)
  const setOutil = useProjectStore((s) => s.setOutil)
  const selection = useProjectStore((s) => s.selection)
  const setSelection = useProjectStore((s) => s.setSelection)
  const toggleSelection = useProjectStore((s) => s.toggleSelection)
  const calquesVisibles = useProjectStore((s) => s.calquesVisibles)
  const ajouterOrgane = useProjectStore((s) => s.ajouterOrgane)
  const deplacerOrgane = useProjectStore((s) => s.deplacerOrgane)
  const clicCalibration = useProjectStore((s) => s.clicCalibration)
  const pointCalibration = useProjectStore((s) => s.pointCalibration)
  const poserTableau = useProjectStore((s) => s.poserTableau)
  const deplacerTableau = useProjectStore((s) => s.deplacerTableau)
  const clicCable = useProjectStore((s) => s.clicCable)
  const pointsCableEnCours = useProjectStore((s) => s.pointsCableEnCours)
  const setModeCableEnCours = useProjectStore((s) => s.setModeCableEnCours)
  const finaliserCable = useProjectStore((s) => s.finaliserCable)
  const annulerCable = useProjectStore((s) => s.annulerCable)

  const image = useHtmlImage(projet.plan.image)

  // Mesure le conteneur pour que le Stage occupe tout l'espace disponible.
  const roRef = useRef<ResizeObserver | null>(null)
  const attachRef = (el: HTMLDivElement | null) => {
    conteneurRef.current = el
    roRef.current?.disconnect()
    if (!el) return
    roRef.current = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect
      if (box) setTaille({ w: box.width, h: box.height })
    })
    roRef.current.observe(el)
  }

  function surMolette(e: KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault()
    const stage = e.target.getStage()
    if (!stage) return
    const pointeur = stage.getPointerPosition()
    if (!pointeur) return
    const ancien = vue.scale
    const pointPlan = { x: (pointeur.x - vue.x) / ancien, y: (pointeur.y - vue.y) / ancien }
    const nouveau = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, e.evt.deltaY < 0 ? ancien * ZOOM_PAS : ancien / ZOOM_PAS))
    setVue({
      scale: nouveau,
      x: pointeur.x - pointPlan.x * nouveau,
      y: pointeur.y - pointPlan.y * nouveau,
    })
  }

  function surClicStage(e: KonvaEventObject<MouseEvent | TouchEvent>) {
    const stage = e.target.getStage()
    if (!stage) return
    const clicSurFond = e.target === stage || e.target.name() === 'fond-plan'

    if (outil.kind === 'calibrer') {
      const p = pointeurSurPlan(stage)
      if (p) clicCalibration(p)
      return
    }

    if (outil.kind === 'poser') {
      const p = pointeurSurPlan(stage)
      if (p) ajouterOrgane(outil.type, p.x, p.y)
      return
    }

    if (outil.kind === 'tableau') {
      const p = pointeurSurPlan(stage)
      if (p) poserTableau(outil.type, p.x, p.y)
      return
    }

    if (outil.kind === 'cable') {
      const p = pointeurSurPlan(stage)
      if (p) clicCable(p)
      return
    }

    // outil select : clic dans le vide => désélection (le clic sur un symbole gère sa propre sélection)
    if (clicSurFond) setSelection([])
  }

  function surClicSymbole(id: string, e: KonvaEventObject<MouseEvent | TouchEvent>) {
    if (outil.kind !== 'select') return
    e.cancelBubble = true
    const evt = e.evt as MouseEvent
    if (evt.shiftKey) toggleSelection(id)
    else setSelection([id])
  }

  const echelle = projet.plan.echelle
  const scaleTexte = echelle ? `${echelle.pxParMetre.toFixed(1)} px/m — calé sur ${echelle.coteSur}` : 'échelle non calée'

  return (
    <div
      ref={attachRef}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: 'var(--sunk)' }}
    >
      <Stage
        width={taille.w}
        height={taille.h}
        scaleX={vue.scale}
        scaleY={vue.scale}
        x={vue.x}
        y={vue.y}
        draggable={outil.kind === 'select'}
        onDragEnd={(e) => {
          if (e.target.getStage() === e.target) setVue((v) => ({ ...v, x: e.target.x(), y: e.target.y() }))
        }}
        onWheel={surMolette}
        onMouseDown={surClicStage}
        onTouchStart={surClicStage}
        style={{
          cursor:
            outil.kind === 'poser' || outil.kind === 'calibrer' || outil.kind === 'tableau' || outil.kind === 'cable'
              ? 'crosshair'
              : 'default',
        }}
      >
        <Layer>
          {image && <KonvaImage image={image} name="fond-plan" listening={outil.kind === 'select'} />}

          {calquesVisibles.distribution &&
            projet.tableaux.map((t) => (
              <SymboleOrgane
                key={t.id}
                type={t.type === 'principal' ? 'tableau-principal' : 'tableau-divisionnaire'}
                x={t.x}
                y={t.y}
                rotation={0}
                selectionne={selection.includes(t.id)}
                draggable={outil.kind === 'select'}
                echelleVue={vue.scale}
                onClick={(e) => surClicSymbole(t.id, e)}
                onDeplacer={(x, y) => deplacerTableau(t.id, x, y)}
              />
            ))}

          {projet.cheminements.map((c) => (
            <Line
              key={c.id}
              points={aplatir(c.points)}
              stroke="#9a5f26"
              strokeWidth={2 / vue.scale}
              dash={c.mode === 'plafond' ? undefined : [6 / vue.scale, 4 / vue.scale]}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
          ))}

          {pointsCableEnCours && pointsCableEnCours.length > 0 && (
            <>
              <Line
                points={aplatir(pointsCableEnCours)}
                stroke="#c94f3a"
                strokeWidth={2 / vue.scale}
                dash={[5 / vue.scale, 3 / vue.scale]}
                lineCap="round"
                lineJoin="round"
                listening={false}
              />
              {pointsCableEnCours.map((p, i) => (
                <Circle key={i} x={p.x} y={p.y} radius={4 / vue.scale} fill="#c94f3a" listening={false} />
              ))}
            </>
          )}

          {pointCalibration && (
            <Circle x={pointCalibration.x} y={pointCalibration.y} radius={5 / vue.scale} fill="#c94f3a" />
          )}

          {projet.organes
            .filter((o) => calquesVisibles[SYMBOL_DEFS[o.type].calque])
            .map((o) => (
              <SymboleOrgane
                key={o.id}
                type={o.type}
                x={o.x}
                y={o.y}
                rotation={o.rotation}
                selectionne={selection.includes(o.id)}
                draggable={outil.kind === 'select'}
                echelleVue={vue.scale}
                onClick={(e) => surClicSymbole(o.id, e)}
                onDeplacer={(x, y) => deplacerOrgane(o.id, x, y)}
              />
            ))}
        </Layer>
      </Stage>

      <div className="hud-bas-gauche">{scaleTexte}</div>

      {outil.kind === 'calibrer' && (
        <div className="hud-instruction">
          {pointCalibration ? 'Clique le second point de la cote connue.' : 'Clique le premier point de la cote connue sur le plan.'}
          <button className="btn-lien" onClick={() => setOutil({ kind: 'select' })}>
            Annuler
          </button>
        </div>
      )}

      {outil.kind === 'poser' && (
        <div className="hud-instruction">
          Clique sur le plan pour poser « {SYMBOL_DEFS[outil.type].label} ». Échap pour arrêter.
          <button className="btn-lien" onClick={() => setOutil({ kind: 'select' })}>
            Terminer
          </button>
        </div>
      )}

      {outil.kind === 'tableau' && (
        <div className="hud-instruction">
          Clique sur le plan pour poser le tableau {outil.type === 'divisionnaire' ? 'divisionnaire' : 'principal'}.
          <button className="btn-lien" onClick={() => setOutil({ kind: 'select' })}>
            Annuler
          </button>
        </div>
      )}

      {outil.kind === 'cable' && (
        <div className="hud-instruction">
          <span>Clique les points du cheminement, puis « Terminer » (ou Entrée).</span>
          <select
            value={outil.mode}
            onChange={(e) => setModeCableEnCours(e.target.value as ModeCheminement)}
            className="hud-select"
          >
            {(Object.keys(LIBELLES_MODE) as ModeCheminement[]).map((m) => (
              <option key={m} value={m}>
                {LIBELLES_MODE[m]}
              </option>
            ))}
          </select>
          <button className="btn-lien" onClick={() => finaliserCable()}>
            Terminer
          </button>
          <button className="btn-lien" onClick={() => annulerCable()}>
            Annuler
          </button>
        </div>
      )}
    </div>
  )
}

function SymboleOrgane({
  type,
  x,
  y,
  rotation,
  selectionne,
  draggable,
  echelleVue,
  onClick,
  onDeplacer,
}: {
  type: TypeOrgane
  x: number
  y: number
  rotation: number
  selectionne: boolean
  draggable: boolean
  echelleVue: number
  onClick: (e: KonvaEventObject<MouseEvent | TouchEvent>) => void
  onDeplacer: (x: number, y: number) => void
}) {
  return (
    <>
      {selectionne && (
        <Circle
          x={x}
          y={y}
          radius={20}
          stroke="#9a5f26"
          strokeWidth={1.5 / echelleVue}
          dash={[4 / echelleVue, 3 / echelleVue]}
          listening={false}
        />
      )}
      <Symbole
        type={type}
        x={x}
        y={y}
        rotation={rotation}
        color={selectionne ? '#9a5f26' : '#1d2b38'}
        draggable={draggable}
        onClick={onClick}
        onDragEnd={onDeplacer}
      />
    </>
  )
}
