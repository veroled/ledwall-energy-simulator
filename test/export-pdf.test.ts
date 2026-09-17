import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { generaReportPdf, isWinAnsi, pdfSafe } from '../src/core/export-pdf';
import {
  calcolaDimensioniSchermo,
  calcolaProfiloEnergetico,
  confrontaScenari,
  calcolaConsulenzaOttica,
  suggerisciAlternativa,
  canoneNoleggio,
  datoCatalogo,
  TIERS,
  PASSI_CATALOGO,
} from '../src/core/physics';
import catalogoNit from '../src/config/catalogo-nit.json';

describe('Report PDF', () => {
  it('nessun carattere fuori dal set del font nelle stringhe del generatore (causa del testo troncato e stirato)', () => {
    const righe = readFileSync('src/core/export-pdf.ts', 'utf8').split('\n');
    const colpevoli: string[] = [];
    let inMappa = false;
    righe.forEach((riga, i) => {
      const t = riga.trim();
      if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;
      // la tabella di pdfSafe elenca apposta i simboli vietati, per sostituirli
      if (t.startsWith('const mappa')) inMappa = true;
      if (inMappa) { if (t.includes('};')) inMappa = false; return; }
      if (!isWinAnsi(riga)) colpevoli.push(`${i + 1}: ${t.slice(0, 80)}`);
    });
    expect(colpevoli).toEqual([]);
  });

  it('pdfSafe trasforma in parole i simboli che il font non ha', () => {
    expect(isWinAnsi('D = √(h² + d²)')).toBe(false);
    expect(isWinAnsi(pdfSafe('D = √(h² + d²) con passo ≤ 1,78 mm → ok'))).toBe(true);
    expect(pdfSafe('passo ≤ 1,78')).toBe('passo fino a 1,78');
    expect(isWinAnsi('px/m² · 25 € — àèìòù ×')).toBe(true);
  });

  it('ogni verdetto del motore, in ogni Selection, è stampabile', () => {
    for (const t of TIERS) {
      for (const p of [...PASSI_CATALOGO, 2.6]) {
        for (const nits of [2500, 5000, 8000, 12000, 20000]) {
          for (const dist of [4, 10, 25, 60]) {
            const a = suggerisciAlternativa(p, nits, 32, 0.3, 18, 0.35, 5, dist, 4, t.id);
            const o = calcolaConsulenzaOttica(5, dist, p, 32, nits, 4, t.id);
            for (const testo of [a.headline, ...a.reasons, o.scientificVerdict]) {
              expect(isWinAnsi(pdfSafe(testo)), testo).toBe(true);
            }
          }
        }
      }
    }
  });

  it('caso del PDF segnalato (1×1 m, P6.67 visto da 6,1 m): il verdetto non è più "allineato" e le differenze hanno il segno vero', () => {
    // base 3,5 m, pubblico a 5 m: linea di vista 6,1 m come nel PDF del cliente
    const ott = calcolaConsulenzaOttica(3.5, 5, 6.67, 1, 6000, 0, 'gold');
    expect(ott.lineOfSightDistM).toBeCloseTo(6.1, 1);
    expect(ott.minResolvablePitchMm).toBeCloseTo(1.78, 2);
    expect(ott.recommendedPitchMm).toBe(2.9);
    expect(ott.isClientPitchTooCoarse).toBe(true);
    expect(ott.isClientPitchOverkill).toBe(false);
    expect(ott.scientificVerdict).not.toContain('perfettamente bilanciato');
    expect(ott.scientificVerdict).toContain('la trama dei pixel si vede');
    // tolleranza dichiarata: il P2.9 di riferimento è 1,63 volte la soglia
    expect(ott.recommendedToThresholdRatio).toBeCloseTo(1.63, 2);
    expect(ott.scientificVerdict).toContain('Tolleranza dichiarata');

    // canoni dal listino: il passo più fitto costa di più, e la differenza NON viene azzerata
    const cA = canoneNoleggio('gold', 6.67, 1, 24)!;
    const cB = canoneNoleggio('gold', 2.9, 1, 24)!;
    expect(cB.rataMensileEur).toBeGreaterThan(cA.rataMensileEur);
    expect(ott.clientMonthlyRentalEur).toBe(cA.rataMensileEur);
    expect(ott.recommendedMonthlyRentalEur).toBe(cB.rataMensileEur);
    expect(ott.monthlyRentalSavingsEur).toBe(cA.rataMensileEur - cB.rataMensileEur);
    expect(ott.monthlyRentalSavingsEur).toBeLessThan(0);
    expect(ott.total24MonthSavingsEur).toBe(ott.monthlyRentalSavingsEur! * 24 + ott.deltaAnnualEnergyCostEur * 2);
    expect(ott.deltaAnnualEnergyCostEur).toBe(ott.hardwareClient.annualCostEur - ott.hardwareRecommended.annualCostEur);
  });

  it('canone di noleggio: stessa aritmetica del sito (listino + posa minima 12 m², coefficiente per fascia, assicurazione)', () => {
    const prezzo = datoCatalogo('gold', 3.91)!.prezzoMq!;
    const n = catalogoNit.noleggio;
    const c = canoneNoleggio('gold', 3.91, 8, 24)!;
    expect(c.prodottoEur).toBe(Math.round(prezzo * 8));
    expect(c.posaEur).toBe(n.posaMqMinimi * n.posaEurMq);
    const imponibile = c.prodottoEur + c.posaEur;
    const coef = n.coefficienti['24'].find((f) => f.max === null || imponibile <= f.max)!.coef;
    expect(c.rataNoleggioEur).toBe(Math.round((imponibile * coef) / 100));
    expect(c.assicurazioneEur).toBe(Math.round((imponibile * n.assicurazioneAnnua) / 12));
    expect(c.rataMensileEur).toBe(c.rataNoleggioEur + c.assicurazioneEur);
    // senza prezzo a listino il canone non si stima
    expect(canoneNoleggio('silver', 4.81, 8, 24)).toBeNull();
    expect(canoneNoleggio('gold', 3.91, 8, 12)).toBeNull();
  });

  it('il PDF si genera in sette tavole con il dominio aziendale giusto', () => {
    const dimensions = calcolaDimensioniSchermo(1, 1, 1000, 1000, 6.67, 30);
    const profile = calcolaProfiloEnergetico(1, 0.3, 1, 0.1, 18, true, true, 0.35, 300, 37);
    const scenario = confrontaScenari(1, 0.3, 18, 0.35, undefined, 300, 37);
    const opticalConsulting = calcolaConsulenzaOttica(3.5, 5, 6.67, 1, 6000, 1, 'gold');
    const alternative = suggerisciAlternativa(6.67, 6000, 1, 0.3, 18, 0.35, 3.5, 5, 1, 'gold');
    const doc = generaReportPdf({ dimensions, scenario, profile, aplPercent: 30, tariffaEurKwh: 0.35, opticalConsulting, alternative });
    // copertina + 4 tavole fisse + geometria + verdetto
    expect(doc.getNumberOfPages()).toBe(7);
    // il piede e' in JetBrains Mono incorporato (glifi, non testo): il dominio si verifica sul sorgente
    const sorgente = readFileSync('src/core/export-pdf.ts', 'utf8');
    expect(sorgente).toContain('VEROLED.IT  ·  INFO@VEROLED.IT');
    expect(sorgente).not.toContain('https://veroledsrl.com');
    expect(doc.output().length).toBeGreaterThan(100000);
  });
});
