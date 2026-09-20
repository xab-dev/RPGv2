// `D-30` — plein écran : au relâchement tactile, et par le menu.
//
// Constat de Xav sur l'A04 (19/09) : la barre d'adresse reste affichée, le jeu
// n'occupe que **1440×810 sur 2340×1080** — 46 % de l'écran, échelle entière
// 3. En vrai plein écran il passerait à l'**échelle 4**.
//
// TICKET ROUVERT LE 20/09 : sur le téléphone, le plein écran ne se déclenchait
// **jamais**. La première version demandait depuis `touchstart`, en croyant que
// c'était « ce que le navigateur exige ». C'est l'inverse : le contrat
// d'« activation utilisateur » du HTML ne liste PAS `touchstart` parmi les
// événements qui l'accordent (un contact peut encore devenir un glissement) —
// il liste `keydown`, `mousedown`, `pointerdown`, `pointerup` et **`touchend`**.
// Vérifié sous Chrome : une demande sans activation est rejetée par
// `TypeError: Permissions check failed`. Le contrat « meilleur effort » avalait
// ce rejet, et le loquet « une seule tentative » interdisait toute demande
// suivante. Trois pièces saines, un enchaînement qui ne pouvait pas marcher.
//
// Le sous-système reste explicitement « meilleur effort » : un navigateur peut
// refuser, et le verrouillage en paysage n'existe pas partout. Il rattrape donc
// ses propres erreurs **à la frontière de son API publique**, jamais au niveau
// de la boucle de jeu — règle née du diagnostic freeze-musique (`audio.js`).
//
// Prouvé ici :
//   1. le crochet part au **relâchement**, jamais au contact — et jamais sur un
//      `touchcancel`, qui n'accorde aucune activation ;
//   2. la demande automatique part une fois, et UNE seule — même si le joueur
//      ressort du plein écran, on ne le harcèle pas ;
//   3. tout échec est silencieux : refus, API absente, promesse rejetée,
//      exception synchrone, retour non-promesse — le jeu continue ;
//   4. le paysage n'est tenté qu'APRÈS un plein écran réussi, et son échec à
//      lui non plus ne remonte pas ;
//   5. c'est le tactile, et lui seul, qui déclenche la demande AUTOMATIQUE —
//      le clavier, la souris et la manette n'ont aucun chemin vers elle ;
//   6. l'entrée de menu bascule dans les deux sens, son libellé lit l'**état
//      réel** (jamais un booléen interne), et un refus laisse l'état cohérent ;
//   7. sortir par le menu ne réarme pas la demande automatique ;
//   8. le redimensionnement qui suit passe par le chemin existant : l'échelle
//      change (3 -> 4), tous les calques la relisent, et le hit-test tactile
//      suit — un appui sur un bouton reste un appui sur ce bouton.
//
// AJOUT DU 20/09 (Échap court / Échap long). Constat de Xav au clavier : en
// plein écran, un seul Échap fermait le menu ET quittait le plein écran. Le
// navigateur offre de différer sa propre sortie — `navigator.keyboard.lock`
// livre Échap à la page et garde la sortie sur appui MAINTENU, qu'il annonce
// lui-même. Prouvé ici (point 10) : le verrou suit l'**état réel** et rien
// d'autre, il n'est jamais posé hors plein écran, il est rendu à la sortie,
// et son absence comme son refus ne se voient nulle part — ni exception, ni
// console, ni changement de comportement. L'appui long n'est pas testé : il
// n'est pas codé, il appartient au navigateur.
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { creerPleinEcranTactile } from '../src/plein_ecran.js';
import { creerSourceTactile } from '../src/input/touch.js';
import {
  dimensionnerCanvasRendu, echelleDepuisCanvas, calculerRectanglePresentation,
} from '../src/render.js';
import { BOUTON_MENU } from '../src/ui/hud_layout.js';
import { initialiserMenu } from '../src/ui/menu.js';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// Un faux `document` : il ne sait qu'une chose, s'il est en plein écran, et
// c'est exactement ce que le vrai expose (`fullscreenElement`).
function faireDocument({ element = null, sortiePossible = true } = {}) {
  const doc = {
    fullscreenElement: null,
    exitFullscreen() {
      if (!sortiePossible) return Promise.reject(new Error('refusé'));
      doc.fullscreenElement = null;
      return Promise.resolve();
    },
  };
  if (element) element._doc = doc;
  return doc;
}

