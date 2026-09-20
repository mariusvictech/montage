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
