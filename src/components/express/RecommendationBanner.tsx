'use client';

import React from 'react';
import { AlternativeProposal } from '../../core/physics';
import { Sparkles, ShieldCheck, ArrowRight, Leaf, Gauge, CheckCircle2, AlertTriangle } from 'lucide-react';

interface Props {
  alternative: AlternativeProposal;
  /** Da dove nasce la linea di vista citata nel titolo */
  installHeightM: number;
  groundViewingDistM: number;
  onApply: () => void;
}

// useGrouping 'always': in italiano i numeri a 4 cifre uscirebbero senza punto (4079 accanto a 13.335)
const num = (v: number, d = 1) => v.toLocaleString('it-IT', { maximumFractionDigits: d, useGrouping: 'always' } as Intl.NumberFormatOptions);
const eur = (v: number) => `${num(Math.round(v), 0)} €`;

/** Schema della linea di vista: pubblico a terra, schermo in quota, ipotenusa fino al centro */
const LineOfSightDiagram: React.FC<{
  baseM: number;
  centerM: number;
  topM: number;
  groundM: number;
  lineM: number;
  accent: string;
}> = ({ baseM, centerM, topM, groundM, lineM, accent }) => {
  const groundY = 92;
  const viewerX = 22;
  const screenX = 208;
  // Schema, non disegno in scala: la quota si comprime per far stare in figura anche un tetto a 30 m
  const sy = 74 / Math.max(topM, 12);
  const yBase = groundY - baseM * sy;
  const yTop = Math.min(yBase - 6, groundY - topM * sy);
  const yCenter = (yBase + yTop) / 2;
  const eyeY = groundY - 13;
  const midX = (viewerX + screenX) / 2;
  const midY = (eyeY + yCenter) / 2;
  return (
    <svg viewBox="0 0 300 112" className="w-full h-auto" role="img"
      aria-label={`Pubblico a ${num(groundM)} m a terra, centro dello schermo a ${num(centerM)} m di quota: linea di vista ${num(lineM)} m`}>
      {/* terreno e distanza a terra */}
      <line x1="8" y1={groundY} x2="292" y2={groundY} stroke="#2D3748" strokeWidth="1" />
      <line x1={viewerX} y1={groundY + 6} x2={screenX} y2={groundY + 6} stroke="#667085" strokeWidth="1" />
      <line x1={viewerX} y1={groundY + 3} x2={viewerX} y2={groundY + 9} stroke="#667085" strokeWidth="1" />
      <line x1={screenX} y1={groundY + 3} x2={screenX} y2={groundY + 9} stroke="#667085" strokeWidth="1" />
      <text x={midX} y={groundY + 18} textAnchor="middle" fontSize="9" fill="#9AA3AD">{num(groundM)} m a terra</text>
      {/* osservatore */}
      <circle cx={viewerX} cy={eyeY} r="3" fill="#E8EDF2" />
      <line x1={viewerX} y1={eyeY + 3} x2={viewerX} y2={groundY} stroke="#E8EDF2" strokeWidth="1.5" />
      {/* sostegno e schermo */}
      {baseM > 0 && <line x1={screenX} y1={yBase} x2={screenX} y2={groundY} stroke="#2D3748" strokeWidth="2" />}
      <rect x={screenX - 4} y={yTop} width="8" height={yBase - yTop} rx="1" fill={accent} />
      <text x={screenX + 10} y={yTop + 3} fontSize="8.5" fill="#667085">cima {num(topM)} m</text>
      <text x={screenX + 10} y={yCenter + 3} fontSize="9" fill="#E8EDF2">centro {num(centerM)} m</text>
      <text x={screenX + 10} y={Math.max(yBase + 3, yCenter + 13)} fontSize="8.5" fill="#667085">base {num(baseM)} m</text>
      {/* linea di vista */}
      <line x1={viewerX + 3} y1={eyeY} x2={screenX - 5} y2={yCenter} stroke={accent} strokeWidth="1.5" strokeDasharray="4 3" />
      <rect x={midX - 27} y={midY - 17} width="54" height="14" rx="7" fill="#07090C" stroke={accent} strokeWidth="0.75" />
      <text x={midX} y={midY - 7} textAnchor="middle" fontSize="10" fontWeight="600" fill="#FFFFFF">{num(lineM)} m</text>
    </svg>
  );
};