// Un élément qui accepte le plein écran, note ce qu'on lui demande, et met à
// jour l'état réel du document — comme le ferait un navigateur.
function elementQuiAccepte(journal) {
  return {
    _doc: null,
    requestFullscreen() {
      journal.push('plein-ecran');
      if (this._doc) this._doc.fullscreenElement = this;
      return Promise.resolve();
    },
  };
}
function ecranQuiAccepte(journal) {
  return { orientation: { lock(mode) { journal.push(`paysage:${mode}`); return Promise.resolve(); } } };
}

function fausseCible() {
  return { ecouteurs: {}, addEventListener(n, f) { this.ecouteurs[n] = f; } };
}

// --- 1. Au relâchement, jamais au contact -------------------------------
// C'est LA correction du ticket rouvert. Le reste du fichier ne vaut que si
// ce bloc-ci est vrai.
{
  const appels = [];
  const cible = fausseCible();
  creerSourceTactile(cible, { surRelachement: () => appels.push('relâché') });

  cible.ecouteurs.touchstart({ touches: [{ identifier: 1, clientX: 10, clientY: 10 }] });
  assert.deepEqual(appels, [], 'le CONTACT ne déclenche rien : il n’accorde aucune activation utilisateur');

  cible.ecouteurs.touchmove({ touches: [{ identifier: 1, clientX: 30, clientY: 10 }] });
  assert.deepEqual(appels, [], 'un glissement non plus');

  cible.ecouteurs.touchend({ touches: [] });
  assert.deepEqual(appels, ['relâché'], 'le RELÂCHEMENT déclenche — c’est lui qui accorde l’activation');

  // Un contact annulé par le système (appel entrant, geste de navigation)
  // n'accorde rien : l'appeler aurait brûlé le loquet pour rien.
  cible.ecouteurs.touchstart({ touches: [{ identifier: 2, clientX: 10, clientY: 10 }] });
  cible.ecouteurs.touchcancel({ touches: [] });
  assert.deepEqual(appels, ['relâché'], 'un `touchcancel` ne déclenche jamais');

  cible.ecouteurs.touchstart({ touches: [{ identifier: 3, clientX: 20, clientY: 20 }] });
  cible.ecouteurs.touchend({ touches: [] });
  assert.deepEqual(appels, ['relâché', 'relâché'],
    'touch.js appelle à chaque relâchement — c’est le loquet de plein_ecran.js qui filtre, un seul endroit');

  // Un crochet absent ne change rien (tous les tests d'avant ce ticket).
  const cible2 = fausseCible();
  const source2 = creerSourceTactile(cible2, {});
  assert.doesNotThrow(() => cible2.ecouteurs.touchstart({ touches: [{ identifier: 1, clientX: 1, clientY: 1 }] }));
  assert.doesNotThrow(() => cible2.ecouteurs.touchend({ touches: [] }));
  assert.equal(source2.estActif(), true);

  // Le relâchement met aussi à jour l'état d'input, et AVANT d'appeler le
  // crochet : ce qu'il déclenche redimensionne la page.
  const ordre = [];
  const cible3 = fausseCible();
  const source3 = creerSourceTactile(cible3, {
    surRelachement: () => ordre.push(`crochet:${source3.instantane().move.x}`),
  });
  cible3.ecouteurs.touchstart({ touches: [{ identifier: 1, clientX: 0, clientY: 0 }] });
  cible3.ecouteurs.touchend({ touches: [] });
  assert.deepEqual(ordre, ['crochet:0'], 'le doigt relâché ne pilote plus rien quand le crochet part');
  console.log('  le crochet part au relâchement, pas au contact, et jamais sur un touchcancel');
}

// --- 2. Une fois, et une seule (demande automatique) ---------------------
{
  const journal = [];
  const element = elementQuiAccepte(journal);
  const doc = faireDocument({ element });
  const pleinEcran = creerPleinEcranTactile({ element, ecran: ecranQuiAccepte(journal), doc });

  assert.equal(pleinEcran.dejaDemande(), false);
  assert.equal(pleinEcran.demanderUneFois(), true, 'la première demande part');
  assert.equal(pleinEcran.dejaDemande(), true);

  // Les relâchements suivants ne redemandent rien. C'est la consigne :
  // « sortie du plein écran par le joueur : ne pas le redemander en boucle ».
  // Le loquet est posé sur la TENTATIVE, jamais sur le résultat — sinon un
  // refus du navigateur relancerait une demande à chaque doigt levé.
  for (let i = 0; i < 50; i += 1) {
    assert.equal(pleinEcran.demanderUneFois(), false, 'aucune seconde demande');
  }
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(journal, ['plein-ecran', 'paysage:landscape'],
    'exactement une demande de plein écran, puis une de paysage');
  console.log('  une seule demande automatique, même après 51 relâchements');
}

