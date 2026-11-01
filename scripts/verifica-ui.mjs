// Verifica che src/ui/ sia la copia esatta della base «veroled-ui» registrata in ui.lock.json
// e, se il repository veroled-ui e' su questo PC, che la base non sia cambiata da allora.
//
//   node scripts/verifica-ui.mjs          (sta dentro `npm run check`)
//   VEROLED_UI=<cartella>                 repository veroled-ui (predefinito ../veroled-ui)
//   VEROLED_UI_REF=<ref>                  ramo con cui confrontare (predefinito: quello del lock)
//
// Fallisce (uscita 1) se:
//   1. un file di src/ui/ e' stato ritoccato, manca o e' in piu' rispetto al lock — la base si
//      modifica in veroled-ui e si ricopia con scripts/aggiorna-ui.mjs, mai qui;
//   2. la base in veroled-ui (al ref indicato) e' diversa da quella del commit nel lock.
// Senza il repository veroled-ui accanto il secondo controllo si salta, e lo si dice.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RADICE = join(import.meta.dirname, '..');
const DEST = join(RADICE, 'src', 'ui');
const lock = JSON.parse(readFileSync(join(RADICE, 'ui.lock.json'), 'utf8'));
const errori = [];

const suDisco = existsSync(DEST)
  ? readdirSync(DEST, { recursive: true }).map((f) => String(f).split('\\').join('/')).filter((f) => statSync(join(DEST, f)).isFile())
  : [];
for (const [rel, atteso] of Object.entries(lock.file)) {
  const p = join(DEST, rel);
  if (!existsSync(p)) { errori.push(`src/ui/${rel} non c'e'`); continue; }
  const vero = createHash('sha256').update(readFileSync(p)).digest('hex');
  if (vero !== atteso) errori.push(`src/ui/${rel}: ${vero.slice(0, 12)}… invece di ${atteso.slice(0, 12)}… — la base si modifica in veroled-ui e si ricopia con scripts/aggiorna-ui.mjs`);
}
for (const rel of suDisco) if (!(rel in lock.file)) errori.push(`src/ui/${rel} non e' nel lock: aggiunto a mano?`);

const UI = process.env.VEROLED_UI || join(RADICE, '..', 'veroled-ui');
const ref = process.env.VEROLED_UI_REF || lock.ref;
let nota = '';
if (existsSync(join(UI, '.git'))) {
  const git = (args) => execFileSync('git', ['-C', UI, ...args], { encoding: 'utf8' }).trim();
  try {
    const ora = git(['rev-parse', `${ref}^{commit}`]);
    // Si confrontano i soli file della base: un README cambiato in veroled-ui non chiede di ricopiare.
    const base = (c) => Object.keys(lock.file).sort().map((rel) => { try { return `${rel}:${git(['rev-parse', `${c}:${rel}`])}`; } catch { return `${rel}:assente`; } }).join('\n');
    const nuovi = git(['ls-tree', '-r', '--name-only', ora]).split('\n').filter((p) => /^(tokens\.css|componenti\.css|font\/.+)$/.test(p) && !(p in lock.file));
    if (base(ora) !== base(lock.commit) || nuovi.length) {
      errori.push(`la base in veroled-ui e' cambiata: il simulatore e' al commit ${lock.commit.slice(0, 10)}, ${ref} e' a ${ora.slice(0, 10)} — esegui node scripts/aggiorna-ui.mjs ${ref} e rilancia le prove`);
    } else nota = `stessa base di ${ref} (${ora.slice(0, 10)})`;
  } catch (e) {
    errori.push(`confronto con veroled-ui non riuscito (${ref}): ${String(e.message).split('\n')[0]}`);
  }
} else nota = `repository veroled-ui non trovato in ${UI}: confronto con la base saltato`;

if (errori.length) {
  console.error('veroled-ui: VERIFICA FALLITA');
  errori.forEach((e) => console.error('  - ' + e));
  process.exit(1);
}
console.log(`veroled-ui: ${Object.keys(lock.file).length} file identici al lock (commit ${lock.commit.slice(0, 10)}); ${nota}`);
