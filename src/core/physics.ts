/**
 * Motore Fisico-Matematico dei Consumi Energetici per LEDwall Outdoor
 * Conforme alle norme CEI 64-8 / DOOH Standards e benchmark VeroLED
 */
import { CONFIG } from '../config/config';

export interface PowerCalcInput {
  apl: number; // 0..1 (es. 0.30 per 30%)
  lum: number; // 0..1 (es. 1.0 per 100%)
  pMax?: number; // W/m² max (default 500)
  pStandby?: number; // W/m² standby (default 50, o 0 se relè attivo)
  efficiency?: number; // Efficienza alimentatori (default 0.90)
}

export interface ScreenDimensions {
  widthM: number;
  heightM: number;
  areaM2: number;
  pitchMm: number;
  resolutionX: number;
  resolutionY: number;
  totalCabinets: number;
  weightKg: number;
  modulesW?: number;
  modulesH?: number;
  formatName?: string;
}

export interface DailyEnergyProfile {
  dayHours: number; // Ore diurne
  nightHours: number; // Ore notturne (24 - dayHours)
  dayPowerWmq: number;
  nightPowerWmq: number;
  dayKwh: number;
  nightKwh: number;
  totalDailyKwh: number;
  annualKwh: number;
  annualCostEur: number;
  hourlyCostEur: number;
  dailyCostEur: number;
  monthlyCostEur: number;
}

export interface ScenarioResult {
  annualKwhA: number;
  annualCostEurA: number;
  annualKwhB: number;
  annualCostEurB: number;
  savingsEur: number;
  savingsKwh: number;
  savingsPercent: number;
  co2SavedTons: number;
  claimVerified: boolean;
  breakdown: {
    standbyZeroEur: number;
    nightDimmingEur: number;
    adaptiveLuxEur: number;
  };
}

/**
 * Formula base: P = P_standby + APL * P_max * L
 * Capped al massimo nominale P_max
 */
export function calcolaPotenzaWmq(input: PowerCalcInput): number {
  const pMax = input.pMax ?? CONFIG.P_MAX_DEFAULT;
  const pStandby = input.pStandby ?? CONFIG.P_STANDBY_DEFAULT;
  const apl = Math.max(0, Math.min(1, input.apl));
  const lum = Math.max(0, Math.min(1, input.lum));

  // P = P_standby + APL * P_max * L
  const p = pStandby + apl * pMax * lum;
  return Math.min(pMax, Math.round(p * 1000) / 1000);
}

/**
 * Calcola dimensioni fisiche e ottiche dello schermo
 */
export function calcolaDimensioniSchermo(
  modulesW: number,
  modulesH: number,
  cabinetWidthMm: number,
  cabinetHeightMm: number,
  pitchMm: number,
  cabinetWeightKg: number
): ScreenDimensions {
  const widthM = (modulesW * cabinetWidthMm) / 1000;
  const heightM = (modulesH * cabinetHeightMm) / 1000;
  const areaM2 = Math.round(widthM * heightM * 100) / 100;
  // Risoluzione esatta calcolata a livello di cabinet modulare fisico
  const cabPixW = Math.round(cabinetWidthMm / pitchMm);
  const cabPixH = Math.round(cabinetHeightMm / pitchMm);
  const resolutionX = modulesW * cabPixW;
  const resolutionY = modulesH * cabPixH;
  const totalCabinets = modulesW * modulesH;
  const weightKg = Math.round(totalCabinets * cabinetWeightKg);

  return {
    widthM,
    heightM,
    areaM2,
    pitchMm,
    resolutionX,
    resolutionY,
    totalCabinets,
    weightKg,
    modulesW,
    modulesH,
  };
}

/**
 * Calcola il profilo energetico giornaliero e annuale per una data configurazione
 */
