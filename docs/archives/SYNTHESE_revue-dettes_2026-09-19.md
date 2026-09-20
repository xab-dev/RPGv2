---
projet: RPG V2
episode/session: Revue des dettes du 2026-09-19
type: synthèse
version: 1.0.0
statut: brouillon
catégorie: Doc
date: 2026-09-19
genere_par: claude
verifie_par: xav
---

# SYNTHESE — revue des dettes, compétences, avancement (2026-09-19)

Emplacement proposé : `docs/SYNTHESE_revue-dettes_2026-09-19.md`. Écrite à partir de ce qui s'est réellement passé dans la conversation, pas de ce qu'on aurait aimé qu'il se passe.

## 1. La conversation en une page

**Point de départ (midi).** Cinq tickets de polish livrés dans la nuit, validés à la manette. Demande : un bilan avant d'ajouter des monstres.

**Ce que le bilan a fait remonter.**
- Une dette de rendu mesurée : `dessiner()` coûte 12 ms sans aucun monstre, et 18 ms sur les frames où le calque de la carte est reconstruit (41 fois en 10 s). Marge restante avant 07 : 4,6 ms.
- Une liste de dettes où quatre choses différentes étaient mélangées : tes décisions, tes validations en jeu, les défauts de code, les erreurs de doc.
- Des documents périmés côté projet, et un `CLAUDE.md` de 77 Ko pour un plafond indicatif de 300 lignes.

**Ce qui a été produit.**
- `docs/DOC_suivi-dettes.md` (v1.5.1) : la seule liste de ce qui est dû, avec identifiants stables.
- `docs/NS_decisions-revue-dettes_2026-09-19.md` (v1.1.0) : le ticket doc qui répercute tout dans `CLAUDE.md`, la roadmap et la carte mentale.
- `specs/07_chaos-nocturne.md` (v1.1.0) : réécrite d'après tes décisions, réduite au palier 1.

**Ce qui a été décidé.** 11 questions sur 15, plus une ouverte en route et fermée dans la foulée (`Q-17`). Les plus structurantes :
- Méthode : micro-tickets, un ticket = un commit, push ponctuels à ta main, le suivi comme liste unique, validation en jeu suffisante avec un album de captures par jalon.
- Carte Maison : Champs en deux grands L, Campagne neutre, zones en rectangles.
- Chaos nocturne : paliers aux niveaux 5, 10 et 15, en données ; monstres qui errent dans un domaine au lieu d'être attachés à un piquet.
- Arc de progression jusqu'au niveau 30, avec un critère de fin mesurable : **la boucle de 2 heures**.
- Deux décisions verrouillées révisées en connaissance de cause : le seuil « niveau 5 » de la zone de monstres est abandonné ; « compétences au niveau 30 » est notée comme en tension avec la règle des deux axes (`Q-18`).

**Ce qui a été tranché par les faits.**
- Migrations de sauvegarde : validées sur tes dix sauvegardes réelles.
- Saccades : le correctif de la nuit a touché l'outil de mesure, pas le jeu. Établi par toi, dans git, ligne par ligne.
- Branche de polish : fusionnée dans `main` et poussée.
- Plugin bloquant : cause identifiée (synchronisé depuis le compte claude.ai, donc retéléchargé à chaque démarrage), désactivé proprement.

**Ce qui reste ouvert.** `Q-07` (construire dans les Champs), `Q-10`, `Q-11`, `Q-12` (règles de méthode), `Q-18`. Le relevé fps de nuit. Tes deux captures du puits.

## 2. Bilan de compétences, sur pièces

Tu dis avoir progressé « un petit peu ». Voici ce que les faits montrent, domaine par domaine. Je distingue ce que tu as **fait toi-même** de ce que tu as **suivi avec de l'aide**, parce que ce n'est pas le même niveau.

### Ligne de commande et git — le vrai saut de la journée

*Fait toi-même :* `git branch`, `status`, `log` filtré par fichier et par date, `show --stat`, `show --numstat`, `--no-pager`, puis la chaîne complète `add` → `commit` → `switch` → `merge` → `push`, et la vérification finale. Côté Claude Code : `claude plugin list` et `disable`.

