"""
generer_audio.py — Pièce 2 : le pipeline audio.

Lit chaque unité JSON dans contenu/<langue>/, génère un fichier audio (WAV)
pour chaque phrase qui n'en a pas encore, puis remplit le champ "audio".
"""
import json
from pathlib import Path

import numpy as np
import torch
from scipy.io import wavfile
from transformers import AutoTokenizer, VitsModel

# Dossier racine du projet (kinya/), calculé à partir de l'emplacement de ce script
RACINE = Path(__file__).resolve().parent.parent
DOSSIER_CONTENU = RACINE / "contenu"
DOSSIER_AUDIO = RACINE / "audio"

# Code de langue de l'app -> nom du modèle de voix MMS (Meta) sur Hugging Face
MODELES = {
    "sw": "facebook/mms-tts-swh",  # swahili
    "rw": "facebook/mms-tts-kin",  # kinyarwanda
}


def charger_modele(langue):
    """Charge le modèle de voix d'une langue (téléchargé la première fois seulement)."""
    nom = MODELES[langue]
    print(f"Chargement du modèle {nom}...")
    tokenizer = AutoTokenizer.from_pretrained(nom)
    modele = VitsModel.from_pretrained(nom)
    return tokenizer, modele


def generer_wav(texte, tokenizer, modele, chemin_sortie):
    """Transforme un texte en fichier audio WAV."""
    entrees = tokenizer(texte, return_tensors="pt")  # texte -> nombres
    with torch.no_grad():                             # pas d'entraînement, juste prédire
        onde = modele(**entrees).waveform             # nombres -> onde sonore
    donnees = onde.squeeze().numpy()
    # Convertit en entiers 16 bits : le format WAV que tous les navigateurs lisent
    donnees = (np.clip(donnees, -1.0, 1.0) * 32767).astype(np.int16)
    wavfile.write(chemin_sortie, modele.config.sampling_rate, donnees)


def traiter_langue(langue):
    """Passe à travers toutes les unités d'une langue et génère l'audio manquant."""
    fichiers = sorted((DOSSIER_CONTENU / langue).glob("unite-*.json"))
    (DOSSIER_AUDIO / langue).mkdir(parents=True, exist_ok=True)
    tokenizer, modele = None, None  # chargé seulement si on en a besoin

    for fichier in fichiers:
        unite = json.loads(fichier.read_text(encoding="utf-8"))
        modifie = False

        for phrase in unite["phrases"]:
            if phrase["audio"]:
                continue  # cette phrase a déjà son audio : on saute

            if modele is None:
                tokenizer, modele = charger_modele(langue)

            nom_fichier = f"{phrase['id']}.wav"
            generer_wav(phrase["cible"], tokenizer, modele,
                        DOSSIER_AUDIO / langue / nom_fichier)
            phrase["audio"] = f"audio/{langue}/{nom_fichier}"
            modifie = True
            print(f"  OK  {phrase['id']}  {phrase['cible']}")

        if modifie:  # on réécrit le JSON seulement s'il a changé
            fichier.write_text(json.dumps(unite, ensure_ascii=False, indent=2),
                               encoding="utf-8")


if __name__ == "__main__":
    for langue in MODELES:
        traiter_langue(langue)
    print("Terminé.")
