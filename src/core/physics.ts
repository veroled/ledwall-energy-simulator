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

/**
 * Assorbimento a schermo spento da software (nero, elettronica alimentata), in W/m².
 * Dati di targa VeroLED: 50 W/m² per il P2.9, 25 W/m² per il P10, interpolati sul passo;
 * l'Aegis Hink Premium P16 scende a 3 W/m² grazie allo stand-by dei cabinet.
 */
export function standbyWmqPerPasso(pitchMm: number): number {
  if (pitchMm >= 15) return 3;
  if (pitchMm <= 2.9) return 50;
  if (pitchMm >= 10) return 25;
  return Math.round(50 - ((pitchMm - 2.9) * 25) / 7.1);
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
  if (pitchMm >= 15) {
    return {
      maxNits: 20000,
      chipType: '5744 GoldWire (Aegis Hink Premium)',
      limitReason: 'Chip 5744 a filo d\'oro con dissipazione passiva in alluminio: oltre 20.000 nit reali per mega installazioni a pieno sole.'
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
  const nominalCeiling = pitchMm >= 15 ? 22000 : pitchMm >= 9.5 ? 15000 : pitchMm >= 6.0 ? 12000 : limit.maxNits;
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
    pitchMm <= 8.0 ? 28 :
    pitchMm < 15 ? 22 : 12
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
  const pStandbyBase = standbyWmqPerPasso(pitchMm);
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

export interface PowerQualityAnalysis {
  powerFactorA: number; // es. 0.50 (sfasamento capacitivo filtri EMI a basso APL)
  powerFactorB: number; // es. 0.98 (garantito da Phase Shedding o SVG)
  apparentPowerKvaA: number;
  apparentPowerKvaB: number;
  reactiveKvarA: number;
  reactiveKvarB: number;
  penaleAreraEurAnnoA: number; // Delibera ARERA 232/2022/R/eel per cosfi < 0.9
  penaleAreraEurAnnoB: number; // 0 €
  risparmioPotenzaImpegnataEurAnno: number; // Minori kVA contrattuali impegnati
  totaleRisparmioReteEurAnno: number;
  totalCabinets: number;
  totalPowerSupplies: number;
  isDiamond: boolean;
}

/**
 * Calcola l'analisi di Power Quality (Fattore di Potenza, Potenza Apparente, Reattiva Capacitiva e Penali ARERA)
 * per impianti DOOH e Serie Diamond.
 * In Scenario A (standard con PSU a singola fase tipo Mean Well UHP-200), il PF crolla a basso carico (~0.50-0.55).
 * In Scenario B (Serie Diamond con Interleaved PFC + Phase Shedding o Grandi Formati con Quadro SVG Smart Power Guard),
 * il PF è mantenuto stabilmente >= 0.95 - 0.99.
 */
export function calcolaPowerQuality(
  totalCabinets: number,
  kwAttiviA: number,
  kwAttiviB: number,
  oreGiorno: number,
  isDiamondOrSvg: boolean = true
): PowerQualityAnalysis {
  const totalPowerSupplies = Math.max(1, totalCabinets * 2);
  const oreNotte = 24 - oreGiorno;

  // Carico per singolo alimentatore in Scenario A (W medi su 200W nominali)
  const wattPerPsuA = (kwAttiviA * 1000) / totalPowerSupplies;
  const loadPercentA = Math.max(0.05, Math.min(1.0, wattPerPsuA / 200));

  // Curva di crollo PF per alimentatori switching standard (singola fase, no phase shedding)
  let powerFactorA = 0.95;
  if (loadPercentA < 0.20) {
    powerFactorA = 0.50;
  } else if (loadPercentA < 0.35) {
    powerFactorA = 0.62;
  } else if (loadPercentA < 0.50) {
    powerFactorA = 0.78;
  } else if (loadPercentA < 0.70) {
    powerFactorA = 0.88;
  }

  // Scenario B: Con Phase Shedding (Serie Diamond) o SVG Smart Power Guard
  const powerFactorB = isDiamondOrSvg ? 0.98 : 0.92;

  // Potenza Apparente S = P / PF (kVA)
  const apparentPowerKvaA = Math.round((kwAttiviA / powerFactorA) * 10) / 10;
  const apparentPowerKvaB = Math.round((kwAttiviB / powerFactorB) * 10) / 10;

  // Potenza Reattiva Q = sqrt(S^2 - P^2) (kvar)
  const reactiveKvarA = Math.round(Math.sqrt(Math.max(0, Math.pow(apparentPowerKvaA, 2) - Math.pow(kwAttiviA, 2))) * 10) / 10;
  const reactiveKvarB = Math.round(Math.sqrt(Math.max(0, Math.pow(apparentPowerKvaB, 2) - Math.pow(kwAttiviB, 2))) * 10) / 10;

  // Stima penali ARERA per immissione di reattiva capacitiva (Delibera 232/2022/R/eel per cosfi < 0.95/0.90)
  // Media sanzione per kvarh eccedente: ~0.022 €/kvarh su ore annue a basso APL/notte
  const oreBassoCaricoAnno = (oreNotte + (oreGiorno * 0.4)) * 365;
  const penaleAreraEurAnnoA = powerFactorA < 0.85
    ? Math.round(reactiveKvarA * oreBassoCaricoAnno * 0.022)
    : 0;
  const penaleAreraEurAnnoB = 0; // Garantita zero da SVG / Phase Shedding

  // Risparmio quota potenza contrattuale (kVA impegnati al contatore):
  // Costo medio potenza impegnata in BT/MT: ~74 €/kVA/anno
  const deltaKvaContrattuali = Math.max(0, apparentPowerKvaA - apparentPowerKvaB);
  const risparmioPotenzaImpegnataEurAnno = Math.round(deltaKvaContrattuali * 74);

  const totaleRisparmioReteEurAnno = penaleAreraEurAnnoA + risparmioPotenzaImpegnataEurAnno;

  return {
    powerFactorA,
    powerFactorB,
    apparentPowerKvaA,
    apparentPowerKvaB,
    reactiveKvarA,
    reactiveKvarB,
    penaleAreraEurAnnoA,
    penaleAreraEurAnnoB,
    risparmioPotenzaImpegnataEurAnno,
    totaleRisparmioReteEurAnno,
    totalCabinets,
    totalPowerSupplies,
    isDiamond: isDiamondOrSvg,
  };
}

/**
 * Risultato della Consulenza Ottica (Confronto Passo Richiesto dal Cliente vs Passo Proposto dal Sistema)
 */
export interface OpticalConsultingResult {
  installHeightM: number;
  groundViewingDistM: number;
  screenHeightM: number; // altezza dello schermo (0 se non nota: la quota vale per il centro)
  centerHeightM: number; // quota del centro schermo = base + altezza / 2
  lineOfSightDistM: number; // al centro dello schermo: sqrt((h + H/2)^2 + d^2)
  lineOfSightBaseM: number; // al bordo basso, il punto più vicino a chi guarda
  lineOfSightTopM: number; // al bordo alto
  clientPitchMm: number;
  recommendedPitchMm: number;
  minResolvablePitchMm: number; // Soglia 1 arcminuto occhio umano
  isClientPitchOverkill: boolean;
  pixelDensityClient: number; // px/m²
  pixelDensityRecommended: number; // px/m²
  totalPixelsClient: number;
  totalPixelsRecommended: number;
  wastedPixelsCount: number;
  wastedPixelsPercent: number;
  hardwareClient: HardwareComparisonResult;
  hardwareRecommended: HardwareComparisonResult;
  deltaAnnualEnergyCostEur: number;
  clientMonthlyRentalEur: number;
  recommendedMonthlyRentalEur: number;
  monthlyRentalSavingsEur: number;
  total24MonthSavingsEur: number;
  scientificVerdict: string;
}

/**
 * Calcola la consulenza ottica confrontando il passo pixel scelto dal cliente
 * con quello ottimale suggerito dalla fisica della visione umana (Snellen 20/20 a 1 arcminuto)
 * in funzione dell'altezza da terra e della distanza dell'osservatore.
 */
export function calcolaConsulenzaOttica(
  installHeightM: number,
  groundViewingDistM: number,
  clientPitchMm: number,
  areaM2: number = 18,
  targetNits: number = 6000,
  screenHeightM: number = 0
): OpticalConsultingResult {
  const h = Math.max(0, installHeightM);
  const d = Math.max(1, groundViewingDistM);
  const H = Math.max(0, screenHeightM);
  const hyp = (quota: number) => Math.round(Math.sqrt(quota * quota + d * d) * 10) / 10;
  // Linea di vista reale: ipotenusa fino al CENTRO dello schermo, dove cade lo sguardo.
  // installHeightM è la quota della base: su uno schermo alto 10 m il centro sta 5 m più su.
  const centerHeightM = h + H / 2;
  const lineOfSightDistM = hyp(centerHeightM);
  const lineOfSightBaseM = hyp(h);
  const lineOfSightTopM = hyp(h + H);

  // Risoluzione minima angolare occhio umano: 1 arcminuto = 0.000291 rad
  // A distanza D, il limite di risoluzione per separare due diodi è: p = D * 0.291 mm
  const minResolvablePitchMm = Math.round(lineOfSightDistM * 0.291 * 100) / 100;

  // Selezione del passo commerciale consigliato (outdoor standard: 2.6, 2.9, 3.91, 4.81, 6.67, 8.0, 10.0)
  let recommendedPitchMm = 3.91;
  if (lineOfSightDistM < 6) {
    recommendedPitchMm = 2.6;
  } else if (lineOfSightDistM < 9) {
    recommendedPitchMm = 2.9;
  } else if (lineOfSightDistM <= 16) {
    recommendedPitchMm = 3.91;
  } else if (lineOfSightDistM <= 22) {
    recommendedPitchMm = 4.81;
  } else if (lineOfSightDistM < 27.5) {
    recommendedPitchMm = 6.67;
  } else if (lineOfSightDistM < 34.4) {
    // Da 27,5 m l'occhio fonde già il P8 (8 / 0,291), da 34,4 m il P10: oltre non serve un passo più fitto
    recommendedPitchMm = 8.0;
  } else if (lineOfSightDistM < 55) {
    recommendedPitchMm = 10.0;
  } else {
    // Da 55 m (16 / 0,291) l'occhio fonde anche il P16
    recommendedPitchMm = 16.0;
  }

  const isClientPitchOverkill = clientPitchMm < recommendedPitchMm;

  // Densità e totale pixel
  const pixelDensityClient = Math.round(Math.pow(1000 / clientPitchMm, 2));
  const pixelDensityRecommended = Math.round(Math.pow(1000 / recommendedPitchMm, 2));
  const totalPixelsClient = Math.round(pixelDensityClient * areaM2);
  const totalPixelsRecommended = Math.round(pixelDensityRecommended * areaM2);

  const wastedPixelsCount = Math.max(0, totalPixelsClient - totalPixelsRecommended);
  const wastedPixelsPercent = totalPixelsClient > 0 ? Math.round((wastedPixelsCount / totalPixelsClient) * 100) : 0;

  // Hardware estimate a targetNits (es. 6000 nit per outdoor RFP)
  const hardwareClient = stimaPotenzaDaPassoNit(clientPitchMm, targetNits, areaM2);
  const hardwareRecommended = stimaPotenzaDaPassoNit(recommendedPitchMm, targetNits, areaM2);

  const deltaAnnualEnergyCostEur = Math.max(0, hardwareClient.annualCostEur - hardwareRecommended.annualCostEur);

  // Stima noleggio operativo a 24 mesi:
  // P2.6 / P1.95 outdoor 6000 nit richiede package miniaturizzati con alto costo di produzione (~108 €/m²/mese)
  // P3.91 / P4.8 comporta moduli SMD1921 industriali ad alta scala (~67 €/m²/mese -> ~1.200 €/mese per 18 m²!)
  const clientRatePerM2Month = clientPitchMm <= 2.6 ? 108 : clientPitchMm <= 3.0 ? 92 : 67;
  const recRatePerM2Month = recommendedPitchMm <= 2.6 ? 108 : recommendedPitchMm <= 3.0 ? 92 : 67;

  const clientMonthlyRentalEur = Math.round(areaM2 * clientRatePerM2Month);
  const recommendedMonthlyRentalEur = Math.round(areaM2 * recRatePerM2Month);
  const monthlyRentalSavingsEur = Math.max(0, clientMonthlyRentalEur - recommendedMonthlyRentalEur);
  const total24MonthSavingsEur = (monthlyRentalSavingsEur * 24) + (deltaAnnualEnergyCostEur * 2);

  let scientificVerdict = '';
  if (isClientPitchOverkill) {
    scientificVerdict = `A ${lineOfSightDistM} metri di linea di vista (installazione a ${h}m di quota e ${d}m di distanza suolo), l'acuità visiva umana fonde completamente i pixel già a passo P${recommendedPitchMm} mm (qualità Retina). La scelta di un P${clientPitchMm} mm comporta ${wastedPixelsPercent}% di pixel non distinguibili dall'occhio umano, spingendo i micro-diodi in saturazione termica a ${targetNits} nit (${hardwareClient.sforzoPercent}% sforzo) e raddoppiando i consumi energetici senza alcun reale beneficio visivo per l'osservatore.`;
  } else {
    scientificVerdict = `Il passo P${clientPitchMm} mm è perfettamente bilanciato per la distanza di visione calcolata di ${lineOfSightDistM} metri.`;
  }

  return {
    installHeightM: h,
    groundViewingDistM: d,
    screenHeightM: H,
    centerHeightM,
    lineOfSightDistM,
    lineOfSightBaseM,
    lineOfSightTopM,
    clientPitchMm,
    recommendedPitchMm,
    minResolvablePitchMm,
    isClientPitchOverkill,
    pixelDensityClient,
    pixelDensityRecommended,
    totalPixelsClient,
    totalPixelsRecommended,
    wastedPixelsCount,
    wastedPixelsPercent,
    hardwareClient,
    hardwareRecommended,
    deltaAnnualEnergyCostEur,
    clientMonthlyRentalEur,
    recommendedMonthlyRentalEur,
    monthlyRentalSavingsEur,
    total24MonthSavingsEur,
    scientificVerdict,
  };
}

/**
 * Proposta di alternativa hardware per la Modalità Express:
 * confronta la configurazione scelta dal cliente con un passo pixel più generoso
 * che, alla distanza di visione dichiarata, resta sotto la soglia di risoluzione dell'occhio (1 arcminuto)
 * e quindi consuma meno lavorando con chip meno stressati (prodotto migliore + bolletta più bassa).
 */
export interface ConfigurazioneSnapshot {
  pitchMm: number;
  nits: number;
  nitsEffettivi: number; // nits realmente erogabili (cap fisico del chip)
  hardware: HardwareComparisonResult;
  pMaxWmq: number;
  pMedioWmq: number; // W/m² con l'APL reale del contenuto
  kwIstantanei: number;
  dailyKwh: number;
  annualKwh: number;
  annualCostEur: number;
  monthlyCostEur: number;
}

export interface AlternativeProposal {
  hasAlternative: boolean;
  kind: 'pitch' | 'coarse' | 'fleet' | 'none';
  lineOfSightDistM: number;
  lineOfSightBaseM: number;
  lineOfSightTopM: number;
  centerHeightM: number;
  minResolvablePitchMm: number;
  recommendedPitchMm: number;
  current: ConfigurazioneSnapshot;
  proposed: ConfigurazioneSnapshot;
  savingsEur: number;
  savingsPercent: number;
  savingsKwh: number;
  extraCostEur: number; // solo kind 'coarse': energia in più del passo più fitto che serve a quella distanza
  co2SavedTons: number;
  wastedPixelsPercent: number;
  rentalSavings24mEur: number;
  fleetMonitorExtraEur: number; // €/anno risparmiati applicando Fleet Monitor alla proposta
  fleetMonitorExtraPercent: number; // sulla stessa bolletta mostrata per la proposta (proposed.annualCostEur)
  fleetMonitorCostEur: number; // bolletta annua che resta con Fleet Monitor
  headline: string;
  reasons: string[];
}

const PITCH_PRESETS_EXPRESS = [2.6, 2.9, 3.9, 4.8, 6.7, 8.0, 10.0, 16.0];

function snapshotConfigurazione(
  pitchMm: number,
  nits: number,
  areaM2: number,
  apl: number,
  oreGiorno: number,
  tariffaEurKwh: number
): ConfigurazioneSnapshot {
  const hardware = stimaPotenzaDaPassoNit(pitchMm, nits, areaM2, tariffaEurKwh, oreGiorno);
  const pStandby = standbyWmqPerPasso(pitchMm);
  const profile = calcolaProfiloEnergetico(
    areaM2,
    apl,
    1.0,
    CONFIG.DEFAULT_NIGHT_DIMMING_PERCENT / 100,
    oreGiorno,
    true,
    true,
    tariffaEurKwh,
    hardware.pMaxWmq,
    pStandby
  );
  return {
    pitchMm,
    nits,
    nitsEffettivi: Math.min(nits, hardware.maxPhysicalNits),
    hardware,
    pMaxWmq: hardware.pMaxWmq,
    pMedioWmq: Math.round(profile.dayPowerWmq),
    kwIstantanei: Math.round(((profile.dayPowerWmq * areaM2) / 1000) * 100) / 100,
    dailyKwh: Math.round(profile.totalDailyKwh * 10) / 10,
    annualKwh: Math.round(profile.annualKwh),
    annualCostEur: Math.round(profile.annualCostEur),
    monthlyCostEur: Math.round(profile.monthlyCostEur),
  };
}

export function suggerisciAlternativa(
  pitchMm: number,
  nits: number,
  areaM2: number,
  apl: number,
  oreGiorno: number,
  tariffaEurKwh: number,
  installHeightM: number = 5,
  groundViewingDistM: number = 10,
  screenHeightM: number = 0
): AlternativeProposal {
  const optical = calcolaConsulenzaOttica(installHeightM, groundViewingDistM, pitchMm, areaM2, nits, screenHeightM);
  const current = snapshotConfigurazione(pitchMm, nits, areaM2, apl, oreGiorno, tariffaEurKwh);

  // Passo commerciale più generoso che resta "retina" alla distanza dichiarata
  const candidates = PITCH_PRESETS_EXPRESS.filter(
    (p) => p > pitchMm + 0.05 && p <= optical.recommendedPitchMm + 0.15
  );
  const proposedPitch = candidates.length > 0 ? Math.max(...candidates) : pitchMm;
  const proposed = snapshotConfigurazione(proposedPitch, nits, areaM2, apl, oreGiorno, tariffaEurKwh);

  const hasPitchAlternative = proposedPitch !== pitchMm && proposed.annualCostEur < current.annualCostEur;

  // Caso opposto: passo più largo di quello che la distanza regge. Consuma meno, ma i pixel si vedono:
  // qui si propone il passo commerciale più generoso che resta pulito, dichiarando l'energia in più.
  const cleanPresets = PITCH_PRESETS_EXPRESS.filter((p) => p <= optical.recommendedPitchMm + 0.15);
  const finerPitch = cleanPresets.length > 0 ? Math.max(...cleanPresets) : PITCH_PRESETS_EXPRESS[0];
  // Troppo largo solo se l'occhio separa davvero i diodi a quella distanza (oltre 1 arcminuto)
  const isTooCoarse =
    pitchMm > optical.recommendedPitchMm + 0.15 && pitchMm > optical.minResolvablePitchMm && finerPitch < pitchMm;
  const finer = isTooCoarse
    ? snapshotConfigurazione(finerPitch, nits, areaM2, apl, oreGiorno, tariffaEurKwh)
    : current;

  const finalProposed = hasPitchAlternative ? proposed : isTooCoarse ? finer : current;
  const extraCostEur = isTooCoarse ? Math.max(0, finer.annualCostEur - current.annualCostEur) : 0;

  const savingsEur = Math.max(0, current.annualCostEur - finalProposed.annualCostEur);
  const savingsKwh = Math.max(0, current.annualKwh - finalProposed.annualKwh);
  const savingsPercent = current.annualCostEur > 0 ? Math.round((savingsEur / current.annualCostEur) * 100) : 0;
  const co2SavedTons = Math.round(savingsKwh * (CONFIG.CO2_FACTOR_KG_KWH / 1000) * 100) / 100;

  // Fleet Monitor applicato alla configurazione proposta (o a quella attuale se non c'è alternativa)
  const fleet = confrontaScenari(
    areaM2,
    apl,
    oreGiorno,
    tariffaEurKwh,
    undefined,
    finalProposed.pMaxWmq,
    standbyWmqPerPasso(finalProposed.pitchMm)
  );
  // Il risparmio si misura sulla bolletta che l'utente vede per quella configurazione (già con dimming
  // notturno CEI), non sullo scenario "non gestito" di confrontaScenari: altrimenti percentuale e importi
  // non tornano tra loro.
  const fleetMonitorCostEur = Math.min(finalProposed.annualCostEur, Math.round(fleet.annualCostEurB));
  const fleetMonitorExtraEur = finalProposed.annualCostEur - fleetMonitorCostEur;
  const fleetMonitorExtraPercent =
    finalProposed.annualCostEur > 0 ? Math.round((fleetMonitorExtraEur / finalProposed.annualCostEur) * 100) : 0;

  const D = optical.lineOfSightDistM;
  const Dtxt = D.toLocaleString('it-IT');
  const reasons: string[] = [];
  let headline = '';
  let kind: AlternativeProposal['kind'] = 'none';

  if (hasPitchAlternative) {
    kind = 'pitch';
    headline = `Ti consigliamo il P${proposedPitch} mm: -${savingsPercent}% di consumi a parità di qualità percepita a ${Dtxt} m.`;
    reasons.push(
      `A ${Dtxt} m di linea di vista l'occhio fonde i pixel già dal P${optical.recommendedPitchMm} mm: il P${pitchMm} spende il ${optical.wastedPixelsPercent}% dei pixel in dettaglio non visibile.`
    );
    if (current.hardware.isAtPhysicalLimit && current.nitsEffettivi < nits) {
      reasons.push(
        `Il P${pitchMm} non arriva a ${nits.toLocaleString('it-IT')} nit (tetto fisico ${current.hardware.maxPhysicalNits.toLocaleString('it-IT')}): sotto il sole diretto il contenuto sbiadisce. Il P${proposedPitch} li eroga al ${proposed.hardware.sforzoPercent}% di sforzo.`
      );
    } else {
      reasons.push(
        `Sforzo dei chip dal ${current.hardware.sforzoPercent}% al ${proposed.hardware.sforzoPercent}%: giunzione più fredda, meno thermal droop, vita utile più lunga.`
      );
    }
    reasons.push(
      `Efficienza da ${current.hardware.efficienzaLmPerW} a ${proposed.hardware.efficienzaLmPerW} lm/W (${current.hardware.tecnologiaChip} → ${proposed.hardware.tecnologiaChip}).`
    );
    reasons.push(
      `Potenza media reale con il tuo contenuto: da ${current.pMedioWmq} a ${proposed.pMedioWmq} W/m².`
    );
  } else if (isTooCoarse) {
    kind = 'coarse';
    const pixelRatio = Math.round(Math.pow(pitchMm / finerPitch, 2) * 10) / 10;
    headline = `A ${Dtxt} m il P${pitchMm} mm è troppo largo: la trama dei pixel si vede. Per un'immagine piena serve il P${finerPitch} mm.`;
    reasons.push(
      `A ${Dtxt} m l'occhio distingue i singoli diodi sopra i ${optical.minResolvablePitchMm.toLocaleString('it-IT')} mm di passo (1 arcminuto): con il P${pitchMm} testi e volti risultano sgranati.`
    );
    reasons.push(
      `Il P${finerPitch} porta ${pixelRatio.toLocaleString('it-IT')}× più pixel sulla stessa superficie: il contenuto resta leggibile da dove lo guardano davvero.`
    );
    reasons.push(
      extraCostEur > 0
        ? `Il P${pitchMm} consuma meno (${current.pMedioWmq} contro ${finer.pMedioWmq} W/m²), ma il risparmio si paga in qualità. Il P${pitchMm} torna corretto da circa ${Math.round(pitchMm / 0.291)} m in su.`
        : `Il P${pitchMm} torna corretto da circa ${Math.round(pitchMm / 0.291)} m in su.`
    );
    if (finer.hardware.isAtPhysicalLimit && finer.nitsEffettivi < nits) {
      reasons.push(
        `Attenzione: il P${finerPitch} eroga al massimo ${finer.hardware.maxPhysicalNits.toLocaleString('it-IT')} nit, non i ${nits.toLocaleString('it-IT')} richiesti.`
      );
    }
  } else if (fleetMonitorExtraEur > 0) {
    kind = 'fleet';
    headline = `Il P${pitchMm} mm è già il passo giusto per ${Dtxt} m: il margine è nella gestione. Fleet Monitor taglia un altro ${fleetMonitorExtraPercent}% di bolletta.`;
    if (current.hardware.isAtPhysicalLimit && current.nitsEffettivi < nits) {
      reasons.push(
        `Attenzione: il P${pitchMm} eroga al massimo ${current.hardware.maxPhysicalNits.toLocaleString('it-IT')} nit, non i ${nits.toLocaleString('it-IT')} richiesti. Per quel picco serve un passo più generoso, che a ${Dtxt} m sarebbe però visibile.`
      );
    }
    reasons.push('Sensore lux e dimming adattivo: luminosità diurna tarata sull\'ambiente, non fissa al 100%.');
    reasons.push('Dimming notturno al 10% (CEI) e relè di standby a 0 W/m² a schermo spento.');
    reasons.push(`Chip al ${current.hardware.sforzoPercent}% di sforzo: già in regime termico sano.`);
  } else {
    headline = `Configurazione bilanciata: il P${pitchMm} mm a ${nits.toLocaleString('it-IT')} nit è coerente con ${Dtxt} m di distanza.`;
  }

  return {
    hasAlternative: kind !== 'none',
    kind,
    lineOfSightDistM: D,
    lineOfSightBaseM: optical.lineOfSightBaseM,
    lineOfSightTopM: optical.lineOfSightTopM,
    centerHeightM: optical.centerHeightM,
    minResolvablePitchMm: optical.minResolvablePitchMm,
    recommendedPitchMm: optical.recommendedPitchMm,
    current,
    proposed: finalProposed,
    savingsEur,
    savingsPercent,
    savingsKwh: Math.round(savingsKwh),
    extraCostEur,
    co2SavedTons,
    wastedPixelsPercent: hasPitchAlternative ? optical.wastedPixelsPercent : 0,
    rentalSavings24mEur: hasPitchAlternative ? optical.monthlyRentalSavingsEur * 24 : 0,
    fleetMonitorExtraEur,
    fleetMonitorExtraPercent,
    fleetMonitorCostEur,
    headline,
    reasons,
  };
}
