'use client';

import React from 'react';
import { useSimulatorStore } from '../../store/useSimulatorStore';
import { ArrowLeft, ArrowRight } from 'lucide-react';

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
    <header className="sticky top-0 z-50 bg-white border-b border-[#E4E7EC]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo Ufficiale VeroLED & Brand */}
        <div
          onClick={() => setStep(0)}
          className="flex items-center space-x-3 cursor-pointer select-none group"
        >
          <svg className="h-5 w-auto text-[#101828]" viewBox="0 0 841.89 133.42" fill="currentColor">
            <path d="M618.84 125.56h87.02v6.55h-87.02zM618.84 63.44h80.09v6.36h-80.09zM548.06 125.56-6.56 6.55h54.88v-6.55zM773.03 1.12h-36.49v6.36h36.49c34.99 0 61.19 21.15 61.19 59.13s-26.95 58.95-61.19 58.95h-29.94V74.1h-6.55v58.01h36.49c39.48 0 68.86-23.39 68.86-65.49s-29.56-65.5-68.86-65.5M618.84 1.12h85.89v6.55h-85.89zM427.03 0c-36.49 0-63.44 29.94-63.44 66.8s26.95 66.62 63.44 66.62 63.62-29.94 63.62-66.62S463.71 0 427.03 0m0 127.06c-32.94 0-56.33-27.13-56.33-60.26s23.39-60.26 56.33-60.26 56.51 26.95 56.51 60.26-23.39 60.26-56.51 60.26M341.14 132.11l-30.13-53.33c16.47-5.05 27.51-18.9 27.51-37.61 0-24.14-18.9-40.05-42.85-40.05h-46.78v6.55h46.78c20.4 0 35.93 12.54 35.93 33.5s-16.09 33.5-35.93 33.5h-46.78v57.45h6.36v-50.9h40.42c2.99 0 5.99-.38 8.8-.75l29.19 51.65h7.49ZM131.18 125.56v6.55h87.01v-6.55h-80.65V69.8h73.73v-6.36h-73.73V7.67h79.53V1.12h-85.89v124.44M0 1.12l35.37 92.44 7.3-19.08L15.16 1.12zM97.5 1.12 49.03 129.31l1.12 2.8H62.5L112.47 1.12zM517.78 1.12h6.55v130.99h-6.55z"/>
          </svg>
          <span className="text-xs text-[#667085] font-medium border-l border-[#E4E7EC] pl-3 hidden sm:inline-block">
            LEDwall Energy Simulator
          </span>
        </div>

        {/* Navigation Controls (Indietro & Avanti solidi) */}
        <div className="flex items-center space-x-3">
          {currentStep > 0 && (
            <button
              type="button"
              onClick={prevStep}
              className="px-3.5 py-1.5 rounded-lg border border-[#D0D5DD] text-xs font-semibold text-[#344054] hover:bg-[#F9FAFB] transition-colors flex items-center space-x-1 cursor-pointer"
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

          <div className="px-2.5 py-1 rounded-full bg-[#F7F8FA] border border-[#E4E7EC] text-xs font-medium text-[#344054] hidden lg:flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#12B76A]"></span>
            <span>CEI 64-8 / Fleet Monitor PRO</span>
          </div>
        </div>
      </div>

      {/* Tab Wizard Navigation B2B: Sottolineatura verde 2px sul tab attivo */}
      <div className="bg-[#F7F8FA] border-t border-[#E4E7EC] overflow-x-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-6 text-xs font-medium text-[#667085]">
          {stepTitles.map((title, idx) => (
            <button
              key={idx}
              onClick={() => setStep(idx)}
              className={`py-2 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                currentStep === idx
                  ? 'border-[#12B76A] text-[#101828] font-semibold'
                  : 'border-transparent hover:text-[#101828]'
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
