// `D-43`, palier A2 (specs/08_menus-cartes.md §5) — `data/menus.json`, son
// schéma, et les contrôles au démarrage.
//
// La question que ce fichier pose à chaque bloc : « si quelqu'un abîme le
// catalogue, le jeu refuse-t-il de démarrer, avec le chemin de la faute ? »
// Un sous-écran mal déclaré ne se verrait sinon que le jour où un joueur
// l'ouvre — et certains (la confirmation d'un reset) ne s'ouvrent presque
// jamais.
//
// Et le test du catalogue (règle d'architecture directrice) : ajouter un
// écran = ajouter une entrée, sans toucher au code. Bloc 7.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validerCatalogues } from '../src/registry.js';
import { SCHEMAS } from '../src/schemas.js';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import {
  choisirGrille, nombreCases, erreursTextesMenus, erreursCablageMenus, CASES_MAX,
} from '../src/menu_cartes.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { donnees, erreurs: erreursChargement } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS));
const dictionnaires = await chargerLocalesDepuisDisque(path.join(RACINE, 'locales'));
assert.deepEqual(erreursChargement, []);

// Une copie du catalogue réel, abîmée par `abimer(menus)` — on part toujours
// des vraies données : un catalogue de test inventé pourrait rester valide
// alors que le vrai a changé de forme.
function erreursApres(abimer) {
  const copie = structuredClone(donnees);
  abimer(copie.menus, copie);
  return validerCatalogues(copie);
}
const ecran = (menus, id) => menus.find((e) => e.id === id);
const carte = (menus, id) => menus.flatMap((e) => e.cartes).find((c) => c.id === id);
function refuse(abimer, motif, message) {
  const erreurs = erreursApres(abimer);
  assert.ok(erreurs.some((e) => motif.test(e)), `${message}\n  attendu : ${motif}\n  reçu : ${JSON.stringify(erreurs, null, 2)}`);
}

// --- 1. Le catalogue réel est valide, et il dit ce que dit la spec (§3) ------
{
  assert.deepEqual(validerCatalogues(donnees), []);
  const racine = donnees.menus.find((e) => e.racine === true);
  assert.equal(racine.id, 'menu_racine');
  assert.deepEqual(racine.cartes.map((c) => c.case), [0, 1, 3], 'Héros · Paramètres · (case 2 libre, rien n\'y est déclaré) · contextuelle');
  assert.equal(carte(donnees.menus, 'carte_construction').condition !== undefined, true, 'la carte contextuelle porte une condition');
  assert.deepEqual(ecran(donnees.menus, 'menu_heros').cartes.map((c) => c.cible), ['ecran_poche', 'ecran_stats'], 'pas de carte « Feu follet » tant que sa page n\'existe pas');
  // 'D-64' (T7) : une 4e bascule, le Volume. L'ecran passe de 2x2 a 3x2 —
  // la STRUCTURE des menus est gelee depuis le 21/09, une carte de plus dans
  // un ecran existant ne la touche pas. Palier D de `specs/09` : une 5e
  // bascule, les Graphismes, sur la 6e et DERNIERE case — l'ecran est plein.
  assert.deepEqual(ecran(donnees.menus, 'menu_parametres').cartes.map((c) => c.type), ['bascule', 'bascule', 'bascule', 'bascule', 'dossier', 'bascule']);
  const reset = carte(donnees.menus, 'carte_reinitialiser');
  assert.equal(reset.danger, true);
  assert.deepEqual(donnees.menus.flatMap((e) => e.cartes).filter((c) => c.danger).map((c) => c.id), ['carte_reinitialiser'], 'une seule action destructive');
  console.log('OK catalogue réel : valide, et conforme à l\'arborescence de départ (§3)');
}

