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
import { chargerScene, resoudreDeplacement, portailFranchi, trouverPositionLibrePlusProche } from './scene.js';
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
import { calculerStatsPrimaires, calculerStatsDerivees, appliquerModulateurSurvie } from './stats.js';
import {
  modificateursHeros, statsEffectivesMonstre, tickBuffsActifs, ajouterBuffActif, modificateursBuffsActifs,
} from './status.js';
import { creerHeros, creerMonstre, approcherEnLigneDroite, infligerDegats, mourir, respawn, reconcilierPvMax } from './entities.js';
import { resoudreAutoAttaque, tickCooldown, estMonstreActif, FLASH_ATTAQUE_MS, FLASH_TOUCHE_MS } from './combat.js';
import {
  creerFollet, mettreAJourEtat as mettreAJourFollet, avancerPosition as avancerFollet, DISTANCE_ENGAGEMENT_PX,
} from './companion.js';
import { creerGenerateur, resoudreLoot } from './loot.js';
import { etatInitial as etatInitialPuzzles, activerLevier } from './puzzles.js';
import { creerDialogue, resoudreLignes } from './dialogue.js';
import {
  creerIntro, avancerIntro, etatRendu as etatRenduIntro,
  creerDepart, avancerDepart, etatRenduDepart, ETAPE_CLIGNEMENTS,
} from './intro.js';
import { peutRecolter, trouverRessourceProche } from './resources.js';
import { ajouterItem, retirerItem } from './inventory.js';
import { remplirItemsSol, trouverItemProche, ramasser, planifierRespawn, tickRespawns } from './ground_items.js';
import { calculerOpaciteToit, distanceAuRectangle, resoudreEmpreinteInteractif } from './structures.js';
import { avancerHeure, opaciteAHeure } from './daynight.js';
import { armerAudio, definirMusiqueActive } from './audio.js';
import { creerEtatIndices } from './hints.js';
import { estExpire, poserCooldown, tempsRestantMs } from './cooldowns.js';
import { peutFabriquer, fabriquer, recettesDeStation, recetteDecouverte } from './recipes.js';
import {
  decroitre as decroitreSurvie, consommer as consommerSurvie, appliquerMalusRespawn,
  calculerModulateur as calculerModulateurSurvie, configSurvie, jaugeSousLeSeuil,
} from './survival.js';
import { crediter as crediterXp } from './xp.js';
import { initialiserMenu } from './ui/menu.js';
import { dessinerHud } from './ui/hud.js';
import { dessinerHudHints } from './ui/hud_hints.js';
import { dessinerDialogue } from './ui/dialogue_box.js';

// Provisoires, non validés en jeu par Xav — seuils uniques, commentés ici.
// VITESSE_HERO_PX_S est retirée en Palier C (specs/04_maison-interieur.md
// §3.3) : la vitesse de déplacement vient désormais de
// derivee_vitesse_deplacement_px_s (stats_derivees.json, stat_agilite) — un
// seul chemin de calcul, donc le modulateur de survie la ralentit sans code
// dédié, comme les dégâts et la cadence d'attaque.
const RAYON_HERO_PX = 10;
const INTERVALLE_AUTOSAVE_MS = 30000;
const DISTANCE_INTERACT_PX = 28;
// Respawn différé des items au sol (Palier B §3.2) : défaut appliqué quand
// l'item ne surcharge pas `spawn.respawn_ms` — même esprit que
// cooldown_ms par défaut de recipes.js.
const RESPAWN_ITEM_DEFAUT_MS = 60000;
// Cooldown du puits (Palier C §3.3, §10 "règle anti-spam") : pas de champ
// dédié dans stations.json (un seul rôle "eau" existe), donc un seuil
// unique ici plutôt qu'un catalogue à une seule entrée.
const COOLDOWN_PUITS_MS = 60000;

