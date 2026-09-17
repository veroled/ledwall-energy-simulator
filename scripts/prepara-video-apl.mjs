#!/usr/bin/env node
// Prepara i video dimostrativi del confronto contenuti (slot A "chiaro" / slot B "ottimizzato").
//
// Sorgente: i 9 formati × 2 versioni del titolare (`<formato>_originale.mp4` = contenuto chiaro,
// `<formato>_standard.mp4` = stesso spot rigradato a basso APL), in `public/videos/apl-formati/`
// del repo del sito oppure in ~/Movies/VeroLED_APL_Videos.
//
// ⛔ Gli originali NON si pubblicano: 328 MB, e quattro superano i 25 MiB per file che Cloudflare
//    Pages accetta. Qui diventano clip da ~1-2 MB: 24 s (la finestra 15-39 s, che ha la stessa media
//    APL dell'intero spot in entrambe le versioni), lato lungo 854 px, senza audio.
// ⛔ L'APL di riserva scritto in `src/config/video-apl.json` è MISURATO sul file prodotto (luma media
//    con ffmpeg), non stimato: l'interfaccia lo usa solo se il browser non riesce ad analizzare il video.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const candidati = [
  process.env.VIDEO_APL_DIR,
  resolve(process.env.VEROLED_SITE_DIR || resolve(homedir(), 'Documents/veroled'), 'public/videos/apl-formati'),
  resolve(homedir(), 'Movies/VeroLED_APL_Videos'),
].filter(Boolean);
const src = candidati.find((d) => existsSync(d));
if (!src) { console.error('Sorgenti non trovati in:', candidati); process.exit(1); }

const outDir = resolve(root, 'public/videos/apl-formati');
mkdirSync(outDir, { recursive: true });
const INIZIO = 15, DURATA = 24, LATO_LUNGO = 854;

const formati = [...new Set(readdirSync(src).map((f) => f.match(/^(\d+)x(\d+)_(originale|standard)\.mp4$/)?.slice(1, 3).join('x')).filter(Boolean))]
  .sort((a, b) => { const [aw, ah] = a.split('x').map(Number), [bw, bh] = b.split('x').map(Number); return aw / ah - bw / bh; });

const aplMisurato = (file) => {
  const out = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', 'fps=2,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-', '-f', 'null', '-'], { encoding: 'utf8' });
  const y = [...out.matchAll(/YAVG=([0-9.]+)/g)].map((m) => Math.max(0, ((Number(m[1]) - 16) / 219) * 100));
  return Math.round((y.reduce((a, b) => a + b, 0) / y.length) * 10) / 10;
};

const righe = [];
for (const formato of formati) {
  const [w, h] = formato.split('x').map(Number);
  const riga = { formato, w, h };
  for (const [versione, chiave] of [['originale', 'chiaro'], ['standard', 'ottimizzato']]) {
    const input = resolve(src, `${formato}_${versione}.mp4`);
    const nome = `${formato}_${chiave}.mp4`;
    const output = resolve(outDir, nome);
    const scala = w >= h ? `scale=${LATO_LUNGO}:-2` : `scale=-2:${LATO_LUNGO}`;
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-ss', String(INIZIO), '-t', String(DURATA), '-i', input, '-an', '-vf', `${scala},fps=25`,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '29', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', output]);
    riga[chiave] = { file: nome, aplPercent: aplMisurato(output), kb: Math.round(statSync(output).size / 1024) };
    console.log(`${nome.padEnd(22)} ${String(riga[chiave].kb).padStart(5)} KB · APL ${riga[chiave].aplPercent}%`);
  }
  righe.push(riga);
}

writeFileSync(resolve(root, 'src/config/video-apl.json'), JSON.stringify({ fonte: 'scripts/prepara-video-apl.mjs', finestra: { inizioSec: INIZIO, durataSec: DURATA }, formati: righe }, null, 2) + '\n');
console.log(`\n${righe.length} formati → ${outDir}`);
