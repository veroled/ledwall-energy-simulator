'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useSimulatorStore, useSimulatorComputed } from '../../store/useSimulatorStore';
import { AlertCircle, ArrowRight } from 'lucide-react';

export const S4Standby: React.FC = () => {
  const { hasStandby, setHasStandby, nextStep, tariffEurKwh } = useSimulatorStore();
  const { dimensions, pStandby, profile, interno, prodotto } = useSimulatorComputed();

  // Standby, ore fuori orario e tariffa sono quelli della simulazione, non un 50 W/m² × 6 ore × 0,35 € scritto a mano
  const standbyWmq = Math.round(pStandby);
  const oreFuori = profile.nightHours;
  const annualStandbyKwh = (((pStandby * dimensions.areaM2) / 1000) * oreFuori * 365).toFixed(0);
  const annualStandbyEur = (((pStandby * dimensions.areaM2) / 1000) * oreFuori * 365 * tariffEurKwh).toFixed(0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="w-full max-w-4xl space-y-6"
    >
      <div className="text-center space-y-2">
        <span className="text-xs font-semibold text-[var(--ok)] tracking-wider uppercase">
          Fase 4 di 9 · Elettronica di Potenza
        </span>
        <h2 className="text-2xl md:text-3xl font-semibold text-white">
          Lo schermo resta alimentato anche quando è spento?
        </h2>
        <p className="text-sm text-[var(--mute)] max-w-2xl mx-auto">
          A display oscurato via software (scheduler o media player), l&apos;elettronica interna e gli alimentatori continuano ad assorbire energia passiva.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Option Yes: 50 W/m² */}
        <div
          onClick={() => setHasStandby(true)}
          className={`p-6 rounded-xl cursor-pointer border transition-colors space-y-3 shadow-sm ${
            hasStandby
              ? 'border-[var(--alarm)] bg-[rgb(var(--alarm-rgb)/12%)]'
              : 'border-[var(--line)] bg-[var(--s1)] hover:border-[var(--s3)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white text-base">SÌ: Resta in Standby</span>
            <span className="text-xs font-semibold text-[var(--alarm)] bg-[rgb(var(--alarm-rgb)/35%)] px-2.5 py-0.5 rounded">
              {standbyWmq} W/m² fisso
            </span>
          </div>
          <p className="text-xs text-[var(--mute)] leading-relaxed">
            {interno
              ? `Lo schermo è nero ma acceso: schede riceventi e alimentatori restano sotto tensione. Misurato da noi su ${prodotto.nome} ${prodotto.passoMisura}: ${prodotto.wNeroCabinet} W per cabinet da 600 × 337,5 mm.`
              : 'Comportamento standard del 90% degli schermi LED sul mercato. Il pannello è oscurato ma le schede riceventi e gli alimentatori restano sotto tensione H24.'}
          </p>
        </div>

        {/* Option No: 0 W/m² */}
        <div
          onClick={() => setHasStandby(false)}
          className={`p-6 rounded-xl cursor-pointer border transition-colors space-y-3 shadow-sm ${
            !hasStandby
              ? 'border-[var(--ok)] bg-[rgb(var(--ok-rgb)/10%)]'
              : 'border-[var(--line)] bg-[var(--s1)] hover:border-[var(--s3)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white text-base">NO: Spegnimento Relè</span>
            <span className="text-xs font-semibold text-[var(--ok)] bg-[rgb(var(--ok-rgb)/30%)] px-2.5 py-0.5 rounded">
              0 W/m²
            </span>
          </div>
          <p className="text-xs text-[var(--mute)] leading-relaxed">
            Sezionamento totale della linea trifase/monofase con teleruttore o gestione Fleet Monitor VeroLED: azzera i consumi passivi a display spento.
          </p>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-[var(--s1)] border border-[var(--line)] text-xs text-[var(--mute)] flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0 text-[var(--mute)] mt-0.5" />
        <div className="leading-relaxed">
          Sul tuo schermo ({dimensions.areaM2.toFixed(1)} m²), {standbyWmq} W/m² in standby per {oreFuori} ore {interno ? 'fuori orario' : 'notturne'} equivalgono a circa{' '}
          <strong className="text-white font-semibold tabular-nums">{annualStandbyKwh} kWh sprecati all&apos;anno</strong> (~
          <span className="tabular-nums font-semibold text-white">{annualStandbyEur} €/anno</span> a schermo spento).
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={nextStep}
          className="px-6 py-2.5 rounded-lg bg-[var(--pieno-fondo)] hover:bg-[var(--pieno-fondo-hover)] text-[var(--pieno-testo)] font-semibold text-xs tracking-wider flex items-center space-x-2 transition-colors shadow-sm cursor-pointer"
        >
          <span>{interno ? 'Continua a orari e tariffa' : 'Continua al Dimming Notturno'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};