*Ce que ça prouve :* ce matin, « branche » et « main » ne te disaient rien, et tu me l'as dit franchement, ce qui est la bonne réaction. Ce soir tu as mené une fusion en avance rapide et tu sais lire où pointent `HEAD`, `main` et `origin/main`. Surtout, tu as choisi de le faire toi-même plutôt que de le déléguer à Claude Code. C'est ce choix qui fait progresser.

*Limite honnête :* tu as exécuté des commandes que je t'ai données, dans l'ordre que je t'ai donné. Tu n'as pas encore eu à te sortir seul d'une situation anormale (un conflit de fusion, un fichier enregistré par erreur). C'est le prochain palier, et il viendra tout seul.

### Débogage et test — ton point fort, et il ne date pas d'aujourd'hui

*Fait toi-même :*
- Un protocole de mesure reproductible, refait à l'identique pour que les deux relevés soient comparables. C'est de la méthode expérimentale, et ça se voit.
- Sur une seule capture du puits, deux défauts que le test automatique de la nuit avait laissés passer : les mâts qui ne touchent pas le sol, et deux perspectives dans le même objet. Le test était vert ; ton œil avait raison.
- Le bouton MENU tactile à cheval sur le bandeau : même chose, test vert, défaut réel.
- Le tapotement du joystick tactile en Construction : un défaut d'usage que personne n'avait formulé.
- Dix sauvegardes réelles conservées à toutes les étapes du jeu, et rejouées. Peu de développeurs solo ont ce réflexe.

