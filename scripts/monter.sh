#!/usr/bin/env bash
# La partie mécanique du montage, d'une traite, une fois le rush déposé :
# coupe des blancs → transcription → sous-titres → vérification.
# Le motion design, lui, s'écrit ensuite dans index.html, au fil du propos.
#
#   bash scripts/monter.sh video-5
#
# La transcription est sautée si video-N/transcript.json existe déjà
# (transcrit sur le Mac, par exemple). Le modèle whisper se choisit avec
# WHISPER_MODEL (défaut : medium, multilingue — les modèles *.en ne font
# que l'anglais).

set -euo pipefail

DEPOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DEPOT"
export PATH="$HOME/.local/bin:$PATH"

PROJET="${1:?usage : bash scripts/monter.sh video-N}"
LANGUE="${LANGUE:-fr}"
WHISPER_MODEL="${WHISPER_MODEL:-medium}"

RUSH="$(ls "$PROJET"/assets/rush.* 2>/dev/null | grep -v 'rush-coupe' | head -1 || true)"
[ -n "$RUSH" ] || { echo "Aucun rush dans $PROJET/assets/ (attendu : rush.MOV, rush.mp4…)" >&2; exit 1; }
echo "→ rush : $RUSH"

echo "→ coupe des blancs"
node scripts/cut-silences.mjs --entree "$RUSH" \
  --sortie "$PROJET/assets/rush-coupe.mp4" --plan "$PROJET/cuts.json"

echo "→ transcription"
if [ -f "$PROJET/transcript.json" ]; then
  echo "  transcript.json déjà là, on le garde"
else
  (cd "$PROJET" && hyperframes transcribe "${RUSH#"$PROJET"/}" -d . \
    --language "$LANGUE" --model "$WHISPER_MODEL")
fi

echo "→ sous-titres"
node scripts/subtitles.mjs --projet "$PROJET" --coupes "$PROJET/cuts.json"

echo "→ sons"
[ -d "$PROJET/assets/sfx" ] || node scripts/sfx.mjs --projet "$PROJET"

echo
echo "Mécanique faite. Reste le motion design dans $PROJET/index.html, puis :"
echo "  cd $PROJET && hyperframes check && hyperframes render -o montage.mp4"
