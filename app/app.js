// app.js — Le chef d'orchestre : charge le contenu, construit la session du jour,
// affiche chaque étape et enregistre ton progrès.
import { charger, sauvegarder, aujourdhui, ajouterJours } from './stockage.js';
import { noter, estDue, estMaitrisee } from './srs.js';
import * as micro from './enregistreur.js';

// ───────── Réglages ─────────
const LANGUES = {
  sw: { nom: 'Kiswahili', drapeau: '🇹🇿', objectif: 560 },
  rw: { nom: 'Ikinyarwanda', drapeau: '🇷🇼', objectif: 420 },
};
const DEBUT = '2026-11-16';
const FIN = '2027-06-01';
const JOURS_SWAHILI = [1, 2, 4, 6]; // lun, mar, jeu, sam (0 = dimanche)
const NOUVELLES_PAR_SESSION = 5;
const MAX_REVISIONS = 15;

const app = document.getElementById('app');
const phrases = { sw: [], rw: [] };
let progres = charger();
let session = null;

// ───────── Audio ─────────
// Un seul lecteur réutilisé (iOS le « déverrouille » au premier toucher).
const lecteur = new Audio();
const audiosPrets = new Map(); // chemin -> URL blob, préchargée au début de la session

function jouer(phrase) {
  lecteur.onended = null;
  if (!phrase.audio) return;
  lecteur.src = audiosPrets.get(phrase.audio) ?? phrase.audio;
  lecteur.play().catch(() => {});
}

async function precharger(liste) {
  for (const p of liste) {
    if (!p.audio || audiosPrets.has(p.audio)) continue;
    try {
      const blob = await (await fetch(p.audio)).blob();
      audiosPrets.set(p.audio, URL.createObjectURL(blob));
    } catch { /* pas grave : on jouera le fichier directement */ }
  }
}

// ───────── Outils ─────────
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function melanger(tableau) {
  const t = [...tableau];
  for (let i = t.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [t[i], t[j]] = [t[j], t[i]];
  }
  return t;
}

function langueDuJour() {
  return JOURS_SWAHILI.includes(new Date().getDay()) ? 'sw' : 'rw';
}

function serie() {
  const jours = new Set(progres.jours);
  let d = aujourdhui();
  if (!jours.has(d)) d = ajouterJours(d, -1); // la série tient encore si t'as fait hier
  let n = 0;
  while (jours.has(d)) { n++; d = ajouterJours(d, -1); }
  return n;
}

const vues = (l) => phrases[l].filter((p) => progres.cartes[p.id]).length;
const maitrisees = (l) => phrases[l].filter((p) => estMaitrisee(progres.cartes[p.id])).length;
const dues = (l) => phrases[l].filter((p) => estDue(progres.cartes[p.id], aujourdhui()));

// Combien de phrases t'aurais dû voir à date pour atteindre l'objectif en juin (ligne droite).
function attendu(l) {
  const total = new Date(FIN) - new Date(DEBUT);
  const ecoule = Math.min(1, Math.max(0, (new Date(aujourdhui()) - new Date(DEBUT)) / total));
  return Math.round(LANGUES[l].objectif * ecoule);
}

// ───────── Écran d'accueil ─────────
function accueil() {
  session = null;
  const jour = langueDuJour();
  const faitAujourdhui = progres.jours.includes(aujourdhui());

  const cartes = Object.entries(LANGUES).map(([l, info]) => {
    const v = vues(l);
    const ecart = v - attendu(l);
    const rythme = ecart >= 0
      ? `<span class="ok">En avance de ${ecart}</span>`
      : `<span class="retard">En retard de ${-ecart}</span>`;
    const pct = Math.min(100, (v / info.objectif) * 100);
    const restantes = phrases[l].length - v;
    return `
      <section class="langue ${l === jour ? 'du-jour' : ''}">
        <div class="langue-tete">
          <h2>${info.drapeau} ${info.nom}</h2>
          ${l === jour ? '<span class="badge">Aujourd\'hui</span>' : ''}
        </div>
        <div class="barre"><div style="width:${pct}%"></div></div>
        <p class="stats">${v} / ${info.objectif} phrases vues · ${maitrisees(l)} maîtrisées</p>
        <p class="stats">${rythme} · ${dues(l).length} à réviser · ${restantes} nouvelles dispo</p>
        <button class="${l === jour ? 'principal' : 'secondaire'}" data-commencer="${l}">Commencer</button>
      </section>`;
  }).join('');

  app.innerHTML = `
    <header class="entete">
      <h1>Kinya</h1>
      <div class="serie">🔥 ${serie()} jour${serie() > 1 ? 's' : ''}</div>
    </header>
    ${faitAujourdhui ? '<p class="fait">✅ Session d\'aujourd\'hui faite. Bravo!</p>' : ''}
    ${cartes}
    <p class="pied">Objectif : ${LANGUES.sw.objectif} phrases en swahili et ${LANGUES.rw.objectif} en kinyarwanda d'ici juin.</p>`;

  app.querySelectorAll('[data-commencer]').forEach((b) =>
    b.addEventListener('click', () => commencer(b.dataset.commencer)));
}

