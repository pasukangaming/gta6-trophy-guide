// Leonida Legend — GTA VI trophy guide and tracker (gta6-trophy-guide-01).
//
// This is the entrypoint of the repository. It hands the guide in: the
// static app (app/) and the screenshots (screenshots/) beside this file
// are copied into the output directory, and dossier.json is written there
// — the summary the judge reads (screenshots, first-load files and bytes,
// and the source), built with the vendored make.fun library. The library
// under vendor/ must stay exactly as the kit shipped it: the scorer
// rebuilds the dossier with its own copy and compares the two byte for
// byte, so never edit it.
//
// Node 22, standard library only; nothing is installed before it runs.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output, the
// writable directory the grader provides:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// While building, serve the guide with `node serve.ts` and open
// http://localhost:8080 in a desktop browser.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const shotsDir = join(repoRoot, 'screenshots');

// Both inputs are required: a dossier built without the app or without
// screenshots would pass this script and then fail the scorer's gate, so
// fail here with a plain error instead of silently handing in a broken
// output directory.
const appDir = join(repoRoot, 'app');
if (!existsSync(appDir)) {
  throw new Error(`app/ is missing from the repository at ${appDir}`);
}
if (!existsSync(shotsDir)) {
  throw new Error(`screenshots/ is missing from the repository at ${shotsDir}`);
}

mkdirSync(outDir, { recursive: true });
cpSync(appDir, join(outDir, 'app'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

// The scorer's caps (from the kit's gate): only text_max_bytes shapes the
// bytes; the other limits refuse an entry the scorer would refuse anyway —
// more than 4 screenshots or one over 256 KiB; more than 993 files and
// directories in app/ or 48 MiB of app files. app/ counts beside /output's
// own 1000-entry cap, its screenshots/ and dossier.json. Kept in one named
// constant so the limits are visible at a glance and cannot drift apart
// between the build and the comment above.
const DOSSIER_OPTIONS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
};
const dossier = buildDossier(outDir, DOSSIER_OPTIONS);
writeFileSync(join(outDir, 'dossier.json'), dossier);