export function calcolaProfiloEnergetico(
  areaM2: number,
  apl: number,
  lumDiurna: number,
  lumNotturna: number,
  oreGiorno: number,
  hasStandby: boolean,
  hasDimmingNotturno: boolean,
  tariffaEurKwh: number,
  pMax: number = CONFIG.P_MAX_DEFAULT,
  pStandbyBase: number = CONFIG.P_STANDBY_DEFAULT
): DailyEnergyProfile {
  const pStandbyEffective = hasStandby ? pStandbyBase : 0;
  const dayHours = Math.max(1, Math.min(24, oreGiorno));
  const nightHours = 24 - dayHours;

  const dayPowerWmq = calcolaPotenzaWmq({
    apl,
    lum: lumDiurna,
    pMax,
    pStandby: pStandbyEffective,
  });

  const nightPowerWmq = hasDimmingNotturno
    ? calcolaPotenzaWmq({
        apl,
        lum: lumNotturna,
        pMax,
        pStandby: pStandbyEffective,
      })
    : dayPowerWmq;

  const dayKw = (dayPowerWmq * areaM2) / 1000;
  const nightKw = (nightPowerWmq * areaM2) / 1000;

  const dayKwh = dayKw * dayHours;
  const nightKwh = nightKw * nightHours;
  const totalDailyKwh = dayKwh + nightKwh;
  const annualKwh = totalDailyKwh * 365;

  const annualCostEur = annualKwh * tariffaEurKwh;
  const hourlyCostEur = dayKw * tariffaEurKwh;
  const dailyCostEur = totalDailyKwh * tariffaEurKwh;
  const monthlyCostEur = dailyCostEur * 30;

  return {
    dayHours,
    nightHours,
    dayPowerWmq,
    nightPowerWmq,
    dayKwh,
    nightKwh,
    totalDailyKwh,
    annualKwh,
    annualCostEur,
    hourlyCostEur,
    dailyCostEur,
    monthlyCostEur,
  };
}

/**
 * Calcola e confronta Scenario A (Non Gestito) vs Scenario B (Fleet Monitor VeroLED)
 */
export function confrontaScenari(
  areaM2: number,
  apl: number,
  oreGiorno: number,
  tariffaEurKwh: number,
  fleetOptions = {
    dimmingAdattivo: true,
    dimmingNotturno: true,
    standbyZero: true,
    sensoreLux: true,
  },
  pMax: number = CONFIG.P_MAX_DEFAULT,
  pStandbyBase: number = CONFIG.P_STANDBY_DEFAULT
): ScenarioResult {
  const oreNotte = 24 - oreGiorno;

  // SCENARIO A (NON GESTITO):
  // Luminosità 100% fissa giorno e notte, standby passivo 50 W/m²
  const pDiurnaA_Wmq = calcolaPotenzaWmq({
    apl,
    lum: 1.0,
    pMax,
    pStandby: pStandbyBase,
  });
  // In A non c'è dimming notturno né gestione intelligente
  const pNotturnaA_Wmq = pDiurnaA_Wmq;

  const kwDiurnaA = (pDiurnaA_Wmq * areaM2) / 1000;
  const kwNotturnaA = (pNotturnaA_Wmq * areaM2) / 1000;
  const kwhGiornoA = (kwDiurnaA * oreGiorno) + (kwNotturnaA * oreNotte);
  const annualKwhA = kwhGiornoA * 365;
  const annualCostEurA = annualKwhA * tariffaEurKwh;

  // SCENARIO B (FLEET MONITOR VEROLED):
  // 1. Sensore Lux + Dimming Adattivo APL diurno:
  //    La luminosità media diurna è tarata attorno al 55% della potenza dinamica
  const lumMediaGiornoB = fleetOptions.sensoreLux && fleetOptions.dimmingAdattivo
    ? 0.55
    : fleetOptions.sensoreLux
    ? 0.70
    : fleetOptions.dimmingAdattivo
    ? 0.75
    : 1.0;

  // Standby zero via relè smart VeroLED
  const pStandbyB = fleetOptions.standbyZero ? 0 : pStandbyBase;

  const pDiurnaB_Wmq = calcolaPotenzaWmq({
    apl,
    lum: lumMediaGiornoB,
    pMax,
    pStandby: pStandbyB,
  });

  // 2. Dimming Notturno / Standby notturno:
  //    Se standby zero è attivo: consumo notturno azzerato (0 W/m²).
  //    Se c'è dimming notturno ma non standby zero: lum notturna 10%
  const lumNotteB = fleetOptions.dimmingNotturno ? 0.10 : 1.0;
  const pNotturnaB_Wmq = fleetOptions.standbyZero
    ? 0
    : calcolaPotenzaWmq({
        apl,
        lum: lumNotteB,
        pMax,
        pStandby: pStandbyB,
      });

  const kwDiurnaB = (pDiurnaB_Wmq * areaM2) / 1000;
  const kwNotturnaB = (pNotturnaB_Wmq * areaM2) / 1000;
  const kwhGiornoB = (kwDiurnaB * oreGiorno) + (kwNotturnaB * oreNotte);
  const annualKwhB = kwhGiornoB * 365;
  const annualCostEurB = annualKwhB * tariffaEurKwh;

  const savingsEur = Math.max(0, annualCostEurA - annualCostEurB);
  const savingsKwh = Math.max(0, annualKwhA - annualKwhB);
  const savingsPercent = annualCostEurA > 0 ? (savingsEur / annualCostEurA) * 100 : 0;
  const co2SavedTons = savingsKwh * (CONFIG.CO2_FACTOR_KG_KWH / 1000);

  // Calcolo breakdown additivo coerente:
  // 1. Risparmio da Standby Zero e Relè notturno:
  const risparmioStandbyKwh = (((pStandbyBase * areaM2) / 1000) * oreNotte) * 365;
  const standbyZeroEur = fleetOptions.standbyZero ? risparmioStandbyKwh * tariffaEurKwh : 0;

  // 2. Risparmio da Dimming Notturno:
  const deltaNotteWmq = Math.max(0, pNotturnaA_Wmq - (fleetOptions.standbyZero ? 0 : pNotturnaB_Wmq) - (fleetOptions.standbyZero ? pStandbyBase : 0));
  const nightDimmingKwh = ((deltaNotteWmq * areaM2) / 1000) * oreNotte * 365;
  const nightDimmingEur = fleetOptions.dimmingNotturno ? Math.max(0, nightDimmingKwh * tariffaEurKwh) : 0;

  // 3. Risparmio da Dimming Adattivo & Sensore Lux Diurno:
  const adaptiveLuxEur = Math.max(0, savingsEur - standbyZeroEur - nightDimmingEur);

  const claimVerified = savingsPercent >= CONFIG.CLAIM_SAVINGS_PERCENT;
  if (!claimVerified && typeof console !== 'undefined') {
    console.warn(`[VeroLED Engine] Attenzione: il risparmio calcolato (${savingsPercent.toFixed(1)}%) è inferiore alla soglia di riferimento del ${CONFIG.CLAIM_SAVINGS_PERCENT}%.`);
  }

  return {
    annualKwhA,
    annualCostEurA,
    annualKwhB,
    annualCostEurB,
    savingsEur,
    savingsKwh,
    savingsPercent,
    co2SavedTons,
    claimVerified,
    breakdown: {
      standbyZeroEur,
      nightDimmingEur,
      adaptiveLuxEur,
    },
  };
}