// --- 3. Tout échec est silencieux ----------------------------------------
// Cinq façons de rater, et aucune ne doit remonter : le jeu doit continuer
// « exactement comme aujourd'hui ».
{
  const cas = {
    'API absente': {},
    'promesse rejetée': { requestFullscreen: () => Promise.reject(new Error('Permissions check failed')) },
    'exception synchrone': { requestFullscreen() { throw new Error('geste non reconnu'); } },
    'retour non-promesse': { requestFullscreen: () => undefined },
  };

  for (const [nom, element] of Object.entries(cas)) {
    const pleinEcran = creerPleinEcranTactile({ element, ecran: null, doc: faireDocument() });
    assert.doesNotThrow(() => pleinEcran.demanderUneFois(), `"${nom}" ne doit jamais remonter`);
    assert.equal(pleinEcran.dejaDemande(), true, `"${nom}" : le loquet est posé quand même`);
    // Et la bascule explicite non plus, sur le même élément.
    await assert.doesNotReject(() => Promise.resolve(pleinEcran.basculer()),
      `"${nom}" : la bascule du menu ne rejette jamais non plus`);
  }

  // Un élément absent non plus (le jeu tourne sans DOM dans les tests), et un
  // `document` absent non plus.
  assert.doesNotThrow(() => creerPleinEcranTactile({ element: null }).demanderUneFois());
  assert.equal(creerPleinEcranTactile({ element: null }).estActif(), false,
    'sans document, l’état réel est « pas en plein écran », jamais une exception');
  await new Promise((r) => setTimeout(r, 0));
  console.log(`  ${Object.keys(cas).length + 1} façons de rater, aucune ne remonte`);
}

// --- 4. Le paysage n'est tenté qu'après un plein écran réussi ------------
{
  // a) plein écran refusé -> on ne tente même pas le paysage : verrouiller
  //    l'orientation hors plein écran est refusé partout, autant ne pas
  //    salir la console du joueur.
  const journal = [];
  const pleinEcran = creerPleinEcranTactile({
    element: { requestFullscreen: () => Promise.reject(new Error('non')) },
    ecran: ecranQuiAccepte(journal),
    doc: faireDocument(),
  });
  pleinEcran.demanderUneFois();
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(journal, [], 'pas de verrouillage de paysage si le plein écran a échoué');

  // b) plein écran accepté, paysage refusé -> silencieux lui aussi.
  const journal2 = [];
  const element2 = elementQuiAccepte(journal2);
  const pleinEcran2 = creerPleinEcranTactile({
    element: element2,
    ecran: { orientation: { lock: () => Promise.reject(new Error('non supporté')) } },
    doc: faireDocument({ element: element2 }),
  });
  assert.doesNotThrow(() => pleinEcran2.demanderUneFois());
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(journal2, ['plein-ecran'], 'le plein écran a bien eu lieu, le paysage a échoué sans bruit');
  console.log('  paysage tenté seulement après un plein écran réussi, et silencieux');
}

// --- 5. La demande AUTOMATIQUE est tactile, et rien d'autre --------------
{
  for (const fichier of ['keyboard.js', 'gamepad.js', 'input.js']) {
    const source = fs.readFileSync(path.join(RACINE, 'src', 'input', fichier), 'utf8');
    assert.ok(!/plein_ecran|requestFullscreen|surRelachement/.test(source),
      `input/${fichier} ne doit pas connaître le plein écran`);
  }
  // `ui/menu.js` non plus ne connaît l'API : il reçoit trois fonctions. Les
  // lignes de commentaire sont retirées avant de chercher — elles CITENT
  // l'API (c'est même leur travail d'expliquer ce que le module ne fait pas),
  // et un garde-fou qui interdit d'en parler pousse à moins écrire.
  const menuSrc = fs.readFileSync(path.join(RACINE, 'src', 'ui', 'menu.js'), 'utf8')
    .replace(/^\s*\/\/.*$/gm, '');
  assert.ok(!/requestFullscreen|fullscreenElement|exitFullscreen/.test(menuSrc),
    'ui/menu.js ne doit connaître que `pleinEcranActif()` / `basculerPleinEcran()`, jamais l’API du navigateur');
  console.log('  la demande automatique vient du tactile seul ; le menu ne connaît pas l’API');
}

