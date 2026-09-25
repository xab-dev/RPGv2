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
import { verrouillerMenuContextuel } from './souris.js';
import { creerCurseur } from './curseur.js';
import { ornementActif, etincellesOrbite, facteurRespiration, particulesFilet } from './ornements.js';
import { brule, entamees, normaliser, consumer, prendre, rendre } from './combustion.js';
import { creerCoucheInput, etatNeutre } from './input/input.js';
import { chargerScene, resoudreDeplacement, portailFranchi, trouverPositionLibrePlusProche, lumieresActives } from './scene.js';
import { calculerCamera } from './camera.js';
import { RAYON_TOUCHE_FOLLET, geometrieBoiteDialogue, toucherBoiteDialogue } from './ui/hud_layout.js';
import { genererDecor, lumieresDuDecor } from './decor.js';
import { tableLisieres } from './lisieres.js';
import {
  creerBoucle, dessinerScene, dessinerObscurite, dessinerSignalZones, dessinerPaupieres, dessinerTextesFlottants, dessinerLogo, presenter,
  RESOLUTION_LOGIQUE, calculerRectanglePresentation, versCoordonneesLogiques, AURA_TRAIT,
  definirEchelleForcee, dimensionsEcranPhysiquesActuelles, invaliderCoucheStatique,
  dessinerSurlignages, dessinerProjectiles, dessinerOndes,
} from './render.js';
import { creerStoreIndexedDB } from './storage_indexeddb.js';
import {
  charger as chargerSave, sauvegarder, importerSauvegarde as importerSauvegardeDansStore,
  saveNeuve, reinitialiserSauvegarde, VISUEL_HEROS_ID, COULEUR_HERO_NEUTRE,
} from './save.js';
import { dessinerVisuel, echelleVisuel, surlignageActif, TAILLE_REFERENCE_FOLLET_PX } from './visuels.js';
import {
  creerPoussiere, avancerPoussiere, bouffeesVisibles, viderPoussiere, CAPACITE_RESERVE,
} from './poussiere.js';
import { decalageCorpsFollet } from './vol_follet.js';
import { avancerBascule, positionBascule, voyantAllume, fonduHalo } from './bascule.js';
import {
  creerTextesFlottants, emettreTexte, avancerTextesFlottants, textesVisibles, viderTextesFlottants,
} from './texte_flottant.js';
import {
  resoudrePreset, valeurLevier, appliquerParticules, appliquerGrainSol, lirePresetForce,
  cleEtatCarte, presetSuivant, creerDescenteAuto,
} from './qualite.js';
import { creerRegistreFlags, lireFlagsForces } from './flags.js';
import { calculerStatsPrimaires, calculerStatsDerivees, appliquerModulateurSurvie } from './stats.js';
import {
  modificateursHeros, statsEffectivesMonstre, tickBuffsActifs, ajouterBuffActif, modificateursBuffsActifs,
  tickSoinsBuffsActifs, iconeBuffBandeau,
  modificateursDeriveesHeros, appliquerModificateursDerivees, dotsHeros, estDansAura, poserStatutCoup, tickStatutsCoup } from './status.js';
import { creerHeros, creerMonstre, approcherEnLigneDroite, infligerDegats, mourir, respawn, reconcilierPvMax } from './entities.js';
import {
  resoudreArmeEquipee, resoudreAutoAttaque, tickCooldown, estMonstreActif, FLASH_ATTAQUE_MS, FLASH_TOUCHE_MS,
} from './combat.js';
import {
  creerFollet, mettreAJourEtat as mettreAJourFollet, avancerPosition as avancerFollet, monstreEngageable,
  cibleSuivante as cibleSuivanteFollet,
  resoudreEchelleJeu as resoudreEchelleJeuFollet, echelleFolletEnTransition, resoudreRayonAuraPx,
  avancerOrbiteAutour, poserFollet, rappelerFollet, folletPoste,
} from './companion.js';
import { creerGenerateur, resoudreLoot } from './loot.js';
import {
  etatInitial as etatInitialPuzzles, activerLevier, allumerLevierMaintenu, avancerLevierMaintenu, simultanesResolus,
} from './puzzles.js';
import { creerDialogue, resoudreNoeud, erreursTextesDialogues } from './dialogue.js';
import { creerEtatEffets, activer as activerEffet, tick as tickEffets, actif as effetActif } from './effets_monde.js';
import {
  creerIntro, avancerIntro, etatRendu as etatRenduIntro,
  creerDepart, avancerDepart, etatRenduDepart, avancementDepart, ETAPE_CLIGNEMENTS,
  // `D-65` (T8) : le retour de mort rouvre les yeux avec la MÊME séquence
  // que l'intro, en version courte — aucune seconde implémentation.
  ouverturePaupieres, dureeClignements,
} from './intro.js';
import { etatLogo } from './logo.js';
import { creerPrologue, avancerPrologue, alphaPrologue, prologueArme } from './prologue.js';
import {
  tablesDeScene, tableActive, tirerPositionApparition, tirerPointDomaine, estEnZoneSurePx, zonesSignalees,
  sceneNettoyee,
} from './spawns.js';
import { creerComportement, avancerComportement, deciderTireur, creerEtatBoss, deciderBoss } from './comportement_monstres.js';
import {
  deciderRencontre, creerEtatRencontre, avancerRencontre, passerALaFin, passerALEffacement,
  rencontreAgit, rencontreEnCours, opaciteRencontre, plancherCible, cibleAuSeuil,
} from './rencontre.js';
import {
  creerProjectiles, tirer as tirerProjectile, viseesSalve, avancerProjectiles, viderProjectiles, projectilesEnVol, CAMP_MONSTRES, CAMP_HEROS,
} from './projectiles.js';
import { peutRecolter, trouverRessourceProche } from './resources.js';
import {
  ajouterItem, retirerItem, resoudreCapacite, plafondPourItem, slotsOccupes, normaliserContenus,
} from './inventory.js';
import {
  remplirItemsSol, trouverItemProche, ramasser, planifierRespawn, tickRespawns,
  calculerTuilesAtteignables, reposerItemsDuJour,
  compterObjetsSurTuile, poserObjetJete, trouverObjetJeteProche, retirerObjetJete, decalageDansPile,
} from './ground_items.js';
import { calculerOpaciteToit, distanceAuRectangle, empreinteAbsoluePuzzle } from './structures.js';
import { dansRectangleTuile, poseValide } from './placement.js';
import { avancerHeure, opaciteAHeure, opaciteOmbreZones, phaseAHeure, PHASES_CYCLE } from './daynight.js';
import { ambianceADeclencher } from './ambiances.js';
import { armerAudio, definirMusiqueActive, definirVolumeMaitre, palierSuivant } from './audio.js';
import { creerEtatIndices } from './hints.js';
import { estExpire, poserCooldown, tempsRestantMs } from './cooldowns.js';
import { peutFabriquer, fabriquer, recettesDeStation, trierRecettes } from './recipes.js';
import { entreesVisibles, estVisible } from './visibilite.js';
import {
  entreesIndices, lignesBrouillees, creerDechiffrement, accelererDechiffrement, avancerDechiffrement,
  progressionDechiffrement,
} from './indices.js';
import {
  creerVueStele, avancerVueStele, vueSteleArmee, fermerVueStele, vueSteleTerminee, alphaVueStele, demanderDescente,
} from './stele.js';
import { dessinerEcranStele, zoneGravureStele } from './ui/ecran_stele.js';
import {
  creerEtatCompetence, dureesCompetence, chargeActive, avancerCompetence, competencePrete, lancerCompetence,
  ratiosCompetence, resoudreDegats, choisirCible,
} from './competences.js';
import { lignesEcrites, ecritureFinie, dureeEcriture } from './parchemin.js';
import { dessinerEcranParchemin } from './ui/ecran_parchemin.js';
import { flagsDeLaDescente, interactifsDeLaDescente, descenteDisponible } from './descente.js';
import {
  decroitre as decroitreSurvie, consommer as consommerSurvie, appliquerMalusRespawn,
  calculerModulateur as calculerModulateurSurvie, configSurvie, jaugeSousLeSeuil,
} from './survival.js';
import { crediter as crediterXp, xpDeCatalogue, flagDeNiveau } from './xp.js';
import { initialiserMenu, clesTexteEtats } from './ui/menu.js';
import { creerDessinateurIcones } from './ui/icone_canvas.js';
import { erreursCouleursUi } from './ui/couleurs_ui.js';
import {
  erreursTextesMenus, erreursCablageMenus, CLES_TEXTE_COMPOSANT, rectangleMenuCss,
} from './menu_cartes.js';
import { dessinerHud } from './ui/hud.js';
import { dessinerHudHints } from './ui/hud_hints.js';
import { dessinerDialogue, creerPaginateurDialogue } from './ui/dialogue_box.js';
import { dessinerEcranPrologue } from './ui/ecran_prologue.js';
import { chargerPolices } from './polices.js';
import { creerMoniteurPerf, creerMoniteurInactif } from './ui/hud_debug.js';
import { avertissementEntreeScene, lireEchelleForcee } from './debug_perf.js';
import {
  configAlignement, regime as regimeAlignement, appliquerDelta, lireAlignement, lireAlignementForce,
} from './alignement.js';

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
// monstre qui se cogne aux murs. Les monstres posés à la main (la Grotte, Phase 1 validée)
// continuent d'aller droit au héros sans rien heurter — on ne rouvre pas un
// comportement validé. Mais un monstre qui **erre** dans un Champ bordé de
// forêt doit se cogner : sans ça, la règle anti-blocage de la spec n'aurait
// rien à débloquer, et on verrait des rôdeurs traverser les arbres. Un
// TIREUR (spec 14) aussi : il recule, et reculer à travers un mur le
// mettrait hors de portée de tout.
// *Provisoire*, à l'œil : la silhouette du rampant tient dans 16 px.
const RAYON_MONSTRE_PX = 8;
// Spec 14, palier G : combien de temps l'onde d'un tir à zone reste visible
// après l'éclat. PROVISOIRE, à juger en jeu : assez pour lire la zone
// touchée, assez court pour ne pas la confondre avec une zone qui dure.
const DUREE_ONDE_MS = 360;
// Le texte qui dit qu'une compétence prête n'a rien à viser.
const CLE_TEXTE_AUCUNE_CIBLE = 'competence.aucune_cible';
// L'id du héros parmi les cibles d'un projectile (`projectiles.js`) : les
// monstres y entreront par leur id d'instance, qui ne peut pas le valoir
// (`entities.js#creerMonstre` : `<enemy>#<n>`).
const CIBLE_HEROS = 'heros';
// Obscurité la plus forte du cycle : sert de référence au signal des zones de
// Chaos (palier D), dont l'intensité suit la nuit. Lue depuis daynight.js,
// jamais recopiée — changer la nuit changera le signal avec elle.
const OPACITE_NUIT_MAX = Math.max(...PHASES_CYCLE.map((p) => p.opacite));
const INTERVALLE_AUTOSAVE_MS = 30000;
const DISTANCE_INTERACT_PX = 28;
// Les types d'interactif qu'on prend « à la main » (INTERACT) ; un autre type
// posé dans `scene.interactifs` est ignoré par le geste, qui passe au suivant.
// Lu par `cibleInteraction` seule, qui dit ce que vise l'appui (`D-177`).
const TYPES_INTERACTIFS_A_LA_MAIN = ['levier', 'levier_maintenu', 'station_placeholder', 'station', 'stele', 'coffre_parchemin'];
// Les interactifs qui ont un MANCHE (un geste de bascule, `D-158`) : le levier
// qu'on bascule et, spec 14, celui qu'on tient.
const TYPES_LEVIER = ['levier', 'levier_maintenu'];
// MT_texte-flottant_2026-09-19 (`D-05`) : gabarit du texte de gain (« +{n}
// {item} »), déclaré une seule fois ici. C'est une CLÉ de localisation, pas
// un texte : le « + », l'ordre des morceaux et l'espace se traduisent comme
// le reste (contrainte « zéro chaîne en dur »). Un futur gain d'XP ou un
// nombre de dégâts prendra son propre gabarit, sans toucher texte_flottant.js.
const CLE_TEXTE_GAIN_ITEM = 'monde.gain_item';
// `D-58` : le gabarit ET son suffixe (« xp ») vivent dans les locales, jamais
// ici — c'est ce qui permet de l'écrire autrement en anglais le jour venu.
const CLE_TEXTE_GAIN_XP = 'monde.gain_xp';
// `D-118` : le refus d'un conteneur plein se DIT, au même endroit et de la
// même façon qu'un gain — c'est le même mécanisme de retour dans le monde, pas
// un second. Les deux clés sont des gabarits sans `{n}` : le texte flottant
// transporte une quantité que ces gabarits n'utilisent pas, ce qui est
// exactement ce que « transporter des clés opaques » veut dire.
const CLE_TEXTE_POCHE_PLEINE = 'monde.poche_pleine';
const CLE_TEXTE_PLUS_DE_PLACE = 'monde.plus_de_place_ici';
// La poche du héros est un conteneur comme un autre, et son id vit ici pour
// la même raison que `effet_texte_gain` : c'est le code qui en a besoin, donc
// c'est le code qui le nomme — un id inconnu tombe au boot (`registre.obtenir`).
const ID_CONTENEUR_POCHE = 'conteneur_poche';
// `D-145` : une tuile de sol tient autant d'objets que ce conteneur a de
// slots (pile 1 : un objet par slot). Le nombre vit dans les données, à côté
// de ceux de la poche et du coffre.
const ID_CONTENEUR_SOL = 'conteneur_sol';
const CLE_TEXTE_COFFRE_PLEIN = 'monde.coffre_plein';
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
// Spec 11 §5 : l'effet de monde « toit occulté » — tant qu'il est actif, le
// toit ne s'efface plus au passage du héros (`FACTEUR_EFFACEMENT_TOIT` n'est
// pas touché : l'effacement est suspendu, pas réglé autrement). Le NOM est ce
// qui relie une option de dialogue à ce système ; il doit exister au
// catalogue `effets_monde.json`, vérifié au démarrage de l'orchestrateur.
const EFFET_TOIT_OCCULTE = 'toit_occulte';
// Spec 11 §7.3 (chapitre 3, « le coffre effacé ») : tant qu'il est actif, l'écran
// Coffre MONTRE un coffre vide. Le contenu réel ne bouge pas : l'effet est lu
// par le seul point qui fabrique la liste du Coffre pour l'écran
// (`contenuAfficheDeStation`), jamais par `ecran_fiches.js` ni par la sauvegarde.
const EFFET_COFFRE_APPARENCE_VIDE = 'coffre_apparence_vide';
const MARGE_FONDU_TOIT_PX = 30;
const RAYON_TOIT_FOLLET_ABSENT_PX = 90;

// Gauche/milieu/droite de l'écran de choix (§3.1) — arrangement visuel
// arbitraire, sans effet sur le gameplay (les 3 follets sont équivalents en
// interface) ; Xav pourra le changer librement en relisant ce tableau.
const ORDRE_CHOIX_FOLLET = ['comp_follet_feu', 'comp_follet_eau', 'comp_follet_terre'];
// `D-103` (T10) : LA monnaie du jeu, par son id de catalogue. Elle est citée
// à deux endroits — le bandeau et la fiche d'une recette qui coûte des éclats
// — donc elle se déclare au NIVEAU MODULE (`D-72`) : un nom écrit deux fois
// finit par ne plus désigner la même chose. Ce que `main.js` en lit se borne
// à sa silhouette ; le reste des éclats (`save.inventaire.eclats`,
// `cout_eclats`) ne passe toujours par aucun catalogue, et c'est voulu tant
// qu'il n'y a qu'une monnaie (`Q-49`, `D-68`).
const ID_MONNAIE = 'monnaie_eclats';

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

// --- Équipement : quelle catégorie va dans quel emplacement (`D-72`) ------
//
// `SLOT_PAR_CATEGORIE` est le SEUL endroit du jeu qui sache qu'une nourriture
// va au consommable et une arme à l'arme (`D-66`, T5) : l'écran Poche, lui,
// ne connaît plus aucune catégorie d'item. Une armure y sera une ligne.
//
// POURQUOI AU NIVEAU MODULE, et pas dans une des deux grandes fonctions :
// `D-72`. Ces deux fonctions ont d'abord été écrites DANS
// `creerOrchestrateurGrotte`, alors que leur seul appelant, le câblage du
// menu, vit dans `demarrerJeu` — deux fonctions sœurs. Le nom n'existait pas
// là où on l'appelait, et l'écran Poche levait un `ReferenceError` à chaque
// rendu. Ici, il n'y a plus de portée à laquelle se tromper, et — c'est
// l'autre moitié du remède — elles deviennent **testables**, donc le test de
// la Poche appelle enfin la vraie fonction au lieu d'en recopier la logique.
export const SLOT_PAR_CATEGORIE = { nourriture: 'consommable', arme: 'arme' };

// `D-121` (T5) : les instances de station CRÉÉES en cours de partie.
//
// Une instance créée n'a pas d'entrée de catalogue — elle n'en a pas besoin :
// elle CLONE l'instance livrée avec le jeu pour son type, et ne change que son
// id et sa pose. C'est la règle du ticket, et elle évite d'inventer un second
// endroit où déclarer à quoi ressemble un coffre : **l'instance de catalogue
// est le modèle de son type**. Un type sans modèle ne peut pas être fabriqué,
// et le contrôle de démarrage le dit (`erreursRecettesDeStation`).
//
// Au NIVEAU MODULE, donc testable, et lisible par les deux fonctions sœurs
// (`D-72`).
export function modeleDeStation(registre, stationTypeId) {
  return registre.tous('puzzles')
    .find((p) => p.type === 'station' && p.station_type === stationTypeId) || null;
}

// `D-126` : LE point de lecture d'une pose sauvegardée, et il n'y en a qu'un.
//
// Depuis `D-121`, une entrée de `save.maison.stations` n'est PLUS une pose :
// c'est une fiche qui peut porter un `contenu`, un `type` et une `scene`, et
// qui n'a des coordonnées que si le joueur a déplacé la station. Trois
// endroits la lisaient ; un seul avait appris la nouvelle forme, et les deux
// autres prenaient une fiche de contenu pour une pose — le fantôme de
// Construction naissait à `x: undefined`, la poussée faisait `undefined + 1`,
// et `Math.max/min` propageaient le NaN sans rien dire. D'où la fonction :
// trois lectures de la même donnée finissent toujours par diverger (`D-71`).
//
// Rend une pose PROPRE (jamais la fiche elle-même, qui traînerait un contenu
// dans les overrides de scène) ou `null` — « je n'ai pas de pose », à 
// l'appelant de retomber sur celle du catalogue.
export function poseSauvegardeeDeStation(entree) {
  if (!entree || !Number.isFinite(entree.x) || !Number.isFinite(entree.y)) return null;
  return { x: entree.x, y: entree.y, rotation: entree.rotation || 0 };
}

// `D-126` (décision de Xav, 22/09) : **on ne déplace pas un meuble plein.**
//
// Ce qui était un accident devient une règle : le premier coffre se scellait
// dès qu'on y rangeait quelque chose, par le bug ci-dessus, et Xav a voulu
// garder le geste. Il est donc DIT, en données (`stations.json >
// deplacable_si_vide`), et il vaut pour tout coffre — celui livré avec la
// maison comme ceux qu'on fabrique.
//
// Une station qui ne déclare rien se déplace quel que soit son contenu : les
// trois autres n'en ont pas, et rien ne change pour elles.
export function stationDeplacable(stationType, contenu) {
  if (!stationType.deplacable_si_vide) return { ok: true, raison: null };
  const porteQuelqueChose = Object.values(contenu || {}).some((q) => q > 0);
  return porteQuelqueChose ? { ok: false, raison: 'station_pleine' } : { ok: true, raison: null };
}

export function instancesCreees(registre, sceneId, stationsSauvegardees) {
  const creees = [];
  for (const [id, entree] of Object.entries(stationsSauvegardees || {})) {
    // `type` est ce qui distingue une instance CRÉÉE d'une simple pose
    // sauvegardée : une pose ne porte que des coordonnées.
    if (!entree || !entree.type || entree.scene !== sceneId) continue;
    const modele = modeleDeStation(registre, entree.type);
    if (!modele) {
      console.warn(`[D-121] instance "${id}" : aucun modèle pour le type "${entree.type}" — ignorée`);
      continue;
    }
    creees.push({
      ...modele,
      id,
      position: { x: entree.x, y: entree.y },
      rotation: entree.rotation || 0,
    });
  }
  return creees;
}

// Le contrôle de démarrage qui va avec : toute recette qui produit une
// station doit avoir un modèle à cloner. Sans lui, la faute ne se verrait
// qu'au moment de fabriquer — c'est-à-dire en jouant.
// Prend les CATALOGUES bruts, pas le registre : ce contrôle se joue avec les
// autres, avant que le registre n'existe — au démarrage, là où une faute de
// catalogue se voit avant d'être jouée.
export function erreursRecettesDeStation(recipes = [], puzzles = []) {
  const aUnModele = (type) => puzzles.some((p) => p.type === 'station' && p.station_type === type);
  return recipes
    .filter((r) => r.sortie && r.sortie.station)
    .filter((r) => !aUnModele(r.sortie.station))
    .map((r) => (
      `recipes.json > "${r.id}" produit la station "${r.sortie.station}", mais aucune instance de ce type `
      + "n'existe dans puzzles.json — il n'y a rien à cloner"
    ));
}

// `D-121` : l'instance de coffre LIVRÉE avec le jeu, celle qui hérite du
// contenu d'avant ce ticket. On la trouve par son RÔLE, jamais par son id —
// c'est le rôle qui est stable, et c'est aussi ce qui fera qu'un second type
// de stockage (un grand coffre, un jour) n'aura rien à déclarer ici.
export function instanceDeStockageDeBase(registre) {
  return registre.tous('puzzles').find((p) => {
    if (p.type !== 'station') return false;
    const type = registre.obtenir('stations', p.station_type);
    return type && type.role === 'stockage';
  }) || null;
}

// `D-118` : ce que la poche a d'occupé, en texte. AU NIVEAU MODULE, et c'est
// `D-72` qui l'exige : `demarrerJeu` (qui câble le menu) et
// `creerOrchestrateurGrotte` (qui tient la poche) sont deux fonctions SŒURS —
// un nom déclaré dans l'une n'existe pas dans l'autre. Écrite d'abord dans le
// câblage du menu, cette ligne levait `ReferenceError: capacitePoche is not
// defined` à chaque ouverture de l'écran Poche, et aucun test ne pouvait le
// voir : `demarrerJeu` n'est jamais exécuté headless. C'est la capture sous
// Chrome qui l'a attrapée, comme pour `D-72`.
// `evaluer` : la condition d'un bonus de capacité (la besace), par LE registre
// de flags de l'orchestrateur — sans lui, le « 4/6 » d'un porteur de besace
// se lirait « 4/4 ».
export function texteRemplissagePoche(save, registre, i18n, evaluer) {
  const capacite = resoudreCapacite(registre.obtenir('conteneurs', ID_CONTENEUR_POCHE), evaluer);
  return i18n.t('menu.fiche.coffre_piles', {
    n: slotsOccupes(save.inventaire.items, capacite, (id) => registre.obtenir('items', id)),
    max: capacite.slots,
  });
}

// --- Un slot d'équipement dit la vérité (`D-92` + `D-93`, T2) -------------
//
// LE PROBLÈME, tel que Xav l'a vu en jeu : l'épée rangée au coffre restait
// dans la case d'attaque, et le dernier fruit mangé restait dans la case du
// consommable. Ce n'est pas un défaut d'affichage — c'est qu'un slot garde un
// id que plus RIEN ne revalide. `D-92` en est la forme extrême : après un
// renommage de catalogue, l'id ne résout même plus, et `arme.portee` lève au
// premier ATTACK.
//
// UNE seule fonction, donc, appelée à chaque frame plutôt qu'à chacune des
// mutations de poche (ramassage, craft, consommation, transfert au coffre,
// chargement) : elle est idempotente et ne coûte que deux recherches, et
// surtout elle ne peut pas être OUBLIÉE au prochain endroit qui touchera la
// poche. Chercher tous les appelants était exactement ce qui avait laissé
// passer les trois chemins divergents de `D-93`.
//
// PURE : tout ce dont elle a besoin lui est donné, et elle rend la liste de ce
// qu'elle a changé — c'est l'appelant qui journalise et qui persiste.
export function revaliderEquipement(save, registre) {
  const changements = [];
  const equipement = save.hero.equipement;
  const poche = save.inventaire.items || {};
  const enPoche = (itemId) => (poche[itemId] || 0) > 0;

  // --- L'arme ---
  const slotArme = registre.obtenir('equipment_slots', 'equip_arme');
  const armeDefaut = slotArme ? slotArme.defaut : null;
  const armeEquipee = equipement.arme;
  if (armeEquipee && armeEquipee !== armeDefaut) {
    if (!registre.existe('weapons', armeEquipee)) {
      // `D-92` : id inconnu du catalogue (renommage, sauvegarde importée,
      // id du mauvais catalogue). On replie sur le défaut du slot et on le
      // DIT — jamais un échec dur en pleine partie, jamais un `arme.portee`
      // lu sur `undefined`.
      equipement.arme = null;
      changements.push({ slot: 'arme', raison: 'inconnue', id: armeEquipee });
    } else {
      // L'arme est un id de `weapons.json` ; ce qu'on possède est un objet de
      // poche qui la DÉSIGNE. On cherche donc l'objet, pas l'arme.
      const objet = registre.tous('items').find((it) => it.arme === armeEquipee);
      if (!objet || !enPoche(objet.id)) {
        equipement.arme = null;
        changements.push({ slot: 'arme', raison: 'absente', id: armeEquipee });
      }
    }
  }

  // --- Le consommable ---
  const consommable = equipement.consommable;
  if (consommable) {
    const inconnu = !registre.existe('items', consommable);
    if (inconnu || !enPoche(consommable)) {
      // `Q-64`, retenu par défaut : un autre objet de la MÊME catégorie prend
      // la case. Sinon elle disparaît — et c'est bien la case, pas seulement
      // son icône : le loquet `flag_premier_consommable` est retiré, la case
      // suit désormais l'état réel de la poche (décision de Xav, 22/09, qui
      // *révise* le 21/09).
      const categorie = !inconnu ? registre.obtenir('items', consommable).categorie : 'nourriture';
      const releve = registre.tous('items')
        .find((it) => it.categorie === categorie && it.id !== consommable && enPoche(it.id));
      equipement.consommable = releve ? releve.id : null;
      changements.push({
        slot: 'consommable', raison: inconnu ? 'inconnu' : 'epuise', id: consommable,
        remplace: releve ? releve.id : null,
      });
    }
  }

  return { changements };
}

// Une entrée de l'écran Poche, telle que `ui/menu.js` la reçoit. Niveau module
// et exportée (`D-08`, règle de `D-72`) : le test de la Poche l'appelait en
// RECOPIE, et un champ ajouté ici (`consommable`) n'y serait jamais arrivé.
export function entreePoche(itemDef, quantite, { equipementHero, registre, i18n, peripherique }) {
  return {
    id: itemDef.id, label: i18n.t(itemDef.label_key), quantite, categorie: itemDef.categorie,
    icone: itemDef.render.visuel, lignes: lignesFicheItem(itemDef, registre, i18n),
    // `D-08` : se mange-t-il ? Dit par la DONNÉE (`consommation`), jamais par
    // une catégorie : c'est ce que `essayerConsommer` exige aussi.
    consommable: Boolean(itemDef.consommation),
    // `specs/15` palier C : « Planter » remplace « Jeter » pour cet objet.
    plantable: Boolean(itemDef.plantable),
    equipement: equipementDeLItem(itemDef, { equipementHero, registre, traduire: i18n.t, peripherique }),
  };
}

// Ce que l'écran Poche doit savoir d'un objet équipable : dans quel
// emplacement il va, s'il y est déjà, et ce que ça change. `null` pour tout
// le reste. PURE : tout ce dont elle a besoin lui est donné.
export function equipementDeLItem(itemDef, { equipementHero, registre, traduire, peripherique }) {
  const slot = SLOT_PAR_CATEGORIE[itemDef.categorie];
  if (!slot) return null;
  // Pour une arme, l'emplacement retient l'id de l'ARME, pas celui de l'objet
  // de poche — d'où la comparaison par `itemDef.arme`.
  const attendu = slot === 'arme' ? itemDef.arme : itemDef.id;
  return {
    slot,
    deja: equipementHero[slot] === attendu,
    // Ce que l'objet équipé apporte, dit dans sa fiche. Pour le consommable,
    // le verbe qui s'en sert (au glyphe du périphérique actif) ; pour une
    // arme, son bonus, lu sur l'arme.
    lignes: slot === 'consommable'
      ? [traduire('menu.fiche.manger', { glyphe: traduire(`glyphe.${peripherique}.consume`) })]
      : lignesBonusArme(itemDef.arme, { registre, traduire }),
  };
}

// Les modificateurs d'une arme, en clair. Lus sur `weapons.json`, donc une
// arme qui donnerait Agilité +2 s'annoncerait toute seule.
export function lignesBonusArme(armeId, { registre, traduire }) {
  const arme = registre.obtenir('weapons', armeId);
  return Object.entries(arme.modificateurs || {}).map(([statId, delta]) => traduire('menu.fiche.bonus_stat', {
    stat: traduire(registre.obtenir('stats', statId).label_key),
    n: delta > 0 ? `+${delta}` : `${delta}`,
  }));
}

// --- Textes flottants : la jointure module → rendu (`D-71`) ---------------
//
// CE QUI S'EST PASSÉ, et pourquoi ce code existe : `dessiner()` reconstruisait
// à la main l'objet envoyé au rendu (`{ x, y, alpha, texte }`), au lieu de
// transmettre celui que `texte_flottant.js` lui donne. Le jour où ce module a
// gagné une clé (`style`, `D-58`), elle est tombée dans l'intervalle — sans
// bruit, et le jeu se figeait au premier ramassage.
//
// Le module est conçu pour TRANSPORTER des clés qu'il ne comprend pas (`cle`,
// `format`, `libelle`, `style`). Refabriquer un objet à l'arrivée, c'est
// défaire ce transport, et c'est une faute qui se rejouera à chaque clé
// ajoutée. D'où la règle, ici : on **enrichit**, on ne recopie pas.
//
// Et c'est une fonction PURE, sortie de `dessiner()` : le rendu canvas n'est
// jamais exercé par les tests (contrainte de méthode), donc tant que cette
// composition vivait dedans, la jointure était intestable. Les deux moitiés
// avaient leurs tests ; le passage de l'une à l'autre n'en avait aucun.
//
// `traduire` plutôt qu'`i18n` : cette fonction n'a pas besoin de savoir d'où
// vient le texte, et le module de textes flottants, lui, n'a même pas le
// droit de le savoir (contrôle de source dans son test).
export function composerTextesFlottants(visibles, traduire) {
  return visibles.map((t) => ({
    ...t,
    // Le SEUL ajout. Le gabarit ne porte plus que `{n}` depuis `D-58` : le
    // paramètre `item` qui traînait ici ne servait plus rien et mentait sur
    // le contrat. `libelle` continue d'être transporté par le module, prêt
    // pour le jour où un gabarit voudra nommer l'objet — ce sera alors le
    // ticket de ce gabarit, pas un reliquat.
    texte: traduire(t.format, { n: t.quantite }),
  }));
}

