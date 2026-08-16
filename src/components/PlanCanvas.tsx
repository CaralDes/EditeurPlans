import { useMemo, useRef, useState } from 'react'
import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { Circle, Group, Image as KonvaImage, Layer, Line, Stage, Text } from 'react-konva'
import { useProjectStore } from '../store/useProjectStore'
import { useHtmlImage } from '../lib/useHtmlImage'
import { Symbole } from './Symbole'
import { SYMBOL_DEFS } from '../symbols/definitions'
import {
  COULEUR_CABLE_EN_COURS,
  COULEUR_ELECTRICITE,
  COULEUR_MUR,
  COULEUR_PIECE,
  COULEUR_SELECTION,
} from '../lib/couleurs'
import { cibleLaPlusProche, type Cible } from '../lib/cibles'
import { pointEtiquette } from '../lib/pieces'
import { nappesLumineuses } from '../lib/lumiere'
import { metresVersPx } from '../lib/echelle'
import { CalqueEclairage } from './CalqueEclairage'
import type { Echelle, ModeCheminement, Mur, Piece, Point, TypeOrgane } from '../types'

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
  const [survole, setSurvole] = useState<string | null>(null)

  // Déplacement en cours. Conservé dans une ref et appliqué directement au nœud Konva :
  // passer par l'état React à chaque mouvement de souris re-rendrait tout le calque, et
  // écrire dans le store créerait une entrée d'historique par pixel parcouru.
  const glisseRef = useRef<{ id: string; estTableau: boolean; decalage: Point; aBouge: boolean } | null>(null)

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
  const modeEclairage = useProjectStore((s) => s.modeEclairage)
  const intensiteNuit = useProjectStore((s) => s.intensiteNuit)
  const clicPiece = useProjectStore((s) => s.clicPiece)
  const pointsPieceEnCours = useProjectStore((s) => s.pointsPieceEnCours)
  const finaliserPiece = useProjectStore((s) => s.finaliserPiece)
  const annulerPiece = useProjectStore((s) => s.annulerPiece)
  const pieceSelectionnee = useProjectStore((s) => s.pieceSelectionnee)
  const clicMur = useProjectStore((s) => s.clicMur)
  const pointsMurEnCours = useProjectStore((s) => s.pointsMurEnCours)
  const finaliserMur = useProjectStore((s) => s.finaliserMur)
  const annulerMur = useProjectStore((s) => s.annulerMur)

  const image = useHtmlImage(projet.plan.image)

  const organesVisibles = useMemo(
    () => projet.organes.filter((o) => calquesVisibles[SYMBOL_DEFS[o.type].calque]),
    [projet.organes, calquesVisibles],
  )
  const tableauxVisibles = useMemo(
    () => (calquesVisibles.distribution ? projet.tableaux : []),
    [projet.tableaux, calquesVisibles.distribution],
  )

  // Tout ce qui peut être sélectionné ou déplacé sur le plan, réduit à sa position.
  const cibles = useMemo<Cible[]>(
    () => [
      ...organesVisibles.map((o) => ({ id: o.id, x: o.x, y: o.y })),
      ...tableauxVisibles.map((t) => ({ id: t.id, x: t.x, y: t.y })),
    ],
    [organesVisibles, tableauxVisibles],
  )

  const estTableau = (id: string) => tableauxVisibles.some((t) => t.id === id)

  const nappes = useMemo(
    () =>
      modeEclairage
        ? nappesLumineuses(organesVisibles, projet.murs, projet.plan.echelle, projet.plan.hauteurSousPlafond)
        : [],
    [modeEclairage, organesVisibles, projet.murs, projet.plan.echelle, projet.plan.hauteurSousPlafond],
  )

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

  function surAppui(e: KonvaEventObject<MouseEvent | TouchEvent>) {
    const stage = e.target.getStage()
    if (!stage) return
    const p = pointeurSurPlan(stage)
    if (!p) return

    if (outil.kind === 'calibrer') {
      clicCalibration(p)
      return
    }
    if (outil.kind === 'poser') {
      ajouterOrgane(outil.type, p.x, p.y)
      return
    }
    if (outil.kind === 'tableau') {
      poserTableau(outil.type, p.x, p.y)
      return
    }
    if (outil.kind === 'cable') {
      clicCable(p)
      return
    }
    if (outil.kind === 'piece') {
      clicPiece(p)
      return
    }
    if (outil.kind === 'mur') {
      clicMur(p)
      return
    }

    // Mode sélection : on retient l'organe le plus proche du curseur, pas celui que la
    // détection de collision de Konva aurait désigné (voir lib/cibles.ts).
    const cible = cibleLaPlusProche(p, cibles, vue.scale)
    if (!cible) {
      setSelection([])
      return
    }

    const evt = e.evt as MouseEvent
    if (evt.shiftKey) toggleSelection(cible.id)
    else setSelection([cible.id])

    // Le déplacement porte sur cette même cible : sélection et glissement ne peuvent
    // donc jamais désigner deux organes différents.
    glisseRef.current = {
      id: cible.id,
      estTableau: estTableau(cible.id),
      decalage: { x: p.x - cible.x, y: p.y - cible.y },
      aBouge: false,
    }
    // Empêche le plan de se déplacer sous l'organe qu'on est en train de saisir.
    stage.draggable(false)
  }

  function surDeplacementPointeur(e: KonvaEventObject<MouseEvent | TouchEvent>) {
    const stage = e.target.getStage()
    if (!stage) return
    const p = pointeurSurPlan(stage)
    if (!p) return

    const glisse = glisseRef.current
    if (glisse) {
      const noeud = stage.findOne('#' + glisse.id)
      if (noeud) {
        noeud.position({ x: p.x - glisse.decalage.x, y: p.y - glisse.decalage.y })
        glisse.aBouge = true
        noeud.getLayer()?.batchDraw()
      }
      return
    }

    if (outil.kind !== 'select') {
      if (survole !== null) setSurvole(null)
      return
    }

    // Surlignage de survol : montre quelle cible sera prise avant même de cliquer.
    const cible = cibleLaPlusProche(p, cibles, vue.scale)
    const id = cible?.id ?? null
    if (id !== survole) setSurvole(id)
  }

  function surRelachement(e: KonvaEventObject<MouseEvent | TouchEvent>) {
    const stage = e.target.getStage()
    const glisse = glisseRef.current
    glisseRef.current = null

    if (stage) stage.draggable(outil.kind === 'select')
    if (!glisse || !glisse.aBouge || !stage) return

    const noeud = stage.findOne('#' + glisse.id)
    if (!noeud) return
    // Une seule écriture dans le store en fin de geste : un seul pas d'annulation.
    if (glisse.estTableau) deplacerTableau(glisse.id, noeud.x(), noeud.y())
    else deplacerOrgane(glisse.id, noeud.x(), noeud.y())
  }

  const echelle = projet.plan.echelle
  const scaleTexte = echelle ? `${echelle.pxParMetre.toFixed(1)} px/m — calé sur ${echelle.coteSur}` : 'échelle non calée'
  const curseur =
    outil.kind === 'poser' ||
    outil.kind === 'calibrer' ||
    outil.kind === 'tableau' ||
    outil.kind === 'cable' ||
    outil.kind === 'piece' ||
    outil.kind === 'mur'
      ? 'crosshair'
      : survole
        ? 'move'
        : 'default'

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
        // Le plan ne se déplace que dans le vide : au survol d'un organe, le geste sert
        // à le déplacer lui, pas à faire glisser le plan sous lui.
        draggable={outil.kind === 'select' && survole === null}
        onDragEnd={(e) => {
          if (e.target.getStage() === e.target) setVue((v) => ({ ...v, x: e.target.x(), y: e.target.y() }))
        }}
        onWheel={surMolette}
        onMouseDown={surAppui}
        onTouchStart={surAppui}
        onMouseMove={surDeplacementPointeur}
        onTouchMove={surDeplacementPointeur}
        onMouseUp={surRelachement}
        onTouchEnd={surRelachement}
        onMouseLeave={surRelachement}
        style={{ cursor: curseur }}
      >
        {/* Fond de plan seul : l'ambiance lumineuse se compose par-dessus, sans toucher
            aux symboles qui doivent rester lisibles quelle que soit l'ambiance. */}
        <Layer listening={false}>
          {image && <KonvaImage image={image} name="fond-plan" listening={false} />}
        </Layer>

        {modeEclairage && (
          <Layer listening={false}>
            <CalqueEclairage
              nappes={nappes}
              largeur={image?.width ?? taille.w / vue.scale}
              hauteur={image?.height ?? taille.h / vue.scale}
              intensiteNuit={intensiteNuit}
            />
          </Layer>
        )}

        <Layer>
          {projet.murs.map((mur) => (
            <TraitMur key={mur.id} mur={mur} echelle={echelle} echelleVue={vue.scale} />
          ))}

          {pointsMurEnCours && pointsMurEnCours.length > 0 && (
            <>
              <Line
                points={aplatir(pointsMurEnCours)}
                stroke={COULEUR_MUR}
                strokeWidth={2 / vue.scale}
                dash={[6 / vue.scale, 4 / vue.scale]}
                lineCap="round"
                lineJoin="round"
                listening={false}
              />
              {pointsMurEnCours.map((p, i) => (
                <Circle key={i} x={p.x} y={p.y} radius={4 / vue.scale} fill={COULEUR_MUR} listening={false} />
              ))}
            </>
          )}

          {projet.pieces.map((piece) => (
            <FacePiece key={piece.id} piece={piece} selectionnee={pieceSelectionnee === piece.id} echelleVue={vue.scale} />
          ))}

          {pointsPieceEnCours && pointsPieceEnCours.length > 0 && (
            <>
              <Line
                points={aplatir(pointsPieceEnCours)}
                stroke={COULEUR_PIECE}
                strokeWidth={2 / vue.scale}
                dash={[6 / vue.scale, 4 / vue.scale]}
                lineCap="round"
                lineJoin="round"
                closed={pointsPieceEnCours.length > 2}
                fill={pointsPieceEnCours.length > 2 ? `${COULEUR_PIECE}22` : undefined}
                listening={false}
              />
              {pointsPieceEnCours.map((p, i) => (
                <Circle key={i} x={p.x} y={p.y} radius={4 / vue.scale} fill={COULEUR_PIECE} listening={false} />
              ))}
            </>
          )}

          {projet.cheminements.map((c) => (
            <Line
              key={c.id}
              points={aplatir(c.points)}
              stroke={COULEUR_ELECTRICITE}
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
                stroke={COULEUR_CABLE_EN_COURS}
                strokeWidth={2 / vue.scale}
                dash={[5 / vue.scale, 3 / vue.scale]}
                lineCap="round"
                lineJoin="round"
                listening={false}
              />
              {pointsCableEnCours.map((p, i) => (
                <Circle key={i} x={p.x} y={p.y} radius={4 / vue.scale} fill={COULEUR_CABLE_EN_COURS} listening={false} />
              ))}
            </>
          )}

          {pointCalibration && (
            <Circle
              x={pointCalibration.x}
              y={pointCalibration.y}
              radius={5 / vue.scale}
              fill={COULEUR_CABLE_EN_COURS}
              listening={false}
            />
          )}

          {tableauxVisibles.map((t) => (
            <SymboleOrgane
              key={t.id}
              id={t.id}
              type={t.type === 'principal' ? 'tableau-principal' : 'tableau-divisionnaire'}
              x={t.x}
              y={t.y}
              rotation={0}
              selectionne={selection.includes(t.id)}
              survole={survole === t.id}
              echelleVue={vue.scale}
            />
          ))}

          {organesVisibles.map((o) => (
            <SymboleOrgane
              key={o.id}
              id={o.id}
              type={o.type}
              x={o.x}
              y={o.y}
              rotation={o.rotation}
              selectionne={selection.includes(o.id)}
              survole={survole === o.id}
              echelleVue={vue.scale}
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

      {outil.kind === 'piece' && (
        <div className="hud-instruction">
          <span>
            Clique les coins de la pièce ({(pointsPieceEnCours ?? []).length}/3 min), puis « Terminer » (ou Entrée).
          </span>
          <button
            className="btn-lien"
            disabled={(pointsPieceEnCours ?? []).length < 3}
            onClick={() => finaliserPiece()}
          >
            Terminer
          </button>
          <button className="btn-lien" onClick={() => annulerPiece()}>
            Annuler
          </button>
        </div>
      )}

      {outil.kind === 'mur' && (
        <div className="hud-instruction">
          <span>
            Clique les points du mur ({(pointsMurEnCours ?? []).length}/2 min), puis « Terminer » (ou Entrée).
            L'épaisseur se règle ensuite dans l'onglet Murs.
          </span>
          <button className="btn-lien" disabled={(pointsMurEnCours ?? []).length < 2} onClick={() => finaliserMur()}>
            Terminer
          </button>
          <button className="btn-lien" onClick={() => annulerMur()}>
            Annuler
          </button>
        </div>
      )}
    </div>
  )
}

function TraitMur({ mur, echelle, echelleVue }: { mur: Mur; echelle: Echelle | null; echelleVue: number }) {
  // Épaisseur réelle si l'échelle est calée (elle zoome alors naturellement avec le plan) ;
  // sinon un trait d'épaisseur visuellement constante, comme les autres tracés provisoires.
  const epaisseurPx = metresVersPx(mur.epaisseurM, echelle) ?? 8 / echelleVue
  return (
    <Line
      points={aplatir(mur.points)}
      stroke={COULEUR_MUR}
      strokeWidth={epaisseurPx}
      lineCap="round"
      lineJoin="round"
      listening={false}
    />
  )
}

function FacePiece({
  piece,
  selectionnee,
  echelleVue,
}: {
  piece: Piece
  selectionnee: boolean
  echelleVue: number
}) {
  const centre = pointEtiquette(piece.polygone)
  const libelleSurface = piece.surfaceM2 > 0 ? `${piece.surfaceM2.toFixed(1)} m²` : ''
  return (
    <>
      <Line
        points={aplatir(piece.polygone)}
        closed
        fill={selectionnee ? `${COULEUR_PIECE}33` : `${COULEUR_PIECE}14`}
        stroke={COULEUR_PIECE}
        strokeWidth={(selectionnee ? 2.5 : 1.3) / echelleVue}
        dash={selectionnee ? undefined : [5 / echelleVue, 4 / echelleVue]}
        listening={false}
      />
      <Text
        x={centre.x}
        y={centre.y}
        text={`${piece.nom}${libelleSurface ? `\n${libelleSurface}` : ''}`}
        fontSize={13 / echelleVue}
        fontStyle="700"
        fill={COULEUR_PIECE}
        align="center"
        offsetX={(piece.nom.length * 4) / echelleVue}
        listening={false}
      />
    </>
  )
}

function SymboleOrgane({
  id,
  type,
  x,
  y,
  rotation,
  selectionne,
  survole,
  echelleVue,
}: {
  id: string
  type: TypeOrgane
  x: number
  y: number
  rotation: number
  selectionne: boolean
  survole: boolean
  echelleVue: number
}) {
  // Halo et symbole vivent dans un même nœud identifié : pendant un déplacement,
  // PlanCanvas repositionne ce nœud unique, et l'ensemble suit le curseur d'un bloc.
  return (
    <Group id={id} x={x} y={y} listening={false}>
      {survole && !selectionne && (
        <Circle x={0} y={0} radius={22} fill={COULEUR_SELECTION} opacity={0.1} listening={false} />
      )}
      {selectionne && (
        <>
          <Circle x={0} y={0} radius={22} fill={COULEUR_SELECTION} opacity={0.18} listening={false} />
          <Circle
            x={0}
            y={0}
            radius={22}
            stroke={COULEUR_SELECTION}
            strokeWidth={2 / echelleVue}
            dash={[4 / echelleVue, 3 / echelleVue]}
            listening={false}
          />
        </>
      )}
      <Symbole
        type={type}
        x={0}
        y={0}
        rotation={rotation}
        color={selectionne ? COULEUR_SELECTION : COULEUR_ELECTRICITE}
      />
    </Group>
  )
}
