#!/usr/bin/env node
/**
 * Coupe le rush sur ses vrais creux : la piste son est décodée, son énergie
 * mesurée toutes les 20 ms, et le seuil de silence est déduit du niveau de la
 * voix elle-même (p95 − marge). Un seuil fixe en dB ne marche pas d'un rush à
 * l'autre — le souffle d'un iPhone dans une pièce change tout.
 *
 *   node scripts/cut-silences.mjs --entree video-2/assets/rush.MOV \
 *        --sortie video-2/assets/rush-coupe.mp4 --plan video-2/cuts.json
 *
 * --retirer "23.55-30.02,…" enlève en plus des passages entiers (secondes du
 * rush) : une prise ratée, une phrase redite. Ils sont notés dans le plan
 * pour que scripts/subtitles.mjs y laisse aussi tomber les mots.
 *
 * Écrit un plan de coupe JSON (segments conservés) que scripts/subtitles.mjs
 * réutilise pour recaler les timings des mots sur la vidéo coupée.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

function options(argv) {
  const o = {};
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const cle = a.slice(2);
    o[cle] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[(i += 1)] : "true";
  }
  return o;
}

/** Énergie RMS en dB, une valeur toutes les `pas` secondes. */
export function profil(wav, pas = 0.02, sr = 16000) {
  const pcm = wav.subarray(44);
  const taille = Math.round(sr * pas);
  const valeurs = [];
  for (let i = 0; i + taille <= pcm.length / 2; i += taille) {
    let somme = 0;
    for (let j = 0; j < taille; j += 1) {
      const v = pcm.readInt16LE((i + j) * 2) / 32768;
      somme += v * v;
    }
    valeurs.push(10 * Math.log10(somme / taille + 1e-12));
  }
  return valeurs;
}

function centile(valeurs, part) {
  const tri = [...valeurs].sort((a, b) => a - b);
  return tri[Math.min(tri.length - 1, Math.floor(tri.length * part))];
}

/** Creux d'au moins `minimum` secondes sous le seuil. */
export function creux(valeurs, seuil, minimum, pas = 0.02) {
  const trouves = [];
  let debut = null;
  valeurs.forEach((v, i) => {
    const t = i * pas;
    if (v < seuil) {
      if (debut === null) debut = t;
    } else {
      if (debut !== null && t - debut >= minimum) trouves.push({ debut, fin: t });
      debut = null;
    }
  });
  if (debut !== null) trouves.push({ debut, fin: valeurs.length * pas });
  return trouves;
}

/** Complément des creux : ce qu'on garde, élargi de la respiration. */
export function segmentsGardes(blancs, duree, respiration) {
  const segments = [];
  let curseur = 0;
  for (const b of blancs) {
    const finBloc = Math.min(duree, b.debut + respiration);
    if (finBloc > curseur) segments.push({ start: curseur, end: finBloc });
    curseur = Math.max(curseur, Math.max(0, b.fin - respiration));
  }
  if (curseur < duree) segments.push({ start: curseur, end: duree });
  /* Un fragment plus court qu'un dixième de seconde n'est pas une image, c'est un sursaut. */
  return segments.filter((s) => s.end - s.start > 0.12);
}

/** Retire des passages entiers des segments gardés. */
export function retirer(segments, zones) {
  let gardes = segments;
  for (const z of zones) {
    gardes = gardes.flatMap((s) => {
      if (z.end <= s.start || z.start >= s.end) return [s];
      const morceaux = [];
      if (z.start > s.start) morceaux.push({ start: s.start, end: z.start });
      if (z.end < s.end) morceaux.push({ start: z.end, end: s.end });
      return morceaux;
    });
  }
  return gardes.filter((s) => s.end - s.start > 0.12);
}

/** Aligne les bords des segments sur les images (1/ips s). */
export function surLaGrille(segments, ips, duree) {
  const image = (t) => Math.round(t * ips) / ips;
  return segments
    .map((s) => ({ start: image(s.start), end: Math.min(image(s.end), Math.floor(duree * ips) / ips) }))
    .filter((s) => s.end - s.start > 0.12);
}

/**
 * Chaque segment est découpé par trim/atrim aux mêmes instants puis recollé par
 * concat : image et son gardent exactement la même durée, segment par segment.
 * La vidéo est d'abord remise à cadence fixe, à la cadence du rush.
 */