// Les styles de texte flottant que le CODE peut émettre. Ils sont écrits ici
// parce que c'est ici qu'on les émet (`signalerGainItem`, `signalerGainXp`),
// et relus AU DÉMARRAGE pour vérifier que le catalogue les déclare tous.
//
// C'est le déplacement du garde-fou de `D-58` : il vivait dans la boucle de
// dessin, sous forme d'exception. Le schéma, lui, ne pouvait pas le voir — il
// vérifie la forme de ce qui est déclaré, jamais que ce que le code émet
// existe. Retirer « xp » du catalogue passait donc le boot sans un mot.
export const STYLES_TEXTE_FLOTTANT = ['gain', 'xp', 'refus'];

// Contrôle de démarrage : chaque style émis par le code a bien sa taille et sa
// couleur au catalogue. Même famille que `erreursTextesMenus` — ce que le code
// choisit, aucun catalogue ne le cite, donc seul un contrôle au boot peut le
// voir manquer.
export function erreursStylesTexteFlottant(effets) {
  const effet = (effets || []).find((e) => e.id === 'effet_texte_gain');
  if (!effet) return ['effets.json > "effet_texte_gain" introuvable'];
  const declares = effet.styles || {};
  return STYLES_TEXTE_FLOTTANT
    .filter((style) => !declares[style])
    .map((style) => (
      `effets.json > effet_texte_gain > styles : "${style}" manquant `
      + `(émis par main.js, styles déclarés : ${Object.keys(declares).join(', ') || 'aucun'})`
    ));
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
    // `D-121` : la fiche d'une recette qui produit une STATION.
    'menu.fiche.a_poser',
    // `D-122` : les raisons d'un refus de craft, dites en toutes lettres.
    'menu.fiche.deja_possede', 'menu.fiche.ingredient_manquant',
    'menu.fiche.eclats_manquants_n', 'menu.fiche.poche_pleine',
    'menu.craft_deja_possede',
    // `D-126` : la raison pour laquelle une station ne se déplace pas.
    'menu.fiche.refus_station_pleine',
    // `D-103` : la ligne du coût en monnaie. Elle était composée par la fiche
    // de Craft depuis `D-66` sans jamais passer par ce contrôle — la retirer
    // des locales aurait donc rendu « menu.fiche.cout_eclats » en toutes
    // lettres dans le jeu, sans un mot au démarrage.
    'menu.fiche.cout_eclats',
  ];
}

const SEUIL_POUSSEE_CHOIX = 0.5; // même seuil que ui/menu.js#SEUIL_POUSSEE_MENU, axe X ici

