'use client';

import React from 'react';
import { useSimulatorStore } from '../../store/useSimulatorStore';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Zap } from 'lucide-react';
import { asset } from '../../config/paths';

export const WizardHeader: React.FC = () => {
  const { currentStep, prevStep, nextStep, setStep } = useSimulatorStore();

  const stepTitles = [
    'Panoramica',
    'Fonte Dati',
    'Dimensioni & Cabinet',
    'APL & Video',
    'Standby Zero',
    'Dimming Notte',
    'Orari & Tariffa',
    'Dashboard Realtime',
    'Benchmark A vs B',
    'Report PDF',
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#0D1117] border-b border-[#1A2028]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo Ufficiale VeroLED & Brand */}
        <div
          onClick={() => setStep(0)}
          className="flex items-center space-x-3 cursor-pointer select-none group"
        >
          <img
            src={asset('/img/logo-veroled-white.png')}
            alt="VEROLED"
            className="h-6 w-auto object-contain select-none"
          />
          <span className="text-xs text-[#9AA3AD] font-medium border-l border-[#1A2028] pl-3 hidden sm:inline-block">
            LEDwall Energy Simulator
          </span>
        </div>

        {/* Navigation Controls (Indietro & Avanti solidi) */}
        <div className="flex items-center space-x-3">
          <Link
            href="/express"
            className="px-3 py-1.5 rounded-lg border border-[#163826] bg-[#0D2818] text-xs font-semibold text-[#34D399] hover:bg-[#133D24] transition-colors flex items-center space-x-1.5"
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Express</span>
          </Link>
          {currentStep > 0 && (
            <button
              type="button"
              onClick={prevStep}
              className="px-3.5 py-1.5 rounded-lg border border-[#1A2028] bg-[#10141D] text-xs font-semibold text-[#E8EDF2] hover:bg-[#161F30] hover:border-[#2D3748] transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Indietro</span>
            </button>
          )}

          {currentStep > 0 && currentStep < 9 && (
            <button
              type="button"
              onClick={nextStep}
              className="px-4 py-1.5 rounded-lg bg-[#12B76A] hover:bg-[#0E9F5D] text-white font-semibold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <span>Avanti</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="px-2.5 py-1 rounded-full bg-[#10141D] border border-[#1A2028] text-xs font-medium text-[#9AA3AD] hidden lg:flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#12B76A]"></span>
            <span>CEI 64-8 / Fleet Monitor PRO</span>
          </div>
        </div>
      </div>

      {/* Tab Wizard Navigation B2B: Sottolineatura verde 2px sul tab attivo */}
      <div className="bg-[#07090C] border-t border-[#1A2028] overflow-x-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-6 text-xs font-medium text-[#868D97]">
          {stepTitles.map((title, idx) => (
            <button
              key={idx}
              onClick={() => setStep(idx)}
              className={`py-2 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                currentStep === idx
                  ? 'border-[#12B76A] text-white font-semibold'
                  : 'border-transparent hover:text-[#E8EDF2]'
              }`}
            >
              {idx}. {title}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
