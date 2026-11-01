'use client';

import React from 'react';
import { AlternativeProposal } from '../../core/physics';
import { Sparkles, ShieldCheck, ArrowRight, Leaf, Gauge, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

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
      <line x1="8" y1={groundY} x2="292" y2={groundY} stroke="var(--s3)" strokeWidth="1" />
      <line x1={viewerX} y1={groundY + 6} x2={screenX} y2={groundY + 6} stroke="var(--faint)" strokeWidth="1" />
      <line x1={viewerX} y1={groundY + 3} x2={viewerX} y2={groundY + 9} stroke="var(--faint)" strokeWidth="1" />
      <line x1={screenX} y1={groundY + 3} x2={screenX} y2={groundY + 9} stroke="var(--faint)" strokeWidth="1" />
      <text x={midX} y={groundY + 18} textAnchor="middle" fontSize="9" fill="var(--mute)">{num(groundM)} m a terra</text>
      {/* osservatore */}
      <circle cx={viewerX} cy={eyeY} r="3" fill="var(--text)" />
      <line x1={viewerX} y1={eyeY + 3} x2={viewerX} y2={groundY} stroke="var(--text)" strokeWidth="1.5" />
      {/* sostegno e schermo */}
      {baseM > 0 && <line x1={screenX} y1={yBase} x2={screenX} y2={groundY} stroke="var(--s3)" strokeWidth="2" />}
      <rect x={screenX - 4} y={yTop} width="8" height={yBase - yTop} rx="1" fill={accent} />
      {/* su schermi bassi le tre quote si toccherebbero: almeno 11 px tra una riga e l'altra */}
      <text x={screenX + 10} y={Math.min(yTop + 3, yCenter - 8)} fontSize="8.5" fill="var(--faint)">cima {num(topM)} m</text>
      <text x={screenX + 10} y={yCenter + 3} fontSize="9" fill="var(--text)">centro {num(centerM)} m</text>
      <text x={screenX + 10} y={Math.max(yBase + 3, yCenter + 14)} fontSize="8.5" fill="var(--faint)">base {num(baseM)} m</text>
      {/* linea di vista */}
      <line x1={viewerX + 3} y1={eyeY} x2={screenX - 5} y2={yCenter} stroke={accent} strokeWidth="1.5" strokeDasharray="4 3" />
      <rect x={midX - 27} y={midY - 17} width="54" height="14" rx="7" fill="var(--bg)" stroke={accent} strokeWidth="0.75" />
      <text x={midX} y={midY - 7} textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--text)">{num(lineM)} m</text>
    </svg>
  );
};

