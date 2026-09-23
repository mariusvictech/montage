# montage

Le montage vidéo vertical, reproductible : mêmes coupes, même identité visuelle,
mêmes sons que les deux premiers montages — mais ici tout est versionné, donc
chaque nouvelle vidéo repart du même gabarit au lieu d'être refaite à la main.

Rendu avec [HyperFrames](https://github.com/heygen-com/hyperframes) (HTML + CSS
+ GSAP → MP4), ffmpeg pour les coupes et les sons.

## 1. Installer la chaîne d'outils

```bash
bash scripts/setup.sh
export PATH="$HOME/.local/bin:$PATH"
hyperframes doctor
```

Le script installe, dans `$HOME` et sans sudo : bun, ffmpeg, ffprobe,
HyperFrames (cloné puis compilé) et la commande `hyperframes`. Il copie aussi
GSAP dans `video-*/vendor/`, parce que le Chrome de rendu n'a pas toujours
accès au CDN.

`doctor` signale quatre dépendances **optionnelles** : whisper-cpp
(transcription), Kokoro (voix), MusicGen (musique), Docker. Le rendu local
fonctionne sans elles ; seule la transcription automatique demande whisper-cpp.

## 2. Monter une vidéo

Le chemin court :

```bash
bash scripts/nouvelle-video.sh "sujet"   # ouvre video-N, prêt à recevoir le rush
# … le rush est déposé dans video-N/assets/rush.MOV …
bash scripts/monter.sh video-N           # coupe + transcription + sous-titres
```

Reste le motion design dans `video-N/index.html` et le rendu. Le détail, étape
par étape :

```bash
# a. Le rush arrive dans le projet
cp ~/ma-video.mp4 video-1/assets/rush.mp4

# b. On coupe les blancs (respiration de 0,06 s conservée de chaque côté)
node scripts/cut-silences.mjs \
  --entree video-1/assets/rush.mp4 \
  --sortie video-1/assets/rush-coupe.mp4 \
  --plan   video-1/cuts.json

# c. On transcrit au mot près (nécessite whisper-cpp)
cd video-1 && hyperframes transcribe assets/rush-coupe.mp4 && cd ..

# d. Les sous-titres, dans l'identité visuelle des cartes
node scripts/subtitles.mjs --projet video-1

# e. Les sons
node scripts/sfx.mjs --projet video-1

# f. Vérification puis rendu
cd video-1
hyperframes check
hyperframes render -o montage.mp4
```

Si la transcription a été faite **avant** la coupe, on recale les timings sur la
vidéo coupée :

```bash
node scripts/subtitles.mjs --projet video-1 --coupes video-1/cuts.json
```

Pour une nouvelle vidéo, on copie le projet plutôt que de l'écraser :
`cp -r video-1 video-2` (et `scripts/setup.sh` y remettra GSAP).

## Les scripts

| Script | Ce qu'il fait |
| --- | --- |
| `scripts/setup.sh` | Installe bun, ffmpeg, ffprobe, HyperFrames, whisper-cpp et GSAP |
| `scripts/nouvelle-video.sh` | Ouvre le projet suivant (`video-N`) avec l'identité, les sons et un écran d'attente |
| `scripts/monter.sh` | Enchaîne coupe, transcription (fr, modèle `medium`) et sous-titres |
| `scripts/cut-silences.mjs` | Détecte les blancs, écrit `cuts.json`, produit la vidéo coupée |
| `scripts/subtitles.mjs` | Transcript mot à mot → `compositions/subtitles.html` |
| `scripts/sfx.mjs` | Fabrique les cinq sound effects avec ffmpeg, sans rien télécharger |

Les options par défaut de la coupe reprennent les réglages des deux premiers
montages : seuil `-35 dB`, blanc minimum `0,28 s`, respiration `0,06 s`.
Elles se changent avec `--seuil`, `--minimum`, `--respiration`.

## L'identité visuelle

`video-1/identity.css` est la référence — cartes, chiffres, tampon, sous-titres
partagent la même feuille :

- vertical 1080×1920, 30 ips, fond `#0a0a0a` ;
- typo épaisse en capitales, accent vert `#00e676`, rouge `#ff3b30` pour ce qui
  ne va pas ;
- les cartes entrent **par la droite** et sortent **vers la gauche** : un seul
  sens de lecture sur toute la vidéo ;
- une capture d'écran entre **par la gauche**, en réponse aux cartes ;
- les sous-titres : une seule ligne en bas, trois mots, contour sombre, et le
  mot prononcé passe en vert ;
- les sons restent discrets — cinq effets, jamais de nappe continue.

## L'état de `video-1`

`video-1` est le gabarit de démonstration : il se rend tel quel, sans rush, en
14 secondes, avec un emplacement réservé pour la capture de boutique et un
transcript d'exemple (`transcript.sample.json`). On y branche le vrai rush comme
décrit dans `video-1/README.md`.
