#!/usr/bin/env node
/**
 * Génère une sous-composition de sous-titres mot par mot, dans l'identité
 * visuelle du projet : une seule ligne en bas, et le mot prononcé passe en vert.
 *
 *   node scripts/subtitles.mjs --projet video-1
 *   node scripts/subtitles.mjs --projet video-1 --coupes video-1/cuts.json
 *
 * Le transcript attendu est celui de `hyperframes transcribe` (timings au mot).
 * Si --coupes est fourni, les timings sont recalés sur la vidéo déjà coupée.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

function options(argv) {
  const o = {};
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const cle = a.slice(2);
    const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[(i += 1)] : "true";
    o[cle] = val;
  }
  return o;
}

/** Accepte les formats whisper courants et renvoie [{ mot, debut, fin }]. */
export function lireMots(transcript) {
  const brut = Array.isArray(transcript)
    ? transcript
    : transcript.words ||
      (transcript.segments || []).flatMap((s) => s.words || []) ||
      [];
  return brut
    .map((m) => ({
      mot: String(m.word ?? m.text ?? "").trim(),
      debut: Number(m.start ?? m.begin ?? 0),
      fin: Number(m.end ?? m.stop ?? 0),
    }))
    .filter((m) => m.mot && Number.isFinite(m.debut) && m.fin > m.debut);
}

/**
 * Recale un instant de la vidéo source sur la vidéo coupée.
 * Un instant tombé dans un blanc supprimé est ramené au bord le plus proche :
 * les timings d'un transcript sont approximatifs, on ne perd pas un mot pour ça.
 */
export function recaler(t, segments) {
  let ecoule = 0;
  for (const seg of segments) {
    if (t < seg.start) return ecoule;
    if (t <= seg.end) return ecoule + (t - seg.start);
    ecoule += seg.end - seg.start;
  }
  return ecoule;
}

/** Découpe la suite de mots en lignes courtes, en respectant les silences. */
export function enLignes(mots, motsParLigne = 3, trouMax = 0.6) {
  const lignes = [];
  let courante = [];
  for (const m of mots) {
    const precedent = courante[courante.length - 1];
    const rupture =
      courante.length >= motsParLigne || (precedent && m.debut - precedent.fin > trouMax);
    if (rupture) {
      lignes.push(courante);
      courante = [];
    }
    courante.push(m);
  }
  if (courante.length) lignes.push(courante);
  return lignes;
}

function echapper(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function construireHtml(lignes, duree) {
  const blocs = [];
  const anims = [];

  lignes.forEach((ligne, i) => {
    const debut = ligne[0].debut;
    const suivante = lignes[i + 1];
    /* Une ligne s'efface avant que la suivante n'arrive : jamais deux lignes à l'écran. */
    const butoir = suivante ? suivante[0].debut - 0.02 : duree;
    const fin = Math.max(debut + 0.1, Math.min(duree, butoir, ligne[ligne.length - 1].fin + 0.12));
    const mots = ligne
      .map((m, j) => `<span class="mot" id="l${i}m${j}">${echapper(m.mot.toUpperCase())}</span>`)
      .join("\n            ");

    blocs.push(
      `      <div class="clip" id="sous-titre-${i + 1}" data-start="${debut.toFixed(3)}" data-duration="${(fin - debut).toFixed(3)}" data-track-index="0">
        <div class="rail-sous-titres">
          <div class="ligne">
            ${mots}
          </div>
        </div>
      </div>`,
    );

    ligne.forEach((m, j) => {
      const sel = `#l${i}m${j}`;
      anims.push(
        `      tl.fromTo("${sel}", { color: NEUTRE }, { color: VERT, duration: 0.001 }, ${m.debut.toFixed(3)});`,
      );
      anims.push(`      tl.to("${sel}", { color: NEUTRE, duration: 0.001 }, ${m.fin.toFixed(3)});`);
    });
  });

  return `<!doctype html>
<!-- Fichier généré par scripts/subtitles.mjs — ne pas éditer à la main. -->
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <script src="vendor/gsap.min.js"><\/script>
    <link rel="stylesheet" href="identity.css" />
  </head>
  <body>
    <div
      id="root"
      data-composition-id="subtitles"
      data-start="0"
      data-duration="${duree.toFixed(3)}"
      data-width="1080"
      data-height="1920"
      style="background: transparent"
    >
${blocs.join("\n")}
    </div>
    <script>
      const NEUTRE = "#f4f4f5";
      const VERT = "#00e676";
      const tl = gsap.timeline({ paused: true });
${anims.join("\n")}
      window.__timelines = window.__timelines || {};
      window.__timelines["subtitles"] = tl;
      tl.seek(0);
    <\/script>
  </body>
</html>
`;
}

function principal() {
  const o = options(process.argv);
  const projet = resolve(o.projet || "video-1");
  const transcriptPath = resolve(o.transcript || join(projet, "transcript.json"));
  const sortie = resolve(o.sortie || join(projet, "compositions/subtitles.html"));

  let mots = lireMots(JSON.parse(readFileSync(transcriptPath, "utf8")));

  const correctionsPath = resolve(o.corrections || join(projet, "corrections.json"));
  if (existsSync(correctionsPath)) {
    const corrections = JSON.parse(readFileSync(correctionsPath, "utf8"));
    for (const { i, texte } of corrections) {
      if (mots[i]) mots[i] = { ...mots[i], mot: texte };
    }
    mots = mots.filter((m) => m.mot);
    console.log(`${corrections.length} corrections appliquées`);
  }

  if (o.coupes) {
    const { segments } = JSON.parse(readFileSync(resolve(o.coupes), "utf8"));
    mots = mots
      .map((m) => {
        const debut = recaler(m.debut, segments);
        const fin = Math.max(recaler(m.fin, segments), debut + 0.08);
        return { ...m, debut, fin };
      });
  }

  if (!mots.length) {
    console.error("Aucun mot exploitable dans", transcriptPath);
    process.exit(1);
  }

  const duree = Number(o.duree || (mots[mots.length - 1].fin + 0.3).toFixed(3));
  const html = construireHtml(enLignes(mots, Number(o.motsParLigne || 3)), duree);

  mkdirSync(dirname(sortie), { recursive: true });
  writeFileSync(sortie, html);
  console.log(`${mots.length} mots · ${duree.toFixed(2)} s → ${sortie}`);
}

if (import.meta.url === `file://${process.argv[1]}`) principal();
