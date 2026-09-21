# video-3 — la prochaine vidéo

Même identité visuelle que `video-2`. Trois pièces attendues dans `assets/` :
le rush, l'extrait de l'appel client, la capture de la commande.

## Une fois les fichiers déposés

```bash
node scripts/cut-silences.mjs --entree video-3/assets/rush.MOV \
     --sortie video-3/assets/rush-coupe.mp4 --plan video-3/cuts.json
cd video-3 && hyperframes transcribe assets/rush-coupe.mp4 -d . --language fr && cd ..
node scripts/subtitles.mjs --projet video-3 --coupes video-3/cuts.json
cd video-3 && hyperframes check && hyperframes render -o montage.mp4
```

L'extrait de l'appel s'insère en plein cadre, avec son propre son : la voix du
rush est baissée pendant l'insert (`data-volume` sur l'élément `<audio>` du
rush), puis remonte. La capture arrive juste après, entrée par la gauche.
