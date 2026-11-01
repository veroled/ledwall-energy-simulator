'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useSimulatorStore, useSimulatorComputed } from '../../store/useSimulatorStore';
import { SavingsBreakdownChart } from '../charts/SavingsBreakdownChart';
import { CONFIG } from '../../config/config';
import { Check, X, ShieldCheck, ArrowRight } from 'lucide-react';

export const S8ScenarioComparison: React.FC = () => {
  const { fleetOptions, toggleFleetOption, nextStep, prevStep } = useSimulatorStore();
  const { scenario, powerQuality } = useSimulatorComputed();

  const isClaimVerified = scenario.savingsPercent >= CONFIG.CLAIM_SAVINGS_PERCENT;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="w-full max-w-5xl space-y-6"
    >
      <div className="text-center space-y-2">
        <span className="text-xs font-semibold text-[var(--ok)] tracking-wider uppercase">
          Fase 8 di 9 · Benchmark Prestazionale
        </span>
        <h2 className="text-2xl md:text-3xl font-semibold text-white">
          Scenario A (Non Gestito) vs Scenario B (Fleet Monitor)
        </h2>
        <p className="text-sm text-[var(--mute)] max-w-2xl mx-auto">
          Verifica l&apos;impatto economico immediato del controllo fotometrico intelligente sul bilancio di esercizio del maxischermo.
        </p>
      </div>

      {/* Claim Header Banner */}
      <div className="p-6 rounded-xl bg-[var(--s1)] border border-[rgb(var(--ok-rgb)/30%)] shadow-sm text-center space-y-2">
        <div className="flex items-center justify-center space-x-2 text-xs font-semibold text-[var(--ok)] uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-[var(--ok)]" />
          <span>
            {isClaimVerified
              ? `Risparmio superiore al ${CONFIG.CLAIM_SAVINGS_PERCENT}% confermato`
              : 'Risparmio inferiore alla soglia ottimale (riattiva i controlli)'}
          </span>
        </div>

        <div className="text-3xl md:text-4xl font-semibold text-white tabular-nums tracking-tight">
          +{Math.round(scenario.savingsEur).toLocaleString('it-IT')} € / anno{' '}
          <span className="text-[var(--ok)]">(-{scenario.savingsPercent.toFixed(1)}%)</span>
        </div>

        <p className="text-xs text-[var(--mute)] tabular-nums">
          Risparmio energetico: <strong className="text-white font-semibold">{Math.round(scenario.savingsKwh).toLocaleString('it-IT')} kWh/anno</strong> · Emissioni abbattute:{' '}
          <strong className="text-[var(--ok)] font-semibold">{scenario.co2SavedTons.toFixed(1)} ton CO₂/anno</strong>
        </p>
      </div>

      {/* Two Comparative Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Scenario A: Non Gestito */}
        <div className="bg-[var(--s1)] p-6 rounded-xl border border-[rgb(var(--alarm-rgb)/35%)] shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[rgb(var(--alarm-rgb)/35%)] pb-2">
              <span className="font-semibold text-[var(--alarm)] text-base">Scenario A: Non Gestito</span>
              <span className="text-xs text-[var(--mute)]">Standard mercato</span>
            </div>
            <ul className="text-xs text-[var(--mute)] space-y-3">
              <li className="flex items-center space-x-2.5">
                <X className="w-4 h-4 flex-shrink-0 text-[var(--alarm)]" />
                <span className="text-[var(--text)]">Luminosità fissa al 100% giorno e notte</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <X className="w-4 h-4 flex-shrink-0 text-[var(--alarm)]" />
                <span className="text-[var(--text)]">Nessun sensore lux per adattamento ambientale</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <X className="w-4 h-4 flex-shrink-0 text-[var(--alarm)]" />
                <span className="text-[var(--text)]">Standby passivo 50 W/m² H24 (spreco a display spento)</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <X className="w-4 h-4 flex-shrink-0 text-[var(--alarm)]" />
                <span className="text-[var(--text)]">Alimentatori costantemente caldi ed usura accelerata LED</span>
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-[rgb(var(--alarm-rgb)/35%)] flex justify-between items-baseline">
            <div>
              <span className="text-xs text-[var(--mute)] block font-medium">Costo Annuo Elettricità:</span>
              <span className="text-xs text-[var(--mute)] tabular-nums">
                {Math.round(scenario.annualKwhA).toLocaleString('it-IT')} kWh/anno
              </span>
            </div>
            <span className="text-2xl md:text-3xl font-semibold text-[var(--alarm)] tabular-nums">
              {Math.round(scenario.annualCostEurA).toLocaleString('it-IT')} €
            </span>
          </div>
        </div>

        {/* Scenario B: Gestito Fleet Monitor */}
        <div className="bg-[var(--s1)] p-6 rounded-xl border border-[rgb(var(--ok-rgb)/30%)] shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[rgb(var(--ok-rgb)/30%)] pb-2">
              <span className="font-semibold text-[var(--ok)] text-base">Scenario B: Fleet Monitor</span>
              <span className="text-xs font-semibold text-[var(--ok)] bg-[rgb(var(--ok-rgb)/10%)] border border-[rgb(var(--ok-rgb)/30%)] px-2.5 py-0.5 rounded">
                VeroLED PRO
              </span>
            </div>

            {/* Interactive Toggles for Fleet Monitor features */}
            <div className="space-y-2 text-xs">
              <button
                type="button"
                onClick={() => toggleFleetOption('dimmingAdattivo')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-[var(--s1)] hover:bg-[var(--s2)] border border-[var(--line)] transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-[var(--ok)]" />
                  <span className="text-[var(--text)] font-medium">Dimming Adattivo su APL</span>
                </div>
                <span className={`font-semibold ${fleetOptions.dimmingAdattivo ? 'text-[var(--ok)]' : 'text-[var(--mute)]'}`}>
                  {fleetOptions.dimmingAdattivo ? 'Attivo' : 'Escluso'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => toggleFleetOption('dimmingNotturno')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-[var(--s1)] hover:bg-[var(--s2)] border border-[var(--line)] transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-[var(--ok)]" />
                  <span className="text-[var(--text)] font-medium">Dimming Notturno (10% CEI)</span>
                </div>
                <span className={`font-semibold ${fleetOptions.dimmingNotturno ? 'text-[var(--ok)]' : 'text-[var(--mute)]'}`}>
                  {fleetOptions.dimmingNotturno ? 'Attivo' : 'Escluso'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => toggleFleetOption('standbyZero')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-[var(--s1)] hover:bg-[var(--s2)] border border-[var(--line)] transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-[var(--ok)]" />
                  <span className="text-[var(--text)] font-medium">Standby Notturno Zero (Relè Smart)</span>
                </div>
                <span className={`font-semibold ${fleetOptions.standbyZero ? 'text-[var(--ok)]' : 'text-[var(--mute)]'}`}>
                  {fleetOptions.standbyZero ? 'Attivo' : 'Escluso'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => toggleFleetOption('sensoreLux')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-[var(--s1)] hover:bg-[var(--s2)] border border-[var(--line)] transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-[var(--ok)]" />
                  <span className="text-[var(--text)] font-medium">Sensore Lux Ambientale</span>
                </div>
                <span className={`font-semibold ${fleetOptions.sensoreLux ? 'text-[var(--ok)]' : 'text-[var(--mute)]'}`}>
                  {fleetOptions.sensoreLux ? 'Attivo' : 'Escluso'}
                </span>
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-[rgb(var(--ok-rgb)/30%)] flex justify-between items-baseline">
            <div>
              <span className="text-xs text-[var(--mute)] block font-medium">Costo Annuo Ottimizzato:</span>
              <span className="text-xs text-[var(--ok)] tabular-nums">
                {Math.round(scenario.annualKwhB).toLocaleString('it-IT')} kWh/anno
              </span>
            </div>
            <span className="text-2xl md:text-3xl font-semibold text-[var(--ok)] tabular-nums">
              {Math.round(scenario.annualCostEurB).toLocaleString('it-IT')} €
            </span>
          </div>
        </div>
      </div>

      {/* Breakdown Chart */}
      <SavingsBreakdownChart />

      {/* Ingegneria di Rete & Power Quality (Serie Diamond vs Grandi Formati 6x3) */}
      <div className="p-6 rounded-xl bg-[var(--s1)] border border-[rgb(var(--ok-rgb)/30%)] shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[var(--pieno-fondo)] animate-pulse"></span>
              <h3 className="text-base font-semibold text-white">
                Analisi di Rete &amp; Power Quality (Delibera ARERA 232/2022/R/eel)
              </h3>
            </div>
            <p className="text-xs text-[var(--mute)]">
              Comportamento degli alimentatori switching ad APL ridotto su impianto da {powerQuality.totalCabinets} cabinet ({powerQuality.totalPowerSupplies} alimentatori).
            </p>
          </div>
          <div className="px-3 py-1 rounded-full bg-[var(--s1)] border border-[var(--ok)]/30 text-xs font-semibold text-[var(--ok)] self-start md:self-auto">
            Zero Penali Reattiva Garantite
          </div>
        </div>

        {/* Griglia Comparativa Power Factor & kVA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Colonna Standard (Scenario A) */}
          <div className="p-4 rounded-lg bg-[var(--s1)] border border-[rgb(var(--alarm-rgb)/35%)]/60 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-[var(--alarm)]">Standard Concorrenza (PFC Singola Fase)</span>
              <span className="text-[10px] text-[var(--mute)]">Alimentatori tipo UHP-200</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded bg-[var(--bg)] border border-[var(--line)]">
                <div className="text-[10px] text-[var(--mute)]">Fattore Potenza</div>
                <div className="text-sm font-bold text-[var(--alarm)] tabular-nums">~{powerQuality.powerFactorA.toFixed(2)}</div>
                <div className="text-[9px] text-[var(--alarm)]">Crollo a basso APL</div>
              </div>
              <div className="p-2 rounded bg-[var(--bg)] border border-[var(--line)]">
                <div className="text-[10px] text-[var(--mute)]">Potenza Apparente</div>
                <div className="text-sm font-bold text-white tabular-nums">{powerQuality.apparentPowerKvaA} kVA</div>
                <div className="text-[9px] text-[var(--mute)]">Carico contatore</div>
              </div>
              <div className="p-2 rounded bg-[var(--bg)] border border-[var(--line)]">
                <div className="text-[10px] text-[var(--mute)]">Reattiva Capacitiva</div>
                <div className="text-sm font-bold text-[var(--alarm)] tabular-nums">{powerQuality.reactiveKvarA} kvar</div>
                <div className="text-[9px] text-[var(--alarm)]">Immessa in rete</div>
              </div>
            </div>
            <div className="text-xs text-[var(--mute)] bg-[#161217] p-2.5 rounded border border-[rgb(var(--alarm-rgb)/35%)]/40 flex justify-between items-center">
              <span>Rischio Penali Reattiva ARERA:</span>
              <strong className="text-[var(--alarm)] font-semibold tabular-nums">
                +{powerQuality.penaleAreraEurAnnoA.toLocaleString('it-IT')} € / anno
              </strong>
            </div>
          </div>

          {/* Colonna VeroLED Smart (Scenario B) */}
          <div className="p-4 rounded-lg bg-[var(--s1)] border border-[rgb(var(--ok-rgb)/30%)] space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-[var(--ok)]">Tecnologia VeroLED (Smart Power Guard / Diamond)</span>
              <span className="text-[10px] text-[var(--ok)]">Interleaved + SVG</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded bg-[var(--bg)] border border-[var(--line)]">
                <div className="text-[10px] text-[var(--mute)]">Fattore Potenza</div>
                <div className="text-sm font-bold text-[var(--ok)] tabular-nums">{powerQuality.powerFactorB.toFixed(2)}</div>
                <div className="text-[9px] text-[var(--ok)]">Stabile 10-100%</div>
              </div>
              <div className="p-2 rounded bg-[var(--bg)] border border-[var(--line)]">
                <div className="text-[10px] text-[var(--mute)]">Potenza Apparente</div>
                <div className="text-sm font-bold text-white tabular-nums">{powerQuality.apparentPowerKvaB} kVA</div>
                <div className="text-[9px] text-[var(--ok)]">Contatore ridotto</div>
              </div>
              <div className="p-2 rounded bg-[var(--bg)] border border-[var(--line)]">
                <div className="text-[10px] text-[var(--mute)]">Penale Reattiva</div>
                <div className="text-sm font-bold text-[var(--ok)] tabular-nums">0 €</div>
                <div className="text-[9px] text-[var(--ok)]">Zero sanzioni</div>
              </div>
            </div>
            <div className="text-xs text-[var(--mute)] bg-[rgb(var(--ok-rgb)/10%)] p-2.5 rounded border border-[rgb(var(--ok-rgb)/30%)] flex justify-between items-center">
              <span>Risparmio Oneri di Rete + Potenza:</span>
              <strong className="text-[var(--ok)] font-semibold tabular-nums">
                +{powerQuality.totaleRisparmioReteEurAnno.toLocaleString('it-IT')} € / anno
              </strong>
            </div>
          </div>
        </div>

        {/* Schede Tecniche Differenziate: Serie Diamond vs Grandi Formati */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-lg bg-[var(--bg)] border border-[var(--line)] space-y-1.5">
            <div className="flex items-center space-x-1.5 text-white font-semibold">
              <span>💎</span>
              <span>Per Serie Diamond (Luxury &amp; Fine Pitch)</span>
            </div>
            <p className="text-[11px] text-[var(--mute)] leading-relaxed">
              Alimentatori a bordo con <strong className="text-[var(--text)]">Dual-Phase Interleaved PFC e Phase Shedding automatico al silicio (TI UCC28064)</strong>. A carichi inferiori al 30%, disattiva una fase mantenendo PF &ge; 0.90 fisso, zero ronzio e cabinet sotto i 42°C in modalità fanless passiva.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-[var(--bg)] border border-[var(--line)] space-y-1.5">
            <div className="flex items-center space-x-1.5 text-white font-semibold">
              <span>🏙️</span>
              <span>Per Cartelloni 6×3m &amp; Oltre (Grandi Formati DOOH)</span>
            </div>
            <p className="text-[11px] text-[var(--mute)] leading-relaxed">
              Quadro elettrico industriale <strong className="text-[var(--text)]">Smart Power Guard con compensatore attivo SVG (Static Var Generator)</strong> a commutazione rapida IGBT. Inietta in tempo reale contro-corrente per neutralizzare i 36 filtri EMI e garantire cos&phi; = 0.99 costante.
            </p>
          </div>
        </div>
      </div>

      {/* Visual Disclaimer */}
      <div className="p-3.5 rounded-xl bg-[var(--s1)] border border-[var(--line)] text-xs text-[var(--mute)] text-center">
        Valori stimati a scopo dimostrativo secondo i modelli fisici CEI 64-8 e ITU-R BT.709. Il risparmio effettivo può variare in base alla tipologia di contenuti trasmessi.
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-2">
        <button
          type="button"
          onClick={prevStep}
          className="text-xs text-[var(--mute)] hover:text-white font-medium cursor-pointer"
        >
          ← Torna alla Dashboard
        </button>
        <button
          type="button"
          onClick={nextStep}
          className="px-6 py-2.5 rounded-lg bg-[var(--pieno-fondo)] hover:bg-[var(--pieno-fondo-hover)] text-[var(--pieno-testo)] font-semibold text-xs tracking-wider flex items-center space-x-2 transition-colors shadow-sm cursor-pointer"
        >
          <span>Continua ad Audit Energetico &amp; Report PDF</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};
