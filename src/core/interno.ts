/**
 * Ramo «interno» del simulatore (12/11/2026, il titolare: «ramo interno completo»).
 *
 * Il motore da esterno (physics.ts) parte dai nit di listino outdoor, dalla curva del sole e da uno
 * standby ricavato dal passo (P2.9–P10): per un ledwall da interno a passo 0,78–0,94 mm nessuno di
 * questi dati vale. Qui si usano le MISURE del titolare su un cabinet Titan Max MiP P0.94
 * (600 × 337,5 mm = 0,2025 m², misuratore alla presa):
 *   - schermo acceso ma nero (standby da software): 30 W a cabinet  → ≈ 148 W/m²
 *   - bianco pieno a 600 nit (calibrazione D65):   95,88 W a cabinet → ≈ 473 W/m²
 * Fra le due misure la potenza cresce in proporzione al contenuto (APL) e alla luminanza:
 *   P(APL, nit) = P_nero + APL × (P_bianco600 − P_nero) × nit / 600
 * ⚠️ Oltre i 600 nit (fino ai 1.000 a D93) la proporzione è una STIMA: non c'è una misura.
 * ⚠️ La misura è sul P0.94; per il P0.78 si usa la stessa, e l'app lo dichiara.
 *
 * Le strutture di ritorno sono le stesse del motore da esterno (DailyEnergyProfile, ScenarioResult),
 * così cruscotto, confronto e report le leggono senza un secondo percorso.
 */
import { CONFIG } from '../config/config';
import type { DailyEnergyProfile, ScenarioResult } from './physics';

export type IdProdottoInterno = 'mip078' | 'mip094';

export interface ProdottoInterno {
  id: IdProdottoInterno;
  nome: string;
  pitchMm: number;
  etichettaPasso: string;
  cabinet: { widthMm: number; heightMm: number; weightKg: number };
  /** W alla presa per cabinet, schermo acceso e nero (standby da software). */
  wNeroCabinet: number;
  /** W alla presa per cabinet, bianco pieno alla luminanza di misura. */
  wBiancoCabinet: number;
  nitMisura: number;
  /** Luminanza calibrata sul bianco D65 e massima a D93 (9.300 K). */
  nitD65: number;
  nitMax: number;
  /** Il passo su cui è stata fatta la misura. */
  passoMisura: string;
  scheda: string;
}

const CAB = { widthMm: 600, heightMm: 337.5, weightKg: 4.38 };
const MISURA = { wNeroCabinet: 30, wBiancoCabinet: 95.88, nitMisura: 600, passoMisura: 'P0.94' };

export const PRODOTTI_INTERNI: ProdottoInterno[] = [
  { id: 'mip094', nome: 'Titan Max MiP', pitchMm: 0.9375, etichettaPasso: 'P0.94', cabinet: CAB, ...MISURA, nitD65: 600, nitMax: 1000, scheda: 'https://veroled.it/prodotti/titan-max-mip/' },
  { id: 'mip078', nome: 'Titan Max MiP', pitchMm: 0.78125, etichettaPasso: 'P0.78', cabinet: CAB, ...MISURA, nitD65: 600, nitMax: 1000, scheda: 'https://veroled.it/prodotti/titan-max-mip/' },
];

export const NIT_INTERNO = { min: 100, max: 1000, iniziale: 300 } as const;
export const ORE_INTERNO_INIZIALI = 12;

export const prodottoInterno = (id: IdProdottoInterno | undefined | null): ProdottoInterno =>
  PRODOTTI_INTERNI.find((p) => p.id === id) ?? PRODOTTI_INTERNI[0];

export const areaCabinetM2 = (p: ProdottoInterno) => (p.cabinet.widthMm * p.cabinet.heightMm) / 1e6;

/** W/m² con lo schermo acceso e nero. */
export const wmqNero = (p: ProdottoInterno) => p.wNeroCabinet / areaCabinetM2(p);

/** W/m² col bianco pieno alla luminanza indicata (lineare oltre la misura: stima). */
export function wmqBianco(p: ProdottoInterno, nit: number): number {
  const nero = wmqNero(p);
  const dinamica = (p.wBiancoCabinet - p.wNeroCabinet) / areaCabinetM2(p);
  return nero + dinamica * (nitValidi(nit) / p.nitMisura);
}

export function nitValidi(nit: number): number {
  return Math.min(NIT_INTERNO.max, Math.max(NIT_INTERNO.min, Number.isFinite(nit) ? nit : NIT_INTERNO.iniziale));
}

/** W/m² con un contenuto di APL dato (0..1) alla luminanza indicata. */
export function potenzaInternoWmq(p: ProdottoInterno, apl: number, nit: number): number {
  const a = Math.max(0, Math.min(1, apl));
  const nero = wmqNero(p);
  return nero + a * (wmqBianco(p, nit) - nero);
}

