'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { WizardHeader } from '../components/wizard/WizardHeader';

import { S0Landing } from '../components/wizard/S0Landing';
import { S1DataSource } from '../components/wizard/S1DataSource';
import { S2Dimensions } from '../components/wizard/S2Dimensions';
import { S2Interno } from '../components/wizard/S2Interno';
import { S3AplEngine } from '../components/wizard/S3AplEngine';
import { S4Standby } from '../components/wizard/S4Standby';
import { S5NightDimming } from '../components/wizard/S5NightDimming';
import { S6ScheduleTariff } from '../components/wizard/S6ScheduleTariff';
import { S7Dashboard } from '../components/wizard/S7Dashboard';
import { S8ScenarioComparison } from '../components/wizard/S8ScenarioComparison';
import { S9ReportExport } from '../components/wizard/S9ReportExport';

export function SimulatorWizard() {
  const {
    currentStep,
    ambiente,
    setAmbiente,
    setProdottoInterno,
    setNitInterno,
    setModulesW,
    setModulesH,
    setPitchMm,
    setAplPercent,
    setSchedule,
  } = useSimulatorStore();

  const [mounted, setMounted] = useState(false);

  // Evita hydration mismatch con localStorage e legge parametri URL su mount
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const w = params.get('w');
      const h = params.get('h');
      const p = params.get('p');
      const apl = params.get('apl');
      const hours = params.get('hours');
      const tariff = params.get('tariff');
      // il link del ramo interno (prima delle misure: cambiare ambiente reimposta griglia e orari)
      if (params.get('amb') === 'interno') {
        setAmbiente('interno');
        const mip = params.get('mip');
        if (mip === 'mip078' || mip === 'mip094') setProdottoInterno(mip);
        const nit = params.get('nit');
        if (nit) setNitInterno(parseInt(nit, 10));
      }

      if (w) setModulesW(parseInt(w, 10));
      if (h) setModulesH(parseInt(h, 10));
      if (p) setPitchMm(parseFloat(p));
      if (apl) setAplPercent(parseInt(apl, 10), 'manual');
      if (hours || tariff) {
        setSchedule(
          hours ? parseInt(hours, 10) : 18,
          tariff ? parseFloat(tariff) : 0.35
        );
      }
    }
  }, [setModulesW, setModulesH, setPitchMm, setAplPercent, setSchedule, setAmbiente, setProdottoInterno, setNitInterno]);

  if (!mounted) {
    return (
      // ⛔ L'export statico disegna solo questo ramo: il titolo deve starci, o l'HTML resta senza H1.
      <div className="min-h-screen bg-[var(--bg)] max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6">
        <h1 className="text-sm font-medium text-[var(--text)]">Simulatore consumi <span className="text-[var(--mute)]">· wizard completo</span></h1>
        <p className="mt-10 text-xs font-medium text-[var(--mute)]">Inizializzazione simulatore...</p>
      </div>
    );
  }

  const renderScreen = () => {
    switch (currentStep) {
      case 0:
        return <S0Landing key="s0" />;
      case 1:
        return <S1DataSource key="s1" />;
      case 2:
        // il ramo interno ha il suo dimensionamento (Titan Max MiP, cabinet 16:9)
        return ambiente === 'interno' ? <S2Interno key="s2i" /> : <S2Dimensions key="s2" />;
      case 3:
        return <S3AplEngine key="s3" />;
      case 4:
        return <S4Standby key="s4" />;
      case 5:
        return <S5NightDimming key="s5" />;
      case 6:
        return <S6ScheduleTariff key="s6" />;
      case 7:
        return <S7Dashboard key="s7" />;
      case 8:
        return <S8ScenarioComparison key="s8" />;
      case 9:
        return <S9ReportExport key="s9" />;
      default:
        return <S0Landing key="s0" />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[var(--bg)] selection:bg-[var(--text)] selection:text-[var(--bg)]">
      <WizardHeader />
      <main className="flex-grow max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col justify-center items-center">
        <AnimatePresence mode="wait">
          {renderScreen()}
        </AnimatePresence>
      </main>
    </div>
  );
}
