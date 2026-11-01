#!/usr/bin/env node
// Misura la demo VeroLED in un browser vero, in tutti i formati, con lo stesso metodo della pagina.
//
//   npm run verifica-demo
//
// Le prove di vitest girano in Node, dove non c'è un canvas: possono controllare COME si disegna,
// non QUANTA luce esce. Questo controllo carica src/core/demo-veroled.ts e src/core/apl-engine.ts
// in Chromium, disegna i 30 fotogrammi di ogni formato e misura la luminosità media come fa lo slot.
//
// Fallisce (codice 1) se, in un qualunque formato:
//   - il contenuto chiaro non supera l'ottimizzato di almeno 20 punti: il confronto della pagina
//     non mostrerebbe più niente;
//   - APL_DEMO_PROVVISORIO si discosta di oltre 10 punti dalla misura: la cifra che si vede per un
//     istante prima della misura sarebbe falsa;
//   - due disegni dello stesso istante non sono identici al pixel.
//
// Serve Playwright con Chromium installato sulla macchina (npx playwright install chromium).
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const { chromium } = require('playwright');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Dal palo 2×50 al nastro 150×1: i limiti della pagina (BASE_MAX_M, ALTEZZA_MAX_M), più i formati comuni
const FORMATI = [[1, 25], [1, 20], [1, 10], [1, 5], [1, 4], [1, 2], [2, 3], [1, 1], [3, 2], [5, 3], [2, 1], [4, 1], [5, 1], [8, 1], [20, 1], [100, 1], [150, 1]];
const SCARTO_MISURA = 1;
const SCARTO_MINIMO = 20;
const TOLLERANZA_PROVVISORIO = 10;

// Due moduli senza import: trascritti in JavaScript e messi in fila nello stesso script
const js = (file) =>
  ts.transpileModule(readFileSync(resolve(root, file), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } })
    .outputText.replace(/^export /gm, '');
