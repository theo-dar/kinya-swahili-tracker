#!/bin/sh
# conteneur.sh - roule DANS le conteneur Docker (Linux).
# Installe les librairies une seule fois (gardees dans le volume /venv), puis genere l'audio.
set -e
if [ ! -f /venv/.pret ]; then
  echo "Premiere fois : installation de PyTorch et des librairies (5-10 min)..."
  python -m venv /venv
  /venv/bin/pip install --quiet torch --index-url https://download.pytorch.org/whl/cpu
  /venv/bin/pip install --quiet transformers scipy numpy
  touch /venv/.pret
fi
/venv/bin/python /work/pipeline/generer_audio.py
