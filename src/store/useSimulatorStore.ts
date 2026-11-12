/**
 * Store Zustand globale reattivo con persistenza localStorage per LEDwall Energy Simulator
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CONFIG, CABINET_FORMATS, CabinetFormat } from '../config/config';
import {
  calcolaDimensioniSchermo,
  calcolaProfiloEnergetico,
  confrontaScenari,
  stimaPotenzaDaPassoNit,
  calcolaPowerQuality,
  calcolaConsulenzaOttica,
  suggerisciAlternativa,
  standbyWmqPerPasso,
  datoCatalogo,
  TierId,
  ScreenDimensions,
  DailyEnergyProfile,
  ScenarioResult,
  PowerQualityAnalysis,
  OpticalConsultingResult,
  AlternativeProposal,
} from '../core/physics';
import { DatiSchedaTecnica } from '../core/pdf-parser';
import {
  prodottoInterno, profiloInterno, confrontaScenariInterno, nitValidi as nitInterniValidi, wmqBianco, wmqNero,
  NIT_INTERNO, ORE_INTERNO_INIZIALI, type IdProdottoInterno, type ProdottoInterno,
} from '../core/interno';

export type Ambiente = 'esterno' | 'interno';

export interface SimulatorState {
  currentStep: number;
  /** Dove va lo schermo: il ramo «interno» usa le misure del Titan Max MiP (src/core/interno.ts). */
  ambiente: Ambiente;
  prodottoInterno: IdProdottoInterno;
  /** Luminanza d'esercizio in sala, in nit (interno). */
  nitInterno: number;
  dataSource: 'manual' | 'pdf';
  datiSchedaTecnica?: DatiSchedaTecnica | null;

  // S2: Dimensionamento
  sizingMode: 'cabinet' | 'dimensions' | 'resolution' | 'comparison';
  formatId: string;
  modulesW: number;
  modulesH: number;
  pitchMm: number;
  tier: TierId; // Selection VeroLED: il tetto di nit è della combinazione tier × passo
  /** Calcolo Express: false = schermata semplice sul LEDwall standard; true = modalità tecnica con tutti i controlli */
  expressTecnico: boolean;
  targetOutdoorNits: number; // Luminosità operativa outdoor di riferimento (standard 5.000 nit)
  installHeightM: number; // Quota installazione da terra (metri)
  groundViewingDistM: number; // Distanza osservatori su strada (metri)

  // S3: APL
  aplSource: 'manual' | 'video' | 'foto';
  aplPercent: number;
  videoFileName?: string;

  // S4: Standby
  hasStandby: boolean;
  pStandbyWmq: number;

  // S5: Dimming Notturno
  hasNightDimming: boolean;
  nightDimmingPercent: number;

  // S6: Orari & Tariffa
  operatingHoursDay: number;
  operatingDaysMonth: number;
  tariffEurKwh: number;
  tariffMode: 'single' | 'multitier';
  f1Rate: number;
  f2Rate: number;
  f3Rate: number;

  // S7: Live Tuning
  liveLumDiurna: number; // 0..100%

  // S8: Fleet Monitor Toggles
  fleetOptions: {
    dimmingAdattivo: boolean;
    dimmingNotturno: boolean;
    standbyZero: boolean;
    sensoreLux: boolean;
  };

  // S9: Lead Gen
  lead: {
    name: string;
    company: string;
    email: string;
    submitted: boolean;
  };

  // Actions
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setAmbiente: (a: Ambiente) => void;
  setProdottoInterno: (id: IdProdottoInterno) => void;
  setNitInterno: (nit: number) => void;
  setDataSource: (source: 'manual' | 'pdf') => void;
  setDatiSchedaTecnica: (dati: DatiSchedaTecnica | null) => void;
  setSizingMode: (mode: 'cabinet' | 'dimensions' | 'resolution' | 'comparison') => void;
  setFormatId: (id: string) => void;
  setModulesW: (w: number) => void;
  setModulesH: (h: number) => void;
  setPitchMm: (p: number) => void;
  setTier: (tier: TierId) => void;
  setExpressTecnico: (v: boolean) => void;
  setTargetOutdoorNits: (nits: number) => void;
  setInstallHeightM: (h: number) => void;
  setGroundViewingDistM: (d: number) => void;
  setDimensioniMetri: (baseM: number, altezzaM: number) => void;
  setRisoluzionePx: (resX: number, resY: number) => void;
  setAplPercent: (apl: number, source?: 'manual' | 'video' | 'foto', fileName?: string) => void;
  setHasStandby: (has: boolean) => void;
  setNightDimming: (has: boolean, pct?: number) => void;
  setSchedule: (hours: number, tariff?: number) => void;
  setTariffRate: (tariff: number) => void;
  setLiveLumDiurna: (lum: number) => void;
  toggleFleetOption: (key: keyof SimulatorState['fleetOptions']) => void;
  setLead: (lead: Partial<SimulatorState['lead']>) => void;
  resetToDefaults: () => void;
}