export const RecommendationBanner: React.FC<Props> = ({ alternative, installHeightM, groundViewingDistM, onApply }) => {
  const { kind, current, proposed } = alternative;
  const isPitch = kind === 'pitch';
  const isFleet = kind === 'fleet';
  // Passo più largo di quanto la distanza regga: si propone un passo più fitto, che consuma di più
  const isCoarse = kind === 'coarse';
  const hasProposal = isPitch || isCoarse;

  return (
    <aside className={`rounded-xl border shadow-md overflow-hidden ${isCoarse ? 'border-[#4A3510] bg-[#161006]' : 'border-[#163826] bg-[#0A1610]'}`}>
      <div className={`px-5 pt-5 pb-4 border-b space-y-2 ${isCoarse ? 'border-[#4A3510]' : 'border-[#163826]'}`}>
        <div className={`flex items-center space-x-2 text-[11px] font-semibold uppercase tracking-wider ${isCoarse ? 'text-[#FBBF24]' : 'text-[#34D399]'}`}>
          {isCoarse ? <AlertTriangle className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5 text-[#12B76A]" />}
          <span>{isPitch ? 'Alternativa consigliata' : isCoarse ? 'Passo troppo largo' : isFleet ? 'Il passo è giusto' : 'Configurazione bilanciata'}</span>
        </div>
        <p className="text-sm text-white font-medium leading-snug">{alternative.headline}</p>
        <div className="pt-1">
          <LineOfSightDiagram
            baseM={installHeightM}
            centerM={alternative.centerHeightM}
            topM={installHeightM + 2 * (alternative.centerHeightM - installHeightM)}
            groundM={groundViewingDistM}
            lineM={alternative.lineOfSightDistM}
            accent={isCoarse ? '#FBBF24' : '#34D399'}
          />
          <p className="text-[11px] text-[#9AA3AD] mt-1.5">
            La distanza che conta è la linea tratteggiata: da chi guarda al centro dello schermo.
          </p>
        </div>
      </div>

      {hasProposal && (
        <div className={`px-5 py-4 grid grid-cols-2 gap-3 border-b ${isCoarse ? 'border-[#4A3510]' : 'border-[#163826]'}`}>
          <div className="p-3 rounded-lg bg-[#0D1117] border border-[#1A2028]">
            <span className="text-[10px] uppercase text-[#868D97] font-medium block">La tua scelta</span>
            <span className={`text-lg font-semibold tabular-nums ${isCoarse ? 'text-[#FBBF24]' : 'text-[#F87171]'}`}>P{current.pitchMm} mm</span>
            <span className="text-[11px] text-[#9AA3AD] block tabular-nums">
              {eur(current.annualCostEur)}/anno · {current.hardware.sforzoPercent}% sforzo chip
            </span>
          </div>
          <div className="p-3 rounded-lg bg-[#0D2818] border border-[#163826]">
            <span className="text-[10px] uppercase text-[#34D399] font-medium block">Proposta VeroLED</span>
            <span className="text-lg font-semibold text-white tabular-nums">P{proposed.pitchMm} mm</span>
            <span className="text-[11px] text-[#9AA3AD] block tabular-nums">
              {eur(proposed.annualCostEur)}/anno · {proposed.hardware.sforzoPercent}% sforzo chip
            </span>
          </div>
          <p className="col-span-2 text-[10px] text-[#667085] leading-snug">
            Sforzo chip = quanto lavora il diodo per dare {num(current.nits, 0)} nit, stessa formula delle percentuali accanto ai passi: cambia con i nit impostati, non con il contenuto.
          </p>
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

        {isCoarse && (
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-[#9AA3AD]">Energia in più</span>
            <span className="text-2xl font-semibold text-[#FBBF24] tabular-nums">
              +{eur(alternative.extraCostEur)}<span className="text-sm text-white">/anno</span>
            </span>
          </div>
        )}

        <div className="space-y-0.5">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-[#9AA3AD] flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#12B76A]" />
              <span>{isPitch ? 'In più con Fleet Monitor' : isCoarse ? `Fleet Monitor sul P${proposed.pitchMm}` : 'Con Fleet Monitor'}</span>
            </span>
            <span className="text-base font-semibold text-white tabular-nums">
              -{alternative.fleetMonitorExtraPercent}%
            </span>
          </div>
          <p className="text-[11px] text-[#868D97] text-right tabular-nums">
            risparmi {eur(alternative.fleetMonitorExtraEur)}/anno · bolletta del P{proposed.pitchMm} da {eur(proposed.annualCostEur)} a {eur(alternative.fleetMonitorCostEur)}
          </p>
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
              <CheckCircle2 className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${isCoarse ? 'text-[#FBBF24]' : 'text-[#12B76A]'}`} />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}

      {hasProposal && (
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
