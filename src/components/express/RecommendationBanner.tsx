'use client';

import React from 'react';
import { AlternativeProposal } from '../../core/physics';
import { Sparkles, ShieldCheck, ArrowRight, Leaf, Gauge, CheckCircle2 } from 'lucide-react';

interface Props {
  alternative: AlternativeProposal;
  onApply: () => void;
}

const eur = (v: number) => `${Math.round(v).toLocaleString('it-IT')} €`;

export const RecommendationBanner: React.FC<Props> = ({ alternative, onApply }) => {
  const { kind, current, proposed } = alternative;
  const isPitch = kind === 'pitch';
  const isFleet = kind === 'fleet';

  return (
    <aside className="rounded-xl border border-[#163826] bg-[#0A1610] shadow-md overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-[#163826] space-y-2">
        <div className="flex items-center space-x-2 text-[11px] font-semibold text-[#34D399] uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-[#12B76A]" />
          <span>{isPitch ? 'Alternativa consigliata' : isFleet ? 'Il passo è giusto' : 'Configurazione bilanciata'}</span>
        </div>
        <p className="text-sm text-white font-medium leading-snug">{alternative.headline}</p>
      </div>

      {isPitch && (
        <div className="px-5 py-4 grid grid-cols-2 gap-3 border-b border-[#163826]">
          <div className="p-3 rounded-lg bg-[#0D1117] border border-[#1A2028]">
            <span className="text-[10px] uppercase text-[#868D97] font-medium block">La tua scelta</span>
            <span className="text-lg font-semibold text-[#F87171] tabular-nums">P{current.pitchMm} mm</span>
            <span className="text-[11px] text-[#9AA3AD] block tabular-nums">
              {eur(current.annualCostEur)}/anno · {current.hardware.sforzoPercent}% sforzo
            </span>
          </div>
          <div className="p-3 rounded-lg bg-[#0D2818] border border-[#163826]">
            <span className="text-[10px] uppercase text-[#34D399] font-medium block">Proposta VeroLED</span>
            <span className="text-lg font-semibold text-white tabular-nums">P{proposed.pitchMm} mm</span>
            <span className="text-[11px] text-[#9AA3AD] block tabular-nums">
              {eur(proposed.annualCostEur)}/anno · {proposed.hardware.sforzoPercent}% sforzo
            </span>
          </div>
        </div>
      )}

      <div className="px-5 py-4 space-y-3">
        {isPitch && (
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-[#9AA3AD]">Risparmio energia</span>
            <span className="text-2xl font-semibold text-[#34D399] tabular-nums">
              -{alternative.savingsPercent}% <span className="text-sm text-white">({eur(alternative.savingsEur)}/anno)</span>
            </span>
          </div>
        )}

        <div className="flex items-baseline justify-between">
          <span className="text-xs text-[#9AA3AD] flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#12B76A]" />
            <span>{isPitch ? 'In più con Fleet Monitor' : 'Con Fleet Monitor'}</span>
          </span>
          <span className="text-base font-semibold text-white tabular-nums">
            -{alternative.fleetMonitorExtraPercent}% <span className="text-xs text-[#9AA3AD]">({eur(alternative.fleetMonitorExtraEur)}/anno)</span>
          </span>
        </div>

        {isPitch && alternative.rentalSavings24mEur > 0 && (
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-[#9AA3AD]">Canone noleggio 24 mesi</span>
            <span className="text-sm font-semibold text-white tabular-nums">-{eur(alternative.rentalSavings24mEur)}</span>
          </div>
        )}

        {alternative.co2SavedTons > 0 && (
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-[#9AA3AD] flex items-center space-x-1.5">
              <Leaf className="w-3.5 h-3.5 text-[#12B76A]" />
              <span>CO₂ evitata</span>
            </span>
            <span className="text-sm font-semibold text-white tabular-nums">{alternative.co2SavedTons.toFixed(2)} t/anno</span>
          </div>
        )}
      </div>

      {alternative.reasons.length > 0 && (
        <ul className="px-5 pb-4 space-y-2">
          {alternative.reasons.map((r, i) => (
            <li key={i} className="flex items-start space-x-2 text-xs text-[#C9D1D9] leading-relaxed">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#12B76A] flex-shrink-0 mt-0.5" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}

      {isPitch && (
        <div className="px-5 pb-5">
          <button
            type="button"
            onClick={onApply}
            className="w-full px-4 py-2.5 rounded-lg bg-[#12B76A] hover:bg-[#0E9F5D] text-white font-semibold text-xs tracking-wide flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-sm"
          >
            <Gauge className="w-4 h-4" />
            <span>Applica P{proposed.pitchMm} mm alla simulazione</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  );
};