// ───────── Construction de la session ─────────
function commencer(l) {
  lecteur.play().catch(() => {}); // déverrouille l'audio sur iOS (geste de l'utilisateur)
  lecteur.pause();

  const aReviser = melanger(dues(l)).slice(0, MAX_REVISIONS);
  const nouvelles = phrases[l].filter((p) => !progres.cartes[p.id]).slice(0, NOUVELLES_PAR_SESSION);

  if (!aReviser.length && !nouvelles.length) {
    app.innerHTML = `<p class="vide">Rien à faire en ${LANGUES[l].nom} aujourd'hui : t'as tout vu et rien n'est à réviser. Ajoute une unité!</p>
      <button class="secondaire" id="retour">Retour</button>`;
    document.getElementById('retour').onclick = accueil;
    return;
  }

  // 1) Découvrir les nouvelles phrases. 2) Tester tout le monde, dans le désordre.
  const etapes = nouvelles.map((p) => ({ type: 'decouverte', p }));
  const types = ['ecoute', 'lecture', 'parler'];
  const tests = [
    ...nouvelles.map((p) => ({ type: 'ecoute', p })),
    ...aReviser.map((p, i) => ({ type: types[i % types.length], p })),
  ];
  etapes.push(...melanger(tests));

  session = { langue: l, etapes, index: 0, bonnes: 0, testees: 0 };
  precharger([...nouvelles, ...aReviser]);
  afficherEtape();
}

function noterPhrase(p, reussi) {
  progres.cartes[p.id] = noter(progres.cartes[p.id], reussi, aujourdhui());
  sauvegarder(progres);
  session.testees++;
  if (reussi) session.bonnes++;
}

function suivante() {
  session.index++;
  if (session.index >= session.etapes.length) fin();
  else afficherEtape();
}

// ───────── Affichage d'une étape ─────────
function cadre(contenu) {
  const pct = (session.index / session.etapes.length) * 100;
  app.innerHTML = `
    <div class="haut">
      <button class="quitter" id="quitter" aria-label="Quitter">✕</button>
      <div class="barre session"><div style="width:${pct}%"></div></div>
    </div>
    <div class="etape">${contenu}</div>`;
  document.getElementById('quitter').onclick = accueil;
}

function afficherEtape() {
  const { type, p } = session.etapes[session.index];
  ({ decouverte, ecoute, lecture, parler })[type](p);
}

function blocMicro() {
  if (!micro.disponible()) return '';
  return `
    <div class="micro">
      <button class="secondaire" id="enregistrer">🎙️ M'enregistrer</button>
      <button class="secondaire" id="ma-voix" hidden>▶ Ma voix</button>
    </div>`;
}

function brancherMicro(p) {
  const bouton = document.getElementById('enregistrer');
  if (!bouton) return;
  const maVoix = document.getElementById('ma-voix');
  let enCours = false;
  let urlVoix = null;
  bouton.onclick = async () => {
    if (!enCours) {
      try {
        await micro.demarrer();
        enCours = true;
        bouton.textContent = '⏹ Arrêter';
        bouton.classList.add('actif');
      } catch {
        bouton.textContent = 'Micro refusé';
        bouton.disabled = true;
      }
    } else {
      urlVoix = await micro.arreter();
      enCours = false;
      bouton.textContent = '🎙️ Recommencer';
      bouton.classList.remove('actif');
      maVoix.hidden = false;
      // Joue ta voix, puis le modèle, pour comparer
      lecteur.src = urlVoix;
      lecteur.onended = () => { lecteur.onended = null; jouer(p); };
      lecteur.play().catch(() => {});
    }
  };
  maVoix.onclick = () => { lecteur.onended = null; lecteur.src = urlVoix; lecteur.play().catch(() => {}); };
}

// Étape 1 : découvrir une nouvelle phrase
function decouverte(p) {
  cadre(`
    <p class="etiquette">Nouvelle phrase</p>
    <p class="cible">${esc(p.cible)}</p>
    <button class="ecouter" id="ecouter">🔊 Écouter</button>
    <p class="traduction">${esc(p.fr)}</p>
    <p class="consigne">Répète à voix haute 🗣️</p>
    ${blocMicro()}
    <button class="principal" id="suivant">Suivant</button>`);
  document.getElementById('ecouter').onclick = () => jouer(p);
  document.getElementById('suivant').onclick = suivante;
  brancherMicro(p);
  jouer(p);
}

