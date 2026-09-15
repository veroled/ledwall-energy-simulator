'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useSimulatorStore } from '../../store/useSimulatorStore';
import { Moon, Sun, AlertTriangle, ArrowRight } from 'lucide-react';

export const S5NightDimming: React.FC = () => {
  const { hasNightDimming, nightDimmingPercent, setNightDimming, nextStep } = useSimulatorStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="w-full max-w-4xl space-y-6"
    >
      <div className="text-center space-y-2">
        <span className="text-xs font-semibold text-[#12B76A] tracking-wider uppercase">
          Fase 5 di 9 · Comfort Visivo &amp; Notte
        </span>
        <h2 className="text-2xl md:text-3xl font-semibold text-[#101828]">
          Abbassi la luminosità nelle ore serali e notturne?
        </h2>
        <p className="text-sm text-[#667085] max-w-2xl mx-auto">
          Di notte, 5.000 nit abbagliano e violano le normative sull&apos;inquinamento luminoso; basta il 10% per un contrasto nitido.
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl space-y-6 border border-[#E4E7EC] shadow-sm">
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setNightDimming(false)}
            className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
              !hasNightDimming
                ? 'border-[#F04438] bg-[#FEF3F2]'
                : 'border-[#E4E7EC] bg-white hover:border-[#D0D5DD]'
            }`}
          >
            <div className="flex items-center space-x-2 text-[#101828] font-semibold text-sm">
              <Sun className="w-4 h-4 text-[#F04438]" />
              <span>NO: Costante H24</span>
            </div>
            <div className="text-xs text-[#667085] mt-1">Luminosità 100% sempre</div>
          </button>

          <button
            type="button"
            onClick={() => setNightDimming(true)}
            className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
              hasNightDimming
                ? 'border-[#12B76A] bg-[#ECFDF3]'
                : 'border-[#E4E7EC] bg-white hover:border-[#D0D5DD]'
            }`}
          >
            <div className="flex items-center space-x-2 text-[#027A48] font-semibold text-sm">
              <Moon className="w-4 h-4 text-[#12B76A]" />
              <span>SÌ: Dimming Notturno</span>
            </div>
            <div className="text-xs text-[#667085] mt-1">Sensore lux o programmato</div>
          </button>
        </div>

        {hasNightDimming ? (
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#667085] font-semibold uppercase tracking-wide">
                Luminosità Notturna Impostata:
              </span>
              <span className="text-2xl font-semibold text-[#101828] tabular-nums">
                {nightDimmingPercent}%
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              value={nightDimmingPercent}
              onChange={(e) => setNightDimming(true, parseInt(e.target.value, 10))}
              className="w-full b2b-slider cursor-pointer"
            />
            <div className="flex justify-between text-xs text-[#98A2B3] tabular-nums">
              <span>5% (Minimo CEI)</span>
              <span className="font-medium text-[#12B76A]">10% (Consigliato VeroLED)</span>
              <span>50% (Troppo luminoso)</span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-[#FEF3F2] border border-[#FECDCA] text-xs text-[#B42318] flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              Attenzione: mantenere il 100% di notte raddoppia i costi elettrici, accelera il decadimento termico dei LED del 40% e rischia sanzioni per inquinamento visivo.
            </span>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={nextStep}
          className="px-6 py-2.5 rounded-lg bg-[#12B76A] hover:bg-[#0E9F5D] text-white font-semibold text-xs tracking-wider flex items-center space-x-2 transition-colors shadow-sm cursor-pointer"
        >
          <span>Continua a Orari e Tariffa</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};
