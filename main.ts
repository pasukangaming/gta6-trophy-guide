// Leonida Legend — a GTA VI trophy guide and tracker (gta6-trophy-guide-01).
//
// This program is the entrypoint of the repository. It takes the guide's
// static files (app/) and the screenshots (screenshots/) that sit beside
// this file and hands them in: it copies both folders into the output
// directory and writes dossier.json there, the summary the judge reads
// (the screenshots, the first load's files and bytes, and the source),
// built with the vendored make.fun library. The library file under
// vendor/ must stay exactly as the kit shipped it: the scorer rebuilds
// the dossier with its own copy and compares the two byte for byte.
//
// Runs on Node 22 with the standard library only; nothing is installed
// before it runs. Outside the grader, MAKEFUN_OUTPUT_DIR stands in for
// /output, the writable directory the grader provides:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Serve the guide locally while building it with `node serve.ts`, then
// open http://localhost:8080 in a desktop browser.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps, as the starter's comments record them: only
// text_max_bytes shapes the bytes; the other limits refuse an entry the
// scorer would refuse anyway (more than 4 screenshots, one over 256 KiB,
// more than 993 files and directories in app/ or 48 MiB of app files:
// app/ counts beside /output's own 1000-entry cap, its screenshots/ and
// dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);
