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
4. **Style demandé par l'utilisateur (à partir de video-9)** : plus de jauge
   de progression en haut, plus de coins « REC » autour du cadre. Un motion
   design plus premium, plus animé, qui illustre ce qu'il dit au mot près
   (typo cinétique, chiffres qui comptent, captures intégrées en scène,
   transitions soignées) plutôt que des cartes posées. Référence :
   `video-9/index.html` et `premium.css` (Inter 900 + Instrument Serif
   italique embarquées, révélations au masque, panneaux de verre, compteurs,
   cadrage du rush qui alterne d'une prise à l'autre).
   Une phrase dite deux fois (prise ratée) : ne garder que la dernière, avec
   `RETIRER="début-fin" bash scripts/monter.sh video-N` (secondes du rush).
5. **Captures d'écran** : il les dépose dans `video-N/assets/` avec le rush
   (png, jpg, heic). Un HEIC d'iPhone est en tuiles, ffmpeg n'en lit qu'une :
   le convertir avec `pip install pillow-heif` puis PIL. Ne garder que la
   partie utile (recadrer les autres notifications, paiements, adresses)
   et les faire apparaître au moment où il en parle.
6. Ne jamais inventer de chiffres ou de noms : ce qui n'est pas dans le
   transcript est signalé comme « à vérifier » dans le message de commit.
