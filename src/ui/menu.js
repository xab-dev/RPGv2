// Menu minimal (§3.6) : bascule de langue FR/EN, export/import de
// sauvegarde. Ouvert par le verbe MENU. Rien ici ne touche le DOM au
// chargement du module : tout se passe dans initialiserMenu(), appelée par
// main.js une fois le document prêt.

export function initialiserMenu({ document, i18n, exporterSauvegarde, importerSauvegarde }) {
  const conteneur = document.createElement('div');
  conteneur.id = 'menu';
  conteneur.hidden = true;
  conteneur.innerHTML = `
    <h2 data-cle="menu.titre"></h2>
    <label data-cle="menu.langue"></label>
    <select id="menu-langue"><option value="fr">FR</option><option value="en">EN</option></select>
    <button id="menu-exporter" data-cle="menu.exporter" type="button"></button>
    <input id="menu-importer" type="file" accept="application/json" />
    <button id="menu-fermer" data-cle="menu.fermer" type="button"></button>
  `;
  document.body.appendChild(conteneur);

  function retraduire() {
    conteneur.querySelectorAll('[data-cle]').forEach((el) => {
      el.textContent = i18n.t(el.dataset.cle);
    });
  }
  retraduire();

  const selectLangue = conteneur.querySelector('#menu-langue');
  selectLangue.value = i18n.langueCourante();
  selectLangue.addEventListener('change', () => {
    i18n.definirLangue(selectLangue.value);
    retraduire();
  });

  conteneur.querySelector('#menu-exporter').addEventListener('click', () => {
    exporterSauvegarde();
  });

  conteneur.querySelector('#menu-importer').addEventListener('change', (e) => {
    const fichier = e.target.files[0];
    if (fichier) importerSauvegarde(fichier);
  });

  conteneur.querySelector('#menu-fermer').addEventListener('click', () => {
    conteneur.hidden = true;
  });

  return {
    ouvrir() {
      conteneur.hidden = false;
      retraduire();
    },
    fermer() {
      conteneur.hidden = true;
    },
    estOuvert() {
      return !conteneur.hidden;
    },
  };
}
