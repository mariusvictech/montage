# video-4 — full motion design

Même identité visuelle que les précédentes, sans aucune capture d'écran :
cartes, compteurs, pastilles d'état, punchline et sous-titres mot par mot.

## Une fois le rush déposé

```bash
node scripts/cut-silences.mjs --entree video-4/assets/rush.MOV \
     --sortie video-4/assets/rush-coupe.mp4 --plan video-4/cuts.json
cd video-4 && hyperframes transcribe assets/rush.MOV -d . --language fr && cd ..
node scripts/subtitles.mjs --projet video-4 --coupes video-4/cuts.json
cd video-4 && hyperframes check && hyperframes render -o montage.mp4
```
