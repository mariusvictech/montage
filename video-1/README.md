# video-1 — gabarit de montage

Projet HyperFrames vertical 1080×1920. Il se rend tel quel (14 s) pour servir de
référence visuelle, puis on y branche un vrai rush.

```bash
hyperframes check              # lint + runtime + layout + contraste
hyperframes render -o montage.mp4
hyperframes preview --background   # studio, pour déplacer une carte à la souris
```

## Brancher le rush

Une fois `assets/rush-coupe.mp4` en place, ajouter dans `index.html`, juste après
l'ouverture de `<div id="root">` :

```html
<video
  id="rush"
  class="clip"
  src="assets/rush-coupe.mp4"
  muted
  data-start="0"
  data-duration="28"
  data-has-audio="true"
></video>
<audio
  id="voix"
  src="assets/rush-coupe.mp4"
  data-start="0"
  data-duration="28"
  data-volume="1"
></audio>
```

Trois règles à ne pas perdre de vue :

1. la vidéo reste `muted` et le son passe par l'élément `<audio>` séparé ;
2. tout élément média a besoin d'un `id`, sinon le rendu sort muet ;
3. `data-duration` du `<div id="root">` doit couvrir la durée de la vidéo coupée
   (voir `kept` dans `cuts.json`).

## Brancher une capture d'écran

Remplacer le bloc `capture--vide` par la vraie image :

```html
<div class="capture"><img src="assets/boutique.png" alt="" /></div>
```

Pour entourer une zone précise de la capture (les paiements, une colonne de
chiffres), ajouter un cadre rouge positionné en pixels :

```html
<div class="surlignage" style="top: 180px; left: 120px; width: 300px; height: 90px"></div>
```

## Les fichiers

- `index.html` — la composition : les cartes, les sons, le montage
- `identity.css` — l'identité visuelle partagée
- `compositions/subtitles.html` — **généré** par `scripts/subtitles.mjs`
- `transcript.sample.json` — transcript d'exemple du gabarit
- `assets/sfx/` — les sons, fabriqués par `scripts/sfx.mjs`
- `vendor/gsap.min.js` — GSAP en local (le Chrome de rendu n'atteint pas le CDN)