export interface PitchPhysicalLimit {
  maxNits: number;
  chipType: string;
  limitReason: string;
}

/**
 * Restituisce il limite fisico-meccanico e termico di luminosità (Nit) per ciascun passo pixel outdoor.
 * Un passo 3.91 (SMD1921) per vincoli di densità termica e degradazione della giunzione (Tj) non può
 * superare i 6.500 nit; i 10.000 nit sono raggiungibili unicamente da passi generosi (P6.67, P8, P10 con chip SMD2727/3535).
 */
export function getMaxNitsForPitch(pitchMm: number): PitchPhysicalLimit {
  if (pitchMm <= 2.6) {
    return {
      maxNits: 4500,
      chipType: 'SMD1415 / Mini-LED',
      limitReason: 'Limite fisico termico: oltre 4.500 nit i micro-chip degradano la resina epossidica.'
    };
  }
  if (pitchMm <= 2.9) {
    return {
      maxNits: 5000,
      chipType: 'SMD1415 / SMD1515',
      limitReason: 'Saturazione termica del PCB oltre 5.000 nit per eccessiva densità di giunzioni (118k px/m²).'
    };
  }
  if (pitchMm <= 3.91) {
    return {
      maxNits: 6500,
      chipType: 'SMD1921 (Package compatto outdoor)',
      limitReason: 'Limite fisico-meccanico: i micro-diodi SMD1921 fondono per Thermal Droop oltre i 6.500 nit.'
    };
  }
  if (pitchMm <= 4.81) {
    return {
      maxNits: 7000,
      chipType: 'SMD1921 / SMD2121',
      limitReason: 'Limite termico dissipativo standard del modulo: max 7.000 nit.'
    };
  }
  if (pitchMm <= 6.67) {
    return {
      maxNits: 12000,
      chipType: 'SMD2727 High-Power Gold Wire',
      limitReason: 'Chip generoso con legatura Gold Wire 99.99%: supporta fino a 12.000 nit continui senza degrado termico.'
    };
  }
  return {
    maxNits: 12000,
    chipType: 'SMD2727 / SMD3535 Catodo Comune Gold Wire',
    limitReason: 'Architettura Catodo Comune + Gold Wire: 12.000 nit stabili erogabili sotto irraggiazine solare zenitale.'
  };
}

export interface HardwareComparisonResult {
  pMaxWmq: number;
  pMedioWmq: number;
  pixelM2: number;
  numDriversM2: number;
  annualCostEur: number;
  annualKwh: number;
  efficienzaLmPerW: number;
  tecnologiaChip: string;
  maxPhysicalNits: number;
  isAtPhysicalLimit: boolean;
  limitReason: string;
  sforzoPercent: number; // % di sforzo del chip (duty cycle / carico termico) per erogare i nit target
}

