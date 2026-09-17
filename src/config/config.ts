/**
 * Configurazione ingegneristica e costanti fisiche per LEDwall Energy Simulator (VeroLED)
 */

export interface CabinetFormat {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  weightKg: number;
}

export const CABINET_FORMATS: CabinetFormat[] = [
  { id: '1000x1000', name: '1000 × 1000 mm (Standard Outdoor)', widthMm: 1000, heightMm: 1000, weightKg: 30 },
  { id: '500x1000', name: '500 × 1000 mm (Vertical Slim)', widthMm: 500, heightMm: 1000, weightKg: 15 },
  { id: '960x960', name: '960 × 960 mm (DOOH Commercial)', widthMm: 960, heightMm: 960, weightKg: 28 },
  { id: '1000x1500', name: '1000 × 1500 mm (Large Format)', widthMm: 1000, heightMm: 1500, weightKg: 45 },
];

export const PIXEL_PITCH_PRESETS: number[] = [2.6, 2.9, 3.9, 4.8, 6.7, 8.0, 10.0, 16.0];

export const CONFIG = {
  // Parametri fisici di default per display outdoor di massima qualità
  P_MAX_DEFAULT: 500, // W/m² (con bianco 255,255,255, APL=100%, L=100%)
  P_STANDBY_DEFAULT: 50, // W/m² (display spento via software, elettronica alimentata)
  POWER_SUPPLY_EFFICIENCY_DEFAULT: 0.90, // Efficienza media alimentatori switching (PFC attivo)

  // Target commerciale di risparmio garantito con Fleet Monitor VeroLED
  CLAIM_SAVINGS_PERCENT: 50, // % di risparmio minima attesa (Scenario B vs Scenario A)

  // Parametri di esercizio preimpostati
  DEFAULT_TARIFF_EUR_KWH: 0.35, // €/kWh (media mercato B2B Italia)
  DEFAULT_APL_PERCENT: 30, // 30% (standard pubblicitario DOOH)
  DEFAULT_OPERATING_HOURS_DAY: 18, // dalle 06:00 alle 24:00
  DEFAULT_OPERATING_DAYS_MONTH: 30,
  DEFAULT_NIGHT_DIMMING_PERCENT: 10, // 10% (norme CEI e anti-inquinamento luminoso)

  // Profilo "Massima Qualità" preimpostato (Zenit Series Outdoor Top di Gamma)
  TOP_QUALITY_PROFILE: {
    model: 'VeroLED Zenit Series P3.9 Outdoor',
    maxNits: 5000,
    pitch: 3.9,
    pMaxWmq: 500,
    pStandbyWmq: 50,
    ipRating: 'IP65',
    contrastRatio: '15000:1',
    refreshRateHz: 3840,
    driverIc: 'Macroblock MBI5153 High Refresh',
    warrantyYears: 8,
  },

  // Emissioni CO2 medie rete elettrica italiana (kg CO2 per kWh)
  CO2_FACTOR_KG_KWH: 0.305,
};
