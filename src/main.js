// Boot du jeu (§3.1) + orchestrateur de la Grotte (Phase 1). Seul module
// autorisé à toucher le DOM au premier niveau — tous les autres ne le font
// qu'à l'intérieur de fonctions. demarrerJeu() reste exportée et importable
// depuis Node (aucun appel n'est déclenché tant que window n'existe pas).
//
// La séquence de la grotte (choix du follet, tuto de combat, énigmes, porte)
// est un script propre à cette scène, pas un système généralisé : Phase 1
// ne prouve chaque système (combat, follet, énigmes, dialogue) qu'une seule
// fois (§1) — la généralisation viendra quand un 2ᵉ cas d'usage existera.

import { SCHEMAS, CATEGORIES_ITEM } from './schemas.js';
import { validerCatalogues, construireRegistre } from './registry.js';
import { chargerCataloguesDepuisReseau, chargerLocalesDepuisReseau } from './io_navigateur.js';
import { creerI18n, verifierJeuxDeCles } from './i18n.js';
import { creerSourceClavier, MAPPING_CLAVIER_PROVISOIRE } from './input/keyboard.js';
import { creerSourceManette } from './input/gamepad.js';
import { creerSourceTactile } from './input/touch.js';
import { creerPleinEcranTactile } from './plein_ecran.js';
import { creerCoucheInput, etatNeutre } from './input/input.js';
import { chargerScene, resoudreDeplacement, portailFranchi, trouverPositionLibrePlusProche } from './scene.js';
import { calculerCamera } from './camera.js';
import { genererDecor } from './decor.js';
import {
  creerBoucle, dessinerScene, dessinerObscurite, dessinerSignalZones, dessinerPaupieres, dessinerTextesFlottants, presenter,
  RESOLUTION_LOGIQUE, calculerRectanglePresentation, versCoordonneesLogiques, AURA_TRAIT,
  definirEchelleForcee, dimensionsEcranPhysiquesActuelles,
} from './render.js';
import { creerStoreIndexedDB } from './storage_indexeddb.js';
import {
  charger as chargerSave, sauvegarder, importerSauvegarde as importerSauvegardeDansStore,
  saveNeuve, reinitialiserSauvegarde, VISUEL_HEROS_ID, COULEUR_HERO_NEUTRE,
} from './save.js';
import { dessinerVisuel, echelleVisuel, TAILLE_REFERENCE_FOLLET_PX } from './visuels.js';
import { creerPoussiere, avancerPoussiere, bouffeesVisibles, viderPoussiere } from './poussiere.js';
import { decalageCorpsFollet } from './vol_follet.js';
import {
  creerTextesFlottants, emettreTexte, avancerTextesFlottants, textesVisibles, viderTextesFlottants,
} from './texte_flottant.js';
import { creerRegistreFlags } from './flags.js';
import { calculerStatsPrimaires, calculerStatsDerivees, appliquerModulateurSurvie } from './stats.js';
import {
  modificateursHeros, statsEffectivesMonstre, tickBuffsActifs, ajouterBuffActif, modificateursBuffsActifs,
} from './status.js';
import { creerHeros, creerMonstre, approcherEnLigneDroite, infligerDegats, mourir, respawn, reconcilierPvMax } from './entities.js';
import {
  resoudreArmeEquipee, resoudreAutoAttaque, tickCooldown, estMonstreActif, FLASH_ATTAQUE_MS, FLASH_TOUCHE_MS,
} from './combat.js';
import {
  creerFollet, mettreAJourEtat as mettreAJourFollet, avancerPosition as avancerFollet, monstreEngageable,
  cibleSuivante as cibleSuivanteFollet,
  resoudreEchelleJeu as resoudreEchelleJeuFollet, echelleFolletEnTransition, resoudreRayonAuraPx,
} from './companion.js';
import { creerGenerateur, resoudreLoot } from './loot.js';
import { etatInitial as etatInitialPuzzles, activerLevier } from './puzzles.js';
import { creerDialogue, resoudreLignes } from './dialogue.js';
import {
  creerIntro, avancerIntro, etatRendu as etatRenduIntro,
  creerDepart, avancerDepart, etatRenduDepart, avancementDepart, ETAPE_CLIGNEMENTS,
} from './intro.js';
import {
  tablesDeScene, tableActive, tirerPositionApparition, tirerPointDomaine, estEnZoneSurePx, zonesSignalees,
} from './spawns.js';
import { creerComportement, avancerComportement } from './comportement_monstres.js';
import { peutRecolter, trouverRessourceProche } from './resources.js';
import { ajouterItem, retirerItem } from './inventory.js';
import {
  remplirItemsSol, trouverItemProche, ramasser, planifierRespawn, tickRespawns,
  calculerTuilesAtteignables, reposerItemsDuJour,
} from './ground_items.js';
import { calculerOpaciteToit, distanceAuRectangle, empreinteAbsoluePuzzle } from './structures.js';
import { dansRectangleTuile, poseValide } from './placement.js';
import { avancerHeure, opaciteAHeure, phaseAHeure, PHASES_CYCLE } from './daynight.js';
import { ambianceADeclencher } from './ambiances.js';
import { armerAudio, definirMusiqueActive } from './audio.js';
import { creerEtatIndices } from './hints.js';
import { estExpire, poserCooldown, tempsRestantMs } from './cooldowns.js';
import { peutFabriquer, fabriquer, recettesDeStation } from './recipes.js';
import { entreesVisibles } from './visibilite.js';
import {
  decroitre as decroitreSurvie, consommer as consommerSurvie, appliquerMalusRespawn,
  calculerModulateur as calculerModulateurSurvie, configSurvie, jaugeSousLeSeuil,
} from './survival.js';
import { crediter as crediterXp, xpDeCatalogue } from './xp.js';
import { initialiserMenu, clesTexteEtats } from './ui/menu.js';
import { creerDessinateurIcones } from './ui/icone_canvas.js';
import { erreursCouleursUi } from './ui/couleurs_ui.js';
import {
  erreursTextesMenus, erreursCablageMenus, CLES_TEXTE_COMPOSANT, rectangleMenuCss,
} from './menu_cartes.js';
import { dessinerHud } from './ui/hud.js';
import { dessinerHudHints } from './ui/hud_hints.js';
import { dessinerDialogue } from './ui/dialogue_box.js';
import { creerMoniteurPerf, creerMoniteurInactif } from './ui/hud_debug.js';
import { lireEchelleForcee } from './debug_perf.js';

// Provisoires, non validés en jeu par Xav — seuils uniques, commentés ici.
// VITESSE_HERO_PX_S est retirée en Palier C (specs/04_maison-interieur.md
// §3.3) : la vitesse de déplacement vient désormais de
// derivee_vitesse_deplacement_px_s (stats_derivees.json, stat_agilite) — un
// seul chemin de calcul, donc le modulateur de survie la ralentit sans code
// dédié, comme les dégâts et la cadence d'attaque.
// MT_heros-echelle_2026-09-19 : rayon de RÉFÉRENCE (échelle 1) de la boîte de
// collision du héros. Le rayon réellement utilisé est ce nombre multiplié par
// l'échelle déclarée en données sur `visuel_heros` (data/visuels.json), la
// MÊME que celle dont le rendu dérive (visuels.js#echelleVisuel) — avant
// cette fiche, visuel (rayon 11) et collision (rayon 10) étaient deux nombres
// indépendants qui pouvaient diverger sans que rien ne le signale.
const RAYON_HERO_BASE_PX = 10;
// specs/07_chaos-nocturne.md palier C : rayon de la boîte de collision d'un
// monstre du Chaos. Les monstres posés à la main (la Grotte, Phase 1 validée)
// continuent d'aller droit au héros sans rien heurter — on ne rouvre pas un
// comportement validé. Mais un monstre qui **erre** dans un Champ bordé de
// forêt doit se cogner : sans ça, la règle anti-blocage de la spec n'aurait
// rien à débloquer, et on verrait des rôdeurs traverser les arbres.
// *Provisoire*, à l'œil : la silhouette du rampant tient dans 16 px.
const RAYON_MONSTRE_CHAOS_PX = 8;
// Obscurité la plus forte du cycle : sert de référence au signal des zones de
// Chaos (palier D), dont l'intensité suit la nuit. Lue depuis daynight.js,
// jamais recopiée — changer la nuit changera le signal avec elle.
const OPACITE_NUIT_MAX = Math.max(...PHASES_CYCLE.map((p) => p.opacite));
const INTERVALLE_AUTOSAVE_MS = 30000;
const DISTANCE_INTERACT_PX = 28;
// MT_texte-flottant_2026-09-19 (`D-05`) : gabarit du texte de gain (« +{n}
// {item} »), déclaré une seule fois ici. C'est une CLÉ de localisation, pas
// un texte : le « + », l'ordre des morceaux et l'espace se traduisent comme
// le reste (contrainte « zéro chaîne en dur »). Un futur gain d'XP ou un
// nombre de dégâts prendra son propre gabarit, sans toucher texte_flottant.js.
const CLE_TEXTE_GAIN_ITEM = 'monde.gain_item';
// `D-58` : le gabarit ET son suffixe (« xp ») vivent dans les locales, jamais
// ici — c'est ce qui permet de l'écrire autrement en anglais le jour venu.
const CLE_TEXTE_GAIN_XP = 'monde.gain_xp';
// Respawn différé des items au sol (Palier B §3.2) : défaut appliqué quand
// l'item ne surcharge pas `spawn.respawn_ms` — même esprit que
// cooldown_ms par défaut de recipes.js.
// Cooldown du puits (Palier C §3.3, §10 "règle anti-spam") : pas de champ
// dédié dans stations.json (un seul rôle "eau" existe), donc un seuil
// unique ici plutôt qu'un catalogue à une seule entrée.
const COOLDOWN_PUITS_MS = 60000;

// 03_maison-exterieur §3.4 : RAYON_EFFACEMENT_TOIT = rayon_lumiere du follet
// actif x ce facteur ("un peu plus grand que le halo", acté Xav 2026-09-16) —
// le facteur et la marge de fondu restent PROVISOIRES, Xav les équilibre au
// ressenti. `RAYON_TOIT_FOLLET_ABSENT_PX` couvre le cas théorique où la
// maison serait visitée sans compagnon (jamais possible en jeu réel après la
// Grotte, gardé par prudence plutôt que par nécessité observée).
//
// 1,25 -> 1,125 (-10 %) le 2026-09-19 (D-21) : au playtest, la maison se
// "déshabillait" avant qu'on y soit. Seule la DISTANCE d'entrée en fondu
// change ; la courbe reste la même (dégressive sur MARGE_FONDU_TOIT_PX,
// jamais un on/off — décision verrouillée du 2026-09-16).
const FACTEUR_EFFACEMENT_TOIT = 1.125;
const MARGE_FONDU_TOIT_PX = 30;
const RAYON_TOIT_FOLLET_ABSENT_PX = 90;

// Gauche/milieu/droite de l'écran de choix (§3.1) — arrangement visuel
// arbitraire, sans effet sur le gameplay (les 3 follets sont équivalents en
// interface) ; Xav pourra le changer librement en relisant ce tableau.
const ORDRE_CHOIX_FOLLET = ['comp_follet_feu', 'comp_follet_eau', 'comp_follet_terre'];
// Les lignes de la FICHE d'un objet (specs/08_menus-cartes.md, palier C) : sa
// catégorie, puis ce qu'il rend quand on le mange — tout vient du catalogue,
// rien n'est écrit par objet. Une seule fonction pour la Poche, le Coffre et la
// sortie d'une recette : trois écrans qui décriraient le même objet chacun à
// leur façon finiraient par se contredire. Pure ; exportée pour les tests.
export function lignesFicheItem(itemDef, registre, i18n) {
  const lignes = [i18n.t(`item.categorie.${itemDef.categorie}`)];
  // `D-60` : la ligne de LORE, quand l'objet en porte une. Elle vient avant
  // les effets parce qu'un objet qui en a une n'a souvent rien d'autre à
  // dire — c'est le cas de la Plume, qui ne sert à rien et dont c'est tout
  // l'intérêt.
  if (itemDef.description_key) lignes.push(i18n.t(itemDef.description_key));
  const c = itemDef.consommation;
  if (c) {
    if (c.faim) lignes.push(i18n.t('menu.fiche.rend_faim', { n: Math.round(c.faim * 100) }));
    if (c.soif) lignes.push(i18n.t('menu.fiche.rend_soif', { n: Math.round(c.soif * 100) }));
    for (const idEffet of c.effets || []) lignes.push(i18n.t(registre.obtenir('status_effects', idEffet).label_key));
  }
  return lignes;
}

