'use client';

/**
 * Fase 2 del ramo «interno» (12/11/2026): Titan Max MiP sul cabinet 16:9 da 600 × 337,5 mm.
 * Passo, griglia dei cabinet e luminanza d'esercizio; i consumi vengono dalle misure del titolare
 * (src/core/interno.ts). Il dimensionamento da esterno (formati, Selection × passo, nit di listino,
 * sole) sta in S2Dimensions e qui non serve.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { useSimulatorStore, useSimulatorComputed } from '../../store/useSimulatorStore';
import { PRODOTTI_INTERNI, NIT_INTERNO, wmqNero, wmqBianco, nitStimati } from '../../core/interno';
import { ArrowRight, AlertCircle } from 'lucide-react';

const fmt = (x: number, d = 0) => x.toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: 'always' } as Intl.NumberFormatOptions);
const GRIGLIE: [number, number][] = [[4, 4], [6, 6], [8, 8], [8, 4], [12, 6]];
const LIMITE = 24;

export const S2Interno: React.FC = () => {
  const { modulesW, modulesH, setModulesW, setModulesH, prodottoInterno: id, setProdottoInterno, nitInterno, setNitInterno, nextStep } = useSimulatorStore();
  const { dimensions, prodotto, pMax, pStandby } = useSimulatorComputed();
  const stima = nitStimati(prodotto, nitInterno);
  const kwPicco = (pMax * dimensions.areaM2) / 1000;

  const campoNumero = (etichetta: string, valore: number, imposta: (v: number) => void) => (
    <label className="grid gap-1.5 text-xs text-[var(--mute)]">
      {etichetta}
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={LIMITE}
        value={valore}
        onChange={(e) => imposta(Math.max(1, Math.min(LIMITE, parseInt(e.target.value || '1', 10))))}
        className="min-h-12 px-3 rounded-lg border border-[var(--line)] bg-[var(--s1)] text-[var(--text)] text-base tabular-nums"
      />
    </label>
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 15 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -15 }}
      className="w-full max-w-4xl space-y-6"
    >
      <div className="border-b border-[var(--line)] pb-4">
        <h2 className="text-xl font-semibold text-white">2. Schermo da interno: passo, misure e luminanza</h2>
        <p className="text-xs text-[var(--mute)] mt-1">
          {prodotto.nome} sul cabinet 16:9 da 600 × 337,5 mm. Scegli il passo, quanti cabinet in larghezza e in altezza, e a quanti nit lo terrai in sala.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="text-xs font-medium text-[var(--mute)]">Passo</div>
            <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Passo">
              {PRODOTTI_INTERNI.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={id === p.id}
                  onClick={() => setProdottoInterno(p.id)}
                  className={`min-h-12 px-4 py-2.5 rounded-lg border text-left text-sm font-semibold cursor-pointer ${
                    id === p.id ? 'border-2 border-[var(--ok)] text-white bg-[rgb(var(--ok-rgb)/10%)]' : 'border-[var(--line)] text-[var(--text)] bg-[var(--s1)]'
                  }`}
                >
                  {p.nome} {p.etichettaPasso}
                  <span className="block text-xs font-normal text-[var(--mute)]">
                    {Math.round(600 / p.pitchMm)} × {Math.round(337.5 / p.pitchMm)} px a cabinet
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-[var(--mute)]">Cabinet</div>
            <div className="grid grid-cols-2 gap-3">
              {campoNumero('In larghezza', modulesW, setModulesW)}
              {campoNumero('In altezza', modulesH, setModulesH)}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {GRIGLIE.map(([w, h]) => (
                <button
                  key={`${w}x${h}`}
                  type="button"
                  onClick={() => { setModulesW(w); setModulesH(h); }}
                  className={`min-h-10 px-3 rounded-full border text-xs cursor-pointer ${
                    modulesW === w && modulesH === h ? 'border-[var(--text)] text-white' : 'border-[var(--line)] text-[var(--mute)]'
                  }`}
                >
                  {w} × {h}{h * 2 === w ? ' (32:9)' : ''}
                </button>
              ))}
            </div>
          </div>

          <label className="grid gap-2 text-xs text-[var(--mute)]">
            <span>
              Luminanza in sala: <strong className="text-white tabular-nums">{fmt(nitInterno)} nit</strong>
            </span>
            <input
              type="range"
              min={NIT_INTERNO.min}
              max={NIT_INTERNO.max}
              step={10}
              value={nitInterno}
              onChange={(e) => setNitInterno(parseInt(e.target.value, 10))}
              className="w-full min-h-12"
              aria-label="Luminanza in sala"
            />
            <span className="leading-relaxed">
              Il pannello arriva a {fmt(prodotto.nitD65)} nit calibrato D65 e a {fmt(prodotto.nitMax)} nit a D93 (9.300 K). In una sala controllo in
              penombra si lavora di solito fra 150 e 300 nit; in un negozio luminoso si sale.
            </span>
          </label>

          {stima && (
            <div className="p-3 rounded-lg border border-[var(--line)] text-xs text-[var(--mute)] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                Oltre i {fmt(prodotto.nitMisura)} nit il consumo è una stima: abbiamo misurato fino a {fmt(prodotto.nitMisura)} nit, e lo
                facciamo crescere in proporzione.
              </span>
            </div>
          )}
        </div>

        <div className="p-5 rounded-lg bg-[var(--s1)] border border-[var(--line)] text-xs space-y-2 self-start">
          {[
            ['Misure', `${fmt(dimensions.widthM, 2)} × ${fmt(dimensions.heightM, 2)} m`],
            ['Superficie', `${fmt(dimensions.areaM2, 2)} m²`],
            ['Risoluzione nativa', `${fmt(dimensions.resolutionX)} × ${fmt(dimensions.resolutionY)} px`],
            ['Cabinet', `${dimensions.totalCabinets} · peso ~${fmt(dimensions.weightKg)} kg`],
            ['Schermo nero (standby)', `${fmt(pStandby)} W/m² · ${fmt(prodotto.wNeroCabinet)} W a cabinet`],
            [`Bianco pieno a ${fmt(nitInterno)} nit`, `${fmt(pMax)} W/m² · ${fmt(kwPicco, 2)} kW in tutto`],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 py-1 border-b border-[var(--s2)] last:border-0">
              <span className="text-[var(--mute)]">{k}</span>
              <span className="text-white font-semibold tabular-nums text-right">{v}</span>
            </div>
          ))}
          <p className="text-[var(--mute)] leading-relaxed pt-1">
            Misure su {prodotto.nome} {prodotto.passoMisura}, alla presa: {fmt(wmqNero(prodotto))} W/m² col nero, {fmt(wmqBianco(prodotto, prodotto.nitMisura))} W/m² col
            bianco a {fmt(prodotto.nitMisura)} nit.{prodotto.etichettaPasso !== prodotto.passoMisura ? ` Per il ${prodotto.etichettaPasso} usiamo la stessa misura.` : ''}
          </p>
          <p className="text-[var(--mute)] leading-relaxed">
            Per la parete di una sala operativa c&apos;è anche il{' '}
            <a href="https://veroled.it/simulatore-control-room/" className="text-[var(--text)] underline underline-offset-2">simulatore control room</a>.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={nextStep}
          className="px-6 py-2.5 rounded-lg bg-[var(--pieno-fondo)] hover:bg-[var(--pieno-fondo-hover)] text-[var(--pieno-testo)] font-semibold text-xs flex items-center space-x-2 cursor-pointer shadow-sm"
        >
          <span>Continua e vai all&apos;APL</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};
