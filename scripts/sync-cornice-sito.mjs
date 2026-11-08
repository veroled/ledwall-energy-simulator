#!/usr/bin/env node
// La testata e il piè di pagina del SITO dentro il simulatore (08/11/2026, il titolare sul Calcolo
// Express: «manca qualcosa o c'è qualcosa di troppo?» — mancavano testata e piè di pagina di
// veroled.it, al loro posto c'era una striscia di link propria).
//
// Non si riscrivono a mano: si leggono dalla BUILD del sito (una pagina fatta con BaseLayout,
// `dist/tool/index.html`) e si salvano in src/app/cornice-sito.json:
//   - l'HTML di <header class="site-header">, del menu #vl-nav-overlay e di <footer class="site-footer">;
//   - le regole CSS che li riguardano (solo selettori .site-*, menu, newsletter, condivisione), più le
//     variabili che quelle regole leggono e la base comune del simulatore non definisce.
// Cosi' la cornice e' quella del sito al byte, e un cambio del sito arriva col prossimo
// `npm run deploy:site` (che lancia questo script) invece di divergere in silenzio.
//
//   VEROLED_SITE_DIR=<repo del sito> node scripts/sync-cornice-sito.mjs
//
// Serve una build del sito recente (`npm run build` nel suo repository): senza, lo script si ferma.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = process.env.VEROLED_SITE_DIR || join(process.env.HOME, 'Documents', 'veroled');
const PAGINA = join(SITE, 'dist', 'tool', 'index.html');
if (!existsSync(PAGINA)) {
  console.error(`Manca ${PAGINA}: fai prima \`npm run build\` nel repository del sito.`);
  process.exit(1);
}
const html = readFileSync(PAGINA, 'utf8');

/** Il primo elemento che si apre con `apertura`, fino al suo tag di chiusura bilanciato */
function elemento(apertura, tag) {
  const i = html.indexOf(apertura);
  if (i < 0) throw new Error(`Nella pagina del sito non c'e' ${apertura}`);
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'g');
  re.lastIndex = i;
  let livello = 0;
  for (let m; (m = re.exec(html)); ) {
    livello += m[1] ? -1 : 1;
    if (livello === 0) return html.slice(i, m.index + m[0].length);
  }
  throw new Error(`${apertura} non si chiude`);
}

let testata = elemento('<header class="site-header"', 'header');
const menu = elemento('<div id="vl-nav-overlay"', 'div');
const piede = elemento('<footer class="site-footer"', 'footer');

// Il pulsante «Condividi» vive di un modulo con l'impronta della build del sito (/_astro/…): alla
// build successiva quel file cambia nome e qui resterebbe un pulsante morto. Si toglie.
testata = testata
  .replace(/<button[^>]*data-vl-condividi[^>]*>[\s\S]*?<\/button>/g, '')
  .replace(/<script[^>]*src="\/_astro\/[^"]*"[^>]*><\/script>/g, '');
const menuSenzaCondividi = menu.replace(/<button[^>]*data-vl-condividi[^>]*>[\s\S]*?<\/button>/g, '');
if (/data-vl-condividi|\/_astro\//.test(testata + menuSenzaCondividi + piede)) {
  throw new Error('Nella cornice resta un riferimento a un file con impronta (/_astro/) o al Condividi: controllare a mano');
}

