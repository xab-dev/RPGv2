// `D-111`, palier B de `specs/09_reglages-graphiques.md` : le catalogue des
// réglages graphiques, sa résolution, et la sauvegarde. **Zéro changement
// visible** — aucun levier n'est encore branché ; ce fichier prouve ce qui
// doit être vrai AVANT qu'ils le soient.
//
// Ce qu'on ne teste pas, et pourquoi : aucune valeur de réglage n'est épinglée
// (règle `D-52`). Les nombres des presets appartiennent à Xav et se règlent
// dans `data/`. Ce qui se teste est un contrat — le preset neutre ne change
// rien, chaque palier couvre chaque levier, un réglage inconnu ne se replie
// pas en silence, un import n'impose pas le réglage d'un autre appareil.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerCataloguesDepuisDisque, chargerLocalesDepuisDisque } from '../src/io_node.js';
import { validerCatalogues, construireRegistre } from '../src/registry.js';
import { SCHEMAS } from '../src/schemas.js';
import { resoudreGraphismes, signauxAppareil } from '../src/main.js';
import {
  resoudrePreset, valeurLevier, presetInferieur, doitDescendre, cleEtatCarte, leviersNonNeutres,
} from '../src/qualite.js';
import {
  conserverReglagesAppareil, REGLAGES_APPAREIL, saveNeuve, creerStoreMemoire,
  importerSauvegarde, sauvegarder, charger,
} from '../src/save.js';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// TOUS les catalogues : `validerCatalogues` valide le jeu complet (les
// références croisées n'ont pas de sens sur une moitié de catalogue).
const { donnees, erreurs } = await chargerCataloguesDepuisDisque(path.join(RACINE, 'data'), Object.keys(SCHEMAS));
assert.deepEqual(erreurs, [], 'les catalogues doivent charger');

// Le catalogue réel, pas une maquette : c'est lui qui part en ligne.
const config = donnees.graphismes.find((e) => e.id === 'graphismes_presets');
assert.ok(config, 'graphismes.json doit déclarer graphismes_presets');

// 1. LE CONTRAT DE NON-RÉGRESSION DU PALIER B : « Moyen = l'état actuel ».
// Énoncé comme une propriété (aucun levier ne s'écarte de la valeur neutre),
// jamais comme une liste de nombres — il restera vrai le jour où un levier
// s'ajoutera. Si Xav voit une différence en Moyen, c'est un défaut.
{
  assert.deepEqual(leviersNonNeutres(config, 'moyen'), [], 'le preset Moyen ne doit toucher à rien');
  assert.ok(leviersNonNeutres(config, 'bas').length > 0, 'Bas doit bien retirer quelque chose, sinon il ne sert à rien');
}

// 2. Chaque palier réel donne une valeur à CHAQUE levier déclaré, et `auto`
// n'en donne aucune (il se résout, il n'est pas un palier jouable).
{
  for (const palier of config.paliers) {
    if (palier.id === config.defaut) {
      assert.equal(palier.leviers, undefined, `"${palier.id}" est le palier par défaut : il se résout, il n'a pas de leviers`);
      assert.throws(() => valeurLevier(config, palier.id, config.leviers[0]), /inconnu ou non résolu/);
      continue;
    }
    for (const levier of config.leviers) {
      assert.equal(typeof valeurLevier(config, palier.id, levier), 'number', `${palier.id} > ${levier}`);
    }
  }
  assert.throws(() => valeurLevier(config, 'moyen', 'levier_invente'), /non déclaré/);
}