// Choix multiples : la bonne traduction + 3 autres phrases de la même langue
function choix(p) {
  const autres = melanger(phrases[session.langue].filter((q) => q.id !== p.id && q.fr !== p.fr)).slice(0, 3);
  return melanger([p, ...autres]);
}

function brancherChoix(p, apresReponse) {
  app.querySelectorAll('[data-choix]').forEach((b) => {
    b.onclick = () => {
      const reussi = b.dataset.choix === p.id;
      app.querySelectorAll('[data-choix]').forEach((x) => {
        x.disabled = true;
        if (x.dataset.choix === p.id) x.classList.add('bon');
      });
      if (!reussi) b.classList.add('mauvais');
      noterPhrase(p, reussi);
      apresReponse(reussi);
    };
  });
}

function boutonsChoix(p) {
  return `<div class="choix">${choix(p).map((q) =>
    `<button data-choix="${q.id}">${esc(q.fr)}</button>`).join('')}</div>`;
}

function boutonContinuer() {
  const zone = document.getElementById('apres');
  zone.innerHTML = '<button class="principal" id="continuer">Continuer</button>';
  document.getElementById('continuer').onclick = suivante;
}

// Étape écoute : tu entends, tu choisis le sens
function ecoute(p) {
  cadre(`
    <p class="etiquette">Écoute — qu'est-ce que ça veut dire?</p>
    <button class="ecouter gros" id="ecouter">🔊</button>
    <p class="cible cachee" id="cible">${esc(p.cible)}</p>
    ${boutonsChoix(p)}
    <div id="apres"></div>`);
  document.getElementById('ecouter').onclick = () => jouer(p);
  brancherChoix(p, () => {
    document.getElementById('cible').classList.remove('cachee');
    boutonContinuer();
  });
  jouer(p);
}

// Étape lecture : tu lis, tu choisis le sens (l'audio joue après)
function lecture(p) {
  cadre(`
    <p class="etiquette">Lecture — qu'est-ce que ça veut dire?</p>
    <p class="cible">${esc(p.cible)}</p>
    ${boutonsChoix(p)}
    <div id="apres"></div>`);
  brancherChoix(p, () => { jouer(p); boutonContinuer(); });
}

// Étape parler : tu vois le français, tu le dis, puis tu compares
function parler(p) {
  const nom = LANGUES[session.langue].nom;
  cadre(`
    <p class="etiquette">Parle — dis-le en ${nom}</p>
    <p class="traduction grande">${esc(p.fr)}</p>
    <p class="consigne">Dis-le à voix haute, puis révèle la réponse.</p>
    <button class="principal" id="reveler">Révéler</button>
    <div id="reponse" hidden>
      <p class="cible">${esc(p.cible)}</p>
      <button class="ecouter" id="ecouter">🔊 Écouter</button>
      ${blocMicro()}
      <p class="consigne">Est-ce que tu l'avais?</p>
      <div class="auto-eval">
        <button class="mauvais-btn" id="non">✗ Pas encore</button>
        <button class="bon-btn" id="oui">✓ Je l'avais</button>
      </div>
    </div>`);
  document.getElementById('reveler').onclick = (e) => {
    e.target.hidden = true;
    document.getElementById('reponse').hidden = false;
    jouer(p);
  };
  document.getElementById('ecouter').onclick = () => jouer(p);
  brancherMicro(p);
  document.getElementById('oui').onclick = () => { noterPhrase(p, true); suivante(); };
  document.getElementById('non').onclick = () => { noterPhrase(p, false); suivante(); };
}

// ───────── Fin de session ─────────
function fin() {
  const auj = aujourdhui();
  if (!progres.jours.includes(auj)) progres.jours.push(auj);
  sauvegarder(progres);
  const s = serie();
  app.innerHTML = `
    <div class="fin">
      <p class="grand-emoji">🎉</p>
      <h2>Session terminée!</h2>
      <p>${session.bonnes} / ${session.testees} bonnes réponses</p>
      <p class="serie">🔥 Série de ${s} jour${s > 1 ? 's' : ''}</p>
      <button class="principal" id="retour">Retour à l'accueil</button>
    </div>`;
  document.getElementById('retour').onclick = accueil;
}

// ───────── Démarrage ─────────
async function init() {
  try {
    const index = await (await fetch('contenu/index.json')).json();
    for (const fichier of index.unites) {
      const unite = await (await fetch(fichier)).json();
      phrases[unite.langue].push(...unite.phrases);
    }
  } catch (e) {
    app.innerHTML = '<p class="vide">Impossible de charger le contenu. Ouvre l\'app avec ouvrir.bat (pas en double-cliquant index.html).</p>';
    console.error(e);
    return;
  }
  accueil();
  // En arrière-plan : met tout l'audio en cache pour le mode hors ligne
  for (const l of Object.keys(phrases)) phrases[l].forEach((p) => p.audio && fetch(p.audio).catch(() => {}));
}

init();
