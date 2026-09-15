import { describe, it, expect } from 'vitest';
import { calcolaPotenzaWmq, calcolaProfiloEnergetico, stimaPotenzaDaPassoNit } from '../src/core/physics';

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
});
