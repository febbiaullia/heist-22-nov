// Velvet Vault — Midnight Heist (make.fun best-heist-game-20261122-0559)
// A top-down 2D canvas heist game, hand-in program (Node 22, standard library only).
// The game lives in this directory's game/ folder: plain static files a desktop browser
// loads offline (game/index.html and its ES modules, no library, no network request).
// The thief crosses one museum gallery past patrolling guards with vision cones and
// sweeping security cameras, grabs the vault loot, and reaches the getaway exit while
// the alarm meter stays below the bust line. The program copies game/ and screenshots/
// from beside this file to /output and writes /output/dossier.json, the summary the
// judge reads, with the vendored make.fun library. After writing the dossier it rebuilds
// it from the output files and refuses to finish when the two do not match byte for byte,
// the same comparison the gate runs on the entry.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Count the plain files under a directory, subdirectories included, so the run
// summary can say how much of the entry was handed in.
function countFiles(dir: string): number {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    total += entry.isDirectory() ? countFiles(join(dir, entry.name)) : 1;
  }
  return total;
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
const dossierOptions = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};
const dossierPath = join(out, 'dossier.json');
writeFileSync(dossierPath, buildDossier(out, dossierOptions));

// Self-check: rebuild the dossier from the files just written and refuse to finish
// when it differs byte for byte from the copy on disk, the same comparison the gate
// runs. buildDossier reads only the game/ and screenshots/ files, so the two strings
// must be equal.
const written = readFileSync(dossierPath, 'utf8');
const rebuilt = Buffer.from(buildDossier(out, dossierOptions)).toString('utf8');
if (written !== rebuilt) {
  throw new Error('dossier mismatch: rebuilt dossier differs from the written dossier.json');
}

const gameFiles = countFiles(join(out, 'game'));
const shotFiles = countFiles(join(out, 'screenshots'));
console.log(`Velvet Vault — Midnight Heist: ${gameFiles} game files, ${shotFiles} screenshots, dossier ${Buffer.byteLength(written, 'utf8')} bytes, self-check passed`);
