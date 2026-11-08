'use client';

import React from 'react';
import { useSimulatorStore } from '../../store/useSimulatorStore';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Zap } from 'lucide-react';

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
    <header className="sticky top-[56px] z-40 bg-[var(--s1)] border-b border-[var(--line)]">
      {/* Sotto la testata del sito (fissa, 56 px): la barra del wizard si ferma lì, non ci passa sotto. */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Il logo sta già nella testata del sito (08/11/2026): qui il titolo della pagina. */}
        <h1 className="min-w-0">
          <button type="button" onClick={() => setStep(0)} className="text-sm font-medium text-[var(--text)] cursor-pointer text-left">
            Simulatore consumi <span className="text-[var(--mute)]">· wizard completo</span>
          </button>
        </h1>

        {/* Navigation Controls (Indietro & Avanti solidi) */}
        <div className="flex items-center space-x-3">
          <Link
            href="/express"
            className="px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--s1)] text-xs font-semibold text-[var(--text)] hover:bg-[var(--s2)] transition-colors flex items-center space-x-1.5"
          >
            <Zap className="w-3.5 h-3.5 text-[var(--mute)]" />
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

        </div>
      </div>

      {/* I passi del wizard: il passo attivo sottolineato nel colore del testo */}
      <div className="bg-[var(--bg)] border-t border-[var(--line)] overflow-x-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-6 text-xs font-medium text-[var(--mute)]">
          {stepTitles.map((title, idx) => (
            <button
              key={idx}
              onClick={() => setStep(idx)}
              className={`py-2 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                currentStep === idx
                  ? 'border-[var(--text)] text-[var(--text)] font-semibold'
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
