// stockage.js — Sauvegarde ton progrès dans le navigateur de l'appareil (localStorage).
// Forme des données : { cartes: { "<id de phrase>": { boite, prochaine, vues } }, jours: ["2026-11-16", ...] }
const CLE = 'kinya-progres-v1';

function nouveau() {
  return { cartes: {}, jours: [] };
}

export function charger() {
  try {
    return JSON.parse(localStorage.getItem(CLE)) ?? nouveau();
  } catch {
    return nouveau();
  }
}

export function sauvegarder(progres) {
  try {
    localStorage.setItem(CLE, JSON.stringify(progres));
  } catch (e) {
    console.warn('Sauvegarde impossible', e);
  }
}

// Date locale au format AAAA-MM-JJ (le format suédois donne exactement ça).
export function aujourdhui() {
  return new Date().toLocaleDateString('sv-SE');
}

export function ajouterJours(dateISO, n) {
  const d = new Date(dateISO + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('sv-SE');
}