// Les clés de texte que les fiches composent d'elles-mêmes (aucun catalogue ne
// les cite) : passées au contrôle de démarrage des textes, avec celles des menus.
export function clesTexteFiches() {
  return [
    ...CATEGORIES_ITEM.map((c) => `item.categorie.${c}`),
    'menu.fiche.rend_faim', 'menu.fiche.rend_soif', 'menu.fiche.equipe',
    'menu.fiche.coffre_plein', 'menu.fiche.pile_pleine', 'menu.fiche.coffre_piles',
    'menu.coffre_deposer', 'menu.coffre_retirer', 'menu.poche',
    'menu.fiche.fabriquer', 'menu.fiche.ingredient', 'menu.fiche.donne', 'menu.fiche.recharge',
    'menu.fiche.ingredients_manquants', 'menu.fiche.aucune_recette',
    'menu.fiche.deplacer', 'menu.fiche.construction_vide', 'menu.fiche.manger',
    'menu.poche_equiper', 'menu.poche_vide',
  ];
}

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
// Taille du follet FOCALISÉ sur l'écran de choix. Extraite pour `D-34` : c'est
// la taille d'où part l'élu quand il devient le vrai follet, et elle doit se
// lire au même endroit que le dessin de l'écran de choix — deux nombres 20
// recopiés auraient pu diverger, et la transition aurait sauté sans que rien
// ne le signale. Les tailles de la cinématique, elles, ne changent pas.
const TAILLE_FOLLET_SELECTIONNE_PX = 20;

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
  // MT_mesure-saccades_2026-09-19 : instrument de debug perf, inactif par
  // défaut (mêmes callbacks no-op que sous `?debug=fps` absent) — les tests
  // headless existants n'ont rien à fournir, même patron qu'onPremierGeste.
  moniteurPerf = creerMoniteurInactif(),
  // specs/08_menus-cartes.md §5 : valeurs nommées que SEUL l'appelant connaît
  // (« l'API plein écran existe-t-elle » est un fait du DOM), fusionnées à
  // celles d'ici pour les conditions en données. Vide par défaut : les tests
  // headless n'ont rien à fournir.
  valeursExternes = () => ({}),
  // `D-54` : l'orchestrateur annonce à chaque frame si une UI capte les
  // verbes. UN seul émetteur, LE point de décision unique existant
  // (`uiOuverte`, plus bas) : personne d'autre n'a le droit de recalculer
  // « le jeu a-t-il la main ». Sert au `preventDefault` de `Tab`, qui arrive
  // hors frame (un `keydown` n'attend pas la boucle de jeu). No-op par
  // défaut, même patron qu'onPremierGeste.
  onEtatUi = () => {},
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
      // specs/07_chaos-nocturne.md §3 : valeurs nommées que les conditions de
      // données peuvent comparer (« niveau ≥ 5 » pour le palier 1 du Chaos).
      // Lue à chaque évaluation, jamais capturée : le seuil s'ouvre à l'instant
      // où le joueur monte de niveau, sans rien avoir à réévaluer à la main.
      //
      // `stations_placables` (specs/08_menus-cartes.md, case contextuelle) :
      // COMBIEN de stations le héros peut déplacer là où il se tient. Un vrai
      // nombre, pas un booléen déguisé — « lieu » n'est pas un format de
      // condition de `flags.js`, et la spec interdit d'en créer un.
      valeurs: () => ({
        niveau: save.hero.niveau,
        stations_placables: nombreStationsPlacables(),
        ...valeursExternes(),
      }),
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

  // MT_heros-echelle_2026-09-19 : rayon de collision EFFECTIF du héros. Seul
  // point de lecture — la boîte (hitboxHeros) et le rendu (render.js via
  // dessinerVisuel) dérivent tous deux de `visuel_heros.echelle`, un unique
  // nombre en données. Pour changer la taille du héros, on touche cette
  // valeur-là et rien d'autre ; aucun autre seuil du jeu n'en dépend
  // (orbite du follet, seuil d'interaction, portées d'arme, rayon
  // d'effacement du toit sont tous indépendants — inventaire de la fiche).
  function rayonHeros() {
    return RAYON_HERO_BASE_PX * echelleVisuel(registre.obtenir('visuels', VISUEL_HEROS_ID));
  }

  // MT_trainee-poussiere_2026-09-19 : réglages en données (data/effets.json,
  // tous PROVISOIRES, à régler au ressenti par Xav) et réserve fixe allouée
  // UNE fois au boot — jamais par frame, jamais par entrée en scène.
  const effetPoussiere = registre.obtenir('effets', 'effet_poussiere');
  const visuelPoussiere = registre.obtenir('visuels', effetPoussiere.visuel);
  const poussiere = creerPoussiere(effetPoussiere);

  // `D-36` (proposition) : le follet « aérien ». Deux effets, tous deux
  // PUREMENT VISUELS et tous deux en données.
  //
  // `vol` décale la SILHOUETTE autour de la position logique : celle-ci, son
  // aura, sa distance d'engagement et sa lumière ne bougent jamais — sinon
  // l'obscurité scintillerait au rythme du vol.
  //
  // `sillage` est une 2ᵉ instance de `poussiere.js`, sans une ligne de
  // système nouvelle : le module ne connaît ni le héros ni sa forme, il ne
  // connaît qu'une position et une distance parcourue. C'est exactement ce
  // que la règle du 19/09 promettait, vérifié ici sur un second cas d'usage.
  // `D-39` : plus d'état de vol du tout — la petite orbite du corps est une
  // fonction du temps. On ne garde que la config et l'horloge de temps de jeu
  // actif propre à l'effet, remise à zéro comme les réserves de particules.
  const configVolFollet = registre.obtenir('effets', 'effet_vol_follet');
  let tempsVolFolletMs = 0;
  // Initialisé à sa valeur à t = 0, et non à zéro : sinon la toute première
  // frame ferait sauter le corps de son centre à son orbite.
  let corpsFollet = decalageCorpsFollet(0, configVolFollet);
  const effetSillage = registre.obtenir('effets', 'effet_sillage_follet');
  const visuelSillage = registre.obtenir('visuels', effetSillage.visuel);
  const sillageFollet = creerPoussiere(effetSillage);

  // MT_texte-flottant_2026-09-19 (`D-05`) : même patron exactement — réglages
  // en données (tous PROVISOIRES, à régler au ressenti par Xav) et réserve
  // fixe allouée UNE fois au boot. `texte_flottant.js` ignore i18n : c'est
  // ici, au rendu, que le gabarit et le nom de l'item sont résolus.
  const effetTexteGain = registre.obtenir('effets', 'effet_texte_gain');
  const textesFlottants = creerTextesFlottants(effetTexteGain);

  // Un gain d'item, quelle que soit sa source (ramassage au sol, récolte à
  // l'outil, et demain butin ou coffre) passe par ce seul point : le texte
  // monte depuis la SOURCE du gain, jamais depuis le héros. `cle` est l'id de
  // l'item — deux gains du même item dans la même frame fusionnent en « +2 ».
  function signalerGainItem(itemId, quantite, x, y) {
    if (!(quantite > 0)) return;
    emettreTexte(textesFlottants, {
      x, y, cle: itemId, quantite,
      format: CLE_TEXTE_GAIN_ITEM,
      // `D-58` (Xav, 21/09 : « trop de texte ») : plus de nom d'item. Le
      // `libelle` reste à null plutôt que d'être retiré du module — un « +1
      // Épée en bois » de butin rare le reprendra sans code nouveau, et
      // c'est le gabarit de locale qui décidera de l'afficher ou non.
      libelle: null,
      style: 'gain',
    });
  }

  // Le pendant du précédent pour l'XP. Deux textes montent donc d'une même
  // récolte, « +1 » et « +1xp », au même endroit : c'est exactement ce qui
  // apprend la boucle au joueur sans une ligne de tutoriel — il voit ce qu'il
  // a pris ET ce que ça lui rapporte. Leur `cle` diffère, donc ils ne
  // fusionnent jamais entre eux.
  function signalerGainXp(xpGagne, x, y) {
    if (!(xpGagne > 0)) return;
    emettreTexte(textesFlottants, {
      x, y, cle: 'gain_xp', quantite: xpGagne,
      format: CLE_TEXTE_GAIN_XP,
      libelle: null,
      style: 'xp',
    });
  }

  // MT_hud-ligne-haute_2026-09-19 : la barre d'XP a quitté le HUD, mais la
  // montée de niveau garde un retour visuel — un bref éclat sur « Niv. N »
  // (aucun son ajouté, §À faire de la fiche). Compte à rebours tenu ici,
  // même patron que `flashMs` sur un monstre touché (entities.js) : le HUD
  // ne reçoit qu'un ratio déjà calculé et ne tient aucun état.
  const ECLAT_NIVEAU_MS = 700; // PROVISOIRE, jamais validé en jeu par Xav
  let eclatNiveauMs = 0;
  let niveauPrecedent = save.hero.niveau;

  // Apparitions nocturnes (specs/07_chaos-nocturne.md, palier B). Deux états,
  // volontairement **hors de la sauvegarde** : la spec l'exige (« non
  // persistés : la sauvegarde ne change pas de version ; recharger en pleine
  // nuit repart de zéro »), et c'est ce qui évite une migration.
  //   - `accumulateursSpawn` : le temps de jeu actif écoulé depuis la
  //     dernière naissance, par table ;
  //   - `compteurMonstresNes` : sert à frapper un id d'INSTANCE unique
  //     (cf. entities.js#creerMonstre) — jamais deux monstres du même id.
  let accumulateursSpawn = {};
  let compteurMonstresNes = 0;
  // Graine des points d'errance : un compteur, jamais Math.random(), pour
  // qu'une nuit rejouée depuis la même sauvegarde se déroule pareil.
  let compteurPointsErrance = 0;

  // --- État de jeu, mis à jour par entrerDansScene() à chaque transition ---
  // `hero` reste réaffectable pour la même raison que `flags` ci-dessus :
  // reinitialiserPartie() doit pouvoir repartir d'un héros neuf.
  let hero = creerHeros({ x: 0, y: 0, rayon: rayonHeros(), pvMax: 1 });
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
  // Tuiles non solides atteignables depuis le héros à l'entrée en scène
  // (ground_items.js#calculerTuilesAtteignables) — recalculé une fois par
  // entrerDansScene, jamais par frame (coût BFS non négligeable sur une
  // grande scène), réutilisé tel quel par tickRespawns ci-dessous.
  let tuilesAtteignables = new Set();
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

  // Mode Construction (specs/05_construction-stations.md §3) : `null` =
  // inactif, sinon { puzzle, structure, pose: {x,y,rotation}, pousseeX,
  // pousseeY, verdict }. `verdict` (poseValide()) est recalculé à CHAQUE
  // frame active (traiterConstruction) et réutilisé tel quel par dessiner()
  // (fantôme vert/rouge) ET par la confirmation — jamais deux calculs.
  let construction = null;

  function constructionActif() {
    return construction !== null;
  }

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
    return (
      menu.estOuvert() || dialogue.estOuvert() || choixFolletActif() || intro !== null || depart !== null ||
      constructionActif()
    );
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
    // MT_intro-follets-visibles_2026-09-19 : fin réelle de l'intro — jusqu'ici
    // elle restait vivante (étape ATTENTE) pour que les follets ne
    // disparaissent jamais entre la convergence et le choix. `depart` prend le
    // relais pour les 2 non élus, `follet` (créé ci-dessus) pour l'élu.
    intro = null;
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

  // `D-61` (T3, `Q-34`) : les lignes d'ambiance par palier. Le CHOIX est dans
  // `ambiances.js` (pur) ; ici, seulement de quoi le nourrir et quoi faire du
  // résultat — poser le flag, ouvrir le dialogue.
  //
  // Appelée dans le bloc de gameplay, donc gelée sous UI par LE point de
  // décision unique : une ligne ne peut pas naître pendant qu'une autre est
  // à l'écran. C'est ce qui rend inutile toute file d'attente ici.
  //
  // Le flag est posé AVANT d'ouvrir le dialogue, pas après : si le joueur
  // sauvegarde pendant la réplique, la ligne ne doit pas revenir au
  // rechargement. « Une seule fois » veut dire une seule fois, même
  // interrompue.
  function verifierLignesAmbiance() {
    if (dialogue.estOuvert()) return;
    const ambiance = ambianceADeclencher(registre.tous('ambiances'), {
      sceneId: scene.id,
      phase: phaseAHeure(save.monde.heure),
      aDejaVu: flags.has,
      evaluerCondition: flags.evaluate,
    });
    if (!ambiance) return;
    flags.set(ambiance.flag);
    dialogue.ouvrir(resoudreLignes(ambiance.dialogue, registre, i18n, save.hero.companion));
    etatModifie = true;
  }

  // specs/05_construction-stations.md §3/§4 : résout les poses sauvegardées
  // (save.maison.stations) en overrides VALIDÉS, dans l'ordre de
  // scene.interactifs — une pose devenue invalide (données de scène
  // changées, ou 2 stations sur la même tuile après une sauvegarde altérée)
  // retombe sur la position par défaut de puzzles.json, loguée (classe
  // "données valides mais obsolètes", jamais une migration de schéma).
  // Opère sur les données BRUTES du registre (jamais sur `scene`, qui n'est
  // pas encore chargée à cet instant) : chargerScene() reçoit le résultat en
  // 3ᵉ paramètre pour construire ses empreintesSolides avec les VRAIES
  // positions dès le premier calcul, jamais un second chargement.
  function resoudreOverridesStations(sceneId) {
    const donneesScene = registre.obtenir('scenes', sceneId);
    const overrides = {};
    for (const structure of donneesScene.structures || []) {
      if (!structure.interieur) continue; // aucune station placable possible ici (§4 : pas d'"interieur" déclaré)
      const puzzlesStructure = (donneesScene.interactifs || [])
        .map((id) => registre.obtenir('puzzles', id))
        .filter((p) => p && p.type === 'station' && dansRectangleTuile(p.position.x, p.position.y, structure.rect));

      const empreintesAcceptees = [];
      for (const puzzle of puzzlesStructure) {
        const stationType = registre.obtenir('stations', puzzle.station_type);
        const visuel = registre.obtenir('visuels', puzzle.render.visuel);
        const poseParDefaut = { x: puzzle.position.x, y: puzzle.position.y, rotation: puzzle.rotation || 0 };
        const poseSauvegardee = stationType.placable ? save.maison.stations[puzzle.id] : null;

        if (!poseSauvegardee) {
          empreintesAcceptees.push(empreinteAbsoluePuzzle(puzzle, visuel, poseParDefaut, donneesScene.tile_size));
          continue;
        }
        const empreinteCandidate = empreinteAbsoluePuzzle(puzzle, visuel, poseSauvegardee, donneesScene.tile_size);
        const verdict = poseValide({
          empreinte: empreinteCandidate, structure, autresEmpreintes: empreintesAcceptees, tileSize: donneesScene.tile_size,
        });
        if (verdict.ok) {
          overrides[puzzle.id] = poseSauvegardee;
          empreintesAcceptees.push(empreinteCandidate);
        } else {
          console.warn(
            `main.js#resoudreOverridesStations : pose sauvegardée invalide pour "${puzzle.id}" (${verdict.raison}), `
            + 'position par défaut restaurée'
          );
          empreintesAcceptees.push(empreinteAbsoluePuzzle(puzzle, visuel, poseParDefaut, donneesScene.tile_size));
        }
      }
    }
    return overrides;
  }

  // `D-59` (T2, `Q-33`) : repose les objets au sol de la scène COURANTE
  // selon le tirage du jour, et une seule fois par jour et par scène. Deux
  // moments l'appellent : la fin de l'aube (l'horloge repasse par zéro) et
  // l'entrée en scène (revenir le matin dans une carte quittée la veille).
  //
  // Le repos est SEC : ce qui traînait disparaît, et les respawns en attente
  // de cette scène sont vidés. Sinon un objet ramassé hier reviendrait à sa
  // place d'hier, et le tirage du jour ne se verrait qu'au tout premier
  // matin d'une partie.
  //
  // `jour_items_sol` retient le jour du dernier repos PAR SCÈNE : sans lui,
  // traverser un portail deux fois dans la même journée rebattrait les
  // cartes à chaque passage — exactement ce que la Phase 2 interdisait déjà
  // (« recharger la page ne rebat pas les cartes »).
  function reposerItemsSolSiJourNouveau() {
    if (!scene) return;
    if (save.monde.jour_items_sol[scene.id] === save.monde.jour) return;
    const poses = reposerItemsDuJour(scene, registre.tous('items'), save.monde.jour);
    // Une scène sans liste de points (la Grotte) obtient un objet vide : on
    // note quand même la journée, sinon la fonction retournerait chaque
    // frame de l'aube.
    const existant = save.monde.items_sol[scene.id] || {};
    const suivant = { ...existant };
    for (const [itemId, positions] of Object.entries(poses)) suivant[itemId] = positions;
    save.monde.items_sol[scene.id] = suivant;
    itemsSol = suivant;
    if (Object.keys(poses).length > 0) {
      save.monde.respawns_en_attente[scene.id] = {};
      respawnsEnAttente = {};
    }
    save.monde.jour_items_sol[scene.id] = save.monde.jour;
    etatModifie = true;
  }

  function entrerDansScene(sceneId, positionInitialePx) {
    // MT_trainee-poussiere_2026-09-19 : une traînée laissée dans la scène
    // qu'on quitte n'a rien à faire dans la suivante (le héros y est
    // téléporté) — la réserve est vidée sur place, jamais réallouée.
    viderPoussiere(poussiere);
    viderPoussiere(sillageFollet);
    tempsVolFolletMs = 0;
    corpsFollet = decalageCorpsFollet(0, configVolFollet);
    // `D-05`, même raison exactement : un « +1 Bois » gagné dans la scène
    // qu'on quitte n'a rien à faire flottant dans la suivante.
    viderTextesFlottants(textesFlottants);
    scene = chargerScene(registre, sceneId, resoudreOverridesStations(sceneId));
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
      .map((s) => {
        compteurMonstresNes += 1;
        return creerMonstre(registre.obtenir('enemies', s.enemy), {
          x: (s.position.x + 0.5) * scene.tileSize,
          y: (s.position.y + 0.5) * scene.tileSize,
          id: `${s.enemy}#${compteurMonstresNes}`,
        });
      });
    // `D-59` : le tirage du jour s'applique aussi à l'arrivée en scène — un
    // joueur qui a passé la nuit dans la Maison et ressort au matin doit
    // trouver une carte re-semée, pas celle d'hier.
    reposerItemsSolSiJourNouveau();

    // Les monstres nocturnes ne traversent pas un changement de scène : on
    // repart de la nuit en cours, plafond vide (palier B, « non persistés »).
    accumulateursSpawn = {};

    follet = save.hero.companion ? creerFollet(save.hero.companion, hero) : null;
    puzzlesEtat = { ...etatInitialPuzzles(registre), ...save.puzzles };

    // Tuiles atteignables (SD_respawn-items-au-sol_2026-09-17) : calculées
    // depuis la position d'entrée (déjà repoussée hors solide ci-dessus,
    // donc garantie franchissable) — AVANT remplirItemsSol, qui en a besoin.
    tuilesAtteignables = calculerTuilesAtteignables(scene, Math.floor(hero.x / scene.tileSize), Math.floor(hero.y / scene.tileSize));

    // Objets au sol (03_maison-exterieur §3.3) : positions déjà persistées
    // pour cette scène reprises telles quelles (§3.7 : "recharger la page ne
    // rebat pas les cartes"), complétées si besoin (première visite, ou stock
    // partiel après une régénération ratée faute de place). Une scène sans
    // aucune zone de spawn en commun avec un item (la grotte) obtient un
    // `itemsSol` vide, sans erreur.
    itemsSol = remplirItemsSol(scene, registre.tous('items'), save.monde.items_sol[sceneId] || {}, compteurRamassages, tuilesAtteignables);
    // `D-60` (la Plume) : les objets uniques de la scène, posés à leur place
    // exacte tant que leur flag n'est pas levé. APRÈS `remplirItemsSol` et
    // hors du tirage du jour : ils n'ont pas de bloc `spawn`, donc ni l'un ni
    // l'autre ne les connaît — c'est ce qui les garde là où la main les a
    // mis. Une sauvegarde ancienne les retrouve donc au sol, puisque son
    // flag n'est pas posé : aucune migration à écrire.
    for (const objet of scene.objetsUniques) {
      if (flags.has(objet.flag)) continue;
      const position = { x: (objet.x + 0.5) * scene.tileSize, y: (objet.y + 0.5) * scene.tileSize };
      const dejaLa = (itemsSol[objet.item] || []).some((p) => p.x === position.x && p.y === position.y);
      if (!dejaLa) itemsSol = { ...itemsSol, [objet.item]: [...(itemsSol[objet.item] || []), position] };
    }
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
    // specs/05_construction-stations.md §3 : position/rotation EFFECTIVE
    // (scene.js#poseEffectiveInteractif, override validé ou défaut) — jamais
    // `puzzle.position` brut, sinon une station déplacée resterait
    // actionnable à sa VIEILLE position.
    return empreinteAbsoluePuzzle(puzzle, visuel, scene.poseEffectiveInteractif(puzzle.id), scene.tileSize);
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
        // `D-05` : émis AVANT le retrait de l'objet, pour partir de la
        // position réelle où il était posé — après, elle n'existe plus.
        signalerGainItem(itemProche.itemId, resultat.ajoute, itemProche.position.x, itemProche.position.y);
        // `D-58` : l'XP du ramassage, proportionnelle à ce qui est RÉELLEMENT
        // entré en poche (`resultat.ajoute`, 0 si elle est pleine) — jamais
        // au nombre d'objets convoités.
        crediterXpHeros(xpDeCatalogue(itemDef) * resultat.ajoute, itemProche.position);
        // Palier B (§3.2) : retrait immédiat, régénération DIFFÉRÉE (jamais
        // plus un tirage immédiat comme en Phase 2) — respawn_ms de l'item,
        // ou le défaut de catalogue.
        itemsSol = ramasser(itemsSol, itemProche.itemId, itemProche.index);
        save.monde.items_sol[scene.id] = itemsSol;
        // `D-59` : un objet ne repousse dans la journée que s'il DÉCLARE un
        // `respawn_ms`. C'est la conséquence directe du tirage à l'aube :
        // si la branche ramassée revenait 60 s plus tard ailleurs, le semis
        // du jour ne voudrait plus rien dire, et le joueur n'aurait aucune
        // raison de parcourir la carte. Le fruit, lui, garde sa repousse —
        // c'est l'arbre fruitier qui le porte, pas le hasard du matin (le
        // vocabulaire de la Région Maison le dit déjà : « Jardin = puits,
        // arbre fruitier, réapparition du fruit »).
        //
        // Le défaut de 60 s a disparu avec cette décision : il rendait la
        // question indécidable en données, alors que c'est exactement là
        // qu'elle doit se trancher.
        const respawnMs = itemDef.spawn && itemDef.spawn.respawn_ms;
        if (respawnMs) {
          respawnsEnAttente = planifierRespawn(respawnsEnAttente, itemProche.itemId, respawnMs);
          save.monde.respawns_en_attente[scene.id] = respawnsEnAttente;
        }
        // `D-60` : un objet unique ramassé ne revient jamais — son flag le dit,
        // et c'est le flag qui fait foi, pas la liste des objets au sol (qui,
        // elle, est rebattue à chaque aube).
        const objetUnique = scene.objetsUniques.find((o) => o.item === itemProche.itemId);
        if (objetUnique) flags.set(objetUnique.flag);
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
      // `D-05` : depuis le centre de la TUILE récoltée (l'arbre, le rocher),
      // pas depuis le héros — la source du gain est ce qu'on vient de frapper.
      // `resultatRecolte.ajoute` vaut 0 si la poche est pleine : rien ne monte
      // alors, ce qui reflète exactement ce qui s'est passé (cf. `D-28`).
      signalerGainItem(
        donneesRessource.item_produit,
        resultatRecolte.ajoute,
        (ressourceProche.tx + 0.5) * scene.tileSize,
        (ressourceProche.ty + 0.5) * scene.tileSize,
      );
      crediterXpHeros(xpDeCatalogue(donneesRessource) * resultatRecolte.ajoute, {
        x: (ressourceProche.tx + 0.5) * scene.tileSize,
        y: (ressourceProche.ty + 0.5) * scene.tileSize,
      });
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
      menu.ouvrirCraft(() => entreesCraft(station), i18n.t(station.label_key), {
        texteVide: i18n.t('menu.fiche.aucune_recette'),
      });
      return;
    }
    if (station.role === 'stockage') {
      menu.ouvrirCoffre(() => entreesCoffre(station), i18n.t(station.label_key), {
        sousTitre: () => i18n.t('menu.fiche.coffre_piles', { n: nombrePilesCoffre(), max: station.capacite }),
        texteVide: i18n.t('menu.poche_vide'),
      });
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
    // `[OUVERT]` (`Q-43`) : l'XP du puits n'est créditée que si la gourde
    // n'était PAS déjà pleine — boire quand on n'a pas soif ne rapporte rien.
    // Retenu par défaut faute de tranchage : sans cela, le puits deviendrait
    // une source d'XP à volonté, bornée par le seul cooldown anti-spam.
    const soifAvant = save.survie.jauge_soif;
    save.survie = consommerSurvie(save.survie, { jauge_soif: 1 });
    if (save.survie.jauge_soif > soifAvant) {
      // Le « +1xp » monte du CENTRE du puits, pas du héros : même règle que
      // partout ailleurs, le texte dit d'où vient le gain. On réutilise
      // l'empreinte déjà calculée pour le seuil d'interaction — jamais une
      // seconde position qui pourrait diverger de celle qu'on vient de tester.
      const boite = rectangleInteractif(puzzle);
      crediterXpHeros(xpDeCatalogue(station), { x: boite.x + boite.w / 2, y: boite.y + boite.h / 2 });
    }
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
    // `D-62` (T4) : LE point unique du filtre anti-spoil. Tout écran qui
    // liste un catalogue passe par `entreesVisibles` — jamais un `.filter()`
    // écrit sur place, qui finirait par diverger de celui d'à côté. Une
    // entrée verrouillée n'est pas grisée ni remplacée par « ??? » : elle
    // n'est pas dans la liste, donc elle ne peut pas être comptée.
    return entreesVisibles(recettesDeStation(registre, station.id), flags)
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
        // specs/08_menus-cartes.md, palier C5 : la tuile est celle de l'objet
        // PRODUIT ; la fiche dit ce que la recette demande (avec ce qu'on a en
        // poche, relu à chaque affichage), ce qu'elle donne — l'objet produit
        // est décrit par `lignesFicheItem`, comme dans la Poche et le Coffre —,
        // et la raison d'un refus probable.
        const itemSortie = registre.obtenir('items', r.sortie.item);
        const raisons = {
          cooldown: () => i18n.t('menu.fiche.recharge', {
            n: Math.ceil(tempsRestantMs(save.cooldowns, r.id, r.cooldown_ms ?? 60000, heureMs) / 1000),
          }),
          ingredients: () => i18n.t('menu.fiche.ingredients_manquants'),
          poche_pleine: () => i18n.t('menu.fiche.pile_pleine'),
        };
        return {
          texte: `${i18n.t(r.label_key)}${suffixe}`,
          titre: i18n.t(r.label_key),
          icone: itemSortie.render.visuel,
          quantite: r.sortie.qte > 1 ? r.sortie.qte : null,
          lignes: [
            ...r.entrees.map((e) => i18n.t('menu.fiche.ingredient', {
              item: i18n.t(registre.obtenir('items', e.item).label_key), n: e.qte, possede: save.inventaire.items[e.item] || 0,
            })),
            i18n.t('menu.fiche.donne', { item: i18n.t(itemSortie.label_key), n: r.sortie.qte }),
            ...lignesFicheItem(itemSortie, registre, i18n),
            ...(raisons[verdict.raison] ? [raisons[verdict.raison]()] : []),
          ],
          libelleAction: i18n.t('menu.fiche.fabriquer'),
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
  //
  // specs/08_menus-cartes.md, palier C4 : le Coffre est un « maître-détail » à
  // DEUX GROUPES — la poche (on dépose), puis le coffre (on retire). Chaque
  // tuile est un objet ; sa fiche est celle de la Poche (`lignesFicheItem` :
  // trois écrans qui décriraient le même objet chacun à leur façon finiraient
  // par se contredire), plus la raison d'un refus probable.
  //
  // `D-45`, corrigé ici : un transfert vers une pile DÉJÀ PLEINE retirait l'unité
  // de la source sans l'ajouter à la destination (`ajouterItem` plafonne à
  // `stack_max` et le dit par `ajoute`, que personne ne lisait) — l'objet
  // disparaissait. On ajoute D'ABORD, et on ne retire que ce qui est entré.
  function nombrePilesCoffre() {
    return Object.values(save.coffre.items).filter((qte) => qte > 0).length;
  }

  // Déplace UNE unité de `source` vers `destination` (deux clés de `save` qui
  // portent un `items`). Rend vrai si l'unité a bougé.
  function transfererUnite(source, destination, itemId, stackMax) {
    const resultat = ajouterItem(save[destination].items, itemId, 1, stackMax);
    if (resultat.ajoute < 1) return false;
    save[destination].items = resultat.inventaire;
    save[source].items = retirerItem(save[source].items, itemId, 1);
    etatModifie = true;
    return true;
  }

  function entreesCoffre(station) {
    const entreesDepot = Object.entries(save.inventaire.items)
      .filter(([, qte]) => qte > 0)
      .map(([itemId, qte]) => {
        const itemDef = registre.obtenir('items', itemId);
        const dansLeCoffre = save.coffre.items[itemId] || 0;
        const coffrePlein = dansLeCoffre === 0 && nombrePilesCoffre() >= station.capacite;
        const pilePleine = dansLeCoffre >= itemDef.stack_max;
        const refus = coffrePlein ? 'menu.fiche.coffre_plein' : pilePleine ? 'menu.fiche.pile_pleine' : null;
        return {
          texte: `${i18n.t('menu.coffre_deposer')} : ${i18n.t(itemDef.label_key)} × ${qte}`,
          groupe: i18n.t('menu.poche'),
          titre: i18n.t(itemDef.label_key), icone: itemDef.render.visuel, quantite: qte,
          lignes: [...lignesFicheItem(itemDef, registre, i18n), ...(refus ? [i18n.t(refus)] : [])],
          libelleAction: i18n.t('menu.coffre_deposer'),
          grisee: refus !== null,
          action: () => {
            // Le plafond de piles se relit au moment d'agir : `grisee` n'est
            // qu'un indice, le résultat fait foi.
            const dejaPresent = (save.coffre.items[itemId] || 0) > 0;
            if (dejaPresent || nombrePilesCoffre() < station.capacite) {
              transfererUnite('inventaire', 'coffre', itemId, itemDef.stack_max);
            }
            menu.rafraichirCoffre();
          },
        };
      });
    const entreesRetrait = Object.entries(save.coffre.items)
      .filter(([, qte]) => qte > 0)
      .map(([itemId, qte]) => {
        const itemDef = registre.obtenir('items', itemId);
        const pilePleine = (save.inventaire.items[itemId] || 0) >= itemDef.stack_max;
        return {
          texte: `${i18n.t('menu.coffre_retirer')} : ${i18n.t(itemDef.label_key)} × ${qte}`,
          groupe: i18n.t(station.label_key),
          titre: i18n.t(itemDef.label_key), icone: itemDef.render.visuel, quantite: qte,
          lignes: [...lignesFicheItem(itemDef, registre, i18n), ...(pilePleine ? [i18n.t('menu.fiche.pile_pleine')] : [])],
          libelleAction: i18n.t('menu.coffre_retirer'),
          grisee: pilePleine,
          action: () => {
            transfererUnite('coffre', 'inventaire', itemId, itemDef.stack_max);
            menu.rafraichirCoffre();
          },
        };
      });
    return [...entreesDepot, ...entreesRetrait];
  }

  // --- Construction (specs/05_construction-stations.md) : placement libre
  // des stations placable d'une structure, depuis le menu Pause. ---

  // Structure dans laquelle se trouve le héros, STRICTEMENT (portes exclues,
  // §4 edge case : dans l'embrasure ne compte pas) — `structure.interieur`
  // (scenes.json) est déjà ce rectangle "portes exclues", donc un simple test
  // d'appartenance suffit, jamais un second rectangle "réduit" calculé ici.
  function structureHeros() {
    const tx = Math.floor(hero.x / scene.tileSize);
    const ty = Math.floor(hero.y / scene.tileSize);
    return (scene.structures || []).find((s) => s.interieur && dansRectangleTuile(tx, ty, s.interieur)) || null;
  }

  // Stations PLACABLE de `structure` (§2) : appartenance déterminée par la
  // position PAR DÉFAUT (puzzles.json) dans le rectangle de la structure —
  // jamais un lien id->structure en dur, qui casserait dès une 2ᵉ pièce
  // (Poste avancé, même patron déclaré par la spec §1).
  function stationsPlacablesDeStructure(structure) {
    return scene.interactifs
      .map((id) => registre.obtenir('puzzles', id))
      .filter((p) => p && p.type === 'station' && dansRectangleTuile(p.position.x, p.position.y, structure.rect))
      .filter((p) => registre.obtenir('stations', p.station_type).placable);
  }

  // §3 : "disponible depuis MENU seulement quand le héros est dans la
  // structure maison". Ce n'est plus cette fonction qui décide de la carte du
  // menu (specs/08_menus-cartes.md : c'est une condition de `menus.json`, sur
  // la valeur nommée `stations_placables` ci-dessous) ; elle reste exposée
  // pour les tests du mode Construction.
  function disponibiliteConstruction() {
    return structureHeros() !== null;
  }

  // Valeur nommée `stations_placables` (voir `construireFlags`) : c'est elle,
  // désormais, qui décide si la carte Construction s'affiche — la condition
  // vit dans `data/menus.json`. 0 hors de toute structure, et avant que la
  // première scène soit chargée.
  function nombreStationsPlacables() {
    const structure = scene ? structureHeros() : null;
    return structure ? stationsPlacablesDeStructure(structure).length : 0;
  }

  // Liste des stations placable de la structure courante — fournie à
  // ui/menu.js via menu.definirEntreesConstruction(). Vide (jamais une
  // erreur) si le héros n'est dans aucune structure : le menu n'aurait de
  // toute façon pas dû montrer l'entrée (disponibiliteConstruction), mais un
  // appel isolé (test) reste sans danger.
  function entreesConstruction() {
    const structure = structureHeros();
    if (!structure) return [];
    return stationsPlacablesDeStructure(structure).map((p) => {
      const stationType = registre.obtenir('stations', p.station_type);
      // specs/08_menus-cartes.md, palier C6 : la tuile est la silhouette de la
      // station (celle du monde, recadrée par `icone_canvas.js#cadrer`). Les
      // lignes de la fiche — les touches du placement — sont ajoutées par
      // `ui/menu.js`, qui sait déjà les écrire pour le bandeau.
      return {
        texte: i18n.t(stationType.label_key),
        titre: i18n.t(stationType.label_key),
        icone: p.render.visuel,
        libelleAction: i18n.t('menu.fiche.deplacer'),
        action: () => demarrerConstruction(p, structure),
      };
    });
  }

  // Verdict de la pose CANDIDATE (§3, recalculé à chaque frame active) : les
  // AUTRES interactifs solides de la structure sont déjà résolus à leur
  // position effective dans scene.empreintesSolides (celle qu'on déplace en
  // est exclue) — jamais un second calcul d'empreintes ici. Réutilisé tel
  // quel par le rendu (fantôme vert/rouge) ET par la confirmation.
  function recalculerVerdictConstruction() {
    const visuel = registre.obtenir('visuels', construction.puzzle.render.visuel);
    const empreinteCandidate = empreinteAbsoluePuzzle(construction.puzzle, visuel, construction.pose, scene.tileSize);
    const autresEmpreintes = scene.empreintesSolides.filter((e) => e.id !== construction.puzzle.id);
    construction.verdict = poseValide({
      empreinte: empreinteCandidate, structure: construction.structure, autresEmpreintes, tileSize: scene.tileSize,
    });
  }

  function demarrerConstruction(puzzle, structure) {
    const poseActuelle = save.maison.stations[puzzle.id] || {
      x: puzzle.position.x, y: puzzle.position.y, rotation: puzzle.rotation || 0,
    };
    construction = {
      puzzle,
      structure,
      pose: { x: poseActuelle.x, y: poseActuelle.y, rotation: poseActuelle.rotation || 0 },
      pousseeX: 0,
      pousseeY: 0,
      verdict: null,
    };
    recalculerVerdictConstruction();
    // MT_construction-bandeau-placement_2026-09-17 : retire l'écran-liste et
    // lève le bandeau en une seule transition (menu.js#ouvrirPlacementConstruction)
    // — jamais `menu.fermer()` seul, qui laissait l'écran-liste affiché par-
    // dessus la pièce (cause du micro-ticket : placement à l'aveugle).
    const stationType = registre.obtenir('stations', puzzle.station_type);
    menu.ouvrirPlacementConstruction(i18n.t(stationType.label_key));
  }

  // `B` pendant le placement (§4, MT_construction-bandeau-placement) :
  // annule la pose en cours, jamais persistée, retour à la LISTE (on enchaîne
  // le rangement de la maison sans repasser par le menu Pause).
  function annulerConstruction() {
    construction = null;
    menu.reouvrirListeConstruction();
  }

  // `MENU` pendant le placement (§4, même fiche) : annule la pose en cours et
  // revient PROPREMENT au menu Pause (jamais superposé au placement) — seul
  // chemin de sortie complète du mode Construction.
  function quitterConstructionVersMenuPause() {
    construction = null;
    menu.fermerPlacementConstruction();
    menu.ouvrir();
  }

  // Recharge la scène après une pose confirmée (§3 : "la station devient
  // solide à sa nouvelle place ; le héros est repoussé s'il s'y trouve") —
  // rechargement CIBLÉ (pas entrerDansScene(), qui régénérerait décor/
  // monstres/items au sol pour rien) : réutilise chargerScene +
  // trouverPositionLibrePlusProche, exactement comme une entrée en scène
  // normale, jamais un second mécanisme de repoussement (consignes §6).
  function rechargerSceneApresConstruction() {
    scene = chargerScene(registre, scene.id, resoudreOverridesStations(scene.id));
    const positionLibre = trouverPositionLibrePlusProche(scene, hero.x, hero.y, flags.has);
    if (positionLibre.x !== hero.x || positionLibre.y !== hero.y) {
      console.warn(
        'main.js#rechargerSceneApresConstruction : héros repoussé par la nouvelle pose d\'une station '
        + `(${hero.x},${hero.y}) -> (${positionLibre.x},${positionLibre.y})`
      );
    }
    hero.x = positionLibre.x;
    hero.y = positionLibre.y;
    save.hero.x = hero.x;
    save.hero.y = hero.y;
    tuilesAtteignables = calculerTuilesAtteignables(
      scene, Math.floor(hero.x / scene.tileSize), Math.floor(hero.y / scene.tileSize)
    );
  }

  // `A` pose valide (§4) : persiste, recharge la scène ciblée, puis retour à
  // la LISTE (jamais un simple retour au jeu nu) — "on enchaîne et on range
  // toute la maison sans repasser par MENU" (décision Xav).
  function confirmerConstruction() {
    save.maison.stations[construction.puzzle.id] = { ...construction.pose };
    etatModifie = true;
    construction = null;
    rechargerSceneApresConstruction();
    menu.reouvrirListeConstruction();
  }

  // Clé de dialogue de refus par raison (poseValide()) — §3 : "message
  // localisé avec la raison", jamais un texte en dur ici (3 entrées de
  // dialogues.json, une par raison possible retournée par placement.js).
  const DIALOGUE_REFUS_CONSTRUCTION = {
    hors_interieur: 'dlg_construction_refus_interieur',
    chevauchement: 'dlg_construction_refus_chevauchement',
    couloir_bloque: 'dlg_construction_refus_couloir',
  };

  // Déplacement d'une tuile par front montant (§3, jamais en px) — même
  // seuil que le choix du follet (SEUIL_POUSSEE_CHOIX), 2 axes indépendants
  // via 2 loquets distincts (pousseeX/pousseeY, même principe que
  // pousseeChoixPrecedente). Bornée au rectangle de la structure (garde-fou
  // contre un compteur qui dérive à l'infini si on martèle MOVE hors de
  // l'intérieur) — la validité RÉELLE (intérieur/chevauchement/couloir) reste
  // décidée par poseValide, jamais ce clamp.
  function traiterConstruction(etat) {
    const signe = (v) => (v > SEUIL_POUSSEE_CHOIX ? 1 : v < -SEUIL_POUSSEE_CHOIX ? -1 : 0);
    const sx = signe(etat.move.x);
    const sy = signe(etat.move.y);
    const { rect } = construction.structure;
    if (sx !== 0 && construction.pousseeX === 0) {
      construction.pose.x = Math.max(rect.x, Math.min(rect.x + rect.w - 1, construction.pose.x + sx));
    }
    if (sy !== 0 && construction.pousseeY === 0) {
      construction.pose.y = Math.max(rect.y, Math.min(rect.y + rect.h - 1, construction.pose.y + sy));
    }
    construction.pousseeX = sx;
    construction.pousseeY = sy;

    // Rotation (§9 [OUVERT], provisoire appliqué : SKILL_1, contextuel au
    // mode qui est une UI) — 90° horaires par appui, jamais en continu.
    if (etat.skill_1.pressed) construction.pose.rotation = (construction.pose.rotation + 1) % 4;

    recalculerVerdictConstruction();

    if (etat.attack.pressed) {
      if (construction.verdict.ok) {
        confirmerConstruction();
      } else {
        dialogue.ouvrir(
          resoudreLignes(DIALOGUE_REFUS_CONSTRUCTION[construction.verdict.raison], registre, i18n, save.hero.companion)
        );
      }
      return;
    }
    if (etat.skill_3.pressed) annulerConstruction();
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
  //
  // specs/08_menus-cartes.md, palier C3 : l'écran Stats est un « maître-détail ».
  // Une TUILE par stat (son icône de `stats.json`, sa valeur en pastille) ; sa
  // FICHE liste les stats dérivées qui en dépendent, avec leur valeur du moment
  // — lues dans `stats_derivees.json` (champ `stat`), jamais écrites par stat :
  // une dérivée ajoutée au catalogue apparaît ici sans code. Le bouton « +1 »
  // n'existe que s'il reste un point à dépenser (l'écran est d'abord un écran
  // d'information : quatre tuiles grisées le feraient passer pour désactivé).
  // Les deux lignes purement informatives de l'ancienne liste — points libres,
  // progression d'XP — ne sont plus des entrées sans action : elles sont le
  // SOUS-TITRE de l'écran (`sousTitreStats`).
  function obtenirEntreesStats() {
    const statsPrimaires = calculerStatsPrimaires(registre, resoudreModificateursHeros());
    const statsDerivees = calculerStatsDerivees(registre, statsPrimaires);
    return registre.tous('stats').map((s) => {
      const peutAjouter = save.hero.points_stats_libres > 0;
      const suffixe = peutAjouter ? ` (${i18n.t('menu.stats_ajouter')})` : '';
      return {
        texte: `${i18n.t(s.label_key)} : ${statsPrimaires[s.id]}${suffixe}`,
        titre: i18n.t(s.label_key),
        icone: s.icone || null,
        quantite: statsPrimaires[s.id],
        lignes: registre.tous('stats_derivees')
          .filter((d) => d.stat === s.id)
          .map((d) => `${i18n.t(d.label_key)} : ${Math.round(statsDerivees[d.id])}`),
        libelleAction: peutAjouter ? i18n.t('menu.stats_ajouter') : null,
        grisee: false,
        action: () => {
          if (save.hero.points_stats_libres <= 0) return;
          save.hero.stats.points[s.id] = (save.hero.stats.points[s.id] || 0) + 1;
          save.hero.points_stats_libres -= 1;
          etatModifie = true;
          menu.rafraichirStats();
        },
      };
    });
  }

  // MT_hud-ligne-haute_2026-09-19 : la barre d'XP ayant quitté le HUD, la
  // progression doit rester lisible quelque part — c'est ici, avec les points
  // à dépenser, dans l'en-tête de l'écran Stats : visible quelle que soit la
  // tuile regardée.
  function sousTitreStats() {
    return [
      `${i18n.t('menu.points_libres')} : ${save.hero.points_stats_libres}`,
      `${i18n.t('menu.stats_xp')} : ${i18n.t('hud.niveau_prefixe')}${save.hero.niveau} — ${Math.round(ratioProgressionXp() * 100)} %`,
    ].join(' · ');
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
  //
  // `position` est OPTIONNELLE (`D-58`) : quand l'appelant sait d'où vient le
  // gain — la tuile récoltée, l'objet ramassé, le puits —, un « +1xp » monte
  // de cet endroit. Le combat et le craft ne la passent pas encore ; le jour
  // où ils le feront (position du monstre, de la station), il n'y aura rien à
  // écrire ici.
  function crediterXpHeros(xpGagne, position = null) {
    if (!xpGagne) return;
    if (position) signalerGainXp(xpGagne, position.x, position.y);
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

  // Comportement « un domaine, pas un piquet » (specs/07 §2.3, palier C).
  //
  // La décision est prise par une machine à états **pure**
  // (`comportement_monstres.js`) qui ne connaît ni la scène ni les
  // collisions : elle dit où le monstre veut aller et à quelle fraction de
  // sa vitesse. Le mouvement, lui, se fait ici, avec les fonctions du jeu —
  // `resoudreDeplacement`, la même que pour le héros, donc un rôdeur glisse
  // le long des arbres au lieu de les traverser.
  //
  // Ne concerne QUE les monstres nés d'une table (`spawnId`). Ceux de la
  // Grotte gardent leur ligne droite de Phase 1, validée en jeu.
  function deplacerMonstreDuChaos(monstre, vitesse, deltaS, deltaMs) {
    const table = tablesDeScene(registre.tous('spawns'), scene.id).find((t) => t.id === monstre.spawnId);
    if (!table) return approcherEnLigneDroite(monstre, hero.x, hero.y, vitesse, deltaS);

    compteurPointsErrance += 1;
    const graine = compteurPointsErrance;
    const decision = avancerComportement(monstre.comportement || creerComportement(), {
      deltaMs,
      monstre,
      hero,
      table,
      tileSize: scene.tileSize,
      distanceParcouruePx: monstre.distanceParcouruePx || 0,
      estEnZoneSure: (x, y) => estEnZoneSurePx(scene, x, y),
      tirerPointDomaine: () => tirerPointDomaine(scene, { domaine: table.domaine, graine, tuilesAtteignables }),
      alea: () => ((graine * 9301 + 49297) % 233280) / 233280,
    });

    const suivant = { ...monstre, comportement: decision.comportement };
    if (!decision.but) {
      suivant.distanceParcouruePx = 0;
      return suivant;
    }

    // Pas voulu par la machine à états, puis collision : la différence entre
    // les deux est exactement ce que l'anti-blocage observe.
    const vise = approcherEnLigneDroite(monstre, decision.but.x, decision.but.y, vitesse * decision.facteurVitesse, deltaS);
    const rayon = RAYON_MONSTRE_CHAOS_PX;
    const boite = { x: monstre.x - rayon, y: monstre.y - rayon, largeur: rayon * 2, hauteur: rayon * 2 };
    const resolu = resoudreDeplacement(scene, boite, vise.x - monstre.x, vise.y - monstre.y, flags.has);
    suivant.x = resolu.x + rayon;
    suivant.y = resolu.y + rayon;
    suivant.distanceParcouruePx = Math.hypot(suivant.x - monstre.x, suivant.y - monstre.y);
    return suivant;
  }

  function mettreAJourCombat(deltaMs, etatGameplay, statsPrimaires, statsDerivees) {
    const deltaS = deltaMs / 1000;
    anneauAttaqueMs = tickCooldown(anneauAttaqueMs, deltaMs);

    // Le compagnon est résolu AVANT la mise à jour du follet : depuis `D-37`,
    // la règle d'engagement lit l'aura (donc le catalogue), et non plus une
    // constante de portée.
    const companionDuFollet = follet ? registre.obtenir('companions', follet.companionId) : null;
    if (follet) {
      follet = mettreAJourFollet(follet, hero, monstres, companionDuFollet);
      // `D-54` : la cible ordonnée par le joueur passe APRÈS la règle
      // automatique (sinon celle-ci la reprendrait dans la même frame) et
      // AVANT le déplacement, pour que le vol amorti de cette frame-ci parte
      // déjà vers le nouveau monstre. `etatGameplay` est déjà neutralisé sous
      // UI : rien à tester de plus ici.
      if (etatGameplay.target_next.pressed) {
        follet = cibleSuivanteFollet(follet, hero, monstres, companionDuFollet);
      }
      follet = avancerFollet(follet, hero, monstres, deltaS);
    }

    // Géométrie de l'aura, résolue UNE fois pour la frame (`D-51`) : son centre
    // est le point LOGIQUE du follet — celui dont `D-39` fait dériver le corps
    // et le cercle affiché —, son rayon passe par la fonction de résolution que
    // le dessin lit aussi. Deux monstres dans le cercle reçoivent donc tous les
    // deux l'effet, sans que rien d'autre ait à le savoir.
    const auraFollet = companionDuFollet
      ? { centre: { x: follet.x, y: follet.y }, rayonPx: resoudreRayonAuraPx(companionDuFollet) }
      : null;

    monstres = monstres.map((monstre) => {
      if (monstre.mort) return monstre;
      const donneesEnnemi = registre.obtenir('enemies', monstre.enemyId);
      const { force, vitesse, dot } = statsEffectivesMonstre(registre, donneesEnnemi, follet, {
        position: { x: monstre.x, y: monstre.y },
        aura: auraFollet,
      });

      // Palier C : les monstres du Chaos décident (errance / poursuite /
      // désintérêt) ; ceux de la Grotte vont droit au but, comme en Phase 1.
      let suivant = monstre.spawnId
        ? deplacerMonstreDuChaos(monstre, vitesse, deltaS, deltaMs)
        : approcherEnLigneDroite(monstre, hero.x, hero.y, vitesse, deltaS);
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
      const arme = resoudreArmeEquipee(registre, save.hero.equipement.arme);
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
    // — depuis `D-37` ce n'est plus une constante mais LE prédicat
    // d'engagement du follet (companion.js#monstreEngageable), appelé tel
    // quel : l'indice apparaît exactement quand le follet partirait, et une
    // orbite ou une aura qui grandira l'emmènera avec elle.
    const companionPourIndice = follet ? registre.obtenir('companions', follet.companionId) : null;
    if (monstres.some((m) => monstreEngageable(m, hero, follet, companionPourIndice))) {
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
    // MT_mesure-saccades_2026-09-19 : rien hors `?debug=fps` — gardé sur
    // `moniteurPerf.actif` (jamais juste le no-op par défaut) pour que les
    // tests headless existants, qui fournissent un `input` sans
    // `peripheriqueActif()` (jamais lu par maj() avant ce ticket), continuent
    // de passer sans connaître ce nouvel instrument.
    if (moniteurPerf.actif) moniteurPerf.enregistrerPeripherique(input.peripheriqueActif());

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
      // MT_intro-follets-visibles_2026-09-19 : l'intro N'EST PLUS mise à
      // `null` ici. Avant, elle l'était à l'instant exact où le dialogue de
      // choix s'ouvrait, et comme `choixFollet` n'est posé qu'au `onFermer`
      // de ce dialogue, plus aucun des deux calques (dessinerIntroConvergence
      // / dessinerEcranChoixFollet) ne dessinait les follets pendant tout le
      // texte — ils disparaissaient puis revenaient d'un coup à l'appui sur A.
      // Elle vit désormais jusqu'à confirmerChoixFollet(), en étape ATTENTE.
      // `terminee` est un FRONT (comparé à son état d'avant la frame), pas un
      // niveau : le dialogue ne doit s'ouvrir qu'une seule fois.
      const introEtaitTerminee = intro.terminee;
      intro = avancerIntro(intro, deltaMs);
      if (intro.terminee && !introEtaitTerminee) demarrerChoixFollet();
    }
    const departEtaitActif = depart !== null;
    if (depart) {
      depart = avancerDepart(depart, deltaMs);
      if (depart.terminee) depart = null;
    }

    // MT_construction-bandeau-placement_2026-09-17 §4 : `MENU` pendant le
    // placement a désormais un effet (annule + revient au menu Pause,
    // jamais superposé) — cas à part du reste, qui n'ouvre le menu QUE s'il
    // n'y a encore aucune UI ouverte.
    //
    // `Q-36` (specs/08_menus-cartes.md, palier B — retenu par défaut, [OUVERT]) :
    // `MENU`, menu ouvert, FERME TOUT, depuis n'importe quelle profondeur et
    // quel que soit l'écran (Craft et Coffre compris, ils vivent dans la même
    // pile). Par `menu.fermer()`, qui EST la fonction du `[X]` de la racine
    // (`navigation.fermerTout`) : un seul chemin de fermeture, donc pas de
    // parité clic/verbe à surveiller. C'est ici, et pas dans
    // `menu.traiterInput`, parce que c'est ici qu'on sait que `MENU` vient
    // d'OUVRIR le menu dans cette même frame — le traiter là-bas le refermerait
    // aussitôt.
    let menuFermeParVerbe = false;
    if (etatBrut.menu.pressed && !dialogueOuvertMaintenant && !choixFolletActif() && !introEtaitActive && !departEtaitActif) {
      if (constructionActif()) {
        quitterConstructionVersMenuPause();
      } else if (!menu.estOuvert()) {
        menu.ouvrir();
      } else {
        menu.fermer();
        menuFermeParVerbe = true;
      }
    }

    // Point unique de priorité UI/gameplay (patron du menu, §3.7 : étendu à
    // "une UI est ouverte" = menu OU dialogue OU choix du follet OU intro OU
    // départ OU construction, specs/05_construction-stations.md §3 : "le jeu
    // reste gelé comme sous UI") : le gameplay ne voit jamais les verbes
    // bruts pendant qu'une UI les capte.
    // `menuFermeParVerbe` : la frame où `MENU` ferme le menu reste une frame
    // d'UI, exactement comme celle où B le ferme (là, `uiOuverte` est calculé
    // AVANT `menu.traiterInput`, donc encore vrai). Le gameplay ne voit jamais
    // les verbes d'une frame qu'une UI a consommée, quel que soit le verbe.
    const uiOuverte = (
      menu.estOuvert() || dialogueOuvertMaintenant || choixFolletActif() || introEtaitActive || departEtaitActif ||
      constructionActif() || menuFermeParVerbe
    );
    // `D-54` : LE point de décision unique annonce son verdict au dehors
    // (aujourd'hui : le `preventDefault` de `Tab`, qui arrive hors frame).
    onEtatUi(uiOuverte);
    if (menu.estOuvert()) menu.traiterInput(etatBrut);
    else if (dialogueOuvertMaintenant) dialogue.traiterInput(dialogueVientDeSOuvrir ? etatNeutre(etatBrut) : etatBrut);
    else if (choixFolletActif()) traiterChoixFollet(etatBrut);
    else if (constructionActif()) traiterConstruction(etatBrut);

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
    const xAvantDeplacement = hero.x;
    const yAvantDeplacement = hero.y;
    if (dx !== 0 || dy !== 0) {
      const resultat = resoudreDeplacement(scene, hitboxHeros(), dx, dy, flags.has);
      hero.x = resultat.x + hero.rayon;
      hero.y = resultat.y + hero.rayon;
      save.hero.x = hero.x;
      save.hero.y = hero.y;
      etatModifie = true;
    }

    // Traînée de poussière (MT_trainee-poussiere_2026-09-19) : émise à la
    // DISTANCE RÉELLEMENT parcourue (après collision, pas le déplacement
    // demandé) — pousser contre un mur ne soulève donc aucune poussière, et
    // la densité de la traînée ne dépend pas du framerate. Gelée sous UI
    // comme tout le reste du gameplay (§4), donc rien pendant l'intro, le
    // dialogue, le menu ou la construction : le point de décision reste
    // `uiOuverte`, jamais une condition propre à l'effet.
    // Éclat de montée de niveau : détecté sur le CHANGEMENT de
    // `save.hero.niveau` (jamais sur l'XP brute, qui bouge à chaque gain) —
    // donc un seul éclat par palier franchi, quelle que soit la source d'XP.
    if (save.hero.niveau !== niveauPrecedent) {
      if (save.hero.niveau > niveauPrecedent) eclatNiveauMs = ECLAT_NIVEAU_MS;
      niveauPrecedent = save.hero.niveau;
    }
    if (eclatNiveauMs > 0) eclatNiveauMs = Math.max(0, eclatNiveauMs - deltaMs);

    if (!uiOuverte) {
      avancerPoussiere(poussiere, {
        x: hero.x,
        y: hero.y + (effetPoussiere.offset_y_px || 0),
        distancePx: Math.hypot(hero.x - xAvantDeplacement, hero.y - yAvantDeplacement),
        deltaMs,
        emettre: true,
      });
      // `D-05` : gelé par le MÊME point de décision que tout le reste du
      // gameplay (`uiOuverte`), jamais par une condition propre. Conséquence
      // assumée : au tout premier ramassage, qui ouvre un dialogue, le
      // « +1 Branche » se fige le temps de la réplique puis reprend sa montée
      // — comme la poussière, comme les cooldowns, comme l'horloge du monde.
      avancerTextesFlottants(textesFlottants, deltaMs);
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
      verifierLignesAmbiance();

      // Horloge "temps de jeu actif" (daynight.js#avancerHeure) : avancée
      // dans TOUTES les scènes désormais (Palier A/C, specs/04_maison-
      // interieur.md §6 : "en extraire une fonction partagée, jamais une
      // seconde horloge") — cooldowns.js et survival.js la réutilisent telle
      // quelle pour les recettes/ressources/puits/jauges, y compris dans la
      // Grotte (survie et cooldowns s'y appliquent aussi). Le rendu du voile
      // jour/nuit, lui, reste conditionné à `scene.cycleJourNuit` (dessiner()
      // plus bas) — seule l'avance de l'horloge devient inconditionnelle.
      // `D-59` : le NUMÉRO DU JOUR, qui sert de graine au tirage des objets
      // au sol. Il ne peut se déduire de `save.monde.heure`, qui boucle : on
      // le compte au moment où l'horloge repasse par zéro, c'est-à-dire à la
      // fin de l'aube — le début d'une journée neuve. Une seconde horloge ?
      // Non : un compteur de tours de CELLE-CI, dérivé d'elle, jamais avancé
      // de son côté.
      const heureAvant = save.monde.heure;
      save.monde.heure = avancerHeure(save.monde.heure, deltaMs);
      if (save.monde.heure < heureAvant) {
        save.monde.jour += 1;
        reposerItemsSolSiJourNouveau();
      }
      etatModifie = true;

      // Vol et sillage du follet (`D-36`) : dans ce bloc, donc gelés sous UI
      // par le point de décision unique, comme la poussière du héros. Le
      // sillage naît à la SILHOUETTE (là où l'œil voit le follet), et sa
      // densité suit la distance parcourue par elle.
      if (follet) {
        const avantX = follet.x + corpsFollet.dx;
        const avantY = follet.y + corpsFollet.dy;
        tempsVolFolletMs += deltaMs;
        corpsFollet = decalageCorpsFollet(tempsVolFolletMs, configVolFollet);
        const parcourue = Math.hypot((follet.x + corpsFollet.dx) - avantX, (follet.y + corpsFollet.dy) - avantY);
        avancerPoussiere(sillageFollet, {
          x: follet.x + corpsFollet.dx,
          y: follet.y + corpsFollet.dy + effetSillage.offset_y_px,
          distancePx: parcourue,
          deltaMs,
          emettre: true,
        });
      }

      // Apparitions nocturnes (palier B) : APRÈS l'avance de l'horloge, pour
      // que la phase lue soit celle de cette frame-ci — sinon la première
      // frame de la nuit ferait encore apparaître au crépuscule, et la
      // première frame de l'aube laisserait vivre une frame de trop.
      mettreAJourApparitionsNocturnes(deltaMs);

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
      const resultatRespawn = tickRespawns(scene, registre.tous('items'), itemsSol, respawnsEnAttente, deltaMs, compteurRamassages, tuilesAtteignables);
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
      const taille = i === choixFollet.index ? TAILLE_FOLLET_SELECTIONNE_PX : TAILLE_FOLLET_REPOS_PX;
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
    // `choixFolletActif()` a la priorité : dès que l'écran de choix est ouvert,
    // c'est LUI qui dessine les 3 follets (avec le halo de sélection). Sans
    // cette garde, l'intro restée vivante (étape ATTENTE, cf. maj()) les
    // dessinerait une 2ᵉ fois par-dessus.
    if (!intro || choixFolletActif()) return null;
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

  // Échelle à laquelle le vrai follet (celui de companion.js) est dessiné
  // cette frame. En régime établi : son échelle de jeu, déclarée en données
  // (`D-34`). Pendant l'étape de départ des deux follets non élus, elle
  // s'interpole depuis la taille qu'il avait sur l'écran de choix : le follet
  // élu rétrécit **en même temps** que les deux autres s'éloignent, au lieu de
  // changer de taille d'une frame à l'autre (décision du 19/09 : aucun saut
  // aux frontières). Les deux mouvements suivent la même courbe, celle de
  // intro.js#avancementDepart — jamais une 2ᵉ horloge.
  function echelleFolletAffichee(companion) {
    const echelleJeu = resoudreEchelleJeuFollet(companion);
    if (!depart) return echelleJeu;
    const echelleCinematique = TAILLE_FOLLET_SELECTIONNE_PX / TAILLE_REFERENCE_FOLLET_PX;
    return echelleFolletEnTransition(echelleCinematique, echelleJeu, avancementDepart(depart));
  }

  // Apparitions nocturnes (specs/07_chaos-nocturne.md, palier B).
  //
  // Appelée **dans** le bloc `if (!uiOuverte)` de maj(), donc gelée sous UI
  // par le point de décision unique existant, jamais par une condition à
  // elle. Elle lit la phase du cycle sur l'horloge de temps de jeu actif
  // (`save.monde.heure`), celle-là même que les cooldowns et la survie :
  // pas de 2ᵉ horloge.
  //
  // Deux moitiés, dans cet ordre : d'abord **l'aube** (tout ce qui est né de
  // la nuit disparaît, sans butin et sans XP — ils ne sont pas tués, ils
  // s'en vont), ensuite **la naissance** progressive jusqu'au plafond.
  function mettreAJourApparitionsNocturnes(deltaMs) {
    const phase = phaseAHeure(save.monde.heure);
    const tables = tablesDeScene(registre.tous('spawns'), scene.id);
    if (tables.length === 0) return;

    for (const table of tables) {
      const active = tableActive(table, { phase, evaluerCondition: flags.evaluate });

      if (!active) {
        // Retrait sec côté logique (le fondu est l'affaire du rendu, palier
        // D) : `onMonstreMort` n'est PAS appelé, donc ni butin ni XP — la
        // nuit s'en va, elle ne se fait pas tuer.
        monstres = monstres.filter((m) => m.spawnId !== table.id);
        accumulateursSpawn[table.id] = 0;
        continue;
      }

      const vivants = monstres.filter((m) => m.spawnId === table.id && !m.mort).length;
      if (vivants >= table.max_simultanes) {
        // Plafond atteint : on n'accumule pas de « dette », sans quoi tuer
        // un monstre en ferait apparaître trois d'un coup.
        accumulateursSpawn[table.id] = 0;
        continue;
      }

      const accumule = (accumulateursSpawn[table.id] || 0) + deltaMs;
      if (accumule < table.intervalle_ms) {
        accumulateursSpawn[table.id] = accumule;
        continue;
      }
      accumulateursSpawn[table.id] = 0;

      compteurMonstresNes += 1;
      const position = tirerPositionApparition(scene, {
        zoneId: table.zone_apparition,
        hero,
        distanceMinTuiles: table.distance_min_joueur_tuiles,
        dejaOccupees: monstres.filter((m) => !m.mort),
        graine: compteurMonstresNes,
        tuilesAtteignables,
      });
      // Aucune position tenable (joueur planté au milieu de la zone, tuiles
      // saturées) : on ne force rien, la prochaine fenêtre retentera.
      if (!position) continue;

      const monstre = creerMonstre(registre.obtenir('enemies', table.enemy), {
        x: position.x,
        y: position.y,
        id: `${table.enemy}#${compteurMonstresNes}`,
      });
      // Marque d'appartenance : c'est elle qui dit qui doit disparaître à
      // l'aube et qui compte dans le plafond de CETTE table. Les monstres
      // posés à la main dans la scène (la Grotte) ne l'ont pas, et ne sont
      // donc jamais balayés.
      monstre.spawnId = table.id;
      monstre.comportement = creerComportement();
      monstre.distanceParcouruePx = 0;
      monstres = [...monstres, monstre];
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
    // MT_mesure-saccades_2026-09-19, piste 3 (arrondi caméra/héros) : no-op
    // hors `?debug=fps`. Position écran EN LOGIQUE (avant la transform
    // logique->physique de render.js), lue au même endroit que dessinerScene
    // plus bas pour comparer d'une frame à l'autre.
    moniteurPerf.enregistrerPositionHero(hero.x - camera.x, hero.y - camera.y);

    const companionActif = follet ? registre.obtenir('companions', follet.companionId) : null;
    const heroVisuel = registre.obtenir('visuels', VISUEL_HEROS_ID);

    // `D-40` : plus d'étiquette de nom (l'ancien §4 de SD_ui-lisibilite est
    // retiré, décision de Xav du 20/09 — forme et couleur suffisent). Le nom
    // n'est donc plus résolu ici : `enemies.label_key` et les locales restent
    // en place pour le futur bestiaire, simplement personne ne les lit au
    // rendu. `visuel` (§3.3) reste résolu ici — render.js n'ouvre jamais
    // visuels.json par id.
    const monstresAffiches = monstres.map((m) => {
      const donneesEnnemi = registre.obtenir('enemies', m.enemyId);
      return {
        ...m,
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
      .map((p) => {
        // specs/05_construction-stations.md §3 : position/rotation EFFECTIVE
        // (override validé ou défaut) — une station déplacée se dessine à sa
        // VRAIE position, jamais celle de puzzles.json.
        const pose = scene.poseEffectiveInteractif(p.id);
        return {
          x: (pose.x + 0.5) * scene.tileSize,
          y: (pose.y + 0.5) * scene.tileSize,
          actif: p.type === 'levier' && !!puzzlesEtat[p.id]?.actif,
          visuel: registre.obtenir('visuels', p.render.visuel),
          // specs/04_stations-proportions-collision.md : échelle par entrée
          // (`undefined` pour un levier -> dessinerVisuel applique son propre
          // défaut 1, jamais un second défaut dupliqué ici).
          echelle: p.echelle,
          rotation: pose.rotation * 90,
        };
      });

    // Anneau d'attaque (§3.1) : converti en px logiques ici (main.js a le
    // registre pour résoudre l'arme équipée) — render.js ne connaît que
    // [rayonMin, rayonMax, alpha], jamais weapons.json.
    const arme = resoudreArmeEquipee(registre, save.hero.equipement.arme);
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

    // MT_mesure-saccades_2026-09-19, piste 4 ("entités dessinées") : no-op
    // hors `?debug=fps`.
    moniteurPerf.enregistrerEntites({
      monstres: monstresAffiches.length,
      puzzles: puzzlesAffiches.length,
      objetsSol: objetsSolAffiches.length,
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

    // Fantôme de pose (specs/05_construction-stations.md §3) : résolu ici
    // (main.js a le registre) à partir de `construction.pose`/`.verdict` déjà
    // tenus à jour par traiterConstruction() — render.js ne connaît que
    // { x, y, visuel, echelle, rotation, valide }, jamais construction.js par
    // id (même patron que puzzlesAffiches/objetsSolAffiches ci-dessus).
    const fantomeAffiche = construction ? {
      x: (construction.pose.x + 0.5) * scene.tileSize,
      y: (construction.pose.y + 0.5) * scene.tileSize,
      visuel: registre.obtenir('visuels', construction.puzzle.render.visuel),
      echelle: construction.puzzle.echelle,
      rotation: construction.pose.rotation * 90,
      valide: !!(construction.verdict && construction.verdict.ok),
    } : null;

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
        // `D-39` : la SILHOUETTE tourne sur la petite orbite, autour du point
        // logique ; tout le reste (aura, lumière, engagement) continue de lire
        // `follet.x/y`, la position logique. Deux points, deux orbites.
        x: follet.x + corpsFollet.dx,
        y: follet.y + corpsFollet.dy,
        visuel: registre.obtenir('visuels', companionActif.render.visuel),
        couleur: companionActif.render.couleur,
        echelle: echelleFolletAffichee(companionActif),
      } : null,
      puzzles: puzzlesAffiches,
      estFlagActif: flags.has,
      anneauAttaque,
      visuelsTuiles,
      objetsSol: objetsSolAffiches,
      structures: structuresAffichees,
      fantome: fantomeAffiche,
      // Visuel résolu ici (main.js a le registre), jamais par render.js.
      poussiere: { visuel: visuelPoussiere, bouffees: bouffeesVisibles(poussiere) },
      // Sillage du follet : même calque, même mécanisme, teinté à la couleur
      // du compagnon — render.js ne sait pas qu'il s'agit du follet.
      sillage: companionActif
        ? { visuel: visuelSillage, teinte: companionActif.render.couleur, bouffees: bouffeesVisibles(sillageFollet) }
        : null,
      // `undefined` (jamais un no-op) hors `?debug=fps` — même raison que
      // `surFrame` ci-dessous : render.js ne lit `performance.now()` que si
      // ce callback est fourni.
      surRecalculCoucheStatique: moniteurPerf.actif ? moniteurPerf.surRecalculCoucheStatique : undefined,
    });
    dessinerObscurite(ctxLogique, {
      scene: sceneAffichage,
      camera,
      follet: follet ? { x: follet.x, y: follet.y } : null,
      rayonLumiereFollet: companionActif ? companionActif.rayon_lumiere : 0,
      couleurLumiereFollet: companionActif ? companionActif.render.couleur : null,
    });
    // Signal des zones de Chaos (specs/07 palier D) : APRÈS le calque
    // d'obscurité — il se voit à travers la nuit sans percer le voile (on
    // devine une présence, on ne voit pas où l'on marche). Le calcul est pur
    // et vit dans spawns.js ; render.js reçoit des rectangles en pixels et
    // une couleur, jamais une table d'apparition.
    dessinerSignalZones(ctxLogique, {
      camera,
      zones: zonesSignalees(scene, tablesDeScene(registre.tous('spawns'), scene.id), {
        phase: phaseAHeure(save.monde.heure),
        evaluerCondition: flags.evaluate,
        opacite: sceneAffichage.obscurite ? sceneAffichage.obscurite.opacite : 0,
        opaciteMax: OPACITE_NUIT_MAX,
        heureMs: save.monde.heure,
      }),
    });

    // Aura du follet (§2 diagnostic SD_ui-lisibilite, pointillée depuis §3.4
    // 03_grotte-polish/AURA_TRAIT) : trait fin translucide en pointillés,
    // jamais un disque plein ni un trait plein épais.
    //
    // Depuis `D-51`, ce cercle n'est plus une indication : c'est EXACTEMENT la
    // zone où les effets sur les monstres s'appliquent, parce que le rayon
    // dessiné et le rayon de la règle sortent de la même fonction
    // (`resoudreRayonAuraPx`) et que le centre est le même point logique.
    // Depuis `D-37`, ce cercle décide aussi de l'ENGAGEMENT : un monstre qu'il
    // touche est un monstre vers lequel le follet part (companion.js).
    if (follet && companionActif) {
      ctxLogique.save();
      ctxLogique.strokeStyle = `rgba(255,255,255,${AURA_TRAIT.alpha})`;
      ctxLogique.lineWidth = AURA_TRAIT.largeur;
      ctxLogique.setLineDash(AURA_TRAIT.pointilles);
      ctxLogique.beginPath();
      ctxLogique.arc(follet.x - camera.x, follet.y - camera.y, resoudreRayonAuraPx(companionActif), 0, Math.PI * 2);
      ctxLogique.stroke();
      ctxLogique.restore();
    }
    // Textes flottants de gain (`D-05`) : APRÈS le calque d'obscurité (donc
    // pleinement lisibles de nuit) et AVANT le HUD — c'est un retour
    // d'interface posé dans le monde, pas une entité de la scène. Le gabarit
    // et le nom de l'item sont résolus ICI (main.js a i18n et le registre) :
    // render.js ne reçoit que des chaînes déjà prêtes, exactement comme
    // `visuelArme`. Changer de langue traduit donc aussi un texte déjà en vol.
    dessinerTextesFlottants(ctxLogique, {
      camera,
      config: effetTexteGain,
      textes: textesVisibles(textesFlottants).map((t) => ({
        x: t.x,
        y: t.y,
        alpha: t.alpha,
        texte: i18n.t(t.format, { n: t.quantite, item: t.libelle ? i18n.t(t.libelle) : '' }),
      })),
    });
    dessinerHud(ctxLogique, {
      i18n,
      pv: hero.pv || 0,
      pvMax: hero.pvMax || 1,
      eclats: save.inventaire.eclats,
      companion: companionActif,
      visuelFollet: companionActif ? registre.obtenir('visuels', companionActif.render.visuel) : null,
      tactileActif: input.tactileActif(),
      // D-20 B : icône de l'arme ÉQUIPÉE, résolue ici (main.js a le registre)
      // exactement comme visuelFollet au-dessus — ui/hud.js ne reçoit qu'une
      // silhouette et ignore de quelle arme elle vient. Même résolution
      // d'arme que les dégâts et l'anneau, jamais une seconde.
      visuelArme: (() => {
        const arme = resoudreArmeEquipee(registre, save.hero.equipement.arme);
        return arme && arme.icone ? registre.obtenir('visuels', arme.icone) : null;
      })(),
      // `D-13` : les buffs actifs du bandeau. On LIT la table tenue par
      // status.js (`save.hero.buffs_actifs`), on ne la recalcule pas — c'est
      // la même table qui alimente `modificateursBuffsActifs` plus haut, donc
      // l'icône affichée et le bonus réellement appliqué ne peuvent pas
      // diverger. L'ordre des clés EST l'ordre d'activation.
      //
      // L'icône vient de la STAT renforcée, pas de l'effet : `buff_repas` et
      // un futur `buff_potion_vitalite` montrent la même. Un buff sans stat
      // (un effet qui toucherait un `param` plutôt qu'une stat) n'a rien à
      // montrer : il est simplement absent du bandeau, pas dessiné en trou.
      buffs: Object.entries(save.hero.buffs_actifs || {}).flatMap(([effetId, resteMs]) => {
        const effet = registre.obtenir('status_effects', effetId);
        if (effet.cible !== 'joueur' || !effet.stat) return [];
        const { icone } = registre.obtenir('stats', effet.stat);
        if (!icone) return [];
        return [{ visuel: registre.obtenir('visuels', icone), resteMs }];
      }),
      // Palier C/D (§3.9) : discret, un chiffre — jamais affiché avant le
      // premier calcul des jauges/XP (cinématique d'ouverture).
      survie: save.survie,
      niveau: save.hero.niveau,
      // MT_hud-ligne-haute_2026-09-19 : plus de `ratioXp` au HUD (la barre
      // d'XP a quitté le bandeau) — la progression est désormais lisible dans
      // l'écran Stats, cf. obtenirEntreesStats().
      eclatNiveau: ECLAT_NIVEAU_MS > 0 ? eclatNiveauMs / ECLAT_NIVEAU_MS : 0,
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
    hero = creerHeros({ x: 0, y: 0, rayon: rayonHeros(), pvMax: 1 });
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
    // `D-05` : même patron que l'indice ci-dessus — observer les textes de
    // gain sans passer par dessiner() (canvas jamais exercé headless,
    // contrainte de méthode). `obtenirEtatTextesFlottants` donne la réserve
    // elle-même, pour qu'un test puisse la vider entre deux scénarios.
    obtenirTextesFlottants: () => textesVisibles(textesFlottants),
    obtenirEtatTextesFlottants: () => textesFlottants,
    // Palier D (§3.4) : fourni à ui/menu.js via menu.definirEntreesStats()
    // une fois l'orchestrateur construit (même patron que
    // reinitialiserPartie ci-dessus) — le menu Stats n'a besoin d'appeler
    // que cette seule fonction, jamais de connaître registre/save/i18n.
    obtenirEntreesStats: () => obtenirEntreesStats(),
    sousTitreStats: () => sousTitreStats(),
    // specs/05_construction-stations.md §3 : fournis à ui/menu.js via
    // menu.definirDisponibiliteConstruction()/definirEntreesConstruction()
    // (même patron que obtenirEntreesStats ci-dessus) — et exposés ici pour
    // les tests headless (état du mode Construction, jamais le rendu).
    // MT_construction-bandeau-placement_2026-09-17 : invariant à prouver en
    // test headless ("construction active ⇒ UI ouverte") — expose la même
    // fonction que celle qui gèle réellement le gameplay dans maj(), jamais
    // une redérivation séparée côté test qui pourrait diverger.
    uiOuverteMaintenant: () => uiOuverteMaintenant(),
    disponibiliteConstruction: () => disponibiliteConstruction(),
    entreesConstruction: () => entreesConstruction(),
    // specs/08_menus-cartes.md §5 : les conditions des cartes du menu passent
    // par LE registre de flags (aucun second évaluateur). Par la fermeture,
    // jamais par référence : `flags` est reconstruit par reinitialiserPartie().
    evaluerCondition: (condition) => flags.evaluate(condition),
    // Les noms des valeurs que les conditions peuvent citer — la moitié
    // « code » du contrôle de câblage au démarrage.
    nomsValeursConditions: () => Object.keys({ niveau: 0, stations_placables: 0, ...valeursExternes() }),
    constructionActif,
    obtenirConstruction: () => construction,
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
  // specs/08_menus-cartes.md §4.5 : chaque `couleur_ui` doit se lire sur le
  // fond des cartes et ne jamais se confondre avec le danger. Les jetons sont
  // RELUS sur `:root` — la feuille de style reste le seul endroit où ils sont
  // écrits, ce contrôle n'en garde aucune copie. Il vit ici et pas dans
  // `validerCatalogues` parce que le registre est pur : il ne voit pas le DOM.
  const styleRacine = getComputedStyle(document.documentElement);
  const erreursCouleurs = erreursChargement.length ? [] : erreursCouleursUi(donnees.companions, {
    fondCarte: styleRacine.getPropertyValue('--menu-carte'),
    danger: styleRacine.getPropertyValue('--menu-danger'),
    accentNeutre: styleRacine.getPropertyValue('--menu-accent'),
  });
  // specs/08_menus-cartes.md §5 : toute clé de texte citée par `menus.json`
  // existe dans les deux langues. `validerCatalogues` ne peut pas le dire —
  // le registre ne reçoit jamais les dictionnaires.
  // Avec eux, les textes que le CODE choisit (le composant, les lecteurs
  // d'état des bascules) : aucune carte ne les cite, ce contrôle est le seul
  // à pouvoir les voir manquer.
  const erreursTextes = erreursChargement.length ? [] : erreursTextesMenus(
    donnees.menus, dictionnaires,
    [...CLES_TEXTE_COMPOSANT, ...clesTexteEtats(Object.keys(dictionnaires)), ...clesTexteFiches()],
  );
  const toutesErreurs = [...erreursChargement, ...erreursValidation, ...erreursCles, ...erreursCouleurs, ...erreursTextes];

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
  // `D-30` (rouvert le 20/09) : plein écran au premier RELÂCHEMENT tactile.
  // Pas au contact : le contrat d'« activation utilisateur » du HTML ne liste
  // pas `touchstart` parmi les événements qui l'accordent (un contact peut
  // encore devenir un glissement), il liste `touchend`. La première version
  // demandait depuis `touchstart`, se faisait refuser en silence, et le
  // loquet « une seule tentative » interdisait ensuite toute autre demande.
  // Sur PC, F11 reste le geste du joueur — et depuis ce ticket, l'entrée de
  // menu « Plein écran » aussi, sur tous les périphériques qui produisent un
  // vrai geste (souris, doigt ; pas la manette, lue par sondage).
  // Sous-système « meilleur effort » : il rattrape ses propres erreurs, rien
  // à faire ici (cf. plein_ecran.js).
  //
  // C'est `document.documentElement` qu'on passe en plein écran, et **pas le
  // canvas** : le menu Pause, les écrans Poche/Craft/Coffre/Stats, le bandeau
  // de Construction et le relevé `?debug=fps` sont des éléments DOM ajoutés à
  // `document.body`, à côté du canvas. Mettre le seul canvas en plein écran
  // les rendrait tous invisibles — un menu inaccessible sur téléphone, et
  // personne pour faire le lien avec ce ticket-ci.
  const pleinEcran = creerPleinEcranTactile({
    element: document.documentElement,
    ecran: typeof screen !== 'undefined' ? screen : null,
    // `doc` : l'ÉTAT RÉEL (`fullscreenElement`) et la sortie
    // (`exitFullscreen`). Le sous-système ne tient aucun booléen de son côté.
    doc: document,
    // `nav` : pour la seule API Keyboard Lock (Échap court / Échap long en
    // plein écran). Absente sous Firefox et Safari : le module s'en arrange
    // en silence.
    nav: typeof navigator !== 'undefined' ? navigator : null,
  });
  const sourceTactile = creerSourceTactile(canvasVisible, {
    surRelachement: () => pleinEcran.demanderUneFois(),
    // Seule source de vérité pour écran -> logique (diagnostic
    // SD_ui-lisibilite §3c) : versCoordonneesLogiques() est la même fonction
    // pure, testée, dont presenter()/calculerRectanglePresentation() dessine
    // la réciproque (logique -> écran) — plus de formule recopiée ici.
    versLogique(clientX, clientY) {
      const rect = calculerRectanglePresentation(canvasVisible.width, canvasVisible.height);
      return versCoordonneesLogiques(clientX, clientY, rect);
    },
  });
  // `D-54` : « le jeu a-t-il la main ? », écrit par l'orchestrateur à chaque
  // frame (`onEtatUi`), lu par le clavier au moment du `keydown` pour décider
  // s'il intercepte `Tab`. Un seul écrivain, une seule vérité — et le retard
  // d'une frame est sans conséquence : entre l'ouverture d'un menu et l'appui
  // suivant, il s'écoule toujours plusieurs frames.
  let uiCapteLesVerbes = false;
  const input = creerCoucheInput({
    sourceClavier: creerSourceClavier(window, MAPPING_CLAVIER_PROVISOIRE, {
      interceptionActive: () => !uiCapteLesVerbes,
    }),
    sourceManette: creerSourceManette(navigator),
    sourceTactile,
  });

  const menu = initialiserMenu({
    document,
    i18n,
    // specs/08_menus-cartes.md : les écrans de cartes du menu Pause.
    menus: registre.tous('menus'),
    // L'accent des menus = la `couleur_ui` du compagnon choisi ; `null` avant
    // le choix (la feuille de style porte alors l'accent neutre).
    couleurAccent() {
      const compagnon = save.hero.companion ? registre.obtenir('companions', save.hero.companion) : null;
      return compagnon ? compagnon.couleur_ui : null;
    },
    // La boîte du menu se cale sur le rectangle du jeu à l'écran — mais en
    // pixels CSS, parce que c'est dans cette unité-là qu'une variable CSS se
    // lit (`D-48`). UN seul calcul (`menu_cartes.js#rectangleMenuCss`, pur),
    // que TOUS les chemins traversent : ouverture d'un niveau, `resize`,
    // changement d'orientation, `fullscreenchange`.
    //
    // Ce qu'on ne lit plus, et pourquoi : `canvasVisible.width`. Ce nombre a
    // DEUX écritures et deux sens — `presenter()` y met des pixels PHYSIQUES à
    // chaque frame, `ajusterTailleCanvas` des pixels CSS à chaque `resize`.
    // Lire le canvas, c'était donc lire l'un ou l'autre selon le moment :
    // 4 px à l'ouverture d'un écran, 1 px après un pivot du téléphone, sur le
    // même appareil et la même fenêtre (relevé du 20/09, profil `telephone`).
    // La géométrie de la fenêtre, elle, n'a qu'un sens.
    rectangleJeu() {
      const { largeurCss, hauteurCss, dpr } = dimensionsEcranPhysiquesActuelles();
      return rectangleMenuCss({ largeurCss, hauteurCss, dpr });
    },
    dessinerIcone: creerDessinateurIcones({ obtenirVisuel: (id) => registre.obtenir('visuels', id), fenetre: window }),
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
    // specs/08 palier C : `icone` et `lignes` — la tuile et la fiche de l'écran
    // « maître-détail ». Résolues ICI (registre + i18n), jamais dans le menu.
    listerPoche: () => Object.entries(save.inventaire.items)
      .filter(([, quantite]) => quantite > 0)
      .map(([itemId, quantite]) => {
        const itemDef = registre.obtenir('items', itemId);
        return {
          id: itemId, label: i18n.t(itemDef.label_key), quantite, categorie: itemDef.categorie,
          icone: itemDef.render.visuel, lignes: lignesFicheItem(itemDef, registre, i18n),
        };
      }),
    // Palier C (§3.3) : slot consommable — mutation directe de `save` (même
    // patron que basculerMusique ci-dessus, hors du chemin etatModifie de
    // l'orchestrateur, cf. journal : persistance au prochain autosave/
    // visibilitychange, comme les réglages).
    equipementConsommable: () => save.hero.equipement.consommable,
    equiperConsommable: (itemId) => {
      save.hero.equipement.consommable = itemId;
    },
    // MT_construction-bandeau-placement_2026-09-17 : glyphes du bandeau
    // résolus sur le périphérique réellement actif, jamais manette en dur.
    peripheriqueActif: () => input.peripheriqueActif(),
    // `D-30` : l'entrée de menu à bascule. `ui/menu.js` ne connaît ni l'API
    // ni `document` — il demande « est-ce possible », « est-ce actif », et
    // « bascule ». L'état réel fait foi des deux côtés.
    pleinEcranActif: () => pleinEcran.estActif(),
    basculerPleinEcran: () => pleinEcran.basculer(),
  });

  // Le seul moment où l'état réel change sans que le menu ait rien demandé :
  // Échap, un geste système, ou la fin d'une bascule asynchrone. Le libellé
  // se réécrit alors depuis l'état réel — c'est ce qui interdit à l'entrée de
  // mentir après une sortie que personne ici n'a provoquée.
  // Les moments où la fenêtre change de forme sans que le menu le sache.
  // `orientationchange` est redondant avec `resize` sous Chrome Android, et
  // c'est sans importance : le recalage est idempotent (il relit la fenêtre,
  // il ne cumule rien). L'ordre vis-à-vis de `ajusterTailleCanvas` n'entre
  // plus en jeu depuis `D-48` — `rectangleJeu()` ne lit plus le canvas.
  const recalerGeometrieMenu = () => menu.actualiserGeometrie();
  window.addEventListener('resize', recalerGeometrieMenu);
  window.addEventListener('orientationchange', recalerGeometrieMenu);
  document.addEventListener('fullscreenchange', () => {
    menu.actualiserPleinEcran();
    recalerGeometrieMenu();
    // En plein écran, Échap doit arriver JUSQU'AU jeu (fermer le menu) sans
    // en sortir du même appui ; la sortie reste au navigateur, sur appui
    // maintenu. Décidé ici parce que c'est ici qu'on apprend que l'état réel
    // a changé — le sous-système, lui, ne s'abonne à rien.
    pleinEcran.synchroniserVerrouillageEchap();
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

  // MT_echelle-debug_2026-09-19 (`D-23`) : `?echelle=N` force l'échelle de
  // rendu — mesure seule, INDÉPENDANTE de `?debug=fps` (les deux se cumulent,
  // et c'est bien le but : un relevé par échelle, cf. `A-05`). Lu ici et
  // nulle part ailleurs, une seule fois au boot ; sans le paramètre,
  // `definirEchelleForcee(null)` laisse render.js exactement dans son état
  // d'avant. Une valeur invalide est ignorée et signalée plutôt que remplacée
  // par un repli plausible, qui ferait mesurer autre chose que ce que Xav
  // croit avoir demandé.
  const echelleDebug = lireEchelleForcee(window.location.search);
  if (echelleDebug.avertissement) console.warn(echelleDebug.avertissement);
  definirEchelleForcee(echelleDebug.echelle);

  // MT_mesure-saccades_2026-09-19 : instrument de debug perf, actif SEULEMENT
  // sous `?debug=fps` (estDebugFpsActif dans debug_perf.js) — inactif sinon,
  // aucun élément DOM créé, aucune mesure prise (cf. ui/hud_debug.js).
  const moniteurPerf = creerMoniteurPerf({ document, search: window.location.search });

  const orchestrateur = creerOrchestrateurGrotte({
    registre, i18n, save, store, dialogue, menu, input, ctxLogique, ctxVisible, canvasLogique,
    onPremierGeste: armerAudioUneFois,
    moniteurPerf,
    // La PRÉSENCE de la carte « Plein écran » est une condition de
    // `menus.json` : sans l'API, la carte tombe et sa case reste vide.
    valeursExternes: () => ({ plein_ecran_disponible: pleinEcran.disponible() ? 1 : 0 }),
    // `D-54` : le seul écrivain du drapeau lu par le clavier (cf. plus haut).
    onEtatUi: (ouverte) => { uiCapteLesVerbes = ouverte; },
  });
  // Dépendance circulaire résolue par un point de couture explicite (§B du
  // diagnostic) : le menu (construit avant l'orchestrateur, qui en a besoin
  // pour maj()) ne connaît reinitialiserPartie() qu'après coup, via ce
  // setter — jamais en important main.js depuis ui/menu.js.
  menu.definirActionReinitialiser(orchestrateur.reinitialiserPartie);
  // Même patron (§3.4) : le menu Stats a besoin de l'orchestrateur pour
  // résoudre les stats/points courants.
  menu.definirEntreesStats(orchestrateur.obtenirEntreesStats, orchestrateur.sousTitreStats);
  // specs/05_construction-stations.md §3 : même patron de couture différée
  // (le menu ne connaît ni la scène ni la position du héros).
  menu.definirEvaluateurCondition(orchestrateur.evaluerCondition);
  menu.definirEntreesConstruction(orchestrateur.entreesConstruction);

  // specs/08_menus-cartes.md §5 — le câblage, dans les DEUX sens : toute carte
  // de `menus.json` trouve sa fonction, toute fonction enregistrée a sa carte,
  // toute valeur citée par une condition est fournie. Il ne peut se juger
  // qu'ici : c'est le premier endroit où le menu ET l'orchestrateur existent.
  // Avant la boucle, et par le même écran d'erreur que les catalogues — une
  // valeur manquante ferait LEVER `flags.js` à l'ouverture du menu, donc
  // figerait la boucle de jeu en pleine partie.
  const erreursCablage = erreursCablageMenus(registre.tous('menus'), {
    ...menu.cablage(),
    valeurs: orchestrateur.nomsValeursConditions(),
  });
  if (erreursCablage.length > 0) {
    afficherErreurBoot(erreursCablage);
    return;
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) sauvegarder(store, save);
  });

  // `undefined` (jamais la fonction no-op) quand le moniteur est inactif :
  // creerBoucle() ne lit `performance.now()` que si `surFrame` est fourni,
  // donc passer un no-op quand même coûterait 3 lectures d'horloge par frame
  // pour rien (§ livrable : "aucun coût" hors `?debug=fps`).
  creerBoucle({
    maj: orchestrateur.maj,
    dessiner: orchestrateur.dessiner,
    surFrame: moniteurPerf.actif ? moniteurPerf.surFrame : undefined,
  }).demarrer();
}

if (typeof window !== 'undefined') {
  demarrerJeu();
}
