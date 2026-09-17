'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useSimulatorStore, useSimulatorComputed } from '../../store/useSimulatorStore';
import { CABINET_FORMATS, PIXEL_PITCH_PRESETS, CONFIG } from '../../config/config';
import { CabinetCanvas } from '../canvas/CabinetCanvas';
import { stimaPotenzaDaPassoNit, getMaxNitsForPitch, calcolaConsulenzaOttica, standbyWmqPerPasso } from '../../core/physics';
import { ArrowRight, Grid3X3, Ruler, Monitor, GitCompare, Zap, AlertCircle, Sparkles, ChevronDown, ChevronUp, Lock, Sun, Eye, ThumbsUp, AlertTriangle } from 'lucide-react';

export const S2Dimensions: React.FC = () => {
  const {
    sizingMode,
    formatId,
    pitchMm,
    modulesW,
    modulesH,
    tariffEurKwh,
    operatingHoursDay,
    setSizingMode,
    setFormatId,
    setPitchMm,
    setDimensioniMetri,
    setRisoluzionePx,
    nextStep,
  } = useSimulatorStore();

  const { dimensions, format } = useSimulatorComputed();

  // Stato APL in tempo reale dal canvas
  const [liveApl, setLiveApl] = useState<number>(32);

  // Calcolo consumi in tempo reale basati sull'APL istantaneo e sulla fisica reale del passo pixel a 5.000 Nit
  const targetOutdoorNits = useSimulatorStore((s) => s.targetOutdoorNits) || 5000;
  const effectiveLiveApl = Math.max(0.05, Math.min(1, (liveApl ?? 30) / 100));
  const hardwareEstimate = stimaPotenzaDaPassoNit(pitchMm, targetOutdoorNits);
  const pMaxWmq = useSimulatorStore.getState().datiSchedaTecnica?.pMaxWmq?.valore ?? hardwareEstimate.pMaxWmq;
  const pStandbyWmq = useSimulatorStore.getState().datiSchedaTecnica?.pStandbyWmq?.valore ?? standbyWmqPerPasso(pitchMm);
  const livePowerWmq = pStandbyWmq + effectiveLiveApl * (pMaxWmq - pStandbyWmq);
  const livePowerKw = (livePowerWmq * dimensions.areaM2) / 1000;

  // Corrente trifase 400V (CEI 64-8): I = P / (sqrt(3) * V * cosphi), con V = 400V, cosphi = 0.95
  const liveCurrentAmp = livePowerKw > 0 ? (livePowerKw * 1000) / (Math.sqrt(3) * 400 * 0.95) : 0;

  // Costo orario stimato con tariffa utente
  const rateEur = tariffEurKwh || 0.28;
  const liveHourlyCostEur = livePowerKw * rateEur;
  const liveAnnualCostEur = livePowerKw * (operatingHoursDay || 16) * 365 * rateEur;

  // Stato interno per il comparatore hardware (Passi e Nit a confronto)
  const [compPitchA, setCompPitchA] = useState(3.91);
  const [compNitsA, setCompNitsA] = useState(6500);

  const [compPitchB, setCompPitchB] = useState(8.0);
  const [compNitsB, setCompNitsB] = useState(6500);
  const [syncNits, setSyncNits] = useState(true);

  const storeInstallHeightM = useSimulatorStore((s) => s.installHeightM) ?? 5.0;
  const storeGroundViewingDistM = useSimulatorStore((s) => s.groundViewingDistM) ?? 10.0;
  const setStoreInstallHeightM = useSimulatorStore((s) => s.setInstallHeightM);
  const setStoreGroundViewingDistM = useSimulatorStore((s) => s.setGroundViewingDistM);

  // Parametri di installazione ottica (quota da terra e distanza osservatori per consulenza passo)
  const [installHeightM, setInstallHeightM] = useState<number>(storeInstallHeightM);
  const [groundViewingDistM, setGroundViewingDistM] = useState<number>(storeGroundViewingDistM);

  // Modalità sintetica (ultra-pulita per il cliente) vs modalità tecnica
  const [syntheticMode, setSyntheticMode] = useState(true);
  const [showDeepScientific, setShowDeepScientific] = useState(false);

  // Helper per la formattazione dei numeri con punto delle migliaia garantito
  const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  // Limiti fisici-meccanici reali dei package LED (es. P3.91 non può eccedere 6.500 nit)
  const limitA = getMaxNitsForPitch(compPitchA);
  const limitB = getMaxNitsForPitch(compPitchB);

  // Clamping sul limite fisico reale del semiconduttore
  const effectiveNitsA = Math.min(compNitsA, limitA.maxNits);
  const effectiveNitsB = Math.min(compNitsB, limitB.maxNits);

  const compResA = stimaPotenzaDaPassoNit(compPitchA, effectiveNitsA, dimensions.areaM2);
  const compResB = stimaPotenzaDaPassoNit(compPitchB, effectiveNitsB, dimensions.areaM2);

  const deltaCostEur = Math.abs(compResA.annualCostEur - compResB.annualCostEur);
  const isAMoreExpensive = compResA.annualCostEur > compResB.annualCostEur;

  // Calcolo Consulenza Ottica (Acuità visiva umana / Distanza di vista)
  const opticalConsulting = useMemo(() => {
    return calcolaConsulenzaOttica(
      installHeightM,
      groundViewingDistM,
      compPitchA,
      dimensions.areaM2,
      Math.max(effectiveNitsA, effectiveNitsB, 6000)
    );
  }, [installHeightM, groundViewingDistM, compPitchA, dimensions.areaM2, effectiveNitsA, effectiveNitsB]);

  const applyBarbecuePreset = () => {
    setDimensioniMetri(6.0, 3.0);
    setCompPitchA(2.6);
    setCompNitsA(4500);
    setCompPitchB(3.91);
    setCompNitsB(6000);
    setSyncNits(false);
    setInstallHeightM(5.0);
    setGroundViewingDistM(10.0);
    setStoreInstallHeightM(5.0);
    setStoreGroundViewingDistM(10.0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="w-full max-w-5xl space-y-4"
    >
      <div className="text-center space-y-2">
        <span className="text-xs font-semibold text-[#12B76A] tracking-wider uppercase">
          Fase 2 di 9 · Parametri Fisici
        </span>
        <h2 className="text-2xl md:text-3xl font-semibold text-white">
          Come vuoi dimensionare lo schermo?
        </h2>
        <p className="text-sm text-[#9AA3AD] max-w-2xl mx-auto">
          Scegli la modalità che preferisci: tutte le grandezze fisiche e ottiche sono sincronizzate in tempo reale.
        </p>
      </div>

      {/* Mode Selector Tabs */}
      <div className="flex flex-wrap justify-center gap-1 border-b border-[#1A2028] pb-2">
        <button
          type="button"
          onClick={() => setSizingMode('cabinet')}
          className={`px-4 py-2 rounded-lg text-xs font-medium flex items-center space-x-2 transition-colors cursor-pointer ${
            sizingMode === 'cabinet'
              ? 'bg-[#10141D] text-white font-semibold border-b-2 border-[#12B76A]'
              : 'text-[#868D97] hover:text-[#E8EDF2]'
          }`}
        >
          <Grid3X3 className="w-3.5 h-3.5 text-[#9AA3AD]" />
          <span>1. Cabinet Visuale</span>
        </button>

        <button
          type="button"
          onClick={() => setSizingMode('dimensions')}
          className={`px-4 py-2 rounded-lg text-xs font-medium flex items-center space-x-2 transition-colors cursor-pointer ${
            sizingMode === 'dimensions'
              ? 'bg-[#10141D] text-white font-semibold border-b-2 border-[#12B76A]'
              : 'text-[#868D97] hover:text-[#E8EDF2]'
          }`}
        >
          <Ruler className="w-3.5 h-3.5 text-[#9AA3AD]" />
          <span>2. Dimensioni (Metri)</span>
        </button>

        <button
          type="button"
          onClick={() => setSizingMode('resolution')}
          className={`px-4 py-2 rounded-lg text-xs font-medium flex items-center space-x-2 transition-colors cursor-pointer ${
            sizingMode === 'resolution'
              ? 'bg-[#10141D] text-white font-semibold border-b-2 border-[#12B76A]'
              : 'text-[#868D97] hover:text-[#E8EDF2]'
          }`}
        >
          <Monitor className="w-3.5 h-3.5 text-[#9AA3AD]" />
          <span>3. Risoluzione (Pixel)</span>
        </button>

        <button
          type="button"
          onClick={() => setSizingMode('comparison')}
          className={`px-4 py-2 rounded-lg text-xs font-medium flex items-center space-x-2 transition-colors cursor-pointer ${
            sizingMode === 'comparison'
              ? 'bg-[#0D2818] text-[#34D399] font-semibold border border-[#163826]'
              : 'text-[#34D399] bg-[#0D2818]/40 border border-[#163826] hover:bg-[#0D2818]'
          }`}
        >
          <GitCompare className="w-3.5 h-3.5 text-[#12B76A]" />
          <span>4. Confronta Passi &amp; Nit</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Configuration Area */}
        <div className="md:col-span-2 bg-[#0D1117] p-6 rounded-xl space-y-5 border border-[#1A2028] shadow-sm">
          
          {/* TAB 4: COMPARATORE PASSI E LUMINOSITÀ */}
          {sizingMode === 'comparison' ? (
            <div className="space-y-4">
              {/* Barra Superiore con Opzioni */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1A2028] pb-3 gap-2">
                <div className="flex items-center space-x-2 text-xs font-semibold text-white">
                  <Zap className="w-4 h-4 text-[#12B76A] flex-shrink-0" />
                  <span>Confronto Passi &amp; Nit</span>
                  <span className="text-xs text-[#868D97] font-normal">({dimensions.areaM2.toFixed(1)} m²)</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* BOTTONE SINTETIZZA / DETTAGLI */}
                  <button
                    type="button"
                    onClick={() => setSyntheticMode(!syntheticMode)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer ${
                      syntheticMode
                        ? 'bg-[#0D2818] text-[#34D399] border border-[#163826]'
                        : 'bg-[#10141D] text-[#E8EDF2] border border-[#1A2028] hover:bg-[#161F30]'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{syntheticMode ? 'Vista Sintetica (Attiva)' : 'Sintetizza per il Cliente'}</span>
                  </button>

                  {/* Toggle Stessi Nit */}
                  <button
                    type="button"
                    onClick={() => {
                      const next = !syncNits;
                      setSyncNits(next);
                      if (next) setCompNitsB(compNitsA);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer ${
                      syncNits
                        ? 'bg-[#10141D] text-white border border-[#2D3748]'
                        : 'bg-[#07090C] text-[#868D97] border border-[#1A2028] hover:bg-[#10141D]'
                    }`}
                  >
                    <span>{syncNits ? 'Stessi Nit' : 'Nit Liberi'}</span>
                  </button>
                </div>
              </div>

              {/* MODULO CONSULENZA OTTICA & GEOMETRIA DI INSTALLAZIONE */}
              <div className="p-4 rounded-xl border border-[#1E293B] bg-[#0A0F17]/90 space-y-3.5 text-xs shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1A2028] pb-2.5">
                  <div className="flex items-center space-x-2">
                    <Eye className="w-4 h-4 text-[#12B76A]" />
                    <span className="text-white font-semibold text-xs tracking-wide">
                      Consulenza Ottica &amp; Criterio Snellen (Acuità Visiva 1 Arcmin)
                    </span>
                  </div>

                  {/* Pulsante Preimpostazione Caso Reale Barbecue S.r.l. */}
                  <button
                    type="button"
                    onClick={applyBarbecuePreset}
                    className="px-3 py-1.5 rounded-lg bg-[#0D2818] hover:bg-[#133D24] text-[#34D399] border border-[#163826] font-semibold text-[11px] flex items-center space-x-1.5 transition-colors cursor-pointer self-start sm:self-auto shadow-sm"
                  >
                    <Zap className="w-3.5 h-3.5 text-[#34D399]" />
                    <span>⚡ Carica Caso Reale: Barbecue S.r.l. (6×3m · Quota 5m · Vista 10m)</span>
                  </button>
                </div>

                {/* Controlli Geometria: Quota e Distanza */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between items-center text-[#868D97] mb-1">
                      <span>Quota installazione da terra:</span>
                      <strong className="text-white font-semibold tabular-nums">{installHeightM.toFixed(1)} m</strong>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="15.0"
                      step="0.5"
                      value={installHeightM}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setInstallHeightM(val);
                        setStoreInstallHeightM(val);
                      }}
                      className="w-full custom-slider"
                    />
                    <div className="flex justify-between text-[10px] text-[#868D97] pt-0.5">
                      <span>1 m (altezza uomo)</span>
                      <span>5 m (standard palo/palazzo)</span>
                      <span>15 m</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-[#868D97] mb-1">
                      <span>Distanza osservatore al suolo:</span>
                      <strong className="text-white font-semibold tabular-nums">{groundViewingDistM.toFixed(1)} m</strong>
                    </div>
                    <input
                      type="range"
                      min="3.0"
                      max="35.0"
                      step="1.0"
                      value={groundViewingDistM}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setGroundViewingDistM(val);
                        setStoreGroundViewingDistM(val);
                      }}
                      className="w-full custom-slider"
                    />
                    <div className="flex justify-between text-[10px] text-[#868D97] pt-0.5">
                      <span>3 m (marciapiede)</span>
                      <span>10 m (carreggiata/incrocio)</span>
                      <span>35 m</span>
                    </div>
                  </div>
                </div>

                {/* Risultati Calcolo Ottico */}
                <div className="grid grid-cols-3 gap-2.5 pt-1">
                  <div className="p-2.5 rounded-lg bg-[#10141D] border border-[#1A2028] text-center">
                    <span className="text-[10px] text-[#868D97] block uppercase font-medium">Linea di Vista (Ipotenusa)</span>
                    <strong className="text-sm font-semibold text-white tabular-nums">
                      {opticalConsulting.lineOfSightDistM} m
                    </strong>
                    <span className="text-[10px] text-[#868D97] block">√(h² + d²)</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#10141D] border border-[#1A2028] text-center">
                    <span className="text-[10px] text-[#868D97] block uppercase font-medium">Soglia Risoluzione Occhio</span>
                    <strong className="text-sm font-semibold text-[#FDB022] tabular-nums">
                      {opticalConsulting.minResolvablePitchMm} mm
                    </strong>
                    <span className="text-[10px] text-[#868D97] block">1 arcmin (Snellen 20/20)</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#0D2818]/60 border border-[#163826] text-center">
                    <span className="text-[10px] text-[#34D399] block uppercase font-medium">Passo Consigliato Sistema</span>
                    <strong className="text-sm font-bold text-[#12B76A] tabular-nums">
                      P{opticalConsulting.recommendedPitchMm} mm
                    </strong>
                    <span className="text-[10px] text-[#34D399] block">100% Retina Blended</span>
                  </div>
                </div>

                {/* Alert Overkill Ottico se Passo Cliente è troppo fitto */}
                {opticalConsulting.isClientPitchOverkill && (
                  <div className="p-3 rounded-lg bg-[#2E200B]/60 border border-[#5E3F10] text-[#FDB022] space-y-1">
                    <div className="flex items-center space-x-1.5 font-semibold text-xs">
                      <AlertTriangle className="w-4 h-4 text-[#FDB022] flex-shrink-0" />
                      <span>Avviso Tecnico: Il passo scelto dal cliente (P{compPitchA} mm) è in Overkill Ottico</span>
                    </div>
                    <p className="text-[11px] text-[#E8EDF2] leading-relaxed">
                      A <strong>{opticalConsulting.lineOfSightDistM} m</strong> di distanza effettiva, l&apos;occhio umano non è in grado di distinguere pixel inferiori a <strong>{opticalConsulting.minResolvablePitchMm} mm</strong>.
                      Con un P{compPitchA} il cliente acquisterebbe <strong>{fmt(opticalConsulting.wastedPixelsCount)} pixel invisibili all&apos;occhio umano (+{opticalConsulting.wastedPixelsPercent}%)</strong>, aumentando inutilmente il canone di noleggio e spingendo i chip in saturazione termica a {fmt(effectiveNitsA)} nit.
                    </p>
                  </div>
                )}
              </div>

              {/* 2 Colonne a confronto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Schermo A */}
                <div className="p-4 rounded-xl border border-[#1A2028] bg-[#07090C] space-y-3.5 text-xs">
                  <div className="flex justify-between items-center text-white font-semibold">
                    <div className="flex items-center space-x-1.5">
                      <span>Display A · Scelto dal Cliente</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${
                      opticalConsulting.isClientPitchOverkill
                        ? 'bg-[#2E200B] text-[#FDB022] border-[#5E3F10]'
                        : 'bg-[#10141D] text-[#9AA3AD] border-[#1A2028]'
                    }`}>
                      {opticalConsulting.isClientPitchOverkill ? '⚠️ Overkill Ottico' : 'Passo Fine'}
                    </span>
                  </div>

                  <div>
                    <label className="text-xs text-[#868D97] block mb-1">Passo Pixel (Pitch):</label>
                    <select
                      value={compPitchA.toString()}
                      onChange={(e) => {
                        const newP = parseFloat(e.target.value);
                        setCompPitchA(newP);
                        const maxA = getMaxNitsForPitch(newP).maxNits;
                        if (compNitsA > maxA) setCompNitsA(maxA);
                      }}
                      className="w-full p-2 rounded-lg bg-[#10141D] border border-[#1A2028] text-white outline-none font-medium text-xs"
                    >
                      <option value="1.95">P1.95 mm (max 4.000 nit - Micro/Mini)</option>
                      <option value="2.6">P2.6 mm (max 4.500 nit - Mini-LED)</option>
                      <option value="2.9">P2.9 mm (max 5.000 nit - SMD1515)</option>
                      <option value="3.91">P3.91 mm (max 6.500 nit - SMD1921)</option>
                      <option value="4.81">P4.81 mm (max 7.000 nit - SMD1921)</option>
                      <option value="6.67">P6.67 mm (fino a 12.000 nit - Gold Wire)</option>
                      <option value="8">P8.0 mm (fino a 12.000 nit - Gold Wire)</option>
                      <option value="10">P10.0 mm (fino a 12.000 nit - Gold Wire)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs text-[#868D97] mb-1">
                      <span>Luminosità Richiesta:</span>
                      <div className="flex items-center space-x-1.5">
                        {effectiveNitsA >= limitA.maxNits && (
                          <span className="text-[10px] text-[#FDB022] bg-[#2E200B] px-1.5 py-0.5 rounded border border-[#5E3F10] flex items-center space-x-0.5">
                            <Lock className="w-2.5 h-2.5 inline" />
                            <span>Tetto Termico</span>
                          </span>
                        )}
                        <strong className="text-white font-semibold tabular-nums">{fmt(effectiveNitsA)} nit</strong>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="3000"
                      max={limitA.maxNits}
                      step="250"
                      value={effectiveNitsA}
                      onChange={(e) => {
                        const val = Math.min(parseInt(e.target.value, 10), limitA.maxNits);
                        setCompNitsA(val);
                        if (syncNits) setCompNitsB(Math.min(val, limitB.maxNits));
                      }}
                      className="w-full custom-slider"
                    />
                    <div className="flex justify-between items-center text-[10px] text-[#868D97] pt-0.5 tabular-nums">
                      <span>3.000 nit</span>
                      <span className="text-[#9AA3AD] font-medium">Tetto: {fmt(limitA.maxNits)} nit ({limitA.chipType.split(' ')[0]})</span>
                    </div>

                    {compPitchA <= 2.6 && effectiveNitsA >= 4500 && (
                      <div className="mt-2 p-2 rounded bg-[#2E200B]/40 border border-[#5E3F10] text-[11px] text-[#FDB022]">
                        ⚠️ <strong>Saturazione Termica:</strong> Su P{compPitchA}mm a {fmt(effectiveNitsA)} nit i chip operano al 100% di sforzo PWM. Tj elevata con rischio deperimento precoce e thermal droop.
                      </div>
                    )}
                  </div>

                  {/* Dettagli Densità e Totale Pixel */}
                  <div className="p-2.5 rounded-lg bg-[#10141D] border border-[#1A2028] space-y-1 text-[11px]">
                    <div className="flex justify-between text-[#868D97]">
                      <span>Densità Pixel:</span>
                      <strong className="text-white font-medium tabular-nums">{fmt(compResA.pixelM2)} px/m²</strong>
                    </div>
                    <div className="flex justify-between text-[#868D97]">
                      <span>Totale Pixel Schermo:</span>
                      <strong className="text-white font-medium tabular-nums">{fmt(opticalConsulting.totalPixelsClient)} px</strong>
                    </div>
                    {opticalConsulting.isClientPitchOverkill && (
                      <div className="flex justify-between text-[#FDB022] font-medium pt-0.5 border-t border-[#1A2028]">
                        <span>Pixel Invisibili (Spreco):</span>
                        <span className="tabular-nums">+{fmt(opticalConsulting.wastedPixelsCount)} px ({opticalConsulting.wastedPixelsPercent}%)</span>
                      </div>
                    )}
                  </div>

                  {/* Dettagli Tecnici Completi se non sintetico */}
                  {!syntheticMode && (
                    <div className="pt-2 border-t border-[#1A2028] space-y-1.5 text-xs">
                      <div className="flex justify-between text-[#868D97]">
                        <span>Package / Diodi:</span>
                        <strong className="text-white font-medium">{limitA.chipType}</strong>
                      </div>
                      <div className="flex justify-between text-[#868D97]">
                        <span>Potenza Max:</span>
                        <strong className="text-[#F87171] font-medium tabular-nums">{compResA.pMaxWmq} W/m²</strong>
                      </div>
                      <div className="flex justify-between text-[#868D97]">
                        <span>Potenza Media (30% APL):</span>
                        <strong className="text-white font-medium tabular-nums">{compResA.pMedioWmq} W/m²</strong>
                      </div>
                    </div>
                  )}

                  {/* Canone Noleggio Operativo 24 Mesi Stimato */}
                  <div className="p-3 rounded-lg bg-[#10141D] border border-[#1A2028] text-center space-y-0.5">
                    <span className="text-[10px] text-[#868D97] uppercase tracking-wider block font-medium">
                      Canone Locazione Stimata (24 Mesi)
                    </span>
                    <div className="text-lg font-semibold text-white tabular-nums tracking-tight">
                      ~{fmt(opticalConsulting.clientMonthlyRentalEur)} €<span className="text-xs text-[#868D97] font-normal"> / mese</span>
                    </div>
                    <span className="text-[11px] text-[#868D97] tabular-nums block">
                      Elettricità: ~{fmt(compResA.annualCostEur / 12)} € / mese ({fmt(compResA.annualCostEur)} €/anno)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setPitchMm(compPitchA);
                      setSizingMode('cabinet');
                    }}
                    className="w-full py-2 rounded-lg bg-[#10141D] hover:bg-[#161F30] border border-[#1A2028] text-[#E8EDF2] font-medium text-xs transition-colors cursor-pointer"
                  >
                    Seleziona Passo P{compPitchA}
                  </button>
                </div>

                {/* Schermo B */}
                <div className="p-4 rounded-xl border border-[#163826] bg-[#0D1E16]/30 space-y-3.5 text-xs">
                  <div className="flex justify-between items-center text-[#12B76A] font-semibold">
                    <div className="flex items-center space-x-1.5">
                      <span>Display B · Proposto dal Sistema</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#0D2818] text-[#34D399] border border-[#163826] font-medium">
                      Consigliato: P{opticalConsulting.recommendedPitchMm}
                    </span>
                  </div>

                  <div>
                    <label className="text-xs text-[#868D97] block mb-1">Passo Pixel (Pitch):</label>
                    <select
                      value={compPitchB.toString()}
                      onChange={(e) => {
                        const newP = parseFloat(e.target.value);
                        setCompPitchB(newP);
                        const maxB = getMaxNitsForPitch(newP).maxNits;
                        if (compNitsB > maxB) setCompNitsB(maxB);
                      }}
                      className="w-full p-2 rounded-lg bg-[#10141D] border border-[#1A2028] text-white outline-none font-medium text-xs"
                    >
                      <option value="2.6">P2.6 mm (max 4.500 nit - Mini-LED)</option>
                      <option value="2.9">P2.9 mm (max 5.000 nit - SMD1515)</option>
                      <option value="3.91">P3.91 mm (max 6.500 nit - SMD1921)</option>
                      <option value="4.81">P4.81 mm (max 7.000 nit - SMD1921)</option>
                      <option value="6.67">P6.67 mm (fino a 12.000 nit - Gold Wire)</option>
                      <option value="8">P8.0 mm (fino a 12.000 nit - Gold Wire)</option>
                      <option value="10">P10.0 mm (fino a 12.000 nit - Gold Wire)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs text-[#868D97] mb-1">
                      <span>Luminosità Garantita:</span>
                      <div className="flex items-center space-x-1.5">
                        {effectiveNitsB >= 12000 ? (
                          <span className="text-[10px] text-[#FDB022] bg-[#2E200B] px-1.5 py-0.5 rounded border border-[#5E3F10] font-medium">
                            Gold Wire 12.000 nit
                          </span>
                        ) : effectiveNitsB >= 10000 ? (
                          <span className="text-[10px] text-[#34D399] bg-[#0D2818] px-1.5 py-0.5 rounded border border-[#163826] font-medium">
                            High-Power DOOH
                          </span>
                        ) : syncNits && effectiveNitsB === effectiveNitsA ? (
                          <span className="text-[10px] text-[#9AA3AD] bg-[#10141D] px-1.5 py-0.5 rounded border border-[#1A2028]">
                            Pari ad A
                          </span>
                        ) : null}
                        <strong className="text-[#12B76A] font-semibold tabular-nums">{fmt(effectiveNitsB)} nit</strong>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="3000"
                      max={limitB.maxNits}
                      step="250"
                      value={effectiveNitsB}
                      onChange={(e) => {
                        const val = Math.min(parseInt(e.target.value, 10), limitB.maxNits);
                        setCompNitsB(val);
                        if (val !== effectiveNitsA) {
                          setSyncNits(false);
                        }
                      }}
                      className="w-full custom-slider"
                    />
                    <div className="flex justify-between items-center text-[10px] text-[#868D97] pt-0.5 tabular-nums">
                      <span>3.000 nit</span>
                      <span>10.000 nit</span>
                      <span className="text-[#12B76A] font-medium">
                        {limitB.maxNits >= 12000 ? 'Gold Wire 12.000 nit' : `Max: ${fmt(limitB.maxNits)} nit`}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                      {compPitchB !== opticalConsulting.recommendedPitchMm && (
                        <button
                          type="button"
                          onClick={() => {
                            setCompPitchB(opticalConsulting.recommendedPitchMm);
                            setCompNitsB(6000);
                            setSyncNits(false);
                          }}
                          className="px-2.5 py-1 rounded text-xs bg-[#0D2818] text-[#34D399] hover:bg-[#133D24] border border-[#163826] font-semibold cursor-pointer"
                        >
                          Applica Consigliato (P{opticalConsulting.recommendedPitchMm})
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setSyncNits(true);
                          setCompNitsB(effectiveNitsA);
                        }}
                        className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                          syncNits || effectiveNitsB === effectiveNitsA
                            ? 'bg-[#0D2818] text-[#34D399] border border-[#163826] font-semibold'
                            : 'bg-[#10141D] text-[#868D97] hover:text-white border border-[#1A2028]'
                        }`}
                      >
                        = Stessi Nit ({fmt(effectiveNitsA)})
                      </button>
                    </div>

                    {compPitchB === opticalConsulting.recommendedPitchMm && (
                      <div className="mt-2 p-2 rounded bg-[#0D2818]/40 border border-[#163826] text-[11px] text-[#34D399]">
                        ✅ <strong>100% Retina Blended:</strong> A {opticalConsulting.lineOfSightDistM}m di distanza i pixel sono fusi otticamente. I diodi lavorano a riposo ({compResB.sforzoPercent}% sforzo) garantendo 6.000+ nit stabili per anni.
                      </div>
                    )}
                  </div>

                  {/* Dettagli Densità e Totale Pixel */}
                  <div className="p-2.5 rounded-lg bg-[#10141D] border border-[#163826] space-y-1 text-[11px]">
                    <div className="flex justify-between text-[#868D97]">
                      <span>Densità Pixel:</span>
                      <strong className="text-white font-medium tabular-nums">{fmt(compResB.pixelM2)} px/m²</strong>
                    </div>
                    <div className="flex justify-between text-[#868D97]">
                      <span>Totale Pixel Schermo:</span>
                      <strong className="text-white font-medium tabular-nums">{fmt(opticalConsulting.totalPixelsRecommended)} px</strong>
                    </div>
                    <div className="flex justify-between text-[#34D399] font-medium pt-0.5 border-t border-[#163826]">
                      <span>Efficienza Ottica:</span>
                      <span>100% Pixel Utili e Distinguibili</span>
                    </div>
                  </div>

                  {/* Dettagli Tecnici Completi */}
                  {!syntheticMode && (
                    <div className="pt-2 border-t border-[#1A2028] space-y-1.5 text-xs">
                      <div className="flex justify-between text-[#868D97]">
                        <span>Package / Diodi:</span>
                        <strong className="text-white font-medium">{limitB.chipType}</strong>
                      </div>
                      <div className="flex justify-between text-[#868D97]">
                        <span>Potenza Max:</span>
                        <strong className="text-[#12B76A] font-medium tabular-nums">{compResB.pMaxWmq} W/m²</strong>
                      </div>
                      <div className="flex justify-between text-[#868D97]">
                        <span>Potenza Media (30% APL):</span>
                        <strong className="text-white font-medium tabular-nums">{compResB.pMedioWmq} W/m²</strong>
                      </div>
                    </div>
                  )}

                  {/* Canone Noleggio Operativo 24 Mesi Stimato */}
                  <div className="p-3 rounded-lg bg-[#10141D] border border-[#163826] text-center space-y-0.5">
                    <span className="text-[10px] text-[#34D399] uppercase tracking-wider block font-semibold">
                      Canone Locazione Stimata (24 Mesi)
                    </span>
                    <div className="text-lg font-bold text-[#12B76A] tabular-nums tracking-tight">
                      ~{fmt(opticalConsulting.recommendedMonthlyRentalEur)} €<span className="text-xs text-[#868D97] font-normal"> / mese</span>
                    </div>
                    <span className="text-[11px] text-[#12B76A] font-medium tabular-nums block">
                      Elettricità: ~{fmt(compResB.annualCostEur / 12)} € / mese ({fmt(compResB.annualCostEur)} €/anno)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setPitchMm(compPitchB);
                      setSizingMode('cabinet');
                    }}
                    className="w-full py-2 rounded-lg bg-[#12B76A] hover:bg-[#0E9F5D] text-white font-semibold text-xs transition-colors cursor-pointer shadow-sm"
                  >
                    Seleziona Passo P{compPitchB}
                  </button>
                </div>
              </div>

              {/* Box Verdetto Sintetico & Business Case Locazione 24 Mesi */}
              <div className="p-4 rounded-xl bg-[#07090C] border border-[#1A2028] space-y-3.5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-[#12B76A]"></span>
                    <span className="text-xs font-semibold text-white uppercase tracking-wider">
                      {syntheticMode ? 'Sintesi Risparmio & Verdetto Ottico (RFP 24 Mesi)' : 'Verdetto Fotometrico & TCO Locazione Operativa'}
                    </span>
                  </div>

                  {opticalConsulting.total24MonthSavingsEur > 0 && (
                    <span className="text-xs px-3 py-1 rounded-full bg-[#0D2818] text-[#34D399] font-bold border border-[#163826] self-start sm:self-auto tabular-nums">
                      Risparmio Netto Totale 24 Mesi: +{fmt(opticalConsulting.total24MonthSavingsEur)} €
                    </span>
                  )}
                </div>

                {/* Griglia Riepilogo Risparmio 24 Mesi */}
                {opticalConsulting.total24MonthSavingsEur > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-[#10141D] border border-[#163826]">
                    <div className="space-y-0.5 text-center sm:text-left">
                      <span className="text-[10px] text-[#868D97] uppercase font-medium">Risparmio Canone Noleggio</span>
                      <div className="text-base font-bold text-[#34D399] tabular-nums">
                        +{fmt(opticalConsulting.monthlyRentalSavingsEur * 24)} €
                      </div>
                      <span className="text-[10px] text-[#868D97]">+{fmt(opticalConsulting.monthlyRentalSavingsEur)} € al mese per 24 mesi</span>
                    </div>

                    <div className="space-y-0.5 text-center sm:text-left">
                      <span className="text-[10px] text-[#868D97] uppercase font-medium">Risparmio Energia Elettrica</span>
                      <div className="text-base font-bold text-[#34D399] tabular-nums">
                        +{fmt(opticalConsulting.deltaAnnualEnergyCostEur * 2)} €
                      </div>
                      <span className="text-[10px] text-[#868D97]">+{fmt(opticalConsulting.deltaAnnualEnergyCostEur)} €/anno a catodo comune</span>
                    </div>

                    <div className="space-y-0.5 text-center sm:text-left border-t sm:border-t-0 sm:border-l border-[#1A2028] pt-2 sm:pt-0 sm:pl-3">
                      <span className="text-[10px] text-[#12B76A] uppercase font-bold">Vantaggio Economico Totale</span>
                      <div className="text-lg font-extrabold text-[#12B76A] tabular-nums">
                        +{fmt(opticalConsulting.total24MonthSavingsEur)} €
                      </div>
                      <span className="text-[10px] text-[#868D97]">Qualità visiva identica, TCO ottimizzato</span>
                    </div>
                  </div>
                )}

                <p className="text-sm text-[#E8EDF2] leading-relaxed">
                  {opticalConsulting.scientificVerdict}
                </p>

                {/* Selettore spiegazione scientifica / dettagli tecnici */}
                <div className="pt-2 border-t border-[#1A2028] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowDeepScientific(!showDeepScientific)}
                    className="text-[#12B76A] hover:text-[#0E9F5D] flex items-center space-x-1 cursor-pointer font-medium transition-colors"
                  >
                    {showDeepScientific ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    <span>{showDeepScientific ? 'Nascondi approfondimento scientifico' : 'Approfondimento: Criterio di Snellen, 1 Arcmin e Saturazione Termica'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSyntheticMode(!syntheticMode)}
                    className="text-[#868D97] hover:text-white underline cursor-pointer transition-colors"
                  >
                    {syntheticMode ? 'Mostra tutti i dati tecnici (W/m², pixel, correnti)' : 'Torna alla vista sintetica'}
                  </button>
                </div>

                {/* Spiegazione Scientifica Espandibile */}
                {showDeepScientific && (
                  <div className="p-3.5 rounded-lg bg-[#10141D] border border-[#1A2028] text-xs text-[#E8EDF2] leading-relaxed space-y-3">
                    <div className="flex items-center space-x-2 text-white font-semibold">
                      <AlertCircle className="w-4 h-4 text-[#12B76A] flex-shrink-0" />
                      <span>Limiti dei semiconduttori, thermal droop e tecnologia Gold Wire</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="p-2.5 rounded bg-[#07090C] border border-[#1A2028] space-y-1">
                        <strong className="text-white block">1. Perché il P3.91 non supera 6.500 nit:</strong>
                        <p className="text-[#9AA3AD]">
                          Un P3.91 ospita <strong>65.410 pixel/m²</strong> (196.230 micro-diodi SMD1921). Con una tale densità, il calore della giunzione non può essere dissipato sul PCB: superare 6.500 nit innalza la temperatura oltre i <strong>115°C</strong>, provocando <em>Thermal Droop</em> irreversibile, perdita di luminosità e carbonizzazione della resina.
                        </p>
                      </div>
                      <div className="p-2.5 rounded bg-[#07090C] border border-[#1A2028] space-y-1">
                        <strong className="text-[#12B76A] block">2. Dissipazione &amp; Catodo Comune (P8 / P6.67):</strong>
                        <p className="text-[#9AA3AD]">
                          Il P8 ha solo <strong>15.625 pixel/m²</strong> e alloggia chip generosi <strong>SMD2727/SMD3535</strong> con ampie pad termiche di saldatura al rame.
                          Alimentato a <strong>Catodo Comune (2.8V per il rosso)</strong>, elimina le dispersioni parassite garantendo oltre 10.000 nit con temperature d&apos;esercizio controllate.
                        </p>
                      </div>
                      <div className="p-2.5 rounded bg-[#2E200B]/50 border border-[#5E3F10] space-y-1 sm:col-span-2">
                        <strong className="text-[#FDB022] flex items-center space-x-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#FDB022]" />
                          <span>3. Perché con la tecnologia Gold Wire si raggiungono i 12.000 nit?</span>
                        </strong>
                        <p className="text-[#E8EDF2]">
                          I moduli outdoor VeroLED Ultra-High Brightness impiegano fili di legatura die-to-pad in <strong>oro puro al 99.99% (Gold Wire Bonding)</strong>. A differenza delle legature economiche in rame o alluminio, l&apos;oro non si ossida per umidità, non crea micro-fratture per shock termico e consente di pilotare correnti continue senza delaminazione.
                          Questo consente ai chip di raggiungere <strong>12.000 nit stabili</strong>, mantenendo una visibilità cristallina e un contrasto assoluto anche sotto irraggiamento solare zenitale a oltre 100.000 lux.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (

            <>
              {/* Passo Pixel & Target Nits Operativi Outdoor */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-[#07090C] border border-[#1A2028]">
                  <div className="flex items-center space-x-2">
                    <Sun className="w-4 h-4 text-[#F59E0B] flex-shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-white flex items-center space-x-1.5">
                        <span>Luminosità Operativa Outdoor:</span>
                        <span className="text-[#34D399] font-mono font-bold">{fmt(targetOutdoorNits)} Nit</span>
                      </div>
                      <div className="text-[10px] text-[#868D97]">Standard di calcolo per confrontare lo sforzo dei semiconduttori</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {[4000, 5000, 6000].map((nitVal) => (
                      <button
                        key={nitVal}
                        type="button"
                        onClick={() => useSimulatorStore.getState().setTargetOutdoorNits(nitVal)}
                        className={`px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                          targetOutdoorNits === nitVal
                            ? 'bg-[#12B76A] text-white font-bold shadow-sm'
                            : 'bg-[#10141D] text-[#9AA3AD] border border-[#1A2028] hover:text-white'
                        }`}
                      >
                        {fmt(nitVal)} Nit
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-[#868D97] uppercase tracking-wide">
                      Passo Pixel (Pitch) &amp; Sforzo Semiconduttore:
                    </label>
                    <span className="text-[10px] text-[#868D97]">
                      % = carico termico per erogare {fmt(targetOutdoorNits)} Nit
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {PIXEL_PITCH_PRESETS.map((p) => {
                      const pEst = stimaPotenzaDaPassoNit(p, targetOutdoorNits);
                      const isSelected = pitchMm === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPitchMm(p)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center space-x-1.5 ${
                            isSelected
                              ? 'border border-[#12B76A] bg-[#0D2818] text-[#34D399] font-semibold shadow-sm'
                              : 'border border-[#1A2028] bg-[#10141D] text-[#E8EDF2] hover:border-[#12B76A]'
                          }`}
                        >
                          <span>P{p} mm</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                              pEst.sforzoPercent >= 90
                                ? isSelected
                                  ? 'bg-[#7F1D1D] text-[#FCA5A5]'
                                  : 'bg-[#3D1414] text-[#F87171]'
                                : pEst.sforzoPercent >= 65
                                ? isSelected
                                  ? 'bg-[#78350F] text-[#FDE68A]'
                                  : 'bg-[#2E200B] text-[#FBBF24]'
                                : isSelected
                                ? 'bg-[#163826] text-[#A7F3D0]'
                                : 'bg-[#0D2818] text-[#34D399]'
                            }`}
                          >
                            {pEst.sforzoPercent}%
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Banner esplicativo sforzo e thermal droop */}
                {hardwareEstimate.sforzoPercent >= 90 ? (
                  <div className="p-2.5 rounded-lg bg-[#3D1414]/60 border border-[#7F1D1D] text-[11px] text-[#FCA5A5] flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-[#F87171] flex-shrink-0" />
                    <span>
                      <strong>Sforzo estremo ({hardwareEstimate.sforzoPercent}%) per erogare {fmt(targetOutdoorNits)} Nit:</strong> I micro-diodi {hardwareEstimate.tecnologiaChip.split(' ')[0]} lavorano a saturazione termica (Tj &gt; 90°C). Il severo <em>Thermal Droop</em> abbatte l&apos;efficienza a {hardwareEstimate.efficienzaLmPerW} lm/W ({hardwareEstimate.pMaxWmq} W/m² max), richiedendo fino al triplo di potenza rispetto a un passo a grana generosa.
                    </span>
                  </div>
                ) : hardwareEstimate.sforzoPercent >= 65 ? (
                  <div className="p-2.5 rounded-lg bg-[#2E200B]/60 border border-[#78350F] text-[11px] text-[#FDE68A] flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-[#FBBF24] flex-shrink-0" />
                    <span>
                      <strong>Sforzo intermedio ({hardwareEstimate.sforzoPercent}%) a {fmt(targetOutdoorNits)} Nit:</strong> Diodi compatti {hardwareEstimate.tecnologiaChip.split(' ')[0]} con resa media ({hardwareEstimate.efficienzaLmPerW} lm/W, {hardwareEstimate.pMaxWmq} W/m² max). Consumo doppio rispetto a P10.
                    </span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-[#0D2818]/60 border border-[#163826] text-[11px] text-[#A7F3D0] flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-[#34D399] flex-shrink-0" />
                    <span>
                      <strong>Chip generoso a riposo (Sforzo {hardwareEstimate.sforzoPercent}% a {fmt(targetOutdoorNits)} Nit):</strong> Ampia camera ottica, minima corrente If e temperatura bassa (Tj &lt; 45°C). Massima resa ({hardwareEstimate.efficienzaLmPerW} lm/W, {hardwareEstimate.pMaxWmq} W/m² max): consuma solo una frazione rispetto a un passo fine!
                    </span>
                  </div>
                )}
              </div>

              {/* Format Selector if in Cabinet mode */}
              {sizingMode === 'cabinet' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#868D97] mb-2 uppercase tracking-wide">
                      Formato Cabinet Modulare:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {CABINET_FORMATS.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setFormatId(f.id)}
                          className={`p-3 rounded-lg text-left text-xs border transition-colors cursor-pointer ${
                            formatId === f.id
                              ? 'border-[#12B76A] bg-[#0D2818] text-white'
                              : 'border-[#1A2028] bg-[#10141D] text-[#9AA3AD] hover:border-[#2D3748]'
                          }`}
                        >
                          <div className="font-semibold text-white">Cabinet {f.name}</div>
                          <div className="text-xs text-[#868D97] mt-0.5">Peso: ~{f.weightKg} kg/cabinet</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Interactive 2D Canvas con callback APL in tempo reale */}
                  <CabinetCanvas onLiveAplUpdate={setLiveApl} />
                </div>
              )}

              {/* Dimension Inputs Mode */}
              {sizingMode === 'dimensions' && (
                <div className="space-y-4 pt-1 text-xs">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[#868D97] mb-1 font-medium">Larghezza Base (m):</label>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        max="50"
                        value={dimensions.widthM}
                        onChange={(e) => setDimensioniMetri(parseFloat(e.target.value) || 1, dimensions.heightM)}
                        className="w-full p-2.5 rounded-lg bg-[#10141D] border border-[#1A2028] text-white text-base focus:border-[#12B76A] outline-none tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[#868D97] mb-1 font-medium">Altezza (m):</label>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        max="30"
                        value={dimensions.heightM}
                        onChange={(e) => setDimensioniMetri(dimensions.widthM, parseFloat(e.target.value) || 1)}
                        className="w-full p-2.5 rounded-lg bg-[#10141D] border border-[#1A2028] text-white text-base focus:border-[#12B76A] outline-none tabular-nums"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-[#868D97]">
                    La dimensione viene automaticamente mappata sul numero intero di cabinet modulari (Cabinet {format.name}).
                  </p>
                </div>
              )}

              {/* Resolution Inputs Mode */}
              {sizingMode === 'resolution' && (
                <div className="space-y-4 pt-1 text-xs">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[#868D97] mb-1 font-medium">Pixel Orizzontali:</label>
                      <input
                        type="number"
                        step="32"
                        min="128"
                        value={dimensions.resolutionX}
                        onChange={(e) => setRisoluzionePx(parseInt(e.target.value, 10) || 128, dimensions.resolutionY)}
                        className="w-full p-2.5 rounded-lg bg-[#10141D] border border-[#1A2028] text-white text-base focus:border-[#12B76A] outline-none tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[#868D97] mb-1 font-medium">Pixel Verticali:</label>
                      <input
                        type="number"
                        step="32"
                        min="128"
                        value={dimensions.resolutionY}
                        onChange={(e) => setRisoluzionePx(dimensions.resolutionX, parseInt(e.target.value, 10) || 128)}
                        className="w-full p-2.5 rounded-lg bg-[#10141D] border border-[#1A2028] text-white text-base focus:border-[#12B76A] outline-none tabular-nums"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-[#868D97]">
                    In base al passo P{pitchMm} mm, la matrice pixel calcola la dimensione fisica corrispondente.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Calculated Summary Panel con APL e CONSUMI IN TEMPO REALE */}
        <div className="bg-[#0D1117] p-5 rounded-xl border border-[#1A2028] shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            {/* 1. SEZIONE APL IN TEMPO REALE (DIRETTAMENTE SOPRA I CONSUMI) */}
            <div className="p-3 rounded-lg bg-[#070A0F] border border-[#1B2536] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#12B76A] animate-pulse" />
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider">APL Istantaneo Video</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                  liveApl > 60
                    ? 'bg-[#3E1A08] text-[#FB923C] border border-[#7C2D12]'
                    : liveApl > 35
                    ? 'bg-[#2E230B] text-[#FBBF24] border border-[#78350F]'
                    : 'bg-[#0D2818] text-[#34D399] border border-[#1B4D2E]'
                }`}>
                  {liveApl > 60 ? 'Alto APL (Day/White)' : liveApl > 35 ? 'Medio APL' : 'Basso APL (Dark)'}
                </span>
              </div>

              {/* Percentuale APL Grande e Barra di Progresso */}
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black tabular-nums tracking-tight text-white">
                  {liveApl.toFixed(1)} <span className="text-xs font-semibold text-[#868D97]">%</span>
                </span>
                <span className="text-[11px] text-[#9AA3AD] font-medium">
                  {liveApl > 60 ? '+45% impatto termico' : liveApl < 25 ? 'Ottimizzazione -40%' : 'Consumo nominale'}
                </span>
              </div>

              <div className="w-full h-2 rounded-full bg-[#131B2A] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${Math.min(100, Math.max(5, liveApl))}%`,
                    background: liveApl > 60
                      ? 'linear-gradient(90deg, #F59E0B, #EF4444)'
                      : liveApl > 35
                      ? 'linear-gradient(90deg, #10B981, #F59E0B)'
                      : 'linear-gradient(90deg, #059669, #10B981)',
                  }}
                />
              </div>
            </div>

            {/* 2. CONSUMI IN TEMPO REALE (DIRETTAMENTE SOTTO L'APL) */}
            <div className="p-3 rounded-lg bg-[#070A0F] border border-[#1B2536] space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Zap className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider">Consumo in Tempo Reale</span>
                </div>
                <div className="flex items-center space-x-1.5 text-[10px]">
                  <span className="text-[#34D399] font-mono">Max {pMaxWmq} W/m²</span>
                  <span className="text-[#868D97] font-mono">@ {fmt(targetOutdoorNits)} nit</span>
                  <span className="text-[#868D97] font-mono">· CEI 64-8</span>
                </div>
              </div>

              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-black tabular-nums tracking-tight text-[#38BDF8]">
                    {livePowerKw < 10 ? fmt(Math.round(livePowerKw * 1000)) : livePowerKw.toFixed(2)}
                  </span>
                  <span className="text-sm font-semibold text-[#9AA3AD] ml-1">
                    {livePowerKw < 10 ? 'W' : 'kW'}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-[#868D97]">Specifico:</div>
                  <div className="text-xs font-semibold text-white tabular-nums">
                    {Math.round(livePowerWmq)} W/m²
                  </div>
                </div>
              </div>

              {/* Indicatore di sforzo termico e resa fotometrica */}
              <div className="flex items-center justify-between pt-0.5 text-[10px]">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[#868D97]">Sforzo Chip:</span>
                  <span
                    className={`px-1.5 py-0.5 rounded font-mono font-bold border ${
                      hardwareEstimate.sforzoPercent >= 90
                        ? 'bg-[#3D1414] text-[#F87171] border-[#7F1D1D]'
                        : hardwareEstimate.sforzoPercent >= 65
                        ? 'bg-[#2E200B] text-[#FBBF24] border-[#78350F]'
                        : 'bg-[#0D2818] text-[#34D399] border-[#163826]'
                    }`}
                  >
                    {hardwareEstimate.sforzoPercent}%
                  </span>
                </div>
                <span className="text-[#868D97] font-mono">
                  Resa: <strong className="text-[#E8EDF2]">{hardwareEstimate.efficienzaLmPerW} lm/W</strong>
                </span>
              </div>

              {/* Griglia 3 metriche sub-energetiche */}
              <div className="grid grid-cols-3 gap-1.5 pt-1 text-[11px]">
                <div className="p-1.5 rounded bg-[#0D1117] border border-[#161F2E]">
                  <div className="text-[9px] text-[#868D97] uppercase tracking-wide">Trifase 400V</div>
                  <div className="font-semibold text-white tabular-nums mt-0.5">{liveCurrentAmp.toFixed(1)} A</div>
                </div>
                <div className="p-1.5 rounded bg-[#0D1117] border border-[#161F2E]">
                  <div className="text-[9px] text-[#868D97] uppercase tracking-wide">Costo Ora</div>
                  <div className="font-semibold text-[#34D399] tabular-nums mt-0.5">€ {liveHourlyCostEur.toFixed(2)}</div>
                </div>
                <div className="p-1.5 rounded bg-[#0D1117] border border-[#161F2E]">
                  <div className="text-[9px] text-[#868D97] uppercase tracking-wide">Proiez. Anno</div>
                  <div className="font-semibold text-white tabular-nums mt-0.5">€ {fmt(liveAnnualCostEur)}</div>
                </div>
              </div>
            </div>

            {/* 3. RIEPILOGO PARAMETRI FISICI & MECCANICI */}
            <div className="space-y-1.5 text-xs pt-1 border-t border-[#1A2028]">
              <div className="text-[10px] font-bold text-[#868D97] uppercase tracking-wider pb-1">
                Specifiche Schermo
              </div>
              <div className="flex justify-between py-1 border-b border-[#161F30]">
                <span className="text-[#868D97]">Superficie:</span>
                <span className="text-white font-semibold tabular-nums">{dimensions.areaM2.toFixed(2)} m² ({dimensions.widthM.toFixed(1)}×{dimensions.heightM.toFixed(1)}m)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#161F30]">
                <span className="text-[#868D97]">Totale Cabinet:</span>
                <span className="text-[#12B76A] font-semibold tabular-nums">
                  {dimensions.totalCabinets} pz ({modulesW} col × {modulesH} righe)
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#161F30]">
                <span className="text-[#868D97]">Passo Pixel:</span>
                <span className="text-white font-semibold tabular-nums text-right">
                  P{pitchMm} mm ({hardwareEstimate.tecnologiaChip.split(' ')[0]} · Sforzo {hardwareEstimate.sforzoPercent}% · max {pMaxWmq} W/m²)
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#161F30]">
                <span className="text-[#868D97]">Risoluzione Totale:</span>
                <span className="text-white font-semibold tabular-nums">
                  {dimensions.resolutionX} × {dimensions.resolutionY} px
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#161F30]">
                <span className="text-[#868D97]">Totale Diodi LED:</span>
                <span className="text-[#38BDF8] font-bold tabular-nums">
                  {fmt(dimensions.resolutionX * dimensions.resolutionY)} SMD
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#868D97]">Peso Stimato:</span>
                <span className="text-[#E8EDF2] tabular-nums">~{dimensions.weightKg} kg</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={nextStep}
            className="w-full py-3 rounded-lg bg-[#12B76A] hover:bg-[#0E9F5D] text-white font-semibold text-xs tracking-wider flex items-center justify-center space-x-2 transition-colors shadow-sm cursor-pointer"
          >
            <span>Continua e Vai all&apos;APL</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