// --- 6. La bascule du menu : aller, retour, et l'état réel fait foi ------
{
  const journal = [];
  const element = elementQuiAccepte(journal);
  const doc = faireDocument({ element });
  const pleinEcran = creerPleinEcranTactile({ element, ecran: null, doc });

  assert.equal(pleinEcran.estActif(), false, 'au départ, pas en plein écran');
  assert.equal(pleinEcran.disponible(), true, 'l’API est là, donc l’entrée de menu existe');

  assert.equal(await pleinEcran.basculer(), true, 'aller : on entre en plein écran');
  assert.equal(pleinEcran.estActif(), true);
  assert.equal(await pleinEcran.basculer(), false, 'retour : on en sort');
  assert.equal(pleinEcran.estActif(), false);

  // L'état réel fait foi, même quand personne ici n'a rien demandé : le
  // joueur sort par Échap, le document change, `estActif()` suit.
  doc.fullscreenElement = element;
  assert.equal(pleinEcran.estActif(), true, 'l’état est LU, jamais mémorisé');
  doc.fullscreenElement = null;
  assert.equal(pleinEcran.estActif(), false);

  // Sans API, l'entrée n'a pas lieu d'exister.
  assert.equal(creerPleinEcranTactile({ element: {}, doc }).disponible(), false);
  console.log('  la bascule fait l’aller ET le retour ; l’état réel fait foi');
}

// --- 7. Un refus laisse l'état cohérent, et le menu ne se réarme pas -----
{
  // Le cas de la MANETTE : elle est lue par sondage, pas par événement, donc
  // le navigateur ne voit aucun geste et refuse. On ne contourne pas.
  const doc = faireDocument();
  const pleinEcran = creerPleinEcranTactile({
    element: { requestFullscreen: () => Promise.reject(new TypeError('Permissions check failed')) },
    doc,
  });
  const obtenu = await pleinEcran.basculer();
  assert.equal(obtenu, false, 'refusé : la bascule rend l’état réel, pas ce qu’on espérait');
  assert.equal(pleinEcran.estActif(), false, 'et l’état réel n’a pas bougé');

  // « Sortir par le menu ne redéclenche pas la demande automatique » : la
  // bascule POSE le loquet. Sans ça, le premier doigt reposé après une sortie
  // volontaire remettrait le joueur en plein écran contre son gré.
  const journal = [];
  const element2 = elementQuiAccepte(journal);
  const doc2 = faireDocument({ element: element2 });
  const pe2 = creerPleinEcranTactile({ element: element2, doc: doc2 });
  await pe2.basculer();          // entré par le menu
  await pe2.basculer();          // ressorti par le menu
  assert.equal(pe2.estActif(), false);
  assert.equal(pe2.demanderUneFois(), false,
    'le doigt suivant ne redemande rien : le joueur a choisi de sortir');
  console.log('  un refus laisse l’état cohérent ; sortir par le menu ne réarme pas l’automatique');
}

