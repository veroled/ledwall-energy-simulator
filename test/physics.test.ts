import { describe, it, expect } from 'vitest';
import { standbyWmqPerPasso, calcolaPotenzaWmq, calcolaProfiloEnergetico, stimaPotenzaDaPassoNit, calcolaPowerQuality, calcolaConsulenzaOttica, suggerisciAlternativa } from '../src/core/physics';

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

  describe('Spento da software e Aegis Hink Premium P16', () => {
    it('assorbimento a schermo nero: 50 W/m² al P2.9, 25 W/m² al P10, 3 W/m² al P16', () => {
      expect(standbyWmqPerPasso(2.6)).toBe(50);
      expect(standbyWmqPerPasso(2.9)).toBe(50);
      expect(standbyWmqPerPasso(10)).toBe(25);
      expect(standbyWmqPerPasso(16)).toBe(3);
      const medi = [3.9, 4.8, 6.7, 8].map(standbyWmqPerPasso);
      expect(medi).toEqual([...medi].sort((x, y) => y - x));
      expect(medi[0]).toBeLessThan(50);
      expect(medi[3]).toBeGreaterThan(25);
    });

    it('spento da software consuma solo l\'elettronica, giorno e notte', () => {
      const p = calcolaProfiloEnergetico(50, 0, 0, 0, 18, true, true, 0.35, 361, 50);
      expect(p.dayPowerWmq).toBe(50);
      expect(p.nightPowerWmq).toBe(50);
      expect(p.totalDailyKwh).toBeCloseTo((50 * 50 * 24) / 1000, 5);
    });

    it('P16: arriva a 20.000 nit, lavora a riposo a 5.000 e resta coerente con i 100 W/m² medi di scheda', () => {
      const a5000 = stimaPotenzaDaPassoNit(16, 5000);
      expect(a5000.maxPhysicalNits).toBe(20000);
      expect(a5000.isAtPhysicalLimit).toBe(false);
      expect(a5000.sforzoPercent).toBeLessThan(30);
      expect(a5000.pMaxWmq).toBeLessThan(stimaPotenzaDaPassoNit(10, 5000).pMaxWmq);
      // Scheda prodotto: 100 W/m² medi. Il modello li dà a ~10.000 nit con APL 30%
      const a10000 = stimaPotenzaDaPassoNit(16, 10000);
      expect(a10000.pMedioWmq).toBeGreaterThan(80);
      expect(a10000.pMedioWmq).toBeLessThan(120);
    });

    it('da 60 m di linea di vista il passo giusto è il P16', () => {
      const alt = suggerisciAlternativa(10, 8000, 96, 0.30, 18, 0.35, 20, 57);
      expect(alt.recommendedPitchMm).toBe(16);
      expect(alt.kind).toBe('pitch');
      expect(alt.proposed.pitchMm).toBe(16);
    });
  });

  describe('Modalità Express · Proposta Alternativa', () => {
    it('P2.6 a 6000 nit su 6x3m visto da 10m: propone P3.9, consuma meno e non è al limite fisico', () => {
      const alt = suggerisciAlternativa(2.6, 6000, 18, 0.30, 18, 0.35, 5, 10);
      expect(alt.hasAlternative).toBe(true);
      expect(alt.kind).toBe('pitch');
      expect(alt.recommendedPitchMm).toBe(3.91);
      expect(alt.proposed.pitchMm).toBe(3.9);
      expect(alt.proposed.annualCostEur).toBeLessThan(alt.current.annualCostEur);
      expect(alt.savingsPercent).toBeGreaterThan(5);
      expect(alt.current.hardware.isAtPhysicalLimit).toBe(true);
      expect(alt.proposed.hardware.isAtPhysicalLimit).toBe(false);
      expect(alt.proposed.hardware.sforzoPercent).toBeLessThan(alt.current.hardware.sforzoPercent);
      expect(alt.fleetMonitorExtraEur).toBeGreaterThan(0);
      expect(alt.reasons.length).toBeGreaterThanOrEqual(3);
      expect(alt.headline).toContain('P3.9');
    });

    it('P3.9 già ottimale per 10m: nessun cambio passo, propone solo Fleet Monitor', () => {
      const alt = suggerisciAlternativa(3.9, 5000, 18, 0.30, 18, 0.35, 5, 10);
      expect(alt.kind).toBe('fleet');
      expect(alt.proposed.pitchMm).toBe(3.9);
      expect(alt.savingsEur).toBe(0);
      expect(alt.fleetMonitorExtraPercent).toBeGreaterThanOrEqual(50);
    });

    it('P10 visto da 5m: passo troppo largo, propone il P2.6 dichiarando l\'energia in più', () => {
      const alt = suggerisciAlternativa(10, 5000, 18, 0.30, 18, 0.35, 3, 4);
      expect(alt.kind).toBe('coarse');
      expect(alt.proposed.pitchMm).toBe(2.6);
      expect(alt.savingsEur).toBe(0);
      expect(alt.extraCostEur).toBe(alt.proposed.annualCostEur - alt.current.annualCostEur);
      expect(alt.extraCostEur).toBeGreaterThan(0);
    });

    it('P10 visto da 11m: non è "il passo giusto", serve il P3.9', () => {
      const alt = suggerisciAlternativa(10, 5000, 4, 0.30, 18, 0.35, 5, 10);
      expect(alt.kind).toBe('coarse');
      expect(alt.proposed.pitchMm).toBe(3.9);
      expect(alt.headline).toContain('troppo largo');
    });

    it('P10 da autostrada (40m): sotto 1 arcminuto i diodi si fondono, il passo resta giusto', () => {
      const alt = suggerisciAlternativa(10, 5000, 32, 0.30, 18, 0.35, 8, 40);
      expect(alt.kind).toBe('fleet');
      expect(alt.proposed.pitchMm).toBe(10);
    });

    it('Distanza lunga (40m): da 40,8 m l\'occhio fonde anche il P10, dal P3.9 propone il P10', () => {
      const alt = suggerisciAlternativa(3.9, 6000, 32, 0.30, 18, 0.35, 8, 40);
      expect(alt.kind).toBe('pitch');
      expect(alt.proposed.pitchMm).toBe(10);
      expect(alt.savingsPercent).toBeGreaterThan(30);
    });

    it('Distanza media (25m): dal P3.9 propone il P6.7', () => {
      const alt = suggerisciAlternativa(3.9, 6000, 32, 0.30, 18, 0.35, 5, 24.5);
      expect(alt.lineOfSightDistM).toBeCloseTo(25, 0);
      expect(alt.proposed.pitchMm).toBe(6.7);
    });

    it('5x10 m con la base a 10 m, visto da 20 m a terra: la linea di vista si misura al centro (25 m), non alla base (22,4 m)', () => {
      const alt = suggerisciAlternativa(10, 5000, 50, 0.30, 18, 0.35, 10, 20, 10);
      expect(alt.centerHeightM).toBe(15);
      expect(alt.lineOfSightDistM).toBeCloseTo(25.0, 1);
      expect(alt.lineOfSightBaseM).toBeCloseTo(22.4, 1);
      expect(alt.lineOfSightTopM).toBeCloseTo(28.3, 1);
      expect(alt.kind).toBe('coarse');
      expect(alt.proposed.pitchMm).toBe(6.7);
    });

    it('5x10 m con la base a 20 m di quota: il P10 è largo visto da 10 m a terra, giusto da 30 m', () => {
      const vicino = suggerisciAlternativa(10, 5000, 50, 0.30, 18, 0.35, 20, 10, 10);
      expect(vicino.lineOfSightDistM).toBeCloseTo(26.9, 1);
      expect(vicino.kind).toBe('coarse');
      expect(vicino.proposed.pitchMm).toBe(6.7);

      const lontano = suggerisciAlternativa(10, 5000, 50, 0.30, 18, 0.35, 20, 30, 10);
      expect(lontano.lineOfSightDistM).toBeCloseTo(39.1, 1);
      expect(lontano.kind).toBe('fleet');
      expect(lontano.proposed.pitchMm).toBe(10);
    });
  });
});
