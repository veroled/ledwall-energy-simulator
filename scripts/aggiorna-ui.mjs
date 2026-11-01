// Copia la base comune «veroled-ui» dal suo repository (veroled/veroled-ui) in src/ui/
// e scrive ui.lock.json con il commit d'origine e lo sha256 di ogni file.
//
//   node scripts/aggiorna-ui.mjs [ref]      ref di veroled-ui, predefinito origin/main
//   VEROLED_UI=<cartella>                   dov'e' il repository veroled-ui su questo PC
//                                           (predefinito: accanto a questo, ../veroled-ui)
//
// La base si modifica SOLO in veroled-ui: qui si ricopia. Una copia ritoccata a mano fa
// fallire scripts/verifica-ui.mjs, che sta dentro `npm run check`. Gemello dello script con lo
// stesso nome in veroled-platform e veroled-core: stessa forma di lock.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const RADICE = join(import.meta.dirname, '..');
const DEST = join(RADICE, 'src', 'ui');
const UI = process.env.VEROLED_UI || join(RADICE, '..', 'veroled-ui');
const ref = process.argv[2] || 'origin/main';
const git = (args, opts = {}) => execFileSync('git', ['-C', UI, ...args], { maxBuffer: 64 * 1024 * 1024, ...opts });

// Solo la base: fogli di stile e carattere. Il README resta nel suo repository.
const DELLA_BASE = /^(tokens\.css|componenti\.css|font\/.+)$/;

const commit = git(['rev-parse', `${ref}^{commit}`], { encoding: 'utf8' }).trim();
const elenco = git(['ls-tree', '-r', '--name-only', commit], { encoding: 'utf8' }).split('\n').filter((p) => DELLA_BASE.test(p));
if (!elenco.includes('tokens.css')) throw new Error(`Nel commit ${commit.slice(0, 10)} (${ref}) di veroled-ui non c'e' tokens.css`);

// Via i file della copia precedente: la copia e' esattamente quella del commit, niente di piu'.
rmSync(DEST, { recursive: true, force: true });
const file = {};
for (const p of elenco) {
  const dati = git(['show', `${commit}:${p}`]); // Buffer: i caratteri sono binari
  const dst = join(DEST, p);
  mkdirSync(dirname(dst), { recursive: true });
  writeFileSync(dst, dati);
  file[p] = createHash('sha256').update(dati).digest('hex');
}
const lock = { sorgente: 'veroled/veroled-ui', ref, commit, copiatoIl: new Date().toISOString(), file };
writeFileSync(join(RADICE, 'ui.lock.json'), JSON.stringify(lock, null, 2) + '\n');
const byte = Object.keys(file).reduce((s, rel) => s + statSync(join(DEST, rel)).size, 0);
console.log(`veroled-ui: ${Object.keys(file).length} file (${Math.round(byte / 1024)} KB) dal commit ${commit.slice(0, 10)} (${ref}) in src/ui/`);
for (const rel of readdirSync(DEST, { recursive: true }).filter((f) => statSync(join(DEST, f)).isFile())) {
  if (!file[String(rel).split('\\').join('/')]) throw new Error(`file in piu' in src/ui: ${rel}`);
}
