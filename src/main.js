// Boot du jeu (§3.1) + orchestrateur de la Grotte (Phase 1). Seul module
// autorisé à toucher le DOM au premier niveau — tous les autres ne le font
// qu'à l'intérieur de fonctions. demarrerJeu() reste exportée et importable
// depuis Node (aucun appel n'est déclenché tant que window n'existe pas).
//
// La séquence de la grotte (choix du follet, tuto de combat, énigmes, porte)
// est un script propre à cette scène, pas un système généralisé : Phase 1
// ne prouve chaque système (combat, follet, énigmes, dialogue) qu'une seule
// fois (§1) — la généralisation viendra quand un 2ᵉ cas d'usage existera.

import { SCHEMAS } from './schemas.js';
import { validerCatalogues, construireRegistre } from './registry.js';
import { chargerCataloguesDepuisReseau, chargerLocalesDepuisReseau } from './io_navigateur.js';
import { creerI18n, verifierJeuxDeCles } from './i18n.js';
import { creerSourceClavier } from './input/keyboard.js';
import { creerSourceManette } from './input/gamepad.js';
import { creerSourceTactile } from './input/touch.js';
import { creerCoucheInput, etatNeutre } from './input/input.js';
import { chargerScene, resoudreDeplacement, portailFranchi } from './scene.js';
import { calculerCamera } from './camera.js';
import { genererDecor } from './decor.js';
import {
  creerBoucle, dessinerScene, dessinerObscurite, dessinerPaupieres, presenter,
  RESOLUTION_LOGIQUE, calculerRectanglePresentation, versCoordonneesLogiques, AURA_TRAIT,
} from './render.js';
import { creerStoreIndexedDB } from './storage_indexeddb.js';
import {
  charger as chargerSave, sauvegarder, importerSauvegarde as importerSauvegardeDansStore,
  saveNeuve, reinitialiserSauvegarde, VISUEL_HEROS_ID, COULEUR_HERO_NEUTRE,
} from './save.js';
import { dessinerVisuel, TAILLE_REFERENCE_FOLLET_PX } from './visuels.js';
import { creerRegistreFlags } from './flags.js';
import { calculerStatsPrimaires, calculerStatsDerivees } from './stats.js';
import { modificateursHeros, statsEffectivesMonstre } from './status.js';
import { creerHeros, creerMonstre, approcherEnLigneDroite, infligerDegats, mourir, respawn } from './entities.js';
import { resoudreAutoAttaque, tickCooldown, estMonstreActif, FLASH_ATTAQUE_MS, FLASH_TOUCHE_MS } from './combat.js';
import { creerFollet, mettreAJourEtat as mettreAJourFollet, avancerPosition as avancerFollet } from './companion.js';
import { creerGenerateur, resoudreLoot } from './loot.js';
import { etatInitial as etatInitialPuzzles, activerLevier } from './puzzles.js';
import { creerDialogue, resoudreLignes } from './dialogue.js';
import {
  creerIntro, avancerIntro, etatRendu as etatRenduIntro,
  creerDepart, avancerDepart, etatRenduDepart, ETAPE_CLIGNEMENTS,
} from './intro.js';
import { initialiserMenu } from './ui/menu.js';
import { dessinerHud } from './ui/hud.js';
import { dessinerDialogue } from './ui/dialogue_box.js';

// Provisoires, non validés en jeu par Xav — seuils uniques, commentés ici.
const VITESSE_HERO_PX_S = 120;
const RAYON_HERO_PX = 10;
const INTERVALLE_AUTOSAVE_MS = 30000;
const DISTANCE_INTERACT_PX = 28;

// Gauche/milieu/droite de l'écran de choix (§3.1) — arrangement visuel
// arbitraire, sans effet sur le gameplay (les 3 follets sont équivalents en
// interface) ; Xav pourra le changer librement en relisant ce tableau.
const ORDRE_CHOIX_FOLLET = ['comp_follet_feu', 'comp_follet_eau', 'comp_follet_terre'];
const SEUIL_POUSSEE_CHOIX = 0.5; // même seuil que ui/menu.js#SEUIL_POUSSEE_MENU, axe X ici

// Positions à l'écran (résolution logique 480x270) des 3 follets sur l'écran
// de choix — extraites ici (plutôt qu'inline dans dessinerEcranChoixFollet)
// car l'intro (§3.5, palier 4) converge vers ces mêmes 3 points : une seule
// définition, jamais deux jeux de coordonnées qui pourraient diverger.
const POSITIONS_ECRAN_FOLLETS = [150, 240, 330];
const Y_ECRAN_FOLLETS = 113;
// Taille "au repos" (non focalisé) de l'écran de choix (§3.1) — reprise par
// l'intro pour que les follets n'apparaissent pas à une taille différente au
// moment où l'écran de choix officiel prend le relais.
const TAILLE_FOLLET_REPOS_PX = 14;

function afficherErreurBoot(erreurs) {
  document.body.innerHTML = `
    <div id="erreur-boot" style="font-family:monospace;white-space:pre-wrap;padding:2rem;color:#f66;background:#111;height:100%;box-sizing:border-box;">
      <h1>Erreur au démarrage</h1>
      <pre>${erreurs.join('\n')}</pre>
    </div>
  `;
}