/**
 * Limiti di base e altezza, in metri (decisi dal titolare il 01/11/2026): coprono i nastri da stadio
 * fino a 100 m e oltre e i pali verticali fino a 40 m. Valgono per tutti i campi e per il calcolo:
 * prima l'Express diceva 40×20, il wizard 50×30, e il calcolo non ne applicava nessuno.
 */
export const BASE_MAX_M = 150;
export const ALTEZZA_MAX_M = 50;
const limita = (v: number, max: number) => Math.max(1, Math.min(max, Number.isFinite(v) ? v : 1));

export const useSimulatorStore = create<SimulatorState>()(
  persist(
    (set, get) => ({
      currentStep: 0,
      ambiente: 'esterno',
      prodottoInterno: 'mip094',
      nitInterno: NIT_INTERNO.iniziale,
      dataSource: 'manual',
      datiSchedaTecnica: null,

      sizingMode: 'cabinet',
      formatId: '1000x1000',
      modulesW: 5,
      modulesH: 3,
      pitchMm: 3.91,
      tier: 'bronze',
      expressTecnico: false,
      targetOutdoorNits: 4500, // nit di listino del LEDwall standard (Bronze P3.91)
      installHeightM: 5.0,
      groundViewingDistM: 10.0,

      aplSource: 'manual',
      aplPercent: CONFIG.DEFAULT_APL_PERCENT,
      videoFileName: undefined,

      hasStandby: true,
      pStandbyWmq: CONFIG.P_STANDBY_DEFAULT,

      hasNightDimming: true,
      nightDimmingPercent: CONFIG.DEFAULT_NIGHT_DIMMING_PERCENT,

      operatingHoursDay: CONFIG.DEFAULT_OPERATING_HOURS_DAY,
      operatingDaysMonth: CONFIG.DEFAULT_OPERATING_DAYS_MONTH,
      tariffEurKwh: CONFIG.DEFAULT_TARIFF_EUR_KWH,
      tariffMode: 'single',
      f1Rate: 0.40,
      f2Rate: 0.34,
      f3Rate: 0.28,

      liveLumDiurna: 100,

      fleetOptions: {
        dimmingAdattivo: true,
        dimmingNotturno: true,
        standbyZero: true,
        sensoreLux: true,
      },

      lead: {
        name: '',
        company: '',
        email: '',
        submitted: false,
      },

      setStep: (step) => set({ currentStep: step }),
      // in interno la fase 5 (riduzione notturna) non ha senso: non c'è notte da seguire, fuori orario c'è il relè
      nextStep: () => set((s) => {
        const n = Math.min(9, s.currentStep + 1);
        return { currentStep: s.ambiente === 'interno' && n === 5 ? 6 : n };
      }),
      prevStep: () => set((s) => {
        const n = Math.max(0, s.currentStep - 1);
        return { currentStep: s.ambiente === 'interno' && n === 5 ? 4 : n };
      }),

      setAmbiente: (ambiente) =>
        set((s) => {
          if (ambiente === s.ambiente) return {};
          if (ambiente === 'interno') {
            // in interno: niente scheda PDF da esterno, cabinet 16:9 del MiP, orari da negozio o sala
            const p = prodottoInterno(s.prodottoInterno);
            return {
              ambiente, dataSource: 'manual', datiSchedaTecnica: null, pitchMm: p.pitchMm,
              modulesW: 4, modulesH: 4, operatingHoursDay: ORE_INTERNO_INIZIALI, hasNightDimming: false,
            };
          }
          return {
            ambiente, pitchMm: 3.91, modulesW: 5, modulesH: 3,
            operatingHoursDay: CONFIG.DEFAULT_OPERATING_HOURS_DAY, hasNightDimming: true,
          };
        }),
      setProdottoInterno: (prodottoInternoId) =>
        set({ prodottoInterno: prodottoInternoId, pitchMm: prodottoInterno(prodottoInternoId).pitchMm }),
      setNitInterno: (nit) => set({ nitInterno: nitInterniValidi(nit) }),
      setDataSource: (dataSource) => set({ dataSource }),
      setDatiSchedaTecnica: (datiSchedaTecnica) => {
        if (!datiSchedaTecnica) {
          set({ datiSchedaTecnica: null });
          return;
        }
        set({
          datiSchedaTecnica,
          pitchMm: datiSchedaTecnica.pitchMm.valore,
          pStandbyWmq: datiSchedaTecnica.pStandbyWmq.valore,
        });
      },

      setSizingMode: (sizingMode) => set({ sizingMode }),
      setFormatId: (formatId) => set({ formatId }),
      setModulesW: (modulesW) => set({ modulesW: Math.max(1, modulesW) }),
      setModulesH: (modulesH) => set({ modulesH: Math.max(1, modulesH) }),
      setPitchMm: (pitchMm) => set({ pitchMm }),
      setTier: (tier) => set({ tier }),
      setExpressTecnico: (expressTecnico) => set({ expressTecnico }),
      setTargetOutdoorNits: (targetOutdoorNits) =>
        // fino a 20.000: è il tetto più alto a listino (Diamond P16); a 12.000 lo slider del P16 restava bloccato
        set({ targetOutdoorNits: Math.max(2500, Math.min(20000, targetOutdoorNits)) }),
      setInstallHeightM: (installHeightM) => set({ installHeightM: Math.max(0, installHeightM) }),
      setGroundViewingDistM: (groundViewingDistM) => set({ groundViewingDistM: Math.max(1, groundViewingDistM) }),

      setDimensioniMetri: (baseM, altezzaM) => {
        const s = get();
        const format = CABINET_FORMATS.find((f) => f.id === s.formatId) || CABINET_FORMATS[0];
        // Arrotondato per difetto al limite: un cabinet in più lo supererebbe
        const w = Math.max(1, Math.min(Math.floor((BASE_MAX_M * 1000) / format.widthMm), Math.round((limita(baseM, BASE_MAX_M) * 1000) / format.widthMm)));
        const h = Math.max(1, Math.min(Math.floor((ALTEZZA_MAX_M * 1000) / format.heightMm), Math.round((limita(altezzaM, ALTEZZA_MAX_M) * 1000) / format.heightMm)));
        set({ modulesW: w, modulesH: h });
      },

      setRisoluzionePx: (resX, resY) => {
        const s = get();
        const format = CABINET_FORMATS.find((f) => f.id === s.formatId) || CABINET_FORMATS[0];
        const pxW = format.widthMm / s.pitchMm;
        const pxH = format.heightMm / s.pitchMm;
        const w = Math.max(1, Math.min(Math.floor((BASE_MAX_M * 1000) / format.widthMm), Math.round(resX / pxW)));
        const h = Math.max(1, Math.min(Math.floor((ALTEZZA_MAX_M * 1000) / format.heightMm), Math.round(resY / pxH)));
        set({ modulesW: w, modulesH: h });
      },

      setAplPercent: (aplPercent, aplSource = 'manual', videoFileName) =>
        set({ aplPercent, aplSource, videoFileName }),

      setHasStandby: (hasStandby) => set({ hasStandby }),

      setNightDimming: (hasNightDimming, nightDimmingPercent) =>
        set((s) => ({
          hasNightDimming,
          nightDimmingPercent: nightDimmingPercent ?? s.nightDimmingPercent,
        })),

      setSchedule: (operatingHoursDay, tariffEurKwh) =>
        set((s) => ({
          operatingHoursDay: Math.max(1, Math.min(24, operatingHoursDay)),
          tariffEurKwh: tariffEurKwh ?? s.tariffEurKwh,
        })),

      setTariffRate: (tariffEurKwh) => set({ tariffEurKwh }),
      setLiveLumDiurna: (liveLumDiurna) => set({ liveLumDiurna: Math.max(10, Math.min(100, liveLumDiurna)) }),

      toggleFleetOption: (key) =>
        set((s) => ({
          fleetOptions: {
            ...s.fleetOptions,
            [key]: !s.fleetOptions[key],
          },
        })),

      setLead: (leadUpdate) =>
        set((s) => ({
          lead: { ...s.lead, ...leadUpdate },
        })),

      resetToDefaults: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('ledwall-energy-simulator-storage');
        }
        set({
          currentStep: 0,
          ambiente: 'esterno',
          prodottoInterno: 'mip094',
          nitInterno: NIT_INTERNO.iniziale,
          dataSource: 'manual',
          datiSchedaTecnica: null,
          sizingMode: 'cabinet',
          formatId: '1000x1000',
          modulesW: 5,
          modulesH: 3,
          pitchMm: 3.91,
      tier: 'bronze',
      expressTecnico: false,
          targetOutdoorNits: 4500, // nit di listino del LEDwall standard (Bronze P3.91)
          aplSource: 'manual',
          aplPercent: CONFIG.DEFAULT_APL_PERCENT,
          hasStandby: true,
          pStandbyWmq: CONFIG.P_STANDBY_DEFAULT,
          hasNightDimming: true,
          nightDimmingPercent: CONFIG.DEFAULT_NIGHT_DIMMING_PERCENT,
          operatingHoursDay: CONFIG.DEFAULT_OPERATING_HOURS_DAY,
          operatingDaysMonth: CONFIG.DEFAULT_OPERATING_DAYS_MONTH,
          tariffEurKwh: CONFIG.DEFAULT_TARIFF_EUR_KWH,
          liveLumDiurna: 100,
          fleetOptions: {
            dimmingAdattivo: true,
            dimmingNotturno: true,
            standbyZero: true,
            sensoreLux: true,
          },
          lead: {
            name: '',
            company: '',
            email: '',
            submitted: false,
          },
        });
      },
    }),
    {
      name: 'ledwall-energy-simulator-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        ambiente: s.ambiente,
        prodottoInterno: s.prodottoInterno,
        nitInterno: s.nitInterno,
        dataSource: s.dataSource,
        formatId: s.formatId,
        modulesW: s.modulesW,
        modulesH: s.modulesH,
        pitchMm: s.pitchMm,
        tier: s.tier,
        expressTecnico: s.expressTecnico,
        targetOutdoorNits: s.targetOutdoorNits,
        installHeightM: s.installHeightM,
        groundViewingDistM: s.groundViewingDistM,
        aplPercent: s.aplPercent,
        hasStandby: s.hasStandby,
        pStandbyWmq: s.pStandbyWmq,
        hasNightDimming: s.hasNightDimming,
        nightDimmingPercent: s.nightDimmingPercent,
        operatingHoursDay: s.operatingHoursDay,
        tariffEurKwh: s.tariffEurKwh,
        fleetOptions: s.fleetOptions,
      }),
    }
  )
);