// --- 2. La grille (§4.2) ------------------------------------------------------
{
  for (const n of [1, 2, 3, 4]) assert.deepEqual(choisirGrille(n), { colonnes: 2, rangees: 2 }, `${n} case(s) → 2 × 2`);
  for (const n of [5, 6]) assert.deepEqual(choisirGrille(n), { colonnes: 3, rangees: 2 }, `${n} cases → 3 × 2`);
  for (const n of [0, 7, 12, -1, 2.5, undefined]) assert.equal(choisirGrille(n), null, `${n} → aucune grille`);
  // On compte les CASES, pas les cartes : la racine a 3 cartes et 4 cases.
  assert.equal(nombreCases(ecran(donnees.menus, 'menu_racine')), 4);
  assert.equal(nombreCases(ecran(donnees.menus, 'menu_heros')), 2);
  for (const e of donnees.menus) assert.ok(choisirGrille(nombreCases(e)), `${e.id} a une grille`);
  console.log('OK grille : 1-4 → 2 × 2, 5-6 → 3 × 2, le reste refusé ; les cases comptent, pas les cartes');
}

// --- 3. Plus de six cartes : le jeu refuse de démarrer -------------------------
{
  refuse((menus) => {
    const base = carte(menus, 'carte_exporter');
    const e = ecran(menus, 'menu_sauvegarde');
    for (let i = 3; i <= CASES_MAX; i++) e.cartes.push({ ...base, id: `carte_test_${i}`, case: i });
  }, /carte_test_6 > case doit être un entier de 0 à 5 .*on crée un dossier/, 'une 7ᵉ carte doit être refusée, avec le conseil de la spec');
  refuse((menus) => { carte(menus, 'carte_heros').case = 1.5; }, /carte_heros > case doit être un entier/, 'case non entière');
  refuse((menus) => { delete carte(menus, 'carte_heros').case; }, /carte_heros > champ "case" manquant/, 'case absente');
  console.log('OK plus de six cartes / case invalide : refus au démarrage');
}

