#!/usr/bin/env node
// Genera i video dimostrativi del confronto contenuti (slot A «chiaro», slot B «ottimizzato»).
//
// Sostituiscono gli spot di terzi che c'erano prima: un marchio non nostro su una pagina pubblica,
// e con le bande registrate dentro il file, che «Riempi» non poteva togliere. Qui ogni formato e'
// disegnato alla sua misura, senza bande, e le due versioni sono lo STESSO contenuto: cambia solo
// quanta luce emette, che e' esattamente il confronto che la pagina fa vedere.
//
//   node scripts/genera-video-demo.mjs [formato ...]     es. 3x2   (senza argomenti: tutti e nove)
//
// Serve Playwright con Chromium (npx playwright install chromium) e ffmpeg nel PATH.
// Il disegno e' calcolato dal tempo del fotogramma, non dall'orologio: due lanci danno lo stesso file.
//
// ⛔ La luminosita' media scritta in src/config/video-apl.json e' MISURATA sul file prodotto, con lo
//    stesso metodo della pagina (src/core/apl-engine.ts: luma Rec.709 sui valori del segnale, 30
//    fotogrammi, 160 px di lato). L'interfaccia la usa solo se il browser non riesce ad analizzare il video.
import { createRequire } from 'node:module';
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, statSync, existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Playwright come in scripts/ del CMS: preso dall'installazione della macchina, non dalle dipendenze.
const { chromium } = createRequire(import.meta.url)('playwright');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'public/videos/apl-formati');
const FORMATI = ['1x4', '1x3', '1x2', '2x3', '1x1', '3x2', '2x1', '3x1', '4x1'];
const FPS = 30, DURATA = 24, LATO_LUNGO = 854;

// Le righe di testo: approvate dal titolare prima della pubblicazione.
const TESTI = { parole: ['LEDWALL', 'VETRINE', 'EVENTI', 'CITTÀ'], firma: 'veroled.it' };

const VERSIONI = {
  // Stesso disegno, due quantita' di luce. «chiaro»: fondo crema e testo scuro; «ottimizzato»: fondo
  // nero e testo chiaro. Il pannello di pixel e' identico nelle due versioni.
  chiaro: { fondo: '#f4f1ea', testo: '#1b1c1e', scritta: 'scritta-nera.svg' },
  ottimizzato: { fondo: '#000000', testo: '#e8eaed', scritta: 'scritta-bianca.svg' },
};