// Orchestrateur de la Grotte — extrait de demarrerJeu() (diagnostic
// SD_grotte-blocage-choix-follet_2026-09-15.md, méthode §"reproduire en
// headless") pour rester importable et pilotable depuis Node sans DOM ni
// réseau : demarrerJeu() ne fait plus que construire les dépendances qui
// touchent réellement le DOM/IndexedDB/fetch (canvas, sources d'input,
// store, menu DOM) et les injecte ici. Aucun changement de comportement —
// seul le point de couture bouge, pas la logique elle-même.
// `sourceTactile` reste accepté (les appelants/tests existants le passent
// encore) mais n'est plus lu ici : l'état "tactile actif" vient désormais de
// `input.tactileActif()` (diagnostic SD_ui-lisibilite §3), qui seul sait
// l'éteindre quand clavier/manette reprennent la main — sourceTactile.estActif()
// seul ne le faisait jamais.
export function creerOrchestrateurGrotte({
  registre, i18n, save, store, dialogue, menu, input, ctxLogique, ctxVisible, canvasLogique,
}) {
  let etatModifie = false;

  // Extrait en fonction (plutôt qu'un simple `const`) : reinitialiserPartie()
  // (diagnostic SD_grotte-blocage-choix-follet_2026-09-15.md, §B) doit
  // pouvoir reconstruire un registre de flags vierge sans redémarrer le
  // process — `flags` reste donc réaffectable (`let`), toutes les fonctions
  // de ce fichier la lisent via la fermeture, jamais une copie figée.
  function construireFlags() {
    return creerRegistreFlags(registre, {
      initial: Object.keys(save.flags || {}).filter((id) => save.flags[id]),
      // Miroir vers la sauvegarde (§3.10) : flags.js reste pur (aucune I/O),
      // c'est ce callback — fourni par l'orchestrateur — qui persiste.
      onUnlock: (id) => {
        save.flags[id] = true;
        etatModifie = true;
      },
    });
  }
  let flags = construireFlags();

  // --- État de jeu, mis à jour par entrerDansScene() à chaque transition ---
  // `hero` reste réaffectable pour la même raison que `flags` ci-dessus :
  // reinitialiserPartie() doit pouvoir repartir d'un héros neuf.
  let hero = creerHeros({ x: 0, y: 0, rayon: RAYON_HERO_PX, pvMax: 1 });
  hero.pv = save.hero.pv; // null tant que les stats dérivées n'ont pas encore tourné une fois
  let scene, decor, monstres, follet;
  let puzzlesEtat = {};
  let cooldownAttaqueHerosMs = 0;
  // §3.1 03_grotte-polish : compte à rebours du flash de l'anneau d'attaque,
  // purement visuel (dessiner() le convertit en donut translucide) — tiqué
  // dans mettreAJourCombat() comme cooldownAttaqueHerosMs, donc gelé sous UI
  // au même titre que le reste du combat.
  let anneauAttaqueMs = 0;
  // §3.2 03_grotte-polish, mécanisme 1 (frame d'ouverture consommée) :
  // mesuré au TOUT DÉBUT de maj(), avant toute logique de la frame courante
  // — capture donc l'état "au début de la frame précédente", jamais modifié
  // entre-temps par cette même frame (cf. commentaire détaillé dans maj()).
  let dialogueOuvertAuDebutFramePrecedente = false;

  // Écran de choix du follet (§3.1) : `null` = inactif, sinon { index }.
  // Navigation par front montant de MOVE.x (même principe que
  // ui/menu.js#creerNavigationMenu, sur l'axe X plutôt que Y ici, donc pas
  // réutilisable tel quel), confirmation sur ATTACK — tactile emprunte le
  // même chemin via le joystick + le bouton d'attaque, pas un tap dédié sur
  // le follet (simplification assumée : l'abstraction d'input existe déjà,
  // dupliquer un système de hit-test juste pour le tactile n'apporterait
  // rien).
  let choixFollet = null;
  let pousseeChoixPrecedente = 0;

  // Intro cinématique (§3.5 03_grotte-polish, palier 4) : `intro` couvre les
  // étapes 1 (clignements) + 2 (convergence), pilotées par temps seul
  // (aucun input lu, "non skippable") ; `depart` couvre l'étape 4 (les 2
  // follets non élus s'éloignent et s'éteignent), déclenchée par
  // confirmerChoixFollet() ci-dessous, indépendante du minuteur de l'intro
  // (le joueur choisit à son rythme en étape 3, l'écran existant). Toutes
  // deux `null` = inactif ; reconstruites à chaque entrée en scène (jamais
  // réutilisées, §4 : "reinitialiserPartie() pendant l'intro").
  let intro = null;
  let depart = null;

  function choixFolletActif() {
    return choixFollet !== null;
  }

  function demarrerChoixFollet() {
    dialogue.ouvrir(resoudreLignes('dlg_grotte_choix_follet', registre, i18n, null), {
      onFermer: () => {
        choixFollet = { index: 1 };
        pousseeChoixPrecedente = 0;
      },
    });
  }

  function confirmerChoixFollet() {
    const index = choixFollet.index;
    const companionId = ORDRE_CHOIX_FOLLET[index];
    choixFollet = null;
    save.hero.companion = companionId;
    flags.set('flag_follet_choisi');
    follet = creerFollet(companionId, hero);
    etatModifie = true;
    // Étape 4 (§3.5) : les 2 follets non élus s'éloignent et s'éteignent en
    // surimpression pendant que le dialogue d'enthousiasme s'ouvre — purement
    // visuel, indépendant de la logique de choix ci-dessus (déjà actée) ;
    // absent si la scène ne déclare pas d'intro (aucune scène hors la grotte
    // n'ouvre jamais un écran de choix, mais la garde coûte rien).
    const donneesScene = registre.obtenir('scenes', scene.id);
    if (donneesScene.intro) depart = creerDepart(donneesScene.intro, index);
    dialogue.ouvrir(resoudreLignes('dlg_grotte_follet_enthousiaste', registre, i18n, companionId));
  }

  function traiterChoixFollet(etat) {
    const x = etat.move.x;
    const poussee = x > SEUIL_POUSSEE_CHOIX ? 1 : x < -SEUIL_POUSSEE_CHOIX ? -1 : 0;
    if (poussee !== 0 && pousseeChoixPrecedente === 0) {
      choixFollet.index = Math.max(0, Math.min(ORDRE_CHOIX_FOLLET.length - 1, choixFollet.index + poussee));
    }
    pousseeChoixPrecedente = poussee;
    if (etat.attack.pressed) confirmerChoixFollet();
  }

  // Événements scriptés à l'entrée d'une scène (§3.1/§3.3) : un script par
  // id de scène, pas un système générique — cf. note en tête de fichier.
  function declencherEvenementsEntree(sceneId) {
    if (sceneId === 'scene_grotte_salle_1' && !flags.has('flag_follet_choisi')) {
      // Intro cinématique (§3.5) : rejouée ssi flag_follet_choisi absent
      // (nouvelle partie / reset), jamais à un respawn (le flag est déjà posé
      // dès qu'un follet a été choisi une fois). demarrerChoixFollet() n'est
      // appelée qu'à la fin de l'intro (main.js#maj()), pas ici.
      intro = creerIntro(registre.obtenir('scenes', sceneId).intro);
    }
    if (sceneId === 'scene_grotte_salle_2' && !flags.has('flag_grotte_monstre_tue') && monstres.length > 0) {
      dialogue.ouvrir(resoudreLignes('dlg_grotte_tuto_combat', registre, i18n, save.hero.companion));
    }
  }

  function entrerDansScene(sceneId, positionInitialePx) {
    scene = chargerScene(registre, sceneId);
    // Décor (§3.4 03_grotte-polish) : genererDecor() reste pur et ne connaît
    // que des id (visuel: string) — résolus ici une seule fois, à l'entrée en
    // scène (le décor est statique, jamais recalculé par frame), même
    // patron que monstresAffiches/puzzlesAffiches dans dessiner().
    decor = genererDecor(scene).map((d) => ({ ...d, visuel: registre.obtenir('visuels', d.visuel) }));

    const pos = positionInitialePx || {
      x: (scene.spawn.x + 0.5) * scene.tileSize,
      y: (scene.spawn.y + 0.5) * scene.tileSize,
    };
    hero.x = pos.x;
    hero.y = pos.y;
    save.hero.scene = sceneId;
    save.hero.x = hero.x;
    save.hero.y = hero.y;

    monstres = scene.spawns
      .filter((s) => s.condition == null || flags.evaluate(s.condition))
      .map((s) => creerMonstre(registre.obtenir('enemies', s.enemy), {
        x: (s.position.x + 0.5) * scene.tileSize,
        y: (s.position.y + 0.5) * scene.tileSize,
      }));

    follet = save.hero.companion ? creerFollet(save.hero.companion, hero) : null;
    puzzlesEtat = { ...etatInitialPuzzles(registre), ...save.puzzles };

    etatModifie = true;
    declencherEvenementsEntree(sceneId);
  }

  function hitboxHeros() {
    return { x: hero.x - hero.rayon, y: hero.y - hero.rayon, largeur: hero.rayon * 2, hauteur: hero.rayon * 2 };
  }

  function essayerInteraction() {
    for (const puzzleId of scene.interactifs) {
      const puzzle = registre.obtenir('puzzles', puzzleId);
      if (puzzle.type !== 'levier') continue;
      const px = (puzzle.position.x + 0.5) * scene.tileSize;
      const py = (puzzle.position.y + 0.5) * scene.tileSize;
      if (Math.hypot(hero.x - px, hero.y - py) <= DISTANCE_INTERACT_PX) {
        puzzlesEtat = activerLevier(registre, puzzlesEtat, puzzleId, flags);
        save.puzzles = puzzlesEtat;
        etatModifie = true;
        return;
      }
    }
  }

  function onMonstreMort(donneesEnnemi) {
    const table = registre.obtenir('loot_tables', donneesEnnemi.loot_table);
    const alea = creerGenerateur((Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0);
    const { item, quantite } = resoudreLoot(table, alea);
    if (item === 'eclats') save.inventaire.eclats += quantite;
    etatModifie = true;

    if (donneesEnnemi.id === 'enemy_grotte_rampant' && !flags.has('flag_grotte_monstre_tue')) {
      flags.set('flag_grotte_monstre_tue');
      dialogue.ouvrir(resoudreLignes('dlg_grotte_eclats', registre, i18n, save.hero.companion));
    }
  }

  function respawnDansLaGrotte() {
    // Mort = respawn dans la grotte, pour tout le jeu (§3.5/§10) : le point
    // de spawn de scene_grotte_salle_1 fait foi, jamais une constante.
    const spawnGrotte = registre.obtenir('scenes', 'scene_grotte_salle_1');
    entrerDansScene('scene_grotte_salle_1', {
      x: (spawnGrotte.spawn.x + 0.5) * spawnGrotte.tile_size,
      y: (spawnGrotte.spawn.y + 0.5) * spawnGrotte.tile_size,
    });
    Object.assign(hero, respawn(hero, { x: hero.x, y: hero.y }, hero.pvMax));
  }

  // Stats effectives du héros : calculées à chaque frame, y compris quand
  // une UI est ouverte (le HUD doit afficher des PV corrects dès la
  // cinématique d'ouverture, avant même le choix du follet) — seule la
  // progression du combat lui-même est gelée sous UI, pas ce calcul.
  function calculerStatsHeros() {
    const modificateurs = modificateursHeros(registre, save.hero.companion);
    const statsPrimaires = calculerStatsPrimaires(registre, modificateurs);
    const statsDerivees = calculerStatsDerivees(registre, statsPrimaires);
    hero.pvMax = statsDerivees.derivee_pv_max;
    if (hero.pv == null) hero.pv = hero.pvMax;
    return { statsPrimaires, statsDerivees };
  }

  function mettreAJourCombat(deltaMs, etatGameplay, statsPrimaires, statsDerivees) {
    const deltaS = deltaMs / 1000;
    anneauAttaqueMs = tickCooldown(anneauAttaqueMs, deltaMs);

    if (follet) {
      follet = mettreAJourFollet(follet, hero, monstres);
      follet = avancerFollet(follet, hero, monstres, deltaS);
    }

    monstres = monstres.map((monstre) => {
      if (monstre.mort) return monstre;
      const donneesEnnemi = registre.obtenir('enemies', monstre.enemyId);
      const { force, vitesse, dot } = statsEffectivesMonstre(registre, donneesEnnemi, follet);

      let suivant = approcherEnLigneDroite(monstre, hero.x, hero.y, vitesse, deltaS);
      suivant.cooldownAttaqueMs = tickCooldown(suivant.cooldownAttaqueMs, deltaMs);
      suivant.flashMs = tickCooldown(suivant.flashMs || 0, deltaMs);

      // portee_attaque est en pixels (contrairement à la portée d'arme du
      // héros, en tuiles — décision Xav, §3.5) : c'est une portée de contact
      // au corps du monstre, pas une donnée d'équipement à comparer entre
      // catalogues.
      const distanceHero = Math.hypot(hero.x - suivant.x, hero.y - suivant.y);
      if (distanceHero <= donneesEnnemi.portee_attaque && suivant.cooldownAttaqueMs <= 0) {
        hero.pv = Math.max(0, hero.pv - force);
        suivant.cooldownAttaqueMs = donneesEnnemi.cadence_attaque_ms;
      }

      if (dot) {
        suivant.dotAccumulateurMs += deltaMs;
        while (suivant.dotAccumulateurMs >= dot.intervalle_ms) {
          suivant.dotAccumulateurMs -= dot.intervalle_ms;
          suivant = infligerDegats(suivant, dot.valeur);
          // Le tick de DoT (Feu) doit être visible sans que le joueur frappe
          // (§3.1 : "y compris sous DoT Feu sans frapper", critère manuel §7).
          suivant.flashMs = FLASH_TOUCHE_MS;
        }
      } else {
        suivant.dotAccumulateurMs = 0;
      }

      if (suivant.mort && !monstre.mort) onMonstreMort(donneesEnnemi);
      return suivant;
    });

    cooldownAttaqueHerosMs = tickCooldown(cooldownAttaqueHerosMs, deltaMs);
    if (etatGameplay.attack.pressed && cooldownAttaqueHerosMs <= 0) {
      // Anneau d'attaque (§3.1) : à CHAQUE ATTACK effectif (hors cooldown),
      // même si rien n'est touché — un flash sur un coup qui ne part pas
      // (cooldown non écoulé, cas déjà exclu par ce `if`) ferait croire au
      // joueur qu'il a frappé alors qu'il n'a rien fait.
      anneauAttaqueMs = FLASH_ATTAQUE_MS;
      const arme = registre.obtenir('weapons', save.hero.equipement.arme);
      const idsTouches = new Set(resoudreAutoAttaque(hero, monstres, arme.portee, scene.tileSize).map((m) => m.id));
      if (idsTouches.size > 0) {
        monstres = monstres.map((monstre) => {
          if (!idsTouches.has(monstre.id)) return monstre;
          const suivant = infligerDegats(monstre, statsPrimaires.stat_force);
          suivant.flashMs = FLASH_TOUCHE_MS;
          if (suivant.mort && !monstre.mort) onMonstreMort(registre.obtenir('enemies', monstre.enemyId));
          return suivant;
        });
        cooldownAttaqueHerosMs = statsDerivees.derivee_cooldown_attaque_ms;
      }
    }

    if (hero.pv <= 0 && !hero.mort) {
      Object.assign(hero, mourir(hero, {
        onMort: () => {
          // Malus faim/soif [à brancher en Phase 3] : la survie n'existe pas
          // encore, cf. §3.5 — le point d'accroche est ici, pas dans le combat.
        },
      }));
      respawnDansLaGrotte();
    }

    save.hero.pv = hero.pv;
  }

  function maj(deltaMs) {
    const etatBrut = input.maj();

    // §3.2 03_grotte-polish, mécanisme 1 (frame d'ouverture consommée) :
    // mesuré ICI, avant toute logique de cette frame (combat, choix du
    // follet...) qui pourrait ouvrir un dialogue plus loin dans ce même
    // appel de maj(). `dialogueOuvertMaintenant` reflète donc l'état hérité
    // de la frame précédente ; `dialogueVientDeSOuvrir` est vrai exactement
    // une fois, à la première frame où dialogue.traiterInput() voit le
    // dialogue ouvert alors qu'il ne l'était pas au tour précédent — cause
    // racine : ATTACK sert à la fois à frapper et à confirmer, donc le même
    // appui qui tue un monstre (ouvrant dlg_grotte_eclats) ou confirme le
    // choix du follet (ouvrant le dialogue d'enthousiasme) ne doit jamais
    // aussi faire avancer/fermer ce dialogue tout neuf. Défense structurelle
    // au point de décision unique, indépendante de l'ordre des branches
    // ci-dessous — les mécanismes 2 et 3 de dialogue.js (machine à écrire +
    // armement) suffiraient déjà dans l'ordre actuel du code, ce point
    // protège un futur réordonnancement.
    const dialogueOuvertMaintenant = dialogue.estOuvert();
    const dialogueVientDeSOuvrir = dialogueOuvertMaintenant && !dialogueOuvertAuDebutFramePrecedente;
    dialogueOuvertAuDebutFramePrecedente = dialogueOuvertMaintenant;

    if (dialogueOuvertMaintenant) dialogue.maj(deltaMs);

    // Intro (§3.5, palier 4) : minuteur pur, AUCUN input lu (non skippable).
    // `introEtaitActive`/`departEtaitActif` sont capturés AVANT d'avancer
    // (plutôt que relire `intro`/`depart` après) pour que la frame où l'une
    // se termine reste elle aussi gelée pour le gameplay — sur cette frame
    // précise, `intro` peut déjà valoir `null` (transition vers
    // demarrerChoixFollet(), qui ouvre un dialogue) alors que le gameplay ne
    // doit pas non plus se réveiller un instant avant que ce dialogue ne soit
    // vu la frame suivante (même patron que dialogueVientDeSOuvrir ci-dessus).
    const introEtaitActive = intro !== null;
    if (intro) {
      intro = avancerIntro(intro, deltaMs);
      if (intro.terminee) {
        intro = null;
        demarrerChoixFollet();
      }
    }
    const departEtaitActif = depart !== null;
    if (depart) {
      depart = avancerDepart(depart, deltaMs);
      if (depart.terminee) depart = null;
    }

    if (
      etatBrut.menu.pressed && !menu.estOuvert() && !dialogueOuvertMaintenant &&
      !choixFolletActif() && !introEtaitActive && !departEtaitActif
    ) {
      menu.ouvrir();
    }

    // Point unique de priorité UI/gameplay (patron du menu, §3.7 : étendu à
    // "une UI est ouverte" = menu OU dialogue OU choix du follet OU intro OU
    // départ) : le gameplay ne voit jamais les verbes bruts pendant qu'une UI
    // les capte.
    const uiOuverte = menu.estOuvert() || dialogueOuvertMaintenant || choixFolletActif() || introEtaitActive || departEtaitActif;
    if (menu.estOuvert()) menu.traiterInput(etatBrut);
    else if (dialogueOuvertMaintenant) dialogue.traiterInput(dialogueVientDeSOuvrir ? etatNeutre(etatBrut) : etatBrut);
    else if (choixFolletActif()) traiterChoixFollet(etatBrut);

    const etatGameplay = uiOuverte ? etatNeutre(etatBrut) : etatBrut;
    const { statsPrimaires, statsDerivees } = calculerStatsHeros();

    const deltaS = deltaMs / 1000;
    const dx = etatGameplay.move.x * VITESSE_HERO_PX_S * deltaS;
    const dy = etatGameplay.move.y * VITESSE_HERO_PX_S * deltaS;
    if (dx !== 0 || dy !== 0) {
      const resultat = resoudreDeplacement(scene, hitboxHeros(), dx, dy, flags.has);
      hero.x = resultat.x + hero.rayon;
      hero.y = resultat.y + hero.rayon;
      save.hero.x = hero.x;
      save.hero.y = hero.y;
      etatModifie = true;
    }

    // Le temps de jeu est en pause sous UI (§4) : ni combat, ni énigme, ni
    // portail ne doit progresser pendant qu'une UI est ouverte.
    if (!uiOuverte) {
      if (etatGameplay.interact.pressed) essayerInteraction();
      mettreAJourCombat(deltaMs, etatGameplay, statsPrimaires, statsDerivees);

      const portail = portailFranchi(scene, hitboxHeros(), flags);
      if (portail) {
        entrerDansScene(portail.cible, {
          x: (portail.spawn.x + 0.5) * registre.obtenir('scenes', portail.cible).tile_size,
          y: (portail.spawn.y + 0.5) * registre.obtenir('scenes', portail.cible).tile_size,
        });
      }
    }

    autosaveSiNecessaire(performance.now());
  }

  let dernierAutosave = performance.now();
  function autosaveSiNecessaire(tMs) {
    if (etatModifie && tMs - dernierAutosave > INTERVALLE_AUTOSAVE_MS) {
      sauvegarder(store, save);
      dernierAutosave = tMs;
      etatModifie = false;
    }
  }

  function dessinerEcranChoixFollet() {
    if (!choixFolletActif()) return;
    // Positions à 480x270 (résolution logique validée, diagnostic
    // SD_ui-lisibilite §9) : mêmes proportions qu'avant (×0,75 de l'ancien
    // 640x360), arrangement toujours arbitraire (§3.1, sans effet gameplay).
    ORDRE_CHOIX_FOLLET.forEach((id, i) => {
      const companion = registre.obtenir('companions', id);
      const visuel = registre.obtenir('visuels', companion.render.visuel);
      const x = POSITIONS_ECRAN_FOLLETS[i];
      const y = Y_ECRAN_FOLLETS;
      const taille = i === choixFollet.index ? 20 : TAILLE_FOLLET_REPOS_PX;
      dessinerVisuel(ctxLogique, visuel, x, y, {
        teinte: companion.render.couleur,
        echelle: taille / TAILLE_REFERENCE_FOLLET_PX,
      });
      if (i === choixFollet.index) {
        ctxLogique.strokeStyle = '#ffffff';
        ctxLogique.beginPath();
        ctxLogique.arc(x, y, 28, 0, Math.PI * 2);
        ctxLogique.stroke();
      }
    });
  }

  // Étapes 1-2 de l'intro (§3.5) : follets en lévitation/convergence vers les
  // 3 positions de l'écran de choix — jamais les formes de dessinerVisuel
  // dupliquées ailleurs, seule la position/alpha changent d'un appel à
  // l'autre (cf. src/intro.js#etatRendu, pur).
  function dessinerIntroConvergence() {
    if (!intro) return null;
    const cibles = POSITIONS_ECRAN_FOLLETS.map((x) => ({ x, y: Y_ECRAN_FOLLETS }));
    const rendu = etatRenduIntro(intro, cibles);
    if (rendu.follets) {
      rendu.follets.forEach((f, i) => {
        const companion = registre.obtenir('companions', ORDRE_CHOIX_FOLLET[i]);
        const visuel = registre.obtenir('visuels', companion.render.visuel);
        dessinerVisuel(ctxLogique, visuel, f.x, f.y, {
          teinte: companion.render.couleur,
          echelle: TAILLE_FOLLET_REPOS_PX / TAILLE_REFERENCE_FOLLET_PX,
          alpha: f.alpha,
        });
      });
    }
    return rendu;
  }

  // Étape 4 de l'intro (§3.5) : les 2 follets non élus s'éloignent et
  // s'éteignent depuis leur position sur l'écran de choix — l'élu n'est
  // jamais redessiné ici, le vrai follet (companion.js, déjà `follet`) le
  // remplace (dessinerScene le dessine chaque frame comme toute entité).
  function dessinerDepart() {
    if (!depart) return;
    const cibles = POSITIONS_ECRAN_FOLLETS.map((x) => ({ x, y: Y_ECRAN_FOLLETS }));
    for (const { index, x, y, alpha } of etatRenduDepart(depart, cibles)) {
      const companion = registre.obtenir('companions', ORDRE_CHOIX_FOLLET[index]);
      const visuel = registre.obtenir('visuels', companion.render.visuel);
      dessinerVisuel(ctxLogique, visuel, x, y, {
        teinte: companion.render.couleur,
        echelle: TAILLE_FOLLET_REPOS_PX / TAILLE_REFERENCE_FOLLET_PX,
        alpha,
      });
    }
  }

  function dessiner() {
    const camera = calculerCamera({
      cibleX: hero.x,
      cibleY: hero.y,
      largeurScene: scene.width * scene.tileSize,
      hauteurScene: scene.height * scene.tileSize,
      largeurVue: RESOLUTION_LOGIQUE.largeur,
      hauteurVue: RESOLUTION_LOGIQUE.hauteur,
    });

    const companionActif = follet ? registre.obtenir('companions', follet.companionId) : null;
    const heroVisuel = registre.obtenir('visuels', VISUEL_HEROS_ID);

    // Étiquette ennemi (§4 diagnostic SD_ui-lisibilite) : nom localisé résolu
    // ici (main.js a i18n + registre), render.js ne fait que dessiner un
    // texte déjà traduit — pas de niveau, le champ n'existe pas en Phase 1
    // (ne pas inventer une stat, cf. la fiche). `visuel` (§3.3) : résolu ici
    // pour la même raison — render.js n'ouvre jamais visuels.json par id.
    const monstresAffiches = monstres.map((m) => {
      const donneesEnnemi = registre.obtenir('enemies', m.enemyId);
      return {
        ...m,
        label: i18n.t(donneesEnnemi.label_key),
        visuel: registre.obtenir('visuels', donneesEnnemi.render.visuel),
        // §3.1 03_grotte-polish : barre de PV visible ssi "actif" (engagé ou
        // déjà touché) — jamais un monstre inerte à distance.
        actif: estMonstreActif(m, follet),
      };
    });

    // Leviers (§2.1/§3.3) : seules les instances "levier" de scene.interactifs
    // se dessinent (une "sequence" ne référence que des leviers déjà rendus
    // par ailleurs) — même source de vérité que essayerInteraction() pour la
    // position, puzzlesEtat pour l'état on/off.
    const puzzlesAffiches = scene.interactifs
      .map((id) => registre.obtenir('puzzles', id))
      .filter((p) => p.type === 'levier')
      .map((p) => ({
        x: (p.position.x + 0.5) * scene.tileSize,
        y: (p.position.y + 0.5) * scene.tileSize,
        actif: !!puzzlesEtat[p.id]?.actif,
        visuel: registre.obtenir('visuels', p.render.visuel),
      }));

    // Anneau d'attaque (§3.1) : converti en px logiques ici (main.js a le
    // registre pour résoudre l'arme équipée) — render.js ne connaît que
    // [rayonMin, rayonMax, alpha], jamais weapons.json.
    const arme = registre.obtenir('weapons', save.hero.equipement.arme);
    const anneauAttaque = anneauAttaqueMs > 0 ? {
      rayonMin: arme.portee.min * scene.tileSize,
      rayonMax: arme.portee.max * scene.tileSize,
      alpha: anneauAttaqueMs / FLASH_ATTAQUE_MS,
    } : null;

    dessinerScene(ctxLogique, {
      scene,
      decor,
      camera,
      hero,
      heroVisuel,
      // Héros neutre avant le choix du follet, teinté à sa couleur ensuite
      // (§3.4 03_grotte-polish) — jamais combinées, jamais une 2ᵉ silhouette.
      heroTeinte: companionActif ? companionActif.render.couleur : COULEUR_HERO_NEUTRE,
      monstres: monstresAffiches,
      follet: follet && companionActif ? {
        x: follet.x,
        y: follet.y,
        visuel: registre.obtenir('visuels', companionActif.render.visuel),
        couleur: companionActif.render.couleur,
      } : null,
      puzzles: puzzlesAffiches,
      estFlagActif: flags.has,
      anneauAttaque,
    });
    dessinerObscurite(ctxLogique, {
      scene,
      camera,
      follet: follet ? { x: follet.x, y: follet.y } : null,
      rayonLumiereFollet: companionActif ? companionActif.rayon_lumiere : 0,
      couleurLumiereFollet: companionActif ? companionActif.render.couleur : null,
    });
    // Aura du follet (§2 diagnostic SD_ui-lisibilite, pointillée depuis §3.4
    // 03_grotte-polish/AURA_TRAIT) : trait fin translucide en pointillés,
    // jamais un disque plein ni un trait plein épais — purement visuel
    // (indication de portée d'engagement), aucun changement à la distance
    // d'engagement réelle de companion.js#DISTANCE_ENGAGEMENT_PX (hors
    // scope, gameplay/équilibrage).
    if (follet && companionActif) {
      ctxLogique.save();
      ctxLogique.strokeStyle = `rgba(255,255,255,${AURA_TRAIT.alpha})`;
      ctxLogique.lineWidth = AURA_TRAIT.largeur;
      ctxLogique.setLineDash(AURA_TRAIT.pointilles);
      ctxLogique.beginPath();
      ctxLogique.arc(follet.x - camera.x, follet.y - camera.y, companionActif.rayon_aura, 0, Math.PI * 2);
      ctxLogique.stroke();
      ctxLogique.restore();
    }
    dessinerHud(ctxLogique, {
      i18n,
      pv: hero.pv || 0,
      pvMax: hero.pvMax || 1,
      eclats: save.inventaire.eclats,
      companion: companionActif,
      visuelFollet: companionActif ? registre.obtenir('visuels', companionActif.render.visuel) : null,
      tactileActif: input.tactileActif(),
    });
    dessinerEcranChoixFollet();
    const renduIntro = dessinerIntroConvergence();
    dessinerDepart();
    if (dialogue.estOuvert()) dessinerDialogue(ctxLogique, dialogue.ligneCourante());

    // Paupières (§3.5 étape 1) : rideau de cinématique, dessiné en TOUT
    // DERNIER — il doit couvrir la scène, le HUD et même l'écran de choix
    // (inactif à ce stade, mais la règle reste "toujours en dernier" pour ne
    // jamais dépendre de l'ordre des autres calques).
    if (renduIntro && renduIntro.etape === ETAPE_CLIGNEMENTS) {
      dessinerPaupieres(ctxLogique, renduIntro.paupieres);
    }

    presenter(ctxVisible, canvasLogique);
  }

  const positionSauvegardee = save.hero.x || save.hero.y ? { x: save.hero.x, y: save.hero.y } : null;
  entrerDansScene(save.hero.scene, positionSauvegardee);

  // Réinitialisation depuis le menu (diagnostic
  // SD_grotte-blocage-choix-follet_2026-09-15.md, §B) : retrouver le cold
  // open à volonté, sans rechargement de page. Ordre non négociable (§B de
  // la fiche) — effacer le store AVANT de remettre l'état en mémoire à zéro,
  // puis seulement réautoriser les sauvegardes : sinon une autosave ou le
  // visibilitychange de demarrerJeu() pourrait réécrire l'ancien état par
  // dessus une réinitialisation déjà actée dans le store, ou inversement
  // resauvegarder un état neuf avant qu'il ne soit complet.
  async function reinitialiserPartie() {
    await reinitialiserSauvegarde(store);
    // `save` reste la même référence tout du long (demarrerJeu() et le
    // callback exporterSauvegarde() la connaissent déjà) : on la MUTE en
    // place plutôt que de la réaffecter, jamais un nouvel objet.
    Object.assign(save, saveNeuve());
    flags = construireFlags();
    dialogue.fermer();
    choixFollet = null;
    pousseeChoixPrecedente = 0;
    intro = null;
    depart = null;
    cooldownAttaqueHerosMs = 0;
    anneauAttaqueMs = 0;
    dialogueOuvertAuDebutFramePrecedente = false;
    hero = creerHeros({ x: 0, y: 0, rayon: RAYON_HERO_PX, pvMax: 1 });
    hero.pv = save.hero.pv; // null : recalculé au premier calculerStatsHeros(), comme au tout premier boot
    etatModifie = false;
    dernierAutosave = performance.now();
    // Rejoue la cinématique depuis le début (§3.1) : entrerDansScene()
    // relance declencherEvenementsEntree(), qui rouvre la narration du choix
    // du follet puisque flag_follet_choisi vient d'être remis à zéro.
    entrerDansScene(save.hero.scene, null);
  }

  // Accesseurs de lecture seule, additifs : jamais lus par demarrerJeu() ni
  // par le jeu réel, seulement par les tests headless (diagnostic
  // SD_grotte-blocage-choix-follet_2026-09-15.md) pour observer l'état sans
  // dupliquer la logique de l'orchestrateur dans le test.
  return {
    maj,
    dessiner,
    choixFolletActif,
    reinitialiserPartie,
    obtenirHero: () => hero,
    obtenirFollet: () => follet,
    obtenirScene: () => scene,
    obtenirMonstres: () => monstres,
    obtenirChoixFollet: () => choixFollet,
    obtenirIntro: () => intro,
    obtenirDepart: () => depart,
    obtenirSave: () => save,
    dialogueOuvert: () => dialogue.estOuvert(),
    dialogueLigneCourante: () => dialogue.ligneCourante(),
    obtenirAnneauAttaqueMs: () => anneauAttaqueMs,
  };
}

export async function demarrerJeu() {
  const noms = Object.keys(SCHEMAS);
  const [dictionnaires, { donnees, erreurs: erreursChargement }] = await Promise.all([
    chargerLocalesDepuisReseau('locales'),
    chargerCataloguesDepuisReseau('data', noms),
  ]);

  const erreursCles = verifierJeuxDeCles(dictionnaires);
  const erreursValidation = erreursChargement.length ? [] : validerCatalogues(donnees);
  const toutesErreurs = [...erreursChargement, ...erreursValidation, ...erreursCles];

  if (toutesErreurs.length > 0) {
    afficherErreurBoot(toutesErreurs);
    return;
  }

  const registre = construireRegistre(donnees);
  const i18n = creerI18n(dictionnaires, 'fr');

  const store = creerStoreIndexedDB();
  const { payload: save } = await chargerSave(store);
  i18n.definirLangue(save.settings.lang);

  // Une sauvegarde d'une session antérieure peut pointer vers une scène qui
  // n'existe plus (ex. scene_salle_test de la Phase 0, remplacée par la
  // grotte en Phase 1) : ce n'est pas une sauvegarde corrompue (le schéma
  // est valide), donc save.js#migrer ne l'attrape pas — repli explicite sur
  // la scène de départ courante plutôt qu'un crash au chargement de scène.
  if (!registre.existe('scenes', save.hero.scene)) {
    save.hero.scene = 'scene_grotte_salle_1';
    save.hero.x = 0;
    save.hero.y = 0;
  }

  // --- Canvas : résolution logique + présentation à l'échelle (§2.2) ---
  const canvasVisible = document.getElementById('jeu');
  const ctxVisible = canvasVisible.getContext('2d');
  const canvasLogique = document.createElement('canvas');
  canvasLogique.width = RESOLUTION_LOGIQUE.largeur;
  canvasLogique.height = RESOLUTION_LOGIQUE.hauteur;
  const ctxLogique = canvasLogique.getContext('2d');

  function ajusterTailleCanvas() {
    canvasVisible.width = window.innerWidth;
    canvasVisible.height = window.innerHeight;
  }
  window.addEventListener('resize', ajusterTailleCanvas);
  ajusterTailleCanvas();

  // --- Input : clavier + manette + tactile fusionnés (§2.3) ---
  const sourceTactile = creerSourceTactile(canvasVisible, {
    // Seule source de vérité pour écran -> logique (diagnostic
    // SD_ui-lisibilite §3c) : versCoordonneesLogiques() est la même fonction
    // pure, testée, dont presenter()/calculerRectanglePresentation() dessine
    // la réciproque (logique -> écran) — plus de formule recopiée ici.
    versLogique(clientX, clientY) {
      const rect = calculerRectanglePresentation(canvasVisible.width, canvasVisible.height);
      return versCoordonneesLogiques(clientX, clientY, rect);
    },
  });
  const input = creerCoucheInput({
    sourceClavier: creerSourceClavier(window),
    sourceManette: creerSourceManette(navigator),
    sourceTactile,
  });

  const menu = initialiserMenu({
    document,
    i18n,
    exporterSauvegarde() {
      const blob = new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const lien = document.createElement('a');
      lien.href = url;
      lien.download = 'rpg_v2_save.json';
      lien.click();
      URL.revokeObjectURL(url);
    },
    async importerSauvegarde(fichier) {
      const texte = await fichier.text();
      await importerSauvegardeDansStore(store, JSON.parse(texte));
      window.location.reload();
    },
  });

  const dialogue = creerDialogue();

  const orchestrateur = creerOrchestrateurGrotte({
    registre, i18n, save, store, dialogue, menu, input, ctxLogique, ctxVisible, canvasLogique,
  });
  // Dépendance circulaire résolue par un point de couture explicite (§B du
  // diagnostic) : le menu (construit avant l'orchestrateur, qui en a besoin
  // pour maj()) ne connaît reinitialiserPartie() qu'après coup, via ce
  // setter — jamais en important main.js depuis ui/menu.js.
  menu.definirActionReinitialiser(orchestrateur.reinitialiserPartie);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) sauvegarder(store, save);
  });

  creerBoucle({ maj: orchestrateur.maj, dessiner: orchestrateur.dessiner }).demarrer();
}

if (typeof window !== 'undefined') {
  demarrerJeu();
}
