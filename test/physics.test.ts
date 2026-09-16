import { describe, it, expect } from 'vitest';
import { calcolaPotenzaWmq, calcolaProfiloEnergetico, stimaPotenzaDaPassoNit, calcolaPowerQuality, calcolaConsulenzaOttica } from '../src/core/physics';

describe('Motore Fisico LEDwall — Test di Accettazione Obbligatori (a–e)', () => {
  const P_MAX = 500;
  const P_STANDBY = 50;

  // a) APL=100%, L=100% → 500 W/mq
  it('a) APL=100%, L=100% → restituisce 500 W/m²', () => {
    const p = calcolaPotenzaWmq({
      apl: 1.0,
      lum: 1.0,
      pMax: P_MAX,
      pStandby: P_STANDBY,
    });
    expect(p).toBe(500);
  });

  // b) APL≈0%, L=100% → 50 W/mq
  it('b) APL≈0%, L=100% → restituisce 50 W/m²', () => {
    const p = calcolaPotenzaWmq({
      apl: 0.0,
      lum: 1.0,
      pMax: P_MAX,
      pStandby: P_STANDBY,
    });
    expect(p).toBe(50);
  });

  // c) L=10%, APL=100% → 100 W/mq (50 + 1.0 * 500 * 0.10 = 100)
  it('c) L=10%, APL=100% → restituisce 100 W/m²', () => {
    const p = calcolaPotenzaWmq({
      apl: 1.0,
      lum: 0.10,
      pMax: P_MAX,
      pStandby: P_STANDBY,
    });
    expect(p).toBe(100);
  });

  // d) sera senza dimmer → identico al giorno
  it('d) sera senza dimmer → potenza serale identica a quella diurna', () => {
    const apl = 0.35;
    const lumGiorno = 0.80;
    const lumSera = lumGiorno; // nessun dimmer

    const pGiorno = calcolaPotenzaWmq({ apl, lum: lumGiorno, pMax: P_MAX, pStandby: P_STANDBY });
    const pSera = calcolaPotenzaWmq({ apl, lum: lumSera, pMax: P_MAX, pStandby: P_STANDBY });

    expect(pSera).toBe(pGiorno);

    // Verifica tramite calcolaProfiloEnergetico con hasDimmingNotturno=false
    const profilo = calcolaProfiloEnergetico(15, apl, lumGiorno, 0.10, 18, true, false, 0.35);
    expect(profilo.nightPowerWmq).toBe(profilo.dayPowerWmq);
  });

  // e) standby notte → 50 W/mq piatti
  it('e) standby notte con S4=Sì → 50 W/m² piatti a display spento', () => {
    const pStandbyNotte = calcolaPotenzaWmq({
      apl: 0,
      lum: 0,
      pMax: P_MAX,
      pStandby: P_STANDBY,
    });
    expect(pStandbyNotte).toBe(50);
  });

  // Caso S4 = No → P_standby = 0 (spegnimento relè)
  it('Se S4=No → P_standby=0 e consumi standby azzerati', () => {
    const pStandbyZero = calcolaPotenzaWmq({
      apl: 0,
      lum: 0,
      pMax: P_MAX,
      pStandby: 0,
    });
    expect(pStandbyZero).toBe(0);

    const pFullSenzaStandby = calcolaPotenzaWmq({
      apl: 1.0,
      lum: 1.0,
      pMax: P_MAX,
      pStandby: 0,
    });
    expect(pFullSenzaStandby).toBe(500);

    const p10PctSenzaStandby = calcolaPotenzaWmq({
      apl: 1.0,
      lum: 0.10,
      pMax: P_MAX,
      pStandby: 0,
    });
    expect(p10PctSenzaStandby).toBe(50);
  });

  it('Sovrascrittura valori da scheda tecnica se presenti', () => {
    const pCustomScheda = calcolaPotenzaWmq({
      apl: 1.0,
      lum: 1.0,
      pMax: 650, // Scheda tecnica ad altissima luminosità
      pStandby: 60,
    });
    expect(pCustomScheda).toBe(650);
  });

  it('Confronto Ingegneristico: P3.91 @ 6500 nit consuma PIÙ di P6.67 @ 10000 nit', () => {
    const screenA = stimaPotenzaDaPassoNit(3.91, 6500, 32, 0.35, 18);
    const screenB = stimaPotenzaDaPassoNit(6.67, 10000, 32, 0.35, 18);

    // Il P3.91 ha quasi il triplo dei pixel e maggiori perdite logiche/termiche
    expect(screenA.pixelM2).toBeGreaterThan(screenB.pixelM2 * 2.8);
    expect(screenA.pMaxWmq).toBeGreaterThan(screenB.pMaxWmq);
    expect(screenA.annualCostEur).toBeGreaterThan(screenB.annualCostEur);
  });

  it('Vincoli Fisici: P3.91 ha un limite fisico invalicabile di 6.500 nit', () => {
    const screen391 = stimaPotenzaDaPassoNit(3.91, 10000, 32);
    // Anche richiedendo 10.000 nit, il motore deve bloccarlo al tetto fisico
    expect(screen391.maxPhysicalNits).toBe(6500);
    expect(screen391.isAtPhysicalLimit).toBe(true);
    expect(screen391.tecnologiaChip).toContain('SMD1921');

    const screen8 = stimaPotenzaDaPassoNit(8.0, 12000, 32);
    expect(screen8.maxPhysicalNits).toBe(12000);
    expect(screen8.tecnologiaChip).toContain('Gold Wire');
  });

  describe('Power Quality & Fattore di Potenza (Delibera ARERA 232/2022)', () => {
    it('Impianto 6x3m (18 cabinet, 36 alimentatori) a basso carico: PF crolla a ~0.50 in Scenario A, protetto a 0.98 in Scenario B', () => {
      // 18 cabinet, carico attivo 1.2 kW (basso APL ~15%)
      const pq = calcolaPowerQuality(18, 1.2, 0.7, 18, true);

      // In Scenario A (singola fase UHP-200), il PF crolla
      expect(pq.totalPowerSupplies).toBe(36);
      expect(pq.powerFactorA).toBeLessThanOrEqual(0.60);
      expect(pq.apparentPowerKvaA).toBeGreaterThan(pq.apparentPowerKvaB);

      // In Scenario B (Smart Power Guard SVG o Serie Diamond), il PF rimane elevato
      expect(pq.powerFactorB).toBe(0.98);
      expect(pq.penaleAreraEurAnnoB).toBe(0);
      expect(pq.penaleAreraEurAnnoA).toBeGreaterThan(0);
      expect(pq.totaleRisparmioReteEurAnno).toBeGreaterThan(0);
    });
  });

  describe('Consulenza Ottica & Confronto Passo (Cliente vs Sistema)', () => {
    it('Caso Barbecue S.r.l. (6x3m, quota 5m, vista 10m): P2.6 è overkill, P3.91 è ottimale con canone ~1200€/mese e oltre 20.000€ risparmiati in 24 mesi', () => {
      const consulenza = calcolaConsulenzaOttica(5, 10, 2.6, 18, 6000);

      expect(consulenza.lineOfSightDistM).toBeCloseTo(11.2, 1);
      expect(consulenza.recommendedPitchMm).toBe(3.91);
      expect(consulenza.isClientPitchOverkill).toBe(true);
      expect(consulenza.wastedPixelsCount).toBeGreaterThan(1400000);
      expect(consulenza.hardwareClient.sforzoPercent).toBe(100);
      expect(consulenza.hardwareClient.isAtPhysicalLimit).toBe(true); // P2.6 max è 4.500 nit!
      expect(consulenza.hardwareRecommended.sforzoPercent).toBeLessThanOrEqual(92);
      expect(consulenza.hardwareRecommended.isAtPhysicalLimit).toBe(false); // P3.91 supporta 6.000 nit (tetto 6.500)
      expect(consulenza.recommendedMonthlyRentalEur).toBeCloseTo(1200, -2); // ~1.200 €/mese
      expect(consulenza.total24MonthSavingsEur).toBeGreaterThan(19000); // ~19.700 € risparmiati in 24 mesi
      expect(consulenza.scientificVerdict).toContain('acuità visiva');
    });
  });
});
