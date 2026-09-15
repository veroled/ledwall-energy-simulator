'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useSimulatorStore } from '../../store/useSimulatorStore';
import { Clock, Euro, ArrowRight } from 'lucide-react';

export const S6ScheduleTariff: React.FC = () => {
  const {
    operatingHoursDay,
    tariffEurKwh,
    setSchedule,
    setTariffRate,
    nextStep,
  } = useSimulatorStore();

  const [isCustomTariff, setIsCustomTariff] = useState(tariffEurKwh !== 0.35);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="w-full max-w-4xl space-y-6"
    >
      <div className="text-center space-y-2">
        <span className="text-xs font-semibold text-[#12B76A] tracking-wider uppercase">
          Fase 6 di 9 · Esercizio &amp; Tariffe
        </span>
        <h2 className="text-2xl md:text-3xl font-semibold text-[#101828]">
          Orari di accensione e tariffa energetica
        </h2>
        <p className="text-sm text-[#667085] max-w-2xl mx-auto">
          Imposta le ore di attività diurna del maxischermo e il costo di acquisto dell&apos;elettricità.
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl space-y-6 border border-[#E4E7EC] shadow-sm">
        {/* Ore di Accensione */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2 text-xs font-semibold text-[#667085] uppercase tracking-wide">
              <Clock className="w-4 h-4 text-[#12B76A]" />
              <span>Orario di Accensione Giornaliera:</span>
            </div>
            <span className="text-sm font-semibold text-[#101828] tabular-nums">
              06:00 → {String(6 + operatingHoursDay).padStart(2, '0')}:00 ({operatingHoursDay} ore/giorno)
            </span>
          </div>
          <input
            type="range"
            min="6"
            max="24"
            value={operatingHoursDay}
            onChange={(e) => setSchedule(parseInt(e.target.value, 10))}
            className="w-full b2b-slider cursor-pointer"
          />
          <div className="flex justify-between text-xs text-[#98A2B3] tabular-nums">
            <span>6h (Solo ore centrali)</span>
            <span className="font-medium text-[#101828]">18h (Standard DOOH 06–24)</span>
            <span>24h (Acceso non-stop)</span>
          </div>
        </div>

        {/* Tariffa Elettrica */}
        <div className="space-y-4 pt-4 border-t border-[#E4E7EC]">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2 text-xs font-semibold text-[#667085] uppercase tracking-wide">
              <Euro className="w-4 h-4 text-[#12B76A]" />
              <span>Tariffa Energia Elettrica (€/kWh):</span>
            </div>
            <span className="text-xl font-semibold text-[#101828] tabular-nums">
              {tariffEurKwh.toFixed(2)} €/kWh
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => {
                setIsCustomTariff(false);
                setTariffRate(0.35);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                !isCustomTariff && tariffEurKwh === 0.35
                  ? 'border-[#12B76A] bg-[#ECFDF3] text-[#027A48] font-semibold'
                  : 'border-[#E4E7EC] bg-white text-[#475467] hover:border-[#D0D5DD]'
              }`}
            >
              Conferma Standard: 0,35 €/kWh
            </button>

            <button
              type="button"
              onClick={() => setIsCustomTariff(true)}
              className={`px-4 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                isCustomTariff
                  ? 'border-[#12B76A] bg-[#ECFDF3] text-[#027A48] font-semibold'
                  : 'border-[#E4E7EC] bg-white text-[#475467] hover:border-[#D0D5DD]'
              }`}
            >
              Inserisco tariffa personalizzata
            </button>
          </div>

          {isCustomTariff && (
            <div className="space-y-2 pt-2">
              <input
                type="range"
                min="0.15"
                max="0.75"
                step="0.01"
                value={tariffEurKwh}
                onChange={(e) => setTariffRate(parseFloat(e.target.value))}
                className="w-full b2b-slider cursor-pointer"
              />
              <div className="flex justify-between text-xs text-[#98A2B3] tabular-nums">
                <span>0,15 € (Fornitura agevolata)</span>
                <span className="font-medium text-[#101828]">0,35 € (Media DOOH)</span>
                <span>0,75 € (Picco energetico)</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={nextStep}
          className="px-6 py-2.5 rounded-lg bg-[#12B76A] hover:bg-[#0E9F5D] text-white font-semibold text-xs tracking-wider flex items-center space-x-2 transition-colors shadow-sm cursor-pointer"
        >
          <span>Continua a Dashboard Realtime</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};
