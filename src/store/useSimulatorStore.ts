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
  ScreenDimensions,
  DailyEnergyProfile,
  ScenarioResult,
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
      modulesW: 6,
      modulesH: 4,
      pitchMm: 3.9,

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

      setStep: (step) => set({ currentStep: Math.max(0, Math.min(9, step)) }),
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
      setModulesW: (modulesW) => set({ modulesW: Math.max(1, Math.min(30, modulesW)) }),
      setModulesH: (modulesH) => set({ modulesH: Math.max(1, Math.min(20, modulesH)) }),
      setPitchMm: (pitchMm) => set({ pitchMm }),

      setDimensioniMetri: (baseM, altezzaM) => {
        const state = get();
        const format = CABINET_FORMATS.find((f) => f.id === state.formatId) || CABINET_FORMATS[0];
        const cabWM = format.widthMm / 1000;
        const cabHM = format.heightMm / 1000;
        const w = Math.max(1, Math.round(baseM / cabWM));
        const h = Math.max(1, Math.round(altezzaM / cabHM));
        set({ modulesW: w, modulesH: h });
      },

      setRisoluzionePx: (resX, resY) => {
        const state = get();
        const format = CABINET_FORMATS.find((f) => f.id === state.formatId) || CABINET_FORMATS[0];
        const baseM = (resX * state.pitchMm) / 1000;
        const altezzaM = (resY * state.pitchMm) / 1000;
        const cabWM = format.widthMm / 1000;
        const cabHM = format.heightMm / 1000;
        const w = Math.max(1, Math.round(baseM / cabWM));
        const h = Math.max(1, Math.round(altezzaM / cabHM));
        set({ modulesW: w, modulesH: h });
      },

      setAplPercent: (aplPercent, aplSource = 'manual', videoFileName) =>
        set({
          aplPercent: Math.max(5, Math.min(100, Math.round(aplPercent))),
          aplSource,
          videoFileName: videoFileName ?? get().videoFileName,
        }),

      setHasStandby: (hasStandby) =>
        set({
          hasStandby,
          pStandbyWmq: hasStandby ? CONFIG.P_STANDBY_DEFAULT : 0,
        }),

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
          pitchMm: 3.9,
          aplSource: 'manual',
          aplPercent: CONFIG.DEFAULT_APL_PERCENT,
          videoFileName: undefined,
          hasStandby: true,
          pStandbyWmq: CONFIG.P_STANDBY_DEFAULT,
          hasNightDimming: true,
          nightDimmingPercent: CONFIG.DEFAULT_NIGHT_DIMMING_PERCENT,
          operatingHoursDay: CONFIG.DEFAULT_OPERATING_HOURS_DAY,
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
        currentStep: s.currentStep,
        dataSource: s.dataSource,
        formatId: s.formatId,
        modulesW: s.modulesW,
        modulesH: s.modulesH,
        pitchMm: s.pitchMm,
        aplPercent: s.aplPercent,
        hasStandby: s.hasStandby,
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

  const pMax = state.datiSchedaTecnica?.pMaxWmq?.valore ?? CONFIG.P_MAX_DEFAULT;

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
    state.pStandbyWmq
  );

  const scenario: ScenarioResult = confrontaScenari(
    dimensions.areaM2,
    state.aplPercent / 100,
    state.operatingHoursDay,
    state.tariffEurKwh,
    state.fleetOptions,
    pMax,
    state.pStandbyWmq
  );

  const instantaneousPowerKw = (profile.dayPowerWmq * dimensions.areaM2) / 1000;
  const maxNominalPowerKw = (pMax * dimensions.areaM2) / 1000;

  return {
    dimensions,
    profile,
    scenario,
    format,
    instantaneousPowerKw,
    maxNominalPowerKw,
    pMax,
  };
}
