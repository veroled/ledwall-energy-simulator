'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useSimulatorStore, useSimulatorComputed } from '../../store/useSimulatorStore';
import { SavingsBreakdownChart } from '../charts/SavingsBreakdownChart';
import { CONFIG } from '../../config/config';
import { Check, X, ShieldCheck, ArrowRight } from 'lucide-react';

export const S8ScenarioComparison: React.FC = () => {
  const { fleetOptions, toggleFleetOption, nextStep, prevStep } = useSimulatorStore();
  const { scenario } = useSimulatorComputed();

  const isClaimVerified = scenario.savingsPercent >= CONFIG.CLAIM_SAVINGS_PERCENT;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="w-full max-w-5xl space-y-6"
    >
      <div className="text-center space-y-2">
        <span className="text-xs font-semibold text-[#12B76A] tracking-wider uppercase">
          Fase 8 di 9 · Benchmark Prestazionale
        </span>
        <h2 className="text-2xl md:text-3xl font-semibold text-white">
          Scenario A (Non Gestito) vs Scenario B (Fleet Monitor)
        </h2>
        <p className="text-sm text-[#9AA3AD] max-w-2xl mx-auto">
          Verifica l&apos;impatto economico immediato del controllo fotometrico intelligente sul bilancio di esercizio del maxischermo.
        </p>
      </div>

      {/* Claim Header Banner */}
      <div className="p-6 rounded-xl bg-[#0D1117] border border-[#163826] shadow-sm text-center space-y-2">
        <div className="flex items-center justify-center space-x-2 text-xs font-semibold text-[#34D399] uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-[#12B76A]" />
          <span>
            {isClaimVerified
              ? `Risparmio superiore al ${CONFIG.CLAIM_SAVINGS_PERCENT}% confermato`
              : 'Risparmio inferiore alla soglia ottimale (riattiva i controlli)'}
          </span>
        </div>

        <div className="text-3xl md:text-4xl font-semibold text-white tabular-nums tracking-tight">
          +{Math.round(scenario.savingsEur).toLocaleString('it-IT')} € / anno{' '}
          <span className="text-[#34D399]">(-{scenario.savingsPercent.toFixed(1)}%)</span>
        </div>

        <p className="text-xs text-[#9AA3AD] tabular-nums">
          Risparmio energetico: <strong className="text-white font-semibold">{Math.round(scenario.savingsKwh).toLocaleString('it-IT')} kWh/anno</strong> · Emissioni abbattute:{' '}
          <strong className="text-[#12B76A] font-semibold">{scenario.co2SavedTons.toFixed(1)} ton CO₂/anno</strong>
        </p>
      </div>

      {/* Two Comparative Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Scenario A: Non Gestito */}
        <div className="bg-[#0D1117] p-6 rounded-xl border border-[#4E1D24] shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#4E1D24] pb-2">
              <span className="font-semibold text-[#F87171] text-base">Scenario A: Non Gestito</span>
              <span className="text-xs text-[#868D97]">Standard mercato</span>
            </div>
            <ul className="text-xs text-[#9AA3AD] space-y-3">
              <li className="flex items-center space-x-2.5">
                <X className="w-4 h-4 flex-shrink-0 text-[#F87171]" />
                <span className="text-[#E8EDF2]">Luminosità fissa al 100% giorno e notte</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <X className="w-4 h-4 flex-shrink-0 text-[#F87171]" />
                <span className="text-[#E8EDF2]">Nessun sensore lux per adattamento ambientale</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <X className="w-4 h-4 flex-shrink-0 text-[#F87171]" />
                <span className="text-[#E8EDF2]">Standby passivo 50 W/m² H24 (spreco a display spento)</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <X className="w-4 h-4 flex-shrink-0 text-[#F87171]" />
                <span className="text-[#E8EDF2]">Alimentatori costantemente caldi ed usura accelerata LED</span>
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-[#4E1D24] flex justify-between items-baseline">
            <div>
              <span className="text-xs text-[#868D97] block font-medium">Costo Annuo Elettricità:</span>
              <span className="text-xs text-[#868D97] tabular-nums">
                {Math.round(scenario.annualKwhA).toLocaleString('it-IT')} kWh/anno
              </span>
            </div>
            <span className="text-2xl md:text-3xl font-semibold text-[#F87171] tabular-nums">
              {Math.round(scenario.annualCostEurA).toLocaleString('it-IT')} €
            </span>
          </div>
        </div>

        {/* Scenario B: Gestito Fleet Monitor */}
        <div className="bg-[#0D1117] p-6 rounded-xl border border-[#163826] shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#163826] pb-2">
              <span className="font-semibold text-[#34D399] text-base">Scenario B: Fleet Monitor</span>
              <span className="text-xs font-semibold text-[#34D399] bg-[#0D2818] border border-[#163826] px-2.5 py-0.5 rounded">
                VeroLED PRO
              </span>
            </div>

            {/* Interactive Toggles for Fleet Monitor features */}
            <div className="space-y-2 text-xs">
              <button
                type="button"
                onClick={() => toggleFleetOption('dimmingAdattivo')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-[#10141D] hover:bg-[#161F30] border border-[#1A2028] transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-[#12B76A]" />
                  <span className="text-[#E8EDF2] font-medium">Dimming Adattivo su APL</span>
                </div>
                <span className={`font-semibold ${fleetOptions.dimmingAdattivo ? 'text-[#34D399]' : 'text-[#868D97]'}`}>
                  {fleetOptions.dimmingAdattivo ? 'Attivo' : 'Escluso'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => toggleFleetOption('dimmingNotturno')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-[#10141D] hover:bg-[#161F30] border border-[#1A2028] transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-[#12B76A]" />
                  <span className="text-[#E8EDF2] font-medium">Dimming Notturno (10% CEI)</span>
                </div>
                <span className={`font-semibold ${fleetOptions.dimmingNotturno ? 'text-[#34D399]' : 'text-[#868D97]'}`}>
                  {fleetOptions.dimmingNotturno ? 'Attivo' : 'Escluso'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => toggleFleetOption('standbyZero')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-[#10141D] hover:bg-[#161F30] border border-[#1A2028] transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-[#12B76A]" />
                  <span className="text-[#E8EDF2] font-medium">Standby Notturno Zero (Relè Smart)</span>
                </div>
                <span className={`font-semibold ${fleetOptions.standbyZero ? 'text-[#34D399]' : 'text-[#868D97]'}`}>
                  {fleetOptions.standbyZero ? 'Attivo' : 'Escluso'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => toggleFleetOption('sensoreLux')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-[#10141D] hover:bg-[#161F30] border border-[#1A2028] transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-[#12B76A]" />
                  <span className="text-[#E8EDF2] font-medium">Sensore Lux Ambientale</span>
                </div>
                <span className={`font-semibold ${fleetOptions.sensoreLux ? 'text-[#34D399]' : 'text-[#868D97]'}`}>
                  {fleetOptions.sensoreLux ? 'Attivo' : 'Escluso'}
                </span>
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-[#163826] flex justify-between items-baseline">
            <div>
              <span className="text-xs text-[#868D97] block font-medium">Costo Annuo Ottimizzato:</span>
              <span className="text-xs text-[#34D399] tabular-nums">
                {Math.round(scenario.annualKwhB).toLocaleString('it-IT')} kWh/anno
              </span>
            </div>
            <span className="text-2xl md:text-3xl font-semibold text-[#12B76A] tabular-nums">
              {Math.round(scenario.annualCostEurB).toLocaleString('it-IT')} €
            </span>
          </div>
        </div>
      </div>

      {/* Breakdown Chart */}
      <SavingsBreakdownChart />

      {/* Visual Disclaimer */}
      <div className="p-3.5 rounded-xl bg-[#0D1117] border border-[#1A2028] text-xs text-[#868D97] text-center">
        Valori stimati a scopo dimostrativo secondo i modelli fisici CEI 64-8 e ITU-R BT.709. Il risparmio effettivo può variare in base alla tipologia di contenuti trasmessi.
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-2">
        <button
          type="button"
          onClick={prevStep}
          className="text-xs text-[#868D97] hover:text-white font-medium cursor-pointer"
        >
          ← Torna alla Dashboard
        </button>
        <button
          type="button"
          onClick={nextStep}
          className="px-6 py-2.5 rounded-lg bg-[#12B76A] hover:bg-[#0E9F5D] text-white font-semibold text-xs tracking-wider flex items-center space-x-2 transition-colors shadow-sm cursor-pointer"
        >
          <span>Continua ad Audit Energetico &amp; Report PDF</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};