// 03_maison-exterieur §3.4 : RAYON_EFFACEMENT_TOIT = rayon_lumiere du follet
// actif x ce facteur ("un peu plus grand que le halo", acté Xav 2026-09-16) —
// le facteur et la marge de fondu restent provisoires, Xav les équilibre au
// ressenti. `RAYON_TOIT_FOLLET_ABSENT_PX` couvre le cas théorique où la
// maison serait visitée sans compagnon (jamais possible en jeu réel après la
// Grotte, gardé par prudence plutôt que par nécessité observée).
const FACTEUR_EFFACEMENT_TOIT = 1.25;
const MARGE_FONDU_TOIT_PX = 30;
const RAYON_TOIT_FOLLET_ABSENT_PX = 90;

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
  // §3.6 03_maison-exterieur : callback déclenché UNE fois, au premier verbe
  // abstrait vu (manette comprise — le clavier/tactile/souris sont couverts
  // par des écouteurs DOM directs dans demarrerJeu(), cf. journal) ; no-op
  // par défaut pour que les tests headless n'aient rien à fournir.
  onPremierGeste = () => {},
}) {
  let etatModifie = false;

  // Silhouettes de tuiles (03_maison-exterieur §3.3) : résolu UNE fois (pas
  // par scène, contrairement à `decor` — tiles.json est un catalogue global)
  // à partir du registre, jamais recalculé par frame. render.js ne connaît
  // que dessinerVisuel, jamais visuels.json par id (§3.3 grotte-polish).
  const visuelsTuiles = new Map(
    registre
      .tous('tiles')
      .filter((t) => t.render && t.render.visuel)
      .map((t) => [t.id, registre.obtenir('visuels', t.render.visuel)])
  );

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

  // Indices de commande (specs/04_indices-commandes.md) : les flags qu'il
  // pose vivent dans le même registre de flags que le reste (§3.10 :
  // persistés, "un reset le remontre, c'est voulu"), mais `indices` porte
  // aussi un état transitoire à lui (l'indice actuellement affiché) —
  // `reinitialiserPartie()` le reconstruit donc au même titre que `flags`,
  // sinon un indice affiché au moment du reset resterait figé "actif" alors
  // que son flag vient d'être effacé.
  let indices = creerEtatIndices(registre);

  // --- État de jeu, mis à jour par entrerDansScene() à chaque transition ---
  // `hero` reste réaffectable pour la même raison que `flags` ci-dessus :
  // reinitialiserPartie() doit pouvoir repartir d'un héros neuf.
  let hero = creerHeros({ x: 0, y: 0, rayon: RAYON_HERO_PX, pvMax: 1 });
  hero.pv = save.hero.pv; // null tant que les stats dérivées n'ont pas encore tourné une fois
  let scene, decor, monstres, follet;
  let puzzlesEtat = {};
  // Objets au sol de la scène courante (03_maison-exterieur §3.3) :
  // { [itemId]: [{x,y}, ...] }, reconstruit/complété à chaque entrée en
  // scène (ground_items.js#remplirItemsSol), persisté par scène dans
  // save.monde.items_sol. `compteurRamassages` n'a besoin d'être unique que
  // DANS la session (les positions elles-mêmes sont ce qui est persisté,
  // §3.7) — jamais lu depuis la sauvegarde.
  let itemsSol = {};
  let compteurRamassages = 0;
  // Respawns différés (Palier B §3.2) : { [itemId]: [msRestant, ...] },
  // persisté par scène dans save.monde.respawns_en_attente — même patron
  // que itemsSol ci-dessus.
  let respawnsEnAttente = {};
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

  // Même condition que `uiOuverte` dans maj() (§3.7), relue ici en dehors de
  // maj() : dessiner() est appelée séparément de maj() (creerBoucle, cf.
  // render.js) et n'a donc pas accès à la variable locale `uiOuverte` de la
  // frame en cours — recalculer depuis l'état courant est équivalent pour un
  // simple choix d'affichage (contrairement à `dialogueVientDeSOuvrir`, qui,
  // lui, a une sémantique de frame précise réservée au routage des inputs).
  function uiOuverteMaintenant() {
    return menu.estOuvert() || dialogue.estOuvert() || choixFolletActif() || intro !== null || depart !== null;
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

  // Déclenché en continu (pas seulement à l'entrée en scène) : une zone se
  // découvre en y marchant, jamais à la traversée d'un portail précis —
  // mapping explicite type de zone -> flag, même esprit que
  // declencherEvenementsEntree ci-dessus (script propre à cette carte, pas un
  // système généralisé de déclencheurs, cf. §6/journal Phase 1).
  const FLAG_PAR_TYPE_DE_ZONE = { maison: 'flag_maison_decouverte', jardin: 'flag_jardin_decouvert' };
  function verifierEntreesDeZone() {
    const tx = Math.floor(hero.x / scene.tileSize);
    const ty = Math.floor(hero.y / scene.tileSize);
    for (const zone of scene.zones) {
      const flagId = FLAG_PAR_TYPE_DE_ZONE[zone.type];
      if (!flagId || flags.has(flagId)) continue;
      const { x, y, w, h } = zone.rect;
      if (tx >= x && tx < x + w && ty >= y && ty < y + h) flags.set(flagId);
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
    // specs/04_stations-proportions-collision.md §4 : une sauvegarde
    // antérieure peut pointer vers une position devenue solide (station
    // agrandie depuis) — repousse vers la case libre la plus proche, une
    // fois, en le loguant ; ne bloque jamais le joueur au boot. Coût
    // négligeable même quand rien n'est solide (premier test sort
    // immédiatement, cf. trouverPositionLibrePlusProche).
    const positionLibre = trouverPositionLibrePlusProche(scene, pos.x, pos.y, flags.has);
    if (positionLibre.x !== pos.x || positionLibre.y !== pos.y) {
      console.warn(
        `main.js#entrerDansScene : héros repoussé hors d'une empreinte solide en scène "${sceneId}" `
        + `(${pos.x},${pos.y}) -> (${positionLibre.x},${positionLibre.y})`
      );
    }
    hero.x = positionLibre.x;
    hero.y = positionLibre.y;
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

    // Objets au sol (03_maison-exterieur §3.3) : positions déjà persistées
    // pour cette scène reprises telles quelles (§3.7 : "recharger la page ne
    // rebat pas les cartes"), complétées si besoin (première visite, ou stock
    // partiel après une régénération ratée faute de place). Une scène sans
    // aucune zone de spawn en commun avec un item (la grotte) obtient un
    // `itemsSol` vide, sans erreur.
    itemsSol = remplirItemsSol(scene, registre.tous('items'), save.monde.items_sol[sceneId] || {}, compteurRamassages);
    save.monde.items_sol[sceneId] = itemsSol;
    // Respawns différés (Palier B §3.2) : repris tels quels (continuent de
    // courir en temps actif même après un rechargement de page).
    respawnsEnAttente = save.monde.respawns_en_attente[sceneId] || {};
    save.monde.respawns_en_attente[sceneId] = respawnsEnAttente;

    etatModifie = true;
    declencherEvenementsEntree(sceneId);
  }

  function hitboxHeros() {
    return { x: hero.x - hero.rayon, y: hero.y - hero.rayon, largeur: hero.rayon * 2, hauteur: hero.rayon * 2 };
  }

  // specs/04_stations-proportions-collision.md §3 : rectangle ABSOLU (px
  // logiques) d'un interactif positionné (levier/station), pour mesurer le
  // seuil d'interaction au bord plutôt qu'au centre — même fonction pour
  // essayerInteraction() et verifierIndicesNiveau() (INTERACT), jamais deux
  // calculs qui pourraient diverger. Un levier (empreinte nulle par défaut,
  // cf. structures.js) redonne un rectangle ponctuel, comportement identique
  // à avant cette fiche.
  function rectangleInteractif(puzzle) {
    const visuel = registre.obtenir('visuels', puzzle.render.visuel);
    const rel = resoudreEmpreinteInteractif(puzzle, visuel);
    const cx = (puzzle.position.x + 0.5) * scene.tileSize;
    const cy = (puzzle.position.y + 0.5) * scene.tileSize;
    return { x: cx + rel.x, y: cy + rel.y, w: rel.w, h: rel.h };
  }

  // 03_maison-exterieur §3.2/§3.3 étend l'interaction à 4 cibles possibles,
  // essayées dans cet ordre (le premier trouvé à portée gagne, un seul par
  // appui) : levier/station de scene.interactifs (déjà des entités
  // positionnées), objet au sol, puis tuile-ressource (scan de grille, donc
  // en dernier — la moins probable d'être ambiguë avec autre chose).
  function essayerInteraction() {
    for (const puzzleId of scene.interactifs) {
      const puzzle = registre.obtenir('puzzles', puzzleId);
      // §3 : seuil mesuré au bord de l'empreinte, pas au centre (une station
      // ×2,1 solide dépasserait sinon DISTANCE_INTERACT_PX depuis l'extérieur
      // de son propre bord) — un levier (empreinte nulle) redonne exactement
      // la distance au centre d'avant cette fiche.
      if (distanceAuRectangle(hero.x, hero.y, rectangleInteractif(puzzle)) > DISTANCE_INTERACT_PX) continue;
      if (puzzle.type === 'levier') {
        puzzlesEtat = activerLevier(registre, puzzlesEtat, puzzleId, flags);
        save.puzzles = puzzlesEtat;
        etatModifie = true;
        return;
      }
      if (puzzle.type === 'station_placeholder') {
        dialogue.ouvrir(resoudreLignes(puzzle.dialogue, registre, i18n, save.hero.companion));
        return;
      }
      if (puzzle.type === 'station') {
        essayerStation(puzzle);
        return;
      }
    }

    const itemProche = trouverItemProche(itemsSol, hero, DISTANCE_INTERACT_PX);
    if (itemProche) {
      const itemDef = registre.obtenir('items', itemProche.itemId);
      const resultat = ajouterItem(save.inventaire.items, itemProche.itemId, 1, itemDef.stack_max);
      // Poche pleine (§4 edge case) : l'item reste au sol, rien d'autre ne se
      // passe — pas de toast "poche pleine" en Phase 2 (D4⑤ formalisé plus
      // tard), un simple non-ramassage silencieux suffit pour cette session.
      if (resultat.ajoute > 0) {
        save.inventaire.items = resultat.inventaire;
        compteurRamassages += 1;
        // Palier B (§3.2) : retrait immédiat, régénération DIFFÉRÉE (jamais
        // plus un tirage immédiat comme en Phase 2) — respawn_ms de l'item,
        // ou le défaut de catalogue.
        itemsSol = ramasser(itemsSol, itemProche.itemId, itemProche.index);
        save.monde.items_sol[scene.id] = itemsSol;
        const respawnMs = (itemDef.spawn && itemDef.spawn.respawn_ms) || RESPAWN_ITEM_DEFAUT_MS;
        respawnsEnAttente = planifierRespawn(respawnsEnAttente, itemProche.itemId, respawnMs);
        save.monde.respawns_en_attente[scene.id] = respawnsEnAttente;
        if (!flags.has('flag_premier_ramassage')) {
          flags.set('flag_premier_ramassage');
          dialogue.ouvrir(resoudreLignes('dlg_premier_ramassage', registre, i18n, save.hero.companion));
        }
        etatModifie = true;
      }
      return;
    }

    const ressourceProche = trouverRessourceProche(scene, hero, DISTANCE_INTERACT_PX);
    if (ressourceProche) {
      const donneesRessource = registre.obtenir('resources', ressourceProche.ressourceId);
      // Palier B (§3.2) : peutRecolter() enfin branché sur la poche réelle —
      // sans l'outil, comportement Phase 2 inchangé (dialogue "pas encore").
      if (!peutRecolter(donneesRessource, save.inventaire.items)) {
        dialogue.ouvrir(resoudreLignes(donneesRessource.dialogue_bloque, registre, i18n, save.hero.companion));
        return;
      }
      // Cooldown PAR TUILE (§9 point ouvert : "par tuile", deux arbres = deux
      // cooldowns) — clé stable tant que la tuile ne bouge pas.
      const cleCooldown = `res:${scene.id}:${ressourceProche.tx}:${ressourceProche.ty}`;
      if (!estExpire(save.cooldowns, cleCooldown, donneesRessource.cooldown_ms, save.monde.heure)) {
        dialogue.ouvrir(resoudreLignes('dlg_ressource_cooldown', registre, i18n, save.hero.companion));
        return;
      }
      const itemDefProduit = registre.obtenir('items', donneesRessource.item_produit);
      const resultatRecolte = ajouterItem(save.inventaire.items, donneesRessource.item_produit, 1, itemDefProduit.stack_max);
      save.inventaire.items = resultatRecolte.inventaire;
      save.cooldowns = poserCooldown(save.cooldowns, cleCooldown, save.monde.heure);
      etatModifie = true;
    }
  }

  // Palier A/C (§3.1/§3.3) : une station réelle se comporte selon le rôle de
  // son TYPE (stations.json), jamais selon son id d'instance — ajouter un
  // 5ᵉ type de station avec un rôle déjà existant ne demande aucun code ici.
  function essayerStation(puzzle) {
    const station = registre.obtenir('stations', puzzle.station_type);
    if (station.role === 'craft') {
      menu.ouvrirCraft(() => entreesCraft(station), i18n.t(station.label_key));
      return;
    }
    if (station.role === 'stockage') {
      menu.ouvrirCoffre(() => entreesCoffre(station), i18n.t(station.label_key));
      return;
    }
    // role === 'eau' (puits, §3.3) : boit directement, jamais un menu —
    // cooldown anti-spam identique au reste (§10), une clé par instance de
    // puits (une seule en M1, mais §6 : ne jamais supposer sa position/id).
    const cleCooldown = `eau:${puzzle.id}`;
    if (!estExpire(save.cooldowns, cleCooldown, COOLDOWN_PUITS_MS, save.monde.heure)) {
      dialogue.ouvrir(resoudreLignes('dlg_puits_cooldown', registre, i18n, save.hero.companion));
      return;
    }
    save.survie = consommerSurvie(save.survie, { jauge_soif: 1 });
    save.cooldowns = poserCooldown(save.cooldowns, cleCooldown, save.monde.heure);
    etatModifie = true;
  }

  // Craft (Palier A §3.1) : une entrée par recette DÉCOUVERTE de cette
  // station — une recette verrouillée n'est même pas listée (narration
  // diffuse). L'action retente toujours fabriquer() (jamais un simple
  // no-op) : le résultat fait foi, `grisee` n'est qu'un indice visuel — évite
  // toute divergence entre ce qui est affiché et ce qui se passe réellement
  // au clic/à la manette.
  function entreesCraft(station) {
    const heureMs = save.monde.heure;
    return recettesDeStation(registre, station.id)
      .filter((r) => recetteDecouverte(r, flags))
      .map((r) => {
        const verdict = peutFabriquer(r, save.inventaire.items, flags, save.cooldowns, heureMs);
        let suffixe = '';
        if (verdict.raison === 'cooldown') {
          const resteS = Math.ceil(tempsRestantMs(save.cooldowns, r.id, r.cooldown_ms ?? 60000, heureMs) / 1000);
          suffixe = ` (${resteS}${i18n.t('menu.unite_secondes')})`;
        } else if (verdict.raison === 'ingredients') {
          suffixe = ` (${i18n.t('menu.craft_manque')})`;
        } else if (verdict.raison === 'poche_pleine') {
          suffixe = ` (${i18n.t('menu.poche_pleine')})`;
        }
        return {
          texte: `${i18n.t(r.label_key)}${suffixe}`,
          grisee: !verdict.ok,
          action: () => {
            const itemDefSortie = registre.obtenir('items', r.sortie.item);
            const resultat = fabriquer(r, {
              poche: save.inventaire.items, flags, cooldowns: save.cooldowns, heureMs: save.monde.heure, itemDefSortie,
            });
            if (resultat.ok) {
              save.inventaire.items = resultat.poche;
              save.cooldowns = resultat.cooldowns;
              crediterXpHeros(resultat.xp);
              flags.set('flag_premier_craft');
              etatModifie = true;
            }
            menu.rafraichirCraft();
          },
        };
      });
  }

  // Coffre (Palier E §3.5) : une liste plate (poche à déposer + coffre à
  // retirer) plutôt qu'une navigation 2D — la spec ne demande que 2
  // colonnes visuelles, pas une grille navigable. Transfert par unité
  // seulement (confirmer = 1) : le transfert "par pile" (maintien) est un
  // geste que la couche d'input n'expose pas encore de façon générique,
  // hors scope de cette session (cf. journal, à reprendre si Xav le
  // redemande).
  function entreesCoffre(station) {
    const nbPilesCoffre = () => Object.values(save.coffre.items).filter((qte) => qte > 0).length;
    const entreesDepot = Object.entries(save.inventaire.items)
      .filter(([, qte]) => qte > 0)
      .map(([itemId, qte]) => {
        const itemDef = registre.obtenir('items', itemId);
        return {
          texte: `${i18n.t('menu.coffre_deposer')} : ${i18n.t(itemDef.label_key)} × ${qte}`,
          action: () => {
            const dejaPresent = (save.coffre.items[itemId] || 0) > 0;
            if (!dejaPresent && nbPilesCoffre() >= station.capacite) {
              menu.rafraichirCoffre();
              return;
            }
            save.inventaire.items = retirerItem(save.inventaire.items, itemId, 1);
            save.coffre.items = ajouterItem(save.coffre.items, itemId, 1, itemDef.stack_max).inventaire;
            etatModifie = true;
            menu.rafraichirCoffre();
          },
        };
      });
    const entreesRetrait = Object.entries(save.coffre.items)
      .filter(([, qte]) => qte > 0)
      .map(([itemId, qte]) => {
        const itemDef = registre.obtenir('items', itemId);
        return {
          texte: `${i18n.t('menu.coffre_retirer')} : ${i18n.t(itemDef.label_key)} × ${qte}`,
          action: () => {
            save.coffre.items = retirerItem(save.coffre.items, itemId, 1);
            save.inventaire.items = ajouterItem(save.inventaire.items, itemId, 1, itemDef.stack_max).inventaire;
            etatModifie = true;
            menu.rafraichirCoffre();
          },
        };
      });
    return [...entreesDepot, ...entreesRetrait];
  }

  // Modificateurs de stats primaires du héros — SEUL endroit qui les combine
  // (synergie du follet + buffs temporaires + points de stats libres, §3.4) :
  // calculerStatsHeros() (gameplay) et obtenirEntreesStats() (menu Stats)
  // partagent ce même calcul, jamais deux sources qui pourraient diverger.
  function resoudreModificateursHeros() {
    const modificateurs = {};
    for (const source of [modificateursHeros(registre, save.hero.companion), modificateursBuffsActifs(registre, save.hero.buffs_actifs)]) {
      for (const [statId, delta] of Object.entries(source)) {
        modificateurs[statId] = (modificateurs[statId] || 0) + delta;
      }
    }
    for (const s of registre.tous('stats')) {
      modificateurs[s.id] = (modificateurs[s.id] || 0) + (save.hero.stats.points[s.id] || 0);
    }
    return modificateurs;
  }

  // Menu Stats (Palier D §3.4) : +1 par confirmation, aucun retrait (respec
  // = après Boss 1, hors scope). Fournie à ui/menu.js via
  // menu.definirEntreesStats() une fois l'orchestrateur construit (même
  // patron que reinitialiserPartie).
  function obtenirEntreesStats() {
    const statsPrimaires = calculerStatsPrimaires(registre, resoudreModificateursHeros());
    const entrees = registre.tous('stats').map((s) => {
      const peutAjouter = save.hero.points_stats_libres > 0;
      const suffixe = peutAjouter ? ` (${i18n.t('menu.stats_ajouter')})` : '';
      return {
        texte: `${i18n.t(s.label_key)} : ${statsPrimaires[s.id]}${suffixe}`,
        grisee: !peutAjouter,
        action: () => {
          if (save.hero.points_stats_libres <= 0) return;
          save.hero.stats.points[s.id] = (save.hero.stats.points[s.id] || 0) + 1;
          save.hero.points_stats_libres -= 1;
          etatModifie = true;
          menu.rafraichirStats();
        },
      };
    });
    entrees.push({
      texte: `${i18n.t('menu.points_libres')} : ${save.hero.points_stats_libres}`,
      grisee: true,
      action: () => {},
    });
    return entrees;
  }

  // Manger (Palier C §3.3) : consomme l'item équipé au slot consommable
  // (verbe CONSUME) — à défaut d'équipement ou de stock, ne fait rien
  // silencieusement (rien à manger, rien ne se passe).
  function essayerConsommer() {
    const itemId = save.hero.equipement.consommable;
    if (!itemId || (save.inventaire.items[itemId] || 0) <= 0) return;
    const itemDef = registre.obtenir('items', itemId);
    const c = itemDef.consommation;
    if (!c) return;
    save.survie = consommerSurvie(save.survie, { jauge_faim: c.faim || 0, jauge_soif: c.soif || 0 });
    save.inventaire.items = retirerItem(save.inventaire.items, itemId, 1);
    for (const effetId of c.effets || []) {
      save.hero.buffs_actifs = ajouterBuffActif(registre, save.hero.buffs_actifs, effetId);
    }
    etatModifie = true;
  }

  // Progression vers le niveau suivant (HUD §3.9, discret) : 1 si le
  // dernier niveau de la table est atteint (rien à afficher au-delà).
  function ratioProgressionXp() {
    const niveaux = [...registre.tous('levels')].sort((a, b) => a.niveau - b.niveau);
    const index = niveaux.findIndex((n) => n.niveau === save.hero.niveau);
    const suivant = niveaux[index + 1];
    if (!suivant) return 1;
    const courant = niveaux[index];
    const ecart = suivant.xp_cumulee - courant.xp_cumulee;
    return ecart > 0 ? (save.hero.xp - courant.xp_cumulee) / ecart : 1;
  }

  // XP -> niveaux -> flags (Palier D §3.4) : seul point qui touche
  // save.hero.{xp,niveau,points_stats_libres} — combat (onMonstreMort) et
  // craft (entreesCraft) partagent ce même chemin, jamais deux compteurs.
  function crediterXpHeros(xpGagne) {
    if (!xpGagne) return;
    const resultat = crediterXp(
      { xp: save.hero.xp, niveau: save.hero.niveau, pointsStatsLibres: save.hero.points_stats_libres },
      xpGagne,
      registre.tous('levels')
    );
    save.hero.xp = resultat.xp;
    save.hero.niveau = resultat.niveau;
    save.hero.points_stats_libres = resultat.pointsStatsLibres;
    for (const n of resultat.niveauxFranchis) flags.set(`flag_niveau_${n}`);
    etatModifie = true;
  }

  function onMonstreMort(donneesEnnemi) {
    const table = registre.obtenir('loot_tables', donneesEnnemi.loot_table);
    const alea = creerGenerateur((Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0);
    const { item, quantite } = resoudreLoot(table, alea);
    if (item === 'eclats') save.inventaire.eclats += quantite;
    crediterXpHeros(donneesEnnemi.xp);
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
    const statsBrutes = calculerStatsPrimaires(registre, resoudreModificateursHeros());
    // Modulateur de survie (Palier C §3.3) : appliqué ICI, avant les
    // dérivées — un seul chemin de calcul, donc dégâts (stat_force),
    // cadence d'attaque et vitesse de déplacement (stat_agilite, toutes
    // deux dérivées) suivent sans code dédié.
    const modulateur = calculerModulateurSurvie(registre, save.survie);
    const statsPrimaires = appliquerModulateurSurvie(statsBrutes, modulateur, configSurvie(registre).stats_modulees);
    const statsDerivees = calculerStatsDerivees(registre, statsPrimaires);
    // SD_phase3-stations-pv-jauges_2026-09-17.md §B : reconcilierPvMax()
    // fait tenir sa promesse à un buff qui monte pv_max (Vitalité), jamais
    // un simple `hero.pvMax = ...` qui ouvrirait un headroom invisible.
    Object.assign(hero, reconcilierPvMax(hero, statsDerivees.derivee_pv_max));
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
          // Malus faim/soif (Palier C §3.3) : jauges ramenées à
          // malus_respawn si elles étaient au-dessus — la punition est le
          // trajet et la mollesse, jamais la progression.
          save.survie = appliquerMalusRespawn(registre, save.survie);
        },
      }));
      respawnDansLaGrotte();
    }

    save.hero.pv = hero.pv;
  }

  // §3.6 : premier verbe abstrait vu (manette comprise) déclenche l'audio une
  // fois — clavier/souris/tactile sont déjà couverts par des écouteurs DOM
  // directs dans demarrerJeu() (plus réactifs, pas besoin d'attendre une
  // frame), cette vérification couvre le seul cas qu'ils ratent : un premier
  // geste fait au stick/à la croix/aux boutons d'une manette.
  let gesteDeclenche = false;
  function verifierPremierGeste(etat) {
    if (gesteDeclenche) return;
    const unVerbeActif = etat.move.x !== 0 || etat.move.y !== 0 || [
      'attack', 'skill_1', 'skill_2', 'skill_3', 'consume', 'interact', 'menu',
    ].some((verbe) => etat[verbe].pressed);
    if (unVerbeActif) {
      gesteDeclenche = true;
      onPremierGeste();
    }
  }

  // Indices de commande (specs/04_indices-commandes.md §3) : le gameplay
  // "annonce" chaque frame les 3 déclencheurs livrés avec cette fiche, sans
  // savoir qu'un indice existe derrière — hints.js décide seul s'il y a
  // quelque chose à montrer (flag déjà posé, un indice déjà à l'écran, verbe
  // sans entrée déclarée...). Appelé seulement hors UI (§4 : "masqué, reprend
  // au retour", même point de décision unique que le reste du gameplay).
  function verifierIndicesNiveau() {
    // MOVE : "fin de la cinématique de la salle 1, à la prise de contrôle" —
    // ce bloc n'est atteint QUE hors UI (menu/dialogue/choix/intro/départ),
    // donc la toute première frame où cette fonction tourne dans cette salle
    // EST cette prise de contrôle, qu'un input soit déjà tenu ou non.
    if (scene.id === 'scene_grotte_salle_1') indices.declencherVerbeUtile('move', flags);

    // INTERACT : héros à portée de n'importe quel interactif positionné
    // (levier/station) — même seuil ET même géométrie que essayerInteraction()
    // (rectangleInteractif, §3 04_stations-proportions-collision) ; la Grotte
    // n'a que des leviers, donc "le premier interactif rencontré" (§3 de
    // 04_indices-commandes) est de fait le levier de la salle 1.
    for (const puzzleId of scene.interactifs) {
      const puzzle = registre.obtenir('puzzles', puzzleId);
      if (distanceAuRectangle(hero.x, hero.y, rectangleInteractif(puzzle)) <= DISTANCE_INTERACT_PX) {
        indices.declencherVerbeUtile('interact', flags);
        break;
      }
    }

    // ATTACK : "premier monstre engagé, à l'entrée dans distance_engagement"
    // — même constante que l'engagement réel du follet (companion.js), pas
    // une 2ᵉ portée qui pourrait diverger.
    if (monstres.some((m) => !m.mort && Math.hypot(hero.x - m.x, hero.y - m.y) <= DISTANCE_ENGAGEMENT_PX)) {
      indices.declencherVerbeUtile('attack', flags);
    }

    // CONSUME (Palier C, §3.7 de 04_maison-interieur) : "premier item de
    // nourriture équipé au slot consommable" — le stock peut retomber à 0
    // entre deux frames (mangé), auquel cas ce n'est plus "utile maintenant".
    const idConsommable = save.hero.equipement.consommable;
    if (idConsommable && (save.inventaire.items[idConsommable] || 0) > 0) {
      indices.declencherVerbeUtile('consume', flags);
    }
  }

  function maj(deltaMs) {
    const etatBrut = input.maj();
    verifierPremierGeste(etatBrut);

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
    // Indices de commande, §4 edge case : "verbe émis avant le déclencheur"
    // pose le flag immédiatement, sans jamais avoir montré l'indice — utilise
    // etatGameplay (déjà neutralisé sous UI), donc rien ne se déclenche tant
    // qu'une UI capte les verbes.
    if (etatGameplay.move.x !== 0 || etatGameplay.move.y !== 0) indices.verbeEmis('move', flags);
    if (etatGameplay.interact.pressed) indices.verbeEmis('interact', flags);
    if (etatGameplay.attack.pressed) indices.verbeEmis('attack', flags);
    if (etatGameplay.consume.pressed) indices.verbeEmis('consume', flags);

    const { statsPrimaires, statsDerivees } = calculerStatsHeros();

    const deltaS = deltaMs / 1000;
    const dx = etatGameplay.move.x * statsDerivees.derivee_vitesse_deplacement_px_s * deltaS;
    const dy = etatGameplay.move.y * statsDerivees.derivee_vitesse_deplacement_px_s * deltaS;
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
      if (etatGameplay.consume.pressed) essayerConsommer();
      mettreAJourCombat(deltaMs, etatGameplay, statsPrimaires, statsDerivees);
      verifierEntreesDeZone();
      indices.maj(deltaMs);
      verifierIndicesNiveau();

      // Horloge "temps de jeu actif" (daynight.js#avancerHeure) : avancée
      // dans TOUTES les scènes désormais (Palier A/C, specs/04_maison-
      // interieur.md §6 : "en extraire une fonction partagée, jamais une
      // seconde horloge") — cooldowns.js et survival.js la réutilisent telle
      // quelle pour les recettes/ressources/puits/jauges, y compris dans la
      // Grotte (survie et cooldowns s'y appliquent aussi). Le rendu du voile
      // jour/nuit, lui, reste conditionné à `scene.cycleJourNuit` (dessiner()
      // plus bas) — seule l'avance de l'horloge devient inconditionnelle.
      save.monde.heure = avancerHeure(save.monde.heure, deltaMs);
      etatModifie = true;

      // Survie (Palier C §3.3) : décroissance en temps actif, jamais hors
      // session ni sous UI (déjà garanti par ce bloc). Détection du premier
      // franchissement sous 0,5 AVANT/APRÈS pour ne déclencher
      // dlg_premiere_faim qu'une fois (§3.3 : "un signal, jamais un tuto").
      const etaitAuDessusDuSeuil = !jaugeSousLeSeuil(save.survie);
      save.survie = decroitreSurvie(registre, save.survie, deltaMs);
      if (etaitAuDessusDuSeuil && jaugeSousLeSeuil(save.survie) && !flags.has('flag_premiere_faim')) {
        flags.set('flag_premiere_faim');
        dialogue.ouvrir(resoudreLignes('dlg_premiere_faim', registre, i18n, save.hero.companion));
      }

      // Buffs temporaires (Palier C §3.3, ex. le fruit cuit) : tiqués comme
      // les cooldowns de combat, purgés à expiration (status.js#tickBuffsActifs).
      save.hero.buffs_actifs = tickBuffsActifs(save.hero.buffs_actifs, deltaMs);

      // Respawn différé des items au sol (Palier B §3.2).
      const resultatRespawn = tickRespawns(scene, registre.tous('items'), itemsSol, respawnsEnAttente, deltaMs, compteurRamassages);
      itemsSol = resultatRespawn.itemsSol;
      respawnsEnAttente = resultatRespawn.enAttente;
      compteurRamassages = resultatRespawn.compteur;
      save.monde.items_sol[scene.id] = itemsSol;
      save.monde.respawns_en_attente[scene.id] = respawnsEnAttente;

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

    // Interactifs positionnés (§2.1/§3.3, §3.4 03_maison-exterieur) : tout
    // interactif de scene.interactifs qui porte un `render.visuel` se
    // dessine (une "sequence" n'en porte pas — elle ne référence que des
    // leviers déjà rendus par ailleurs) — même source de vérité que
    // essayerInteraction() pour la position, puzzlesEtat pour l'état on/off.
    //
    // Cause racine (SD_phase3-stations-pv-jauges_2026-09-17.md, sujet 1) :
    // ce filtre énumérait les `type` connus (`'levier' || 'station_placeholder'`)
    // — quand Palier A de la Phase 3 a renommé les 4 stations en
    // `type: "station"` (données valides, garde-fou "solide sans rendu" au
    // boot toujours satisfait puisque render.visuel restait déclaré), ce
    // filtre de RENDU, lui, ne connaissait pas ce nouveau type et les
    // excluait silencieusement — solides (collision générique par
    // `empreintesSolides`) et actionnables (essayerInteraction() ne filtre
    // pas non plus par type), mais jamais dessinées. Le garde-fou de
    // schemas.js valide la DONNÉE (un `render.visuel` qui se résout), pas
    // qu'un filtre de CODE la garde à jour — reste sur la donnée seule
    // (`render.visuel` présent), jamais une liste de `type` à maintenir en
    // double : un 5ᵉ type d'interactif positionné se dessine sans toucher
    // cette fonction, ce qui rend la classe de bug irreproductible ici.
    const puzzlesAffiches = scene.interactifs
      .map((id) => registre.obtenir('puzzles', id))
      .filter((p) => p.render && p.render.visuel)
      .map((p) => ({
        x: (p.position.x + 0.5) * scene.tileSize,
        y: (p.position.y + 0.5) * scene.tileSize,
        actif: p.type === 'levier' && !!puzzlesEtat[p.id]?.actif,
        visuel: registre.obtenir('visuels', p.render.visuel),
        // specs/04_stations-proportions-collision.md : échelle par entrée
        // (`undefined` pour un levier -> dessinerVisuel applique son propre
        // défaut 1, jamais un second défaut dupliqué ici).
        echelle: p.echelle,
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

    // Objets au sol (03_maison-exterieur §3.3) : résolus ici (main.js a le
    // registre), render.js ne connaît que { x, y, visuel } — même patron que
    // puzzlesAffiches ci-dessus.
    const objetsSolAffiches = Object.entries(itemsSol).flatMap(([itemId, positions]) => {
      const itemDef = registre.obtenir('items', itemId);
      const visuel = registre.obtenir('visuels', itemDef.render.visuel);
      return positions.map((p) => ({ x: p.x, y: p.y, visuel }));
    });

    // Toit des structures (§3.4) : opacité calculée ici (structures.js, pure,
    // testée) à partir du follet actif — RAYON_EFFACEMENT_TOIT = son
    // rayon_lumiere x FACTEUR_EFFACEMENT_TOIT, "un peu plus grand que le
    // halo" (acté Xav). `couleur` résolue depuis tiles.json > render.valeur
    // (render.js ne connaît jamais tiles.json par id).
    const rayonEffacement = (companionActif ? companionActif.rayon_lumiere : RAYON_TOIT_FOLLET_ABSENT_PX) * FACTEUR_EFFACEMENT_TOIT;
    const structuresAffichees = scene.structures.map((structure) => ({
      rect: structure.rect,
      couleur: registre.obtenir('tiles', structure.toit).render.valeur,
      opacite: calculerOpaciteToit(hero, structure, scene.tileSize, {
        rayonEffacement,
        margeFondu: MARGE_FONDU_TOIT_PX,
      }),
    }));

    // Cycle jour/nuit (§3.5) : `scene.obscurite` reste celle de la Phase 1
    // pour toute scène qui n'a pas `cycleJourNuit` (grotte, inchangée) ;
    // sinon l'opacité du voile est DÉRIVÉE de l'heure à chaque frame — jamais
    // un second mécanisme d'assombrissement, dessinerObscurite ne voit
    // toujours qu'un simple `{ opacite }`.
    const sceneAffichage = scene.cycleJourNuit
      ? { ...scene, obscurite: { opacite: opaciteAHeure(save.monde.heure) } }
      : scene;

    dessinerScene(ctxLogique, {
      scene: sceneAffichage,
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
      visuelsTuiles,
      objetsSol: objetsSolAffiches,
      structures: structuresAffichees,
    });
    dessinerObscurite(ctxLogique, {
      scene: sceneAffichage,
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
      // Palier C/D (§3.9) : discret, un chiffre — jamais affiché avant le
      // premier calcul des jauges/XP (cinématique d'ouverture).
      survie: save.survie,
      niveau: save.hero.niveau,
      ratioXp: ratioProgressionXp(),
    });
    // Indices de commande (§2 : "masqué" sous UI) — résolution i18n ici (même
    // patron que les autres calques : hud_hints.js ne connaît jamais i18n).
    const donneesIndice = uiOuverteMaintenant() ? null : indices.indiceAffiche(input.peripheriqueActif());
    dessinerHudHints(ctxLogique, donneesIndice ? {
      texte: donneesIndice.label_key ? i18n.t(donneesIndice.label_key) : null,
      glyphe: donneesIndice.glyphe_key ? i18n.t(donneesIndice.glyphe_key) : '',
      resteMs: donneesIndice.resteMs,
      dureeMs: donneesIndice.dureeMs,
    } : null);
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
    indices = creerEtatIndices(registre);
    dialogue.fermer();
    choixFollet = null;
    pousseeChoixPrecedente = 0;
    intro = null;
    depart = null;
    cooldownAttaqueHerosMs = 0;
    anneauAttaqueMs = 0;
    dialogueOuvertAuDebutFramePrecedente = false;
    // 03_maison-exterieur : itemsSol repart de zéro, entrerDansScene() plus
    // bas le régénère depuis save.monde.items_sol (vide après saveNeuve()) —
    // déterministe, mêmes positions qu'à une toute première partie.
    itemsSol = {};
    compteurRamassages = 0;
    respawnsEnAttente = {};
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
    // Indices de commande (specs/04_indices-commandes.md) : observe l'indice
    // affiché sans passer par dessiner() (canvas jamais exercé headless,
    // contrainte de méthode) — même patron que les accesseurs ci-dessus.
    obtenirIndiceAffiche: () => (uiOuverteMaintenant() ? null : indices.indiceAffiche(input.peripheriqueActif ? input.peripheriqueActif() : 'manette')),
    // Palier D (§3.4) : fourni à ui/menu.js via menu.definirEntreesStats()
    // une fois l'orchestrateur construit (même patron que
    // reinitialiserPartie ci-dessus) — le menu Stats n'a besoin d'appeler
    // que cette seule fonction, jamais de connaître registre/save/i18n.
    obtenirEntreesStats: () => obtenirEntreesStats(),
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
    // §3.6 : l'état réel vit dans save.settings.musique, l'effet dans
    // audio.js — le menu ne connaît ni l'un ni l'autre directement.
    musiqueActive: () => save.settings.musique !== false,
    basculerMusique() {
      save.settings.musique = !(save.settings.musique !== false);
      definirMusiqueActive(save.settings.musique);
    },
    // §3.3 : liste déjà résolue/traduite (main.js a le registre + i18n) —
    // ui/menu.js ne connaît jamais items.json par id. `id`/`categorie`
    // ajoutés au Palier C (§3.3) : nécessaires pour proposer "Équiper" sur
    // la nourriture (ui/menu.js#entreesPoche).
    listerPoche: () => Object.entries(save.inventaire.items)
      .filter(([, quantite]) => quantite > 0)
      .map(([itemId, quantite]) => {
        const itemDef = registre.obtenir('items', itemId);
        return { id: itemId, label: i18n.t(itemDef.label_key), quantite, categorie: itemDef.categorie };
      }),
    // Palier C (§3.3) : slot consommable — mutation directe de `save` (même
    // patron que basculerMusique ci-dessus, hors du chemin etatModifie de
    // l'orchestrateur, cf. journal : persistance au prochain autosave/
    // visibilitychange, comme les réglages).
    equipementConsommable: () => save.hero.equipement.consommable,
    equiperConsommable: (itemId) => {
      save.hero.equipement.consommable = itemId;
    },
  });

  const dialogue = creerDialogue();

  // §3.6 : premier geste utilisateur — clavier/souris/tactile détectés ici
  // (réactifs dès l'événement DOM lui-même), le geste manette est détecté
  // par l'orchestrateur (verifierPremierGeste, aucun accès direct à la
  // Gamepad API en dehors de la couche d'input) via `onPremierGeste` ci-
  // dessous, qui partage la même fonction — jamais deux chemins d'armement
  // séparés.
  function armerAudioUneFois() {
    // MT_musique-ambiance-synth : armerAudio résout lui-même la piste par
    // défaut et son repli synthétisé dans le catalogue complet — main.js ne
    // connaît qu'un id, jamais la logique de repli (cf. audio.js).
    armerAudio(registre.tous('music'), 'music_piano_solo', save.settings.musique !== false);
  }
  window.addEventListener('keydown', armerAudioUneFois, { once: true });
  window.addEventListener('pointerdown', armerAudioUneFois, { once: true });
  window.addEventListener('touchstart', armerAudioUneFois, { once: true });

  const orchestrateur = creerOrchestrateurGrotte({
    registre, i18n, save, store, dialogue, menu, input, ctxLogique, ctxVisible, canvasLogique,
    onPremierGeste: armerAudioUneFois,
  });
  // Dépendance circulaire résolue par un point de couture explicite (§B du
  // diagnostic) : le menu (construit avant l'orchestrateur, qui en a besoin
  // pour maj()) ne connaît reinitialiserPartie() qu'après coup, via ce
  // setter — jamais en important main.js depuis ui/menu.js.
  menu.definirActionReinitialiser(orchestrateur.reinitialiserPartie);
  // Même patron (§3.4) : le menu Stats a besoin de l'orchestrateur pour
  // résoudre les stats/points courants.
  menu.definirEntreesStats(orchestrateur.obtenirEntreesStats);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) sauvegarder(store, save);
  });

  creerBoucle({ maj: orchestrateur.maj, dessiner: orchestrateur.dessiner }).demarrer();
}

if (typeof window !== 'undefined') {
  demarrerJeu();
}