*Le point à travailler, dit sans détour :* sur les saccades, tu as tenu pour acquis un souvenir (« je l'ai vu de mes yeux ») contre le journal écrit. Le souvenir était sincère et partiellement juste, puisqu'il y avait bien une cause racine et un correctif avec le mot « cumulatif », mais il portait sur l'instrument et pas sur le jeu. Ce qui compte, c'est la suite : tu as accepté de vérifier, tu l'as fait toi-même, et tu as lu le résultat sans le tordre. La règle à en tirer : **une mesure ou un diff passe avant un souvenir, y compris le tien, y compris le mien.** Je me suis trompé deux fois aujourd'hui de la même manière (tes conventions de nommage, et un test git posé de façon trop binaire).

### Markdown et documentation — solide

*Fait toi-même :* tu as corrigé mon schéma ASCII de la carte pour y exprimer ta vraie intention, ce qui suppose de lire et d'écrire ce format sans y penser. Tu as rangé les fichiers aux bons endroits, tenu tes conventions de nommage, archivé les fiches.

*Ce qui a progressé :* moins le format que l'usage. Tu es passé de « des documents qui racontent » à « des documents qui pilotent » : identifiants, statuts, une seule source de vérité.

### JavaScript — la progression la plus modeste, et il faut le dire

*Avec de l'aide :* tu as eu sous les yeux un vrai diff de `render.js` et tu as suivi ma lecture : lignes ajoutées, retirées, inchangées, paramètre optionnel, branchement de mesure.

*Honnêtement :* tu n'as ni écrit ni modifié de JavaScript aujourd'hui, et tu n'as pas lu ce diff seul. Tu as gagné de la **familiarité** : tu sais à quoi ressemble un diff et ce qu'une ligne sans `+` ni `-` veut dire. Ce n'est pas encore de la lecture autonome. Si tu veux que ça avance, le levier est simple : à chaque micro-ticket, ouvre le diff du commit avant de valider, et essaie de dire en une phrase ce qu'il fait avant de me demander.

### Claude Code — compréhension du système, plus seulement de l'outil

*Fait toi-même :* diagnostic puis désactivation du plugin, vérification par `/hooks`.

*Ce qui a progressé :* tu sais maintenant d'où viennent les plugins (marketplace, dossier de compétences, compte claude.ai), pourquoi supprimer un dossier ne suffit pas, ce qu'est un hook et pourquoi un plugin bâti sur des hooks peut figer une session alors que les autres non. Tu as aussi compris ce que coûte le contexte : un `CLAUDE.md` trop gros et des plugins inutiles se paient à chaque session.

*Le réflexe juste que tu as eu :* t'inquiéter qu'un plugin nommé « sécurité » soit le seul à bloquer, et demander avant de conclure.

### Direction de jeu — là où tu es le plus fort, et ce n'est pas dans ta liste

Tu ne l'as pas cité, mais c'est ce qui ressort le plus nettement.
- À ma question binaire sur la laisse, tu as répondu « les deux », et tu avais raison : la question était mal posée. Tes exigences (pas d'endroit où il y a toujours un monstre, qu'il puisse revenir, qu'il puisse surprendre) ont produit un meilleur système que mes deux options.
- « Sauvegarde neuve, deux heures, niveau 30, envie de changer d'endroit » : une définition de « fini » mesurable. C'est rare, et c'est précieux.
- Le retour « monter de niveau à la cuisine devient pénible vers le niveau 7 » est une donnée de playtest qui a placé le premier palier de monstres au bon endroit.
- Tu as gardé « retenir par défaut » pour Claude Code alors que je le durcissais sans raison.

### Méthode de travail

Le changement le plus rentable de la journée est une décision, pas une compétence : **renoncer aux grosses sessions de nuit au profit de micro-tickets.** La preuve est dans ton propre historique : la nuit du polish, faite ticket par ticket, se relit d'un coup d'œil ; le commit fourre-tout de la veille nous a coûté une heure d'enquête.

## 3. Avancement du projet

**Où en est le jeu.** Phases 0 à 3 et Construction closes. Polish des étapes 1 à 6 livré et validé à la manette. Tout est sur `main`, poussé sur GitHub. 66 fichiers de test verts au dernier décompte.

**Ce qui n'a pas avancé aujourd'hui, et c'est voulu.** Depuis midi, **aucune ligne de code du jeu n'a changé.** La journée a servi à savoir exactement où on en est, à décider, et à réparer l'outillage. La liste des dettes est plus longue ce soir que ce matin (6 lignes nouvelles, `D-13` à `D-18`) : ce n'est pas le jeu qui s'est dégradé, ce sont des défauts et des besoins qui étaient invisibles et qui ont maintenant un nom, un propriétaire et un ordre.

**La suite, dans l'ordre proposé.**
1. Session doc en cours : application de la NS. Puis mise à jour des fichiers du projet.
2. `D-17` — bouton MENU tactile sous le bandeau.
3. `D-13` — buffs dans le bandeau.
4. `D-02` puis `D-01` — ventiler le coût de `dessiner()`, puis corriger la reconstruction du calque. **À faire avant 07** : c'est la seule chose que je considère comme bloquante.
5. `07`, un palier par session : zones, puis la nuit et le seuil, puis le comportement, puis le signal visuel.
6. `D-16` — le puits, quand tes deux captures sont prêtes.

En parallèle, côté conception : reprendre à `Q-07`, puis les trois règles de méthode, puis les specs que tu as listées toi-même avant toute nouvelle carte (ressources, crafts, armes, compétences).

**Les trois risques que je surveille.**
- **Le budget de rendu.** 4,6 ms de marge, c'est peu. Si on ajoute des monstres avant d'avoir compris où partent les 12 ms, on accusera les monstres à tort.
- **La portée de la carte Maison.** Elle vient de passer de « première région » à « deux heures de jeu, niveau 30 ». C'est cohérent avec ta méthode, mais c'est une grosse extension : sans specs écrites une par une, elle peut s'étaler.
- **La sauvegarde hors machine.** Avec des push ponctuels, ce qui n'est pas poussé ne vit que sur ton disque, sauvegardes et captures comprises. Un push en fin de journée de travail suffit à couvrir le risque.

## 4. En une phrase

Aujourd'hui tu n'as pas fait avancer le jeu, tu as fait avancer ta capacité à le faire avancer : tu sais où tu en es, tu sais lire ce que Claude Code a réellement fait, et tu as une méthode qui rend chaque session vérifiable.