// --- 8. Le redimensionnement passe par le chemin existant ----------------
// Les chiffres sont ceux de l'A04, relevés par Xav.
{
  const AVANT = { l: 1440, h: 810 };   // avec la barre d'adresse
  const APRES = { l: 2340, h: 1080 };  // plein écran réel

  const canvasAvant = dimensionnerCanvasRendu(AVANT.l, AVANT.h);
  const canvasApres = dimensionnerCanvasRendu(APRES.l, APRES.h);
  assert.equal(canvasAvant.echelle, 3, 'avant : échelle entière 3 (constat de Xav)');
  assert.equal(canvasApres.echelle, 4, 'après : échelle entière 4 (gain attendu du ticket)');

  // LA dérivation unique de l'échelle voit le changement : tout calque qui la
  // relit sur la largeur de son canvas voit 4, donc aucun ne peut garder 3.
  assert.equal(echelleDepuisCanvas(canvasAvant.largeur), 3);
  assert.equal(echelleDepuisCanvas(canvasApres.largeur), 4);
  assert.notEqual(canvasAvant.largeur, canvasApres.largeur);
  assert.notEqual(canvasAvant.hauteur, canvasApres.hauteur);

  // Le rectangle de présentation change lui aussi — c'est lui qui convertit
  // un appui écran en coordonnées logiques. S'il restait périmé, le jeu
  // s'afficherait en grand mais les doigts tomberaient à côté : un défaut
  // bien pire que la barre d'adresse.
  const rectAvant = calculerRectanglePresentation(AVANT.l, AVANT.h);
  const rectApres = calculerRectanglePresentation(APRES.l, APRES.h);
  assert.notDeepEqual(rectAvant, rectApres);

  // La preuve utile : après le passage en plein écran, un appui sur le bouton
  // MENU reste un appui sur le bouton MENU.
  for (const [nom, rect] of [['avant', rectAvant], ['après', rectApres]]) {
    const cible = fausseCible();
    const tactile = creerSourceTactile(cible, {
      versLogique: (cx, cy) => ({ x: (cx - rect.x) / rect.echelle, y: (cy - rect.y) / rect.echelle }),
    });
    cible.ecouteurs.touchstart({
      touches: [{
        identifier: 1,
        clientX: BOUTON_MENU.cx * rect.echelle + rect.x,
        clientY: BOUTON_MENU.cy * rect.echelle + rect.y,
      }],
    });
    assert.equal(tactile.instantane().menu, true, `${nom} : l'appui sur MENU doit porter`);
  }
  console.log(`  A04 : ${AVANT.l}x${AVANT.h} (échelle 3) -> ${APRES.l}x${APRES.h} (échelle 4), hit-test tactile suivi`);
}

