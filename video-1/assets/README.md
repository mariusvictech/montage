# assets

C'est ici qu'arrivent les fichiers du montage :

- `rush.mp4` — la vidéo telle que sortie du téléphone ;
- `rush-coupe.mp4` — la version coupée, produite par `scripts/cut-silences.mjs` ;
- `boutique.png`, `checkout.png`, … — les captures à faire apparaître ;
- `sfx/` — les sons, fabriqués par `scripts/sfx.mjs` (versionnés, eux).

Les vidéos et les images sont ignorées par git (voir `.gitignore`) : elles
restent en local, seuls le montage et les sons sont versionnés.