// 3. La résolution. Un seul signal de départ (§5.1), et **Haut n'est jamais
// choisi par Auto** : c'est un choix du joueur.
{
  const grossier = { pointeurGrossier: true };
  const fin = { pointeurGrossier: false };

  assert.equal(resoudrePreset(undefined, fin, config).preset, 'moyen', 'absent = jamais choisi = auto');
  assert.equal(resoudrePreset(undefined, fin, config).auto, true);
  assert.equal(resoudrePreset('auto', grossier, config).preset, 'bas', 'pointeur grossier -> Bas');
  assert.equal(resoudrePreset('haut', grossier, config).preset, 'haut', 'un choix du joueur ne se discute pas');
  assert.equal(resoudrePreset('haut', grossier, config).auto, false);

  for (const signaux of [grossier, fin]) {
    assert.notEqual(resoudrePreset('auto', signaux, config).preset, 'haut', 'Auto ne choisit jamais Haut');
  }

  // Une valeur inconnue (sauvegarde bricolée, preset retiré du catalogue) :
  // résolue comme le défaut ET signalée — jamais un repli silencieux.
  const inconnu = resoudrePreset('ultra', fin, config);
  assert.equal(inconnu.preset, 'moyen');
  assert.match(inconnu.avertissement, /ultra/);
  assert.equal(resoudrePreset('auto', fin, config).avertissement, null, 'un réglage valide n\'avertit de rien');
}

// 4. Les crans de la descente automatique : l'ordre du catalogue fait foi, et
// en Bas plus rien ne descend.
{
  assert.equal(presetInferieur(config, 'haut'), 'moyen');
  assert.equal(presetInferieur(config, 'moyen'), 'bas');
  assert.equal(presetInferieur(config, 'bas'), null, 'au plancher, plus rien ne descend');
}

// 5. `doitDescendre` : pure, sans horloge — la durée de la fenêtre EST la
// somme des deltas. Les seuils viennent du catalogue.
{
  const seuils = {
    fenetre_ms: config.auto.fenetre_ms,
    part_frames_lentes: config.auto.part_frames_lentes,
    seuil_frame_lente_ms: 20,
  };
  const frames = (nb, ms) => new Array(nb).fill(ms);

  // Fenêtre incomplète : on ne décide rien, quelle que soit la casse.
  assert.equal(doitDescendre(frames(10, 30), seuils).descendre, false, 'fenêtre incomplète -> aucune décision');
  assert.equal(doitDescendre([], seuils).descendre, false);

  // 600 frames à 16,7 ms = 10 s fluides.
  assert.equal(doitDescendre(frames(600, 16.7), seuils).descendre, false, '60 fps -> on ne descend pas');

  // Même fenêtre, mais une part de frames lentes au-dessus du seuil.
  const partLente = config.auto.part_frames_lentes;
  const lentes = Math.ceil(600 * partLente) + 5;
  const melange = [...frames(lentes, 30), ...frames(600 - lentes, 16.7)];
  assert.equal(doitDescendre(melange, seuils).descendre, true, 'trop de frames lentes -> un cran de moins');

  // Juste SOUS le seuil : on ne descend pas. La frontière est une frontière,
  // pas une zone floue.
  const sousLeSeuil = Math.floor(600 * partLente) - 1;
  const limite = [...frames(sousLeSeuil, 30), ...frames(600 - sousLeSeuil, 16.7)];
  assert.equal(doitDescendre(limite, seuils).descendre, false, 'sous le seuil -> on reste');
}

// 6. Les textes des paliers vivent dans les locales, FR **et** EN — un palier
// ajouté sans sa traduction doit se voir ici, pas à l'écran.
{
  const dictionnaires = await chargerLocalesDepuisDisque(path.join(RACINE, 'locales'), ['fr', 'en']);
  for (const palier of config.paliers) {
    for (const langue of ['fr', 'en']) {
      assert.ok(
        typeof dictionnaires[langue][palier.cle_etat] === 'string',
        `${palier.cle_etat} manque dans locales/${langue}.json`
      );
    }
  }
  // `auto` affiche le palier qu'il a RÉSOLU (« Auto (Bas) »), jamais « Auto »
  // seul — et par une clé unique, parce qu'un lecteur d'état rend une clé et
  // que composer « Auto (…) » en code figerait la ponctuation de toutes les
  // langues (palier D).
  assert.equal(
    cleEtatCarte(config, 'auto', 'bas'),
    config.paliers.find((p) => p.id === 'bas').cle_etat_auto,
  );
  assert.equal(
    cleEtatCarte(config, undefined, 'moyen'),
    config.paliers.find((p) => p.id === 'moyen').cle_etat_auto,
    "un réglage absent, c'est Auto : même affichage",
  );
  assert.equal(
    cleEtatCarte(config, 'haut', 'haut'),
    config.paliers.find((p) => p.id === 'haut').cle_etat,
    'choisi par le joueur : son nom seul, sans « Auto »',
  );
}