// Helpers di calcolo selettivo (computed selectors)
export function useSimulatorComputed() {
  const state = useSimulatorStore();
  const interno = state.ambiente === 'interno';
  const prodotto: ProdottoInterno = prodottoInterno(state.prodottoInterno);
  const format: CabinetFormat = interno
    ? { id: '600x337.5', name: `600 × 337,5 mm (16:9, ${prodotto.nome})`, ...prodotto.cabinet }
    : CABINET_FORMATS.find((f) => f.id === state.formatId) || CABINET_FORMATS[0];

  // Calcolo potenza massima e standby reali basate sul passo pixel selezionato e luminosità target (5.000 nit)
  // Tetto di nit e sforzo dalla combinazione Selection × passo del listino (null = dato non disponibile)
  const tier: TierId = state.tier ?? 'bronze';
  const catalogo = datoCatalogo(tier, state.pitchMm);
  const hardwareEstimate = stimaPotenzaDaPassoNit(state.pitchMm, state.targetOutdoorNits || 5000, undefined, undefined, undefined, true, catalogo);
  const nitInterno = nitInterniValidi(state.nitInterno);
  // in interno: bianco pieno alla luminanza d'esercizio e schermo nero, dalle misure del MiP
  const pMax = interno ? wmqBianco(prodotto, nitInterno) : state.datiSchedaTecnica?.pMaxWmq?.valore ?? hardwareEstimate.pMaxWmq;
  const pStandby = interno ? wmqNero(prodotto) : state.datiSchedaTecnica?.pStandbyWmq?.valore ?? standbyWmqPerPasso(state.pitchMm, tier);

  const dimensions: ScreenDimensions = calcolaDimensioniSchermo(
    state.modulesW,
    state.modulesH,
    format.widthMm,
    format.heightMm,
    state.pitchMm,
    format.weightKg
  );
  dimensions.formatName = format.name;

  const profile: DailyEnergyProfile = interno
    ? profiloInterno(prodotto, dimensions.areaM2, state.aplPercent / 100, nitInterno, state.operatingHoursDay, state.hasStandby, state.tariffEurKwh)
    : calcolaProfiloEnergetico(
    dimensions.areaM2,
    state.aplPercent / 100,
    state.liveLumDiurna / 100,
    state.nightDimmingPercent / 100,
    state.operatingHoursDay,
    state.hasStandby,
    state.hasNightDimming,
    state.tariffEurKwh,
    pMax,
    pStandby
  );

  const scenario: ScenarioResult = interno
    ? confrontaScenariInterno(prodotto, dimensions.areaM2, state.aplPercent / 100, nitInterno, state.operatingHoursDay, state.tariffEurKwh, {
        dimmingAdattivo: state.fleetOptions.dimmingAdattivo,
        standbyZero: state.fleetOptions.standbyZero,
      })
    : confrontaScenari(
    dimensions.areaM2,
    state.aplPercent / 100,
    state.operatingHoursDay,
    state.tariffEurKwh,
    state.fleetOptions,
    pMax,
    pStandby
  );

  const instantaneousPowerKw = (profile.dayPowerWmq * dimensions.areaM2) / 1000;
  const maxNominalPowerKw = (pMax * dimensions.areaM2) / 1000;

  const isDiamond = state.pitchMm <= 2.9;
  const kwDiurnaA = (profile.dayPowerWmq * dimensions.areaM2) / 1000;
  // in interno il kW del pomeriggio con Fleet Monitor è quello della luminanza tarata, non un 55% di stima
  const kwDiurnaB = interno
    ? kwDiurnaA
    : kwDiurnaA * (state.fleetOptions.dimmingAdattivo ? 0.55 : 0.85);

  const powerQuality: PowerQualityAnalysis = calcolaPowerQuality(
    dimensions.totalCabinets,
    kwDiurnaA,
    kwDiurnaB,
    state.operatingHoursDay,
    isDiamond || state.fleetOptions.standbyZero
  );

  const opticalConsulting: OpticalConsultingResult = calcolaConsulenzaOttica(
    state.installHeightM ?? 5.0,
    state.groundViewingDistM ?? 10.0,
    state.pitchMm,
    dimensions.areaM2,
    state.targetOutdoorNits || 6000,
    dimensions.heightM,
    tier
  );

  const alternative: AlternativeProposal = suggerisciAlternativa(
    state.pitchMm,
    state.targetOutdoorNits || 5000,
    dimensions.areaM2,
    state.aplPercent / 100,
    state.operatingHoursDay,
    state.tariffEurKwh,
    state.installHeightM ?? 5.0,
    state.groundViewingDistM ?? 10.0,
    dimensions.heightM,
    tier
  );

  return {
    dimensions,
    profile,
    scenario,
    format,
    instantaneousPowerKw,
    maxNominalPowerKw,
    pMax,
    pStandby,
    powerQuality,
    opticalConsulting,
    alternative,
    isDiamond,
    interno,
    prodotto,
    nitInterno,
  };
}