// --- 9. L'entrée de menu : libellé, refus, et absence d'API --------------
// Le libellé est la seule chose que le joueur lit pour savoir où il en est :
// il doit dire l'état RÉEL, jamais ce qu'on avait demandé. Faux DOM minimal,
// même gabarit que les autres tests de `ui/menu.js` (copié, pas partagé :
// convention du dépôt).
{
  class ElementFactice {
    constructor(tag) {
      this.tagName = String(tag).toUpperCase();
      this.id = ''; this.dataset = {}; this.style = {}; this.children = [];
      this.parentNode = null; this._classes = []; this._listeners = {};
      this._texte = ''; this.hidden = false; this.value = '';
    }
    get className() { return this._classes.join(' '); }
    set className(v) { this._classes = String(v || '').split(/\s+/).filter(Boolean); }
    setAttribut(nom, val) {
      if (nom === 'id') this.id = val;
      else if (nom === 'class') this._classes = (val || '').split(/\s+/).filter(Boolean);
      else if (nom.startsWith('data-')) {
        const cle = nom.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        this.dataset[cle] = val;
      } else if (nom === 'value') this.value = val;
    }
    appendChild(e) { e.parentNode = this; this.children.push(e); return e; }
    addEventListener(t, f) { (this._listeners[t] ||= []).push(f); }
    declencher(t) { for (const f of this._listeners[t] || []) f({}); }
    scrollIntoView() {}
    get textContent() { return this._texte; }
    set textContent(v) { this._texte = v; this.children = []; }
    set innerHTML(html) {
      const racine = new ElementFactice('root');
      const pile = [racine];
      const regexTag = /<(\/)?([a-zA-Z0-9-]+)([^>]*?)(\/)?>|([^<]+)/g;
      let m;
      while ((m = regexTag.exec(html))) {
        const [, fermante, nomTag, attrsStr, autoFerme, texte] = m;
        if (texte !== undefined) continue;
        if (fermante) { pile.pop(); continue; }
        const el = new ElementFactice(nomTag);
        const regexAttr = /([a-zA-Z0-9-]+)(?:="([^"]*)")?/g;
        let a;
        while ((a = regexAttr.exec(attrsStr || ''))) {
          if (!a[1]) continue;
          el.setAttribut(a[1], a[2] !== undefined ? a[2] : true);
        }
        pile[pile.length - 1].appendChild(el);
        if (!autoFerme) pile.push(el);
      }
      this.children = racine.children;
      this.children.forEach((c) => (c.parentNode = this));
    }
    querySelectorAll(sel) {
      const out = [];
      const visiter = (el) => {
        for (const enfant of el.children) {
          if (sel.startsWith('#') ? enfant.id === sel.slice(1)
            : sel.startsWith('.') ? enfant._classes.includes(sel.slice(1))
              : false) out.push(enfant);
          visiter(enfant);
        }
      };
      visiter(this);
      return out;
    }
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  }
  const document = { createElement: (t) => new ElementFactice(t), body: new ElementFactice('body') };
  const i18n = { t: (cle) => cle, langueCourante: () => 'fr', definirLangue: () => {} };

  // Un vrai `plein_ecran.js` derrière le menu : on teste l'assemblage, pas
  // deux doubles qui se parlent.
  const journal = [];
  const element = elementQuiAccepte(journal);
  const doc = faireDocument({ element });
  const pleinEcran = creerPleinEcranTactile({ element, doc });

  // specs/08_menus-cartes.md (palier A4) : l'entrée « Plein écran / Quitter le
  // plein écran » est devenue une CARTE BASCULE. Son titre ne change plus ;
  // c'est sa ligne d'état qui dit l'état RÉEL — la règle de `D-30` est la même,
  // elle a seulement changé de ligne. Sa présence est une CONDITION du
  // catalogue (la valeur nommée `plein_ecran_disponible`), évaluée ici comme
  // le fait main.js.
  const MENUS = JSON.parse(fs.readFileSync(new URL('../data/menus.json', import.meta.url), 'utf8'));
  const evaluateur = (pe) => (condition) => (condition.valeur === 'plein_ecran_disponible' ? pe.disponible() : false);
  // La grille reconstruit ses cartes à chaque affichage : on RELIT toujours
  // l'élément, on ne garde jamais une référence d'un affichage à l'autre.
  const carte = (doc_, id) => doc_.body.querySelectorAll('.carte').find((c) => c.dataset.carte === id) || null;
  const etatCarte = (doc_) => carte(doc_, 'carte_plein_ecran').querySelector('.carte-etat').textContent;
  const messageDe = (doc_) => doc_.body.querySelector('.cartes-message').textContent;
  const allerAuxParametres = (menu_, doc_) => { menu_.ouvrir(); carte(doc_, 'carte_parametres').declencher('click'); };

  const menu = initialiserMenu({
    document, i18n, menus: MENUS, exporterSauvegarde: () => {}, importerSauvegarde: () => {},
    pleinEcranActif: () => pleinEcran.estActif(),
    basculerPleinEcran: () => pleinEcran.basculer(),
  });
  menu.definirEvaluateurCondition(evaluateur(pleinEcran));
  allerAuxParametres(menu, document);

  assert.ok(carte(document, 'carte_plein_ecran'), "l'API est là, donc la carte est présente");
  assert.equal(etatCarte(document), 'menu.etat.plein_ecran_non', 'hors plein écran : « Désactivé »');

  carte(document, 'carte_plein_ecran').declencher('click');
  await new Promise((r) => setTimeout(r, 0));
  menu.actualiserPleinEcran(); // ce que fait main.js sur `fullscreenchange`
  assert.equal(pleinEcran.estActif(), true);
  assert.equal(etatCarte(document), 'menu.etat.plein_ecran_oui', 'en plein écran : « Activé »');
  assert.equal(messageDe(document), '', 'aucun message quand ça marche');
  assert.equal(menu.obtenirEtatCartes().ecran, 'menu_parametres', 'une bascule ne ferme rien : l’écran reste ouvert');

  carte(document, 'carte_plein_ecran').declencher('click');
  await new Promise((r) => setTimeout(r, 0));
  menu.actualiserPleinEcran();
  assert.equal(etatCarte(document), 'menu.etat.plein_ecran_non', 'le retour aussi suit l’état réel');

  // Le joueur sort par Échap : personne n'a rien demandé, la carte suit quand
  // même — c'est tout l'intérêt de lire l'état plutôt que de le tenir.
  doc.fullscreenElement = element;
  menu.actualiserPleinEcran();
  assert.equal(etatCarte(document), 'menu.etat.plein_ecran_oui');
  doc.fullscreenElement = null;
  menu.actualiserPleinEcran();
  assert.equal(etatCarte(document), 'menu.etat.plein_ecran_non');

  // Un refus (le cas de la manette) : la carte ne bouge pas, un message
  // localisé apparaît dans l'en-tête. Jamais une carte qui ment.
  const document2 = { createElement: (t) => new ElementFactice(t), body: new ElementFactice('body') };
  const peRefuse = creerPleinEcranTactile({
    element: { requestFullscreen: () => Promise.reject(new TypeError('Permissions check failed')) },
    doc: faireDocument(),
  });
  const menu2 = initialiserMenu({
    document: document2, i18n, menus: MENUS, exporterSauvegarde: () => {}, importerSauvegarde: () => {},
    pleinEcranActif: () => peRefuse.estActif(),
    basculerPleinEcran: () => peRefuse.basculer(),
  });
  menu2.definirEvaluateurCondition(evaluateur(peRefuse));
  allerAuxParametres(menu2, document2);
  carte(document2, 'carte_plein_ecran').declencher('click');
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(etatCarte(document2), 'menu.etat.plein_ecran_non', 'un refus laisse la carte telle quelle');
  assert.equal(messageDe(document2), 'menu.plein_ecran_refuse', 'et le dit au joueur, en texte localisé');
  assert.equal(menu2.estOuvert(), true, "l'état du menu reste cohérent : rien ne s'est fermé");

  // Sans API, la carte n'existe pas (même patron que Construction hors de la
  // maison) — et sa case reste VIDE : Sauvegarde ne glisse pas à sa place.
  const document3 = { createElement: (t) => new ElementFactice(t), body: new ElementFactice('body') };
  const menu3 = initialiserMenu({
    document: document3, i18n, menus: MENUS, exporterSauvegarde: () => {}, importerSauvegarde: () => {},
  });
  menu3.definirEvaluateurCondition(evaluateur({ disponible: () => false }));
  allerAuxParametres(menu3, document3);
  assert.equal(carte(document3, 'carte_plein_ecran'), null,
    "sans API, la carte est absente : une carte qui ne peut rien faire n'a rien à faire dans le menu");
  assert.deepEqual(menu3.obtenirEtatCartes().cases, ['carte_langue', 'carte_musique', null, 'carte_sauvegarde'],
    'sa case reste vide, les autres cartes ne bougent pas');
  console.log('  la carte Plein écran suit l’état réel ; un refus le dit sans mentir');
}

