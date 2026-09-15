'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { WizardHeader } from '../components/wizard/WizardHeader';
import { WizardFooter } from '../components/wizard/WizardFooter';

import { S0Landing } from '../components/wizard/S0Landing';
import { S1DataSource } from '../components/wizard/S1DataSource';
import { S2Dimensions } from '../components/wizard/S2Dimensions';
import { S3AplEngine } from '../components/wizard/S3AplEngine';
import { S4Standby } from '../components/wizard/S4Standby';
import { S5NightDimming } from '../components/wizard/S5NightDimming';
import { S6ScheduleTariff } from '../components/wizard/S6ScheduleTariff';
import { S7Dashboard } from '../components/wizard/S7Dashboard';
import { S8ScenarioComparison } from '../components/wizard/S8ScenarioComparison';
import { S9ReportExport } from '../components/wizard/S9ReportExport';

export default function Home() {
  const {
    currentStep,
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
  }, [setModulesW, setModulesH, setPitchMm, setAplPercent, setSchedule]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#07090C] flex items-center justify-center text-xs font-medium text-[#9AA3AD]">
        <span>Inizializzazione simulatore...</span>
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
        return <S2Dimensions key="s2" />;
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
    <div className="min-h-screen flex flex-col justify-between bg-[#07090C] selection:bg-[#12B76A] selection:text-[#07090C]">
      <WizardHeader />
      <main className="flex-grow max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col justify-center items-center">
        <AnimatePresence mode="wait">
          {renderScreen()}
        </AnimatePresence>
      </main>
      <WizardFooter />
    </div>
  );
}