// --- 4. Cibles, atteignabilité, racine unique ----------------------------------
{
  refuse((menus) => { menus.push({ id: 'menu_orphelin', cle_titre: 'menu.titre', cartes: [{ ...carte(menus, 'carte_exporter'), id: 'carte_orpheline' }] }); },
    /menu_orphelin > inatteignable depuis l'écran racine/, 'un écran que rien n\'ouvre');
  refuse((menus) => { ecran(menus, 'menu_heros').racine = true; ecran(menus, 'menu_heros').icone_fermer = 'visuel_icone_menu_fermer'; ecran(menus, 'menu_heros').icone_retour = 'visuel_icone_menu_retour'; },
    /exactement un écran doit porter racine: true \(trouvé : 2\)/, 'deux racines');
  refuse((menus) => { delete ecran(menus, 'menu_racine').racine; }, /exactement un écran doit porter racine: true \(trouvé : 0\)/, 'aucune racine');
  refuse((menus) => { delete ecran(menus, 'menu_racine').icone_fermer; }, /l'écran racine exige "icone_fermer"/, 'racine sans icône de fermeture');
  refuse((menus) => { carte(menus, 'carte_stats').id = 'carte_poche'; }, /id de carte déjà utilisé dans "menu_heros"/, 'deux cartes du même id');
  refuse((menus) => { carte(menus, 'carte_heros').icone = 'visuel_inexistant'; }, /carte_heros > icone > "visuel_inexistant" introuvable dans visuels\.json/, 'icône inconnue');
  console.log('OK structure : écran orphelin / racine multiple ou absente / ids de carte / icône inconnue');
}

// --- 5. Les trois types (§4.1) --------------------------------------------------
{
  refuse((menus) => { carte(menus, 'carte_heros').type = 'bouton'; }, /type doit être l'un de dossier\/bascule\/action/, 'type inconnu');
  refuse((menus) => { delete carte(menus, 'carte_heros').cible; }, /une carte dossier exige une cible/, 'dossier sans cible');
  refuse((menus) => { carte(menus, 'carte_heros').action = 'action_x'; }, /"action" n'a pas de sens sur une carte de type "dossier"/, 'dossier avec action');
  refuse((menus) => { delete carte(menus, 'carte_musique').etat; }, /une carte bascule exige un etat/, 'bascule sans lecteur d\'état');
  refuse((menus) => { carte(menus, 'carte_musique').cle_phrase = 'menu.titre'; }, /une carte bascule affiche son état, pas une cle_phrase/, 'bascule avec phrase');
  refuse((menus) => { delete carte(menus, 'carte_exporter').cle_phrase; }, /carte_exporter > champ "cle_phrase" manquant/, 'action sans phrase');
  refuse((menus) => { delete carte(menus, 'carte_reinitialiser').cle_confirmer; }, /danger: true exige "cle_confirmer"/, 'danger sans texte de confirmation');
  refuse((menus) => { carte(menus, 'carte_exporter').cle_confirmation = 'menu.titre'; }, /"cle_confirmation" n'a de sens qu'avec danger: true/, 'confirmation sans danger');
  refuse((menus) => { carte(menus, 'carte_musique').danger = true; }, /"danger" n'a pas de sens sur une carte de type "bascule"/, 'une bascule ne ferme rien : pas de danger');
  console.log('OK types de cartes : chaque champ à sa place, ou le jeu ne démarre pas');
}

// --- 6. Conditions : le format de flags.js, aucun autre -------------------------
{
  // La forme sur valeur nommée est désormais connue du validateur partagé.
  assert.deepEqual(erreursApres((menus) => { carte(menus, 'carte_construction').condition = { all: [{ valeur: 'niveau', min: 5 }, { not: { valeur: 'niveau', max: 2 } }] }; }), []);
  refuse((menus) => { carte(menus, 'carte_construction').condition = { valeur: 'niveau' }; }, /condition sur valeur sans min ni max/, 'valeur sans borne');
  refuse((menus) => { carte(menus, 'carte_construction').condition = { valeur: 'niveau', min: '5' }; }, /condition\.min doit être numérique/, 'borne non numérique');
  refuse((menus) => { carte(menus, 'carte_construction').condition = 'flag_inexistant'; }, /condition "flag_inexistant" introuvable dans flags\.json/, 'drapeau non déclaré');
  refuse((menus) => { carte(menus, 'carte_construction').condition = { lieu: 'maison' }; }, /condition mal formée/, 'aucun nouveau format : { lieu } n\'existe pas');
  // Case contextuelle : des candidates ordonnées, jamais une carte morte.
  assert.deepEqual(erreursApres((menus) => {
    ecran(menus, 'menu_racine').cartes.push({ ...carte(menus, 'carte_construction'), id: 'carte_jardinage', condition: { valeur: 'niveau', min: 99 } });
  }), [], 'deux candidates conditionnelles sur la même case : c\'est exactement la case contextuelle');
  refuse((menus) => {
    ecran(menus, 'menu_racine').cartes.push({ ...carte(menus, 'carte_heros'), id: 'carte_doublon', cible: 'menu_heros' });
  }, /carte_doublon > case 0 déjà tenue par "carte_heros", qui n'a pas de condition/, 'une candidate derrière une carte inconditionnelle ne s\'afficherait jamais');
  console.log('OK conditions : { valeur, min, max } reconnue, formes fausses refusées, case contextuelle sans carte morte');
}

// --- 7. Textes FR et EN ----------------------------------------------------------
{
  assert.deepEqual(erreursTextesMenus(donnees.menus, dictionnaires), [], 'toutes les clés du catalogue réel existent dans les deux langues');
  const copie = structuredClone(donnees.menus);
  carte(copie, 'carte_exporter').cle_phrase = 'menu.carte.exportr_phrase';
  const erreurs = erreursTextesMenus(copie, dictionnaires);
  assert.equal(erreurs.length, 2, 'une faute de frappe = une erreur par langue');
  assert.match(erreurs[0], /menu_sauvegarde > carte_exporter > cle_phrase > clé "menu\.carte\.exportr_phrase" absente de fr\.json/);
  assert.match(erreurs[1], /absente de en\.json/);
  assert.equal(erreursTextesMenus([], dictionnaires, ['menu.cle_du_composant_absente']).length, 2, 'les textes du composant passent par le même contrôle');
  // Décision 3 de Xav : noms génériques. « Héros », jamais un nom propre.
  assert.equal(dictionnaires.fr['menu.carte.heros'], 'Héros');
  console.log('OK textes : chaque clé citée existe en FR et en EN ; une faute tombe avec son chemin');
}

// --- 8. Le câblage, dans les DEUX sens ---------------------------------------------
{
  const enregistres = {
    actions: [...new Set(donnees.menus.flatMap((e) => e.cartes).map((c) => c.action).filter(Boolean))],
    etats: [...new Set(donnees.menus.flatMap((e) => e.cartes).map((c) => c.etat).filter(Boolean))],
    ecrans: ['ecran_poche', 'ecran_stats', 'ecran_construction'],
    valeurs: ['niveau', 'stations_placables', 'plein_ecran_disponible'],
  };
  assert.deepEqual(erreursCablageMenus(donnees.menus, enregistres), []);

  const sans = (sorte, nom) => ({ ...enregistres, [sorte]: enregistres[sorte].filter((n) => n !== nom) });
  assert.match(erreursCablageMenus(donnees.menus, sans('actions', 'action_exporter_sauvegarde'))[0], /carte_exporter > action "action_exporter_sauvegarde" sans fonction enregistrée/);
  assert.match(erreursCablageMenus(donnees.menus, sans('etats', 'etat_musique'))[0], /carte_musique > etat "etat_musique" sans lecteur d'état enregistré/);
  assert.match(erreursCablageMenus(donnees.menus, sans('ecrans', 'ecran_stats'))[0], /carte_stats > cible "ecran_stats" : ni un écran de menus\.json, ni un écran existant enregistré/);
  // Une valeur que personne ne fournit ferait LEVER flags.js en jeu, à
  // l'ouverture du menu — donc figerait la boucle. Elle tombe ici.
  assert.match(erreursCablageMenus(donnees.menus, sans('valeurs', 'stations_placables'))[0], /carte_construction > condition sur la valeur "stations_placables", que personne ne fournit/);

  // « Et inversement » : ce que le code branche et qu'aucune carte ne cite.
  const orpheline = erreursCablageMenus(donnees.menus, { ...enregistres, actions: [...enregistres.actions, 'action_oubliee'] });
  assert.equal(orpheline.length, 1);
  assert.match(orpheline[0], /"action_oubliee" est enregistré \(actions\) mais aucune carte ne le cite/);
  console.log('OK câblage : action / état / écran / valeur manquants, et fonction orpheline, tous refusés');
}

// --- 9. Test du catalogue : un écran de plus = une entrée, aucun code ---------------
{
  // « La page du follet » de la spec, telle qu'elle arrivera : un dossier de
  // plus chez Héros, et son écran. Rien d'autre que du JSON.
  const erreurs = erreursApres((menus) => {
    ecran(menus, 'menu_heros').cartes.push({
      id: 'carte_follet', case: 2, type: 'dossier', cle_titre: 'menu.carte.heros', cle_phrase: 'menu.carte.heros_phrase',
      icone: 'visuel_icone_menu_heros', cible: 'menu_follet', condition: { valeur: 'niveau', min: 1 },
    });
    menus.push({ id: 'menu_follet', cle_titre: 'menu.carte.heros', cartes: [{ ...carte(menus, 'carte_musique'), id: 'carte_follet_reglage' }] });
  });
  assert.deepEqual(erreurs, [], 'ajouter un écran au catalogue ne demande aucune ligne de code');
  console.log('OK test du catalogue : un écran ajouté en données seules reste valide');
}

console.log('OK test_d43_a2_catalogue_menus');