// Positions à l'écran (résolution logique 480x270) des 3 follets sur l'écran
// de choix — extraites ici (plutôt qu'inline dans dessinerFolletsCinematique)
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
// `D-178` : l'anneau du follet sélectionné sur l'écran de choix — le rayon
// d'avant (28), son opacité de repos (celle qui respire dès Moyen).
// PROVISOIRE, jugé à la capture seulement.
const RAYON_ANNEAU_CHOIX_PX = 28;
const ALPHA_ANNEAU_CHOIX = 0.75;

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
// Un objet de valeurs nommées dont chaque valeur n'est calculée qu'à la
// lecture (`calculs` : { nom: () => valeur }), plus des valeurs déjà connues
// (`fixes`). Déclaré au niveau module : pur, testable, et hors des deux
// grandes fonctions (`D-72`).
export function valeursParesseuses(calculs, fixes = {}) {
  const valeurs = { ...fixes };
  for (const [nom, calcul] of Object.entries(calculs)) {
    Object.defineProperty(valeurs, nom, { get: calcul, enumerable: true });
  }
  return valeurs;
}

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
  // `D-63` : les verbes de la barre d'actions débloqués, annoncés à chaque
  // frame à qui veut les lire (la source tactile). No-op par défaut, même
  // patron qu'`onEtatUi` et `onPremierGeste` : un test headless n'a rien à
  // fournir.
  onVerbesActions = () => {},
  // `Q-40` (23/09) : les cibles tactiles qui suivent le monde — le follet —,
  // en coordonnées logiques d'écran, annoncées à chaque frame. Même patron
  // qu'`onVerbesActions` : no-op par défaut, un test headless n'a rien à fournir.
  onZonesMonde = () => {},
  // `specs/09_reglages-graphiques.md` palier C : le preset graphique DÉJÀ
  // résolu, tel que `resoudreGraphismes` le rend. Par défaut, l'orchestrateur
  // le résout lui-même, sans signal d'appareil ni paramètre d'URL — un test
  // headless n'a donc rien à fournir et traverse quand même la VRAIE fonction
  // de résolution, jamais une décision recopiée dans un harnais (`D-72`).
  graphismes = resoudreGraphismes(registre, save, null),
  // Palier E : ce qu'un changement de preset entraîne HORS de la scène — le
  // curseur du jeu, qui vit sur son propre calque DOM et dont les étincelles
  // sont des particules cosmétiques comme les autres. L'orchestrateur ne le
  // connaît pas (il doit rester importable depuis Node), mais il est le seul
  // à savoir QUAND le preset change : Auto peut le changer tout seul, au
  // milieu d'une frame, sans que personne ait cliqué. Un seul point de
  // notification, donc un seul endroit à relire — jamais une ligne recopiée
  // derrière chaque appelant (`D-72`). No-op par défaut, comme `onEtatUi`.
  onGraphismesAppliques = () => {},
  // `specs/10` §6 : `?alignement=N`, DÉJÀ lu et validé par `demarrerJeu`
  // (l'orchestrateur ne lit pas l'URL). `null` = ne force rien — c'est le
  // défaut, un test headless n'a rien à fournir.
  alignementForce = null,
  // Spec 14, palier B : `?flags=a,b`, DÉJÀ lus et triés par `demarrerJeu`
  // (`flags.js#lireFlagsForces`). Tenus pour vrais toute la session, jamais
  // sauvegardés. Vide par défaut : un test headless n'a rien à fournir.
  flagsForces = [],
  // Spec 11 §4.2 : les doigts posés depuis la frame précédente, en
  // coordonnées logiques (`touch.js#lireContactsNouveaux`). Lus UNE fois par
  // frame, au début de `maj()` ; seule la bulle de dialogue s'en sert. Vide
  // par défaut : un test headless n'a rien à fournir.
  lireContactsTactiles = () => [],
  // Ticket L2-L3 (journal du 23/09) : les trois calques du symbole du jeu, déjà
  // lancés en chargement par `demarrerJeu` (des `Image` DOM, que l'orchestrateur
  // ne sait pas créer). Vide par défaut : un test headless n'a rien à fournir,
  // et SANS calques il n'y a pas d'ouverture — on ne tient pas le joueur
  // devant un écran noir pour un logo qui ne peut pas se dessiner.
  imagesLogo = [],
  // `specs/12_prologue.md` : le jeu servi joue le prologue avant le symbole ;
  // l'orchestrateur, par défaut, non. Le prologue ATTEND un appui du joueur :
  // les tests du cold-open, qui ne le demandent pas, n'ont rien à presser et
  // restent tels qu'ils étaient (même patron que les calques du symbole).
  jouerPrologue = false,
}) {
  // `specs/13` palier F (`Q-134`) : le plafond de l'entrée en scène, lu une
  // fois. Son pourquoi est au schéma (`schemas.js#erreursBudgetCarte`), qui
  // garantit aussi sa présence au démarrage.
  const PLAFOND_ENTREE_SCENE_MS = registre.obtenir('graphismes', 'budget_carte').entree_scene_max_ms;
  // Les leviers sont lus UNE fois, ici : au-delà de cette ligne, plus personne
  // ne connaît le mot « bas ». Chaque système reçoit un nombre.
  const multiplicateurParticules = valeurLevier(graphismes.config, graphismes.preset, 'particules');
  // LE point de lecture des leviers de tout l'orchestrateur : au-delà de
  // cette ligne, plus personne ne connaît le mot « bas », chaque système
  // reçoit un nombre. Mutable depuis le palier D, parce que le joueur peut
  // changer de preset en cours de partie (§4.5) — mais toujours un seul
  // endroit qui lit, donc un seul endroit à relire quand ça change.
  let graphismesActuels = graphismes;
  const levier = (nom) => valeurLevier(graphismesActuels.config, graphismesActuels.preset, nom);
  // §5.2 — l'état d'Auto pour CETTE session : la fenêtre glissante des frames
  // qui comptent, et la mémoire de ce qui a déjà été dit. La règle elle-même
  // vit dans `qualite.js`, pure et testée sans horloge ; ici on ne fait que
  // décider quelles frames lui sont données, et obéir à son verdict.
  const descenteAuto = creerDescenteAuto(graphismesActuels.config);
  // Les premières secondes d'une scène ne comptent pas : c'est le temps que le
  // calque statique se construise, et le juger là reviendrait à faire
  // descendre Auto sur le coût d'un chargement.
  let msDepuisEntreeScene = 0;
  // L'annonce attend son tour si un indice de commande occupe la bannière
  // (`hints.js#annoncer` rend faux) — jamais perdue, jamais forcée.
  let annoncePendante = null;
  let etatModifie = false;

  // `specs/10_alignement-follet.md` §2.3 : l'alignement caché.
  const reglageAlignement = configAlignement(registre);

  // Spec 11 §5 : les effets de monde actifs — état de SESSION, jamais écrit
  // dans `save` (recharger la page les lève, `Q-103`). Avancés avec le jeu,
  // gelés sous UI comme tout le reste.
  let effetsMonde = creerEtatEffets();
  // Les répliques de fin d'effet (`dialogue_fin`, spec 11 §7.3) qui attendent
  // que la bulle soit libre : un effet peut se lever dans la frame même où une
  // ligne d'ambiance s'ouvre, et une bulle n'en recouvre jamais une autre.
  // Session, comme l'effet : recharger la page lève les deux (`Q-103`).
  let finsEffetsEnAttente = [];
  // Les effets que le CODE lit par leur nom : absents du catalogue, ils ne
  // pourraient jamais être posés, et le système qui les lit se tairait. Échec
  // dur au démarrage plutôt qu'un toit qui ne réagit jamais.
  for (const id of [EFFET_TOIT_OCCULTE, EFFET_COFFRE_APPARENCE_VIDE]) {
    if (!registre.obtenir('effets_monde', id)) throw new Error(`effets_monde.json : "${id}" absent, lu par main.js`);
  }

  // LE seul point qui écrit `save.hero.alignement`. Il borne, il journalise
  // sous `?debug=fps`, et il ne fait RIEN d'autre : aucun effet n'est
  // déclenché à l'écriture, les effets sont relus à chaque frame par le follet
  // (paliers B et C). C'est ce point que la spec 11 branchera — spam, lecture,
  // options de dialogue sont des appelants, jamais des cas particuliers.
  // `source` est une étiquette libre pour le journal (`'debug'`, `'test'`,
  // plus tard `'dialogue:dlg_maison'`), jamais lue par le jeu.
  //
  // Sous `?alignement=N`, l'écriture atteint quand même la sauvegarde : la
  // valeur forcée masque la vraie pour la session, elle ne la remplace pas —
  // retirer le paramètre rend exactement ce que la partie a accumulé.
  function modifierAlignement(delta, source) {
    const avant = lireAlignement(save.hero, reglageAlignement.bornes);
    const { valeur, ecart } = appliquerDelta(avant, delta, reglageAlignement.bornes);
    save.hero.alignement = valeur;
    if (ecart !== 0) etatModifie = true;
    if (moniteurPerf.actif) console.info('[alignement]', { source, delta, ecart, valeur });
    return { valeur, ecart };
  }

  // Ce que le jeu voit : la valeur forcée par l'URL si elle existe, sinon celle
  // de la sauvegarde, relue (et donc revérifiée) à chaque appel. Le régime
  // passe par `alignement.js#regime` et par lui seul.
  function etatAlignement() {
    const valeur = alignementForce !== null
      ? alignementForce
      : lireAlignement(save.hero, reglageAlignement.bornes);
    return { valeur, forcee: alignementForce !== null, ...regimeAlignement(valeur, reglageAlignement) };
  }
  // Le relevé `?debug=fps` interroge cette source à son propre rythme (≤ 4
  // fois par seconde) : rien n'est poussé par frame, rien hors de ce mode.
  moniteurPerf.definirSourceAlignement(etatAlignement);

  // `specs/10` §4.1 : le SEUL effet de l'alignement au palier B — le sens de
  // l'orbite du follet. Relu à chaque frame, jamais déclenché à l'écriture :
  // une modification en cours de partie (spec 11) se voit à la frame suivante,
  // et le renversement amorti est l'affaire de `companion.js`. Seul le régime
  // NÉGATIF inverse ; la bande morte (`abs(A) < 1`) ne touche à rien.
  function sensOrbiteFollet() {
    return etatAlignement().regime === 'negatif' ? -1 : 1;
  }

  // Silhouettes de tuiles (03_maison-exterieur §3.3) : résolu UNE fois (pas
  // par scène, contrairement à `decor` — tiles.json est un catalogue global)
  // à partir du registre, jamais recalculé par frame. render.js ne connaît
  // que dessinerVisuel, jamais visuels.json par id (§3.3 grotte-polish).
  // Palier C, levier `grain_sol` : la fraction s'applique ICI, au seul
  // endroit où la table est construite — `render.js` reçoit la table et ne
  // saura jamais qu'un preset existe. Une tuile SOLIDE n'est pas allégée : sa
  // silhouette *est* le monde (§4.3). Et un grain réduit à rien n'entre pas
  // dans la table du tout : le rendu ne le cherche même plus, donc il ne
  // coûte plus une ligne (« 0 = ne dessine pas », pris au mot).
  // Reconstruite, et non recalculée par frame : au démarrage, et une fois de
  // plus à chaque changement de preset (§4.5).
  // Une LISTE par tuile (polish ambiance, 23/09) : son visuel puis ses
  // variantes (`render.visuel_variantes`), chacune allégée par le même levier ;
  // la case choisit la sienne au dessin (`decor.js#varianteTuile`). Une tuile
  // dont le preset a retiré tout le grain sort de la table, comme avant.
  function construireTableGrains() {
    const grainSol = levier('grain_sol');
    return new Map(
      registre
        .tous('tiles')
        .filter((t) => t.render && t.render.visuel)
        .map((t) => [
          t.id,
          [t.render.visuel, ...(t.render.visuel_variantes || [])]
            .map((id) => registre.obtenir('visuels', id))
            .map((visuel) => (t.solid ? visuel : appliquerGrainSol(visuel, grainSol)))
            .filter((visuel) => visuel !== null),
        ])
        .filter(([, visuels]) => visuels.length > 0)
    );
  }
  let visuelsTuiles = construireTableGrains();
  // `specs/13` palier D : les lisières (qui déborde sur qui, et avec quels
  // dessins), résolues ici comme la table des grains et refaites aux mêmes
  // moments — `render.js` la reçoit sans jamais lire un rang. Une table neuve
  // n'est fabriquée qu'au démarrage et au changement de preset : le calque ne
  // défile qu'entre deux frames qui lui passent la MÊME table.
  // Palier E, levier `lisiere` : la même coupe que le grain (les PREMIÈRES
  // primitives d'un dessin sont les plus importantes — le contour de l'herbe
  // d'abord, les brins ensuite), appliquée à chaque dessin de lisière, ombre
  // comprise. Les RANGS ne bougent jamais : un preset allège un dessin, il ne
  // change pas qui déborde sur qui. En Bas (0,3), le contour reste — sans
  // grain, l'escalier d'aplats serait encore plus dur à l'œil (`specs/13` §5).
  // Un dessin réduit à rien vaut `null` et ne se pose pas (« 0 = ne dessine
  // pas »).
  function construireTableLisieres() {
    const fraction = levier('lisiere');
    return tableLisieres(
      registre.tous('tiles'),
      (id) => appliquerGrainSol(registre.obtenir('visuels', id), fraction),
    );
  }
  let lisieres = construireTableLisieres();

  // --- Capacité des conteneurs (`D-118`) ----------------------------------
  //
  // Résolue UNE fois, ici : `inventory.js#resoudreCapacite` est le seul point
  // par lequel une besace ou un porte-outils passeront (`Q-65`), donc tout ce
  // qui suit lit ces deux objets et jamais les nombres du catalogue.
  //
  // Le coffre prend sa capacité de son TYPE de station, pas d'une constante :
  // c'est ce qui fera qu'un coffre crafté (T5) ne portera aucun second
  // nombre. En M1 il n'y a qu'un seul type de stockage — on le cherche par
  // son rôle plutôt que par son id, parce que c'est le rôle qui est stable.
  const obtenirItemDef = (id) => registre.obtenir('items', id);
  // `D-103` : la silhouette de la monnaie, résolue UNE fois — le bandeau et
  // les fiches de Craft la montrent, et c'est la même.
  const iconeMonnaie = registre.obtenir('monnaies', ID_MONNAIE).icone;
  // `D-176` : ce que chaque bouton TACTILE porte en filigrane (l'engrenage de
  // MENU), déclaré par verbe dans `glyphes.json#tactile_icone` et résolu UNE
  // fois — le HUD ne connaît aucun id de catalogue.
  const iconesBoutonsTactiles = Object.fromEntries(registre.tous('glyphes')
    .filter((g) => g.tactile_icone)
    .map((g) => [g.verbe, registre.obtenir('visuels', g.tactile_icone)]));
  // La besace (23/09) : la poche GRANDIT en cours de partie. Sa capacité se
  // relit donc à chaque question, avec les flags du moment — jamais une
  // constante prise au démarrage, qui garderait quatre slots à un héros qui
  // en porte six. `flags` est lu par la fermeture : `reinitialiserPartie` le
  // remplace, et la poche d'une partie neuve retombe à sa base.
  function capacitePoche() {
    return resoudreCapacite(registre.obtenir('conteneurs', ID_CONTENEUR_POCHE), (c) => flags.evaluate(c));
  }
  function capaciteDeStation(station) {
    return resoudreCapacite(registre.obtenir('conteneurs', station.conteneur));
  }
  const typeStockageDeBase = registre.tous('stations').find((s) => s.role === 'stockage');
  const capaciteCoffreDeBase = capaciteDeStation(typeStockageDeBase);

  function plafondPoche(itemId) {
    return plafondPourItem(save.inventaire.items, itemId, capacitePoche(), obtenirItemDef);
  }

  const coffreDeBase = instanceDeStockageDeBase(registre);

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
      // Spec 14 : l'entrée par une stèle remet à zéro les flags de la
      // descente (`commencerDescente`) — le miroir suit, dans l'autre sens.
      onRetrait: (id) => {
        delete save.flags[id];
        etatModifie = true;
      },
      forces: flagsForces,
      // specs/07_chaos-nocturne.md §3 : valeurs nommées que les conditions de
      // données peuvent comparer (« niveau ≥ 5 » pour le palier 1 du Chaos).
      // Lue à chaque évaluation, jamais capturée : le seuil s'ouvre à l'instant
      // où le joueur monte de niveau, sans rien avoir à réévaluer à la main.
      //
      // `stations_placables` (specs/08_menus-cartes.md, case contextuelle) :
      // COMBIEN de stations le héros peut déplacer là où il se tient. Un vrai
      // nombre, pas un booléen déguisé — « lieu » n'est pas un format de
      // condition de `flags.js`, et la spec interdit d'en créer un.
      valeurs: valeursConditions,
    });
  }
  // LES valeurs nommées qu'une condition de données peut interroger. Une
  // seule déclaration : `nomsValeursConditions` en dérive ses clés, au lieu de
  // recopier la liste — deux listes finissent toujours par diverger (`D-71`).
  // PARESSEUSES (spec 14, palier B) : chaque valeur est un accesseur, calculée
  // seulement si une condition la lit. Une condition n'en lit qu'une, mais
  // l'objet les calculait TOUTES (poche, coffre, stations, portée) à chaque
  // évaluation — et une ligne d'ambiance pas encore vue s'évalue à chaque
  // frame. Mesuré au banc de la spec 13 : `maj()` +17 à +40 % la nuit, rien
  // qu'avec la ligne de la stèle. `Object.keys` et `in` voient toujours les
  // mêmes noms : le contrôle de câblage au démarrage n'y voit pas de différence.
  function valeursConditions() {
    return valeursParesseuses({
      niveau: () => save.hero.niveau,
      stations_placables: () => nombreStationsPlacables(),
      // `D-93` : combien de SORTES de consommables la poche porte. Un nombre,
      // donc une condition de données ordinaire — la barre du bas n'a aucun
      // code de déblocage à elle.
      consommables_en_poche: () => consommablesEnPoche(),
      // `D-125` (T9) : trois états du monde de plus, et pas un mot de lore
      // dedans. Une ligne du follet est une entrée de `ambiances.json` qui
      // les interroge ; la prochaine s'écrira de même, sans code.
      //
      // `slots_libres_poche` plutôt que `slots_occupes` : la question
      // intéressante est « reste-t-il de la place ? », et elle se pose avec un
      // `max: 0` qui ne dépend pas du nombre de slots du conteneur — le jour
      // où la poche en gagne un (une besace, `Q-65`), la condition tient
      // toujours, là où un `min: 4` serait devenu faux en silence.
      slots_libres_poche: () => capacitePoche().slots
        - slotsOccupes(save.inventaire.items, capacitePoche(), obtenirItemDef),
      objets_au_coffre: () => objetsRangesAuCoffre(),
      // Spec 11 §7.3 : la part REMPLIE du coffre le plus plein de la scène, de
      // 0 à 1 — posée sur ce qui est rempli et non sur un nombre de slots, pour
      // qu'une condition « 70 % » survive à l'agrandissement du coffre.
      remplissage_coffre: () => remplissageCoffre(),
      // `D-121` : une instance CRÉÉE en jeu, donc posée par le joueur — les
      // stations du catalogue n'en sont pas. Compté par la même fonction que
      // la résolution des interactifs, jamais par un second parcours.
      stations_posees: () => instancesCreees(registre, scene.id, save.maison.stations).length,
      // Spec 14, `Q-137` : l'interactif à portée d'INTERACT (son id), ou
      // `null`. Pas un nombre : une condition le compare par `egal`. Le même
      // calcul que la cible d'INTERACT (`interactifAPortee`), jamais un second
      // seuil de distance — « au pied de la pierre » est l'endroit d'où on la lit.
      a_portee: () => interactifAPortee()?.puzzleId ?? null,
    }, valeursExternes());
  }
  let flags = construireFlags();

  // Une sauvegarde d'avant `D-118` peut porter 20 bois en poche là où quatre
  // slots de cinq n'en tiennent plus autant. Normalisé une fois, au
  // démarrage, et DIT — jamais un objet qui s'évapore entre deux parties.
  // APRÈS la création des flags (besace, 23/09) : mesurée avant, la poche
  // d'un porteur de besace aurait eu sa base seule, et ses deux slots de plus
  // seraient descendus au coffre à chaque chargement.
  {
    const bilan = normaliserContenus(
      { poche: save.inventaire.items, coffre: contenuDeStation(coffreDeBase.id) },
      { capacitePoche: capacitePoche(), capaciteCoffre: capaciteCoffreDeBase, obtenirItem: obtenirItemDef },
    );
    if (bilan.deplaces.length || bilan.perdus.length) {
      save.inventaire.items = bilan.poche;
      const entreeCoffre = save.maison.stations[coffreDeBase.id]
        || (save.maison.stations[coffreDeBase.id] = {});
      entreeCoffre.contenu = bilan.coffre;
      etatModifie = true;
      for (const d of bilan.deplaces) {
        console.info(`[D-118] poche trop pleine au chargement : ${d.quantite} × ${d.item} descendu(s) au coffre.`);
      }
      for (const p of bilan.perdus) {
        console.warn(`[D-118] poche ET coffre pleins au chargement : ${p.quantite} × ${p.item} n'a pas pu être rangé.`);
      }
    }
  }

  // Spec 14, palier A : la table des niveaux s'allonge (Nv.30 → Nv.50). Une
  // sauvegarde qui a déjà l'XP d'un niveau nouveau le reçoit ici, flag et
  // points compris, dès le chargement : sans ce rattrapage, il ne serait
  // crédité qu'au prochain gain d'XP, et le HUD afficherait d'ici là un
  // niveau en retard. Après les flags, qu'il pose. Dit en console, comme
  // la normalisation ci-dessus.
  {
    const rattrapes = appliquerXpHeros(0);
    if (rattrapes.length) {
      console.info(`[spec 14] niveau(x) rattrapé(s) au chargement : ${rattrapes.join(', ')}.`);
    }
  }

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
  // Palier C, levier `densite_decor` : `decor.js` reçoit un nombre, pas un
  // preset. Le décor réduit est le PRÉFIXE du décor complet, donc un motif
  // présent en Bas est au même endroit en Moyen et en Haut — le décor ne se
  // réarrange pas quand on change de réglage (§4.3). Appelé à l'entrée en
  // scène, et une fois de plus à chaque changement de preset.
  function regenererDecor() {
    const tire = genererDecor(scene, levier('densite_decor'));
    // Polish ambiance (23/09) : les halos des motifs lumineux, dérivés UNE
    // fois ici, du décor tiré (ids encore bruts), jamais à chaque frame.
    lumieresDecor = lumieresDuDecor(scene, tire);
    decor = tire.map((d) => ({ ...d, visuel: registre.obtenir('visuels', d.visuel) }));
  }

  // §4.5 — changer de preset EN JEU, sans recharger. Ce qui bouge, et rien
  // d'autre : la table des grains, le décor de la scène courante, les
  // réserves de particules (recréées à la nouvelle capacité, donc VIDÉES —
  // même geste qu'à l'entrée en scène), et le calque statique, invalidé UNE
  // fois. La position du héros, l'heure, les monstres, la sauvegarde : rien.
  //
  // Le preset arrive déjà RÉSOLU : c'est `demarrerJeu` qui a la fenêtre et
  // l'URL, et l'orchestrateur doit rester importable depuis Node.
  function appliquerGraphismes(resolu) {
    graphismesActuels = resolu;
    visuelsTuiles = construireTableGrains();
    lisieres = construireTableLisieres();
    effetPoussiere = appliquerParticules(
      effetPoussiereCatalogue, levier('particules'), { capacite: CAPACITE_RESERVE },
    );
    poussiere = creerPoussiere(effetPoussiere);
    effetSillage = appliquerParticules(
      effetSillageCatalogue, levier('particules'), { capacite: CAPACITE_RESERVE },
    );
    sillageFollet = creerPoussiere(effetSillage);
    effetOrnement = ornementActif(effetOrnementCatalogue, levier('ornements'));
    effetHalo = ornementActif(effetHaloCatalogue, levier('ornements'));
    effetLueurDialogue = ornementActif(effetLueurDialogueCatalogue, levier('ornements'));
    effetEtincellesDialogue = ornementActif(effetEtincellesDialogueCatalogue, levier('ornements'));
    effetSurlignageRespire = ornementActif(effetSurlignageRespireCatalogue, levier('ornements'));
    effetSurlignageFilet = ornementActif(effetSurlignageFiletCatalogue, levier('ornements'));
    effetFlammeVacille = ornementActif(effetFlammeVacilleCatalogue, levier('ornements'));
    effetFlammeBraises = ornementActif(effetFlammeBraisesCatalogue, levier('ornements'));
    effetAnneauChoix = ornementActif(effetAnneauChoixCatalogue, levier('ornements'));
    sillagesCinematique = ORDRE_CHOIX_FOLLET.map(() => creerPoussiere(effetSillage));
    if (scene) regenererDecor();
    // Sans ça, l'ancien sol resterait à l'écran jusqu'au prochain
    // franchissement de tuile : la signature du calque (scène, échelle,
    // portes) n'a pas bougé, et c'est normal — ce n'est pas elle qui a changé.
    invaliderCoucheStatique();
    // Palier E : les frames d'avant mesuraient un AUTRE jeu — les garder
    // ferait juger Bas sur les frames de Moyen, et descendre deux fois de
    // suite sur une seule mauvaise passe. Vaut pour les deux causes d'un
    // changement, le joueur comme Auto : la fenêtre est jetée ici, une fois.
    descenteAuto.reinitialiserFenetre();
    onGraphismesAppliques(resolu);
  }

  // §5.2 — Auto descend d'un cran, et jamais ne remonte. Trois gestes, pas un
  // de plus : savoir si cette frame compte, la donner à la décision, obéir.
  // La règle (la fenêtre, la part de frames lentes, le palier inférieur, « une
  // seule annonce ») est tout entière dans `qualite.js` ; ce qui est ICI est
  // ce que ce module est seul à savoir — quelles frames sont du vrai jeu.
  function majDescenteAuto(deltaMs, uiOuverte) {
    msDepuisEntreeScene += deltaMs;
    // Une annonce que la bannière a refusée est rappelée jusqu'à ce qu'elle
    // passe : même contrat que `declencherVerbeUtile`, dont l'appelant répète
    // la demande tant qu'elle tient. Un premier indice de commande a la
    // priorité — il apprend le jeu, l'annonce ne fait que l'expliquer.
    if (annoncePendante && !uiOuverte
      && indices.annoncer(annoncePendante.cle, annoncePendante.dureeMs)) {
      annoncePendante = null;
    }
    // « Un choix manuel du joueur coupe Auto jusqu'à ce qu'il re-choisisse
    // Auto » — et un `?qualite=` n'est pas davantage un choix d'Auto. Les deux
    // sont déjà dits par le même champ, résolu au démarrage.
    if (!graphismesActuels.auto) return;
    // Ce qui ne compte pas : une UI ouverte — donc aussi l'intro, le dialogue,
    // le menu, la construction, puisque c'est LE point de décision unique qui
    // le dit — et les premières secondes d'une scène. Un onglet caché, lui, ne
    // produit aucune frame ; celle du retour est plafonnée à 100 ms par
    // `render.js`, soit UNE frame lente sur 600, très loin des 15 % qu'il
    // faudrait pour descendre. Il n'y a donc rien à écrire pour elle — et
    // rien qui puisse se tromper.
    if (uiOuverte) return;
    if (msDepuisEntreeScene < graphismesActuels.config.auto.delai_entree_scene_ms) return;

    const descente = descenteAuto.observer(deltaMs, graphismesActuels.preset);
    if (!descente) return;
    // Dit en console, et pas seulement à l'écran : la bannière passe en trois
    // secondes, or c'est exactement l'information qu'on voudra relire quand
    // Xav rapportera « le jeu s'est allégé tout seul » depuis une autre
    // machine. C'est aussi ce que le scénario headless observe.
    console.info(
      `graphismes : Auto descend de « ${graphismesActuels.preset} » à « ${descente.preset} » `
      + `(${Math.round(descente.part * 100)} % de frames lentes sur la fenêtre)`,
    );
    // Le preset RÉSOLU change ; le CHOIX, lui, reste « auto » — donc rien
    // n'est écrit dans la sauvegarde (§5.3), et la carte de Paramètres passera
    // d'elle-même à « Auto (Bas) » sans qu'on ait à l'en avertir : elle relit
    // la source, et la source est l'orchestrateur.
    appliquerGraphismes({ ...graphismesActuels, preset: descente.preset });
    if (descente.annoncer) {
      annoncePendante = {
        cle: graphismesActuels.config.auto.cle_annonce,
        dureeMs: graphismesActuels.config.auto.annonce_duree_ms,
      };
    }
  }

  function rayonHeros() {
    return RAYON_HERO_BASE_PX * echelleVisuel(registre.obtenir('visuels', VISUEL_HEROS_ID));
  }

  // MT_trainee-poussiere_2026-09-19 : réglages en données (data/effets.json,
  // tous PROVISOIRES, à régler au ressenti par Xav) et réserve fixe allouée
  // UNE fois au boot — jamais par frame, jamais par entrée en scène.
  // Palier C : la réserve est dimensionnée par le levier `particules`, dont
  // le défaut (8) appartient toujours à `poussiere.js` — il est passé, jamais
  // recopié ici. À zéro, la réserve est vide : rien ne naît, rien n'est
  // dessiné, et `avancerPoussiere` n'a pas une ligne de plus.
  const effetPoussiereCatalogue = registre.obtenir('effets', 'effet_poussiere');
  const visuelPoussiere = registre.obtenir('visuels', effetPoussiereCatalogue.visuel);
  let effetPoussiere = appliquerParticules(
    effetPoussiereCatalogue, levier('particules'), { capacite: CAPACITE_RESERVE },
  );
  let poussiere = creerPoussiere(effetPoussiere);

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
  const effetSillageCatalogue = registre.obtenir('effets', 'effet_sillage_follet');
  const visuelSillage = registre.obtenir('visuels', effetSillageCatalogue.visuel);
  let effetSillage = appliquerParticules(
    effetSillageCatalogue, levier('particules'), { capacite: CAPACITE_RESERVE },
  );
  let sillageFollet = creerPoussiere(effetSillage);
  // `D-134` (`Q-58`) : les ornements du follet. Résolus UNE fois par preset,
  // comme les réserves de particules : `null` sous le seuil, et le dessin ne
  // fait alors qu'un test de présence. Même horloge que le vol du corps
  // (`tempsVolFolletMs`), donc gelés sous UI sans une condition de plus.
  const effetOrnementCatalogue = registre.obtenir('effets', 'effet_ornement_follet');
  const visuelOrnement = registre.obtenir('visuels', effetOrnementCatalogue.visuel);
  const effetHaloCatalogue = registre.obtenir('effets', 'effet_halo_follet');
  let effetOrnement = ornementActif(effetOrnementCatalogue, levier('ornements'));
  let effetHalo = ornementActif(effetHaloCatalogue, levier('ornements'));
  // `D-191` : le liseré nocturne d'un objet au sol (la plume). Bas : fixe.
  // Moyen (ornements 1) : il respire. Haut (2) : en plus, un filet de
  // particules blanches qui monte de l'objet. Même levier, même horloge.
  const effetSurlignageRespireCatalogue = registre.obtenir('effets', 'effet_surlignage_respire');
  const effetSurlignageFiletCatalogue = registre.obtenir('effets', 'effet_surlignage_filet');
  const visuelParticuleFilet = registre.obtenir('visuels', effetSurlignageFiletCatalogue.visuel);
  let effetSurlignageRespire = ornementActif(effetSurlignageRespireCatalogue, levier('ornements'));
  let effetSurlignageFilet = ornementActif(effetSurlignageFiletCatalogue, levier('ornements'));
  // `specs/15` palier E : la flamme vivante (torche tenue ou plantée). Bas :
  // fixe. Moyen : sa lumière vacille. Haut : en plus, des braises montent.
  const effetFlammeVacilleCatalogue = registre.obtenir('effets', 'effet_flamme_vacille');
  const effetFlammeBraisesCatalogue = registre.obtenir('effets', 'effet_flamme_braises');
  const visuelBraise = registre.obtenir('visuels', effetFlammeBraisesCatalogue.visuel);
  let effetFlammeVacille = ornementActif(effetFlammeVacilleCatalogue, levier('ornements'));
  let effetFlammeBraises = ornementActif(effetFlammeBraisesCatalogue, levier('ornements'));
  // La hauteur de la flamme au-dessus du point d'un objet : c'est d'elle que
  // montent les braises. Un seul nombre, lu pour la torche tenue et plantée.
  const HAUTEUR_FLAMME_PX = 12;
  // La phase du cycle telle que le liseré la lit : `null` dans une scène sans
  // cycle (la Grotte est sombre, elle n'a pas de nuit). Une seule lecture,
  // partagée par le sol et les icônes des menus (exposée plus bas).
  const phaseDuCycle = () => (scene.cycleJourNuit ? phaseAHeure(save.monde.heure) : null);

  // `specs/15` palier B : l'objet de poche qui DÉSIGNE l'arme tenue (la
  // torche), ou `null` — même recherche que `revaliderEquipement`.
  function objetDeLArmeTenue() {
    const arme = save.hero.equipement.arme;
    return arme ? registre.tous('items').find((it) => it.arme === arme) || null : null;
  }
  // L'objet tenu brûle-t-il en ce moment (une torche, la nuit ou à l'aube) ?
  // Le seul verdict, lu par la combustion, la lumière et l'icône du HUD.
  function objetTenuQuiBrule(phase = phaseDuCycle()) {
    const item = objetDeLArmeTenue();
    return brule(item, phase) ? item : null;
  }
  // Consume l'objet tenu qui brûle, en temps ACTIF (appelé dans le bloc gelé
  // sous UI). Éteint, il quitte la poche ; s'il en reste, le suivant prend
  // le relais, sinon la revalidation de chaque frame (`D-92`) rend les mains
  // nues. Les files d'objets entamés sont d'abord ramenées à ce que la poche
  // contient vraiment (un objet rangé au coffre ou planté l'a quittée).
  //
  // `heureAvant` : l'heure au DÉBUT du pas. Un pas brûle s'il commence dans
  // une phase qui brûle — lire la phase après avoir avancé l'horloge perdait
  // le dernier pas de l'aube (et une torche finissait la nuit à 50 ms de sa
  // fin, rattrapé par `test_15b`).
  function avancerCombustion(deltaMs, heureAvant) {
    const combustion = save.inventaire.combustion;
    if (combustion) {
      for (const id of Object.keys(combustion)) {
        combustion[id] = normaliser(combustion[id], save.inventaire.items[id] || 0);
        if (combustion[id].length === 0) delete combustion[id];
      }
    }
    const phase = scene.cycleJourNuit ? phaseAHeure(heureAvant) : null;
    // `specs/15` palier C : les objets PLANTÉS de la scène brûlent aussi, au
    // même rythme ; au bout de leur temps, ils disparaissent. Seule la scène
    // courante avance : une scène qu'on ne voit pas est figée, comme ses
    // monstres et ses objets au sol (`Q-150`).
    const plantes = objetsPlantesDeLaScene();
    if (plantes.length > 0 && phase) {
      const suivants = plantes
        .map((p) => (brule(registre.obtenir('items', p.item), phase) ? { ...p, restant_ms: p.restant_ms - deltaMs } : p))
        .filter((p) => !(p.restant_ms <= 0));
      if (suivants.length !== plantes.length || suivants.some((p, i) => p !== plantes[i])) ecrireObjetsPlantesDeLaScene(suivants);
    }
    const item = objetTenuQuiBrule(phase);
    if (!item) return;
    const r = consumer(entamees(save.inventaire.combustion, item.id), item.combustion.duree_ms, deltaMs);
    save.inventaire.combustion = { ...(save.inventaire.combustion || {}), [item.id]: r.liste };
    if (r.liste.length === 0) delete save.inventaire.combustion[item.id];
    if (r.eteints > 0) save.inventaire.items = retirerItem(save.inventaire.items, item.id, r.eteints);
  }
  // `D-169` (polish des dialogues, 23/09) : la bulle suit le même levier.
  // Bas : rien qui bouge. Moyen (ornements 1) : une lueur qui respire sous
  // les flèches ▸ et ▼. Haut (2) : en plus, les étincelles du follet autour
  // de son portrait. Les seuils vivent dans `effets.json`, pas ici. Horloge
  // propre, avancée seulement bulle ouverte : le jeu est gelé sous le
  // dialogue, donc `tempsVolFolletMs` aussi.
  const effetLueurDialogueCatalogue = registre.obtenir('effets', 'effet_lueur_dialogue');
  const effetEtincellesDialogueCatalogue = registre.obtenir('effets', 'effet_etincelles_dialogue');
  const visuelEtincelleDialogue = registre.obtenir('visuels', effetEtincellesDialogueCatalogue.visuel);
  let effetLueurDialogue = ornementActif(effetLueurDialogueCatalogue, levier('ornements'));
  let effetEtincellesDialogue = ornementActif(effetEtincellesDialogueCatalogue, levier('ornements'));
  let tempsDialogueMs = 0;

  // `D-178` (relevé de Xav, 23/09 : « bas, moyen, haut ne font pas de
  // différence » pendant la sélection du follet) : la cinématique d'une
  // partie neuve suit les MÊMES leviers que le follet en jeu, par les mêmes
  // effets. Bas : rien qui bouge en plus. Moyen : le sillage (levier
  // `particules`, comme en jeu) et l'anneau de sélection qui respire
  // (`effet_anneau_choix`, seuil 1). Haut : en plus, les étincelles en orbite
  // (`effet_ornement_follet`, celui du follet en jeu). Horloge propre, avancée
  // seulement pendant la cinématique (le jeu y est gelé, `tempsVolFolletMs`
  // aussi). Une réserve de sillage par follet de l'écran de choix.
  const effetAnneauChoixCatalogue = registre.obtenir('effets', 'effet_anneau_choix');
  let effetAnneauChoix = ornementActif(effetAnneauChoixCatalogue, levier('ornements'));
  let tempsCinematiqueMs = 0;
  let sillagesCinematique = ORDRE_CHOIX_FOLLET.map(() => creerPoussiere(effetSillage));
  let positionsSillageCinematique = ORDRE_CHOIX_FOLLET.map(() => null);

  // MT_texte-flottant_2026-09-19 (`D-05`) : même patron exactement — réglages
  // en données (tous PROVISOIRES, à régler au ressenti par Xav) et réserve
  // fixe allouée UNE fois au boot. `texte_flottant.js` ignore i18n : c'est
  // ici, au rendu, que le gabarit et le nom de l'item sont résolus.
  const effetTexteGain = registre.obtenir('effets', 'effet_texte_gain');
  const textesFlottants = creerTextesFlottants(effetTexteGain);

  // `D-65` (T8) : le clignement du retour de mort. Demande de Xav du 21/09 —
  // « après chaque mort dans la Grotte, le héros revient avec le clignement
  // d'yeux de l'intro, en version courte ».
  //
  // `null` = personne ne vient de mourir. Une horloge de plus, mais pas une
  // seconde implémentation : la FORME du clignement est celle de l'intro
  // (`intro.js#ouverturePaupieres`), et les durées vivent en données.
  // Xav, 21/09 : le clignement de mort était « trop rapide » — il reprend
  // donc EXACTEMENT les durées de l'intro (3 ouvertures, ~3,7 s), pour que
  // mourir se lise comme un réveil, pas comme un téléport. *Révise* la
  // contrainte du ticket `D-65` (~0,9 s, « ne pas allonger »).
  //
  // C'est un effet PUREMENT visuel : il ne gèle rien, ne capte aucun verbe,
  // et un joueur pressé peut repartir avant la fin. Le rideau de l'intro,
  // lui, couvre une cinématique ; celui-ci accompagne un retour.
  const effetClignementRespawn = registre.obtenir('effets', 'effet_clignement_respawn');
  const DUREE_CLIGNEMENT_RESPAWN_MS = dureeClignements(effetClignementRespawn);
  let clignementRespawnMs = null;

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

  // `D-118` : le pendant NÉGATIF du précédent. Un conteneur plein refusait
  // jusqu'ici en silence (`D-28`), et le refus se lit au même endroit que le
  // gain qu'il remplace : à la source, là où le joueur regarde.
  //
  // `quantite: 1` et non 0 : un gain à zéro n'est jamais émis (garde de
  // `signalerGainItem`), et le gabarit n'affiche pas le nombre de toute façon.
  // La `cle` porte le conteneur, donc deux refus de la même frame fusionnent
  // en un seul texte au lieu de s'empiler.
  function signalerRefusConteneur(cleTexte, x, y) {
    emettreTexte(textesFlottants, {
      x, y, cle: cleTexte, quantite: 1, format: cleTexte, libelle: null, style: 'refus',
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
  // Ticket L4 (journal du 23/09) : le symbole du jeu, en petit, au-dessus du
  // héros quand il monte de niveau — DISCRET (demande de Xav) : quelques
  // pixels de haut, translucide, puis il s'éteint. Temps écoulé, ou `null`.
  // Même détection que l'éclat ci-dessus (un seul endroit sait qu'un niveau
  // est franchi) ; sans calques d'image, il ne se dessine simplement pas.
  const effetLogoNiveau = registre.obtenir('effets', 'effet_logo_niveau');
  let logoNiveauMs = null;

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
  let lumieresDecor = [];
  let puzzlesEtat = {};
  // Spec 14, palier C : les tirs en vol (`projectiles.js`), une réserve
  // allouée une fois. État de SESSION : vidé à chaque entrée en scène, jamais
  // sauvegardé (§6).
  const projectiles = creerProjectiles();
  // Spec 14, palier G : l'état de SESSION de chaque compétence apprise
  // (`competences.js`), par id — sa charge et sa recharge. Jamais sauvegardé
  // (§6) : une compétence en recharge au moment de quitter repart pleine.
  const etatsCompetences = new Map();
  // Ce que le HUD dessine sur chaque emplacement de compétence, `verbe →
  // { charge, recharge, prete }`, relevé à la dernière frame de jeu : le
  // dessin ne recalcule pas les dérivées, et sous UI la jauge reste où elle
  // était, gelée comme la compétence.
  let ratiosEmplacements = {};
  // Les ondes des tirs à zone qui viennent d'éclater, `{ x, y, rayon, couleur,
  // ms }` : un retour visuel, rien d'autre. Vidées avec les tirs.
  let ondes = [];
  // Spec 14, palier D : la RENCONTRE lancée dans la scène (`rencontre.js`),
  // `{ def, etat }` — `def` est lue dans `scenes.json`. État de SESSION : remis
  // à null à chaque entrée en scène, jamais sauvegardé ; une rencontre
  // interrompue (escalier, rechargement) se rejoue, son flag n'étant pas posé.
  let rencontre = null;
  // `D-158` : le geste de chaque levier (bascule.js), par id — un état
  // d'AFFICHAGE, jamais sauvegardé : la vérité reste `puzzlesEtat`. Un levier
  // sans entrée ici se pose à sa place, sans rejouer son geste.
  const basculesLeviers = new Map();
  // Spec 14, §4.4 : combien de fois un levier tenu s'est éteint, par
  // `simultane`, depuis l'entrée en scène — ce que compte l'explication du
  // follet (« il a vu le problème »). De session : une entrée de scène repart
  // de zéro, et l'explication, une fois dite, ne revient pas (son flag).
  let extinctionsLeviers = new Map();
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
  // `specs/10` palier C : l'aura du follet contient-elle un monstre vivant ?
  // Calculé une fois par frame de combat, lu par les effets de héros à durée
  // « aura » (la brûlure et l'entrave qui ont changé de camp) : ils vivent le
  // temps du combat, jamais en permanence. Lu à la frame suivante par
  // `calculerStatsHeros`, une frame de retard sans conséquence.
  let auraOccupee = false;
  // Accumulateurs des brûlures du HÉROS, un par effet — même boucle que celle
  // d'un monstre (`dotAccumulateurMs`) ; un effet qui cesse perd le sien.
  let dotsHerosAccumulateursMs = {};
  // Même rôle, pour les SOINS des buffs temporaires (la pomme cuite) : état
  // de session, jamais sauvegardé — au pire un rechargement perd moins d'un
  // intervalle de soin.
  let soinsBuffsAccumulateursMs = {};
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
  // Ticket L3 (journal du 23/09) : le symbole du jeu, avant le cold-open. Le
  // temps écoulé depuis son début, ou `null` hors ouverture. Il PRÉCÈDE l'intro
  // (le symbole sur le noir, puis les paupières qui s'ouvrent) : l'intro n'est
  // créée qu'à sa fin, et ses durées, son budget de 8 s et ses tests ne
  // changent pas. Même statut qu'elle : une UI ouverte, non skippable.
  let ouvertureLogoMs = null;
  const effetLogoOuverture = registre.obtenir('effets', 'effet_logo_ouverture');
  // `specs/12_prologue.md` : les écrans de texte AVANT le symbole — l'état de
  // `prologue.js`, ou `null` hors prologue. Le symbole naît à sa fin, comme
  // l'intro naît à la fin du symbole : aucun des deux ne sait qu'il existe.
  // Une UI ouverte, comme eux ; mais lui avance à l'appui, jamais seul.
  let prologue = null;
  // La stèle (23/09) : sa vue rapprochée, l'état de `stele.js`, ou `null`.
  // Une UI ouverte comme les autres — le jeu gèle, MENU se tait — ouverte par
  // INTERACT, fermée par B ou un toucher, et c'est tout.
  let vueStele = null;
  // Spec 14, palier G : la vue du PARCHEMIN, ouverte par le coffre du Gardien —
  // `{ vue (celle de stele.js : temps, fondu, particules), puzzleId,
  // competenceId, ecritureMs }`, ou `null`. Une UI ouverte comme la stèle :
  // le jeu gèle, MENU se tait.
  let vueParchemin = null;
  // Spec 14 : l'indice qui se déchiffre dans le carnet, l'état de
  // `indices.js#creerDechiffrement`, ou `null`. Il n'avance que carnet
  // ouvert ; fermé avant la fin (le « Fermer » tactile), il reprend à la
  // prochaine ouverture — l'indice n'est VU qu'une fois le dernier signe tombé.
  let dechiffrement = null;
  const configIndices = registre.obtenir('indices', 'indices_config');

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
      ouvertureLogoMs !== null || prologue !== null || vueStele !== null || vueParchemin !== null || constructionActif()
    );
  }

  function demarrerChoixFollet() {
    ouvrirDialogueCatalogue('dlg_grotte_choix_follet', {
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
    follet = creerFollet(companionId, hero, sensOrbiteFollet());
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
    ouvrirDialogueCatalogue('dlg_grotte_follet_enthousiaste', { companionId });
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

  // Ticket L3 : le symbole d'abord, si ses calques existent — l'intro naît à
  // sa fin (maj()). Sans calques, l'intro part tout de suite, comme avant : un
  // logo absent ne coûte rien au joueur. Une fonction parce que deux chemins y
  // mènent : l'entrée en scène sans prologue, et la fin du prologue.
  function demarrerOuverture(sceneId) {
    if (imagesLogo.length > 0) ouvertureLogoMs = 0;
    else intro = creerIntro(registre.obtenir('scenes', sceneId).intro);
  }

  // Événements scriptés à l'entrée d'une scène (§3.1/§3.3) : un script par
  // id de scène, pas un système générique — cf. note en tête de fichier.
  function declencherEvenementsEntree(sceneId) {
    if (sceneId === 'scene_grotte_salle_1' && !flags.has('flag_follet_choisi')) {
      // Intro cinématique (§3.5) : rejouée ssi flag_follet_choisi absent
      // (nouvelle partie / reset), jamais à un respawn (le flag est déjà posé
      // dès qu'un follet a été choisi une fois). demarrerChoixFollet() n'est
      // appelée qu'à la fin de l'intro (main.js#maj()), pas ici.
      // `specs/12` : le prologue d'abord, dans le jeu servi — le symbole
      // naît à sa fin (maj()). Sans lui, l'ouverture part tout de suite.
      const ecransPrologue = jouerPrologue ? registre.tous('prologue') : [];
      if (ecransPrologue.length > 0) prologue = creerPrologue(ecransPrologue);
      else demarrerOuverture(sceneId);
    }
    if (sceneId === 'scene_grotte_salle_2' && !flags.has('flag_grotte_monstre_tue') && monstres.length > 0) {
      ouvrirDialogueCatalogue('dlg_grotte_tuto_combat');
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

  // `D-63` (T9) : les verbes de la barre d'actions réellement débloqués, dans
  // l'ordre du catalogue. Décision de Xav (21/09) : sur une partie neuve,
  // **seule la case d'attaque de base est là** ; une case apparaît quand son
  // premier contenu est débloqué.
  //
  // C'est le MÊME filtre que les écrans (`D-62`, T4) sur le MÊME registre de
  // flags — pas un second mécanisme. `data/action_slots.json` porte les
  // conditions ; ni le rendu ni l'input ne savent ce qu'est un slot.
  //
  // Recalculé à chaque appel, jamais mis en cache : une condition peut
  // devenir vraie au milieu d'une frame (ramasser un fruit), et une case qui
  // n'apparaîtrait qu'au rechargement serait exactement le genre de défaut
  // qu'on ne reproduit jamais.
  function verbesActionsVisibles() {
    return entreesVisibles(registre.tous('action_slots'), flags).map((slot) => slot.verb);
  }

  // `D-93` (T2) : le loquet `flag_premier_consommable` est RETIRÉ. La case du
  // consommable suit désormais l'état réel de la poche, par une valeur nommée
  // (`consommables_en_poche`) que `data/action_slots.json` cite — c'est le
  // mécanisme d'apparition existant, sans code de déblocage propre.
  //
  // C'est un retournement assumé (décision de Xav, 22/09, qui *révise* le
  // 21/09) : on craignait de faire « clignoter » la case au rythme de la
  // poche, mais voir une touche qui ne fait rien est pire que de la voir
  // partir avec ce qu'elle servait à manger.
  function consommablesEnPoche() {
    let total = 0;
    for (const [itemId, quantite] of Object.entries(save.inventaire.items)) {
      if (!(quantite > 0)) continue;
      const itemDef = registre.obtenir('items', itemId);
      if (itemDef && SLOT_PAR_CATEGORIE[itemDef.categorie] === 'consommable') total += 1;
    }
    return total;
  }

  // `D-125` (T9) : combien d'objets dorment dans les stations de stockage.
  // TOUTES les instances, pas seulement le coffre de base : depuis `D-121` le
  // contenu appartient à l'instance, donc en nommer une ici rendrait la ligne
  // du follet muette dès que le joueur range dans un coffre qu'il a posé.
  // Une entrée sans `contenu` est une simple POSE (`D-121` encore), et
  // n'apporte rien à la somme.
  // Les coffres se trouvent par la résolution des interactifs de la scène
  // (`scene.puzzle`, `D-121`) : un coffre posé en jeu en est un comme les
  // autres. Hors d'une scène qui en porte, 0.
  function remplissageCoffre() {
    if (!scene) return 0;
    let max = 0;
    for (const id of scene.interactifs) {
      const p = scene.puzzle(id);
      if (!p || p.type !== 'station') continue;
      const station = registre.obtenir('stations', p.station_type);
      if (!station || station.role !== 'stockage') continue;
      const capacite = capaciteDeStation(station);
      max = Math.max(max, slotsOccupes(contenuDeStation(p.id), capacite, obtenirItemDef) / capacite.slots);
    }
    return max;
  }

  function objetsRangesAuCoffre() {
    let total = 0;
    for (const entree of Object.values(save.maison.stations || {})) {
      for (const quantite of Object.values((entree && entree.contenu) || {})) {
        if (quantite > 0) total += quantite;
      }
    }
    return total;
  }

  // `D-92` + `D-93` : un slot qui ne correspond plus à rien retombe sur le
  // défaut de son slot, et ça se DIT en console. Appelée à chaque frame,
  // AVANT toute branche d'UI — le Coffre déplace des objets pendant qu'un
  // écran est ouvert, donc une revalidation posée sous `if (!uiOuverte)`
  // manquerait précisément le cas qui a fait le bug.
  function revaliderEquipementDuHeros() {
    const { changements } = revaliderEquipement(save, registre);
    if (!changements.length) return;
    etatModifie = true;
    for (const c of changements) {
      console.info(`[D-92/D-93] slot "${c.slot}" revalidé : "${c.id}" ${c.raison}`
        + `${c.remplace ? ` — remplacé par "${c.remplace}"` : ' — retour au défaut'}`);
    }
  }
  revaliderEquipementDuHeros();

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
    ouvrirDialogueCatalogue(ambiance.dialogue);
    etatModifie = true;
  }

  // Spec 11 §5 et §7.3 : le temps des effets de monde, et ce qu'un effet dit
  // quand il se lève. Le « quoi dire » est en données (`effets_monde.json >
  // dialogue_fin`) : `effets_monde.js` ne sait toujours pas ce que fait un
  // effet, et un effet de plus avec sa réplique est une entrée JSON de plus.
  function avancerEffetsMonde(deltaMs) {
    const avant = effetsMonde;
    effetsMonde = tickEffets(effetsMonde, deltaMs);
    for (const def of registre.tous('effets_monde')) {
      if (def.dialogue_fin && effetActif(avant, def.id) && !effetActif(effetsMonde, def.id)) {
        finsEffetsEnAttente.push(def.dialogue_fin);
      }
    }
    if (finsEffetsEnAttente.length > 0 && !dialogue.estOuvert()) {
      ouvrirDialogueCatalogue(finsEffetsEnAttente.shift());
    }
  }

  // Spec 11 : LE point qui ouvre une entrée de `dialogues.json`. Depuis le
  // palier B, tout dialogue du jeu passe ici, et la bulle n'a qu'un chemin.
  // `companionId` : le follet qui parle, quand il n'est pas encore dans la
  // sauvegarde (l'enthousiasme du follet qu'on vient d'élire).
  function ouvrirDialogueCatalogue(dialogueId, { onFermer = null, companionId = save.hero.companion } = {}) {
    const donnees = registre.obtenir('dialogues', dialogueId);
    if (!donnees) throw new Error(`dialogue "${dialogueId}" introuvable dans dialogues.json`);
    dialogue.demarrerConversation(donnees, {
      resoudre: (noeudId) => resoudreNoeud(donnees, noeudId, registre, i18n, companionId,
        input.peripheriqueActif ? input.peripheriqueActif() : 'manette'),
      poids: reglageAlignement.poids_defaut,
      onResultat: appliquerResultatDialogue,
      onFermer,
    });
  }

  // Spec 11 §4.1 : LE point qui applique ce qu'une conversation a produit, dans
  // l'ordre où `dialogue.js` le rend — options, spam, lecture. Un seul
  // appelant de `modifierAlignement` pour tout ce qui vient d'un dialogue ;
  // la source dit d'où vient chaque poids, pour le journal de `?debug=fps`.
  function appliquerResultatDialogue(resultat) {
    for (const c of resultat.consequences) {
      if (c.type === 'alignement') {
        const source = c.source === 'option' ? `dialogue:${resultat.dialogueId}` : `dialogue:${resultat.dialogueId}:${c.source}`;
        modifierAlignement(c.delta, source);
      } else if (c.type === 'flag') {
        flags.set(c.id);
      } else if (c.type === 'effet_monde') {
        effetsMonde = activerEffet(effetsMonde, c.id, c.duree_ms);
      }
    }
    etatModifie = true;
  }

  // Ce que le doigt désigne sur la bulle cette frame, contre la géométrie
  // DESSINÉE (celle de `ligneCourante()` : une option invisible ne se touche
  // pas). Hors conversation, rien : les répliques d'avant avancent par le
  // bouton, comme toujours.
  function toucherDialogue(contacts) {
    if (contacts.length === 0 || !dialogue.etatConversation()) return null;
    const ligne = dialogue.ligneCourante();
    const geometrie = geometrieBoiteDialogue(ligne && ligne.options ? ligne.options.length : 0, RESOLUTION_LOGIQUE);
    return toucherBoiteDialogue(geometrie, contacts);
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
        // `D-121` : une entrée de `maison.stations` peut ne porter QUE un
        // contenu (un coffre jamais déplacé qu'on a rempli). Elle n'est une
        // pose que si elle en a les coordonnées — et c'est `D-126` qui a sorti
        // cette règle d'ici, parce qu'elle était vraie ici seulement.
        const poseSauvegardee = stationType.placable
          ? poseSauvegardeeDeStation(save.maison.stations[puzzle.id])
          : null;

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
    // `D-178` : ceux de la cinématique aussi (une partie neuve la rejoue).
    sillagesCinematique.forEach(viderPoussiere);
    positionsSillageCinematique = ORDRE_CHOIX_FOLLET.map(() => null);
    tempsCinematiqueMs = 0;
    tempsVolFolletMs = 0;
    corpsFollet = decalageCorpsFollet(0, configVolFollet);
    // `D-05`, même raison exactement : un « +1 Bois » gagné dans la scène
    // qu'on quitte n'a rien à faire flottant dans la suivante.
    viderTextesFlottants(textesFlottants);
    // `specs/13` palier A : l'entrée en scène chiffrée, en trois temps. Aucune
    // horloge lue hors `?debug=fps` (même patron que `creerBoucle#surFrame`).
    const mesureEntree = moniteurPerf.actif;
    const tDebutEntree = mesureEntree ? performance.now() : 0;
    scene = chargerScene(
      registre, sceneId, resoudreOverridesStations(sceneId),
      instancesCreees(registre, sceneId, save.maison.stations),
    );
    const tSceneEntree = mesureEntree ? performance.now() : 0;
    // Palier E : le calque statique de la scène neuve est à construire, et
    // cette construction n'est pas une saccade de jeu — Auto ne la juge pas.
    msDepuisEntreeScene = 0;
    // Décor (§3.4 03_grotte-polish) : genererDecor() reste pur et ne connaît
    // que des id (visuel: string) — résolus ici une seule fois, à l'entrée en
    // scène (le décor est statique, jamais recalculé par frame), même
    // patron que monstresAffiches/puzzlesAffiches dans dessiner().
    regenererDecor();
    const tDecorEntree = mesureEntree ? performance.now() : 0;

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
    viderProjectiles(projectiles);
    ondes = [];
    rencontre = null;
    extinctionsLeviers = new Map();

    follet = save.hero.companion ? creerFollet(save.hero.companion, hero, sensOrbiteFollet()) : null;
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
    if (mesureEntree) {
      const tFin = performance.now();
      const entree = {
        sceneId,
        dureeMs: tFin - tDebutEntree,
        sceneMs: tSceneEntree - tDebutEntree,
        decorMs: tDecorEntree - tSceneEntree,
        resteMs: tFin - tDecorEntree,
        plafondMs: PLAFOND_ENTREE_SCENE_MS,
      };
      moniteurPerf.surEntreeScene(entree);
      // `specs/13` palier F (`Q-134`) : le plafond ne se lit que là où la
      // mesure existe — hors `?debug=fps`, aucune horloge n'est lue (palier
      // A). Les scénarios de la règle de l'Annexe tournent sous `?debug=fps` :
      // c'est là que l'avertissement doit tomber.
      const avertissement = avertissementEntreeScene(entree, PLAFOND_ENTREE_SCENE_MS);
      if (avertissement) console.warn(avertissement);
    }
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

  // Spec 14, §4.3 : un interactif qui déclare `visible_si` n'EXISTE pas tant
  // que sa condition ne tient pas — ni dessiné, ni pris par INTERACT, ni
  // compté à portée (`a_portee`), ni proposé par l'indice de commande. Le
  // verdict est celui de tout le jeu (`visibilite.js#estVisible`, `D-62` :
  // absent = toujours visible). Sa collision n'est pas en cause : un
  // interactif solide ne peut pas déclarer `visible_si` (refusé au démarrage).
  function interactifsPresents() {
    return scene.interactifs.filter((id) => estVisible(scene.puzzle(id), flags));
  }

  // Spec 14, §4.6 : un coffre à parchemin est OUVERT quand la compétence qu'il
  // apprend l'est — son état n'est rien d'autre que ce flag, persistant. Ouvert,
  // il ne se prend plus à la main et se dessine vide, à toutes les descentes.
  function coffreOuvert(puzzle) {
    return flags.has(registre.obtenir('skills', puzzle.competence).flag);
  }

  // Le dessin d'un interactif, tel que le monde ET le bouton tactile le
  // montrent : un seul choix, sinon le bouton montrerait un coffre fermé
  // devant un coffre ouvert. L'empreinte, elle, reste celle du visuel de base.
  function visuelInteractif(puzzle) {
    const ouvert = puzzle.type === 'coffre_parchemin' && coffreOuvert(puzzle);
    return registre.obtenir('visuels', ouvert ? puzzle.render.visuel_ouvert : puzzle.render.visuel);
  }

  // 03_maison-exterieur §3.2/§3.3 étend l'interaction à 4 cibles possibles,
  // essayées dans cet ordre (le premier trouvé à portée gagne, un seul par
  // appui) : levier/station de scene.interactifs (déjà des entités
  // positionnées), objet au sol, puis tuile-ressource (scan de grille, donc
  // en dernier — la moins probable d'être ambiguë avec autre chose).
  //
  // `D-177` : CE QUE vise l'appui est une question à part de ce qu'il FAIT.
  // Le bouton tactile d'interaction montre la silhouette de sa cible avant
  // qu'on appuie ; il lit cette fonction-ci, et `essayerInteraction` aussi —
  // jamais deux calculs de « la cible », qui finiraient par montrer un coffre
  // et ouvrir un levier. Ne modifie rien : elle peut être lue à chaque frame.
  // L'interactif qu'INTERACT prendrait à la main, ou `null` : extrait de
  // `cibleInteraction` (spec 14) pour que la valeur `a_portee` des conditions
  // lise LA même portée, par le même parcours.
  function interactifAPortee() {
    for (const puzzleId of interactifsPresents()) {
      // `D-121` : `scene.puzzle` et non `registre.obtenir` — un id venu de la
      // scène peut désigner une instance CRÉÉE (un coffre fabriqué), qui
      // n'est dans aucun catalogue.
      const puzzle = scene.puzzle(puzzleId);
      if (puzzle.type === 'coffre_parchemin' && coffreOuvert(puzzle)) continue;
      // §3 : seuil mesuré au bord de l'empreinte, pas au centre (une station
      // ×2,1 solide dépasserait sinon DISTANCE_INTERACT_PX depuis l'extérieur
      // de son propre bord) — un levier (empreinte nulle) redonne exactement
      // la distance au centre d'avant cette fiche.
      if (distanceAuRectangle(hero.x, hero.y, rectangleInteractif(puzzle)) > DISTANCE_INTERACT_PX) continue;
      // Un interactif d'un autre type ne se prend pas à la main : le suivant
      // a sa chance, comme avant ce découpage.
      if (TYPES_INTERACTIFS_A_LA_MAIN.includes(puzzle.type)) return { puzzle, puzzleId };
    }
    return null;
  }

  function cibleInteraction() {
    const interactif = interactifAPortee();
    if (interactif) return { genre: 'interactif', ...interactif };
    // `specs/15` palier C : un objet planté se reprend d'INTERACT. Il passe
    // avant les objets au sol : c'est une chose dressée, qu'on vise.
    const planteProche = trouverObjetJeteProche(objetsPlantesDeLaScene(), hero, DISTANCE_INTERACT_PX);
    if (planteProche) return { genre: 'plante', plante: planteProche };
    const jeteProche = trouverObjetJeteProche(objetsJetesDeLaScene(), hero, DISTANCE_INTERACT_PX);
    const semeProche = trouverItemProche(itemsSol, hero, DISTANCE_INTERACT_PX);
    const distanceSeme = semeProche
      ? Math.hypot(hero.x - semeProche.position.x, hero.y - semeProche.position.y) : Infinity;
    // `D-145` : l'objet jeté passe avant quand il est au moins aussi près —
    // c'est lui que le joueur vient de poser.
    if (jeteProche && jeteProche.distance <= distanceSeme) return { genre: 'jete', jete: jeteProche };
    if (semeProche) return { genre: 'seme', seme: semeProche };
    const ressourceProche = trouverRessourceProche(scene, hero, DISTANCE_INTERACT_PX);
    if (ressourceProche) return { genre: 'ressource', ressource: ressourceProche };
    return null;
  }

  // `D-158` : un levier se lit à son GESTE (bascule.js) — allumé quand le
  // manche a touché sa butée, pas à l'appui. Sans état de geste (la toute
  // première frame), l'état réel, posé. `null` pour tout autre interactif.
  function gesteDuLevier(puzzle) {
    if (!TYPES_LEVIER.includes(puzzle.type)) return null;
    return basculesLeviers.get(puzzle.id) || avancerBascule(null, !!puzzlesEtat[puzzle.id]?.actif, 0);
  }

  // Le manche d'un levier, à l'angle de son geste : lu par le dessin du monde
  // ET par le bouton tactile qui le montre (`D-177`) — un seul calcul, sinon
  // le bouton montrerait un manche baissé sur un levier levé.
  function pieceMobileDuLevier(puzzle, visuel) {
    const geste = gesteDuLevier(puzzle);
    const mobile = geste && visuel.piece_mobile;
    if (!mobile) return null;
    return {
      visuel: registre.obtenir('visuels', mobile.visuel),
      pivot: mobile.pivot,
      angle: mobile.angles[0] + (mobile.angles[1] - mobile.angles[0]) * positionBascule(geste),
    };
  }

  // `D-177` : la silhouette de la cible, pour le bouton tactile — celle que le
  // monde dessine déjà (l'interactif avec son manche, l'objet, la
  // tuile-ressource), jamais une icône de plus à tenir. `{ visuel,
  // pieceMobile }`, ou `null` = rien à montrer (le bouton garde son onde).
  function visuelCibleInteraction(cible) {
    if (!cible) return null;
    if (cible.genre === 'interactif') {
      const visuel = visuelInteractif(cible.puzzle);
      return { visuel, pieceMobile: pieceMobileDuLevier(cible.puzzle, visuel) };
    }
    let id = null;
    if (cible.genre === 'plante') {
      const item = registre.obtenir('items', cible.plante.itemId);
      id = (item.plantable && item.plantable.visuel) || (item.render && item.render.visuel);
    } else if (cible.genre === 'jete' || cible.genre === 'seme') {
      const item = registre.obtenir('items', (cible.jete || cible.seme).itemId);
      id = item.render && item.render.visuel;
    } else if (cible.genre === 'ressource') {
      const tuile = scene.tuileA(cible.ressource.tx, cible.ressource.ty);
      id = tuile && tuile.render && tuile.render.visuel;
    }
    return id ? { visuel: registre.obtenir('visuels', id), pieceMobile: null } : null;
  }

  function essayerInteraction() {
    const cible = cibleInteraction();
    if (!cible) return;
    if (cible.genre === 'interactif') {
      const { puzzle, puzzleId } = cible;
      if (puzzle.type === 'levier') {
        puzzlesEtat = activerLevier(registre, puzzlesEtat, puzzleId, flags);
        save.puzzles = puzzlesEtat;
        etatModifie = true;
        return;
      }
      if (puzzle.type === 'levier_maintenu') {
        puzzlesEtat = allumerLevierMaintenu(registre, puzzlesEtat, puzzleId);
        save.puzzles = puzzlesEtat;
        return;
      }
      if (puzzle.type === 'station_placeholder') {
        ouvrirDialogueCatalogue(puzzle.dialogue);
        return;
      }
      if (puzzle.type === 'coffre_parchemin') {
        ouvrirCoffreParchemin(puzzle);
        return;
      }
      if (puzzle.type === 'stele') {
        vueStele = creerVueStele(puzzleId);
        if (puzzle.flag) flags.set(puzzle.flag);
        return;
      }
      // Reste `station`, le dernier type de `TYPES_INTERACTIFS_A_LA_MAIN`.
      essayerStation(puzzle);
      return;
    }

    // `D-145` : un objet JETÉ se ramasse comme un objet semé — même geste, un
    // par un, le plus proche d'abord (et sur une pile, celui du dessus). Il
    // passe avant quand il est au moins aussi près : c'est lui que le joueur
    // vient de poser. Ce qui diffère est tout ce qui suit l'entrée en poche :
    // **aucune XP** (sinon jeter puis reprendre en boucle ferait monter de
    // niveau), aucune repousse, aucun flag de premier ramassage (l'objet a
    // déjà été ramassé une fois pour arriver en poche).
    // `specs/15` palier C : reprendre un objet planté, avec son temps. Comme
    // un objet jeté : aucune XP, aucun flag de premier ramassage.
    if (cible.genre === 'plante') {
      const p = cible.plante;
      const resultat = ajouterItem(save.inventaire.items, p.itemId, 1, plafondPoche(p.itemId));
      if (resultat.ajoute <= 0) {
        signalerRefusConteneur(CLE_TEXTE_POCHE_PLEINE, p.position.x, p.position.y);
        return;
      }
      save.inventaire.items = resultat.inventaire;
      const itemDef = registre.obtenir('items', p.itemId);
      if (itemDef.combustion && p.position.restant_ms !== undefined) {
        const liste = rendre(entamees(save.inventaire.combustion, p.itemId), p.position.restant_ms, itemDef.combustion.duree_ms);
        if (liste.length > 0) save.inventaire.combustion = { ...(save.inventaire.combustion || {}), [p.itemId]: liste };
      }
      signalerGainItem(p.itemId, resultat.ajoute, p.position.x, p.position.y);
      ecrireObjetsPlantesDeLaScene(retirerObjetJete(objetsPlantesDeLaScene(), p.index));
      etatModifie = true;
      return;
    }

    if (cible.genre === 'jete') {
      const jeteProche = cible.jete;
      const resultat = ajouterItem(save.inventaire.items, jeteProche.itemId, 1, plafondPoche(jeteProche.itemId));
      if (resultat.ajoute <= 0) {
        signalerRefusConteneur(CLE_TEXTE_POCHE_PLEINE, jeteProche.position.x, jeteProche.position.y);
        return;
      }
      save.inventaire.items = resultat.inventaire;
      signalerGainItem(jeteProche.itemId, resultat.ajoute, jeteProche.position.x, jeteProche.position.y);
      ecrireObjetsJetesDeLaScene(retirerObjetJete(objetsJetesDeLaScene(), jeteProche.index));
      etatModifie = true;
      return;
    }

    if (cible.genre === 'seme') {
      const itemProche = cible.seme;
      const itemDef = registre.obtenir('items', itemProche.itemId);
      const resultat = ajouterItem(save.inventaire.items, itemProche.itemId, 1, plafondPoche(itemProche.itemId));
      // Poche pleine (§4 edge case) : l'item reste au sol — et depuis `D-118`
      // ça se DIT (le silence était la moitié de `D-28`). Le texte monte de
      // l'objet refusé, pas du héros : même règle que le gain qu'il remplace.
      if (resultat.ajoute <= 0) {
        signalerRefusConteneur(CLE_TEXTE_POCHE_PLEINE, itemProche.position.x, itemProche.position.y);
      }
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
        // `D-125` (T9) : un item peut déclarer le flag de son PREMIER
        // ramassage (`items.json > flag_ramassage`), exactement comme un objet
        // unique déclare le sien. C'est ce qui permet à une ligne de lore de
        // parler de l'herbe sans qu'aucun id d'item n'entre dans le code — et
        // `flags.set` est déjà idempotent, donc « le premier » n'a rien à
        // vérifier ici.
        if (itemDef.flag_ramassage) flags.set(itemDef.flag_ramassage);
        if (!flags.has('flag_premier_ramassage')) {
          flags.set('flag_premier_ramassage');
          ouvrirDialogueCatalogue('dlg_premier_ramassage');
        }
        etatModifie = true;
      }
      return;
    }

    {
      const ressourceProche = cible.ressource;
      const donneesRessource = registre.obtenir('resources', ressourceProche.ressourceId);
      // Palier B (§3.2) : peutRecolter() enfin branché sur la poche réelle —
      // sans l'outil, comportement Phase 2 inchangé (dialogue "pas encore").
      if (!peutRecolter(donneesRessource, save.inventaire.items)) {
        ouvrirDialogueCatalogue(donneesRessource.dialogue_bloque);
        return;
      }
      // Cooldown PAR TUILE (§9 point ouvert : "par tuile", deux arbres = deux
      // cooldowns) — clé stable tant que la tuile ne bouge pas.
      const cleCooldown = `res:${scene.id}:${ressourceProche.tx}:${ressourceProche.ty}`;
      if (!estExpire(save.cooldowns, cleCooldown, donneesRessource.cooldown_ms, save.monde.heure)) {
        ouvrirDialogueCatalogue('dlg_ressource_cooldown');
        return;
      }
      const itemDefProduit = registre.obtenir('items', donneesRessource.item_produit);
      const resultatRecolte = ajouterItem(
        save.inventaire.items, donneesRessource.item_produit, 1, plafondPoche(donneesRessource.item_produit),
      );
      // `D-28`, l'autre moitié : une récolte refusée ne consomme PAS le
      // cooldown de la tuile. Les deux chemins de récolte se comportent enfin
      // pareil — c'était la divergence même que la ligne décrivait (le
      // ramassage au sol laissait l'objet, la récolte mangeait le cooldown).
      if (resultatRecolte.ajoute <= 0) {
        signalerRefusConteneur(
          CLE_TEXTE_POCHE_PLEINE,
          (ressourceProche.tx + 0.5) * scene.tileSize,
          (ressourceProche.ty + 0.5) * scene.tileSize,
        );
        return;
      }
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
    // `D-09` (décision de Xav, 23/09) : la réplique de première interaction
    // passe AVANT l'écran, et l'écran s'ouvre à sa fermeture — jamais un
    // dialogue par-dessus un menu, ce qui était la raison du gel de la ligne
    // (le routage de `maj()` ne sert qu'une UI à la fois). La relance passe
    // par cette même fonction, donc le rôle de la station décide toujours
    // seul de ce qui suit, et le flag déjà posé l'empêche de reboucler.
    //
    // Le flag est posé AVANT le dialogue, comme pour une ambiance : une
    // sauvegarde prise pendant la réplique ne la fait pas revenir. Et
    // `reinitialiserPartie`, qui ferme le dialogue (donc déclencherait ce
    // `onFermer`), ne peut pas courir pendant la réplique : elle part du
    // menu, qui ne s'ouvre jamais par-dessus un dialogue.
    const premiere = station.premiere_interaction;
    if (premiere && !flags.has(premiere.flag)) {
      flags.set(premiere.flag);
      etatModifie = true;
      ouvrirDialogueCatalogue(premiere.dialogue, {
        onFermer: () => essayerStation(puzzle),
      });
      return;
    }
    if (station.role === 'craft') {
      menu.ouvrirCraft(() => entreesCraft(puzzle, station), i18n.t(station.label_key), {
        texteVide: i18n.t('menu.fiche.aucune_recette'),
      });
      return;
    }
    if (station.role === 'stockage') {
      // `D-121` : c'est CE coffre-là qui s'ouvre, pas « le » coffre — d'où
      // l'instance passée avec son type.
      menu.ouvrirCoffre(() => entreesCoffre(puzzle, station), i18n.t(station.label_key), {
        sousTitre: () => i18n.t('menu.fiche.coffre_piles', {
          n: slotsOccupes(contenuAfficheDeStation(puzzle.id), capaciteDeStation(station), obtenirItemDef),
          max: capaciteDeStation(station).slots,
        }),
        texteVide: i18n.t('menu.poche_vide'),
      });
      return;
    }
    // role === 'eau' (puits, §3.3) : boit directement, jamais un menu —
    // cooldown anti-spam identique au reste (§10), une clé par instance de
    // puits (une seule en M1, mais §6 : ne jamais supposer sa position/id).
    const cleCooldown = `eau:${puzzle.id}`;
    if (!estExpire(save.cooldowns, cleCooldown, COOLDOWN_PUITS_MS, save.monde.heure)) {
      ouvrirDialogueCatalogue('dlg_puits_cooldown');
      return;
    }
    // `D-123` (T7) : l'XP du puits tombe si la jauge était SOUS SON SEUIL
    // avant de boire — `Q-43` tranchée par Xav le 22/09 (« oui, 90 % »).
    //
    // *Révise* la règle d'avant, « l'XP tombe si la jauge a bougé » : à
    // 99,5 %, boire faisait bouger la jauge d'un demi-point et rapportait
    // autant qu'à 10 %, ce qui rendait le puits payant au tapotement. Le
    // seuil vit en données (`survival.json > jauge_soif > seuil_xp`), et une
    // jauge qui n'en déclare pas ne rapporte jamais rien — on ne mange pas au
    // puits.
    const jaugeSoif = registre.obtenir('survival', 'jauge_soif');
    const soifAvant = save.survie.jauge_soif;
    save.survie = consommerSurvie(save.survie, { jauge_soif: 1 });
    if (jaugeSoif.seuil_xp !== undefined && soifAvant < jaugeSoif.seuil_xp) {
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
  function entreesCraft(puzzle, station) {
    const heureMs = save.monde.heure;
    // `D-62` (T4) : LE point unique du filtre anti-spoil. Tout écran qui
    // liste un catalogue passe par `entreesVisibles` — jamais un `.filter()`
    // écrit sur place, qui finirait par diverger de celui d'à côté. Une
    // entrée verrouillée n'est pas grisée ni remplacée par « ??? » : elle
    // n'est pas dans la liste, donc elle ne peut pas être comptée.
    //
    // Le tri (24/09) passe APRÈS le filtre : il range ce que le joueur voit,
    // et une recette cachée ne réserve aucune place.
    return trierRecettes(
      entreesVisibles(recettesDeStation(registre, station.id), flags),
      registre.tous('recipe_categories').map((c) => c.id),
      (r) => i18n.t(r.label_key),
    )
      .map((r) => {
        // `D-122` (T6) : le plafond est passé au VERDICT, pas seulement à
        // l'action — c'est ce qui permet de dire « ta poche est pleine »
        // AVANT de tenter, au lieu de laisser une tuile non grisée ne rien
        // faire.
        const verdict = peutFabriquer(
          r, save.inventaire.items, flags, save.cooldowns, heureMs, save.inventaire.eclats,
          r.sortie.item
            ? ((pocheApresEntrees) => plafondPourItem(
              pocheApresEntrees, r.sortie.item, capacitePoche(), obtenirItemDef,
            ))
            : null,
        );
        let suffixe = '';
        if (verdict.raison === 'cooldown') {
          const resteS = Math.ceil(tempsRestantMs(save.cooldowns, r.id, r.cooldown_ms ?? 60000, heureMs) / 1000);
          suffixe = ` (${resteS}${i18n.t('menu.unite_secondes')})`;
        } else if (verdict.raison === 'ingredients') {
          suffixe = ` (${i18n.t('menu.craft_manque')})`;
        } else if (verdict.raison === 'poche_pleine') {
          suffixe = ` (${i18n.t('menu.poche_pleine')})`;
        } else if (verdict.raison === 'deja_possede') {
          suffixe = ` (${i18n.t('menu.craft_deja_possede')})`;
        } else if (verdict.raison === 'eclats') {
          // `D-66` : un refus se DIT, comme les trois autres. Sans cette
          // ligne, la recette serait grisée sans raison affichée — et la
          // règle « le résultat fait foi » retenterait un craft impossible
          // en silence.
          suffixe = ` (${i18n.t('menu.craft_manque_eclats')})`;
        }
        // specs/08_menus-cartes.md, palier C5 : la tuile est celle de l'objet
        // PRODUIT ; la fiche dit ce que la recette demande (avec ce qu'on a en
        // poche, relu à chaque affichage), ce qu'elle donne — l'objet produit
        // est décrit par `lignesFicheItem`, comme dans la Poche et le Coffre —,
        // et la raison d'un refus probable.
        // `D-121` : une recette produit soit un objet, soit une STATION. Ce
        // qu'on montre — la tuile, le nom, ce que ça donne — se résout donc
        // dans un catalogue ou dans l'autre. Une seule paire de valeurs, lue
        // une fois : c'est ce qui évite d'écrire deux fois la fiche.
        const modeleSortie = r.sortie.station ? modeleDeStation(registre, r.sortie.station) : null;
        // Un objet PORTÉ (la besace) se montre par sa fiche d'objet, comme un
        // objet de poche : seul son devenir diffère.
        const defSortie = modeleSortie
          ? registre.obtenir('stations', r.sortie.station)
          : registre.obtenir('items', r.sortie.item || r.sortie.porte);
        const visuelSortie = modeleSortie ? modeleSortie.render.visuel : defSortie.render.visuel;
        // `D-122` : la fiche dit ce qui manque, et COMBIEN. Le détail vient
        // de `peutFabriquer` — seul endroit qui le sache —, la phrase se
        // compose ici, par un gabarit de locale : ni le module de recettes ni
        // les locales ne portent l'autre moitié.
        const raisons = {
          cooldown: () => i18n.t('menu.fiche.recharge', {
            n: Math.ceil(tempsRestantMs(save.cooldowns, r.id, r.cooldown_ms ?? 60000, heureMs) / 1000),
          }),
          deja_possede: () => i18n.t('menu.fiche.deja_possede'),
          ingredients: () => i18n.t('menu.fiche.ingredient_manquant', {
            n: verdict.detail.manque,
            item: i18n.t(registre.obtenir('items', verdict.detail.item).label_key),
          }),
          eclats: () => i18n.t('menu.fiche.eclats_manquants_n', { n: verdict.detail.manque }),
          poche_pleine: () => i18n.t('menu.fiche.poche_pleine'),
        };
        return {
          texte: `${i18n.t(r.label_key)}${suffixe}`,
          titre: i18n.t(r.label_key),
          icone: visuelSortie,
          quantite: r.sortie.qte > 1 ? r.sortie.qte : null,
          lignes: [
            // `D-103` (T10) : une ligne d'ingrédient et une ligne de coût
            // MONTRENT ce dont elles parlent. La silhouette vient du même
            // endroit que celle de la tuile (`render.visuel` de l'item, et
            // `monnaies.json` pour la monnaie) : aucune image n'est choisie
            // ici. Le texte, lui, ne change pas d'un mot — l'icône s'ajoute,
            // elle ne remplace pas le nom, qui reste ce que lit un joueur qui
            // ne reconnaît pas encore la forme.
            ...r.entrees.map((e) => ({
              texte: i18n.t('menu.fiche.ingredient', {
                item: i18n.t(registre.obtenir('items', e.item).label_key), n: e.qte, possede: save.inventaire.items[e.item] || 0,
              }),
              icone: registre.obtenir('items', e.item).render.visuel,
            })),
            ...(r.cout_eclats ? [{
              texte: i18n.t('menu.fiche.cout_eclats', { n: r.cout_eclats, possede: save.inventaire.eclats }),
              icone: iconeMonnaie,
            }] : []),
            // Un objet PORTÉ (la besace) n'est pas « donné » et sa catégorie
            // ne dit rien : il n'entre jamais en poche. Sa fiche se résume à
            // sa description (simplification demandée par Xav, 24/09).
            ...(r.sortie.porte ? [] : [i18n.t('menu.fiche.donne', { item: i18n.t(defSortie.label_key), n: r.sortie.qte || 1 })]),
            // L'XP d'une recette se DIT (Xav, 24/09 : « je ne le savais pas,
            // ce n'est pas indiqué ») : la barre bouge pendant que le menu la
            // recouvre, personne ne la regarde. Une recette sans XP ne dit rien.
            ...(r.xp > 0 ? [i18n.t('menu.fiche.rapporte_xp', { n: r.xp })] : []),
            // La fiche d'un OBJET vient de `lignesFicheItem` ; une station
            // n'en a pas (elle ne se porte pas), elle dit ce qu'on en fera.
            ...(modeleSortie ? [i18n.t('menu.fiche.a_poser')]
              : lignesFicheItem(defSortie, registre, i18n).slice(r.sortie.porte ? 1 : 0)),
            ...(raisons[verdict.raison] ? [raisons[verdict.raison]()] : []),
          ],
          libelleAction: i18n.t('menu.fiche.fabriquer'),
          grisee: !verdict.ok,
          action: () => {
            const resultat = fabriquer(r, {
              poche: save.inventaire.items,
              flags,
              cooldowns: save.cooldowns,
              heureMs: save.monde.heure,
              // Le plafond se mesure sur la poche que `fabriquer` nous
              // passe — celle d'APRÈS le retrait des ingrédients. C'est ce
              // qui fait qu'on peut cuire son dernier fruit sans avoir à
              // vider un slot d'abord.
              plafondSortie: (pocheApresEntrees) => (r.sortie.item
                ? plafondPourItem(pocheApresEntrees, r.sortie.item, capacitePoche(), obtenirItemDef)
                : 0),
              eclats: save.inventaire.eclats,
            });
            if (resultat.ok) {
              save.inventaire.items = resultat.poche;
              // `D-66` : les éclats reviennent d'un module pur, on les repose
              // ici — au même endroit et au même moment que la poche.
              save.inventaire.eclats = resultat.eclats;
              save.cooldowns = resultat.cooldowns;
              // Le « +N xp » monte du CENTRE de la station, comme au puits :
              // le texte dit d'où vient le gain. Gelé sous le menu avec tout le
              // reste (`D-05`), il fusionne les fabrications enchaînées et
              // monte à la fermeture — c'est là que le joueur revoit le monde.
              const boite = rectangleInteractif(puzzle);
              crediterXpHeros(resultat.xp, { x: boite.x + boite.w / 2, y: boite.y + boite.h / 2 });
              flags.set('flag_premier_craft');
              // La besace : l'objet se porte dès sa fabrication. Le flag est
              // toute sa présence — la poche grandit avec lui (`capacitePoche`),
              // et la recette quitte l'Atelier par son `visible_si`.
              if (resultat.porte) flags.set(resultat.porte);
              etatModifie = true;
              // `D-121` : une recette de station ne remplit pas la poche,
              // elle POSE quelque chose — donc elle enchaîne directement sur
              // le mode Construction, avec le fantôme de ce qu'on vient de
              // fabriquer. Si le joueur ressort sans poser, la station
              // existe quand même : elle l'attend dans la liste Construction.
              if (resultat.station) {
                poserStationFabriquee(resultat.station);
                return;
              }
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
  //
  // `D-118` : « combien de piles » devient « combien de SLOTS », et le calcul
  // sort d'ici — `inventory.js#slotsOccupes` est le seul à savoir qu'une pile
  // de douze branches en occupe trois. Le coffre, lui, ne compte plus ses
  // entrées : deux vérités de remplissage auraient fini par diverger.
  //
  // `D-121` (T5) : le contenu appartient à l'INSTANCE, pas au jeu. Un coffre
  // = un type + une pose + un contenu, et il y en aura cinq. L'entrée de
  // `save.maison.stations` est créée paresseusement, au premier dépôt : une
  // partie neuve n'a donc rien à déclarer, et un coffre jamais ouvert ne
  // laisse aucune trace dans la sauvegarde.
  // LIRE ne crée rien : une lecture qui écrivait posait une entrée sans pose
  // dans `maison.stations`, que `resoudreOverridesStations` prenait ensuite
  // pour une pose sauvegardée — et toutes les stations partaient en NaN. Un
  // accesseur de lecture doit être une lecture.
  function contenuDeStation(puzzleId) {
    const entree = save.maison.stations[puzzleId];
    return (entree && entree.contenu) || {};
  }

  // Ce que l'ÉCRAN montre d'un coffre : son contenu, sauf sous l'effet
  // `coffre_apparence_vide` (spec 11 §7.3), où il paraît vide. Seules la liste
  // des retraits et le compte de piles du sous-titre le lisent : les dépôts, eux,
  // vont au vrai contenu, et leurs refus se calculent sur lui — un coffre
  // vraiment plein refuse, même s'il paraît vide.
  function contenuAfficheDeStation(puzzleId) {
    return effetActif(effetsMonde, EFFET_COFFRE_APPARENCE_VIDE) ? {} : contenuDeStation(puzzleId);
  }

  function slotsCoffre(puzzle, station) {
    return slotsOccupes(contenuDeStation(puzzle.id), capaciteDeStation(station), obtenirItemDef);
  }

  // Déplace UNE unité d'un contenant vers un autre. Les deux contenants sont
  // donnés comme un couple lire/écrire plutôt que comme une clé de `save` :
  // depuis `D-121` une destination peut être n'importe quelle instance de
  // station, et il n'existe plus de chemin fixe où aller la chercher.
  function transfererUnite(source, destination, itemId, plafond) {
    const resultat = ajouterItem(destination.lire(), itemId, 1, plafond);
    if (resultat.ajoute < 1) return false;
    destination.ecrire(resultat.inventaire);
    source.ecrire(retirerItem(source.lire(), itemId, 1));
    etatModifie = true;
    return true;
  }

  const POCHE = {
    lire: () => save.inventaire.items,
    ecrire: (items) => { save.inventaire.items = items; },
  };
  function contenantStation(puzzleId) {
    return {
      lire: () => contenuDeStation(puzzleId),
      ecrire: (items) => {
        const entree = save.maison.stations[puzzleId] || (save.maison.stations[puzzleId] = {});
        entree.contenu = items;
      },
    };
  }

  function entreesCoffre(puzzle, station) {
    const coffre = contenantStation(puzzle.id);
    const entreesDepot = Object.entries(save.inventaire.items)
      .filter(([, qte]) => qte > 0)
      .map(([itemId, qte]) => {
        const itemDef = registre.obtenir('items', itemId);
        const capaciteCoffre = capaciteDeStation(station);
        const dansLeCoffre = coffre.lire()[itemId] || 0;
        // Un seul calcul dit les deux refus : le plafond de CET objet dans ce
        // coffre. S'il vaut ce qu'on a déjà, il n'y a plus de place — et la
        // raison dépend de qui la prend (une pile à elle seule, ou les
        // autres objets).
        const plafond = plafondPourItem(coffre.lire(), itemId, capaciteCoffre, obtenirItemDef);
        const coffrePlein = plafond <= dansLeCoffre && slotsCoffre(puzzle, station) >= capaciteCoffre.slots;
        const pilePleine = plafond <= dansLeCoffre && !coffrePlein;
        const refus = coffrePlein ? 'menu.fiche.coffre_plein' : pilePleine ? 'menu.fiche.pile_pleine' : null;
        return {
          texte: `${i18n.t('menu.coffre_deposer')} : ${i18n.t(itemDef.label_key)} × ${qte}`,
          groupe: i18n.t('menu.poche'),
          titre: i18n.t(itemDef.label_key), icone: itemDef.render.visuel, quantite: qte,
          lignes: [...lignesFicheItem(itemDef, registre, i18n), ...(refus ? [i18n.t(refus)] : [])],
          libelleAction: i18n.t('menu.coffre_deposer'),
          grisee: refus !== null,
          action: () => {
            // Le plafond se relit au moment d'agir : `grisee` n'est qu'un
            // indice, le résultat fait foi. `ajouterItem` refuse tout seul
            // au-delà du plafond, donc il n'y a plus de condition à écrire
            // ici — une de moins à faire diverger de l'affichage.
            transfererUnite(
              POCHE, coffre, itemId,
              plafondPourItem(coffre.lire(), itemId, capaciteDeStation(station), obtenirItemDef),
            );
            menu.rafraichirCoffre();
          },
        };
      });
    const entreesRetrait = Object.entries(contenuAfficheDeStation(puzzle.id))
      .filter(([, qte]) => qte > 0)
      .map(([itemId, qte]) => {
        const itemDef = registre.obtenir('items', itemId);
        const pilePleine = (save.inventaire.items[itemId] || 0) >= plafondPoche(itemId);
        return {
          texte: `${i18n.t('menu.coffre_retirer')} : ${i18n.t(itemDef.label_key)} × ${qte}`,
          groupe: i18n.t(station.label_key),
          titre: i18n.t(itemDef.label_key), icone: itemDef.render.visuel, quantite: qte,
          lignes: [...lignesFicheItem(itemDef, registre, i18n), ...(pilePleine ? [i18n.t('menu.fiche.pile_pleine')] : [])],
          libelleAction: i18n.t('menu.coffre_retirer'),
          grisee: pilePleine,
          action: () => {
            transfererUnite(coffre, POCHE, itemId, plafondPoche(itemId));
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
      .map((id) => scene.puzzle(id))
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
  // `D-126` : LE verdict de déplacement d'une station. La liste l'interroge
  // pour griser la tuile et dire pourquoi, `demarrerConstruction` pour
  // refuser — jamais deux calculs, qui finiraient par ne plus dire la même
  // chose (c'est exactement ce qui a produit ce défaut).
  function deplacementAutorise(puzzle) {
    return stationDeplacable(registre.obtenir('stations', puzzle.station_type), contenuDeStation(puzzle.id));
  }

  function entreesConstruction() {
    const structure = structureHeros();
    if (!structure) return [];
    return stationsPlacablesDeStructure(structure).map((p) => {
      const stationType = registre.obtenir('stations', p.station_type);
      const verdict = deplacementAutorise(p);
      // specs/08_menus-cartes.md, palier C6 : la tuile est la silhouette de la
      // station (celle du monde, recadrée par `icone_canvas.js#cadrer`). Les
      // lignes de la fiche — les touches du placement — sont ajoutées par
      // `ui/menu.js`, qui sait déjà les écrire pour le bandeau.
      return {
        texte: i18n.t(stationType.label_key),
        titre: i18n.t(stationType.label_key),
        icone: p.render.visuel,
        libelleAction: i18n.t('menu.fiche.deplacer'),
        // `D-126` : grisé est un INDICE, et la fiche dit la raison — même
        // patron que `D-122` côté craft. Sans la phrase, le joueur verrait une
        // tuile morte sans savoir que vider le coffre la réveille.
        grisee: !verdict.ok,
        lignes: verdict.ok ? [] : [i18n.t(`menu.fiche.refus_${verdict.raison}`)],
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

  // `D-121` (T5) : fabriquer une station la CRÉE, puis enchaîne sur son
  // placement.
  //
  // La pose de départ est la tuile du héros. Ce n'est pas un détail de
  // confort : n'importe quelle autre valeur (la position du modèle, un coin
  // de la pièce) ferait apparaître le fantôme ailleurs que là où le joueur
  // regarde, et il le chercherait. Si elle est invalide — elle l'est souvent,
  // le héros est contre l'Atelier —, le fantôme est simplement rouge, ce que
  // `poseValide` dit déjà : aucune règle nouvelle.
  function poserStationFabriquee(stationTypeId) {
    const structure = structureHeros();
    const modele = modeleDeStation(registre, stationTypeId);
    if (!structure || !modele) {
      // Hors d'une structure, il n'y a nulle part où poser (`Q-07` gelée) :
      // la recette n'aurait pas dû être atteignable. On ne perd rien pour
      // autant — on le dit, et la station n'est pas créée.
      console.warn(`[D-121] station "${stationTypeId}" fabriquée hors d'une structure : rien à poser`);
      menu.rafraichirCraft();
      return;
    }
    const id = idInstanceLibre(stationTypeId);
    save.maison.stations[id] = {
      type: stationTypeId,
      scene: scene.id,
      x: Math.floor(hero.x / scene.tileSize),
      y: Math.floor(hero.y / scene.tileSize),
      rotation: 0,
    };
    etatModifie = true;
    rechargerSceneApresConstruction();
    demarrerConstruction(scene.puzzle(id), structure);
  }

  // Un id d'instance qui n'est pris ni par le catalogue ni par la sauvegarde.
  // Numéroté, pas tiré au hasard : une sauvegarde se lit à l'œil, et
  // `station_type_coffre_2` dit tout de suite ce que c'est.
  function idInstanceLibre(stationTypeId) {
    for (let n = 2; ; n += 1) {
      const id = `${stationTypeId}_${n}`;
      if (!save.maison.stations[id] && !registre.existe('puzzles', id)) return id;
    }
  }

  function demarrerConstruction(puzzle, structure) {
    // `D-126` : la tuile est déjà grisée et la fiche dit pourquoi, mais c'est
    // le RÉSULTAT qui fait foi — même discipline qu'une recette grisée, dont
    // l'action est retentée pour de vrai plutôt que court-circuitée.
    if (!deplacementAutorise(puzzle).ok) return;
    // `D-126` : la pose passe par LE lecteur. Le repli « entrée absente » ne
    // suffisait pas : un coffre qu'on a rempli sans jamais le déplacer A une
    // entrée, mais pas de coordonnées — le fantôme naissait à `undefined`.
    const poseActuelle = poseSauvegardeeDeStation(save.maison.stations[puzzle.id]) || {
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
    scene = chargerScene(
      registre, scene.id, resoudreOverridesStations(scene.id),
      instancesCreees(registre, scene.id, save.maison.stations),
    );
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
    // `D-126` : on ENRICHIT l'entrée, on ne la refabrique pas (`D-71`). Une
    // affectation écrasait la fiche par la seule pose : le contenu d'un coffre
    // plein disparaissait, et un coffre FABRIQUÉ perdait son `type` et sa
    // `scene` — donc `instancesCreees` ne le rendait plus, et il s'effaçait du
    // monde au rechargement avec ce qu'il portait.
    const entree = save.maison.stations[construction.puzzle.id]
      || (save.maison.stations[construction.puzzle.id] = {});
    Object.assign(entree, construction.pose);
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
      } else if (DIALOGUE_REFUS_CONSTRUCTION[construction.verdict.raison]) {
        ouvrirDialogueCatalogue(DIALOGUE_REFUS_CONSTRUCTION[construction.verdict.raison]);
      } else {
        // `D-126` : `pose_invalide` n'est pas une situation de jeu, c'est une
        // faute de code. On la JOURNALISE ; la raconter au follet ferait
        // passer un bug pour une règle, et `ouvrirDialogueCatalogue(undefined)` lèverait
        // dans la boucle.
        console.warn(`main.js#traiterConstruction : refus sans dialogue (${construction.verdict.raison})`);
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
    // `D-66` (T5) : l'ARME équipée est la 3ᵉ source de modificateurs, après le
    // compagnon et les buffs — et elle emprunte exactement leur forme,
    // `{ statId: delta }`. Le calcul des stats n'apprend rien : il additionne
    // une source de plus. Décision de Xav du 21/09 : l'épée en bois donne
    // Force +1, et ce +1 vit sur l'ARME, jamais dans une stat ni une
    // constante (même discipline que la portée, décision verrouillée).
    const arme = resoudreArmeEquipee(registre, save.hero.equipement.arme);
    for (const source of [
      // `specs/10` §4.2 : la synergie sous le régime d'alignement COURANT,
      // relu à chaque appel — un changement en plein combat n'a aucune
      // transition à coder.
      modificateursHeros(registre, save.hero.companion, etatAlignement(), { auraOccupee }),
      modificateursBuffsActifs(registre, save.hero.buffs_actifs),
      (arme && arme.modificateurs) || {},
    ]) {
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
  function valeurDeriveeAffichee(derivee, valeur) {
    if (derivee.affichage === 'pourcentage') return i18n.t('derivee.format_pourcentage', { n: Math.round(valeur * 100) });
    return `${Math.round(valeur)}`;
  }

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
        // Spec 14, palier G : une dérivée peut attendre un flag (`visible_si`,
        // `D-62` : la puissance des compétences ne s'annonce pas avant la
        // première) et s'écrire en pourcentage (`affichage`).
        lignes: registre.tous('stats_derivees')
          .filter((d) => d.stat === s.id && estVisible(d, flags))
          .map((d) => `${i18n.t(d.label_key)} : ${valeurDeriveeAffichee(d, statsDerivees[d.id])}`),
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

  // Les Indices du menu (`indices.js`) : un indice illisible (sa `lisible_si`
  // n'est pas tenue — le Nv.15 pour le premier) s'écrit en hiéroglyphes. Les
  // conditions passent par LE registre de flags, relu à chaque affichage :
  // l'indice devient lisible à l'instant où le héros monte de niveau.
  function obtenirEntreesIndices() {
    const catalogue = registre.tous('indices');
    const config = catalogue.find((e) => e.id === 'indices_config');
    return entreesIndices(catalogue.filter((e) => e !== config), {
      estVisible: (indice) => estVisible(indice, flags),
      estLisible: (condition) => flags.evaluate(condition),
      traduire: (cle) => i18n.t(cle),
      hieroglyphes: config ? config.hieroglyphes : '',
      dechiffrement: dechiffrement
        ? { indiceId: dechiffrement.indiceId, progression: progressionDechiffrement(dechiffrement, configIndices) }
        : null,
    });
  }

  // Spec 14, §4.1 : le carnet (l'écran Indices) s'OUVRE. Un indice qui
  // déclare un `dechiffrement` dont la condition tient (au pied de sa pierre,
  // au bon niveau) se déchiffre : son flag est posé tout de suite — c'est lui
  // que lit `lisible_si`, et la stèle avec —, et l'animation commence.
  // Appelé par le menu à l'ouverture de l'écran, avant qu'il ne lise ses
  // entrées, jamais par la lecture des entrées elle-même (qui se refait à
  // chaque rafraîchissement).
  function ouvrirCarnet() {
    if (dechiffrement) return;
    for (const indice of registre.tous('indices')) {
      const d = indice.dechiffrement;
      if (!d || flags.has(d.flag) || !flags.evaluate(d.condition)) continue;
      flags.set(d.flag);
      dechiffrement = creerDechiffrement(indice.id);
      return;
    }
  }

  // Le déchiffrement avance, carnet ouvert. Rend VRAI si le texte affiché a
  // changé (l'écran est à relire), faux sinon — un écran DOM ne se refait
  // pas à chaque frame pour rien.
  function avancerDechiffrementCarnet(deltaMs, accelerer) {
    const avant = progressionDechiffrement(dechiffrement, configIndices);
    if (accelerer) dechiffrement = accelererDechiffrement(dechiffrement);
    dechiffrement = avancerDechiffrement(dechiffrement, deltaMs, configIndices);
    const apres = progressionDechiffrement(dechiffrement, configIndices);
    if (apres >= 1) dechiffrement = null;
    return apres !== avant;
  }

  // Ce que la vue de la stèle dessine : les lignes de SON indice. Tant que
  // l'indice ne se lit pas, brouillées par le même point que l'écran Indices
  // (`indices.js#lignesBrouillees`) : les mêmes signes. Déchiffré (spec 14),
  // la gravure se lit en clair, comme le carnet.
  // `actions` : ce que la vue propose, au glyphe du périphérique actif —
  // Descendre n'existe que sur une stèle qui déclare sa descente, une fois
  // son flag posé (`descente.js#descenteDisponible`).
  function contenuVueStele() {
    const puzzle = scene.puzzle(vueStele.puzzleId);
    const indice = registre.obtenir('indices', puzzle.indice);
    const lisible = indice.lisible_si === undefined || flags.evaluate(indice.lisible_si);
    return {
      id: puzzle.id,
      couleur: puzzle.couleur,
      lignes: lisible
        ? indice.lignes.map((cle) => i18n.t(cle))
        : lignesBrouillees(indice, (cle) => i18n.t(cle), configIndices.hieroglyphes),
      actions: descenteDisponible(puzzle, flags.has) ? actionsVueStele() : [],
      vue: vueStele,
      alpha: alphaVueStele(vueStele),
    };
  }

  // Les verbes de la vue d'une stèle qui descend : A (ou INTERACT, qui l'a
  // ouverte) descend, B ferme. À l'écran, UN glyphe par action : A à la
  // manette (la confirmation de toujours), E au clavier (la touche qui a
  // ouvert la pierre). Au doigt, les boutons du jeu sont sous la vue : la
  // gravure se touche pour descendre, le reste de l'écran pour fermer.
  function actionsVueStele() {
    const peripherique = input.peripheriqueActif ? input.peripheriqueActif() : 'manette';
    if (peripherique === 'tactile') {
      return [
        { glyphe: null, texte: i18n.t('stele.action.tactile_descendre') },
        { glyphe: null, texte: i18n.t('stele.action.tactile_fermer') },
      ];
    }
    const verbeDescendre = peripherique === 'clavier' ? 'interact' : 'attack';
    return [
      { glyphe: i18n.t(`glyphe.${peripherique}.${verbeDescendre}`), texte: i18n.t('stele.action.descendre') },
      { glyphe: i18n.t(`glyphe.${peripherique}.skill_3`), texte: i18n.t('stele.action.fermer') },
    ];
  }

  // Spec 14, §4.6 : ouvrir le coffre, c'est prendre le parchemin — la
  // compétence est apprise À L'OUVERTURE (son flag, persistant), pas à la
  // fermeture de la vue : quitter le jeu pendant la lecture ne la reprend pas.
  // L'emplacement qu'elle occupe apparaît avec ce flag (`action_slots.json`).
  function ouvrirCoffreParchemin(puzzle) {
    const competence = registre.obtenir('skills', puzzle.competence);
    flags.set(competence.flag);
    etatModifie = true;
    vueParchemin = { vue: creerVueStele(puzzle.id), puzzleId: puzzle.id, competenceId: competence.id, ecritureMs: 0 };
  }

  // Le texte du parchemin : le nom de la compétence, ce qu'elle fait, et le
  // bouton qui la lance, au glyphe du périphérique ACTIF — relu à chaque
  // frame, comme la vue de la stèle : changer de manette au clavier pendant
  // la lecture change le bouton écrit.
  function lignesParchemin(competenceId) {
    const competence = registre.obtenir('skills', competenceId);
    const verbe = registre.obtenir('action_slots', competence.emplacement).verb;
    const peripherique = input.peripheriqueActif ? input.peripheriqueActif() : 'manette';
    return [
      i18n.t(competence.label_key),
      i18n.t(competence.description_key),
      i18n.t('parchemin.bouton', { glyphe: i18n.t(`glyphe.${peripherique}.${verbe}`) }),
    ];
  }

  // `lignes` : ce que la plume a écrit jusqu'ici ; `lignesCompletes` : le texte
  // entier, pour que la mise en page ne bouge pas pendant l'écriture. L'action
  // Fermer n'apparaît qu'une fois tout écrit : avant, B achève l'écriture.
  function contenuVueParchemin() {
    const competence = registre.obtenir('skills', vueParchemin.competenceId);
    const lignes = lignesParchemin(vueParchemin.competenceId);
    const peripherique = input.peripheriqueActif ? input.peripheriqueActif() : 'manette';
    let actions = [];
    if (ecritureFinie(lignes, vueParchemin.ecritureMs)) {
      actions = peripherique === 'tactile'
        ? [{ glyphe: null, texte: i18n.t('parchemin.action.tactile_fermer') }]
        : [{ glyphe: i18n.t(`glyphe.${peripherique}.skill_3`), texte: i18n.t('parchemin.action.fermer') }];
    }
    return {
      id: vueParchemin.puzzleId,
      lignes: lignesEcrites(lignes, vueParchemin.ecritureMs),
      lignesCompletes: lignes,
      icone: registre.obtenir('visuels', competence.icone),
      couleur: competence.effet.couleur,
      actions,
      vue: vueParchemin.vue,
      alpha: alphaVueStele(vueParchemin.vue),
    };
  }

  // Spec 14, §4.2 : une descente commence. L'état de la précédente (les flags
  // que déclarent les salles de la descente) est remis à zéro, en ce seul
  // endroit, puis le héros entre au point d'arrivée de la première salle.
  function commencerDescente(descente) {
    const scenes = registre.tous('scenes');
    flags.retirer(flagsDeLaDescente(scenes, descente.scene));
    // Les leviers de la descente reprennent leur état de départ (§4.2) : leur
    // état vit dans `save.puzzles`, que l'entrée en scène relit juste après.
    const initial = etatInitialPuzzles(registre);
    for (const id of interactifsDeLaDescente(scenes, descente.scene)) {
      if (initial[id]) save.puzzles[id] = initial[id];
      else delete save.puzzles[id];
      basculesLeviers.delete(id);
    }
    entrerDansScene(descente.scene);
    etatModifie = true;
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
  // `itemId` (`D-08`, défaut : le consommable équipé) : la Poche mange un
  // objet précis, le verbe CONSUME mange celui de la case. UN seul chemin de
  // consommation pour les deux — jauges, retrait, buffs —, jamais un second
  // qui oublierait les buffs. Rend vrai si quelque chose a été mangé.
  // --- `D-145` : jeter un objet de la Poche ----------------------------------
  // La liste vit dans `save.monde.objets_jetes[sceneId]`, et son ABSENCE est
  // une valeur (aucun objet jeté) : une sauvegarde d'avant ce ticket est donc
  // valide telle quelle, sans migration ni changement de `schema_version` —
  // même patron que `settings.graphismes` (`D-111`).
  // `specs/15` palier C : les objets PLANTÉS (la torche), à part des jetés —
  // ils ont un temps qui brûle, une lumière, et ne comptent pas dans la pile
  // d'une tuile. Champ absent = rien de planté (précédent `D-145`).
  function objetsPlantesDeLaScene() {
    return (save.monde.objets_plantes && save.monde.objets_plantes[scene.id]) || [];
  }
  function ecrireObjetsPlantesDeLaScene(liste) {
    if (!save.monde.objets_plantes) save.monde.objets_plantes = {};
    save.monde.objets_plantes[scene.id] = liste;
  }
  // Planter : l'objet quitte la poche avec son temps (on plante la torche
  // qu'on tenait, si elle était entamée) et se pose au centre de la tuile du
  // héros. Pas de refus « plus de place ici » : un objet planté ne s'empile
  // pas sur le sol, il s'y dresse.
  // `specs/15` palier D : la position est-elle dans la lumière d'un objet
  // planté qui PROTÈGE (`plantable.protege`) et qui brûle en ce moment ? Les
  // monstres n'y entrent pas et n'y naissent pas — c'est une zone sûre de
  // plus, mesurée en pixels, jamais un second mécanisme.
  function dansLumiereProtectrice(x, y) {
    const phase = phaseDuCycle();
    if (!phase) return false;
    return objetsPlantesDeLaScene().some((p) => {
      const item = registre.obtenir('items', p.item);
      return item.plantable.protege && brule(item, phase)
        && Math.hypot(x - p.x, y - p.y) < item.combustion.lumiere.rayon;
    });
  }

  function essayerPlanter(itemId) {
    if (!scene || !itemId || (save.inventaire.items[itemId] || 0) <= 0) return false;
    const itemDef = registre.obtenir('items', itemId);
    if (!itemDef.plantable) return false;
    let restantMs = null;
    if (itemDef.combustion) {
      const pris = prendre(entamees(save.inventaire.combustion, itemId), itemDef.combustion.duree_ms);
      restantMs = pris.restantMs;
      save.inventaire.combustion = { ...(save.inventaire.combustion || {}), [itemId]: pris.liste };
      if (pris.liste.length === 0) delete save.inventaire.combustion[itemId];
    }
    const { tx, ty } = tuileDuHeros();
    save.inventaire.items = retirerItem(save.inventaire.items, itemId, 1);
    ecrireObjetsPlantesDeLaScene([...objetsPlantesDeLaScene(), {
      item: itemId, x: (tx + 0.5) * scene.tileSize, y: (ty + 0.5) * scene.tileSize,
      ...(restantMs !== null ? { restant_ms: restantMs } : {}),
    }]);
    etatModifie = true;
    return true;
  }

  function objetsJetesDeLaScene() {
    return (save.monde.objets_jetes && save.monde.objets_jetes[scene.id]) || [];
  }
  function ecrireObjetsJetesDeLaScene(liste) {
    if (!save.monde.objets_jetes) save.monde.objets_jetes = {};
    save.monde.objets_jetes[scene.id] = liste;
  }
  function tuileDuHeros() {
    return { tx: Math.floor(hero.x / scene.tileSize), ty: Math.floor(hero.y / scene.tileSize) };
  }
  // La tuile du héros est-elle pleine ? Semés et jetés comptent ensemble : le
  // joueur voit une pile, il ne sait pas d'où vient chaque objet.
  function solPleinSousHeros() {
    if (!scene) return false;
    const { tx, ty } = tuileDuHeros();
    const capacite = resoudreCapacite(registre.obtenir('conteneurs', ID_CONTENEUR_SOL)).slots;
    return compterObjetsSurTuile(itemsSol, objetsJetesDeLaScene(), tx, ty, scene.tileSize) >= capacite;
  }
  // UN exemplaire, posé sous le héros — l'objet n'est jamais détruit. Tuile
  // pleine : rien ne bouge, et ça se DIT (un texte au-dessus du héros, et la
  // fiche de la Poche l'annonce déjà avant l'essai, cf. `solPleinSousHeros`).
  // Un objet équipé qu'on jette quitte sa case tout seul : c'est la
  // revalidation de chaque frame qui s'en charge (`D-92`), rien à faire ici.
  function essayerJeter(itemId) {
    if (!scene || !itemId || (save.inventaire.items[itemId] || 0) <= 0) return false;
    if (solPleinSousHeros()) {
      signalerRefusConteneur(CLE_TEXTE_PLUS_DE_PLACE, hero.x, hero.y);
      return false;
    }
    const { tx, ty } = tuileDuHeros();
    save.inventaire.items = retirerItem(save.inventaire.items, itemId, 1);
    ecrireObjetsJetesDeLaScene(poserObjetJete(objetsJetesDeLaScene(), itemId, tx, ty, scene.tileSize));
    etatModifie = true;
    return true;
  }

  function essayerConsommer(itemId = save.hero.equipement.consommable) {
    if (!itemId || (save.inventaire.items[itemId] || 0) <= 0) return false;
    const itemDef = registre.obtenir('items', itemId);
    const c = itemDef.consommation;
    if (!c) return false;
    save.survie = consommerSurvie(save.survie, { jauge_faim: c.faim || 0, jauge_soif: c.soif || 0 });
    save.inventaire.items = retirerItem(save.inventaire.items, itemId, 1);
    for (const effetId of c.effets || []) {
      save.hero.buffs_actifs = ajouterBuffActif(registre, save.hero.buffs_actifs, effetId);
    }
    etatModifie = true;
    return true;
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
  // de cet endroit. Le combat ne la passe pas encore ; le jour
  // où il le fera (position du monstre), il n'y aura rien à écrire ici. Le
  // craft la passe depuis le 24/09 : le centre de la station.
  function crediterXpHeros(xpGagne, position = null) {
    if (!xpGagne) return;
    if (position) signalerGainXp(xpGagne, position.x, position.y);
    appliquerXpHeros(xpGagne);
  }

  // L'écriture elle-même, partagée par un gain (ci-dessus) et par le
  // rattrapage du chargement (0 XP : seuls les niveaux dus sont crédités,
  // `xp.js#crediter`). Rend la liste des niveaux franchis.
  function appliquerXpHeros(xpGagne) {
    const resultat = crediterXp(
      { xp: save.hero.xp, niveau: save.hero.niveau, pointsStatsLibres: save.hero.points_stats_libres },
      xpGagne,
      registre.tous('levels')
    );
    save.hero.xp = resultat.xp;
    save.hero.niveau = resultat.niveau;
    save.hero.points_stats_libres = resultat.pointsStatsLibres;
    for (const n of resultat.niveauxFranchis) flags.set(flagDeNiveau(n));
    if (xpGagne > 0 || resultat.niveauxFranchis.length) etatModifie = true;
    return resultat.niveauxFranchis;
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
      ouvrirDialogueCatalogue('dlg_grotte_eclats');
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
    // `D-65` : les yeux se rouvrent. Remis à zéro à CHAQUE mort, jamais
    // cumulé — deux morts rapprochées rejouent la séquence depuis le début
    // plutôt que de la prolonger.
    clignementRespawnMs = 0;
  }

  // Stats effectives du héros : calculées à chaque frame, y compris quand
  // une UI est ouverte (le HUD doit afficher des PV corrects dès la
  // cinématique d'ouverture, avant même le choix du follet) — seule la
  // progression du combat lui-même est gelée sous UI, pas ce calcul.
  function calculerStatsHeros() {
    const statsBrutes = calculerStatsPrimaires(registre, resoudreModificateursHeros());
    // Modulateur de survie (Palier C §3.3) : appliqué ICI, avant les
    // dérivées — un seul chemin de calcul, donc dégâts (stat_force),
    // cadence d'attaque et vitesse de déplacement (stat_agilite), toutes
    // trois dérivées depuis `D-141`, suivent sans code dédié.
    const modulateur = calculerModulateurSurvie(registre, save.survie);
    const statsPrimaires = appliquerModulateurSurvie(statsBrutes, modulateur, configSurvie(registre).stats_modulees);
    // `specs/10` §4.3 : Eau négatif module des DÉRIVÉES (vitesse, cadence) sans
    // toucher une stat. Appliqué ici, après la formule de `D-141` — la source
    // des modificateurs s'enrichit, la résolution des dérivées ne change pas.
    const statsDerivees = appliquerModificateursDerivees(
      calculerStatsDerivees(registre, statsPrimaires),
      modificateursDeriveesHeros(registre, save.hero.companion, etatAlignement(), { auraOccupee }),
    );
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
      estEnZoneSure: (x, y) => estEnZoneSurePx(scene, x, y) || dansLumiereProtectrice(x, y),
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
    const rayon = RAYON_MONSTRE_PX;
    const boite = { x: monstre.x - rayon, y: monstre.y - rayon, largeur: rayon * 2, hauteur: rayon * 2 };
    const resolu = resoudreDeplacement(scene, boite, vise.x - monstre.x, vise.y - monstre.y, flags.has);
    suivant.x = resolu.x + rayon;
    suivant.y = resolu.y + rayon;
    suivant.distanceParcouruePx = Math.hypot(suivant.x - monstre.x, suivant.y - monstre.y);
    return suivant;
  }

  // Le TIREUR (spec 14, §4.3) : `comportement_monstres.js#deciderTireur` dit
  // où aller et s'il faut tirer ; le mouvement se fait ici avec les
  // collisions (il recule, et ne doit pas reculer dans un mur), le tir part
  // dans `projectiles.js`. Les dégâts du tir sont la force EFFECTIVE du
  // monstre, celle de son corps à corps (l'aura du follet comprise) : une
  // seule force par monstre.
  function deplacerTireur(monstre, donneesEnnemi, force, vitesse, deltaS, deltaMs) {
    const attaque = donneesEnnemi.attaque_distance;
    const suivant = { ...monstre, cooldownTirMs: tickCooldown(monstre.cooldownTirMs || 0, deltaMs) };
    const decision = deciderTireur({ monstre, hero, attaque, tileSize: scene.tileSize, cooldownTirMs: suivant.cooldownTirMs });
    if (decision.tirer && tirerVersLeHeros(monstre, attaque, force)) suivant.cooldownTirMs = attaque.cadence_ms;
    if (!decision.but) return suivant;
    const vise = approcherEnLigneDroite(monstre, decision.but.x, decision.but.y, vitesse, deltaS);
    return { ...suivant, ...pasAvecCollisions(monstre, vise) };
  }

  // Le tir d'un monstre vers le héros : un projectile, ou une SALVE en éventail
  // si son attaque en déclare une (§4.5). Rend vrai si au moins un tir est
  // parti — la cadence ne repart qu'alors, comme avant la salve.
  function tirerVersLeHeros(monstre, attaque, force) {
    let parti = false;
    for (const visee of viseesSalve(monstre.x, monstre.y, hero.x, hero.y, attaque.salve)) {
      parti = tirerProjectile(projectiles, {
        x: monstre.x,
        y: monstre.y,
        versX: visee.x,
        versY: visee.y,
        vitesse: attaque.vitesse_px_s,
        rayon: attaque.rayon_px,
        degats: force,
        camp: CAMP_MONSTRES,
        visuel: attaque.visuel,
        courseMaxPx: attaque.course_tuiles * scene.tileSize,
      }) || parti;
    }
    return parti;
  }

  // Le pas VOULU d'un monstre (`vise`), rendu au mur : la boîte du monstre
  // glisse comme celle du héros. Rend la position résolue et ce qu'il a
  // réellement parcouru (ce que l'anti-blocage de l'errance observe).
  function pasAvecCollisions(monstre, vise) {
    const rayon = RAYON_MONSTRE_PX;
    const boite = { x: monstre.x - rayon, y: monstre.y - rayon, largeur: rayon * 2, hauteur: rayon * 2 };
    const resolu = resoudreDeplacement(scene, boite, vise.x - monstre.x, vise.y - monstre.y, flags.has);
    const x = resolu.x + rayon;
    const y = resolu.y + rayon;
    return { x, y, distanceParcouruePx: Math.hypot(x - monstre.x, y - monstre.y) };
  }

  // La barre du boss (§4.5) : le premier monstre vivant de la salle dont
  // l'entrée déclare `boss`. Son nom se lit ici, pas dans `ui/hud.js`.
  function barreDuBoss() {
    for (const m of monstres) {
      if (m.mort) continue;
      const donnees = registre.obtenir('enemies', m.enemyId);
      if (!donnees.boss) continue;
      return { nom: i18n.t(donnees.label_key), ratio: m.pvMax > 0 ? m.pv / m.pvMax : 0 };
    }
    return null;
  }

  // Le BOSS (spec 14, §4.5) : `comportement_monstres.js#deciderBoss` tire son
  // mode au sort et dit où aller et s'il faut tirer ; le pas et le tir se font
  // ici, par les mêmes chemins que le tireur. Son corps à corps est celui de
  // tout monstre (plus bas, à `portee_attaque`). En mode agressif, il s'arrête
  // au contact (`distance_contact_px`), comme Zéros. Le hasard n'a pas de
  // graine : un boss qui rejouerait la même danse à chaque essai se réciterait.
  function deplacerBoss(monstre, donneesEnnemi, force, vitesse, deltaS, deltaMs) {
    const attaque = donneesEnnemi.attaque_distance;
    const cooldownTirMs = tickCooldown(monstre.cooldownTirMs || 0, deltaMs);
    const decision = deciderBoss(monstre.modeBoss || creerEtatBoss(), {
      deltaMs,
      monstre,
      hero,
      tileSize: scene.tileSize,
      modes: donneesEnnemi.modes,
      dureeModeMs: donneesEnnemi.duree_mode_ms,
      attaque,
      cooldownTirMs,
      distanceParcouruePx: monstre.distanceParcouruePx || 0,
      alea: Math.random,
      tirerPoint: pointLibreDeLaSalle,
    });
    const suivant = { ...monstre, modeBoss: decision.etat, cooldownTirMs };
    if (decision.tirer && tirerVersLeHeros(monstre, attaque, force)) suivant.cooldownTirMs = attaque.cadence_ms;
    if (!decision.but) return { ...suivant, distanceParcouruePx: 0 };
    const vise = approcherEnLigneDroite(
      monstre, decision.but.x, decision.but.y, vitesse * decision.facteurVitesse, deltaS, donneesEnnemi.distance_contact_px || 0,
    );
    return { ...suivant, ...pasAvecCollisions(monstre, vise) };
  }

  // Un point libre de la salle, au centre d'une case qui n'est pas un mur ;
  // null après quelques essais malheureux (l'errance réessaiera à la frame
  // suivante). Les bords sont exclus : ce sont les murs de toute salle.
  function pointLibreDeLaSalle() {
    for (let essai = 0; essai < 8; essai += 1) {
      const x = (1 + Math.floor(Math.random() * (scene.width - 2)) + 0.5) * scene.tileSize;
      const y = (1 + Math.floor(Math.random() * (scene.height - 2)) + 0.5) * scene.tileSize;
      if (!scene.estSolideAuPoint(x, y, flags.has)) return { x, y };
    }
    return null;
  }

  // Les tirs en vol avancent ; ceux qui touchent le héros lui retirent ses PV,
  // comme un coup au corps à corps (même `hero.pv`, donc même mort plus bas).
  // Le héros est la seule cible du camp adverse à ce palier : le tir du joueur
  // (palier G) ajoutera les monstres à la liste, sans un second chemin.
  function avancerTirs(deltaMs) {
    // Palier G : les monstres vivants sont des cibles, pour les tirs du HÉROS
    // (le camp fait le tri : un crachat traverse les monstres). Un intouchable
    // n'en est pas une — le tir le traverse, comme l'auto-attaque l'ignore.
    const cibles = [{ id: CIBLE_HEROS, x: hero.x, y: hero.y, rayon: hero.rayon, camp: CAMP_HEROS }];
    for (const m of monstres) {
      if (!m.mort && !m.intouchable) cibles.push({ id: m.id, x: m.x, y: m.y, rayon: RAYON_MONSTRE_PX, camp: CAMP_MONSTRES });
    }
    const touches = avancerProjectiles(projectiles, deltaMs, {
      estSolide: (x, y) => scene.estSolideAuPoint(x, y, flags.has),
      cibles,
      surEclat: (eclat) => ondes.push({
        x: eclat.x, y: eclat.y, rayon: eclat.rayon, couleur: eclat.etiquette && eclat.etiquette.couleur, ms: 0,
      }),
    });
    const degatsParMonstre = new Map();
    for (const touche of touches) {
      if (touche.cibleId === CIBLE_HEROS) hero.pv = Math.max(0, hero.pv - touche.degats);
      else degatsParMonstre.set(touche.cibleId, (degatsParMonstre.get(touche.cibleId) || 0) + touche.degats);
    }
    if (degatsParMonstre.size > 0) {
      monstres = monstres.map((monstre) => {
        const degats = degatsParMonstre.get(monstre.id);
        if (!degats || monstre.mort) return monstre;
        const suivant = infligerDegats(monstre, degats);
        if (suivant.pv < monstre.pv) suivant.flashMs = FLASH_TOUCHE_MS;
        if (suivant.mort) onMonstreMort(registre.obtenir('enemies', monstre.enemyId));
        return suivant;
      });
    }
    ondes = ondes.map((o) => ({ ...o, ms: o.ms + deltaMs })).filter((o) => o.ms < DUREE_ONDE_MS);
  }

  // Spec 14, §4.6 : les compétences APPRISES, et le verbe de l'emplacement où
  // chacune se range. Aujourd'hui, l'emplacement par défaut de son entrée
  // (`emplacement`) ; le palier I y mettra le choix du joueur
  // (`save.hero.competences`) — ce point, et lui seul, changera.
  function competencesEquipees() {
    return registre.tous('skills')
      .filter((c) => flags.has(c.flag))
      .map((c) => ({ competence: c, verbe: registre.obtenir('action_slots', c.emplacement).verb }));
  }

  // Une frame de jeu des compétences : la charge monte (le follet engage), la
  // recharge descend, et l'appui sur le verbe de l'emplacement lance ce qui
  // est prêt. Prête sans rien à viser, l'appui est REFUSÉ et le dit ; la charge
  // est gardée. Pas prête, l'appui ne fait rien : la jauge le montre déjà.
  function majCompetences(deltaMs, etatGameplay, statsDerivees) {
    const ratios = {};
    for (const { competence, verbe } of competencesEquipees()) {
      const durees = dureesCompetence(competence, statsDerivees);
      let etat = avancerCompetence(etatsCompetences.get(competence.id) || creerEtatCompetence(), deltaMs, {
        active: chargeActive(competence, { follet }),
        durees,
      });
      if (etatGameplay[verbe] && etatGameplay[verbe].pressed && competencePrete(etat, durees)) {
        if (lancerCompetenceVers(competence, statsDerivees)) etat = lancerCompetence(etat, durees);
        else signalerRefusConteneur(CLE_TEXTE_AUCUNE_CIBLE, hero.x, hero.y);
      }
      etatsCompetences.set(competence.id, etat);
      ratios[verbe] = ratiosCompetence(etat, durees);
    }
    ratiosEmplacements = ratios;
  }

  // Le tir d'une compétence : vers sa cible (`competences.js#choisirCible`),
  // avec les dégâts de SON point de résolution, par le seul chemin de tir du
  // jeu. Rend vrai si le tir est parti.
  function lancerCompetenceVers(competence, statsDerivees) {
    const porteePx = competence.portee_tuiles * scene.tileSize;
    const cible = choisirCible({
      follet,
      hero,
      porteePx,
      monstres: monstres.map((m) => ({ id: m.id, x: m.x, y: m.y, mort: m.mort, visable: !m.intouchable })),
    });
    if (!cible) return false;
    return tirerProjectile(projectiles, {
      x: hero.x,
      y: hero.y,
      versX: cible.x,
      versY: cible.y,
      vitesse: competence.projectile.vitesse_px_s,
      rayon: competence.projectile.rayon_px,
      degats: resoudreDegats(competence, statsDerivees),
      camp: CAMP_HEROS,
      visuel: competence.projectile.visuel,
      courseMaxPx: porteePx,
      zonePx: competence.effet.rayon_px,
      etiquette: { couleur: competence.effet.couleur },
    });
  }

  // La SALLE NETTOYÉE (spec 14, §4.3) : une scène qui déclare `nettoyage`
  // pose son flag quand le dernier monstre de ses spawns tombe. Règle
  // générique, lue sur les données de la scène : une Annexe 2 s'en sert
  // sans une ligne ici.
  function verifierNettoyage() {
    const nettoyage = registre.obtenir('scenes', scene.id).nettoyage;
    if (!nettoyage || flags.has(nettoyage.flag)) return;
    if (sceneNettoyee(monstres)) flags.set(nettoyage.flag);
  }

  // Le follet de Zéros (spec 14, §4.3) : il tourne autour du monstre que son
  // entrée nomme (`orbite.autour`), avec la loi d'orbite de notre follet
  // (`companion.js#avancerOrbiteAutour`) et SES nombres. Il vole : aucun mur ne
  // l'arrête, comme le nôtre. Sans centre vivant, il reste où il est.
  function deplacerEnOrbite(monstre, donneesEnnemi, deltaS) {
    const { autour, rayon_px: rayonPx, vitesse_rad_s: vitesseRadS } = donneesEnnemi.orbite;
    const centre = monstres.find((m) => !m.mort && m.enemyId === autour);
    if (!centre) return { ...monstre };
    return avancerOrbiteAutour(monstre, centre, { rayonPx, vitesseRadS }, deltaS);
  }

  // Spec 14, palier D : la RENCONTRE de la scène, si elle en déclare une
  // (`scenes.json > rencontre`). Ce script ne sait pas que c'est Zéros : ses
  // monstres, sa cible, son seuil, ses dialogues et ses flags vivent dans ses
  // données, `rencontre.js` dit où elle en est. Appelée après le combat, dans
  // le temps de jeu : gelée sous UI, donc sous ses propres dialogues.
  function majRencontre(deltaMs) {
    const def = registre.obtenir('scenes', scene.id).rencontre;
    if (!def) return;
    const decision = deciderRencontre(def, { evaluer: (c) => flags.evaluate(c), has: flags.has, enCours: rencontre !== null });
    // Les descentes suivantes (`Q-142`) : la rencontre a déjà eu lieu, ce
    // qu'elle ouvrait s'ouvre tout de suite.
    if (decision === 'raccourci') {
      for (const f of def.flags_fin) flags.set(f);
      return;
    }
    if (decision === 'demarrer') {
      demarrerRencontre(def);
      return;
    }
    if (!rencontre) return;
    const { etat, evenement } = avancerRencontre(rencontre.etat, deltaMs, def.fondu_ms);
    rencontre.etat = etat;
    if (evenement === 'combat' && def.dialogue_debut) ouvrirDialogueCatalogue(def.dialogue_debut);
    if (evenement === 'efface') terminerRencontre(def);
    // La cible au seuil : tout se fige (le dialogue gèle le jeu), le dialogue
    // de fin parle ; fermé, l'effacement commence.
    if (etat.phase === 'combat' && cibleAuSeuil(monstres, def.cible)) {
      rencontre.etat = passerALaFin(etat);
      ouvrirDialogueCatalogue(def.dialogue, {
        onFermer: () => {
          if (rencontre) rencontre.etat = passerALEffacement(rencontre.etat);
        },
      });
    }
  }

  // Les monstres de la rencontre naissent à leur place, marqués (`rencontre`) :
  // `sceneNettoyee` ne les compte pas, la boucle les tient inertes hors
  // combat, le dessin les fond. La cible reçoit son plancher de PV : elle
  // s'arrête au seuil, elle ne meurt pas (`entities.js#infligerDegats`).
  function demarrerRencontre(def) {
    rencontre = { def, etat: creerEtatRencontre() };
    const nes = def.monstres.map((m) => {
      compteurMonstresNes += 1;
      const monstre = creerMonstre(registre.obtenir('enemies', m.enemy), {
        x: (m.position.x + 0.5) * scene.tileSize,
        y: (m.position.y + 0.5) * scene.tileSize,
        id: `${m.enemy}#${compteurMonstresNes}`,
      });
      monstre.rencontre = true;
      if (m.enemy === def.cible) monstre.pvPlancher = plancherCible(monstre.pvMax, def.seuil_fin);
      return monstre;
    });
    monstres = [...monstres, ...nes];
  }

  // L'effacement fini : ses monstres partent, son flag (une seule fois) et ses
  // flags de fin (le passage) sont posés — la sauvegarde suit par `onUnlock`.
  function terminerRencontre(def) {
    monstres = monstres.filter((m) => !m.rencontre);
    flags.set(def.flag_rencontre);
    for (const f of def.flags_fin) flags.set(f);
  }

  // --- Spec 14, §4.4 : les deux mains ------------------------------------
  // Le levier tenu allumé le plus proche du héros, à SA portée de maintien —
  // celui sur lequel RB poserait le follet —, ou `null`.
  function levierTenuAPortee() {
    let meilleur = null;
    let meilleure = Infinity;
    for (const id of interactifsPresents()) {
      const p = scene.puzzle(id);
      if (p.type !== 'levier_maintenu' || !puzzlesEtat[id]?.actif) continue;
      const centre = centreInteractif(p);
      const d = Math.hypot(hero.x - centre.x, hero.y - centre.y);
      if (d <= p.maintien.portee_px && d < meilleure) {
        meilleure = d;
        meilleur = { id, ...centre };
      }
    }
    return meilleur;
  }

  function centreInteractif(puzzle) {
    const pose = scene.poseEffectiveInteractif(puzzle.id);
    return { x: (pose.x + 0.5) * scene.tileSize, y: (pose.y + 0.5) * scene.tileSize };
  }

  // RB, Tab ou toucher le follet (B2, « contextuel ») : un follet posé
  // revient, n'importe où ; près d'un levier tenu allumé, il s'y pose ;
  // sinon, la cible suivante (`D-54`), comme toujours.
  function cibleOrdonnee(folletCourant, companion) {
    if (folletPoste(folletCourant)) return rappelerFollet(folletCourant);
    const levier = levierTenuAPortee();
    if (levier) return poserFollet(folletCourant, levier);
    return cibleSuivanteFollet(folletCourant, hero, monstres, companion);
  }

  // Une frame des leviers tenus : qui les tient (le héros à portée, ou le
  // follet posé dessus), lesquels s'éteignent, et si une paire est complète.
  // Le flag d'un `simultane` est un flag de descente : le passage reste
  // ouvert même quand les leviers s'éteignent ensuite.
  function majLeviersMaintenus(deltaMs) {
    const eteints = [];
    for (const id of scene.interactifs) {
      const p = scene.puzzle(id);
      if (p.type !== 'levier_maintenu' || !puzzlesEtat[id]?.actif) continue;
      const centre = centreInteractif(p);
      const tenuParHeros = Math.hypot(hero.x - centre.x, hero.y - centre.y) <= p.maintien.portee_px;
      const tenuParFollet = folletPoste(follet) && follet.poste.id === id;
      const { etat, eteint } = avancerLevierMaintenu(puzzlesEtat[id], tenuParHeros || tenuParFollet, deltaMs, p.maintien.extinction_ms);
      if (etat === puzzlesEtat[id]) continue;
      puzzlesEtat = { ...puzzlesEtat, [id]: etat };
      save.puzzles = puzzlesEtat;
      if (eteint) eteints.push(id);
    }
    for (const simultane of simultanesResolus(registre, puzzlesEtat, (f) => flags.has(f))) {
      flags.set(simultane.flag_pose);
      etatModifie = true;
    }
    if (eteints.length > 0) compterExtinctions(eteints);
  }

  // L'explication du follet (§4.4) : après `apres_extinctions` extinctions des
  // leviers d'une même paire encore ouverte, une seule fois par partie.
  function compterExtinctions(eteints) {
    for (const p of registre.tous('puzzles')) {
      if (p.type !== 'simultane' || !p.explication || flags.has(p.flag_pose) || flags.has(p.explication.flag)) continue;
      const n = eteints.filter((id) => p.tous_allumes.includes(id)).length;
      if (n === 0) continue;
      const total = (extinctionsLeviers.get(p.id) || 0) + n;
      extinctionsLeviers.set(p.id, total);
      if (total >= p.explication.apres_extinctions && !dialogue.estOuvert()) {
        flags.set(p.explication.flag);
        ouvrirDialogueCatalogue(p.explication.dialogue);
        return;
      }
    }
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
      if (etatGameplay.target_next.pressed) follet = cibleOrdonnee(follet, companionDuFollet);
      follet = avancerFollet(follet, hero, monstres, deltaS, {
        sens: sensOrbiteFollet(),
        dureeInversionMs: reglageAlignement.orbite.duree_inversion_ms,
      });
    }

    // Géométrie de l'aura, résolue UNE fois pour la frame (`D-51`) : son centre
    // est le point LOGIQUE du follet — celui dont `D-39` fait dériver le corps
    // et le cercle affiché —, son rayon passe par la fonction de résolution que
    // le dessin lit aussi. Deux monstres dans le cercle reçoivent donc tous les
    // deux l'effet, sans que rien d'autre ait à le savoir.
    const auraFollet = companionDuFollet
      ? { centre: { x: follet.x, y: follet.y }, rayonPx: resoudreRayonAuraPx(companionDuFollet) }
      : null;

    const regimeFrame = etatAlignement();
    monstres = monstres.map((monstre) => {
      if (monstre.mort) return monstre;
      // Spec 14, palier D : pendant les fondus et le dialogue de fin, les
      // monstres d'une rencontre ne font rien — ni pas, ni coup.
      if (monstre.rencontre && !rencontreAgit(rencontre && rencontre.etat)) return monstre;
      const donneesEnnemi = registre.obtenir('enemies', monstre.enemyId);
      const { force, vitesse, dot } = statsEffectivesMonstre(registre, donneesEnnemi, follet, {
        position: { x: monstre.x, y: monstre.y },
        aura: auraFollet,
      }, regimeFrame);

      // Palier C : les monstres du Chaos décident (errance / poursuite /
      // désintérêt) ; ceux de la Grotte vont droit au but, comme en Phase 1.
      let suivant;
      if (donneesEnnemi.comportement === 'distance') suivant = deplacerTireur(monstre, donneesEnnemi, force, vitesse, deltaS, deltaMs);
      else if (donneesEnnemi.comportement === 'orbite') suivant = deplacerEnOrbite(monstre, donneesEnnemi, deltaS);
      else if (donneesEnnemi.comportement === 'boss') suivant = deplacerBoss(monstre, donneesEnnemi, force, vitesse, deltaS, deltaMs);
      else if (monstre.spawnId) suivant = deplacerMonstreDuChaos(monstre, vitesse, deltaS, deltaMs);
      else suivant = approcherEnLigneDroite(monstre, hero.x, hero.y, vitesse, deltaS, donneesEnnemi.distance_contact_px || 0);
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
          const pvAvantDot = suivant.pv;
          suivant = infligerDegats(suivant, dot.valeur);
          // Le tick de DoT (Feu) doit être visible sans que le joueur frappe
          // (§3.1 : "y compris sous DoT Feu sans frapper", critère manuel §7).
          // Seulement s'il a blessé : un intouchable (spec 14) ne flashe pas.
          if (suivant.pv < pvAvantDot) suivant.flashMs = FLASH_TOUCHE_MS;
        }
      } else {
        suivant.dotAccumulateurMs = 0;
      }
      // `specs/15` palier A : le statut posé au coup (la brûlure de la
      // torche) tique hors de l'aura, jusqu'à sa fin — même flash que le DoT
      // du Feu, pour la même raison : le joueur doit VOIR la brûlure agir.
      const coup = tickStatutsCoup(registre, suivant, deltaMs);
      suivant = coup.monstre;
      if (coup.degats > 0 && !suivant.mort) {
        suivant = infligerDegats(suivant, coup.degats);
        suivant.flashMs = FLASH_TOUCHE_MS;
      }

      if (suivant.mort && !monstre.mort) onMonstreMort(donneesEnnemi);
      return suivant;
    });
    avancerTirs(deltaMs);

    // `specs/10` §4.3 point 3 : le héros peut porter un effet à dégâts sur la
    // durée (Feu négatif). Même catalogue, même boucle d'intervalle que la
    // brûlure d'un monstre ; les PV descendent comme pour un coup reçu, jamais
    // `pv_max`. La mort par brûlure est possible et rejoue le réveil (`Q-86`).
    auraOccupee = monstres.some((m) => !m.mort && estDansAura({ x: m.x, y: m.y }, auraFollet));
    const brulures = dotsHeros(registre, save.hero.companion, regimeFrame, { auraOccupee });
    const accumulateurs = {};
    for (const brulure of brulures) {
      let reste = (dotsHerosAccumulateursMs[brulure.id] || 0) + deltaMs;
      while (reste >= brulure.intervalle_ms) {
        reste -= brulure.intervalle_ms;
        hero.pv = Math.max(0, hero.pv - brulure.valeur);
      }
      accumulateurs[brulure.id] = reste;
    }
    dotsHerosAccumulateursMs = accumulateurs;

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
          // `D-141` : les dégâts passent par LEUR dérivée, comme la cadence
          // deux lignes plus bas — ils lisaient la Force brute, ce qui
          // laissait la Force sans formule à régler en données.
          let suivant = infligerDegats(monstre, statsDerivees.derivee_degats_attaque);
          suivant.flashMs = FLASH_TOUCHE_MS;
          // `specs/15` palier A : une arme qui porte `au_coup` (la torche)
          // pose son statut sur le monstre touché — la brûlure, 3 s.
          if (arme.au_coup && !suivant.mort) {
            suivant = poserStatutCoup(suivant, registre.obtenir('status_effects', arme.au_coup.statut));
          }
          if (suivant.mort && !monstre.mort) onMonstreMort(registre.obtenir('enemies', monstre.enemyId));
          return suivant;
        });
        cooldownAttaqueHerosMs = statsDerivees.derivee_cooldown_attaque_ms;
      }
    }
    majCompetences(deltaMs, etatGameplay, statsDerivees);

    verifierNettoyage();

    // Spec 14, §4.3 : dans une rencontre SANS DÉFAITE, tomber à 0 PV ne tue
    // pas — le follet relève le héros, PV pleins, sans malus ni retour à la
    // Grotte. La règle vit sur la rencontre (`sans_defaite`), jamais sur un id.
    if (hero.pv <= 0 && !hero.mort && rencontre && rencontre.def.sans_defaite && rencontreEnCours(rencontre.etat)) {
      hero.pv = hero.pvMax;
      if (rencontre.def.dialogue_releve) ouvrirDialogueCatalogue(rencontre.def.dialogue_releve);
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
    for (const puzzleId of interactifsPresents()) {
      const puzzle = scene.puzzle(puzzleId);
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

  // `D-158` : avance le geste des leviers de la scène vers leur état réel.
  // Tourne même sous UI : c'est un geste déjà lancé qui finit, pas du
  // gameplay (le menu ne s'ouvre jamais pendant l'appui qui l'a déclenché).
  function majBasculesLeviers(deltaMs) {
    for (const id of scene.interactifs) {
      const p = scene.puzzle(id);
      if (!TYPES_LEVIER.includes(p.type)) continue;
      basculesLeviers.set(id, avancerBascule(basculesLeviers.get(id), !!puzzlesEtat[id]?.actif, deltaMs));
    }
  }

  function maj(deltaMs) {
    const etatBrut = input.maj();
    // Lus à CHAQUE frame, qu'une bulle soit ouverte ou non : un contact posé
    // pendant le jeu ne doit pas ressurgir, plus tard, comme un choix.
    const contactsTactiles = lireContactsTactiles();
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

    if (dialogueOuvertMaintenant) {
      dialogue.maj(deltaMs);
      tempsDialogueMs += deltaMs;
    }

    // Intro (§3.5, palier 4) : minuteur pur, AUCUN input lu (non skippable).
    // `introEtaitActive`/`departEtaitActif` sont capturés AVANT d'avancer
    // (plutôt que relire `intro`/`depart` après) pour que la frame où l'une
    // se termine reste elle aussi gelée pour le gameplay — sur cette frame
    // précise, `intro` peut déjà valoir `null` (transition vers
    // demarrerChoixFollet(), qui ouvre un dialogue) alors que le gameplay ne
    // doit pas non plus se réveiller un instant avant que ce dialogue ne soit
    // vu la frame suivante (même patron que dialogueVientDeSOuvrir ci-dessus).
    // Ticket L3 : l'ouverture compte comme l'intro pour tout ce qui suit (menu
    // fermé, gameplay gelé) — y compris la frame où elle cède la place à
    // l'intro, qui naît ici et avance dès cette frame.
    // `specs/12` : le prologue avance à l'appui — ATTACK, INTERACT ou un
    // toucher n'importe où (ses écrans n'ont rien d'autre à toucher). Sa fin
    // lance l'ouverture dans la MÊME frame : le symbole, s'il naît ici, avance
    // dès le bloc suivant, et le gameplay reste gelé sur la frame de passage.
    const prologueEtaitActif = prologue !== null;
    if (prologueEtaitActif) {
      const appui = etatBrut.attack.pressed || etatBrut.interact.pressed || contactsTactiles.length > 0;
      prologue = avancerPrologue(prologue, deltaMs, appui);
      if (prologue.termine) {
        prologue = null;
        demarrerOuverture(scene.id);
      }
    }
    // La stèle : B (`skill_3`, le retour du menu) ou un toucher n'importe où
    // la ferment — au doigt, les boutons du jeu sont sous la vue, le toucher
    // est la seule sortie qu'on atteint (règle « fermable au tactile »).
    // Capturée AVANT de la fermer : la frame de la fermeture reste gelée.
    const steleEtaitActive = vueStele !== null;
    if (steleEtaitActive) {
      vueStele = avancerVueStele(vueStele, deltaMs, Math.random);
      const puzzleStele = scene.puzzle(vueStele.puzzleId);
      // Spec 14, `Q-138` : une stèle qui descend. A ou INTERACT descendent ;
      // au doigt, un toucher SUR la gravure descend, ailleurs il ferme. Sans
      // descente, tout toucher ferme, comme avant.
      const peutDescendre = descenteDisponible(puzzleStele, flags.has);
      const zone = peutDescendre ? zoneGravureStele() : null;
      const surGravure = (p) => zone && p.x >= zone.x && p.x <= zone.x + zone.w && p.y >= zone.y && p.y <= zone.y + zone.h;
      const descendre = peutDescendre
        && (etatBrut.attack.pressed || etatBrut.interact.pressed || contactsTactiles.some(surGravure));
      const retour = etatBrut.skill_3.pressed || contactsTactiles.some((p) => !surGravure(p));
      // PS1 : fermer, c'est lancer la sortie en fondu ; la vue disparaît quand
      // elle est finie, et le jeu reste gelé jusque-là.
      if (vueSteleArmee(vueStele, puzzleStele.armement_ms)) {
        if (descendre) vueStele = demanderDescente(vueStele);
        else if (retour) vueStele = fermerVueStele(vueStele);
      }
      if (vueSteleTerminee(vueStele)) {
        const { descendre: descente } = vueStele;
        vueStele = null;
        if (descente) commencerDescente(puzzleStele.descente);
      }
    }
    // Spec 14, palier G : le parchemin. Ses lettres s'écrivent ; un appui (B, A,
    // INTERACT ou un toucher) pendant l'écriture l'ACHÈVE, après elle il ferme la
    // vue par le fondu de la stèle. Capturé avant, comme la stèle : la frame
    // de la fermeture reste gelée.
    const parcheminEtaitActif = vueParchemin !== null;
    if (parcheminEtaitActif) {
      const puzzleParchemin = scene.puzzle(vueParchemin.puzzleId);
      const lignes = lignesParchemin(vueParchemin.competenceId);
      let vue = avancerVueStele(vueParchemin.vue, deltaMs, Math.random);
      let ecritureMs = vueParchemin.ecritureMs + deltaMs;
      const appui = etatBrut.skill_3.pressed || etatBrut.attack.pressed || etatBrut.interact.pressed || contactsTactiles.length > 0;
      if (appui && vueSteleArmee(vue, puzzleParchemin.armement_ms)) {
        if (!ecritureFinie(lignes, ecritureMs)) ecritureMs = dureeEcriture(lignes);
        else vue = fermerVueStele(vue);
      }
      vueParchemin = vueSteleTerminee(vue) ? null : { ...vueParchemin, vue, ecritureMs };
    }
    const logoEtaitActif = ouvertureLogoMs !== null;
    if (logoEtaitActif) {
      ouvertureLogoMs += deltaMs;
      if (etatLogo(effetLogoOuverture, ouvertureLogoMs).termine) {
        ouvertureLogoMs = null;
        intro = creerIntro(registre.obtenir('scenes', scene.id).intro);
      }
    }
    const introEtaitActive = intro !== null || logoEtaitActif || prologueEtaitActif;
    if (intro) {
      // MT_intro-follets-visibles_2026-09-19 : l'intro N'EST PLUS mise à
      // `null` ici. Avant, elle l'était à l'instant exact où le dialogue de
      // choix s'ouvrait, et comme `choixFollet` n'est posé qu'au `onFermer`
      // de ce dialogue, plus aucun des deux calques (la convergence, l'écran
      // de choix — réunis depuis dans `folletsCinematique`, `D-178`) ne
      // dessinait les follets pendant tout le texte — ils disparaissaient
      // puis revenaient d'un coup à l'appui sur A.
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
    avancerSillagesCinematique(deltaMs);

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
    // Spec 14, §4.1 : pendant le déchiffrement, ni B ni MENU ne ferment le
    // carnet — ils l'ACCÉLÈRENT. Fermer marquerait l'indice comme lu sans
    // que le joueur l'ait vu se déchiffrer. Les deux verbes sont retirés de
    // la frame avant que le menu ne les voie.
    const dechiffrementRetient = dechiffrement !== null && menu.estOuvert() && !!(menu.indicesAffiches && menu.indicesAffiches());
    const accelererCarnet = dechiffrementRetient && (etatBrut.skill_3.pressed || etatBrut.menu.pressed);
    if (dechiffrementRetient) {
      const relire = avancerDechiffrementCarnet(deltaMs, accelererCarnet);
      if (relire) menu.rafraichirIndices();
    }
    if (etatBrut.menu.pressed && !dechiffrementRetient && !dialogueOuvertMaintenant && !choixFolletActif() && !introEtaitActive && !departEtaitActif && !steleEtaitActive && !parcheminEtaitActif) {
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
      constructionActif() || menuFermeParVerbe || steleEtaitActive || parcheminEtaitActif
    );
    // `D-92`/`D-93` : avant tout le reste, y compris avant l'UI — un écran
    // Coffre ouvert vide la poche, et la case d'attaque doit dire la vérité
    // dès cette frame-là.
    revaliderEquipementDuHeros();
    // `D-54` : LE point de décision unique annonce son verdict au dehors
    // (aujourd'hui : le `preventDefault` de `Tab`, qui arrive hors frame).
    onEtatUi(uiOuverte);
    onVerbesActions(verbesActionsVisibles());
    onZonesMonde(zonesTactilesMonde(uiOuverte));
    // Auto (§5.2) : lu sur la MÊME frame et le MÊME `uiOuverte` que tout le
    // reste — jamais un second calcul de « le jeu a-t-il la main ».
    majDescenteAuto(deltaMs, uiOuverte);
    majBasculesLeviers(deltaMs);
    if (menu.estOuvert()) {
      const neutre = etatNeutre(etatBrut);
      menu.traiterInput(dechiffrementRetient ? { ...etatBrut, skill_3: neutre.skill_3, menu: neutre.menu } : etatBrut);
    } else if (dialogueOuvertMaintenant) {
      // La frame d'ouverture reste neutre pour le doigt aussi (même défense
      // que pour les verbes : le geste qui a ouvert ne choisit pas).
      if (dialogueVientDeSOuvrir) dialogue.traiterInput(etatNeutre(etatBrut), null);
      else dialogue.traiterInput(etatBrut, toucherDialogue(contactsTactiles));
    }
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
      if (save.hero.niveau > niveauPrecedent) {
        eclatNiveauMs = ECLAT_NIVEAU_MS;
        // Plusieurs niveaux d'un coup : un seul symbole, rejoué depuis le début.
        logoNiveauMs = 0;
      }
      niveauPrecedent = save.hero.niveau;
    }
    if (eclatNiveauMs > 0) eclatNiveauMs = Math.max(0, eclatNiveauMs - deltaMs);
    // Avancé comme l'éclat, UI ouverte ou non : un dialogue qui s'ouvre sur la
    // montée de niveau ne doit pas figer le symbole au-dessus du héros.
    if (logoNiveauMs !== null) {
      logoNiveauMs += deltaMs;
      if (etatLogo(effetLogoNiveau, logoNiveauMs).termine) logoNiveauMs = null;
    }

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

      // `D-65` : gelé sous UI par LE point de décision unique, comme la
      // poussière et les textes flottants. Ouvrir le menu juste après une
      // mort met donc le clignement en pause — cohérent avec tout le reste,
      // et il n'y avait aucune raison d'en faire une exception.
      if (clignementRespawnMs !== null) {
        clignementRespawnMs += deltaMs;
        if (clignementRespawnMs >= DUREE_CLIGNEMENT_RESPAWN_MS) clignementRespawnMs = null;
      }
    }

    // Le temps de jeu est en pause sous UI (§4) : ni combat, ni énigme, ni
    // portail ne doit progresser pendant qu'une UI est ouverte.
    if (!uiOuverte) {
      if (etatGameplay.interact.pressed) essayerInteraction();
      if (etatGameplay.consume.pressed) essayerConsommer();
      mettreAJourCombat(deltaMs, etatGameplay, statsPrimaires, statsDerivees);
      majRencontre(deltaMs);
      majLeviersMaintenus(deltaMs);
      verifierEntreesDeZone();
      indices.maj(deltaMs);
      verifierIndicesNiveau();
      verifierLignesAmbiance();
      avancerEffetsMonde(deltaMs);

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
      avancerCombustion(deltaMs, heureAvant);
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
        ouvrirDialogueCatalogue('dlg_premiere_faim');
      }

      // Buffs temporaires (Palier C §3.3, ex. le fruit cuit) : tiqués comme
      // les cooldowns de combat, purgés à expiration (status.js#tickBuffsActifs).
      // Les soins d'abord, sur la table AVANT expiration : le dernier
      // intervalle d'un buff compte, comme le premier. En temps actif, donc
      // gelés sous UI avec la durée du buff qui les porte.
      const soins = tickSoinsBuffsActifs(registre, save.hero.buffs_actifs, soinsBuffsAccumulateursMs, deltaMs);
      soinsBuffsAccumulateursMs = soins.accumulateurs;
      if (soins.soin > 0 && !hero.mort) hero.pv = Math.min(hero.pvMax, hero.pv + soins.soin);
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

  // `D-178` : OÙ sont les follets de la cinématique à cet instant — la seule
  // source, lue par le dessin ET par le sillage (qui naît là où l'œil les
  // voit). Trois étapes, dans cet ordre de priorité :
  //   - l'écran de choix (`choixFolletActif()`) : les trois à leur place, le
  //     sélectionné plus grand. Il passe avant l'intro, restée vivante en
  //     étape ATTENTE (cf. maj()) — sans quoi ils seraient dessinés deux fois ;
  //   - l'intro (étapes 1-2, §3.5) : lévitation puis convergence
  //     (`intro.js#etatRendu`, pur) ;
  //   - le départ (étape 4) : les deux non élus s'éloignent et s'éteignent ;
  //     l'élu est déjà le vrai follet (companion.js), dessiné par la scène.
  // `[{ index, x, y, alpha, taille, selectionne }]`, en px logiques d'écran.
  function folletsCinematique() {
    const cibles = POSITIONS_ECRAN_FOLLETS.map((x) => ({ x, y: Y_ECRAN_FOLLETS }));
    if (choixFolletActif()) {
      return cibles.map((c, index) => {
        const selectionne = index === choixFollet.index;
        return {
          index, x: c.x, y: c.y, alpha: 1, selectionne,
          taille: selectionne ? TAILLE_FOLLET_SELECTIONNE_PX : TAILLE_FOLLET_REPOS_PX,
        };
      });
    }
    if (intro) {
      const rendu = etatRenduIntro(intro, cibles);
      return (rendu.follets || []).map((f, index) => ({
        index, x: f.x, y: f.y, alpha: f.alpha, taille: TAILLE_FOLLET_REPOS_PX, selectionne: false,
      }));
    }
    if (depart) {
      return etatRenduDepart(depart, cibles).map(({ index, x, y, alpha }) => ({
        index, x, y, alpha, taille: TAILLE_FOLLET_REPOS_PX, selectionne: false,
      }));
    }
    return [];
  }

  // Le sillage de la cinématique : même effet qu'en jeu (`effetSillage`, déjà
  // allégé par le levier `particules` — Bas n'émet rien), une réserve par
  // follet, la densité suivant la distance parcourue. Avancé à chaque frame,
  // cinématique ou pas : les dernières bouffées d'un départ doivent finir de
  // s'éteindre après lui, jamais disparaître d'un coup.
  function avancerSillagesCinematique(deltaMs) {
    const presents = folletsCinematique();
    if (presents.length > 0) tempsCinematiqueMs += deltaMs;
    sillagesCinematique.forEach((reserve, i) => {
      const f = presents.find((p) => p.index === i);
      const avant = positionsSillageCinematique[i];
      if (f) {
        avancerPoussiere(reserve, {
          x: f.x,
          y: f.y + effetSillage.offset_y_px,
          distancePx: avant ? Math.hypot(f.x - avant.x, f.y - avant.y) : 0,
          deltaMs,
          emettre: true,
        });
        positionsSillageCinematique[i] = { x: f.x, y: f.y };
      } else {
        avancerPoussiere(reserve, { x: 0, y: 0, distancePx: 0, deltaMs, emettre: false });
        positionsSillageCinematique[i] = null;
      }
    });
  }

  // Le dessin des follets de la cinématique, dans l'ordre du monde (render.js
  // pour le follet en jeu) : sillage dessous, étincelles de derrière, la
  // silhouette, étincelles de devant — puis l'anneau de sélection.
  function dessinerFolletsCinematique() {
    const presents = folletsCinematique();
    sillagesCinematique.forEach((reserve, i) => {
      const companion = registre.obtenir('companions', ORDRE_CHOIX_FOLLET[i]);
      for (const b of bouffeesVisibles(reserve)) {
        dessinerVisuel(ctxLogique, visuelSillage, b.x, b.y, {
          teinte: companion.render.couleur, alpha: b.alpha, echelle: b.echelle,
        });
      }
    });
    for (const f of presents) {
      const companion = registre.obtenir('companions', ORDRE_CHOIX_FOLLET[f.index]);
      const teinte = companion.render.couleur;
      const echelle = f.taille / TAILLE_REFERENCE_FOLLET_PX;
      // Un tiers de tour de décalage par follet : trois orbites en phase se
      // liraient comme une seule mécanique posée sur trois objets.
      const tOrbite = tempsCinematiqueMs + (effetOrnement ? (f.index * effetOrnement.periode_ms) / 3 : 0);
      // L'orbite est réglée pour le follet À SA TAILLE DE JEU ; ici il est
      // dessiné plus grand, et les étincelles tournaient dans la silhouette.
      // L'ORBITE suit le rapport des deux échelles ; l'étincelle, elle, garde
      // sa taille de jeu — agrandie avec, elle devenait un disque. Aucun
      // second réglage en données.
      const rapport = echelle / resoudreEchelleJeuFollet(companion);
      const etincelles = etincellesOrbite(effetOrnement, tOrbite, f.x, f.y).map((e) => ({
        ...e, x: f.x + (e.x - f.x) * rapport, y: f.y + (e.y - f.y) * rapport,
      }));
      const dessinerEtincelles = (devant) => {
        for (const e of etincelles) {
          if (e.devant !== devant) continue;
          dessinerVisuel(ctxLogique, visuelOrnement, e.x, e.y, { teinte, alpha: e.alpha * f.alpha, echelle: e.echelle });
        }
      };
      dessinerEtincelles(false);
      dessinerVisuel(ctxLogique, registre.obtenir('visuels', companion.render.visuel), f.x, f.y, {
        teinte, echelle, alpha: f.alpha,
      });
      dessinerEtincelles(true);
      if (f.selectionne) {
        // L'anneau de sélection prend la couleur du follet (comme la case
        // d'attaque, `D-175`), au lieu d'un trait blanc que rien d'autre ne
        // porte dans le jeu. Il respire dès Moyen ; en Bas, il est posé.
        ctxLogique.save();
        ctxLogique.globalAlpha = Math.min(1, ALPHA_ANNEAU_CHOIX * facteurRespiration(effetAnneauChoix, tempsCinematiqueMs));
        ctxLogique.strokeStyle = teinte;
        ctxLogique.lineWidth = 1.5;
        ctxLogique.beginPath();
        ctxLogique.arc(f.x, f.y, RAYON_ANNEAU_CHOIX_PX, 0, Math.PI * 2);
        ctxLogique.stroke();
        ctxLogique.restore();
      }
    }
  }

  // Les paupières de l'intro (étape 1) : ce que `etatRendu` dit de l'étape en
  // cours, sans dessiner — les follets passent par `dessinerFolletsCinematique`.
  function renduIntroCourant() {
    if (!intro || choixFolletActif()) return null;
    return etatRenduIntro(intro, POSITIONS_ECRAN_FOLLETS.map((x) => ({ x, y: Y_ECRAN_FOLLETS })));
  }

  // `D-169` : ce que la bulle reçoit en plus de sa ligne, résolu ici (le
  // registre et le preset), comme `visuelFollet` pour le HUD. Le portrait
  // prend la teinte du compagnon, la même que son icône au HUD.
  function habillageDialogue(ligne) {
    const compagnon = ligne && ligne.portrait ? registre.obtenir('companions', ligne.portrait) : null;
    return {
      portrait: compagnon
        ? { visuel: registre.obtenir('visuels', compagnon.render.visuel), teinte: compagnon.render.couleur }
        : null,
      lueur: effetLueurDialogue,
      etincelles: effetEtincellesDialogue,
      visuelEtincelle: visuelEtincelleDialogue,
      tMs: tempsDialogueMs,
    };
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
        exclue: dansLumiereProtectrice,
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

  // Une seule caméra pour le dessin et pour ce qui se touche à l'écran : une
  // zone tactile calculée avec une autre formule que celle du dessin
  // répondrait à côté de ce que le joueur voit.
  function cameraCourante() {
    return calculerCamera({
      cibleX: hero.x,
      cibleY: hero.y,
      largeurScene: scene.width * scene.tileSize,
      hauteurScene: scene.height * scene.tileSize,
      largeurVue: RESOLUTION_LOGIQUE.largeur,
      hauteurVue: RESOLUTION_LOGIQUE.hauteur,
    });
  }

  // `Q-40`/`Q-41` : toucher le follet = `target_next`. Aucune zone quand une
  // UI capte les verbes (le verbe y serait neutralisé de toute façon, mais
  // une zone annoncée sous un menu serait un mensonge pour qui la lit), ni
  // avant le choix du follet. Position lue sur la frame en cours, relue par
  // le tactile à la suivante : un retard d'une frame, sans conséquence au doigt.
  function zonesTactilesMonde(uiOuverte) {
    if (uiOuverte || !follet) return [];
    const camera = cameraCourante();
    return [{ cx: follet.x - camera.x, cy: follet.y - camera.y, rayon: RAYON_TOUCHE_FOLLET, verbe: 'target_next' }];
  }

  function dessiner() {
    const camera = cameraCourante();
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
        // Un boss (§4.5) a sa barre en haut de l'écran : jamais les deux.
        actif: !donneesEnnemi.boss && estMonstreActif(m, follet),
        // Spec 14, palier D : Zéros est la silhouette du héros retournée
        // (`render.miroir`), et les monstres d'une rencontre arrivent et
        // partent en fondu.
        miroir: donneesEnnemi.render.miroir === true,
        alpha: m.rencontre && rencontre ? opaciteRencontre(rencontre.etat, rencontre.def.fondu_ms) : 1,
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
    const puzzlesAffiches = interactifsPresents()
      .map((id) => scene.puzzle(id))
      .filter((p) => p.render && p.render.visuel)
      .map((p) => {
        // specs/05_construction-stations.md §3 : position/rotation EFFECTIVE
        // (override validé ou défaut) — une station déplacée se dessine à sa
        // VRAIE position, jamais celle de puzzles.json.
        const pose = scene.poseEffectiveInteractif(p.id);
        const visuel = visuelInteractif(p);
        // `D-158` : un levier se lit à son GESTE (bascule.js) — allumé quand
        // le manche a touché sa butée, pas à l'appui. Sans état de geste (la
        // toute première frame), l'état réel, posé.
        const geste = gesteDuLevier(p);
        return {
          x: (pose.x + 0.5) * scene.tileSize,
          y: (pose.y + 0.5) * scene.tileSize,
          actif: !!geste && voyantAllume(geste),
          halo: geste ? fonduHalo(geste) : 0,
          visuel,
          pieceMobile: pieceMobileDuLevier(p, visuel),
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
    // `D-145` : les objets jetés, par-dessus, chacun décalé de son rang dans
    // la pile de sa tuile — sinon cinq objets au même centre se liraient
    // comme un seul. Le rang compte aussi un objet semé sur la même tuile.
    const rangParTuile = new Map();
    for (const o of objetsSolAffiches) {
      const cle = `${Math.floor(o.x / scene.tileSize)},${Math.floor(o.y / scene.tileSize)}`;
      rangParTuile.set(cle, (rangParTuile.get(cle) || 0) + 1);
    }
    for (const j of objetsJetesDeLaScene()) {
      const cle = `${Math.floor(j.x / scene.tileSize)},${Math.floor(j.y / scene.tileSize)}`;
      const rang = rangParTuile.get(cle) || 0;
      rangParTuile.set(cle, rang + 1);
      const [dx, dy] = decalageDansPile(rang);
      const visuel = registre.obtenir('visuels', registre.obtenir('items', j.item).render.visuel);
      objetsSolAffiches.push({ x: j.x + dx, y: j.y + dy, visuel });
    }

    // `specs/15` palier C : les objets plantés, dressés, allumés s'ils
    // brûlent (même verdict que la combustion : la phase du cycle).
    const phasePlantes = phaseDuCycle();
    const plantesAffiches = objetsPlantesDeLaScene().map((p) => {
      const item = registre.obtenir('items', p.item);
      const allume = brule(item, phasePlantes);
      const id = allume && item.plantable.visuel_allume ? item.plantable.visuel_allume : item.plantable.visuel;
      return { x: p.x, y: p.y, visuel: registre.obtenir('visuels', id), lumiere: allume ? item.combustion.lumiere : null };
    });
    for (const p of plantesAffiches) objetsSolAffiches.push({ x: p.x, y: p.y, visuel: p.visuel });

    // Toit des structures (§3.4) : opacité calculée ici (structures.js, pure,
    // testée) à partir du follet actif — RAYON_EFFACEMENT_TOIT = son
    // rayon_lumiere x FACTEUR_EFFACEMENT_TOIT, "un peu plus grand que le
    // halo" (acté Xav). `couleur` résolue depuis tiles.json > render.valeur
    // (render.js ne connaît jamais tiles.json par id).
    const rayonEffacement = (companionActif ? companionActif.rayon_lumiere : RAYON_TOIT_FOLLET_ABSENT_PX) * FACTEUR_EFFACEMENT_TOIT;
    // `D-132` : le motif du toit est le `visuel` de sa tuile, résolu ici pour
    // la même raison que la couleur. Absent = l'aplat seul, comme avant.
    const structuresAffichees = scene.structures.map((structure) => {
      const rendu = registre.obtenir('tiles', structure.toit).render;
      return {
        rect: structure.rect,
        couleur: rendu.valeur,
        visuel: rendu.visuel ? registre.obtenir('visuels', rendu.visuel) : null,
        opacite: effetActif(effetsMonde, EFFET_TOIT_OCCULTE) ? 1 : calculerOpaciteToit(hero, structure, scene.tileSize, {
          rayonEffacement,
          margeFondu: MARGE_FONDU_TOIT_PX,
        }),
      };
    });

    // Cycle jour/nuit (§3.5) : `scene.obscurite` reste celle de la Phase 1
    // pour toute scène qui n'a pas `cycleJourNuit` (grotte, inchangée) ;
    // sinon l'opacité du voile est DÉRIVÉE de l'heure à chaque frame — jamais
    // un second mécanisme d'assombrissement, dessinerObscurite ne voit
    // toujours qu'un simple `{ opacite }`.
    //
    // Polish ambiance (23/09) : l'ombre d'une zone (le sous-bois) s'ajoute
    // par le MAXIMUM, jamais par une seconde couche — même voile, même trou
    // percé par la lumière du follet. Le signal des zones de Chaos, plus bas,
    // continue de lire l'opacité du seul CYCLE : c'est la nuit qui l'allume,
    // pas l'ombre d'un bois.
    const opaciteCycle = scene.cycleJourNuit
      ? opaciteAHeure(save.monde.heure)
      : (scene.obscurite ? scene.obscurite.opacite : 0);
    const opaciteAmbiance = Math.max(opaciteCycle, opaciteOmbreZones(scene.zones, hero.x, hero.y, scene.tileSize));
    // `D-158` : un levier allumé perce le voile d'un halo qui monte en fondu
    // (`lumiere_active` de son visuel) — même voie que les cristaux, une
    // lumière de scène de plus, jamais un second voile.
    // `specs/15` palier E : le rayon d'une flamme qui vacille (Moyen+). Deux
    // souffles de périodes premières entre elles, décalés par la position :
    // une flamme seule ne bat pas comme un métronome, et deux torches voisines
    // ne vacillent pas ensemble. Sans l'effet, 1 exactement : Bas est fixe.
    const vacillement = (x, y) => {
      if (!effetFlammeVacille) return 1;
      const decalage = (x * 0.37 + y * 0.61) * 97;
      const a = facteurRespiration(effetFlammeVacille, tempsVolFolletMs + decalage);
      const b = facteurRespiration(effetFlammeVacille, (tempsVolFolletMs + decalage) * 1.618);
      return (a + b) / 2;
    };
    const lumieresScene = () => {
      const leviers = puzzlesAffiches
        .filter((p) => p.halo > 0 && p.visuel.lumiere_active)
        .map((p) => {
          const l = p.visuel.lumiere_active;
          return { x: p.x, y: p.y - (l.dy || 0), rayon: l.rayon * p.halo, ...(l.couleur ? { couleur: l.couleur } : {}) };
        });
      const actives = lumieresActives(scene, flags);
      // `specs/15` palier B : la torche tenue éclaire autour du héros — une
      // lumière de scène de plus, jamais un second voile, et plus petite que
      // celle du follet (qui reste la lumière du héros, `D-35`).
      const tenu = objetTenuQuiBrule();
      const torche = tenu
        ? [{ x: hero.x, y: hero.y, rayon: tenu.combustion.lumiere.rayon * vacillement(hero.x, hero.y), ...(tenu.combustion.lumiere.couleur ? { couleur: tenu.combustion.lumiere.couleur } : {}) }]
        : [];
      // Et chaque objet planté qui brûle (palier C).
      const plantees = plantesAffiches.filter((p) => p.lumiere)
        .map((p) => ({ x: p.x, y: p.y, rayon: p.lumiere.rayon * vacillement(p.x, p.y), ...(p.lumiere.couleur ? { couleur: p.lumiere.couleur } : {}) }));
      const dynamiques = [...torche, ...plantees];
      return lumieresDecor.length || leviers.length || dynamiques.length ? [...actives, ...lumieresDecor, ...leviers, ...dynamiques] : actives;
    };
    const sceneAffichage = scene.cycleJourNuit || scene.obscurite || opaciteAmbiance > 0
      ? {
        ...scene,
        obscurite: { opacite: opaciteAmbiance },
        // `D-157` : une lumière de scène peut attendre un flag (la sortie de la
        // salle 2 ne s'éclaire qu'une fois la porte ouverte) — filtrée ici, au
        // seul endroit où la scène affichée est composée ; render.js ne voit
        // jamais une condition.
        lumieres: lumieresScene(),
      }
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

    const entitesDessinees = dessinerScene(ctxLogique, {
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
      lisieres,
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
      // `D-134` : étincelles en orbite autour de la SILHOUETTE (là où l'œil
      // voit le follet), teintes à sa couleur. Vide sous le seuil d'ornement.
      ornementsFollet: follet && companionActif && effetOrnement
        ? {
          visuel: visuelOrnement,
          teinte: companionActif.render.couleur,
          etincelles: etincellesOrbite(
            effetOrnement, tempsVolFolletMs, follet.x + corpsFollet.dx, follet.y + corpsFollet.dy,
          ),
        }
        : null,
      // `undefined` (jamais un no-op) hors `?debug=fps` — même raison que
      // `surFrame` ci-dessous : render.js ne lit `performance.now()` que si
      // ce callback est fourni.
      surRecalculCoucheStatique: moniteurPerf.actif ? moniteurPerf.surRecalculCoucheStatique : undefined,
    });
    const lumieresDessinees = dessinerObscurite(ctxLogique, {
      scene: sceneAffichage,
      camera,
      follet: follet ? { x: follet.x, y: follet.y } : null,
      rayonLumiereFollet: companionActif ? companionActif.rayon_lumiere : 0,
      couleurLumiereFollet: companionActif ? companionActif.render.couleur : null,
      // `D-134` : 1 exactement sans l'effet, donc Moyen inchangé.
      respirationLumiereFollet: facteurRespiration(effetHalo, tempsVolFolletMs),
    });
    // MT_mesure-saccades_2026-09-19, piste 4 ("entités dessinées") : no-op
    // hors `?debug=fps`. `specs/13` palier F : ce que render.js a DESSINÉ, sur
    // ce que la scène portait — la part hors champ, que le palier A ne
    // savait pas mesurer. Sans obscurité, aucune lumière n'est lue.
    moniteurPerf.enregistrerEntites({
      ...entitesDessinees,
      lumieres: lumieresDessinees ? lumieresDessinees.lumieres : { dessines: 0, presents: 0 },
    });
    // `D-191` : le liseré nocturne, APRÈS le voile (sinon la nuit l'éteint).
    // Moyen : l'alpha suit la respiration, ramenée dans ]0, 1] (le facteur
    // oscille autour de 1). Sans l'effet, 1 exactement : Bas est fixe.
    const phaseCycle = phaseDuCycle();
    const alphaSurlignage = facteurRespiration(effetSurlignageRespire, tempsVolFolletMs)
      / (1 + (effetSurlignageRespire ? effetSurlignageRespire.amplitude : 0));
    const surlignagesAffiches = objetsSolAffiches
      .filter((o) => surlignageActif(o.visuel, phaseCycle))
      .map((o) => ({ x: o.x, y: o.y, visuel: registre.obtenir('visuels', o.visuel.surlignage.visuel), alpha: alphaSurlignage }));
    // `specs/15` palier E : les braises de chaque flamme (Haut), par le même
    // calque — après le voile, elles sont de la lumière.
    const flammes = [
      ...(objetTenuQuiBrule() ? [{ x: hero.x, y: hero.y }] : []),
      ...plantesAffiches.filter((p) => p.lumiere).map((p) => ({ x: p.x, y: p.y })),
    ];
    const braises = effetFlammeBraises ? flammes.flatMap((f) => particulesFilet(
      effetFlammeBraises, tempsVolFolletMs, f.x, f.y - HAUTEUR_FLAMME_PX, (f.x * 0.53 + f.y * 0.29) % 1,
    ).map((p) => ({ ...p, visuel: visuelBraise }))) : [];
    dessinerSurlignages(ctxLogique, {
      camera,
      surlignages: surlignagesAffiches,
      // La graine vient de la position : deux plumes voisines ne soufflent
      // pas en même temps, et une plume ne change pas de rythme d'une frame
      // à l'autre.
      particules: surlignagesAffiches.flatMap((o) => particulesFilet(
        effetSurlignageFilet, tempsVolFolletMs, o.x, o.y, (o.x * 0.37 + o.y * 0.61) % 1,
      ).map((p) => ({ ...p, visuel: visuelParticuleFilet }))).concat(braises),
    });
    // Spec 14, palier C : les tirs en vol, après le voile (render.js dit
    // pourquoi). Le visuel se résout ici : render.js n'ouvre jamais
    // `visuels.json` par id.
    dessinerProjectiles(ctxLogique, {
      camera,
      projectiles: projectilesEnVol(projectiles).map((p) => ({ x: p.x, y: p.y, visuel: registre.obtenir('visuels', p.visuel) })),
    });
    // Palier G : l'onde d'un tir à zone, là où il a éclaté — elle s'élargit
    // jusqu'au rayon qu'il a touché et s'efface.
    dessinerOndes(ctxLogique, {
      camera,
      ondes: ondes.map((o) => ({ x: o.x, y: o.y, rayon: o.rayon, couleur: o.couleur, t: o.ms / DUREE_ONDE_MS })),
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
        opacite: opaciteCycle,
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
    // Ticket L4 : le symbole de la montée de niveau, à la même place que les
    // textes de gain (après l'obscurité, lisible de nuit ; avant le HUD), et
    // accroché au héros : il le suit s'il bouge.
    if (logoNiveauMs !== null) {
      dessinerLogo(ctxLogique, imagesLogo, {
        x: hero.x - camera.x,
        y: hero.y - camera.y + effetLogoNiveau.offset_y_px,
        hauteur: effetLogoNiveau.hauteur_px,
        calques: etatLogo(effetLogoNiveau, logoNiveauMs).calques,
      });
    }
    dessinerTextesFlottants(ctxLogique, {
      camera,
      config: effetTexteGain,
      // `D-71` : on TRANSMET ce que le module donne, enrichi du texte résolu
      // — jamais un objet refabriqué champ par champ, qui laisserait tomber
      // la prochaine clé comme il a laissé tomber `style`.
      textes: composerTextesFlottants(textesVisibles(textesFlottants), i18n.t),
    });
    dessinerHud(ctxLogique, {
      i18n,
      pv: hero.pv || 0,
      pvMax: hero.pvMax || 1,
      eclats: save.inventaire.eclats,
      companion: companionActif,
      visuelFollet: companionActif ? registre.obtenir('visuels', companionActif.render.visuel) : null,
      tactileActif: input.tactileActif(),
      // `D-63` : résolu ici, comme `visuelArme` et `visuelFollet` — `hud.js`
      // ne connaît ni catalogue ni flag.
      verbesActions: verbesActionsVisibles(),
      // Spec 14, §4.6 : la charge qui monte, puis la recharge qui se vide, sur
      // chaque emplacement de compétence — relevées à la dernière frame de jeu.
      jaugesSlots: ratiosEmplacements,
      // D-20 B : ce que dessine chaque case, résolu ici (main.js a le
      // registre) exactement comme visuelFollet au-dessus — ui/hud.js ne
      // reçoit que des silhouettes et ignore de quoi elles viennent.
      //   - `attack` : l'ARME équipée. Même résolution d'arme que les dégâts
      //     et l'anneau, jamais une seconde.
      //   - `consume` : le CONSOMMABLE équipé, et c'est sa silhouette de
      //     monde (`render.visuel` de l'item) — aucune donnée nouvelle à
      //     écrire. Si elle se lit mal réduite à la case, le remède sera une
      //     entrée d'icône dédiée en données, comme pour l'épée : toujours
      //     pas de code (essai en cours, Xav 21/09).
      // Spec 14, palier G : un `skill_N` montre l'icône de la compétence qui
      // l'occupe (`competencesEquipees`, le même point que le lancer).
      iconesSlots: {
        ...Object.fromEntries(competencesEquipees().map(({ competence, verbe }) => [verbe, registre.obtenir('visuels', competence.icone)])),
        attack: (() => {
          // `specs/15` palier B : une torche qui brûle montre sa flamme.
          const tenu = objetTenuQuiBrule();
          if (tenu && tenu.combustion.visuel_allume) return registre.obtenir('visuels', tenu.combustion.visuel_allume);
          const arme = resoudreArmeEquipee(registre, save.hero.equipement.arme);
          return arme && arme.icone ? registre.obtenir('visuels', arme.icone) : null;
        })(),
        consume: (() => {
          const idConsommable = save.hero.equipement.consommable;
          if (!idConsommable) return null;
          const item = registre.obtenir('items', idConsommable);
          return item && item.render && item.render.visuel
            ? registre.obtenir('visuels', item.render.visuel)
            : null;
        })(),
      },
      // `D-13` : les buffs actifs du bandeau. On LIT la table tenue par
      // status.js (`save.hero.buffs_actifs`), on ne la recalcule pas — c'est
      // la même table qui alimente `modificateursBuffsActifs` plus haut, donc
      // l'icône affichée et le bonus réellement appliqué ne peuvent pas
      // diverger. L'ordre des clés EST l'ordre d'activation.
      //
      // L'icône vient d'une STAT, jamais de l'effet : `buff_repas` et un
      // futur `buff_potion_vitalite` montrent la même, et un soin emprunte
      // celle d'une stat, teintée — la règle vit en un seul point,
      // `status.js#iconeBuffBandeau`. Un effet sans icône est simplement
      // absent du bandeau, pas dessiné en trou.
      buffs: Object.entries(save.hero.buffs_actifs || {}).flatMap(([effetId, resteMs]) => {
        const icone = iconeBuffBandeau(registre, registre.obtenir('status_effects', effetId));
        if (!icone) return [];
        return [{ visuel: registre.obtenir('visuels', icone.visuel), teinte: icone.teinte, resteMs }];
      }),
      // `D-96` : les trois silhouettes du bandeau, résolues ICI comme tout ce
      // que le HUD dessine — c'est cet orchestrateur qui a le registre, pas
      // `ui/hud.js`, qui ne connaît aucun id de catalogue. Les deux jauges
      // déclarent la leur dans `survival.json` (donc les changer est une
      // affaire de données) ; la monnaie, elle, déclare la sienne dans
      // `monnaies.json` depuis `D-103` — son id ne vit plus dans ce fichier,
      // et c'est la même silhouette qu'au bandeau et dans les fiches de
      // Craft, lue une seule fois.
      iconesBandeau: {
        eclats: registre.obtenir('visuels', iconeMonnaie),
        faim: registre.obtenir('visuels', registre.obtenir('survival', 'jauge_faim').icone),
        soif: registre.obtenir('visuels', registre.obtenir('survival', 'jauge_soif').icone),
      },
      // Palier C/D (§3.9) : discret, un chiffre — jamais affiché avant le
      // premier calcul des jauges/XP (cinématique d'ouverture).
      survie: save.survie,
      niveau: save.hero.niveau,
      // MT_hud-ligne-haute_2026-09-19 : plus de `ratioXp` au HUD (la barre
      // d'XP a quitté le bandeau) — la progression est désormais lisible dans
      // l'écran Stats, cf. obtenirEntreesStats().
      eclatNiveau: ECLAT_NIVEAU_MS > 0 ? eclatNiveauMs / ECLAT_NIVEAU_MS : 0,
      // La bulle et la barre du bas partagent la même bande (cf. hud.js) :
      // lu à la même source que le `if` qui dessine la bulle plus bas. Le
      // bandeau d'aide du placement (DOM, `ui/menu.js`, collé au pied) aussi
      // (`D-172`) : on lit l'état qui GÈLE le jeu pendant le placement et
      // lève ce bandeau — la barre n'y dit rien.
      barreActions: !dialogue.estOuvert() && !constructionActif(),
      iconesBoutons: iconesBoutonsTactiles,
      // `D-177` : la cible d'INTERACT, par LA fonction qui décide de l'appui.
      // Calculée seulement quand le doigt a la main : c'est là qu'elle se voit.
      iconesCibles: input.tactileActif() ? { interact: visuelCibleInteraction(cibleInteraction()) } : {},
      boss: barreDuBoss(),
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
    dessinerFolletsCinematique();
    const renduIntro = renduIntroCourant();
    if (dialogue.estOuvert()) {
      const ligneDialogue = dialogue.ligneCourante();
      dessinerDialogue(ctxLogique, ligneDialogue, habillageDialogue(ligneDialogue));
    }
    if (vueStele !== null) dessinerEcranStele(ctxLogique, contenuVueStele());
    if (vueParchemin !== null) dessinerEcranParchemin(ctxLogique, contenuVueParchemin());

    // Paupières (§3.5 étape 1) : rideau de cinématique, dessiné en TOUT
    // DERNIER — il doit couvrir la scène, le HUD et même l'écran de choix
    // (inactif à ce stade, mais la règle reste "toujours en dernier" pour ne
    // jamais dépendre de l'ordre des autres calques).
    if (prologue !== null) {
      // `specs/12` : le prologue sur le même noir que le symbole qui le suit.
      const ecran = prologue.ecrans[prologue.index];
      dessinerPaupieres(ctxLogique, 0);
      dessinerEcranPrologue(ctxLogique, {
        glyphe: ecran.glyphe ?? null,
        titre: i18n.t(ecran.titre),
        lignes: ecran.lignes.map((cle) => i18n.t(cle)),
      }, alphaPrologue(prologue), prologueArme(prologue));
    } else if (ouvertureLogoMs !== null) {
      // Ticket L3 : le symbole sur le noir des paupières fermées — le même
      // rideau que la première étape de l'intro, qui s'ouvrira juste après.
      dessinerPaupieres(ctxLogique, 0);
      dessinerLogo(ctxLogique, imagesLogo, {
        x: RESOLUTION_LOGIQUE.largeur / 2,
        y: RESOLUTION_LOGIQUE.hauteur / 2 + effetLogoOuverture.offset_y_px,
        hauteur: effetLogoOuverture.hauteur_px,
        calques: etatLogo(effetLogoOuverture, ouvertureLogoMs).calques,
      });
    } else if (renduIntro && renduIntro.etape === ETAPE_CLIGNEMENTS) {
      dessinerPaupieres(ctxLogique, renduIntro.paupieres);
    } else if (clignementRespawnMs !== null) {
      // `D-65` : même calque, même fonction, même place — en TOUT DERNIER.
      // Le `else` n'est pas une précaution : les deux ne peuvent pas
      // coexister (on ne meurt pas pendant l'intro), et s'ils le pouvaient,
      // superposer deux rideaux ne voudrait rien dire.
      dessinerPaupieres(ctxLogique, ouverturePaupieres(effetClignementRespawn, clignementRespawnMs));
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
    effetsMonde = creerEtatEffets();
    finsEffetsEnAttente = [];
    choixFollet = null;
    pousseeChoixPrecedente = 0;
    intro = null;
    depart = null;
    ouvertureLogoMs = null;
    prologue = null;
    vueStele = null;
    vueParchemin = null;
    dechiffrement = null;
    viderProjectiles(projectiles);
    ondes = [];
    etatsCompetences.clear();
    ratiosEmplacements = {};
    rencontre = null;
    logoNiveauMs = null;
    basculesLeviers.clear();
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
    // `D-08` : « Manger » depuis la Poche — le même chemin que CONSUME.
    consommerItem: (itemId) => essayerConsommer(itemId),
    // `D-145` : jeter depuis la Poche, et ce que la fiche doit annoncer.
    // `specs/15` palier C : pour un objet plantable, « Jeter » EST « Planter ».
    jeterItem: (itemId) => (registre.existe('items', itemId) && registre.obtenir('items', itemId).plantable
      ? essayerPlanter(itemId) : essayerJeter(itemId)),
    obtenirObjetsPlantes: () => objetsPlantesDeLaScene(),
    solPleinSousHeros,
    obtenirObjetsJetes: () => objetsJetesDeLaScene(),
    // `D-191` : les icônes des menus allument le même liseré que le sol.
    phaseDuCycle,
    choixFolletActif,
    reinitialiserPartie,
    obtenirHero: () => hero,
    // Palier C (`D-113`) : la table des grains de tuiles, telle que
    // `render.js` la reçoit. Exposée pour les tests — le dessin n'est jamais
    // exercé headless, donc c'est la seule façon de prouver qu'un preset
    // allège le sol sans toucher une silhouette solide. On rend la VRAIE
    // table, jamais une recopie qui pourrait diverger (`D-72`).
    obtenirVisuelsTuiles: () => visuelsTuiles,
    // `specs/13` palier D : la table des lisières, telle que `render.js` la
    // reçoit (même raison que la table des grains).
    obtenirLisieres: () => lisieres,
    // Palier D (§4.5) : changer de preset en jeu. Le preset arrive déjà
    // résolu — `demarrerJeu` a la fenêtre et l'URL, pas l'orchestrateur.
    appliquerGraphismes,
    obtenirGraphismes: () => graphismesActuels,
    // `D-193` : le niveau d'ornements, pour la feuille de style des menus
    // (halo qui respire, braises) — un NOMBRE, jamais le preset.
    niveauOrnements: () => levier('ornements'),
    // Palier C (`D-114`) : le décor réellement généré pour la scène courante.
    // Même raison que la table ci-dessus — prouver l'inclusion Bas ⊂ Moyen ⊂
    // Haut demande le vrai décor, pas une régénération refaite côté test.
    obtenirDecor: () => decor,
    obtenirFollet: () => follet,
    obtenirScene: () => scene,
    obtenirMonstres: () => monstres,
    obtenirBarreBoss: () => barreDuBoss(),
    // Spec 14, palier C : les tirs en vol (copies des emplacements actifs).
    obtenirProjectiles: () => projectilesEnVol(projectiles).map((p) => ({ ...p })),
    // Spec 14, palier D : la rencontre lancée dans la scène (sa phase), ou null.
    obtenirRencontre: () => (rencontre ? { phase: rencontre.etat.phase, tMs: rencontre.etat.tMs } : null),
    obtenirChoixFollet: () => choixFollet,
    obtenirIntro: () => intro,
    obtenirOuvertureLogo: () => ouvertureLogoMs,
    obtenirPrologue: () => prologue,
    obtenirVueStele: () => vueStele,
    contenuVueStele: () => contenuVueStele(),
    // Spec 14, palier G : le parchemin, les compétences et leurs ondes.
    obtenirVueParchemin: () => vueParchemin,
    contenuVueParchemin: () => contenuVueParchemin(),
    obtenirEtatsCompetences: () => Object.fromEntries(etatsCompetences),
    obtenirJaugesSlots: () => ratiosEmplacements,
    obtenirOndes: () => ondes.map((o) => ({ ...o })),
    obtenirLogoNiveau: () => logoNiveauMs,
    obtenirDepart: () => depart,
    obtenirSave: () => save,
    // `specs/10` §2.3 : LE point d'écriture, et ce que le jeu lit de
    // l'alignement. Exposés pour les tests et pour la spec 11.
    modifierAlignement,
    etatAlignement,
    dialogueOuvert: () => dialogue.estOuvert(),
    // Spec 11 §5 : l'état des effets de monde, pour les tests (il ne vit
    // nulle part ailleurs, surtout pas dans la sauvegarde).
    obtenirEffetsMonde: () => effetsMonde,
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
    // `D-63` : les verbes de la barre d'actions débloqués. Exposé pour les
    // tests — le dessin n'est jamais exercé en headless, donc c'est la seule
    // façon de prouver qu'une partie neuve n'a qu'une case.
    obtenirVerbesActions: () => verbesActionsVisibles(),
    // `D-65` : l'ouverture des paupières du retour de mort, 0..1, ou `null`
    // quand personne ne vient de mourir. Seule façon de prouver la séquence
    // en headless — le dessin, lui, n'est jamais exercé.
    obtenirClignementRespawn: () => (
      clignementRespawnMs === null ? null : ouverturePaupieres(effetClignementRespawn, clignementRespawnMs)
    ),
    // Palier D (§3.4) : fourni à ui/menu.js via menu.definirEntreesStats()
    // une fois l'orchestrateur construit (même patron que
    // reinitialiserPartie ci-dessus) — le menu Stats n'a besoin d'appeler
    // que cette seule fonction, jamais de connaître registre/save/i18n.
    obtenirEntreesStats: () => obtenirEntreesStats(),
    sousTitreStats: () => sousTitreStats(),
    obtenirEntreesIndices: () => obtenirEntreesIndices(),
    // Spec 14 : le menu prévient qu'il ouvre le carnet (`menu.definirOuvertureIndices`).
    ouvrirCarnet: () => ouvrirCarnet(),
    obtenirDechiffrement: () => dechiffrement,
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
    nomsValeursConditions: () => Object.keys(valeursConditions()),
    constructionActif,
    obtenirConstruction: () => construction,
  };
}

// `specs/09_reglages-graphiques.md` §5.1 : les signaux d'appareil sont lus UNE
// FOIS, au démarrage, ici — jamais dans un module pur, jamais par frame. Un
// seul signal, volontairement : le pointeur grossier (téléphone, tablette).
// Ni mémoire, ni nombre de cœurs, ni nom de navigateur — le portable Pentium
// sans GPU, 2 Go, joue à 58 fps en Moyen, et une heuristique mémoire l'aurait
// classé Bas à tort.
//
// Déclarée au NIVEAU MODULE (règle née de `D-72`) : `demarrerJeu` et
// `creerOrchestrateurGrotte` sont deux fonctions sœurs, et ce que les deux
// peuvent avoir à lire ne vit dans ni l'une ni l'autre. C'est aussi ce qui la
// rend testable depuis Node, où `demarrerJeu` n'est jamais exécuté.
export function signauxAppareil(fenetre) {
  const mediaQuery = fenetre && typeof fenetre.matchMedia === 'function' ? fenetre.matchMedia : null;
  if (!mediaQuery) return { pointeurGrossier: false };
  try {
    return { pointeurGrossier: !!mediaQuery.call(fenetre, '(pointer: coarse)').matches };
  } catch {
    // `matchMedia` absent ou capricieux : on ne devine pas, on prend le cas
    // qui ne retire rien au joueur (Moyen).
    return { pointeurGrossier: false };
  }
}

// Résolution du réglage graphique au démarrage. Rend le preset RÉEL (jamais
// « auto », qui n'est pas un palier) et ce qu'il faut en dire. Le preset
// résolu n'est jamais persisté : seul le choix du joueur l'est (§5.3).
//
// Les leviers sont relus un par un juste après : le schéma garantit déjà que
// chaque palier les couvre, mais une faute de frappe dans `leviers` ferait
// lever `valeurLevier` en pleine partie, au premier système qui le demande —
// ici, elle tombe au boot, avec le nom du levier.
//
// `search` (facultatif) apporte `?qualite=bas|moyen|haut`, un outil de DEBUG :
// il remplace le preset résolu en UN seul point — celui-ci — et n'écrit jamais
// rien dans la sauvegarde. Même contrat que `?echelle` : une valeur invalide
// laisse le réglage du joueur en place et s'annonce.
export function resoudreGraphismes(registre, save, fenetre, search = null) {
  const config = registre.obtenir('graphismes', 'graphismes_presets');
  const resolu = resoudrePreset(save.settings.graphismes, signauxAppareil(fenetre), config);
  const force = lirePresetForce(search, config);
  const preset = force.preset || resolu.preset;
  for (const levier of config.leviers) valeurLevier(config, preset, levier);
  return {
    config,
    preset,
    // Le choix TEL QU'IL FAIT FOI, et non tel qu'il est enregistré : sous
    // `?qualite=`, c'est le paramètre d'URL qui commande, donc c'est lui que
    // la carte de Paramètres doit afficher. Sans ce champ, la carte dirait
    // « Auto (Bas) » pendant que le jeu rend en Haut — un mensonge, et le
    // genre d'écart qu'on passe une soirée à ne pas comprendre.
    choix: force.preset || save.settings.graphismes,
    // Un preset forcé n'est pas « choisi par Auto ».
    auto: force.preset ? false : resolu.auto,
    avertissement: [resolu.avertissement, force.avertissement].filter(Boolean).join(' · ') || null,
  };
}

// Ticket L3 : les trois calques du symbole, dans l'ordre de lecture, cuits par
// `docs/captures/logo/generer_logo.mjs`. Lancés en chargement sans être
// attendus : le premier dessin a lieu quelques frames plus tard, et une image
// encore en route ou en erreur n'est simplement pas dessinée
// (`render.js#dessinerLogo`, « meilleur effort »). Appelée par `demarrerJeu`
// seulement — jamais au chargement du module, qui reste importable par Node.
function chargerImagesLogo() {
  return [1, 2, 3].map((n) => {
    const image = new Image();
    image.src = `images/logo/logo_calque_${n}.svg`;
    return image;
  });
}

export async function demarrerJeu() {
  const noms = Object.keys(SCHEMAS);
  const [dictionnaires, { donnees, erreurs: erreursChargement }] = await Promise.all([
    chargerLocalesDepuisReseau('locales'),
    chargerCataloguesDepuisReseau('data', noms),
    // `specs/12` : attendues avec le reste, pour que le premier écran du
    // prologue naisse dans sa police — plafonné, jamais bloquant (polices.js).
    chargerPolices(),
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
  // `D-71` : les styles de texte flottant que le code émet existent-ils au
  // catalogue ? Ni `validerCatalogues` ni le schéma ne peuvent le dire — ils
  // ne connaissent pas le code. C'est le garde-fou qui vivait dans la boucle
  // de dessin, remis là où une faute de catalogue se voit : au démarrage.
  const erreursStyles = erreursChargement.length ? [] : erreursStylesTexteFlottant(donnees.effets);
  // Spec 11 §3 : toute clé de texte d'un dialogue (nœud, option, ligne)
  // existe en FR ET en EN — même raison que les menus : le registre ne voit
  // jamais les dictionnaires.
  const erreursTextesDlg = erreursChargement.length ? [] : erreursTextesDialogues(donnees.dialogues, dictionnaires);
  // `D-121` : toute recette qui produit une station a-t-elle un modèle à
  // cloner ? Même famille que le contrôle ci-dessus — le schéma vérifie que
  // le TYPE existe, il ne peut pas savoir qu'aucune INSTANCE de ce type n'a
  // été posée dans `puzzles.json`, et la faute ne se verrait qu'au moment de
  // fabriquer.
  const erreursStations = erreursChargement.length
    ? []
    : erreursRecettesDeStation(donnees.recipes, donnees.puzzles);
  const toutesErreurs = [
    ...erreursChargement, ...erreursValidation, ...erreursCles,
    ...erreursCouleurs, ...erreursTextes, ...erreursStyles, ...erreursStations, ...erreursTextesDlg,
  ];

  if (toutesErreurs.length > 0) {
    afficherErreurBoot(toutesErreurs);
    return;
  }

  const registre = construireRegistre(donnees);
  const i18n = creerI18n(dictionnaires, 'fr');

  const store = creerStoreIndexedDB();
  const { payload: save } = await chargerSave(store);
  i18n.definirLangue(save.settings.lang);

  // `specs/10` §2.1 : après la migration 7 -> 8, une sauvegarde sans
  // `hero.alignement` (ou hors bornes) est un échec DUR, dit par le même écran
  // que les catalogues — jamais un repli sur 0, qui masquerait l'écrivain
  // oublié. Vérifié ici, avant toute boucle : relu en pleine partie, le même
  // défaut ferait lever la boucle de jeu.
  const reglageAlignement = configAlignement(registre);
  try {
    lireAlignement(save.hero, reglageAlignement.bornes);
  } catch (erreur) {
    afficherErreurBoot([erreur.message]);
    return;
  }
  // `?alignement=N` (§6) : lu ici, une seule fois, avec les bornes des
  // données. Il masque la valeur de la sauvegarde pour la session et n'est
  // JAMAIS persisté (l'orchestrateur ne l'écrit nulle part), comme `?qualite`.
  const alignementDebug = lireAlignementForce(window.location.search, reglageAlignement.bornes);
  if (alignementDebug.avertissement) console.warn(alignementDebug.avertissement);
  // Spec 14, palier B : `?flags=a,b` (debug) — des flags tenus pour vrais
  // toute la session, jamais sauvegardés (portes de l'Annexe ouvertes).
  const flagsDebug = lireFlagsForces(window.location.search, registre);
  if (flagsDebug.avertissement) console.warn(flagsDebug.avertissement);
  if (flagsDebug.ids.length > 0) console.info(`?flags : tenus pour vrais cette session : ${flagsDebug.ids.join(', ')}.`);

  // `specs/09_reglages-graphiques.md` palier B : le réglage graphique est
  // RÉSOLU au démarrage, et rien n'en dépend encore — les leviers se branchent
  // au palier C. Ce qui est déjà vrai : le catalogue est validé, un réglage
  // inconnu venu d'une sauvegarde est signalé plutôt que remplacé en silence,
  // et le choix du joueur ne quitte jamais `save.settings`.
  const graphismes = resoudreGraphismes(registre, save, window, window.location.search);
  if (graphismes.avertissement) console.warn(graphismes.avertissement);

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
  // `D-107` : le clic droit n'ouvre plus le menu du navigateur. Posé sur le
  // DOCUMENT, donc valable aussi au-dessus des écrans d'UI, qui sont des
  // éléments DOM posés à côté du canvas — un garde sur le seul canvas serait
  // un garde à moitié posé. Sous-système « meilleur effort » : il rattrape
  // ses propres erreurs, rien à faire ici (cf. souris.js).
  verrouillerMenuContextuel(document, { search: window.location.search });

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
  // `D-63` : les verbes de la barre d'actions débloqués, écrits par
  // l'orchestrateur à chaque frame (`onVerbesActions`), lus par le tactile au
  // moment du contact — exactement le patron de `uiCapteLesVerbes` ci-dessous
  // (`D-54`). Un bouton masqué ne doit pas rester cliquable.
  //
  // Il démarre VIDE plutôt qu'avec les cinq verbes : avant la première frame,
  // personne ne sait encore ce qui est débloqué, et un doigt posé dans cet
  // intervalle ne doit pas déclencher une compétence que le joueur n'a pas.
  let verbesActionsDebloques = [];
  // `Q-40` : même patron, pour les cibles qui suivent le monde (le follet).
  let zonesMondeTactiles = [];
  const sourceTactile = creerSourceTactile(canvasVisible, {
    surRelachement: () => pleinEcran.demanderUneFois(),
    verbesActions: () => verbesActionsDebloques,
    zonesMonde: () => zonesMondeTactiles,
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

  // `D-64` : le volume retenu, ou le DÉFAUT DU CATALOGUE tant que le joueur
  // n'y a pas touché. Le défaut vit donc en données, à un seul endroit, et
  // une sauvegarde d'avant ce ticket n'a rien à migrer — champ absent veut
  // dire « je n'ai jamais choisi », pas « zéro ».
  function volumeMusique() {
    const reglage = registre.obtenir('audio', 'audio_volume_musique');
    const retenu = save.settings.volume;
    return typeof retenu === 'number' ? retenu : reglage.defaut;
  }

  // La clé de texte du palier courant. Les clés sont appariées aux paliers
  // dans le catalogue (le schéma vérifie que les deux listes ont la même
  // longueur) : aucun pourcentage n'est composé en code, et traduire « 50 % »
  // autrement en anglais ne demande qu'une locale.
  function cleEtatVolume() {
    const reglage = registre.obtenir('audio', 'audio_volume_musique');
    const index = reglage.paliers.indexOf(volumeMusique());
    return reglage.cles_etat[index >= 0 ? index : 0];
  }

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
    dessinerIcone: creerDessinateurIcones({
      obtenirVisuel: (id) => registre.obtenir('visuels', id),
      fenetre: window,
      // `D-191` : lue à l'ouverture du menu (le jeu y est gelé, l'icône aussi).
      phaseDuCycle: () => orchestrateur.phaseDuCycle(),
    }),
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
    // `D-64` (T7) : le volume. Même patron exactement que la musique —
    // l'état réel vit dans `save.settings`, l'effet dans `audio.js`, et le
    // menu ne connaît ni l'un ni l'autre.
    //
    // Les paliers et leurs libellés viennent de `data/audio.json` : le menu
    // ne sait pas combien il y en a, et ajouter un cran (ou un volume
    // d'effets sonores) ne touchera pas une ligne de code.
    // Palier D de `specs/09_reglages-graphiques.md` : les réglages
    // graphiques. Même patron que le volume — l'état réel vit dans
    // `save.settings`, l'effet dans l'orchestrateur, et le menu ne connaît ni
    // l'un ni l'autre. Le cycle (`auto → bas → moyen → haut → auto`) est
    // l'ordre du catalogue : ajouter un preset ne touche pas une ligne ici.
    //
    // L'état est relu à la SOURCE, et la source est l'orchestrateur — pas
    // `save.settings`. La différence compte sous `?qualite=` : c'est alors
    // l'URL qui commande, et la carte doit dire ce que le jeu rend, jamais ce
    // qui est enregistré.
    graphismesCourant() {
      const courant = orchestrateur.obtenirGraphismes();
      return cleEtatCarte(courant.config, courant.choix, courant.preset);
    },
    cyclerGraphismes() {
      // Le cycle part du choix ENREGISTRÉ, pas du preset forcé : un
      // `?qualite=` dans l'URL ne doit pas détourner le réglage du joueur.
      save.settings.graphismes = presetSuivant(graphismes.config, save.settings.graphismes);
      const resolu = resoudreGraphismes(registre, save, window, window.location.search);
      if (resolu.avertissement) console.warn(resolu.avertissement);
      // Le curseur suit par `onGraphismesAppliques`, câblé une fois plus bas.
      orchestrateur.appliquerGraphismes(resolu);
    },
    volumeCourant: () => cleEtatVolume(),
    cyclerVolume() {
      const reglage = registre.obtenir('audio', 'audio_volume_musique');
      save.settings.volume = palierSuivant(reglage.paliers, volumeMusique());
      definirVolumeMaitre(save.settings.volume);
    },
    // §3.3 : liste déjà résolue/traduite (main.js a le registre + i18n) —
    // ui/menu.js ne connaît jamais items.json par id. `id`/`categorie`
    // ajoutés au Palier C (§3.3) : nécessaires pour proposer "Équiper" sur
    // la nourriture (ui/menu.js#entreesPoche).
    // specs/08 palier C : `icone` et `lignes` — la tuile et la fiche de l'écran
    // « maître-détail ». Résolues ICI (registre + i18n), jamais dans le menu.
    // `D-118` : la poche dit ce qu'elle a d'occupé. Un seul calcul, celui du
    // module (`slotsOccupes`), donc ce nombre ne peut pas diverger de celui
    // qui refuse un ramassage.
    sousTitrePoche: () => texteRemplissagePoche(save, registre, i18n, orchestrateur.evaluerCondition),
    listerPoche: () => Object.entries(save.inventaire.items)
      .filter(([, quantite]) => quantite > 0)
      .map(([itemId, quantite]) => entreePoche(registre.obtenir('items', itemId), quantite, {
        equipementHero: save.hero.equipement, registre, i18n, peripherique: input.peripheriqueActif(),
      })),
    // Palier C (§3.3) + `D-66` (T5) : UN point d'équipement, quel que soit
    // l'emplacement. Mutation directe de `save` (même patron que
    // basculerMusique ci-dessus, hors du chemin etatModifie de
    // l'orchestrateur, cf. journal : persistance au prochain autosave/
    // visibilitychange, comme les réglages).
    equiper: (slot, itemId) => {
      const itemDef = registre.obtenir('items', itemId);
      // L'arme équipée est un id de `weapons.json`, pas l'objet de poche :
      // c'est `items.json > arme` qui fait le pont, et le reste du jeu
      // (portée, icône, modificateurs) continue de ne connaître que l'arme.
      save.hero.equipement[slot] = slot === 'arme' ? itemDef.arme : itemId;
    },
    // `D-08` : manger un objet précis depuis la Poche, sans l'équiper.
    consommer: (itemId) => orchestrateur.consommerItem(itemId),
    jeter: (itemId) => orchestrateur.jeterItem(itemId),
    solPlein: () => orchestrateur.solPleinSousHeros(),
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

  // `D-136` : la pagination mesure avec la police de CET appareil, sur le
  // contexte où la bulle est dessinée — jamais une largeur calculée ailleurs.
  const dialogue = creerDialogue({ paginer: creerPaginateurDialogue(ctxLogique) });

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
    // APRÈS l'armement : c'est lui qui crée l'élément/le gain, donc il n'y
    // aurait rien à régler avant. Le réglage retenu s'applique ainsi dès la
    // première note, jamais au volume de catalogue puis corrigé.
    definirVolumeMaitre(volumeMusique());
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
    imagesLogo: chargerImagesLogo(),
    jouerPrologue: true,
    // Résolu plus haut, avec la fenêtre et l'URL : l'orchestrateur ne lit ni
    // l'une ni l'autre (il doit rester importable depuis Node).
    graphismes,
    registre, i18n, save, store, dialogue, menu, input, ctxLogique, ctxVisible, canvasLogique,
    alignementForce: alignementDebug.valeur,
    flagsForces: flagsDebug.ids,
    onPremierGeste: armerAudioUneFois,
    moniteurPerf,
    // La PRÉSENCE de la carte « Plein écran » est une condition de
    // `menus.json` : sans l'API, la carte tombe et sa case reste vide.
    valeursExternes: () => ({ plein_ecran_disponible: pleinEcran.disponible() ? 1 : 0 }),
    // `D-54` : le seul écrivain du drapeau lu par le clavier (cf. plus haut).
    onEtatUi: (ouverte) => { uiCapteLesVerbes = ouverte; },
    onVerbesActions: (verbes) => { verbesActionsDebloques = verbes; },
    onZonesMonde: (zones) => { zonesMondeTactiles = zones; },
    lireContactsTactiles: () => sourceTactile.lireContactsNouveaux(),
    // Le curseur n'est pas dans la scène, mais ses étincelles sont des
    // particules cosmétiques comme les autres : les laisser derrière ferait un
    // Bas à moitié appliqué, visible à la souris. Ici, et pas derrière chaque
    // appelant — parce que depuis le palier E, le preset peut changer sans que
    // personne ait cliqué (`descenteAuto`).
    onGraphismesAppliques: () => curseur.definirEffets(effetsCurseur().config, effetsCurseur().sillage),
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
  menu.definirEntreesIndices(orchestrateur.obtenirEntreesIndices);
  menu.definirOuvertureIndices(orchestrateur.ouvrirCarnet);

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
  // `D-108` : le curseur du jeu. Il se construit ICI parce que c'est le premier
  // endroit où le registre existe — les deux silhouettes et les deux réglages
  // viennent des catalogues, ce module n'invente ni forme ni couleur.
  // Les deux effets du curseur, passés au levier `particules` du preset EN
  // COURS. Une seule fonction, appelée au démarrage et à chaque changement de
  // preset : la décision n'est écrite qu'une fois (`D-72`).
  function effetsCurseur() {
    const courant = orchestrateur.obtenirGraphismes();
    const multiplicateur = valeurLevier(courant.config, courant.preset, 'particules');
    return {
      config: appliquerParticules(registre.obtenir('effets', 'effet_curseur'), multiplicateur),
      sillage: appliquerParticules(registre.obtenir('effets', 'effet_curseur_sillage'), multiplicateur),
    };
  }

  const curseur = creerCurseur({
    doc: document,
    fenetre: window,
    config: effetsCurseur().config,
    // La traînée est une 3ᵉ instance de `poussiere.js` : même mécanique que
    // celle du héros et que le sillage du follet, une entrée de catalogue de
    // plus et rien d'autre.
    configSillage: effetsCurseur().sillage,
    visuelOrbe: registre.obtenir('visuels', 'visuel_curseur'),
    visuelParticule: registre.obtenir('visuels', 'visuel_curseur_eclat'),
    visuelSillage: registre.obtenir('visuels', 'visuel_curseur_sillage'),
    dessinerVisuel,
  });

  creerBoucle({
    // Le curseur est avancé et dessiné APRÈS le jeu, et HORS de son point de
    // décision unique (`uiOuverte`) : ce n'est pas du gameplay, il ne se gèle
    // pas quand un menu s'ouvre. Il rattrape ses propres erreurs à sa
    // frontière (cf. curseur.js), donc il ne peut pas coûter une frame.
    // `D-109` : le stick droit pilote le curseur. Lu APRÈS `orchestrateur.maj`,
    // qui est l'endroit où la couche d'input est rafraîchie — on lit donc la
    // valeur de cette frame-ci, jamais celle d'avant. Et c'est un accesseur
    // à part, pas un verbe : aucun système de jeu ne voit ce stick.
    maj: (delta) => {
      orchestrateur.maj(delta);
      curseur.avancer(delta, input.pointeurManette());
      // `D-193` : les ornements des menus sont du CSS, lu sur
      // `<html data-ornements>`. Relu à chaque frame parce que le preset
      // « auto » peut descendre de lui-même, côté orchestrateur, qui ne
      // touche pas au DOM ; l'attribut n'est réécrit que s'il change.
      const ornements = String(orchestrateur.niveauOrnements());
      if (document.documentElement.dataset.ornements !== ornements) document.documentElement.dataset.ornements = ornements;
    },
    dessiner: () => { orchestrateur.dessiner(); curseur.dessiner(); },
    surFrame: moniteurPerf.actif ? moniteurPerf.surFrame : undefined,
  }).demarrer();
}

if (typeof window !== 'undefined') {
  demarrerJeu();
}
