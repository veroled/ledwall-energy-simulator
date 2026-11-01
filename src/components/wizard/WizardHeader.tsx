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
    <header className="sticky top-0 z-50 bg-[var(--s1)] border-b border-[var(--line)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo Ufficiale VeroLED & Brand */}
        <div
          onClick={() => setStep(0)}
          className="flex items-center space-x-3 cursor-pointer select-none group"
        >
          <img
            src={asset('/brand/scritta-bianca.svg')}
            alt="VEROLED"
            className="h-6 w-auto object-contain select-none"
          />
          <span className="text-xs text-[var(--mute)] font-medium border-l border-[var(--line)] pl-3 hidden sm:inline-block">
            LEDwall Energy Simulator
          </span>
        </div>

        {/* Navigation Controls (Indietro & Avanti solidi) */}
        <div className="flex items-center space-x-3">
          <Link
            href="/express"
            className="px-3 py-1.5 rounded-lg border border-[rgb(var(--ok-rgb)/30%)] bg-[rgb(var(--ok-rgb)/10%)] text-xs font-semibold text-[var(--ok)] hover:bg-[rgb(var(--ok-rgb)/10%)] transition-colors flex items-center space-x-1.5"
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Express</span>
          </Link>
          {currentStep > 0 && (
            <button
              type="button"
              onClick={prevStep}
              className="px-3.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--s1)] text-xs font-semibold text-[var(--text)] hover:bg-[var(--s2)] hover:border-[var(--s3)] transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Indietro</span>
            </button>
          )}

          {currentStep > 0 && currentStep < 9 && (
            <button
              type="button"
              onClick={nextStep}
              className="px-4 py-1.5 rounded-lg bg-[var(--pieno-fondo)] hover:bg-[var(--pieno-fondo-hover)] text-[var(--pieno-testo)] font-semibold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <span>Avanti</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="px-2.5 py-1 rounded-full bg-[var(--s1)] border border-[var(--line)] text-xs font-medium text-[var(--mute)] hidden lg:flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--pieno-fondo)]"></span>
            <span>CEI 64-8 / Fleet Monitor PRO</span>
          </div>
        </div>
      </div>

      {/* Tab Wizard Navigation B2B: Sottolineatura verde 2px sul tab attivo */}
      <div className="bg-[var(--bg)] border-t border-[var(--line)] overflow-x-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-6 text-xs font-medium text-[var(--mute)]">
          {stepTitles.map((title, idx) => (
            <button
              key={idx}
              onClick={() => setStep(idx)}
              className={`py-2 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                currentStep === idx
                  ? 'border-[var(--ok)] text-white font-semibold'
                  : 'border-transparent hover:text-[var(--text)]'
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
