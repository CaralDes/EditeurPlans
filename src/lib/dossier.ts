import type { Organe, Projet } from '../types'
import { SYMBOL_META } from '../symbols/meta'
import { avertissementRegles, circuitsEclairageMin, versionRegles, verifierToutesPieces } from '../regles/moteur'
import { resumeCircuits, totauxParSection } from './metre'
import { construireSchemaTableau } from './schemaTableau'
import { longueurMurM } from './murs'

// Construit le dossier imprimable (HTML autonome) : plan annoté, nomenclature du matériel,
// conformité pièce par pièce, répartition du tableau et métré des câbles. Volontairement
// une chaîne HTML pure, sans dépendance au DOM ni à une bibliothèque PDF — c'est la
// fonction « Enregistrer au format PDF » du navigateur qui produit le fichier final, ce
// qui évite d'embarquer un moteur PDF dans un bundle déjà chargé.

const LIBELLES_TYPE_PIECE: Record<string, string> = {
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

const LIBELLES_POSE: Record<string, string> = {
  basse: 'Basse',
  'plan-travail': 'Plan de travail',
  cuisson: 'Cuisson',
  haute: 'Haute',
  hotte: 'Hotte',
  plafond: 'Plafond',
  commande: 'Commande',
}

export function echapper(texte: string): string {
  return texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function badge(ok: boolean, texte: string): string {
  return `<span class="${ok ? 'ok' : 'ko'}">${echapper(texte)}</span>`
}

function tableau(entetes: string[], lignes: string[][]): string {
  if (lignes.length === 0) return '<p class="vide">—</p>'
  const th = entetes.map((e) => `<th>${echapper(e)}</th>`).join('')
  // Les cellules sont déjà échappées (ou volontairement balisées) par l'appelant.
  const tr = lignes.map((l) => `<tr>${l.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')
  return `<table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`
}

function sectionNomenclature(projet: Projet): string {
  const parType = new Map<string, number>()
  for (const organe of projet.organes) {
    parType.set(organe.type, (parType.get(organe.type) ?? 0) + 1)
  }
  const lignes = [...parType.entries()]
    .map(([type, n]) => ({ libelle: SYMBOL_META[type as keyof typeof SYMBOL_META]?.label ?? type, n }))
    .sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr'))
    .map((l) => [echapper(l.libelle), String(l.n)])

  const total = projet.organes.length
  return `<section>
    <h2>Nomenclature du matériel</h2>
    ${tableau(['Matériel', 'Quantité'], lignes)}
    <p class="total">${total} appareil(s) au total.</p>
  </section>`
}

function formatPose(o: Organe): string {
  const libelle = LIBELLES_POSE[o.pose] ?? o.pose
  // Un point sous plafond n'a pas de hauteur d'axe significative (elle dépend de la
  // hauteur sous plafond, pas d'une cote fixe) : afficher 0,00 m serait trompeur.
  return o.pose === 'plafond' ? libelle : `${libelle} (${o.hauteurM.toFixed(2)} m)`
}

function blocAppareils(titre: string, organes: Organe[]): string {
  if (organes.length === 0) {
    return `<h3>${echapper(titre)}</h3><p class="vide">Aucun appareil.</p>`
  }
  const lignes = [...organes]
    .sort((a, b) => a.repere.localeCompare(b.repere, 'fr', { numeric: true }))
    .map((o) => [
      echapper(o.repere),
      echapper(SYMBOL_META[o.type]?.label ?? o.type),
      echapper(formatPose(o)),
      o.note.trim() ? echapper(o.note) : '—',
    ])
  return `<div class="bloc-piece"><h3>${echapper(titre)} <span class="compte">(${organes.length})</span></h3>${tableau(['Repère', 'Appareil', 'Pose', 'Note'], lignes)}</div>`
}

function sectionAppareilsParPiece(projet: Projet): string {
  const parPiece = new Map<string, Organe[]>()
  const horsPiece: Organe[] = []
  for (const organe of projet.organes) {
    if (organe.pieceId === null) {
      horsPiece.push(organe)
      continue
    }
    const liste = parPiece.get(organe.pieceId) ?? []
    liste.push(organe)
    parPiece.set(organe.pieceId, liste)
  }

  const blocs = projet.pieces.map((piece) =>
    blocAppareils(`${piece.nom} — ${LIBELLES_TYPE_PIECE[piece.type] ?? piece.type}`, parPiece.get(piece.id) ?? []),
  )
  if (horsPiece.length > 0) blocs.push(blocAppareils('Hors pièce tracée', horsPiece))

  return `<section class="section-longue">
    <h2>Appareils par pièce</h2>
    ${blocs.length > 0 ? blocs.join('') : '<p class="vide">Aucun appareil posé.</p>'}
  </section>`
}

function sectionPieces(projet: Projet): string {
  const conformites = verifierToutesPieces(projet.pieces, projet.organes)
  const lignes = conformites.map((c) => {
    const cellules = [
      echapper(c.piece.nom),
      echapper(LIBELLES_TYPE_PIECE[c.piece.type] ?? c.piece.type),
      c.piece.surfaceM2 > 0 ? `${c.piece.surfaceM2.toFixed(1)} m²` : '—',
      badge(c.prisesPosees >= c.prisesRequises, `${c.prisesPosees} / ${c.prisesRequises}`),
      c.prisesPlanTravailRequises > 0
        ? badge(
            c.prisesPlanTravailPosees >= c.prisesPlanTravailRequises,
            `${c.prisesPlanTravailPosees} / ${c.prisesPlanTravailRequises}`,
          )
        : '—',
      badge(c.eclairagePose >= c.eclairageRequis, `${c.eclairagePose} / ${c.eclairageRequis}`),
      c.rj45Requises > 0 ? badge(c.rj45Posees >= c.rj45Requises, `${c.rj45Posees} / ${c.rj45Requises}`) : '—',
    ]
    return cellules
  })

  const nonConformes = conformites.filter((c) => !c.ok).length
  const resume =
    conformites.length === 0
      ? "<p class=\"vide\">Aucune pièce tracée : la conformité par pièce n'a pas pu être vérifiée.</p>"
      : nonConformes === 0
        ? '<p class="total ok">Toutes les pièces tracées atteignent les minimums retenus.</p>'
        : `<p class="total ko">${nonConformes} pièce(s) sous les minimums retenus.</p>`

  return `<section>
    <h2>Conformité par pièce</h2>
    ${tableau(['Pièce', 'Type', 'Surface', 'Prises', 'dont plan de travail', 'Éclairage', 'RJ45'], lignes)}
    ${resume}
  </section>`
}

function sectionTableau(projet: Projet): string {
  const tableauElec = projet.tableaux[0]
  if (!tableauElec) return '<section><h2>Tableau</h2><p class="vide">Aucun tableau posé.</p></section>'

  const schema = construireSchemaTableau(tableauElec, projet.circuits, projet.organes)
  const lignesMetre = new Map(resumeCircuits(projet).map((l) => [l.circuit.id, l]))

  const lignes: string[][] = []
  for (const branche of schema.branches) {
    for (const circuit of branche.circuits) {
      const metre = lignesMetre.get(circuit.id)
      lignes.push([
        echapper(circuit.libelle),
        `${branche.differentiel.type} · ${branche.differentiel.calibreA} A`,
        `${circuit.calibreA} A`,
        `${circuit.sectionMm2} mm²`,
        String(circuit.nbOrganes),
        metre?.longueurTotaleM != null ? `${metre.longueurTotaleM.toFixed(1)} m` : '—',
        circuit.conforme ? '<span class="ok">conforme</span>' : `<span class="ko">${echapper(circuit.alertes.join(' · '))}</span>`,
      ])
    }
  }
  for (const circuit of schema.circuitsSansDifferentiel) {
    lignes.push([
      echapper(circuit.libelle),
      '<span class="ko">aucun</span>',
      `${circuit.calibreA} A`,
      `${circuit.sectionMm2} mm²`,
      String(circuit.nbOrganes),
      '—',
      `<span class="ko">${echapper(circuit.alertes.join(' · '))}</span>`,
    ])
  }

  const alertesDdr = schema.branches
    .filter((b) => b.alertes.length > 0)
    .map((b) => `<li class="ko">Différentiel ${b.differentiel.type} ${b.differentiel.calibreA} A — ${echapper(b.alertes.join(' · '))}</li>`)

  const surfaceHabitable = projet.pieces
    .filter((p) => p.type !== 'exterieur')
    .reduce((somme, p) => somme + p.surfaceM2, 0)
  const regleEclairage = circuitsEclairageMin(surfaceHabitable)
  const circuitsEclairagePoses = projet.circuits.filter((c) => c.famille === 'eclairage').length
  if (surfaceHabitable > 0 && circuitsEclairagePoses < regleEclairage.nombre) {
    alertesDdr.push(
      `<li class="ko">${circuitsEclairagePoses} circuit(s) d'éclairage pour ${surfaceHabitable.toFixed(0)} m² habitables, ${regleEclairage.nombre} attendu(s)</li>`,
    )
  }

  return `<section>
    <h2>Tableau et circuits</h2>
    <p class="soustitre">${echapper(tableauElec.type === 'divisionnaire' ? 'Tableau divisionnaire' : 'Tableau principal')} — différentiels : ${echapper(tableauElec.differentiels.map((d) => `${d.type} ${d.calibreA} A`).join(' · '))}</p>
    ${tableau(['Circuit', 'Différentiel', 'Disjoncteur', 'Section', 'Points', 'Longueur', 'Contrôle'], lignes)}
    ${alertesDdr.length > 0 ? `<ul class="alertes">${alertesDdr.join('')}</ul>` : ''}
  </section>`
}

function sectionMetre(projet: Projet): string {
  const totaux = totauxParSection(resumeCircuits(projet))
  const lignesCable = totaux.map((t) => [`${t.sectionMm2} mm²`, `${t.longueurM.toFixed(1)} m`])

  const longueursMurs = projet.murs
    .map((m) => longueurMurM(m, projet.plan.echelle))
    .filter((l): l is number => l !== null)
  const totalMurs = longueursMurs.reduce((a, b) => a + b, 0)

  return `<section>
    <h2>Métré</h2>
    <h3>Conducteurs par section</h3>
    ${tableau(['Section', 'Longueur'], lignesCable)}
    ${
      totaux.length === 0
        ? '<p class="vide">Les longueurs ne sont calculables qu\'une fois l\'échelle calée et tous les câbles tracés.</p>'
        : ''
    }
    ${
      projet.murs.length > 0
        ? `<h3>Murs</h3><p class="total">${projet.murs.length} mur(s) tracé(s)${totalMurs > 0 ? `, ${totalMurs.toFixed(1)} m au total` : ''}.</p>`
        : ''
    }
  </section>`
}

const STYLE = `
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: #16222c; font-size: 11px; margin: 0; }
  header { border-bottom: 2px solid #16222c; padding-bottom: 8px; margin-bottom: 16px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .meta { color: #46596b; font-size: 10.5px; }
  section { margin-bottom: 18px; page-break-inside: avoid; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; color: #46596b;
       border-bottom: 1px solid #d3dbe2; padding-bottom: 4px; margin: 0 0 8px; }
  h3 { font-size: 11.5px; margin: 10px 0 4px; color: #46596b; }
  .compte { font-weight: 400; color: #64798c; }
  section.section-longue { page-break-inside: auto; }
  .bloc-piece { page-break-inside: avoid; margin-bottom: 12px; }
  .bloc-piece:first-child h3 { margin-top: 0; }
  .soustitre { color: #46596b; margin: 0 0 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
  th { text-align: left; background: #eef1f4; padding: 4px 6px; border-bottom: 1px solid #d3dbe2; font-size: 9.5px;
       text-transform: uppercase; letter-spacing: 0.04em; color: #46596b; }
  td { padding: 4px 6px; border-bottom: 1px solid #e7ecf0; vertical-align: top; }
  .ok { color: #2f7a3d; font-weight: 700; }
  .ko { color: #b1402f; font-weight: 700; }
  .vide { color: #64798c; font-style: italic; margin: 4px 0; }
  .total { margin: 6px 0 0; color: #46596b; }
  .alertes { margin: 8px 0 0; padding-left: 18px; }
  .plan { width: 100%; border: 1px solid #d3dbe2; page-break-inside: avoid; }
  .plan-vide { color: #64798c; font-style: italic; border: 1px dashed #d3dbe2; padding: 20px; text-align: center; }
  footer { margin-top: 18px; border-top: 1px solid #d3dbe2; padding-top: 8px; color: #64798c; font-size: 9.5px; }
`

export function construireDossier(projet: Projet, imagePlan: string | null, dateISO: string): string {
  const date = new Date(dateISO)
  const dateLisible = Number.isNaN(date.getTime())
    ? dateISO
    : date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

  const echelle = projet.plan.echelle
  const meta = [
    `Édité le ${dateLisible}`,
    echelle ? `échelle ${echelle.pxParMetre.toFixed(1)} px/m (calée sur ${echelle.coteSur})` : 'échelle non calée',
    `hauteur sous plafond ${projet.plan.hauteurSousPlafond} m`,
  ].join(' · ')

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${echapper(projet.nom)} — dossier électrique</title>
<style>${STYLE}</style>
</head>
<body>
<header>
  <h1>${echapper(projet.nom)}</h1>
  <div class="meta">${echapper(meta)}</div>
</header>

<section>
  <h2>Plan annoté</h2>
  ${
    imagePlan
      ? `<img class="plan" src="${imagePlan}" alt="Plan annoté">`
      : '<p class="plan-vide">Aucun plan à afficher.</p>'
  }
</section>

${sectionNomenclature(projet)}
${sectionAppareilsParPiece(projet)}
${sectionPieces(projet)}
${sectionTableau(projet)}
${sectionMetre(projet)}

<footer>
  Base de règles ${echapper(versionRegles())}. ${echapper(avertissementRegles())}
</footer>
</body>
</html>`
}

/**
 * Ouvre le dossier dans une fenêtre dédiée et déclenche l'impression, d'où le navigateur
 * propose « Enregistrer au format PDF ». Renvoie false si la fenêtre a été bloquée.
 */
export function imprimerDossier(html: string): boolean {
  const fenetre = window.open('', '_blank')
  if (!fenetre) return false
  fenetre.document.open()
  fenetre.document.write(html)
  fenetre.document.close()
  // L'impression doit attendre le décodage de l'image du plan, sinon la page part vide.
  const lancer = () => fenetre.print()
  if (fenetre.document.readyState === 'complete') setTimeout(lancer, 300)
  else fenetre.addEventListener('load', () => setTimeout(lancer, 300))
  return true
}
