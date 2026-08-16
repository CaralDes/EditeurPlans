// Couleurs utilisées sur le canevas Konva : le Canvas 2D ne lit pas les variables CSS
// (contrairement au reste de l'interface, voir style.css), donc ces valeurs sont la
// seule source de vérité pour ce qui est dessiné sur le plan.

// Convention des plans électriques : le calque électricité se distingue du fond du
// plan en bleu, par-dessus le bâti en noir/gris.
export const COULEUR_ELECTRICITE = '#1d5fa8'
export const COULEUR_ELECTRICITE_SUR_ACCENT = '#ffffff' // symbole actif dans la palette, sur fond accent

export const COULEUR_SELECTION = '#9a5f26' // reprend --accent : distingue la sélection du bleu électricité
export const COULEUR_CABLE_EN_COURS = '#c94f3a' // tracé provisoire / point de calibration
export const COULEUR_PIECE = '#3d7a5c' // vert sourd : distinct du bleu électricité et du cuivre de sélection
