import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import {
  disegnaDemo,
  fotogrammiDemo,
  formaNastro,
  misureFotogramma,
  DURATA_DEMO_SEC,
  FOTOGRAMMI_MISURA,
  TESTI_DEMO,
  VERSIONI_DEMO,
  type ContestoDemo,
  type VersioneDemo,
} from '../src/core/demo-veroled';

/*
 * In Node non c'è un canvas: qui si controlla COME si disegna (con un contesto che registra le
 * chiamate). QUANTA luce esce lo misura scripts/verifica-demo.mjs in Chromium.
 */

type Chiamata = [string, ...unknown[]];

function registratore() {
  const chiamate: Chiamata[] = [];
  const stato = { fillStyle: '', globalAlpha: 1, font: '', textAlign: 'start', textBaseline: 'alphabetic' };
  const ctx = {
    get fillStyle() { return stato.fillStyle; },
    set fillStyle(v: string) { stato.fillStyle = v; },
    get globalAlpha() { return stato.globalAlpha; },
    set globalAlpha(v: number) { stato.globalAlpha = v; },
    get font() { return stato.font; },
    set font(v: string) { stato.font = v; },
    get textAlign() { return stato.textAlign; },
    set textAlign(v: string) { stato.textAlign = v; },
    get textBaseline() { return stato.textBaseline; },
    set textBaseline(v: string) { stato.textBaseline = v; },
    fillRect: (...a: number[]) => chiamate.push(['fillRect', stato.fillStyle, round(stato.globalAlpha), ...a.map(round)]),
    fillText: (testo: string, ...a: number[]) => chiamate.push(['fillText', stato.fillStyle, round(stato.globalAlpha), stato.font, testo, ...a.map(round)]),
    drawImage: (_img: unknown, ...a: number[]) => chiamate.push(['drawImage', ...a.map(round)]),
  };
  return { ctx: ctx as unknown as ContestoDemo, chiamate };
}

const round = (v: number) => Math.round(v * 1e6) / 1e6;

function disegno(versione: VersioneDemo, t: number, W = 480, H = 320, scritta: CanvasImageSource | null = {} as CanvasImageSource) {
  const r = registratore();
  disegnaDemo(r.ctx, t, W, H, versione, scritta);
  return r.chiamate;
}

describe('demo VeroLED disegnata dal vivo', () => {
  it('lo stesso istante dà sempre lo stesso disegno', () => {
    expect(disegno('chiaro', 7.3)).toEqual(disegno('chiaro', 7.3));
  });

  it('il giro di 24 s si richiude: t e t + 24 s sono lo stesso fotogramma', () => {
    expect(DURATA_DEMO_SEC).toBe(24);
    expect(disegno('ottimizzato', 3.1 + DURATA_DEMO_SEC)).toEqual(disegno('ottimizzato', 3.1));
  });

  it('il pannello di pixel è identico nelle due versioni: cambia solo il fondo sopra', () => {
    const pannello = (c: Chiamata[]) => c.filter((k) => k[0] === 'fillRect').slice(1);
    const a = pannello(disegno('chiaro', 5));
    expect(a.length).toBeGreaterThan(50);
    expect(pannello(disegno('ottimizzato', 5))).toEqual(a);
    expect(disegno('chiaro', 5)[0]).toEqual(['fillRect', VERSIONI_DEMO.chiaro.fondo, 1, 0, 0, 480, 320]);
    expect(disegno('ottimizzato', 5)[0]).toEqual(['fillRect', VERSIONI_DEMO.ottimizzato.fondo, 1, 0, 0, 480, 320]);
  });

  it('il disegno è proporzionale: a doppia misura, ogni coordinata raddoppia', () => {
    const piccolo = disegno('chiaro', 9, 100, 60);
    const grande = disegno('chiaro', 9, 200, 120);
    expect(grande.length).toBe(piccolo.length);
    grande.forEach((k, i) => {
      if (k[0] !== 'fillRect') return;
      const p = piccolo[i];
      expect(k.slice(3).map((v) => round((v as number) / 2))).toEqual(p.slice(3));
    });
  });

  it('una parola ogni 6 s, nell\'ordine approvato, più la firma', () => {
    const parole = [1, 7, 13, 19].map((t) => disegno('chiaro', t).filter((k) => k[0] === 'fillText').map((k) => k[4]));
    expect(parole).toEqual(TESTI_DEMO.parole.map((p) => [p, TESTI_DEMO.firma]));
    expect(TESTI_DEMO.parole).toEqual(['LEDWALL', 'VETRINE', 'EVENTI', 'CITTÀ']);
  });

  it('la scritta ufficiale si disegna se c\'è, e il fotogramma esce anche senza', () => {
    expect(disegno('chiaro', 2).some((k) => k[0] === 'drawImage')).toBe(true);
    const senza = disegno('chiaro', 2, 480, 320, null);
    expect(senza.some((k) => k[0] === 'drawImage')).toBe(false);
    expect(senza.some((k) => k[0] === 'fillText')).toBe(true);
  });

  it('la scritta usata è il file ufficiale, che esiste in public/brand', () => {
    for (const v of Object.values(VERSIONI_DEMO)) {
      expect(readFileSync(path.join(__dirname, '../public', v.scritta), 'utf8')).toContain('aria-label="VEROLED"');
    }
  });

  it('la misura usa 30 fotogrammi nel rapporto dello schermo, anche fuori dai nove formati', () => {
    const fatti: { width: number; height: number }[] = [];
    const crea = () => {
      const c = { width: 0, height: 0, getContext: () => registratore().ctx };
      fatti.push(c);
      return c as unknown as HTMLCanvasElement;
    };
    for (const [rw, rh] of [[5, 3], [1, 4], [10, 1]]) {
      fatti.length = 0;
      const out = fotogrammiDemo('chiaro', rw, rh, null, crea);
      expect(out).toHaveLength(FOTOGRAMMI_MISURA);
      expect(fatti[0].width / fatti[0].height).toBeCloseTo(rw / rh, 1);
    }
  });
});

