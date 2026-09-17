/**
 * Motore Fisico-Matematico dei Consumi Energetici per LEDwall Outdoor
 * Conforme alle norme CEI 64-8 / DOOH Standards e benchmark VeroLED
 */
import { CONFIG } from '../config/config';
import catalogoNit from '../config/catalogo-nit.json';

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
 * Dati di targa di un prodotto specifico, comunicati da VeroLED: valgono SOLO per quella combinazione
 * Selection × passo e non si estendono alle altre Selection dello stesso passo.
 */
export interface DatoDiTarga {
  tier: 'diamond' | 'platinum' | 'gold' | 'silver' | 'bronze' | 'essential';
  pitchMm: number;
  prodotto: string;
  standbyWmq: number; // W/m² a schermo spento da software
  pMaxWmq: number; // W/m² a bianco pieno alla luminosità massima della combinazione
}

export const DATI_DI_TARGA: DatoDiTarga[] = [
  // Aegis Hink Premium (dato VeroLED, 17/09/2026): 3 W/m² in standby, 300 W/m² massimi a 20.000 nit
  { tier: 'diamond', pitchMm: 16, prodotto: 'Aegis Hink Premium', standbyWmq: 3, pMaxWmq: 300 },
];

export function datoDiTarga(tier: DatoDiTarga['tier'] | undefined | null, pitchMm: number): DatoDiTarga | null {
  if (!tier) return null;
  return DATI_DI_TARGA.find((d) => d.tier === tier && Math.abs(d.pitchMm - pitchMm) <= 0.035) ?? null;
}

/**
 * Assorbimento a schermo spento da software (nero, elettronica alimentata), in W/m².
 * Dati VeroLED: 50 W/m² per il P2.9, 25 W/m² per il P10, interpolati sul passo e fermi a 25 oltre.
 * Se la combinazione Selection × passo ha un dato di targa (Aegis Hink Premium: 3 W/m²) vale quello,
 * e solo per quella combinazione: un P16 di un'altra Selection resta a 25 W/m².
 */
export function standbyWmqPerPasso(pitchMm: number, tier?: DatoDiTarga['tier'] | null): number {
  const targa = datoDiTarga(tier, pitchMm);
  if (targa) return targa.standbyWmq;
  if (pitchMm <= 2.9) return 50;
  if (pitchMm >= 10) return 25;
  return Math.round(50 - ((pitchMm - 2.9) * 25) / 7.1);
}

/* ──────────────────────────────────────────────────────────────────────────────
 * CATALOGO: nit per combinazione Selection (tier) × passo
 * Lo stesso passo è venduto in 6 Selection con chip e filo diversi (GoldWire, CopperWire,
 * Alu/Copper): il tetto di nit è del COMPONENTE, non del passo. I valori arrivano dal listino
 * del sito (`npm run sync:catalogo`). Una combinazione assente resta assente: il simulatore la
 * dichiara "dato non disponibile" e non prende mai in prestito il valore di un'altra.
 * ────────────────────────────────────────────────────────────────────────────── */
export type TierId = 'diamond' | 'platinum' | 'gold' | 'silver' | 'bronze' | 'essential';

export const TIERS: { id: TierId; name: string; wire: string }[] = [
  { id: 'diamond', name: 'Diamond', wire: 'GoldWire' },
  { id: 'platinum', name: 'Platinum', wire: 'GoldWire' },
  { id: 'gold', name: 'Gold', wire: 'GoldWire' },
  { id: 'silver', name: 'Silver', wire: 'CopperWire' },
  { id: 'bronze', name: 'Bronze', wire: 'CopperWire' },
  { id: 'essential', name: 'Essential', wire: 'Alu/Copper' },
];

export interface DatoCatalogo {
  tier: TierId;
  pitchMm: number;
  maxNits: number;
  chip: string;
}

const CATALOGO: DatoCatalogo[] = catalogoNit.rows as DatoCatalogo[];