// --- 10. Échap court / Échap long : le verrou suit l'état réel -----------
// Le ticket du 20/09. Ce qui est prouvé ici, c'est le CONTRAT : le verrou est
// posé quand le jeu est en plein écran, rendu quand il n'y est plus, et
// jamais posé autrement. L'appui maintenu lui-même appartient au navigateur —
// il n'y a aucun minuteur à tester parce qu'il n'y en a aucun à écrire.
{
  function faireNavigateur(journal, { lock, unlock } = {}) {
    return {
      keyboard: {
        lock: lock || ((touches) => { journal.push(`lock:${touches.join(',')}`); return Promise.resolve(); }),
        unlock: unlock || (() => { journal.push('unlock'); }),
      },
    };
  }

  // a) L'aller-retour nominal, piloté par l'état réel du document.
  {
    const journal = [];
    const element = elementQuiAccepte(journal);
    const doc = faireDocument({ element });
    const pleinEcran = creerPleinEcranTactile({ element, doc, nav: faireNavigateur(journal) });

    pleinEcran.synchroniserVerrouillageEchap();
    assert.deepEqual(journal, ['unlock'],
      'hors plein écran : on ne verrouille JAMAIS — on rend ce qui traînerait');

    journal.length = 0;
    await pleinEcran.basculer();
    assert.equal(pleinEcran.estActif(), true);
    pleinEcran.synchroniserVerrouillageEchap();   // ce que fait main.js sur `fullscreenchange`
    assert.deepEqual(journal, ['plein-ecran', 'lock:Escape'],
      'en plein écran : Échap est demandé à la page, et lui seul (jamais le clavier entier)');

    journal.length = 0;
    await pleinEcran.basculer();                  // sortie par le menu
    assert.equal(pleinEcran.estActif(), false);
    pleinEcran.synchroniserVerrouillageEchap();
    assert.deepEqual(journal, ['unlock'], 'sorti : le verrou est rendu, et rien n’est reverrouillé');
  }

  // b) Une sortie que PERSONNE ici n'a demandée (Échap maintenu, geste
  //    système) : c'est l'état réel qui tranche, jamais un booléen tenu de
  //    notre côté — la raison d'être de tout ce module.
  {
    const journal = [];
    const element = elementQuiAccepte(journal);
    const doc = faireDocument({ element });
    const pleinEcran = creerPleinEcranTactile({ element, doc, nav: faireNavigateur(journal) });
    await pleinEcran.basculer();
    journal.length = 0;
    doc.fullscreenElement = null;                 // le navigateur est sorti tout seul
    pleinEcran.synchroniserVerrouillageEchap();
    assert.deepEqual(journal, ['unlock'], 'l’état réel fait foi, même quand la sortie vient du navigateur');
  }

  // c) Amélioration progressive : API absente (Firefox, Safari), partielle,
  //    contexte non sécurisé. Rien ne doit se voir — pas même une exception
  //    qui remonterait jusqu'à l'écouteur `fullscreenchange` de main.js.
  {
    const element = elementQuiAccepte([]);
    const doc = faireDocument({ element });
    doc.fullscreenElement = element;              // en plein écran, cas le plus exigeant
    for (const nav of [null, {}, { keyboard: null }, { keyboard: {} }, { keyboard: { lock: 'pas une fonction' } }]) {
      assert.doesNotThrow(() => creerPleinEcranTactile({ element, doc, nav }).synchroniserVerrouillageEchap(),
        'API absente ou partielle : silence complet, le jeu continue exactement comme avant');
    }
    doc.fullscreenElement = null;
    for (const nav of [null, {}, { keyboard: {} }, { keyboard: { unlock: 42 } }]) {
      assert.doesNotThrow(() => creerPleinEcranTactile({ element, doc, nav }).synchroniserVerrouillageEchap(),
        'à la sortie non plus, une API absente ne casse rien');
    }
  }

  // d) L'API est là mais elle refuse : promesse rejetée, exception synchrone,
  //    retour qui n'est pas une promesse, `unlock` qui lève. Quatre refus,
  //    quatre silences — et surtout aucun rejet NON RATTRAPÉ, qui salirait la
  //    console du joueur sans rien lui apprendre.
  {
    const element = elementQuiAccepte([]);
    const doc = faireDocument({ element });
    doc.fullscreenElement = element;

    const clavier = (lock, unlock = () => {}) => ({ keyboard: { lock, unlock } });

    const rejet = creerPleinEcranTactile({ element, doc, nav: clavier(() => Promise.reject(new Error('refusé'))) });
    assert.doesNotThrow(() => rejet.synchroniserVerrouillageEchap(), 'promesse rejetée : rattrapée à la frontière');

    const leve = creerPleinEcranTactile({ element, doc, nav: clavier(() => { throw new TypeError('contexte non sécurisé'); }) });
    assert.doesNotThrow(() => leve.synchroniserVerrouillageEchap(), 'exception synchrone : rattrapée aussi');

    const sansPromesse = creerPleinEcranTactile({ element, doc, nav: clavier(() => undefined) });
    assert.doesNotThrow(() => sansPromesse.synchroniserVerrouillageEchap(), 'un retour qui n’est pas une promesse ne casse rien');

    doc.fullscreenElement = null;
    const unlockQuiLeve = creerPleinEcranTactile({
      element, doc, nav: clavier(() => Promise.resolve(), () => { throw new Error('non'); }),
    });
    assert.doesNotThrow(() => unlockQuiLeve.synchroniserVerrouillageEchap(), 'même `unlock` a le droit d’échouer');
  }

  // e) « `ui/menu.js` et l'input n'apprennent rien » (§4.3 du ticket) : ils
  //    reçoivent un Échap comme d'habitude. Un seul module connaît cette API,
  //    et c'est celui qui connaît déjà le plein écran.
  for (const fichier of ['src/ui/menu.js', 'src/input/input.js', 'src/input/keyboard.js', 'src/ui/grille_cartes.js']) {
    const source = fs.readFileSync(path.join(RACINE, fichier), 'utf8');
    assert.ok(!/keyboard\s*\.\s*(lock|unlock)|navigator\.keyboard/.test(source),
      `${fichier} ne doit rien savoir du verrouillage clavier : c’est l’affaire de plein_ecran.js`);
  }

  // Laisse une microtâche aux promesses rejetées ci-dessus : un rejet non
  // rattrapé ferait tomber le processus, et c'est exactement ce qu'on refuse
  // d'infliger à la console du joueur.
  await Promise.resolve();
  console.log('  Échap court / Échap long : le verrou suit l’état réel, et son absence ne se voit pas');
}

console.log('OK test_d30_plein_ecran_tactile');