/** La luminanza oltre la quale il calcolo non poggia più su una misura. */
export const nitStimati = (p: ProdottoInterno, nit: number) => nitValidi(nit) > p.nitMisura;

/**
 * Profilo giornaliero: acceso `oreAccese` ore alla luminanza scelta; nelle altre ore lo schermo
 * resta acceso e nero (`schermoNeroFuoriOrario`) oppure è spento col relè (0 W).
 */
export function profiloInterno(
  p: ProdottoInterno,
  areaM2: number,
  apl: number,
  nit: number,
  oreAccese: number,
  schermoNeroFuoriOrario: boolean,
  tariffaEurKwh: number
): DailyEnergyProfile {
  const dayHours = Math.max(1, Math.min(24, oreAccese));
  const nightHours = 24 - dayHours;
  const dayPowerWmq = potenzaInternoWmq(p, apl, nit);
  const nightPowerWmq = schermoNeroFuoriOrario ? wmqNero(p) : 0;
  const dayKw = (dayPowerWmq * areaM2) / 1000;
  const dayKwh = dayKw * dayHours;
  const nightKwh = ((nightPowerWmq * areaM2) / 1000) * nightHours;
  const totalDailyKwh = dayKwh + nightKwh;
  const annualKwh = totalDailyKwh * 365;
  const dailyCostEur = totalDailyKwh * tariffaEurKwh;
  return {
    dayHours, nightHours, dayPowerWmq, nightPowerWmq, dayKwh, nightKwh, totalDailyKwh, annualKwh,
    annualCostEur: annualKwh * tariffaEurKwh,
    hourlyCostEur: dayKw * tariffaEurKwh,
    dailyCostEur,
    monthlyCostEur: dailyCostEur * 30,
  };
}

export interface OpzioniFleetInterno {
  /** Luminanza d'esercizio tarata (la scelta dell'utente) invece dei 600 nit di fabbrica. */
  dimmingAdattivo: boolean;
  /** Fuori orario lo schermo si spegne col relè invece di restare nero e acceso. */
  standbyZero: boolean;
}

/**
 * Scenario A (non gestito): acceso alle ore indicate a 600 nit (la calibrazione D65 di fabbrica, o
 * la luminanza scelta se è più alta), e fuori orario schermo nero ma acceso.
 * Scenario B (Fleet Monitor): luminanza d'esercizio tarata e relè fuori orario.
 * ⛔ In interno niente sensore lux né riduzione notturna: non ci sono sole né notte da seguire,
 * e nessuna promessa di percentuale minima di risparmio (`claimVerified` resta false).
 */
export function confrontaScenariInterno(
  p: ProdottoInterno,
  areaM2: number,
  apl: number,
  nit: number,
  oreAccese: number,
  tariffaEurKwh: number,
  opzioni: OpzioniFleetInterno
): ScenarioResult {
  const ore = Math.max(1, Math.min(24, oreAccese));
  const fuori = 24 - ore;
  const nitA = Math.max(p.nitD65, nitValidi(nit));
  const nitB = opzioni.dimmingAdattivo ? nitValidi(nit) : nitA;
  const kwh = (wmq: number, h: number) => ((wmq * areaM2) / 1000) * h * 365;

  const accesoA = kwh(potenzaInternoWmq(p, apl, nitA), ore);
  const fuoriA = kwh(wmqNero(p), fuori);
  const accesoB = kwh(potenzaInternoWmq(p, apl, nitB), ore);
  const fuoriB = opzioni.standbyZero ? 0 : fuoriA;

  const annualKwhA = accesoA + fuoriA;
  const annualKwhB = accesoB + fuoriB;
  const annualCostEurA = annualKwhA * tariffaEurKwh;
  const annualCostEurB = annualKwhB * tariffaEurKwh;
  const savingsEur = Math.max(0, annualCostEurA - annualCostEurB);
  const savingsKwh = Math.max(0, annualKwhA - annualKwhB);

  return {
    annualKwhA, annualCostEurA, annualKwhB, annualCostEurB, savingsEur, savingsKwh,
    savingsPercent: annualCostEurA > 0 ? (savingsEur / annualCostEurA) * 100 : 0,
    co2SavedTons: savingsKwh * (CONFIG.CO2_FACTOR_KG_KWH / 1000),
    claimVerified: false,
    breakdown: {
      // il relè fuori orario
      standbyZeroEur: (fuoriA - fuoriB) * tariffaEurKwh,
      // in interno non c'è riduzione notturna
      nightDimmingEur: 0,
      // la luminanza d'esercizio tarata
      adaptiveLuxEur: (accesoA - accesoB) * tariffaEurKwh,
    },
  };
}
