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

export interface SimulatorState {
  currentStep: number;
  dataSource: 'manual' | 'pdf';
  datiSchedaTecnica?: DatiSchedaTecnica | null;

  // S2: Dimensionamento
  sizingMode: 'cabinet' | 'dimensions' | 'resolution' | 'comparison';
  formatId: string;
  modulesW: number;
  modulesH: number;
  pitchMm: number;
  tier: TierId; // Selection VeroLED: il tetto di nit è della combinazione tier × passo
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
  setDataSource: (source: 'manual' | 'pdf') => void;
  setDatiSchedaTecnica: (dati: DatiSchedaTecnica | null) => void;
  setSizingMode: (mode: 'cabinet' | 'dimensions' | 'resolution' | 'comparison') => void;
  setFormatId: (id: string) => void;
  setModulesW: (w: number) => void;
  setModulesH: (h: number) => void;
  setPitchMm: (p: number) => void;
  setTier: (tier: TierId) => void;
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

export const useSimulatorStore = create<SimulatorState>()(
  persist(
    (set, get) => ({
      currentStep: 0,
      dataSource: 'manual',
      datiSchedaTecnica: null,

      sizingMode: 'cabinet',
      formatId: '1000x1000',
      modulesW: 5,
      modulesH: 3,
      pitchMm: 3.91,
      tier: 'gold',
      targetOutdoorNits: 5000,
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
      nextStep: () => set((s) => ({ currentStep: Math.min(9, s.currentStep + 1) })),
      prevStep: () => set((s) => ({ currentStep: Math.max(0, s.currentStep - 1) })),

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
      setTargetOutdoorNits: (targetOutdoorNits) =>
        set({ targetOutdoorNits: Math.max(2500, Math.min(12000, targetOutdoorNits)) }),
      setInstallHeightM: (installHeightM) => set({ installHeightM: Math.max(0, installHeightM) }),
      setGroundViewingDistM: (groundViewingDistM) => set({ groundViewingDistM: Math.max(1, groundViewingDistM) }),

      setDimensioniMetri: (baseM, altezzaM) => {
        const s = get();
        const format = CABINET_FORMATS.find((f) => f.id === s.formatId) || CABINET_FORMATS[0];
        const w = Math.max(1, Math.round((baseM * 1000) / format.widthMm));
        const h = Math.max(1, Math.round((altezzaM * 1000) / format.heightMm));
        set({ modulesW: w, modulesH: h });
      },

      setRisoluzionePx: (resX, resY) => {
        const s = get();
        const format = CABINET_FORMATS.find((f) => f.id === s.formatId) || CABINET_FORMATS[0];
        const pxW = format.widthMm / s.pitchMm;
        const pxH = format.heightMm / s.pitchMm;
        const w = Math.max(1, Math.round(resX / pxW));
        const h = Math.max(1, Math.round(resY / pxH));
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
          dataSource: 'manual',
          datiSchedaTecnica: null,
          sizingMode: 'cabinet',
          formatId: '1000x1000',
          modulesW: 5,
          modulesH: 3,
          pitchMm: 3.91,
      tier: 'gold',
          targetOutdoorNits: 5000,
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
        dataSource: s.dataSource,
        formatId: s.formatId,
        modulesW: s.modulesW,
        modulesH: s.modulesH,
        pitchMm: s.pitchMm,
        tier: s.tier,
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
  const format: CabinetFormat =
    CABINET_FORMATS.find((f) => f.id === state.formatId) || CABINET_FORMATS[0];

  // Calcolo potenza massima e standby reali basate sul passo pixel selezionato e luminosità target (5.000 nit)
  // Tetto di nit e sforzo dalla combinazione Selection × passo del listino (null = dato non disponibile)
  const tier: TierId = state.tier ?? 'gold';
  const catalogo = datoCatalogo(tier, state.pitchMm);
  const hardwareEstimate = stimaPotenzaDaPassoNit(state.pitchMm, state.targetOutdoorNits || 5000, undefined, undefined, undefined, true, catalogo);
  const pMax = state.datiSchedaTecnica?.pMaxWmq?.valore ?? hardwareEstimate.pMaxWmq;
  const pStandby = state.datiSchedaTecnica?.pStandbyWmq?.valore ?? standbyWmqPerPasso(state.pitchMm, tier);

  const dimensions: ScreenDimensions = calcolaDimensioniSchermo(
    state.modulesW,
    state.modulesH,
    format.widthMm,
    format.heightMm,
    state.pitchMm,
    format.weightKg
  );
  dimensions.formatName = format.name;

  const profile: DailyEnergyProfile = calcolaProfiloEnergetico(
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

  const scenario: ScenarioResult = confrontaScenari(
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
  const kwDiurnaB = kwDiurnaA * (state.fleetOptions.dimmingAdattivo ? 0.55 : 0.85);

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
    dimensions.heightM
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
  };
}
