#!/usr/bin/env node
/**
 * Fabrique les sound effects du montage avec ffmpeg, sans rien télécharger.
 * Cinq sons discrets, volontairement sobres : deux clics, un souffle,
 * une notification, une basse de fin.
 *
 *   node scripts/sfx.mjs --projet video-1
 */

import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const SONS = [
  // Le clic du compteur : sinus court, décroissance immédiate.
  { nom: "clic.wav", duree: 0.12, expr: "0.45*sin(2*PI*1200*t)*exp(-45*t)" },
  // Le souffle d'arrivée d'une image : bruit filtré, montée puis chute.
  { nom: "souffle.wav", duree: 0.55, expr: "0.22*sin(2*PI*(220+900*t)*t)*sin(PI*t/0.55)" },
  // La notification : deux tons, une quinte.
  {
    nom: "notification.wav",
    duree: 0.42,
    expr: "0.32*(sin(2*PI*880*t)*between(t,0,0.13)+sin(2*PI*1320*t)*between(t,0.14,0.34))*exp(-3*t)",
  },
  // La basse de la cartouche de fin.
  { nom: "basse.wav", duree: 0.9, expr: "0.5*sin(2*PI*60*t)*exp(-3.2*t)" },
  // Le tampon qui tombe : impact mat.
  { nom: "impact.wav", duree: 0.35, expr: "0.45*sin(2*PI*(150-120*t)*t)*exp(-9*t)" },
];

function options(argv) {
  const o = {};
  for (let i = 2; i < argv.length; i += 1) {
    if (!argv[i].startsWith("--")) continue;
    const cle = argv[i].slice(2);
    o[cle] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[(i += 1)] : "true";
  }
  return o;
}

function principal() {
  const o = options(process.argv);
  const ffmpeg = o.ffmpeg || "ffmpeg";
  const dossier = resolve(o.sortie || join(o.projet || "video-1", "assets/sfx"));
  mkdirSync(dossier, { recursive: true });

  for (const son of SONS) {
    const chemin = join(dossier, son.nom);
    execFileSync(
      ffmpeg,
      [
        "-hide_banner", "-loglevel", "error", "-y",
        "-f", "lavfi",
        "-i", `aevalsrc='${son.expr}':s=48000:d=${son.duree}`,
        "-ac", "1", "-c:a", "pcm_s16le",
        chemin,
      ],
      { stdio: ["ignore", "ignore", "inherit"] },
    );
    console.log(`${son.nom} · ${son.duree}s`);
  }
  console.log(`${SONS.length} sons → ${dossier}`);
}

if (import.meta.url === `file://${process.argv[1]}`) principal();
