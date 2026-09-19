// Texte flottant de gain (MT_texte-flottant_2026-09-19, `D-05`) : un petit
// texte monte depuis l'endroit où quelque chose a été gagné, puis s'efface —
// « +1 Bois » à la récolte, « +1 Branche » au ramassage.
//
// RÈGLE DIRECTRICE DE LA FICHE : « un seul mécanisme de retour dans le monde,
// pas un par système ». Ce module resservira au butin, à l'XP et aux dégâts
// SANS CODE NOUVEAU — il ne connaît donc ni item, ni ressource, ni
// inventaire. Il ne transporte que des CLÉS opaques (`cle` pour regrouper,
// `format`/`libelle` pour que l'appelant résolve le texte) et un nombre.
//
// Module PUR, sur le patron de src/poussiere.js : aucun canvas, aucun DOM,
// aucune horloge propre, aucun i18n, réserve de taille fixe pré-allouée,
// ZÉRO allocation en jeu (pas de push/splice, pas de closure dans les
// boucles chaudes — d'où les `for` bruts plutôt que `find`/`reduce`).
//
// Pourquoi le module ne stocke PAS la chaîne déjà composée, alors que la
// fiche esquissait `emettre(x, y, texte)` : la fusion « +1 puis +1 = +2 »
// exige de savoir qu'il s'agit du même gain et d'en additionner la quantité,
// ce qu'une chaîne figée interdit. Composer au moment du rendu a un second
// mérite : changer de langue pendant qu'un texte est en vol le traduit aussi.

// État neuf. `capacite` vient des DONNÉES (data/effets.json) : c'est le seul
// endroit où le nombre est écrit, jamais un défaut de repli ici qui ferait
// silencieusement diverger les deux. Un réglage absent est une erreur de
// catalogue, pas une valeur à deviner — même philosophie que l'échec dur au
// boot sur une référence cassée (registry.js).
export function creerTextesFlottants(config) {
  const capacite = config && config.capacite;
  if (!Number.isInteger(capacite) || capacite <= 0) {
    throw new Error(
      `texte_flottant.js#creerTextesFlottants : "capacite" doit être un entier > 0 dans l'entrée d'effets `
      + `(reçu ${JSON.stringify(capacite)})`
    );
  }
  const textes = new Array(capacite);
  for (let i = 0; i < capacite; i += 1) {
    textes[i] = { active: false, x: 0, y: 0, ageMs: 0, cle: null, quantite: 0, format: null, libelle: null };
  }
  return { config, textes };
}

// Émet un gain à (x, y) — la SOURCE du gain (la tuile récoltée, l'objet
// ramassé), jamais la position du héros : c'est ce qui fait lire « ça vient
// de là ».
//
// `cle` sert UNIQUEMENT à regrouper (deux gains de la même chose fusionnent) ;
// `format` et `libelle` sont des clés que l'appelant résoudra au rendu. Un
// futur « +12 » de dégâts émettra un `format` différent et `libelle: null`,
// sans une ligne de code ici.
export function emettreTexte(etat, { x, y, cle, quantite = 1, format = null, libelle = null }) {
  const fusionMs = etat.config.fusion_ms || 0;

  // Fusion : un texte du même gain, assez jeune, absorbe celui-ci. On garde
  // SA position (celle du premier gain) — un texte qui saute d'une source à
  // l'autre en cours de vol se lirait comme un bug.
  for (let i = 0; i < etat.textes.length; i += 1) {
    const t = etat.textes[i];
    if (t.active && t.cle === cle && t.ageMs <= fusionMs) {
      t.quantite += quantite;
      return etat;
    }
  }

  let cible = null;
  for (let i = 0; i < etat.textes.length; i += 1) {
    if (!etat.textes[i].active) { cible = etat.textes[i]; break; }
  }
  if (!cible) {
    // Réserve pleine : on recycle LE PLUS ANCIEN (demande explicite de la
    // fiche) plutôt que de laisser tomber le nouveau comme le fait la
    // poussière. Un gain est une information ; une bouffée de poussière n'en
    // est pas une, et c'est ce qui justifie les deux politiques différentes.
    cible = etat.textes[0];
    for (let i = 1; i < etat.textes.length; i += 1) {
      if (etat.textes[i].ageMs > cible.ageMs) cible = etat.textes[i];
    }
  }
  cible.active = true;
  cible.x = x;
  cible.y = y;
  cible.ageMs = 0;
  cible.cle = cle;
  cible.quantite = quantite;
  cible.format = format;
  cible.libelle = libelle;
  return etat;
}

// Avance les textes vivants. Mute l'état en place, même raison que
// poussiere.js : recopier la réserve chaque frame irait contre le « zéro
// allocation en jeu ». Pas d'interrupteur `emettre` ici — contrairement à la
// poussière, rien ne naît tout seul : un texte n'apparaît que sur un gain
// réel, déjà résolu par l'orchestrateur.
export function avancerTextesFlottants(etat, deltaMs) {
  const duree = etat.config.duree_ms;
  for (let i = 0; i < etat.textes.length; i += 1) {
    const t = etat.textes[i];
    if (!t.active) continue;
    t.ageMs += deltaMs;
    if (t.ageMs >= duree) t.active = false;
  }
  return etat;
}

// Textes à dessiner, dans l'ordre de la réserve. `y` monte et `alpha`
// s'estompe, tous deux pilotés par le SEUL âge du texte : le rendu n'a aucun
// état à tenir. Le fondu ne commence qu'à `fondu_depuis` (fraction de la
// durée) — un texte qui pâlit dès la première frame se lit mal.
export function textesVisibles(etat) {
  const { duree_ms, montee_px, fondu_depuis } = etat.config;
  const visibles = [];
  for (let i = 0; i < etat.textes.length; i += 1) {
    const t = etat.textes[i];
    if (!t.active) continue;
    const progression = duree_ms > 0 ? Math.min(1, t.ageMs / duree_ms) : 1;
    const seuil = Math.min(0.999, Math.max(0, fondu_depuis));
    const alpha = progression <= seuil ? 1 : 1 - (progression - seuil) / (1 - seuil);
    visibles.push({
      x: t.x,
      y: t.y - montee_px * progression,
      alpha: Math.max(0, Math.min(1, alpha)),
      cle: t.cle,
      quantite: t.quantite,
      format: t.format,
      libelle: t.libelle,
    });
  }
  return visibles;
}

// Vide la réserve sans la réallouer — même usage que viderPoussiere() :
// changement de scène et reinitialiserPartie(). Un « +1 Bois » de la Maison
// n'a rien à faire dans la Grotte.
export function viderTextesFlottants(etat) {
  for (let i = 0; i < etat.textes.length; i += 1) etat.textes[i].active = false;
  return etat;
}
