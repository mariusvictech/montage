#!/usr/bin/env bash
# Installe la chaîne d'outils du montage dans un conteneur neuf.
# Tout va dans $HOME, sans sudo : bun, ffmpeg, ffprobe, puis HyperFrames
# cloné et compilé, et la commande `hyperframes` liée dans ~/.local/bin.
#
#   bash scripts/setup.sh
#   export PATH="$HOME/.local/bin:$PATH"
#   hyperframes doctor

set -euo pipefail

DEPOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PREFIXE="${PREFIXE:-$HOME/.local}"
HYPERFRAMES_DIR="${HYPERFRAMES_DIR:-$HOME/hyperframes}"
GSAP_VERSION="${GSAP_VERSION:-3.14.2}"

mkdir -p "$PREFIXE/bin"
export PATH="$PREFIXE/bin:$PATH"

echo "→ bun"
command -v bun >/dev/null 2>&1 || npm install -g bun

echo "→ ffmpeg + ffprobe"
if [ ! -x "$PREFIXE/bin/ffmpeg" ]; then
  mkdir -p "$PREFIXE/ffmpeg-pkgs"
  cd "$PREFIXE/ffmpeg-pkgs"
  [ -f package.json ] || echo '{"name":"ffmpeg-pkgs","private":true}' >package.json
  npm install ffmpeg-static ffprobe-static --no-audit --no-fund
  ln -sf "$(node -p "require('$PREFIXE/ffmpeg-pkgs/node_modules/ffmpeg-static')")" "$PREFIXE/bin/ffmpeg"
  ln -sf "$(node -p "require('$PREFIXE/ffmpeg-pkgs/node_modules/ffprobe-static').path")" "$PREFIXE/bin/ffprobe"
fi

echo "→ HyperFrames ($HYPERFRAMES_DIR)"
if [ ! -d "$HYPERFRAMES_DIR/.git" ]; then
  git clone --depth 1 https://github.com/heygen-com/hyperframes.git "$HYPERFRAMES_DIR"
fi
cd "$HYPERFRAMES_DIR"
bun install
bun run build
chmod +x packages/cli/bin/hyperframes.mjs
ln -sf "$HYPERFRAMES_DIR/packages/cli/bin/hyperframes.mjs" "$PREFIXE/bin/hyperframes"

echo "→ whisper-cpp (transcription, pour les sous-titres)"
WHISPER_DIR="$HOME/.cache/hyperframes/whisper"
WHISPER_MODEL="${WHISPER_MODEL:-medium}"
if [ ! -x "$WHISPER_DIR/whisper.cpp/build/bin/whisper-cli" ]; then
  mkdir -p "$WHISPER_DIR"
  [ -d "$WHISPER_DIR/whisper.cpp" ] ||
    git clone --depth 1 https://github.com/ggml-org/whisper.cpp.git "$WHISPER_DIR/whisper.cpp"
  (cd "$WHISPER_DIR/whisper.cpp" && cmake -B build -DCMAKE_BUILD_TYPE=Release >/dev/null &&
    cmake --build build --config Release -j >/dev/null)
fi
ln -sf "$WHISPER_DIR/whisper.cpp/build/bin/whisper-cli" "$PREFIXE/bin/whisper-cli"
# Le modèle multilingue (les *.en ne font que l'anglais). Hébergé sur
# huggingface.co : si le réseau le refuse, on transcrit sur le Mac.
mkdir -p "$WHISPER_DIR/models"
if [ ! -s "$WHISPER_DIR/models/ggml-$WHISPER_MODEL.bin" ]; then
  curl -fsSL -o "$WHISPER_DIR/models/ggml-$WHISPER_MODEL.bin" \
    "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-$WHISPER_MODEL.bin" ||
    { rm -f "$WHISPER_DIR/models/ggml-$WHISPER_MODEL.bin"
      echo "  ! modèle whisper injoignable (huggingface.co) : transcription à faire sur le Mac"; }
fi

echo "→ GSAP local (le Chrome de rendu n'a pas toujours accès au CDN)"
cd "$(mktemp -d)"
npm pack "gsap@$GSAP_VERSION" >/dev/null
tar xzf "gsap-$GSAP_VERSION.tgz"
for projet in "$DEPOT"/video-*; do
  [ -d "$projet" ] || continue
  mkdir -p "$projet/vendor"
  cp package/dist/gsap.min.js "$projet/vendor/gsap.min.js"
done

cd "$DEPOT"
echo
echo "Chaîne d'outils en place. Ajoute ceci à ton shell :"
echo "  export PATH=\"$PREFIXE/bin:\$PATH\""
echo
hyperframes doctor || true