/** Stesso passo nominale: 3.9 e 3.91 sono lo stesso prodotto, 2.5 e 2.6 no */
export const stessoPasso = (a: number, b: number) => Math.abs(a - b) <= 0.035;

export const tierName = (tier: TierId) => TIERS.find((t) => t.id === tier)?.name ?? tier;

/** Tutti i passi outdoor a listino, in qualunque Selection */
export const PASSI_CATALOGO: number[] = [...new Set(CATALOGO.map((r) => r.pitchMm))].sort((a, b) => a - b);

/** Le combinazioni a listino di una Selection, dal passo più fitto al più largo */
export function passiDelTier(tier: TierId): DatoCatalogo[] {
  return CATALOGO.filter((r) => r.tier === tier).sort((a, b) => a.pitchMm - b.pitchMm);
}

/** Il dato di listino di QUELLA combinazione, oppure null. Mai il valore di un altro tier o passo. */
export function datoCatalogo(tier: TierId, pitchMm: number): DatoCatalogo | null {
  return CATALOGO.find((r) => r.tier === tier && stessoPasso(r.pitchMm, pitchMm)) ?? null;
}

/**
 * La combinazione eroga i nit richiesti? true / false dal listino, null se il dato non esiste:
 * chi chiama deve trattare null come "non validabile", non come un sì.
 */
export function combinazioneRaggiungeNit(tier: TierId, pitchMm: number, nits: number): boolean | null {
  const dato = datoCatalogo(tier, pitchMm);
  return dato ? nits <= dato.maxNits : null;
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
  commonCathode: boolean = true,
  catalogo?: DatoCatalogo | null
): HardwareComparisonResult {
  // Con il dato di listino della combinazione tier × passo, tetto e chip sono quelli del componente reale
  const limit: PitchPhysicalLimit = catalogo
    ? {
        maxNits: catalogo.maxNits,
        chipType: catalogo.chip,
        limitReason: `Tetto di listino della Selection ${tierName(catalogo.tier)} sul P${catalogo.pitchMm}: ${catalogo.maxNits.toLocaleString('it-IT')} nit (${catalogo.chip}).`,
      }
    : getMaxNitsForPitch(pitchMm);
  // Rispetta il vincolo fisico del semiconduttore: non si possono eccedere i nit massimi
  const effectiveNits = Math.min(nits, limit.maxNits);
  const isAtPhysicalLimit = nits >= limit.maxNits;

  // Calcolo dello Sforzo del chip (duty cycle % per raggiungere i nit target)
  // Per i passi grandi (P10) il massimale di progetto su chip generosi SMD3535/DIP è 15.000 nit
  // Con il dato di listino lo sforzo è il rapporto con il tetto reale di quel componente
  const nominalCeiling = catalogo
    ? catalogo.maxNits
    : pitchMm >= 15 ? 22000 : pitchMm >= 9.5 ? 15000 : pitchMm >= 6.0 ? 12000 : limit.maxNits;
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

  // Con un dato di targa il picco è quello dichiarato alla luminosità massima della combinazione,
  // scalato sui nit richiesti per la sola parte LED (la logica non dipende dalla luminosità)
  const targa = catalogo ? datoDiTarga(catalogo.tier, pitchMm) : null;
  const pMaxWmq = targa && catalogo
    ? Math.round(pLogicWmq + Math.max(0, targa.pMaxWmq - pLogicWmq) * (effectiveNits / catalogo.maxNits))
    : Math.round(pLogicWmq + pLedWmq);
  // Potenza standby base scalata sul passo
  const pStandbyBase = standbyWmqPerPasso(pitchMm, catalogo?.tier);
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
  /**
   * pitch: il passo scelto è valido ma uno più largo, altrettanto valido, consuma meno
   * fleet / none: il passo scelto soddisfa TUTTI i requisiti (nit e distanza) — unici verdetti positivi
   * coarse: troppo largo per la distanza · brightness: non arriva ai nit richiesti
   * compromise: nessun passo della Selection soddisfa insieme nit e distanza
   * nodata: il listino non ha il tetto di nit di questa combinazione Selection × passo, quindi non è validabile
   */
  kind: 'pitch' | 'coarse' | 'brightness' | 'compromise' | 'nodata' | 'fleet' | 'none';
  tier: TierId;
  /** Il listino ha il dato di nit per la combinazione scelta */
  currentHasData: boolean;
  /** Tetto di nit di listino della combinazione scelta (null = dato non disponibile) */
  currentMaxNits: number | null;
  /** Altre Selection in cui un passo soddisfa entrambi i requisiti (il più largo per ciascuna) */
  validInOtherTiers: DatoCatalogo[];
  /** Il passo scelto soddisfa entrambi i requisiti. Senza questo non esiste verdetto positivo. */
  currentIsValid: boolean;
  currentMeetsBrightness: boolean;
  currentMeetsDistance: boolean;
  /** Passi della Selection scelta che soddisfano insieme luminosità richiesta e distanza di visione */
  validPitchesMm: number[];
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
  extraCostEur: number; // energia in più della proposta rispetto alla scelta attuale (0 se costa meno)
  co2SavedTons: number;
  wastedPixelsPercent: number;
  rentalSavings24mEur: number;
  fleetMonitorExtraEur: number; // €/anno risparmiati applicando Fleet Monitor alla proposta
  fleetMonitorExtraPercent: number; // sulla stessa bolletta mostrata per la proposta (proposed.annualCostEur)
  fleetMonitorCostEur: number; // bolletta annua che resta con Fleet Monitor
  headline: string;
  reasons: string[];
}

