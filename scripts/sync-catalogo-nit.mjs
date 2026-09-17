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
  .map((r) => ({ tier: r.s, pitchMm: r.p, maxNits: r.n, chip: String(r.c || '').trim() }))
  .sort((a, b) => TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier) || a.pitchMm - b.pitchMm);

const doppioni = rows.filter((r, i) => rows.findIndex((x) => x.tier === r.tier && x.pitchMm === r.pitchMm) !== i);
if (doppioni.length) {
  console.error('Combinazioni tier × passo duplicate nel listino, non so quale nit usare:', doppioni);
  process.exit(1);
}

writeFileSync(out, JSON.stringify({ fonte: 'veroledsrl.com · src/data/listino-ledwall.json (righe outdoor)', rows }, null, 2) + '\n');
console.log(`${rows.length} combinazioni tier × passo → ${out}`);
for (const t of TIERS) {
  const r = rows.filter((x) => x.tier === t);
  console.log(`  ${t.padEnd(10)} ${String(r.length).padStart(2)} passi · da ${Math.min(...r.map((x) => x.maxNits))} a ${Math.max(...r.map((x) => x.maxNits))} nit`);
}