/**
 * Calcola e stima i consumi fisici reali comparando passo pixel e luminosità (Nits).
 * Modella accuratamente lo SFORZO del semiconduttore (duty cycle):
 * A 5.000 Nit (standard outdoor):
 * - P2.9 mm lavora al ~95% di sforzo (saturazione termica, Tj > 90°C, forte Thermal Droop, resa 55 lm/W)
 * - P3.91 mm lavora al ~71% di sforzo (carico medio-alto, resa 82 lm/W)
 * - P10.0 mm lavora al ~33% di sforzo (a riposo, chip freddo Tj < 45°C, massima efficienza 145 lm/W)
 */
export function stimaPotenzaDaPassoNit(
  pitchMm: number,
  nits: number = 5000,
  areaM2: number = 32,
  tariffaEurKwh: number = 0.35,
  oreGiorno: number = 18,
  commonCathode: boolean = true
): HardwareComparisonResult {
  const limit = getMaxNitsForPitch(pitchMm);
  // Rispetta il vincolo fisico del semiconduttore: non si possono eccedere i nit massimi
  const effectiveNits = Math.min(nits, limit.maxNits);
  const isAtPhysicalLimit = nits >= limit.maxNits;

  // Calcolo dello Sforzo del chip (duty cycle % per raggiungere i nit target)
  // Per i passi grandi (P10) il massimale di progetto su chip generosi SMD3535/DIP è 15.000 nit
  const nominalCeiling = pitchMm >= 9.5 ? 15000 : pitchMm >= 6.0 ? 12000 : limit.maxNits;
  const sforzoPercent = Math.min(100, Math.max(15, Math.round((nits / nominalCeiling) * 100)));

  const pixelM2 = Math.round((1000 / pitchMm) * (1000 / pitchMm));
  const numDriversM2 = Math.round((pixelM2 * 3) / 16);

  // Perdite fisse della logica IC e switching PWM ad alta frequenza (3840Hz)
  // P2.6 ha 148k pixel/m² e migliaia di IC = ~125 W/m²; P10 ha 10k pixel/m² = ~22 W/m²
  const pLogicWmq = Math.round(
    pitchMm <= 2.6 ? 125 :
    pitchMm <= 2.9 ? 110 :
    pitchMm <= 3.91 ? 85 :
    pitchMm <= 4.81 ? 60 :
    pitchMm <= 6.67 ? 38 :
    pitchMm <= 8.0 ? 28 : 22
  );

  // Efficienza fotometrica (lm/W) in funzione dello SFORZO e del Thermal Droop
  let efficienzaLmPerW: number;
  const tecnologiaChip = limit.chipType;

  if (pitchMm <= 2.9) {
    // Sforzo estremo 90-100%: Tj > 90°C, forte thermal droop, quantum efficiency ridotta
    efficienzaLmPerW = sforzoPercent >= 85 ? 55 : 68;
  } else if (pitchMm <= 3.91) {
    // Sforzo medio 70-75%: Tj ~70°C
    efficienzaLmPerW = sforzoPercent >= 70 ? 82 : 98;
  } else if (pitchMm <= 4.81) {
    efficienzaLmPerW = sforzoPercent >= 70 ? 95 : 110;
  } else {
    // Passi generosi P6.67, P8, P10: a 5000 nit lavorano al 30-40% di sforzo ("a riposo")
    // Diodi freddi (Tj < 45°C), minima corrente diretta If, massima efficienza ottica
    efficienzaLmPerW = sforzoPercent <= 50 ? 145 : 130;
  }

  // Flusso fotometrico richiesto (con nits vincolati al limite fisico)
  let pLedWmq = (effectiveNits * 5.8) / efficienzaLmPerW;

  // Tecnologia Catodo Comune (Common Cathode): -22% dissipazione termica sui LED rossi
  if (commonCathode) {
    pLedWmq *= 0.78;
  }

  const pMaxWmq = Math.round(pLogicWmq + pLedWmq);
  // Potenza standby base scalata sul passo
  const pStandbyBase = pitchMm >= 6.0 ? 20 : pitchMm >= 4.0 ? 40 : 50;
  // Potenza media con APL al 30%
  const pMedioWmq = Math.round(pStandbyBase + 0.30 * (pMaxWmq - pStandbyBase));

  const kwMedio = (pMedioWmq * areaM2) / 1000;
  const annualKwh = kwMedio * oreGiorno * 365;
  const annualCostEur = Math.round(annualKwh * tariffaEurKwh);

  return {
    pMaxWmq,
    pMedioWmq,
    pixelM2,
    numDriversM2,
    annualCostEur,
    annualKwh,
    efficienzaLmPerW,
    tecnologiaChip,
    maxPhysicalNits: limit.maxNits,
    isAtPhysicalLimit,
    limitReason: limit.limitReason,
    sforzoPercent,
  };
}

