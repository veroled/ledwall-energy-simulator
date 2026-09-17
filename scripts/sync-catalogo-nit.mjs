#!/usr/bin/env node
// Copia nel simulatore i nit di listino per ogni combinazione tier × passo (solo outdoor),
// leggendoli dal listino del sito veroledsrl.com: `src/data/listino-ledwall.json`, la stessa
// fonte della pagina /prezzi-ledwall.
//
// ⛔ I valori NON si scrivono né si correggono a mano in `src/config/catalogo-nit.json`:
//    una combinazione che nel listino non c'è resta assente, e il simulatore la dichiara
//    "dato non disponibile" invece di prendere il valore di un altro tier o di un altro passo.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const site = process.env.VEROLED_SITE_DIR || resolve(homedir(), 'Documents/veroled');
const src = resolve(site, 'src/data/listino-ledwall.json');
const out = resolve(root, 'src/config/catalogo-nit.json');

const TIERS = ['diamond', 'platinum', 'gold', 'silver', 'bronze', 'essential'];
const listino = JSON.parse(readFileSync(src, 'utf8'));

const rows = listino
  .filter((r) => r.t === 'outdoor' && TIERS.includes(r.s) && Number.isFinite(r.p) && Number.isFinite(r.n) && r.n > 0)
  .map((r) => ({
    tier: r.s,
    pitchMm: r.p,
    maxNits: r.n,
    chip: String(r.c || '').trim(),
    // prezzo di listino al m², la stessa cifra di /prezzi-ledwall e /noleggio-operativo (null se assente)
    prezzoMq: Number.isFinite(r.pr) && r.pr > 0 ? r.pr : null,
  }))
  .sort((a, b) => TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier) || a.pitchMm - b.pitchMm);

const doppioni = rows.filter((r, i) => rows.findIndex((x) => x.tier === r.tier && x.pitchMm === r.pitchMm) !== i);
if (doppioni.length) {
  console.error('Combinazioni tier × passo duplicate nel listino, non so quale nit usare:', doppioni);
  process.exit(1);
}

// ── Noleggio operativo: coefficienti del broker, assicurazione, istruttoria e posa ──
// Si leggono dai sorgenti del sito, che `test/noleggio-coeff.test.ts` tiene allineati fra loro:
// qui NON nasce una quarta tabella scritta a mano, si copia quella.
const pricing = readFileSync(resolve(site, 'src/components/preventivo/ledwall-pricing.ts'), 'utf8');
const posaSrc = readFileSync(resolve(site, 'src/data/listino-installazione.ts'), 'utf8');
const grab = (src, re, cosa) => {
  const m = src.match(re);
  if (!m) { console.error(`Non trovo ${cosa} nei sorgenti del sito: il formato è cambiato, aggiorna lo script.`); process.exit(1); }
  return m[1];
};
const coefLiteral = grab(pricing, /const NOL_COEF[^=]*=\s*(\{[\s\S]*?\n\});/, 'NOL_COEF');
const coefficienti = Function(`"use strict"; return (${coefLiteral});`)();
for (const fasce of Object.values(coefficienti)) for (const f of fasce) if (f.max === Infinity) f.max = null; // JSON non ha Infinity
const noleggio = {
  fonte: 'veroledsrl.com · ledwall-pricing.ts (NOL_COEF, assicurazione, istruttoria) + listino-installazione.ts (posa)',
  coefficienti,
  assicurazioneAnnua: Number(grab(pricing, /NOL_ASSIC_ANNUO\s*=\s*([\d.]+)/, 'NOL_ASSIC_ANNUO')),
  istruttoriaEur: Number(grab(pricing, /NOL_ISTRUTTORIA\s*=\s*([\d.]+)/, 'NOL_ISTRUTTORIA')),
  posaEurMq: Number(grab(posaSrc, /POSA_MQ\s*=\s*([\d.]+)/, 'POSA_MQ')),
  posaMqMinimi: Number(grab(posaSrc, /MQ_MINIMI\s*=\s*([\d.]+)/, 'MQ_MINIMI')),
};

writeFileSync(out, JSON.stringify({ fonte: 'veroledsrl.com · src/data/listino-ledwall.json (righe outdoor)', rows, noleggio }, null, 2) + '\n');
console.log(`noleggio: durate ${Object.keys(coefficienti).join('/')} mesi · assicurazione ${noleggio.assicurazioneAnnua} · posa ${noleggio.posaEurMq} €/m² (min ${noleggio.posaMqMinimi} m²)`);
console.log(`${rows.length} combinazioni tier × passo → ${out}`);
for (const t of TIERS) {
  const r = rows.filter((x) => x.tier === t);
  console.log(`  ${t.padEnd(10)} ${String(r.length).padStart(2)} passi · da ${Math.min(...r.map((x) => x.maxNits))} a ${Math.max(...r.map((x) => x.maxNits))} nit`);
}