const codice = js('src/core/apl-engine.ts') + '\n' + js('src/core/demo-veroled.ts');

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="${pathToFileURL(resolve(root, 'src/ui/font/font.css'))}"></head><body>
<script>${codice}
window.misura = async (versione, rw, rh) => {
  const testo = TESTI_DEMO.parole.join('') + TESTI_DEMO.firma;
  await document.fonts.load('700 40px ' + FONT_DEMO, testo);
  await document.fonts.load('500 40px ' + FONT_DEMO, testo);
  // Col carattere di sistema la misura sarebbe di un altro disegno: meglio fermarsi
  if (!document.fonts.check('700 40px ' + FONT_DEMO, testo)) throw new Error('carattere Google Sans Flex non caricato');
  const img = new Image();
  img.src = ${JSON.stringify(pathToFileURL(resolve(root, 'public')).href)} + VERSIONI_DEMO[versione].scritta;
  await img.decode();
  const frames = fotogrammiDemo(versione, rw, rh, img);
  const m = aplDaFrames(frames, rw, rh, 'cover');
  // La stessa media letta su TUTTI i pixel dei fotogrammi, senza passare dal campionamento: se il
  // campionatore ritaglia (nei formati estremi teneva solo il centro) le due cifre si separano
  let somma = 0;
  for (const f of frames) somma += calcolaImageDataApl(f.getContext('2d').getImageData(0, 0, f.width, f.height));
  return { ...m, pieno: somma / frames.length, lato: frames[0].width + 'x' + frames[0].height, forma: frames[0].width / frames[0].height };
};
// Il campionatore su un'immagine asimmetrica: 80 % bianco da un capo, il resto nero. Tutti i pixel
// dicono 80 %; un campionatore che ritaglia il centro direbbe un'altra cifra.
window.campionatore = (rw, rh) => {
  const c = document.createElement('canvas');
  const lungo = 2000, corto = Math.max(4, Math.round(lungo * Math.min(rw, rh) / Math.max(rw, rh)));
  c.width = rw >= rh ? lungo : corto; c.height = rw >= rh ? corto : lungo;
  const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = '#fff';
  if (rw >= rh) x.fillRect(0, 0, c.width * 0.8, c.height); else x.fillRect(0, 0, c.width, c.height * 0.8);
  return aplDaFrames([c], rw, rh, 'cover').averageAplPercent;
};
window.impronta = async (versione, t) => {
  const c = document.createElement('canvas'); c.width = 300; c.height = 200;
  const x = c.getContext('2d');
  disegnaDemo(x, t, 300, 200, versione, null);
  const d = x.getImageData(0, 0, 300, 200).data;
  let h = 0; for (let i = 0; i < d.length; i++) h = (h * 31 + d[i]) >>> 0;
  return h;
};
window.provvisorio = APL_DEMO_PROVVISORIO;
</script></body></html>`;

const dir = mkdtempSync(resolve(tmpdir(), 'verifica-demo-'));
const pagina = resolve(dir, 'demo.html');
writeFileSync(pagina, html);

// I file locali vanno trattati come stessa origine, altrimenti la scritta «sporca» il canvas e la misura non si legge
const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const errori = [];
try {
  const p = await browser.newPage();
  p.on('pageerror', (e) => errori.push(`errore nella pagina: ${e.message}`));
  await p.goto(pathToFileURL(pagina).href);
  const provv = await p.evaluate(() => window.provvisorio);

  console.log('formato   chiaro   ottimizzato   scarto');
  for (const [rw, rh] of FORMATI) {
    const a = await p.evaluate(([w, h]) => window.misura('chiaro', w, h), [rw, rh]);
    const b = await p.evaluate(([w, h]) => window.misura('ottimizzato', w, h), [rw, rh]);
    const scarto = a.averageAplPercent - b.averageAplPercent;
    console.log(`${`${rw}:${rh}`.padEnd(8)}  ${a.averageAplPercent.toFixed(1).padStart(5)}%  ${b.averageAplPercent.toFixed(1).padStart(10)}%  ${scarto.toFixed(1).padStart(6)} punti`);
    const forma = a.forma / (rw / rh);
    if (Math.abs(forma - 1) > 0.02) errori.push(`${rw}:${rh}: i fotogrammi della misura sono ${a.lato}, cioè un altro formato (${((forma - 1) * 100).toFixed(0)}%)`);
    const camp = await p.evaluate(([w, h]) => window.campionatore(w, h), [rw, rh]);
    if (Math.abs(camp - 80) > SCARTO_MISURA) errori.push(`${rw}:${rh}: su un'immagine bianca all'80% il campionatore legge ${camp}%`);
    for (const [v, m] of [['chiaro', a], ['ottimizzato', b]]) {
      const d = Math.abs(m.averageAplPercent - m.pieno);
      if (d > SCARTO_MISURA) errori.push(`${rw}:${rh} ${v}: il campionamento dice ${m.averageAplPercent}%, tutti i pixel ${m.pieno.toFixed(1)}% (${d.toFixed(1)} punti, fotogrammi ${m.lato})`);
    }
    if (scarto < SCARTO_MINIMO) errori.push(`${rw}:${rh}: lo scarto è ${scarto.toFixed(1)} punti, ne servono almeno ${SCARTO_MINIMO}`);
    for (const [v, m] of [['chiaro', a], ['ottimizzato', b]]) {
      const d = Math.abs(provv[v] - m.averageAplPercent);
      if (d > TOLLERANZA_PROVVISORIO) errori.push(`${rw}:${rh} ${v}: il valore provvisorio ${provv[v]}% dista ${d.toFixed(1)} punti dalla misura (${m.averageAplPercent}%), oltre i ${TOLLERANZA_PROVVISORIO}`);
    }
  }

  for (const v of ['chiaro', 'ottimizzato']) {
    const [h1, h2] = [await p.evaluate(([v]) => window.impronta(v, 7.3), [v]), await p.evaluate(([v]) => window.impronta(v, 7.3), [v])];
    if (h1 !== h2) errori.push(`${v}: due disegni dello stesso istante sono diversi (${h1} ≠ ${h2})`);
  }
} finally {
  await browser.close();
}

if (errori.length) {
  console.error(`\n✗ ${errori.length} controlli non superati:\n  - ${errori.join('\n  - ')}`);
  process.exit(1);
}
console.log('\n✓ demo verificata: scarto ≥ 20 punti in ogni formato, valore provvisorio entro 10 punti, disegno ripetibile');
