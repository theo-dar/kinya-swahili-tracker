"""
serveur.py — Petit serveur web local pour tester l'app sur ton laptop.
(Ouvrir index.html en double-cliquant ne marche pas : le navigateur bloque
le chargement des fichiers JSON quand on n'a pas de serveur.)
"""
import http.server
import mimetypes
import os
from pathlib import Path

# Windows se trompe parfois sur le type des fichiers .js : on le force.
mimetypes.add_type("text/javascript", ".js")
mimetypes.add_type("application/manifest+json", ".webmanifest")
mimetypes.add_type("audio/wav", ".wav")

os.chdir(Path(__file__).resolve().parent.parent)  # sert le dossier kinya/
PORT = 8000
print(f"App disponible sur http://localhost:{PORT}  (ferme cette fenêtre pour arrêter)")
http.server.ThreadingHTTPServer(("", PORT), http.server.SimpleHTTPRequestHandler).serve_forever()
