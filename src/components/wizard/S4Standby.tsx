'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useSimulatorStore, useSimulatorComputed } from '../../store/useSimulatorStore';
import { AlertCircle, ArrowRight } from 'lucide-react';

export const S4Standby: React.FC = () => {
  const { hasStandby, setHasStandby, nextStep } = useSimulatorStore();
  const { dimensions } = useSimulatorComputed();

  const annualStandbyKwh = (((50 * dimensions.areaM2) / 1000) * 6 * 365).toFixed(0);
  const annualStandbyEur = (((50 * dimensions.areaM2) / 1000) * 6 * 365 * 0.35).toFixed(0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="w-full max-w-4xl space-y-6"
    >
      <div className="text-center space-y-2">
        <span className="text-xs font-semibold text-[#12B76A] tracking-wider uppercase">
          Fase 4 di 9 · Elettronica di Potenza
        </span>
        <h2 className="text-2xl md:text-3xl font-semibold text-white">
          Lo schermo resta alimentato anche quando è spento?
        </h2>
        <p className="text-sm text-[#9AA3AD] max-w-2xl mx-auto">
          A display oscurato via software (scheduler o media player), l&apos;elettronica interna e gli alimentatori continuano ad assorbire energia passiva.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Option Yes: 50 W/m² */}
        <div
          onClick={() => setHasStandby(true)}
          className={`p-6 rounded-xl cursor-pointer border transition-colors space-y-3 shadow-sm ${
            hasStandby
              ? 'border-[#F04438] bg-[#2A1215]'
              : 'border-[#1A2028] bg-[#0D1117] hover:border-[#2D3748]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white text-base">SÌ: Resta in Standby</span>
            <span className="text-xs font-semibold text-[#F87171] bg-[#4E1D24] px-2.5 py-0.5 rounded">
              50 W/m² fisso
            </span>
          </div>
          <p className="text-xs text-[#9AA3AD] leading-relaxed">
            Comportamento standard del 90% degli schermi LED sul mercato. Il pannello è oscurato ma le schede riceventi e gli alimentatori restano sotto tensione H24.
          </p>
        </div>

        {/* Option No: 0 W/m² */}
        <div
          onClick={() => setHasStandby(false)}
          className={`p-6 rounded-xl cursor-pointer border transition-colors space-y-3 shadow-sm ${
            !hasStandby
              ? 'border-[#12B76A] bg-[#0D2818]'
              : 'border-[#1A2028] bg-[#0D1117] hover:border-[#2D3748]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white text-base">NO: Spegnimento Relè</span>
            <span className="text-xs font-semibold text-[#34D399] bg-[#163826] px-2.5 py-0.5 rounded">
              0 W/m²
            </span>
          </div>
          <p className="text-xs text-[#9AA3AD] leading-relaxed">
            Sezionamento totale della linea trifase/monofase con teleruttore o gestione Fleet Monitor VeroLED: azzera i consumi passivi a display spento.
          </p>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-[#0D1117] border border-[#1A2028] text-xs text-[#9AA3AD] flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#9AA3AD] mt-0.5" />
        <div className="leading-relaxed">
          Sul tuo schermo ({dimensions.areaM2.toFixed(1)} m²), 50 W/m² in standby per 6 ore notturne equivalgono a circa{' '}
          <strong className="text-white font-semibold tabular-nums">{annualStandbyKwh} kWh sprecati all&apos;anno</strong> (~
          <span className="tabular-nums font-semibold text-white">{annualStandbyEur} €/anno</span> a schermo spento).
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={nextStep}
          className="px-6 py-2.5 rounded-lg bg-[#12B76A] hover:bg-[#0E9F5D] text-white font-semibold text-xs tracking-wider flex items-center space-x-2 transition-colors shadow-sm cursor-pointer"
        >
          <span>Continua al Dimming Notturno</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};