function filtreCoupe(segments, ips) {
  const n = segments.length;
  const v = segments.map((_, i) => `[v${i}]`).join("");
  const a = segments.map((_, i) => `[a${i}]`).join("");
  const lignes = [
    `[0:v]fps=${ips},split=${n}${v}`,
    `[0:a]asplit=${n}${a}`,
  ];
  segments.forEach((s, i) => {
    const debut = s.start.toFixed(6);
    const fin = s.end.toFixed(6);
    lignes.push(`[v${i}]trim=start=${debut}:end=${fin},setpts=PTS-STARTPTS[vt${i}]`);
    lignes.push(`[a${i}]atrim=start=${debut}:end=${fin},asetpts=PTS-STARTPTS[at${i}]`);
  });
  const paires = segments.map((_, i) => `[vt${i}][at${i}]`).join("");
  lignes.push(`${paires}concat=n=${n}:v=1:a=1[v][a]`);
  return lignes.join(";");
}

function principal() {
  const o = options(process.argv);
  if (!o.entree) {
    console.error(
      "Usage : node scripts/cut-silences.mjs --entree <rush> [--sortie <coupe.mp4>] [--plan <cuts.json>]",
    );
    process.exit(1);
  }

  const entree = resolve(o.entree);
  const ffmpeg = o.ffmpeg || "ffmpeg";
  const ffprobe = o.ffprobe || "ffprobe";
  const marge = Number(o.marge || 22); // dB sous le niveau de la voix
  const minimum = Number(o.minimum || 0.25); // durée d'un creux à couper
  const respiration = Number(o.respiration || 0.05); // gardée de chaque côté

  const duree = Number(
    execFileSync(ffprobe, [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      entree,
    ]).toString().trim(),
  );

  const wavPath = join(tmpdir(), `coupe-${process.pid}.wav`);
  execFileSync(ffmpeg, [
    "-hide_banner", "-loglevel", "error", "-y",
    "-i", entree,
    "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le",
    wavPath,
  ]);

  const valeurs = profil(readFileSync(wavPath));
  rmSync(wavPath, { force: true });

  const voix = centile(valeurs, 0.95);
  const seuil = voix - marge;
  const blancs = creux(valeurs, seuil, minimum);
  const zones = String(o.retirer || "")
    .split(",")
    .filter(Boolean)
    .map((z) => {
      const [start, end] = z.split("-").map(Number);
      return { start, end };
    });
  /* Les bords de chaque segment tombent sur une image : l'image et le son sont
     tranchés au même instant, sinon chaque coupe décale un peu la bouche de
     la voix et le décalage s'additionne d'une coupe à l'autre. */
  const [num, den] = execFileSync(ffprobe, [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=r_frame_rate",
    "-of", "default=noprint_wrappers=1:nokey=1",
    entree,
  ]).toString().trim().split("/").map(Number);
  const ips = Math.round(num / (den || 1)) || 30;
  const segments = surLaGrille(retirer(segmentsGardes(blancs, duree, respiration), zones), ips, duree);
  const gardee = segments.reduce((t, s) => t + (s.end - s.start), 0);

  const plan = {
    source: entree,
    duration: Number(duree.toFixed(3)),
    kept: Number(gardee.toFixed(3)),
    removed: Number((duree - gardee).toFixed(3)),
    cuts: Math.max(0, segments.length - 1),
    voiceLevelDb: Number(voix.toFixed(1)),
    thresholdDb: Number(seuil.toFixed(1)),
    minSilence: minimum,
    breath: respiration,
    retires: zones,
    segments: segments.map((s) => ({
      start: Number(s.start.toFixed(3)),
      end: Number(s.end.toFixed(3)),
    })),
  };

  const chemin = resolve(o.plan || "cuts.json");
  mkdirSync(dirname(chemin), { recursive: true });
  writeFileSync(chemin, `${JSON.stringify(plan, null, 2)}\n`);

  console.log(
    `voix ${voix.toFixed(1)} dB · seuil ${seuil.toFixed(1)} dB · ${blancs.length} creux · ${plan.cuts} coupes · ${plan.removed.toFixed(2)} s retirés · ${duree.toFixed(2)} s → ${gardee.toFixed(2)} s`,
  );
  console.log(`plan de coupe → ${chemin}`);

  if (o.sortie && segments.length) {
    const sortie = resolve(o.sortie);
    mkdirSync(dirname(sortie), { recursive: true });
    execFileSync(
      ffmpeg,
      [
        "-hide_banner", "-loglevel", "error", "-nostats", "-y",
        "-i", entree,
        "-filter_complex", filtreCoupe(segments, ips),
        "-map", "[v]", "-map", "[a]",
        "-r", String(ips),
        "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        "-c:a", "aac", "-b:a", "192k",
        sortie,
      ],
      { stdio: ["ignore", "ignore", "inherit"] },
    );
    console.log(`vidéo coupée → ${sortie}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) principal();
