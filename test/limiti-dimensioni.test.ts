import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { useSimulatorStore, BASE_MAX_M, ALTEZZA_MAX_M } from '../src/store/useSimulatorStore';
import { CABINET_FORMATS } from '../src/config/config';

/** Base e altezza in metri, come le ricava il calcolo dai cabinet */
function metri() {
  const s = useSimulatorStore.getState();
  const f = CABINET_FORMATS.find((x) => x.id === s.formatId) || CABINET_FORMATS[0];
  return { widthM: (s.modulesW * f.widthMm) / 1000, heightM: (s.modulesH * f.heightMm) / 1000 };
}

/*
 * I limiti di base e altezza (decisi dal titolare il 01/11/2026: nastri fino a 150 m, pali fino a 50 m)
 * sono UNO: prima il campo dell'Express diceva 40×20, quello del wizard 50×30, e il calcolo non ne
 * applicava nessuno — un 100×1 m risultava «non valido» nel campo e veniva calcolato lo stesso.
 */
describe('limiti di base e altezza', () => {
  it('valgono 150 m e 50 m', () => {
    expect(BASE_MAX_M).toBe(150);
    expect(ALTEZZA_MAX_M).toBe(50);
  });

  it('il calcolo accetta i formati ultra lunghi chiesti dai clienti: 2×40 e 100×1', () => {
    const s = useSimulatorStore.getState();
    s.setDimensioniMetri(2, 40);
    expect(metri().widthM).toBeCloseTo(2, 0);
    expect(metri().heightM).toBeCloseTo(40, 0);
    s.setDimensioniMetri(100, 1);
    expect(metri().widthM).toBeCloseTo(100, 0);
  });

  it('oltre il limite il calcolo si ferma al limite, non va oltre', () => {
    const s = useSimulatorStore.getState();
    s.setDimensioniMetri(400, 90);
    const d = metri();
    expect(d.widthM).toBeLessThanOrEqual(BASE_MAX_M);
    expect(d.heightM).toBeLessThanOrEqual(ALTEZZA_MAX_M);
    expect(d.widthM).toBeGreaterThan(BASE_MAX_M - 1);
  });

  it('i campi delle due schermate usano le stesse costanti, non numeri scritti a mano', () => {
    for (const f of ['src/components/express/ExpressSimulator.tsx', 'src/components/wizard/S2Dimensions.tsx']) {
      const src = readFileSync(path.join(__dirname, '..', f), 'utf8');
      expect(src, f).toContain('max={BASE_MAX_M}');
      expect(src, f).toContain('max={ALTEZZA_MAX_M}');
    }
  });
});
