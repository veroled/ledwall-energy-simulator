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
        <span className="text-xs font-semibold text-[var(--ok)] tracking-wider uppercase">
          Fase 5 di 9 · Comfort Visivo &amp; Notte
        </span>
        <h2 className="text-2xl md:text-3xl font-semibold text-white">
          Abbassi la luminosità nelle ore serali e notturne?
        </h2>
        <p className="text-sm text-[var(--mute)] max-w-2xl mx-auto">
          Di notte, 5.000 nit abbagliano e violano le normative sull&apos;inquinamento luminoso; basta il 10% per un contrasto nitido.
        </p>
      </div>

      <div className="bg-[var(--s1)] p-6 rounded-xl space-y-6 border border-[var(--line)] shadow-sm">
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setNightDimming(false)}
            className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
              !hasNightDimming
                ? 'border-[var(--alarm)] bg-[rgb(var(--alarm-rgb)/12%)]'
                : 'border-[var(--line)] bg-[var(--s1)] hover:border-[var(--s3)]'
            }`}
          >
            <div className="flex items-center space-x-2 text-white font-semibold text-sm">
              <Sun className="w-4 h-4 text-[var(--alarm)]" />
              <span>NO: Costante H24</span>
            </div>
            <div className="text-xs text-[var(--mute)] mt-1">Luminosità 100% sempre</div>
          </button>

          <button
            type="button"
            onClick={() => setNightDimming(true)}
            className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
              hasNightDimming
                ? 'border-[var(--ok)] bg-[rgb(var(--ok-rgb)/10%)]'
                : 'border-[var(--line)] bg-[var(--s1)] hover:border-[var(--s3)]'
            }`}
          >
            <div className="flex items-center space-x-2 text-[var(--ok)] font-semibold text-sm">
              <Moon className="w-4 h-4 text-[var(--ok)]" />
              <span>SÌ: Dimming Notturno</span>
            </div>
            <div className="text-xs text-[var(--mute)] mt-1">Sensore lux o programmato</div>
          </button>
        </div>

        {hasNightDimming ? (
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--mute)] font-semibold uppercase tracking-wide">
                Luminosità Notturna Impostata:
              </span>
              <span className="text-2xl font-semibold text-white tabular-nums">
                {nightDimmingPercent}%
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              value={nightDimmingPercent}
              onChange={(e) => setNightDimming(true, parseInt(e.target.value, 10))}
              className="w-full custom-slider cursor-pointer"
            />
            <div className="flex justify-between text-xs text-[var(--mute)] tabular-nums">
              <span>5% (Minimo CEI)</span>
              <span className="font-medium text-[var(--ok)]">10% (Consigliato VeroLED)</span>
              <span>50% (Troppo luminoso)</span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-[rgb(var(--alarm-rgb)/12%)] border border-[rgb(var(--alarm-rgb)/35%)] text-xs text-[var(--alarm)] flex items-start space-x-2.5">
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
          className="px-6 py-2.5 rounded-lg bg-[var(--pieno-fondo)] hover:bg-[var(--pieno-fondo-hover)] text-[var(--pieno-testo)] font-semibold text-xs tracking-wider flex items-center space-x-2 transition-colors shadow-sm cursor-pointer"
        >
          <span>Continua agli Orari e Tariffa</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};
