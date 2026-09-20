# video-2 — la prochaine vidéo

Projet vide, prêt à recevoir un rush. Même identité visuelle que `video-1`
(`identity.css`, les sons dans `assets/sfx/`, GSAP dans `vendor/`).

## Déposer les fichiers

Dans `assets/` :

- `rush.mp4` — la vidéo, telle que sortie du téléphone ;
- les captures à faire apparaître, nommées clairement (`checkout.png`,
  `boutique.png`, …).

## Puis, dans l'ordre

```bash
node scripts/cut-silences.mjs --entree video-2/assets/rush.mp4 \
     --sortie video-2/assets/rush-coupe.mp4 --plan video-2/cuts.json
cd video-2 && hyperframes transcribe assets/rush-coupe.mp4 && cd ..
node scripts/subtitles.mjs --projet video-2
cd video-2 && hyperframes check && hyperframes render -o montage.mp4
```

Le branchement du rush et des captures dans `index.html` est décrit dans
`video-1/README.md`, section « Brancher le rush ».
