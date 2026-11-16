// enregistreur.js — Enregistre ta voix avec le micro pour la comparer à l'audio modèle.
let enregistreur = null;
let flux = null;
let morceaux = [];

export function disponible() {
  return Boolean(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
}

export async function demarrer() {
  flux = await navigator.mediaDevices.getUserMedia({ audio: true });
  enregistreur = new MediaRecorder(flux);
  morceaux = [];
  enregistreur.ondataavailable = (e) => morceaux.push(e.data);
  enregistreur.start();
}

// Arrête l'enregistrement et renvoie une URL qu'on peut faire jouer.
export function arreter() {
  return new Promise((resoudre) => {
    enregistreur.onstop = () => {
      flux.getTracks().forEach((piste) => piste.stop()); // éteint le micro
      const blob = new Blob(morceaux, { type: enregistreur.mimeType });
      resoudre(URL.createObjectURL(blob));
    };
    enregistreur.stop();
  });
}
