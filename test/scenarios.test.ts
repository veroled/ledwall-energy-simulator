import { describe, it, expect } from 'vitest';
import { confrontaScenari } from '../src/core/physics';
import { CONFIG } from '../src/config/config';

describe('Confronto Scenari Energetici — Scenario A vs Scenario B (Fleet Monitor VeroLED)', () => {
  it('con i parametri di default di massima qualità, Scenario B risparmia oltre il 50% rispetto ad A', () => {
    const areaM2 = 15; // 5x3m display tipico DOOH
    const apl = 0.30; // 30% APL standard
    const oreGiorno = 18;
    const tariffa = 0.35; // €/kWh

    const result = confrontaScenari(areaM2, apl, oreGiorno, tariffa);

    // Scenario B deve consumare meno di Scenario A
    expect(result.annualCostEurB).toBeLessThan(result.annualCostEurA);
    expect(result.annualKwhB).toBeLessThan(result.annualKwhA);

    // Il risparmio deve superare la soglia CLAIM_SAVINGS_PERCENT (>= 50%)
    expect(result.savingsPercent).toBeGreaterThanOrEqual(CONFIG.CLAIM_SAVINGS_PERCENT);
    expect(result.claimVerified).toBe(true);
  });

  it('il breakdown del risparmio è coerente e additivo rispetto al risparmio totale', () => {
    const areaM2 = 20;
    const apl = 0.35;
    const oreGiorno = 16;
    const tariffa = 0.38;

    const result = confrontaScenari(areaM2, apl, oreGiorno, tariffa);

    const { standbyZeroEur, nightDimmingEur, adaptiveLuxEur } = result.breakdown;
    const sommaBreakdown = standbyZeroEur + nightDimmingEur + adaptiveLuxEur;

    // La somma delle quote del breakdown deve corrispondere al risparmio totale in euro (entro 1 euro di arrotondamento)
    expect(Math.abs(sommaBreakdown - result.savingsEur)).toBeLessThanOrEqual(1.0);

    // Ogni quota deve essere positiva o nulla
    expect(standbyZeroEur).toBeGreaterThan(0);
    expect(nightDimmingEur).toBeGreaterThan(0);
    expect(adaptiveLuxEur).toBeGreaterThan(0);
  });

  it('la disattivazione di un toggle riduce il relativo risparmio nello Scenario B', () => {
    const areaM2 = 12;
    const apl = 0.30;
    const oreGiorno = 18;
    const tariffa = 0.35;

    const fullResult = confrontaScenari(areaM2, apl, oreGiorno, tariffa, {
      dimmingAdattivo: true,
      dimmingNotturno: true,
      standbyZero: true,
      sensoreLux: true,
    });

    const noStandbyZeroResult = confrontaScenari(areaM2, apl, oreGiorno, tariffa, {
      dimmingAdattivo: true,
      dimmingNotturno: true,
      standbyZero: false, // Standby zero disattivato
      sensoreLux: true,
    });

    expect(noStandbyZeroResult.savingsEur).toBeLessThan(fullResult.savingsEur);
    expect(noStandbyZeroResult.breakdown.standbyZeroEur).toBe(0);
  });
});
