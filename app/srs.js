// srs.js — Répétition espacée (système de Leitner).
// Chaque phrase est dans une « boîte ». Bonne réponse : elle monte d'une boîte et revient
// plus tard. Mauvaise réponse : elle retourne à la boîte 1 et revient demain.
import { ajouterJours } from './stockage.js';

// Nombre de jours avant la prochaine révision, selon la boîte (index = numéro de boîte).
const INTERVALLES = [0, 1, 2, 4, 7, 15, 30, 60, 120];

export function noter(carte, reussi, auj) {
  const boite = reussi ? Math.min((carte?.boite ?? 0) + 1, INTERVALLES.length - 1) : 1;
  return {
    boite,
    prochaine: ajouterJours(auj, INTERVALLES[boite]),
    vues: (carte?.vues ?? 0) + 1,
  };
}

// Une carte est « due » si sa date de révision est aujourd'hui ou passée.
export function estDue(carte, auj) {
  return Boolean(carte) && carte.prochaine <= auj;
}

// On considère une phrase maîtrisée à partir de la boîte 4 (réussie ~4 fois de suite).
export function estMaitrisee(carte) {
  return Boolean(carte) && carte.boite >= 4;
}