export const RecommendationBanner: React.FC<Props> = ({ alternative, installHeightM, groundViewingDistM, onApply }) => {
  const { kind, current, proposed } = alternative;
  const isPitch = kind === 'pitch';
  const isFleet = kind === 'fleet';
  // Passo più largo di quanto la distanza regga: si propone un passo più fitto, che consuma di più
  const isCoarse = kind === 'coarse';
  // Requisito fisico non soddisfatto: il passo non arriva ai nit, o nessun passo soddisfa nit e distanza insieme
  const isBrightness = kind === 'brightness';
  const isCompromise = kind === 'compromise';
  // Il listino non ha il tetto di nit della combinazione scelta: non validabile, quindi mai positivo
  const isNoData = kind === 'nodata';
  const isInvalid = isBrightness || isCompromise;
  const hasProposal = (isPitch || isCoarse || isInvalid || isNoData) && proposed.pitchMm !== current.pitchMm;
  // Verde solo se il passo scelto soddisfa tutti i requisiti; ambra = troppo largo; rosso = requisito fisico mancato
  const tone = isInvalid
    ? { border: 'border-[rgb(var(--alarm-rgb)/35%)]', bg: 'bg-[rgb(var(--alarm-rgb)/12%)]', text: 'text-[var(--alarm)]', hex: 'var(--alarm)' }
    : isNoData
    ? { border: 'border-[#1E3A5F]', bg: 'bg-[var(--s1)]', text: 'text-[var(--focus)]', hex: 'var(--focus)' }
    : isCoarse
    ? { border: 'border-[rgb(var(--warn-rgb)/35%)]', bg: 'bg-[rgb(var(--warn-rgb)/12%)]', text: 'text-[var(--warn)]', hex: 'var(--warn)' }
    : { border: 'border-[rgb(var(--ok-rgb)/30%)]', bg: 'bg-[rgb(var(--ok-rgb)/10%)]', text: 'text-[var(--ok)]', hex: 'var(--ok)' };
  const title = isPitch
    ? 'Alternativa consigliata'
    : isBrightness
    ? 'Luminosità non raggiungibile'
    : isCompromise
    ? 'Nessun passo valido'
    : isNoData
    ? 'Tetto non ancora censito'
    : isCoarse
    ? 'Passo troppo largo'
    : isFleet
    ? 'Il passo è giusto'
    : 'Configurazione bilanciata';

  return (
    <aside className={`rounded-xl border shadow-md overflow-hidden ${tone.border} ${tone.bg}`}>
      <div className={`px-5 pt-5 pb-4 border-b space-y-2 ${tone.border}`}>
        <div className={`flex items-center space-x-2 text-[11px] font-semibold uppercase tracking-wider ${tone.text}`}>
          {isNoData ? <Info className="w-3.5 h-3.5" /> : isCoarse || isInvalid ? <AlertTriangle className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5 text-[var(--ok)]" />}
          <span>{title}</span>
        </div>
        <p className="text-sm text-white font-medium leading-snug">{alternative.headline}</p>
        <div className="pt-1">
          <LineOfSightDiagram
            baseM={installHeightM}
            centerM={alternative.centerHeightM}
            topM={installHeightM + 2 * (alternative.centerHeightM - installHeightM)}
            groundM={groundViewingDistM}
            lineM={alternative.lineOfSightDistM}
            accent={tone.hex}
          />
          <p className="text-[11px] text-[var(--mute)] mt-1.5">
            La distanza che conta è la linea tratteggiata: da chi guarda al centro dello schermo.
          </p>
        </div>
      </div>

      {hasProposal && (
        <div className={`px-5 py-4 grid grid-cols-2 gap-3 border-b ${tone.border}`}>
          <div className="p-3 rounded-lg bg-[var(--s1)] border border-[var(--line)]">
            <span className="text-[10px] uppercase text-[var(--mute)] font-medium block">La tua scelta</span>
            <span className={`text-lg font-semibold tabular-nums ${isNoData ? 'text-[var(--focus)]' : isCoarse ? 'text-[var(--warn)]' : 'text-[var(--alarm)]'}`}>P{current.pitchMm} mm</span>
            {!alternative.currentHasData ? (
              <span className="text-[11px] text-[var(--focus)] block">tetto di nit non ancora censito</span>
            ) : alternative.currentMeetsBrightness ? (
              <span className="text-[11px] text-[var(--mute)] block tabular-nums">
                {eur(current.annualCostEur)}/anno · {current.hardware.sforzoPercent}% sforzo chip
              </span>
            ) : (
              <span className="text-[11px] text-[var(--alarm)] block tabular-nums">
                max {num(alternative.currentMaxNits ?? 0, 0)} nit · ne servono {num(current.nits, 0)}
              </span>
            )}
          </div>
          <div className="p-3 rounded-lg bg-[rgb(var(--ok-rgb)/10%)] border border-[rgb(var(--ok-rgb)/30%)]">
            <span className="text-[10px] uppercase text-[var(--ok)] font-medium block">{isCompromise ? 'Compromesso più vicino' : isNoData ? 'Con dati certi' : 'Proposta VeroLED'}</span>
            <span className="text-lg font-semibold text-white tabular-nums">P{proposed.pitchMm} mm</span>
            <span className="text-[11px] text-[var(--mute)] block tabular-nums">
              {eur(proposed.annualCostEur)}/anno · {proposed.hardware.sforzoPercent}% sforzo chip
            </span>
          </div>
          <p className="col-span-2 text-[10px] text-[var(--faint)] leading-snug">
            Sforzo chip = quanto lavora il diodo per dare {num(current.nits, 0)} nit, stessa formula delle percentuali accanto ai passi: cambia con i nit impostati, non con il contenuto.
          </p>
        </div>
      )}

      <div className="px-5 py-4 space-y-3">
        {hasProposal && alternative.currentMeetsBrightness && alternative.savingsEur > 0 && (
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-[var(--mute)]">Risparmio energia</span>
            <span className="text-2xl font-semibold text-[var(--ok)] tabular-nums">
              -{alternative.savingsPercent}% <span className="text-sm text-white">({eur(alternative.savingsEur)}/anno)</span>
            </span>
          </div>
        )}

        {hasProposal && alternative.currentMeetsBrightness && alternative.extraCostEur > 0 && (
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-[var(--mute)]">Energia in più</span>
            <span className={`text-2xl font-semibold tabular-nums ${tone.text}`}>
              +{eur(alternative.extraCostEur)}<span className="text-sm text-white">/anno</span>
            </span>
          </div>
        )}

        <div className="space-y-0.5">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-[var(--mute)] flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--ok)]" />
              <span>{isPitch ? 'In più con Fleet Monitor' : hasProposal ? `Fleet Monitor sul P${proposed.pitchMm}` : 'Con Fleet Monitor'}</span>
            </span>
            <span className="text-base font-semibold text-white tabular-nums">
              -{alternative.fleetMonitorExtraPercent}%
            </span>
          </div>
          <p className="text-[11px] text-[var(--mute)] text-right tabular-nums">
            risparmi {eur(alternative.fleetMonitorExtraEur)}/anno · bolletta del P{proposed.pitchMm} da {eur(proposed.annualCostEur)} a {eur(alternative.fleetMonitorCostEur)}
          </p>
        </div>

        {isPitch && alternative.rentalSavings24mEur > 0 && (
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-[var(--mute)]">Canone noleggio 24 mesi</span>
            <span className="text-sm font-semibold text-white tabular-nums">-{eur(alternative.rentalSavings24mEur)}</span>
          </div>
        )}

        {alternative.co2SavedTons > 0 && (
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-[var(--mute)] flex items-center space-x-1.5">
              <Leaf className="w-3.5 h-3.5 text-[var(--ok)]" />
              <span>CO₂ evitata</span>
            </span>
            <span className="text-sm font-semibold text-white tabular-nums">{alternative.co2SavedTons.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} t/anno</span>
          </div>
        )}
      </div>

      {alternative.reasons.length > 0 && (
        <ul className="px-5 pb-4 space-y-2">
          {alternative.reasons.map((r, i) => (
            <li key={i} className="flex items-start space-x-2 text-xs text-[var(--text)] leading-relaxed">
              {isNoData ? (
                <Info className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${tone.text}`} />
              ) : isInvalid ? (
                <AlertTriangle className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${tone.text}`} />
              ) : (
                <CheckCircle2 className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${isCoarse ? 'text-[var(--warn)]' : 'text-[var(--ok)]'}`} />
              )}
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
            className="w-full px-4 py-2.5 rounded-lg bg-[var(--pieno-fondo)] hover:bg-[var(--pieno-fondo-hover)] text-[var(--pieno-testo)] font-semibold text-xs tracking-wide flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-sm"
          >
            <Gauge className="w-4 h-4" />
            <span>{isCompromise ? `Applica il compromesso P${proposed.pitchMm} mm` : `Applica P${proposed.pitchMm} mm alla simulazione`}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  );
};