// ── Le regole CSS ──
const stile = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
const DELLA_CORNICE = /(\.site-(header|logo|cta|nav|footer)|#vl-nav|\.nt-(label|bars)|\.news-|\.lang-switch|\.compliance-|\.vl-mail)/;

/** Divide un foglio in blocchi di primo livello: { prelude, corpo } (corpo = null per le @-regole senza blocco) */
function blocchi(css) {
  const out = [];
  let i = 0;
  while (i < css.length) {
    const graffa = css.indexOf('{', i);
    const pv = css.indexOf(';', i);
    if (graffa < 0) break;
    if (pv >= 0 && pv < graffa) { out.push({ prelude: css.slice(i, pv).trim(), corpo: null }); i = pv + 1; continue; }
    let livello = 0, j = graffa;
    for (; j < css.length; j++) {
      if (css[j] === '{') livello++;
      else if (css[j] === '}' && --livello === 0) break;
    }
    out.push({ prelude: css.slice(i, graffa).trim(), corpo: css.slice(graffa + 1, j) });
    i = j + 1;
  }
  return out;
}

function filtra(css) {
  let out = '';
  for (const b of blocchi(css)) {
    if (b.corpo === null) continue;
    if (b.prelude.startsWith('@media') || b.prelude.startsWith('@supports') || b.prelude.startsWith('@container')) {
      const dentro = filtra(b.corpo);
      if (dentro) out += `${b.prelude}{${dentro}}`;
    } else if (b.prelude.startsWith('@keyframes')) {
      out += `${b.prelude}{${b.corpo}}`; // si tengono: costano poco e le animazioni del menu li cercano per nome
    } else if (!b.prelude.startsWith('@')) {
      const sel = b.prelude.split(',').map((s) => s.trim()).filter((s) => DELLA_CORNICE.test(s));
      if (sel.length) out += `${sel.join(',')}{${b.corpo}}`;
    }
  }
  return out;
}
let css = filtra(stile);
// Le animazioni non usate dalla cornice si tolgono
for (const m of [...css.matchAll(/@keyframes\s+([\w-]+)\{/g)]) {
  const nome = m[1];
  const usi = css.split(nome).length - 1;
  if (usi <= 1) css = css.replace(new RegExp(`@keyframes\\s+${nome}\\{(?:[^{}]*\\{[^{}]*\\})*[^{}]*\\}`), '');
}

// ── Le variabili che la cornice legge e la base del simulatore non ha ──
const base = readFileSync(join(RADICE, 'src', 'ui', 'tokens.css'), 'utf8');
const definiteInBase = new Set([...base.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
const usate = new Set([...css.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]));
const definizioniSito = new Map();
for (const b of blocchi(stile)) {
  if (b.corpo === null || !/^:root\b|^html\b/.test(b.prelude) || /data-theme="chiaro"|\[data-theme=light\]/.test(b.prelude)) continue;
  for (const m of b.corpo.matchAll(/(--[\w-]+)\s*:\s*([^;]+)/g)) if (!definizioniSito.has(m[1])) definizioniSito.set(m[1], m[2].trim());
}
const mancanti = [];
const aggiunte = [];
const daRisolvere = [...usate];
while (daRisolvere.length) {
  const v = daRisolvere.pop();
  if (definiteInBase.has(v) || aggiunte.some((a) => a.startsWith(`${v}:`))) continue;
  const val = definizioniSito.get(v);
  if (!val) { mancanti.push(v); continue; }
  aggiunte.push(`${v}:${val}`);
  for (const m of val.matchAll(/var\((--[\w-]+)/g)) daRisolvere.push(m[1]);
}
if (aggiunte.length) css = `:root{${aggiunte.sort().join(';')}}` + css;

// Gli script del sito che fanno vivere la cornice, nell'ordine della pagina: Turnstile e scadenze per la
// newsletter, main.client.js per menu, colonne del piede che si richiudono e indirizzi email.
const script = ['/js/vl-turnstile.js', '/js/vl-scadenza.js', '/scripts/main.client.js'].map((percorso) => {
  const m = html.match(new RegExp(`<script[^>]*src="(${percorso.replace(/[.]/g, '\\.')}(?:\\?v=[\\w]+)?)"`));
  if (!m) throw new Error(`Nella pagina del sito non c'e' lo script ${percorso}`);
  return m[1];
});

// Niente data di generazione: cambiava a ogni build del sito senza che la cornice cambiasse, e
// sporcava ogni commit. Il file cambia solo se cambia la cornice.
const uscita = {
  fonte: 'veroled.it · dist/tool/index.html (BaseLayout + SiteFooter) — rigenerato da scripts/sync-cornice-sito.mjs, non si ritocca a mano',
  testata,
  menu: menuSenzaCondividi,
  piede,
  css,
  script,
};
writeFileSync(join(RADICE, 'src', 'app', 'cornice-sito.json'), JSON.stringify(uscita, null, 1) + '\n');
console.log(`cornice del sito: testata ${testata.length} B · menu ${menuSenzaCondividi.length} B · piede ${piede.length} B · css ${css.length} B` +
  (mancanti.length ? ` · variabili senza definizione (restano al ripiego): ${mancanti.join(', ')}` : ''));