// 7. `role` est requis sur CHAQUE effet, sans repli — c'est lui qui décide ce
// que Bas a le droit de retirer. Et ce qui dit quelque chose au joueur reste
// (§4.2) : le texte de gain enseigne la boucle, les paupières sont la mort.
{
  const erreursValidation = validerCatalogues(donnees);
  assert.deepEqual(erreursValidation, [], 'les catalogues réels doivent rester valides');

  for (const effet of donnees.effets) {
    assert.ok(['cosmetique', 'information'].includes(effet.role), `${effet.id} doit déclarer son rôle`);
  }
  const role = (id) => donnees.effets.find((e) => e.id === id).role;
  assert.equal(role('effet_texte_gain'), 'information', 'le « +1 » enseigne la boucle : Bas le garde');
  assert.equal(role('effet_clignement_respawn'), 'information', 'les paupières disent la mort : Bas les garde');
  assert.equal(role('effet_poussiere'), 'cosmetique');

  // Un effet sans rôle ne démarre pas le jeu : c'est tout l'intérêt d'un
  // champ requis sans repli.
  const sansRole = donnees.effets.map((e) => (e.id === 'effet_poussiere' ? { ...e, role: undefined } : e));
  const avecRoleInvente = donnees.effets.map((e) => (e.id === 'effet_poussiere' ? { ...e, role: 'joli' } : e));
  assert.ok(validerCatalogues({ ...donnees, effets: sansRole }).length > 0, 'un effet sans rôle doit tomber au boot');
  assert.ok(validerCatalogues({ ...donnees, effets: avecRoleInvente }).length > 0, 'un rôle inventé doit tomber au boot');
}

// 8. Le schéma du catalogue : un palier qui oublie un levier ne démarre pas.
{
  const amputer = (idPalier, levier) => donnees.graphismes.map((e) => ({
    ...e,
    paliers: e.paliers.map((p) => (p.id === idPalier ? { ...p, leviers: { ...p.leviers, [levier]: undefined } } : p)),
  }));
  const erreursAmputees = validerCatalogues({ ...donnees, graphismes: amputer('bas', config.leviers[0]) });
  assert.ok(erreursAmputees.length > 0, 'un palier qui n\'a pas de valeur pour un levier doit tomber au boot');
  assert.ok(
    erreursAmputees.some((e) => e.includes(config.leviers[0])),
    'et l\'erreur doit nommer le levier manquant, pas seulement dire « invalide »'
  );

  // Un levier ajouté à la liste sans être donné aux paliers : même chose.
  const leviersEnPlus = donnees.graphismes.map((e) => ({ ...e, leviers: [...e.leviers, 'flou_de_mouvement'] }));
  assert.ok(validerCatalogues({ ...donnees, graphismes: leviersEnPlus }).length > 0, 'un levier déclaré et non donné doit tomber au boot');
}

// 9. La sauvegarde : absent = jamais choisi (§5.3). **Aucune migration**, la
// version de schéma ne bouge pas — c'est le patron du volume (`D-64`).
{
  const neuve = saveNeuve();
  assert.equal('graphismes' in neuve.settings, false, 'une partie neuve n\'écrit AUCUN réglage graphique');
  assert.equal(resoudrePreset(neuve.settings.graphismes, { pointeurGrossier: false }, config).auto, true);
}

