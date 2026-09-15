'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useSimulatorStore } from '../../store/useSimulatorStore';
import { ArrowRight, BarChart3, ShieldCheck } from 'lucide-react';

export const S0Landing: React.FC = () => {
  const { setStep } = useSimulatorStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full text-center space-y-8 py-8"
    >
      <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#0D2818] border border-[#163826] text-xs font-medium text-[#34D399]">
        <ShieldCheck className="w-3.5 h-3.5 text-[#12B76A]" />
        <span>Standard di Calcolo Energetico · CEI 64-8</span>
      </div>

      <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-white max-w-3xl mx-auto leading-tight">
        Simulatore Energetico LEDwall Outdoor
      </h1>

      <p className="text-[#9AA3AD] max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
        Calcola con precisione ingegneristica i costi energetici reali di un impianto display outdoor e scopri come abbattere <strong className="text-white font-semibold">oltre il 50%</strong> della bolletta con la gestione fotometrica dinamica <strong className="text-white font-semibold">Fleet Monitor VeroLED</strong>.
      </p>

      <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="w-full sm:w-auto px-6 py-3 rounded-lg font-semibold text-white bg-[#12B76A] hover:bg-[#0E9F5D] transition-colors shadow-sm text-sm flex items-center justify-center space-x-2 cursor-pointer"
        >
          <span>Avvia Calcolo Impianto</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setStep(7)}
          className="w-full sm:w-auto px-5 py-3 rounded-lg font-semibold text-[#E8EDF2] bg-[#10141D] border border-[#1A2028] hover:bg-[#161F30] hover:border-[#2D3748] transition-colors text-sm flex items-center justify-center space-x-2 cursor-pointer"
        >
          <BarChart3 className="w-4 h-4 text-[#9AA3AD]" />
          <span>Dashboard Realtime</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-8 max-w-4xl mx-auto text-left">
        <div className="bg-[#0D1117] p-4 rounded-lg border border-[#1A2028] shadow-sm">
          <div className="text-xs font-medium text-[#868D97]">Modello Fisico APL</div>
          <div className="text-sm font-semibold text-white mt-1">Conforme ITU-R BT.709</div>
        </div>
        <div className="bg-[#0D1117] p-4 rounded-lg border border-[#1A2028] shadow-sm">
          <div className="text-xs font-medium text-[#868D97]">Dimming Notturno</div>
          <div className="text-sm font-semibold text-[#12B76A] mt-1">-86% carico notturno</div>
        </div>
        <div className="bg-[#0D1117] p-4 rounded-lg border border-[#1A2028] shadow-sm">
          <div className="text-xs font-medium text-[#868D97]">Standby Elettromeccanico</div>
          <div className="text-sm font-semibold text-white mt-1">Relè bistabile 0 W/m²</div>
        </div>
        <div className="bg-[#0D1117] p-4 rounded-lg border border-[#1A2028] shadow-sm">
          <div className="text-xs font-medium text-[#868D97]">Tempo di Calcolo</div>
          <div className="text-sm font-semibold text-white mt-1">Immediato &amp; Dinamico</div>
        </div>
      </div>
    </motion.div>
  );
};
