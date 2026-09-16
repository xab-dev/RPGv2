// Diagnostic SD_grotte-blocage-choix-follet_2026-09-15.md : la reproduction
// fidèle de main.js#creerOrchestrateurGrotte (test_phase1_sd_grotte_choix_
// follet) est verte avec des inputs abstraits propres (front montant réel
// par frame). En braquant un vrai navigateur (clavier, hors gamepad
// physique indisponible ici), le parcours complet — narration → choix →
// confirmation → dialogue d'enthousiasme → déplacement — fonctionne aussi de
// bout en bout. Cause racine recherchée ailleurs : dans src/input/input.js,
// la fusion clavier+manette+tactile ne fait qu'un OR par verbe sur un seul
// "held" partagé (cf. commentaire "recalculé à zéro chaque frame" — vrai
// seulement si CHAQUE source retombe à faux à son tour). Une touche clavier
// qui reste bloquée à "enfoncée" côté navigateur — cas réel et documenté :
// aucun `keyup` n'est garanti après une perte de focus de fenêtre (alt-tab,
// clic hors fenêtre, notification OS) alors qu'une touche est physiquement
// tenue — empêche alors TOUTE future manette/tactile de produire un front
// montant sur ce même verbe, indéfiniment, sans erreur ni message : "aucun
// crash visible, plus rien" — exactement le symptôme rapporté par Xav.
//
// Ce test doit être rouge avant le correctif (blur sur keyboard.js),
// vert après.

import assert from 'node:assert/strict';
import { creerSourceClavier } from '../src/input/keyboard.js';
import { creerSourceManette } from '../src/input/gamepad.js';
import { creerCoucheInput } from '../src/input/input.js';

function creerFausseCible() {
  const gestionnaires = {};
  return {
    addEventListener(type, fn) {
      (gestionnaires[type] ||= []).push(fn);
    },
    emettre(type, detail) {
      for (const fn of gestionnaires[type] || []) fn(detail || {});
    },
  };
}

function creerFausseManette({ boutonsAppuyes = [] } = {}) {
  const boutons = Array.from({ length: 12 }, (_, i) => ({ pressed: boutonsAppuyes.includes(i) }));
  return { index: 0, axes: [0, 0], buttons: boutons };
}

// 1. Perte de focus fenêtre pendant qu'une touche est physiquement tenue :
// le navigateur ne garantit aucun `keyup` après un blur. Sans traitement,
// le verbe reste bloqué "enfoncé" côté clavier pour toujours.
{
  const cible = creerFausseCible();
  let manetteAppuiSuivant = false;
  const nav = { getGamepads: () => [creerFausseManette({ boutonsAppuyes: manetteAppuiSuivant ? [0] : [] })] };
  const input = creerCoucheInput({
    sourceClavier: creerSourceClavier(cible),
    sourceManette: creerSourceManette(nav),
  });

  // Le joueur appuie sur Espace (confirme un choix, par ex.) ...
  cible.emettre('keydown', { code: 'Space' });
  const frame1 = input.maj();
  assert.equal(frame1.attack.pressed, true, 'premier appui : front montant normal');

  // ... puis perd le focus de la fenêtre AVANT de relâcher (alt-tab, clic
  // hors fenêtre, notification) : keyup jamais reçu par `window`.
  cible.emettre('blur');

  // Le joueur revient, lâche vraiment la touche cette fois (le clavier
  // physique le sait, mais le navigateur avait déjà "perdu" l'info) — sans
  // le correctif, touchesEnfoncees garde encore 'Space'.
  const frame2 = input.maj();
  assert.equal(frame2.attack.held, false, 'blur doit réinitialiser les touches enfoncées côté clavier');

  // Le joueur essaie ensuite d'avancer un dialogue à la MANETTE : sans le
  // correctif, le verbe fusionné ne produit plus jamais de front montant,
  // quelle que soit la source, car held.attack serait resté "collé" à vrai.
  manetteAppuiSuivant = true;
  const frame3 = input.maj();
  assert.equal(frame3.attack.pressed, true, 'la manette doit pouvoir produire un nouveau front montant après le blur');
}

console.log('OK test_phase1_sd_input_verbe_bloque');
