// Couche d'input abstraite : combine clavier + manette + tactile en un
// unique état par frame, exprimé uniquement en verbes de gameplay (§2.4).
// Aucun système de jeu ne doit lire un Gamepad, un KeyboardEvent ou un
// TouchEvent directement — seulement cet état.

const VERBES_BOUTON = ['attack', 'skill_1', 'skill_2', 'skill_3', 'consume', 'interact', 'menu'];

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function creerCoucheInput({ sourceClavier, sourceManette, sourceTactile }) {
  const held = Object.fromEntries(VERBES_BOUTON.map((v) => [v, false]));

  // État "tactile actif" (diagnostic SD_ui-lisibilite §3, hypothèses 3a/3b) :
  // un LOQUET (pas une valeur recalculée à chaque frame) qui ne bascule que
  // sur un front — jamais sur souris/pointeur (touch.js n'écoute même pas
  // ces événements). Basculé à vrai sur un NOUVEAU contact tactile (le
  // compteur de touch.js augmente), à faux dès qu'un signal clavier/manette
  // apparaît. Un loquet est nécessaire ici, pas une simple lecture de
  // `sourceTactile.estActif()` (qui reste vraie à vie dès le premier
  // touchstart) : sans lui, relâcher une touche clavier suffisait à
  // rallumer instantanément les boutons tactiles fantômes (constaté en
  // navigateur pendant ce diagnostic — le premier jet, purement dérivé
  // chaque frame, ne survivait pas à un aller-retour clavier/tactile), ce
  // qui contredit exactement le "pas de boutons fantômes" recherché.
  // Exposé via un accesseur séparé plutôt que dans l'objet `etat` retourné
  // par maj() : `etat` a une forme uniquement move+verbes que etatNeutre()
  // dérive génériquement (cf. plus bas) — y ajouter un champ non-verbe
  // casserait cette généricité pour un état qui n'a de toute façon pas de
  // sens à neutraliser sous UI (le tactile reste actif même menu ouvert).
  let tactileActif = false;
  let dernierCompteurContactsTactile = sourceTactile ? sourceTactile.compteurContacts() : 0;

  function maj() {
    const clavier = sourceClavier ? sourceClavier.instantane() : null;
    const manette = sourceManette ? sourceManette.instantane() : null;
    const tactile = sourceTactile ? sourceTactile.instantane() : null;

    const move = {
      x: clamp((clavier ? clavier.move.x : 0) + (manette ? manette.move.x : 0) + (tactile ? tactile.move.x : 0), -1, 1),
      y: clamp((clavier ? clavier.move.y : 0) + (manette ? manette.move.y : 0) + (tactile ? tactile.move.y : 0), -1, 1),
    };

    const etat = { move };

    let clavierOuManetteActifs = !!(clavier && (clavier.move.x !== 0 || clavier.move.y !== 0));
    clavierOuManetteActifs = clavierOuManetteActifs || !!(manette && (manette.move.x !== 0 || manette.move.y !== 0));

    for (const verbe of VERBES_BOUTON) {
      // Recalculé à zéro chaque frame à partir des trois sources : une
      // manette débranchée (ou un doigt relâché) ne peut jamais laisser un
      // verbe "collé" à vrai.
      const brut = !!(clavier && clavier[verbe]) || !!(manette && manette[verbe]) || !!(tactile && tactile[verbe]);
      etat[verbe] = { pressed: brut && !held[verbe], held: brut };
      held[verbe] = brut;

      if ((clavier && clavier[verbe]) || (manette && manette[verbe])) clavierOuManetteActifs = true;
    }

    const compteurContactsCourant = sourceTactile ? sourceTactile.compteurContacts() : 0;
    const nouveauContactTactile = compteurContactsCourant !== dernierCompteurContactsTactile;
    dernierCompteurContactsTactile = compteurContactsCourant;

    if (clavierOuManetteActifs) tactileActif = false;
    else if (nouveauContactTactile) tactileActif = true;
    // sinon : ni l'un ni l'autre ne s'est manifesté cette frame -> on garde
    // l'état précédent tel quel (c'est la nature d'un loquet).

    return etat;
  }

  return { maj, tactileActif: () => tactileActif };
}

// État neutre : dérivé de la forme réelle de `etat` (pas d'une liste de
// verbes recopiée ici) pour ne jamais se désynchroniser si de nouveaux
// verbes apparaissent. Sert au point unique de priorité UI/gameplay
// (une UI ouverte fait passer ceci au gameplay plutôt que l'état réel).
export function etatNeutre(etat) {
  const neutre = { move: { x: 0, y: 0 } };
  for (const cle of Object.keys(etat)) {
    if (cle !== 'move') neutre[cle] = { pressed: false, held: false };
  }
  return neutre;
}