// 10. Le piège de l'export (§5.3) : le réglage appartient à l'APPAREIL. Une
// sauvegarde exportée d'un PC en « haut » ne l'impose pas au téléphone.
{
  assert.ok(REGLAGES_APPAREIL.includes('graphismes'));

  const duPc = { ...saveNeuve(), settings: { lang: 'en', musique: false, graphismes: 'haut' } };
  const duTelephone = { ...saveNeuve(), settings: { lang: 'fr', musique: true, graphismes: 'bas' } };

  const fusionne = conserverReglagesAppareil(duPc, duTelephone);
  assert.equal(fusionne.settings.graphismes, 'bas', 'le téléphone garde SON réglage graphique');
  assert.equal(fusionne.settings.lang, 'en', 'la langue, elle, appartient à la partie et suit l\'import');
  assert.equal(fusionne.settings.musique, false, 'la musique aussi');

  // L'absence est une valeur : un appareil qui n'a jamais choisi ne se fait
  // pas imposer le choix de l'autre.
  const jamaisChoisi = { ...saveNeuve(), settings: { lang: 'fr', musique: true } };
  assert.equal('graphismes' in conserverReglagesAppareil(duPc, jamaisChoisi).settings, false);
  // Aucun appareil de référence (premier import sur une machine vierge) : le
  // réglage du fichier ne s'installe pas pour autant. Cette machine n'a jamais
  // choisi, donc elle reste en `auto` — le même raisonnement que juste
  // au-dessus, poussé jusqu'au bout : ce qui appartient à l'appareil ne
  // s'hérite pas d'un fichier, même quand l'appareil n'a rien à dire.
  assert.equal('graphismes' in conserverReglagesAppareil(duPc, null).settings, false);
}

// 11. Le chemin réel de l'import, avec un store : c'est lui qui compte, pas
// seulement la fonction pure (règle `D-72` — un harnais qui recompose la
// décision à la main ne prouve pas le câblage).
{
  const store = creerStoreMemoire();
  await sauvegarder(store, { ...saveNeuve(), settings: { lang: 'fr', musique: true, graphismes: 'bas' } });
  await importerSauvegarde(store, { ...saveNeuve(), settings: { lang: 'en', musique: false, graphismes: 'haut' } });

  const { payload } = await charger(store);
  assert.equal(payload.settings.graphismes, 'bas', 'l\'import ignore le réglage graphique du fichier');
  assert.equal(payload.settings.lang, 'en', 'et laisse passer le reste');
}

// 12. Le câblage du démarrage, par la VRAIE fonction de `main.js` (règle
// `D-72` : ce que `demarrerJeu` fait ne se rejoue pas à la main dans un test,
// il s'extrait et s'appelle). `demarrerJeu` n'est jamais exécuté headless —
// `resoudreGraphismes` et `signauxAppareil`, si.
{
  const registre = construireRegistre(donnees);
  const pc = { matchMedia: () => ({ matches: false }) };
  const telephone = { matchMedia: () => ({ matches: true }) };

  assert.equal(resoudreGraphismes(registre, saveNeuve(), pc).preset, 'moyen');
  assert.equal(resoudreGraphismes(registre, saveNeuve(), telephone).preset, 'bas');
  assert.equal(resoudreGraphismes(registre, saveNeuve(), pc).auto, true);

  // Un environnement sans `matchMedia` (ou qui lève) ne doit rien retirer au
  // joueur : on ne devine pas, on prend Moyen.
  assert.equal(signauxAppareil(undefined).pointeurGrossier, false);
  assert.equal(signauxAppareil({ matchMedia: () => { throw new Error('non'); } }).pointeurGrossier, false);

  // Un réglage inconnu venu d'une sauvegarde ne fige pas le démarrage : il
  // est résolu et signalé.
  const bricolee = { ...saveNeuve(), settings: { lang: 'fr', musique: true, graphismes: 'ultra' } };
  const resolu = resoudreGraphismes(registre, bricolee, pc);
  assert.equal(resolu.preset, 'moyen');
  assert.match(resolu.avertissement, /ultra/);
}

console.log('OK test_d111_qualite_catalogue — Moyen ne change rien, et le réglage appartient à l\'appareil');
