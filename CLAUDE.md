# montage — consignes pour Claude

Le dépôt monte des vidéos verticales face caméra, une par dossier `video-N`,
avec HyperFrames. Lire `README.md` pour la chaîne d'outils et l'identité
visuelle.

## Conteneur neuf

Si `hyperframes` n'est pas dans le PATH : `bash scripts/setup.sh` puis
`export PATH="$HOME/.local/bin:$PATH"`.

## Quand l'utilisateur veut monter une nouvelle vidéo

1. **Ouvrir le dossier** : `bash scripts/nouvelle-video.sh "<sujet>"`, commit
   (« Ouvrir video-N »), push, et lui dire où déposer le rush :
   `video-N/assets/rush.MOV` (ou `.mp4`), ajouté avec `git add -f`. S'il a
   déjà `transcript.json` fait sur le Mac, il le pose à la racine de `video-N`.
2. **Attendre le rush** : `git pull` sur la branche de travail ; tant que
   `video-N/assets/rush.*` n'y est pas, rien d'autre à faire.
3. **Monter toute la vidéo**, sans redemander :
   - `bash scripts/monter.sh video-N` — coupe des blancs (`cuts.json`,
     `rush-coupe.mp4`), transcription si besoin, sous-titres mot par mot
     (`compositions/subtitles.html`) ;
   - relire le transcript, corriger les mots mal entendus (`corrections.json`
     comme dans video-2/3) ;
   - écrire le **motion design** dans `index.html` au fil du propos, dans la
     grammaire des montages précédents (s'inspirer de `video-4/index.html`) :
     accroche en typo cinétique, cartes qui entrent par la droite et sortent
     par la gauche, compteurs et chiffres, pastilles, punchline, cartouche de
     fin, sons discrets de `assets/sfx/`, sous-titres en bas ;
   - `hyperframes check` à 0 erreur, puis
     `hyperframes render -o montage-<sujet>.mp4` ;
   - commit du montage et du rendu (`git add -f` sur le mp4), push, et
     envoyer le rendu à l'utilisateur.
4. Ne jamais inventer de chiffres ou de noms : ce qui n'est pas dans le
   transcript est signalé comme « à vérifier » dans le message de commit.