function snapshotConfigurazione(
  pitchMm: number,
  nits: number,
  areaM2: number,
  apl: number,
  oreGiorno: number,
  tariffaEurKwh: number,
  catalogo: DatoCatalogo | null
): ConfigurazioneSnapshot {
  const hardware = stimaPotenzaDaPassoNit(pitchMm, nits, areaM2, tariffaEurKwh, oreGiorno, true, catalogo);
  const pStandby = standbyWmqPerPasso(pitchMm, catalogo?.tier);
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
  installHeightM: number,
  groundViewingDistM: number,
  screenHeightM: number,
  tier: TierId
): AlternativeProposal {
  const optical = calcolaConsulenzaOttica(installHeightM, groundViewingDistM, pitchMm, areaM2, nits, screenHeightM);
  const snapshot = (p: number) => snapshotConfigurazione(p, nits, areaM2, apl, oreGiorno, tariffaEurKwh, datoCatalogo(tier, p));
  const current = snapshot(pitchMm);
  const T = tierName(tier);

  // I DUE REQUISITI, entrambi vincolanti e calcolati sulla combinazione Selection × passo:
  // 1. Luminosità: il componente di QUELLA combinazione deve arrivare ai nit richiesti (dato di listino).
  //    Se il listino non ha il dato, la combinazione non è validabile: non è mai un sì.
  // 2. Distanza: il passo non deve essere così largo che l'occhio separa i diodi (oltre 1 arcminuto).
  const meetsDistance = (p: number) => !(p > optical.recommendedPitchMm + 0.15 && p > optical.minResolvablePitchMm);
  const validiIn = (t: TierId) => passiDelTier(t).filter((r) => nits <= r.maxNits && meetsDistance(r.pitchMm));

  const righeTier = passiDelTier(tier);
  const validi = validiIn(tier);
  const validPitchesMm = validi.map((r) => r.pitchMm);
  const datoCorrente = datoCatalogo(tier, pitchMm);
  const currentHasData = datoCorrente !== null;
  const currentMeetsBrightness = datoCorrente !== null && nits <= datoCorrente.maxNits;
  const currentMeetsDistance = meetsDistance(pitchMm);
  const currentIsValid = currentMeetsBrightness && currentMeetsDistance;

  const validInOtherTiers = TIERS.filter((t) => t.id !== tier)
    .map((t) => validiIn(t.id))
    .filter((r) => r.length > 0)
    .map((r) => r[r.length - 1]);

  const D = optical.lineOfSightDistM;
  const Dtxt = D.toLocaleString('it-IT');
  // 'always': in italiano i numeri a 4 cifre uscirebbero senza punto (8000 accanto a 12.000)
  const it = (v: number) => v.toLocaleString('it-IT', { useGrouping: 'always' } as Intl.NumberFormatOptions);
  const nitsTxt = it(nits);
  const tetto = (p: number) => {
    const d = datoCatalogo(tier, p);
    return d ? it(d.maxNits) : 'n.d.';
  };
  const pulitoDaM = (p: number) => Math.round(p / 0.291);

  let kind: AlternativeProposal['kind'] = 'none';
  let finalProposed = current;

  if (currentIsValid) {
    // Combinazione valida: si cerca solo un passo più largo, ANCH'ESSO valido nella stessa Selection, che consumi meno
    const cheaper = validPitchesMm
      .filter((p) => p > pitchMm + 0.05 && p <= optical.recommendedPitchMm + 0.15)
      .map(snapshot)
      .filter((c) => c.annualCostEur < current.annualCostEur);
    if (cheaper.length > 0) {
      kind = 'pitch';
      finalProposed = cheaper[cheaper.length - 1];
    }
  } else if (validPitchesMm.length > 0) {
    // Non valida, ma nella Selection esiste chi soddisfa entrambi i requisiti: il passo più largo, che consuma meno
    kind = !currentHasData ? 'nodata' : currentMeetsBrightness ? 'coarse' : 'brightness';
    finalProposed = snapshot(Math.max(...validPitchesMm));
  } else if (!currentHasData) {
    kind = 'nodata';
  } else {
    // Nessun passo della Selection soddisfa insieme nit e distanza. Compromesso più vicino: si tiene la
    // luminosità (sotto il sole un contenuto che non si legge non serve) con il passo più fitto che ci
    // arriva; se nessuno ci arriva, quello con il tetto più alto. Sempre e solo combinazioni a listino.
    kind = 'compromise';
    const bright = righeTier.filter((r) => nits <= r.maxNits);
    const compromise =
      bright.length > 0 ? bright[0] : righeTier.reduce((best, r) => (r.maxNits > best.maxNits ? r : best));
    finalProposed = stessoPasso(compromise.pitchMm, pitchMm) ? current : snapshot(compromise.pitchMm);
  }

  const proposedPitch = finalProposed.pitchMm;
  const savingsEur = Math.max(0, current.annualCostEur - finalProposed.annualCostEur);
  const extraCostEur = Math.max(0, finalProposed.annualCostEur - current.annualCostEur);
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
    standbyWmqPerPasso(finalProposed.pitchMm, tier)
  );
  // Il risparmio si misura sulla bolletta che l'utente vede per quella configurazione (già con dimming
  // notturno CEI), non sullo scenario "non gestito" di confrontaScenari: altrimenti percentuale e importi
  // non tornano tra loro.
  const fleetMonitorCostEur = Math.min(finalProposed.annualCostEur, Math.round(fleet.annualCostEurB));
  const fleetMonitorExtraEur = finalProposed.annualCostEur - fleetMonitorCostEur;
  const fleetMonitorExtraPercent =
    finalProposed.annualCostEur > 0 ? Math.round((fleetMonitorExtraEur / finalProposed.annualCostEur) * 100) : 0;

  const altreSelection = validInOtherTiers
    .map((r) => `${tierName(r.tier)} P${r.pitchMm} (${it(r.maxNits)} nit)`)
    .join(', ');

  const reasons: string[] = [];
  let headline = '';

  if (kind === 'pitch') {
    headline = `Ti consigliamo il P${proposedPitch} mm ${T}: -${savingsPercent}% di consumi a parità di qualità percepita a ${Dtxt} m.`;
    reasons.push(
      `A ${Dtxt} m di linea di vista l'occhio fonde i pixel già dal P${optical.recommendedPitchMm} mm: il P${pitchMm} spende il ${optical.wastedPixelsPercent}% dei pixel in dettaglio non visibile.`
    );
    reasons.push(
      `Il P${proposedPitch} ${T} arriva a ${tetto(proposedPitch)} nit: copre i ${nitsTxt} richiesti con i chip al ${finalProposed.hardware.sforzoPercent}% di sforzo (oggi ${current.hardware.sforzoPercent}%).`
    );
    reasons.push(
      `Potenza media reale con il tuo contenuto: da ${current.pMedioWmq} a ${finalProposed.pMedioWmq} W/m².`
    );
  } else if (kind === 'nodata') {
    headline = `Dato non disponibile per il P${pitchMm} mm ${T}: il listino non ha il tetto di nit di questa combinazione, quindi non possiamo dirti se regge ${nitsTxt} nit.`;
    reasons.push(
      `Non usiamo il valore di un'altra Selection o di un altro passo: il tetto dipende dal chip reale montato su quella combinazione.`
    );
    reasons.push(
      righeTier.length > 0
        ? `In ${T} il listino copre con dati certi: ${righeTier.map((r) => `P${r.pitchMm}`).join(', ')}.`
        : `Per la Selection ${T} il listino non ha ancora nessun dato outdoor.`
    );
    if (validPitchesMm.length > 0) {
      reasons.push(`Con dati certi, a ${nitsTxt} nit e ${Dtxt} m in ${T} torna tutto sul P${proposedPitch} (tetto ${tetto(proposedPitch)} nit).`);
    } else if (altreSelection) {
      reasons.push(`A ${nitsTxt} nit e ${Dtxt} m i requisiti tornano in: ${altreSelection}.`);
    }
  } else if (kind === 'brightness') {
    headline = `Il P${pitchMm} mm ${T} non esiste a ${nitsTxt} nit: si ferma a ${tetto(pitchMm)}. Per questa luminosità a ${Dtxt} m, in ${T} serve il P${proposedPitch} mm.`;
    reasons.push(`Tetto di listino del P${pitchMm} ${T}: ${tetto(pitchMm)} nit (${current.hardware.tecnologiaChip}).`);
    reasons.push(
      `Il P${proposedPitch} ${T} arriva a ${tetto(proposedPitch)} nit e a ${Dtxt} m resta pulito: soddisfa insieme luminosità e distanza di visione.`
    );
    if (!currentMeetsDistance) {
      reasons.push(`Il P${pitchMm} a ${Dtxt} m è anche troppo largo: la trama dei pixel si vede.`);
    }
    reasons.push(`Sforzo dei chip a ${nitsTxt} nit sul P${proposedPitch} ${T}: ${finalProposed.hardware.sforzoPercent}% del suo tetto.`);
  } else if (kind === 'coarse') {
    const pixelRatio = Math.round(Math.pow(pitchMm / proposedPitch, 2) * 10) / 10;
    headline = `A ${Dtxt} m il P${pitchMm} mm è troppo largo: la trama dei pixel si vede. Per un'immagine piena, in ${T} serve il P${proposedPitch} mm.`;
    reasons.push(
      `A ${Dtxt} m l'occhio distingue i singoli diodi sopra i ${optical.minResolvablePitchMm.toLocaleString('it-IT')} mm di passo (1 arcminuto): con il P${pitchMm} testi e volti risultano sgranati.`
    );
    reasons.push(
      `Il P${proposedPitch} ${T} porta ${pixelRatio.toLocaleString('it-IT')}× più pixel sulla stessa superficie e arriva a ${tetto(proposedPitch)} nit: copre anche i ${nitsTxt} richiesti.`
    );
    reasons.push(
      extraCostEur > 0
        ? `Il P${pitchMm} consuma meno (${current.pMedioWmq} contro ${finalProposed.pMedioWmq} W/m²), ma il risparmio si paga in qualità. Il P${pitchMm} torna corretto da circa ${pulitoDaM(pitchMm)} m in su.`
        : `Il P${pitchMm} torna corretto da circa ${pulitoDaM(pitchMm)} m in su.`
    );
  } else if (kind === 'compromise') {
    const puliti = righeTier.filter((r) => meetsDistance(r.pitchMm));
    const widestClean = puliti.length > 0 ? puliti[puliti.length - 1] : null;
    const proposedDato = datoCatalogo(tier, proposedPitch);
    const arriva = proposedDato !== null && nits <= proposedDato.maxNits;
    headline = `Nessun passo disponibile in ${T} soddisfa entrambi i requisiti: ${nitsTxt} nit e immagine pulita a ${Dtxt} m.`;
    reasons.push(
      arriva
        ? `In ${T}, per ${nitsTxt} nit serve almeno il P${proposedPitch} (tetto ${tetto(proposedPitch)} nit): i passi più fitti si fermano prima${widestClean ? `, il P${widestClean.pitchMm} a ${it(widestClean.maxNits)} nit` : ''}.`
        : `Nessun passo ${T} arriva a ${nitsTxt} nit: il tetto più alto della Selection è il P${proposedPitch} con ${tetto(proposedPitch)} nit.`
    );
    if (!meetsDistance(proposedPitch)) {
      reasons.push(
        `A ${Dtxt} m l'immagine resta pulita solo fino al P${widestClean ? widestClean.pitchMm : optical.recommendedPitchMm}: il P${proposedPitch} mostra la trama dei pixel e torna pulito da circa ${pulitoDaM(proposedPitch)} m.`
      );
    }
    reasons.push(
      `Compromesso più vicino in ${T}: P${proposedPitch} a ${it(Math.min(nits, proposedDato ? proposedDato.maxNits : nits))} nit${arriva ? ', luminosità piena ma trama visibile da vicino' : ', il massimo che la Selection eroga'}.${widestClean && !stessoPasso(widestClean.pitchMm, proposedPitch) ? ` L'alternativa è il P${widestClean.pitchMm} a ${it(Math.min(nits, widestClean.maxNits))} nit: immagine pulita, ma sotto il sole diretto rende meno.` : ''}`
    );
    reasons.push(
      altreSelection
        ? `Entrambi i requisiti tornano cambiando Selection: ${altreSelection}.`
        : 'In nessuna Selection a listino tornano entrambi: va allontanato il punto di visione oppure abbassati i nit richiesti.'
    );
  } else if (fleetMonitorExtraEur > 0) {
    kind = 'fleet';
    headline = `Il P${pitchMm} mm ${T} è già il passo giusto per ${Dtxt} m e ${nitsTxt} nit: il margine è nella gestione. Fleet Monitor taglia un altro ${fleetMonitorExtraPercent}% di bolletta.`;
    reasons.push(`Tetto di listino del P${pitchMm} ${T}: ${tetto(pitchMm)} nit (${current.hardware.tecnologiaChip}). Chip al ${current.hardware.sforzoPercent}% di sforzo.`);
    reasons.push('Sensore lux e dimming adattivo: luminosità diurna tarata sull\'ambiente, non fissa al 100%.');
    reasons.push('Dimming notturno al 10% (CEI) e relè di standby a 0 W/m² a schermo spento.');
  } else {
    headline = `Configurazione bilanciata: il P${pitchMm} mm ${T} a ${nitsTxt} nit è coerente con ${Dtxt} m di distanza.`;
  }

  const isPitchSaving = kind === 'pitch';
  return {
    hasAlternative: kind !== 'none',
    kind,
    tier,
    currentHasData,
    currentMaxNits: datoCorrente ? datoCorrente.maxNits : null,
    validInOtherTiers,
    currentIsValid,
    currentMeetsBrightness,
    currentMeetsDistance,
    validPitchesMm,
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
    wastedPixelsPercent: isPitchSaving ? optical.wastedPixelsPercent : 0,
    rentalSavings24mEur: isPitchSaving ? optical.monthlyRentalSavingsEur * 24 : 0,
    fleetMonitorExtraEur,
    fleetMonitorExtraPercent,
    fleetMonitorCostEur,
    headline,
    reasons,
  };
}
