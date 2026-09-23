#!/usr/bin/env bash
# Ouvre le projet de la prochaine vidéo : video-N, prêt à recevoir le rush.
# Reprend l'identité visuelle, la config HyperFrames et GSAP du dernier projet,
# fabrique les sons, et pose un écran d'attente qui se rend tel quel.
#
#   bash scripts/nouvelle-video.sh            # → video-5 si video-4 existe
#   bash scripts/nouvelle-video.sh "titre"    # le titre apparaît sur l'écran d'attente

set -euo pipefail

DEPOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DEPOT"

DERNIER="$(ls -d video-* 2>/dev/null | sed 's/video-//' | sort -n | tail -1)"
MODELE="video-$DERNIER"
N=$((DERNIER + 1))
PROJET="video-$N"
TITRE="${1:-$PROJET}"

[ -e "$PROJET" ] && { echo "$PROJET existe déjà" >&2; exit 1; }

mkdir -p "$PROJET/assets" "$PROJET/compositions" "$PROJET/vendor"
for f in identity.css hyperframes.json AGENTS.md CLAUDE.md; do
  cp "$MODELE/$f" "$PROJET/$f"
done
cp "$MODELE/vendor/gsap.min.js" "$PROJET/vendor/gsap.min.js"
sed "s/\"$MODELE\"/\"$PROJET\"/" "$MODELE/package.json" >"$PROJET/package.json"

cat >"$PROJET/meta.json" <<EOF
{
  "id": "$PROJET",
  "name": "$PROJET",
  "createdAt": "$(date -u +%Y-%m-%dT00:00:00.000Z)"
}
EOF

cat >"$PROJET/assets/README.md" <<EOF
# assets — $PROJET

**Dépose le rush ici**, sous le nom \`rush\` et avec son extension d'origine
(\`rush.MOV\`, \`rush.mp4\`…), puis pousse-le :

\`\`\`bash
git add -f $PROJET/assets/rush.MOV
git commit -m "rush $PROJET"
git push
\`\`\`

Captures ou extraits éventuels : même dossier, n'importe quel nom — ils seront
placés là où le propos les appelle.

\`sfx/\` contient les sons, fabriqués par \`scripts/sfx.mjs\`.
EOF

cat >"$PROJET/README.md" <<EOF
# $PROJET

Même identité visuelle que les précédentes : coupe des blancs, motion design
et sous-titres mot par mot.

## Une fois le rush déposé

\`\`\`bash
bash scripts/monter.sh $PROJET
\`\`\`

Puis le motion design s'écrit dans \`index.html\`, et le rendu :
\`cd $PROJET && hyperframes check && hyperframes render -o montage.mp4\`.
EOF

cat >"$PROJET/index.html" <<EOF
<!doctype html>
<html lang="fr" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="./vendor/gsap.min.js"></script>
    <link rel="stylesheet" href="./identity.css" />
  </head>
  <body>
    <!-- Projet vide, en attente du rush (voir assets/README.md). -->
    <div
      id="root"
      data-composition-id="main"
      data-start="0"
      data-duration="4"
      data-width="1080"
      data-height="1920"
    >
      <div class="clip" id="attente" data-start="0" data-duration="4" data-track-index="0">
        <div class="carte carte--sommet">
          <div class="etiquette">$PROJET</div>
          <div class="titre">En attente<br />du rush</div>
          <div class="sous-titre">$TITRE</div>
        </div>
      </div>
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      tl.fromTo(
        "#attente .carte",
        { xPercent: 18, opacity: 0 },
        { xPercent: 0, opacity: 1, duration: 0.45, ease: "power3.out" },
        0.2,
      );
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
EOF

if command -v ffmpeg >/dev/null 2>&1; then
  node scripts/sfx.mjs --projet "$PROJET"
else
  cp -r "$MODELE/assets/sfx" "$PROJET/assets/sfx"
fi

echo
echo "$PROJET est prêt. Dépose le rush dans $PROJET/assets/ (rush.MOV ou rush.mp4)."