describe('nastri ultra lunghi (2×40, 100×1)', () => {
  it('oltre il 5:1 lo schermo è un nastro, orizzontale o verticale', () => {
    expect(formaNastro(4, 1)).toBeNull();
    expect(formaNastro(5, 1)).toBe('orizzontale');
    expect(formaNastro(100, 1)).toBe('orizzontale');
    expect(formaNastro(2, 40)).toBe('verticale');
    expect(formaNastro(3, 2)).toBeNull();
  });

  it('il nastro si richiude in 24 s a qualunque lunghezza', () => {
    for (const [W, H] of [[4800, 48], [96, 1920]]) {
      expect(disegno('chiaro', 5.5 + DURATA_DEMO_SEC, W, H)).toEqual(disegno('chiaro', 5.5, W, H));
    }
  });

  it('il nastro scorre: due istanti diversi danno disegni diversi', () => {
    expect(disegno('ottimizzato', 1, 4800, 48)).not.toEqual(disegno('ottimizzato', 2, 4800, 48));
  });

  it('sul verticale ci sono tutte le parole, scritte in orizzontale (nessuna rotazione nel contesto)', () => {
    const testi = new Set<unknown>();
    for (let t = 0; t < DURATA_DEMO_SEC; t += 1) disegno('chiaro', t, 96, 1920).filter((k) => k[0] === 'fillText').forEach((k) => testi.add(k[4]));
    for (const p of TESTI_DEMO.parole) expect(testi.has(p)).toBe(true);
    expect(testi.has(TESTI_DEMO.firma)).toBe(true);
  });

  it('la lente disegna solo il suo tratto, e lì è identica allo schermo intero', () => {
    const intero = disegno('chiaro', 3, 4800, 48);
    const r = registratore();
    disegnaDemo(r.ctx, 3, 4800, 48, 'chiaro', {} as CanvasImageSource, { x: 0, y: 0, w: 288, h: 48 });
    const lente = r.chiamate;
    expect(lente.length).toBeLessThan(intero.length / 5);
    // Ogni testo che la lente scrive, lo schermo intero lo scrive nello stesso punto
    for (const k of lente.filter((c) => c[0] === 'fillText')) expect(intero).toContainEqual(k);
  });

  it('la misura ha la forma esatta dello schermo e un lato corto di almeno 48 px', () => {
    expect(misureFotogramma(100, 1)).toEqual({ W: 4800, H: 48 });
    expect(misureFotogramma(2, 40)).toEqual({ W: 48, H: 960 });
    expect(misureFotogramma(3, 2)).toEqual({ W: 480, H: 320 });
  });
});

describe('i video dimostrativi non ci sono più', () => {
  it('nessun file video demo né riferimento a video-apl.json nel sorgente', () => {
    const sorgente = ['src/components/express/ExpressSimulator.tsx', 'src/components/express/ContentSlot.tsx']
      .map((f) => readFileSync(path.join(__dirname, '..', f), 'utf8'))
      .join('\n');
    expect(sorgente).not.toMatch(/apl-formati|video-apl\.json/);
  });
});
