#!/usr/bin/env node
/**
 * Repère les blancs de la bande sonore et coupe le rush dessus, en gardant
 * une respiration de chaque côté pour ne jamais rogner la parole.
 *
 *   node scripts/cut-silences.mjs --entree video-1/assets/rush.mp4 \
 *        --sortie video-1/assets/rush-coupe.mp4 --plan video-1/cuts.json
 *
 * Écrit un plan de coupe JSON (segments conservés) que scripts/subtitles.mjs
 * réutilise pour recaler les timings des mots sur la vidéo coupée.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

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

/** Transforme la sortie de `silencedetect` en liste de blancs [{debut, fin}]. */
export function lireBlancs(journal, duree) {
  const blancs = [];
  let debut = null;
  for (const ligne of journal.split("\n")) {
    const d = ligne.match(/silence_start:\s*(-?[\d.]+)/);
    if (d) debut = Math.max(0, Number(d[1]));
    const f = ligne.match(/silence_end:\s*(-?[\d.]+)/);
    if (f && debut !== null) {
      blancs.push({ debut, fin: Math.min(duree, Number(f[1])) });
      debut = null;
    }
  }
  if (debut !== null) blancs.push({ debut, fin: duree });
  return blancs.filter((b) => b.fin > b.debut);
}

/** Complément des blancs : ce qu'on garde, élargi de la respiration. */
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

function expressionSelect(segments) {
  return segments.map((s) => `between(t,${s.start.toFixed(3)},${s.end.toFixed(3)})`).join("+");
}

function principal() {
  const o = options(process.argv);
  if (!o.entree) {
    console.error("Usage : node scripts/cut-silences.mjs --entree <rush.mp4> [--sortie <coupe.mp4>] [--plan <cuts.json>]");
    process.exit(1);
  }

  const entree = resolve(o.entree);
  const ffmpeg = o.ffmpeg || "ffmpeg";
  const ffprobe = o.ffprobe || "ffprobe";
  const seuil = o.seuil || "-35dB";
  const minimum = Number(o.minimum || 0.28);
  const respiration = Number(o.respiration || 0.06);

  const duree = Number(
    execFileSync(ffprobe, [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      entree,
    ]).toString().trim(),
  );

  const detection = spawnSync(
    ffmpeg,
    [
      "-hide_banner", "-nostats",
      "-i", entree,
      "-af", `silencedetect=noise=${seuil}:d=${minimum}`,
      "-f", "null", "-",
    ],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  if (detection.error) throw detection.error;
  const journal = `${detection.stderr || ""}${detection.stdout || ""}`;

  const blancs = lireBlancs(journal, duree);
  const segments = segmentsGardes(blancs, duree, respiration);
  const gardee = segments.reduce((t, s) => t + (s.end - s.start), 0);

  const plan = {
    source: entree,
    duration: Number(duree.toFixed(3)),
    kept: Number(gardee.toFixed(3)),
    removed: Number((duree - gardee).toFixed(3)),
    cuts: Math.max(0, segments.length - 1),
    threshold: seuil,
    minSilence: minimum,
    breath: respiration,
    segments: segments.map((s) => ({ start: Number(s.start.toFixed(3)), end: Number(s.end.toFixed(3)) })),
  };

  const chemin = resolve(o.plan || "cuts.json");
  mkdirSync(dirname(chemin), { recursive: true });
  writeFileSync(chemin, `${JSON.stringify(plan, null, 2)}\n`);

  console.log(
    `${blancs.length} blancs · ${plan.cuts} coupes · ${plan.removed.toFixed(2)} s retirés · ${duree.toFixed(2)} s → ${gardee.toFixed(2)} s`,
  );
  console.log(`plan de coupe → ${chemin}`);

  if (o.sortie && segments.length) {
    const sortie = resolve(o.sortie);
    const expr = expressionSelect(segments);
    mkdirSync(dirname(sortie), { recursive: true });
    execFileSync(
      ffmpeg,
      [
        "-hide_banner", "-nostats", "-y",
        "-i", entree,
        "-vf", `select='${expr}',setpts=N/FRAME_RATE/TB`,
        "-af", `aselect='${expr}',asetpts=N/SR/TB`,
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