const pagina = (v) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: 'GSF'; src: url('${pathToFileURL(resolve(root, 'src/ui/font/google-sans-flex-latin-wght-normal.woff2'))}') format('woff2-variations'); font-weight: 1 1000; }
html, body { margin: 0; background: ${v.fondo}; overflow: hidden; }
canvas { display: block; }
</style></head><body><canvas id="c"></canvas><img id="s" src="${pathToFileURL(resolve(root, 'public/brand', v.scritta))}">
<script>
const V = ${JSON.stringify(v)}, T = ${JSON.stringify(TESTI)};
const COLORI = ['#2f6fdb', '#d9542c', '#1f9d55', '#e0a020'];
window.disegna = (t, W, H) => {
  const c = document.getElementById('c'); c.width = W; c.height = H;
  const x = c.getContext('2d'); const u = Math.min(W, H) / 100; const orizz = W >= H;
  x.fillStyle = V.fondo; x.fillRect(0, 0, W, H);
  // Il pannello di pixel: due terzi bassi dell'immagine, su fondo scuro in tutte e due le versioni,
  // acceso da un'onda. E' la parte uguale; cambia solo il fondo sopra, ed e' il confronto della pagina:
  // stesso contenuto, il fondo chiaro costa piu' luce.
  const gy0 = Math.round(H * 0.38);
  x.fillStyle = '#111111'; x.fillRect(0, gy0, W, H - gy0);
  const lato = Math.max(6, Math.round(u * 7)), passo = lato + Math.max(2, Math.round(u * 1.2));
  for (let gy = gy0 + (passo - lato) / 2; gy < H; gy += passo) for (let gx = (passo - lato) / 2; gx < W; gx += passo) {
    const i = Math.round(gx / passo), j = Math.round((gy - gy0) / passo);
    const onda = 0.5 + 0.5 * Math.cos(2 * Math.PI * (t / 6 - (i + j) / 14));
    x.fillStyle = COLORI[(i * 3 + j + Math.floor(t / 6)) % 4];
    x.globalAlpha = 0.5 + 0.5 * onda;
    x.fillRect(gx, gy, lato, lato);
  }
  x.globalAlpha = 1;
  // Sopra il pannello: la scritta ufficiale cosi' com'e', la parola che cambia, la firma.
  const alto = gy0, s = document.getElementById('s');
  const sw = Math.min(W * 0.6, alto * 0.22 * 836.6 / 132, u * 70), sh = sw * 132 / 836.6;
  x.drawImage(s, (W - sw) / 2, alto * 0.12, sw, sh);
  // La parola cambia ogni 6 s: entra, resta, esce. 24 s = 4 parole: il ciclo si richiude.
  const k = Math.floor(t / 6) % T.parole.length, f = (t % 6) / 6;
  const a = Math.min(1, f / 0.12, (1 - f) / 0.12);
  const dim = Math.min(W * 0.84 / (T.parole[k].length * 0.64), alto * 0.34);
  x.font = '700 ' + dim + 'px GSF'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.globalAlpha = a; x.fillStyle = V.testo;
  x.fillText(T.parole[k], W / 2 + (1 - a) * u * 6, alto * 0.6);
  x.globalAlpha = 1;
  x.font = '500 ' + Math.max(10, Math.min(u * 4.2, alto * 0.1)) + 'px GSF'; x.fillText(T.firma, W / 2, alto * 0.88);
};
</script></body></html>`;

function misura(file) {
  // 30 fotogrammi equidistanti, 160 px di lato, luma Rec.709 sui valori del segnale: come la pagina.
  const [w, h] = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file], { encoding: 'utf8' }).trim().split(',').map(Number);
  const sh = Math.max(8, Math.round((160 * h) / w));
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', `fps=30/${DURATA},scale=160:${sh}`, '-frames:v', '30', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 64 * 1024 * 1024 });
  const per = 160 * sh * 3, valori = [];
  for (let o = 0; o + per <= raw.length; o += per) {
    let s = 0;
    for (let p = o; p < o + per; p += 3) s += (0.2126 * raw[p] + 0.7152 * raw[p + 1] + 0.0722 * raw[p + 2]) / 255;
    valori.push((s / (per / 3)) * 100);
  }
  const r = (n) => Math.round(n * 10) / 10;
  return { aplPercent: r(valori.reduce((a, b) => a + b, 0) / valori.length), minPercent: r(Math.min(...valori)), maxPercent: r(Math.max(...valori)) };
}

const scelti = process.argv.slice(2).length ? process.argv.slice(2) : FORMATI;
const browser = await chromium.launch();
const risultati = {};
for (const formato of scelti) {
  const [fw, fh] = formato.split('x').map(Number);
  const W = fw >= fh ? LATO_LUNGO : 2 * Math.round((LATO_LUNGO * fw) / fh / 2);
  const H = fw >= fh ? 2 * Math.round((LATO_LUNGO * fh) / fw / 2) : LATO_LUNGO;
  risultati[formato] = { formato, w: fw, h: fh };
  for (const [chiave, v] of Object.entries(VERSIONI)) {
    const p = await browser.newPage({ viewport: { width: W, height: H } });
    // Da un file e non da setContent: una pagina senza indirizzo non puo' leggere il carattere e la
    // scritta dal disco (il browser lo blocca come errore di rete).
    const html = resolve(mkdtempSync(resolve(tmpdir(), 'video-demo-')), 'pagina.html');
    writeFileSync(html, pagina(v));
    await p.goto(pathToFileURL(html).href, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.load("700 40px GSF"));
    const nome = `${formato}_${chiave}.mp4`, out = resolve(outDir, nome);
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '28', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let i = 0; i < FPS * DURATA; i++) {
      await p.evaluate(([t, w, h]) => window.disegna(t, w, h), [i / FPS, W, H]);
      const png = await p.locator('#c').screenshot({ type: 'png' });
      if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
    }
    ff.stdin.end();
    await new Promise((r, x) => ff.on('close', (c) => (c === 0 ? r() : x(new Error('ffmpeg ' + c)))));
    await p.close();
    const m = misura(out);
    risultati[formato][chiave] = { file: nome, ...m, kb: Math.round(statSync(out).size / 1024) };
    console.log(`${nome.padEnd(22)} ${W}x${H} ${String(risultati[formato][chiave].kb).padStart(5)} KB · APL ${m.aplPercent}% (da ${m.minPercent} a ${m.maxPercent})`);
  }
}
await browser.close();

// Si aggiornano solo i formati generati: gli altri restano come sono.
const json = resolve(root, 'src/config/video-apl.json');
const prima = existsSync(json) ? JSON.parse(readFileSync(json, 'utf8')) : { formati: [] };
const formati = FORMATI.map((f) => risultati[f] ?? prima.formati.find((x) => x.formato === f)).filter(Boolean);
writeFileSync(json, JSON.stringify({ fonte: 'scripts/genera-video-demo.mjs', durataSec: DURATA, formati }, null, 2) + '\n');
