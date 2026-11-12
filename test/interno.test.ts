/**
 * Ramo «interno» (12/11/2026): il motore usa le misure del titolare su un cabinet Titan Max MiP P0.94
 * da 600 × 337,5 mm, alla presa: 30 W con lo schermo nero, 95,88 W col bianco pieno a 600 nit.
 */
import { describe, it, expect } from 'vitest';
import {
  PRODOTTI_INTERNI, prodottoInterno, areaCabinetM2, wmqNero, wmqBianco, potenzaInternoWmq,
  profiloInterno, confrontaScenariInterno, nitValidi, nitStimati,
} from '../src/core/interno';

const mip = prodottoInterno('mip094');

describe('ramo interno — le misure', () => {
  it('il cabinet è 600 × 337,5 mm, cioè 0,2025 m²', () => {
    expect(areaCabinetM2(mip)).toBeCloseTo(0.2025, 6);
  });

  it('schermo nero 30 W a cabinet ≈ 148 W/m²; bianco pieno a 600 nit 95,88 W ≈ 473 W/m²', () => {
    expect(wmqNero(mip)).toBeCloseTo(30 / 0.2025, 6);
    expect(wmqBianco(mip, 600)).toBeCloseTo(95.88 / 0.2025, 6);
    expect(Math.round(wmqBianco(mip, 600))).toBe(473);
  });

  it('un cabinet a 600 nit col bianco pieno torna ai 95,88 W misurati, col nero ai 30 W', () => {
    expect(potenzaInternoWmq(mip, 1, 600) * 0.2025).toBeCloseTo(95.88, 6);
    expect(potenzaInternoWmq(mip, 0, 600) * 0.2025).toBeCloseTo(30, 6);
  });

  it('fra nero e bianco cresce in proporzione ad APL e luminanza', () => {
    const nero = wmqNero(mip);
    const dinamica600 = wmqBianco(mip, 600) - nero;
    expect(potenzaInternoWmq(mip, 0.5, 600)).toBeCloseTo(nero + dinamica600 / 2, 6);
    expect(potenzaInternoWmq(mip, 1, 300)).toBeCloseTo(nero + dinamica600 / 2, 6);
  });

  it('la luminanza sta fra 100 e 1.000 nit; oltre 600 è una stima e lo si sa', () => {
    expect([nitValidi(20), nitValidi(5000), nitValidi(NaN)]).toEqual([100, 1000, 300]);
    expect(nitStimati(mip, 600)).toBe(false);
    expect(nitStimati(mip, 1000)).toBe(true);
  });

  it('i due passi del MiP usano la stessa misura, fatta sul P0.94', () => {
    for (const p of PRODOTTI_INTERNI) {
      expect(p.wNeroCabinet).toBe(30);
      expect(p.wBiancoCabinet).toBe(95.88);
      expect(p.passoMisura).toBe('P0.94');
    }
  });
});

describe('ramo interno — profilo e scenari', () => {
  const area = 0.2025 * 16; // 4 × 4 cabinet

  it('fuori orario: schermo nero acceso o spento col relè', () => {
    const acceso = profiloInterno(mip, area, 0.3, 300, 12, true, 0.3);
    const rele = profiloInterno(mip, area, 0.3, 300, 12, false, 0.3);
    expect(acceso.nightPowerWmq).toBeCloseTo(wmqNero(mip), 6);
    expect(rele.nightPowerWmq).toBe(0);
    expect(acceso.annualKwh - rele.annualKwh).toBeCloseTo((wmqNero(mip) * area / 1000) * 12 * 365, 6);
  });

  it('lo scenario A tiene almeno i 600 nit di fabbrica, il B la luminanza tarata e il relè', () => {
    const s = confrontaScenariInterno(mip, area, 0.3, 250, 12, 0.3, { dimmingAdattivo: true, standbyZero: true });
    const a = profiloInterno(mip, area, 0.3, 600, 12, true, 0.3);
    const b = profiloInterno(mip, area, 0.3, 250, 12, false, 0.3);
    expect(s.annualKwhA).toBeCloseTo(a.annualKwh, 6);
    expect(s.annualKwhB).toBeCloseTo(b.annualKwh, 6);
    expect(s.breakdown.standbyZeroEur + s.breakdown.adaptiveLuxEur + s.breakdown.nightDimmingEur).toBeCloseTo(s.savingsEur, 6);
    expect(s.breakdown.nightDimmingEur).toBe(0);
  });

  it('senza le opzioni Fleet Monitor non c\'è risparmio', () => {
    const s = confrontaScenariInterno(mip, area, 0.3, 600, 12, 0.3, { dimmingAdattivo: false, standbyZero: false });
    expect(s.savingsEur).toBeCloseTo(0, 9);
  });

  it('⛔ in interno nessuna promessa di risparmio minimo', () => {
    expect(confrontaScenariInterno(mip, area, 0.3, 250, 12, 0.3, { dimmingAdattivo: true, standbyZero: true }).claimVerified).toBe(false);
  });
});

describe('ramo interno — lo stato dell\'app', () => {
  it('scegliere «interno» porta il passo del MiP, 4 × 4 cabinet e 12 ore; tornare a «esterno» ripristina', async () => {
    const { useSimulatorStore } = await import('../src/store/useSimulatorStore');
    const st = useSimulatorStore.getState();
    st.setAmbiente('interno');
    let s = useSimulatorStore.getState();
    expect([s.ambiente, s.pitchMm, s.modulesW, s.modulesH, s.operatingHoursDay, s.hasNightDimming]).toEqual(['interno', 0.9375, 4, 4, 12, false]);
    s.setProdottoInterno('mip078');
    expect(useSimulatorStore.getState().pitchMm).toBe(0.78125);
    s.setAmbiente('esterno');
    s = useSimulatorStore.getState();
    expect([s.ambiente, s.pitchMm, s.operatingHoursDay, s.hasNightDimming]).toEqual(['esterno', 3.91, 18, true]);
  });

  it('in interno «avanti» e «indietro» saltano la fase 5 (riduzione notturna)', async () => {
    const { useSimulatorStore } = await import('../src/store/useSimulatorStore');
    const st = useSimulatorStore.getState();
    st.setAmbiente('interno');
    st.setStep(4);
    useSimulatorStore.getState().nextStep();
    expect(useSimulatorStore.getState().currentStep).toBe(6);
    useSimulatorStore.getState().prevStep();
    expect(useSimulatorStore.getState().currentStep).toBe(4);
    useSimulatorStore.getState().setAmbiente('esterno');
    useSimulatorStore.getState().nextStep();
    expect(useSimulatorStore.getState().currentStep).toBe(5);
  });
});
