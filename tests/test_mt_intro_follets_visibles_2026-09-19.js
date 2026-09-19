// MT_intro-follets-visibles_2026-09-19 : pendant l'intro, quand le texte
// s'affiche, les trois follets disparaissaient, puis revenaient d'un coup à
// l'appui sur A (constat Xav, 2026-09-19).
//
// CAUSE RACINE (confirmée avant correctif, hypothèse de la fiche vérifiée) :
// main.js#maj(), à l'instant `intro.terminee`, faisait `intro = null` PUIS
// `demarrerChoixFollet()`. Or `demarrerChoixFollet()` n'ouvre qu'un dialogue
// et ne pose `choixFollet` que dans son `onFermer`. Entre les deux, donc
// pendant TOUT le texte :
//   - `dessinerIntroConvergence()` sortait sur `if (!intro) return null;`
//   - `dessinerEcranChoixFollet()` sortait sur `if (!choixFolletActif()) return;`
// Personne ne dessinait les follets. Ils réapparaissaient à la fermeture du
// dialogue, quand `choixFollet` devenait non-null.
//
// Correctif : l'intro reste vivante en étape ATTENTE jusqu'à
// confirmerChoixFollet(). Ce fichier prouve la visibilité pendant le texte et
// la CONTINUITÉ de position aux deux frontières.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  creerIntro,
  avancerIntro,
  etatRendu,
  dureeEtapesTempsFixe,
  ETAPE_CONVERGENCE,
  ETAPE_ATTENTE,
} from '../src/intro.js';
import { chargerCataloguesDepuisDisque } from '../src/io_node.js';
import { SCHEMAS } from '../src/schemas.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// Les 3 cibles = positions de l'écran de choix (main.js#POSITIONS_ECRAN_FOLLETS
// / Y_ECRAN_FOLLETS) — c'est là que dessinerEcranChoixFollet() redessine les
// follets, donc c'est là que la continuité doit se vérifier.
const CIBLES = [
  { x: 120, y: 150 },
  { x: 240, y: 150 },
  { x: 360, y: 150 },
];

const EPSILON_PX = 1e-9;

async function introDeLaGrotte() {
  const { donnees, erreurs } = await chargerCataloguesDepuisDisque(
    path.join(RACINE, 'data'),
    Object.keys(SCHEMAS),
  );
  assert.deepEqual(erreurs, []);
  const scene = donnees.scenes.find((s) => s.id === 'scene_grotte_salle_1');
  assert.ok(scene && scene.intro, 'scene_grotte_salle_1 doit déclarer une intro');
  return scene.intro;
}

const CONFIG = await introDeLaGrotte();

// --- 1. Les 3 follets sont visibles pendant tout le texte ---
{
  let intro = creerIntro(CONFIG);
  intro = avancerIntro(intro, dureeEtapesTempsFixe(CONFIG) + 1);
  assert.equal(intro.terminee, true, "la partie à temps fixe est finie : c'est l'instant où le texte s'ouvre");

  // Le joueur lit à son rythme : 10 s de texte, échantillonnées à 16 ms.
  for (let t = 0; t < 10000; t += 16) {
    const rendu = etatRendu(intro, CIBLES);
    assert.equal(rendu.etape, ETAPE_ATTENTE, `étape ATTENTE à t+${t}ms`);
    assert.ok(Array.isArray(rendu.follets) && rendu.follets.length === 3, `3 follets exposés à t+${t}ms`);
    for (const f of rendu.follets) {
      assert.equal(f.alpha, 1, 'un follet en attente est pleinement visible, jamais effacé');
      assert.ok(Number.isFinite(f.x) && Number.isFinite(f.y), 'position finie');
    }
    intro = avancerIntro(intro, 16);
  }
  console.log('OK les 3 follets restent exposés et opaques pendant 10 s de texte');
}

// --- 2. Continuité : dernière frame de convergence -> première frame de texte ---
{
  const duree = dureeEtapesTempsFixe(CONFIG);
  // Juste avant la bascule (encore en convergence).
  let intro = creerIntro(CONFIG);
  intro = avancerIntro(intro, duree - 1);
  const avant = etatRendu(intro, CIBLES);
  assert.equal(avant.etape, ETAPE_CONVERGENCE);

  // La frame qui bascule : le dépassement (1 ms) amorce l'attente, il n'est
  // pas perdu — sinon la lévitation marquerait un micro-temps d'arrêt.
  intro = avancerIntro(intro, 1);
  const apres = etatRendu(intro, CIBLES);
  assert.equal(apres.etape, ETAPE_ATTENTE);
  assert.equal(intro.tAttenteMs, 0, 'exactement à la frontière, aucun dépassement à reporter');

  avant.follets.forEach((f, i) => {
    assert.ok(Math.abs(f.x - apres.follets[i].x) < 0.5, `follet ${i} : pas de saut en X à la bascule`);
    assert.ok(Math.abs(f.y - apres.follets[i].y) < 0.5, `follet ${i} : pas de saut en Y à la bascule`);
  });
  console.log('OK continuité convergence -> texte (aucun saut)');
}

// Le dépassement de frame est bien reporté dans l'attente (frame longue).
{
  let intro = creerIntro(CONFIG);
  intro = avancerIntro(intro, dureeEtapesTempsFixe(CONFIG) + 7);
  assert.equal(intro.tMs, dureeEtapesTempsFixe(CONFIG), 'la partie à temps fixe est clampée, jamais dépassée');
  assert.equal(intro.tAttenteMs, 7, "le dépassement amorce l'attente au lieu d'être perdu");
  console.log("OK le dépassement de la frame de bascule amorce l'attente");
}

// --- 3. Continuité : dernière frame de texte -> première frame du choix ---
// L'écran de choix dessine les follets EXACTEMENT sur les cibles, sans
// lévitation. L'attente doit donc les y avoir posés : l'oscillation s'amortit
// à zéro en une période de lévitation (durée dérivée des données existantes).
{
  let intro = creerIntro(CONFIG);
  intro = avancerIntro(intro, dureeEtapesTempsFixe(CONFIG) + 1);
  // Le joueur ne peut pas fermer le dialogue plus vite que la machine à
  // écrire + l'armement anti-spam ; on vérifie qu'après la période de
  // lévitation, les follets sont posés sur les cibles au pixel près.
  intro = avancerIntro(intro, CONFIG.levitation.periode_ms);
  const rendu = etatRendu(intro, CIBLES);
  rendu.follets.forEach((f, i) => {
    assert.ok(
      Math.abs(f.x - CIBLES[i].x) < EPSILON_PX,
      `follet ${i} posé en X sur la cible de l'écran de choix (écart ${Math.abs(f.x - CIBLES[i].x)})`,
    );
    assert.ok(
      Math.abs(f.y - CIBLES[i].y) < EPSILON_PX,
      `follet ${i} posé en Y sur la cible de l'écran de choix (écart ${Math.abs(f.y - CIBLES[i].y)})`,
    );
  });
  console.log('OK continuité texte -> écran de choix : follets posés exactement sur les cibles');
}

// L'amortissement est monotone et ne repart jamais (pas de rebond visuel).
{
  let intro = creerIntro(CONFIG);
  intro = avancerIntro(intro, dureeEtapesTempsFixe(CONFIG) + 1);
  let ecartPrecedent = Infinity;
  let maxEcart = 0;
  for (let t = 0; t <= CONFIG.levitation.periode_ms + 500; t += 16) {
    const rendu = etatRendu(intro, CIBLES);
    const ecart = Math.max(...rendu.follets.map((f, i) => Math.abs(f.y - CIBLES[i].y)));
    maxEcart = Math.max(maxEcart, ecart);
    // L'enveloppe décroît : on compare à l'amplitude maximale autorisée à cet
    // instant plutôt qu'au point précédent (le sinus, lui, oscille).
    const amortissement = Math.max(0, 1 - intro.tAttenteMs / CONFIG.levitation.periode_ms);
    assert.ok(
      ecart <= CONFIG.levitation.amplitude_px * amortissement + EPSILON_PX,
      `l'écart à la cible reste sous l'enveloppe amortie à t+${t}ms`,
    );
    ecartPrecedent = ecart;
    intro = avancerIntro(intro, 16);
  }
  assert.ok(ecartPrecedent < EPSILON_PX, 'à la fin, plus aucune oscillation');
  assert.ok(maxEcart <= CONFIG.levitation.amplitude_px + EPSILON_PX, 'jamais au-delà de la lévitation nominale');
  console.log('OK amortissement monotone, sans rebond');
}

// --- 4. Budget et non-skippabilité inchangés (le ticket l'exige) ---
{
  const duree = dureeEtapesTempsFixe(CONFIG);
  assert.ok(duree <= 8000, `budget ≤ 8 s inchangé (mesuré ${duree} ms)`);
  // `terminee` bascule au même instant qu'avant la fiche : c'est lui qui
  // ouvre le dialogue, et il ne doit basculer qu'une fois.
  let intro = creerIntro(CONFIG);
  let bascules = 0;
  for (let t = 0; t < duree + 5000; t += 16) {
    const avant = intro.terminee;
    intro = avancerIntro(intro, 16);
    if (intro.terminee && !avant) bascules += 1;
  }
  assert.equal(bascules, 1, "le front `terminee` n'arrive qu'une fois : le dialogue de choix ne se rouvre jamais");
  console.log('OK budget ≤ 8 s et front `terminee` unique inchangés');
}

console.log('OK test_mt_intro_follets_visibles');
