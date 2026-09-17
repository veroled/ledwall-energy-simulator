'use client';

import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useSimulatorStore, useSimulatorComputed } from '../../store/useSimulatorStore';
import { asset } from '../../config/paths';
import { stimaPotenzaDaPassoNit, calcolaPotenzaWmq, calcolaProfiloEnergetico, datoCatalogo, passiDelTier, stessoPasso, tierName, TIERS, PASSI_CATALOGO } from '../../core/physics';
import { analizzaVideoApl, caricaFrameFoto, aplDaFrames, type FitMode } from '../../core/apl-engine';
import { RecommendationBanner } from './RecommendationBanner';
import { ContentPreview, type PreviewSource } from './ContentPreview';
import { WizardFooter } from '../wizard/WizardFooter';
import {
  Upload,
  CheckCircle2,
  Play,
  Zap,
  Sun,
  Eye,
  Power,
  ArrowUpFromLine,
  Monitor,
  AlertTriangle,
  FileText,
  LayoutList,
  Settings2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const n = (v: number, d = 0) => v.toLocaleString('it-IT', { maximumFractionDigits: d, minimumFractionDigits: d, useGrouping: 'always' } as Intl.NumberFormatOptions);

const subscribeNoop = () => () => {};
const useMounted = () => useSyncExternalStore(subscribeNoop, () => true, () => false);

const SIZE_PRESETS = [
  { w: 4, h: 2 },
  { w: 6, h: 3 },
  { w: 8, h: 4 },
  { w: 10, h: 5 },
];

const SAMPLES = [
  { file: 'file-3.mp4', label: 'Spot showroom (campione)', button: 'Spot scuro', fallbackApl: 23 },
  { file: 'file-10.mp4', label: 'Kinetic wall (campione)', button: 'Spot chiaro', fallbackApl: 50 },
];

const BASE_HEIGHT_PRESETS = [
  { h: 0, label: '0 m · a terra' },
  { h: 3, label: '3 m · vetrina' },
  { h: 5, label: '5 m · palo' },
  { h: 10, label: '10 m · facciata' },
  { h: 20, label: '20 m · tetto' },
];

const DISTANCE_PRESETS = [
  { d: 5, label: '5 m · piazza' },
  { d: 10, label: '10 m · strada' },
  { d: 20, label: '20 m · viale' },
  { d: 40, label: '40 m · autostrada' },
];

export const ExpressSimulator: React.FC = () => {
  const {
    pitchMm,
    tier: storedTier,
    modulesW,
    modulesH,
    targetOutdoorNits,
    groundViewingDistM,
    installHeightM,
    aplPercent,
    aplSource,
    videoFileName,
    operatingHoursDay,
    tariffEurKwh,
    liveLumDiurna,
    hasStandby,
    setPitchMm,
    setTier,
    setFormatId,
    setDimensioniMetri,
    setTargetOutdoorNits,
    setGroundViewingDistM,
    setInstallHeightM,
    setAplPercent,
    setSchedule,
    setTariffRate,
    setStep,
  } = useSimulatorStore();

  const { dimensions, profile: liveProfile, alternative, pMax, pStandby } = useSimulatorComputed();

  const mounted = useMounted();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [uploadPreview, setUploadPreview] = useState<PreviewSource | null>(null);
  const [fit, setFit] = useState<FitMode>('cover');
  // Schermo nero da software: i LED sono spenti ma alimentatori, schede e ricevitori restano accesi
  const [softwareOff, setSoftwareOff] = useState(false);
  // Frame campionati del contenuto analizzato: l'APL si ricalcola su questi a ogni cambio di formato o adattamento
  const [analysis, setAnalysis] = useState<{ frames: HTMLCanvasElement[]; source: 'video' | 'foto'; name: string } | null>(null);
  const uploadUrlRef = useRef<string | null>(null);

  // Il file caricato resta in memoria solo per l'anteprima: si libera al cambio e all'uscita
  const replaceUploadPreview = (next: PreviewSource | null) => {
    if (uploadUrlRef.current) URL.revokeObjectURL(uploadUrlRef.current);
    uploadUrlRef.current = next?.url ?? null;
    setUploadPreview(next);
  };

  useEffect(() => () => {
    if (uploadUrlRef.current) URL.revokeObjectURL(uploadUrlRef.current);
  }, []);

  useEffect(() => {
    // La modalità express ragiona in metri interi su cabinet 1000×1000
    setFormatId('1000x1000');
  }, [setFormatId]);

  const tier = storedTier ?? 'gold';
  const tierLabel = tierName(tier);
  // Tetto di nit della combinazione Selection × passo: dal listino, oppure assente (mai preso in prestito)
  const datoScelto = datoCatalogo(tier, pitchMm);
  const datoMancante = datoScelto === null;
  const nitsOverLimit = datoScelto !== null && targetOutdoorNits > datoScelto.maxNits;
  const configNonValida = datoMancante || nitsOverLimit;
  // Lo slider arriva al nit più alto che la Selection eroga a listino, non oltre
  const nitSliderMax = Math.max(3000, ...passiDelTier(tier).map((r) => r.maxNits));

  const analyzeFile = async (file: File) => {
    setIsProcessing(true);
    setProgress(0);
    setAnalysis(null);
    setAnalysisError(null);
    if (file.type.startsWith('video/') || file.type.startsWith('image/')) {
      replaceUploadPreview({ kind: file.type.startsWith('video/') ? 'video' : 'image', url: URL.createObjectURL(file) });
    }
    try {
      if (file.type.startsWith('video/')) {
        const res = await analizzaVideoApl(file, (p) => setProgress(p));
        setAnalysis({ frames: res.frames, source: 'video', name: file.name });
      } else if (file.type.startsWith('image/')) {
        const frame = await caricaFrameFoto(file);
        setAnalysis({ frames: [frame], source: 'foto', name: file.name });
      }
    } catch (err) {
      console.warn('Analisi contenuto fallita, resta lo slider manuale:', err);
      setAnalysisError(err instanceof Error ? err.message : 'Analisi non riuscita: imposta l\'APL manualmente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) analyzeFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) analyzeFile(file);
  };

  const loadSample = async (name: string, label: string, fallbackApl: number) => {
    replaceUploadPreview(null);
    // Il nome del campione va nello store subito: l'anteprima parte mentre l'analisi gira
    setAplPercent(fallbackApl, 'video', label);
    setIsProcessing(true);
    setProgress(0);
    setAnalysis(null);
    setAnalysisError(null);
    try {
      // URL diretto: evita di scaricare il file in memoria e funziona anche dove i blob video non vengono decodificati
      const res = await analizzaVideoApl(asset(`/samples/${name}`), (p) => setProgress(p));
      setAnalysis({ frames: res.frames, source: 'video', name: label });
    } catch (err) {
      console.warn('Campione non analizzabile, uso il valore misurato in precedenza:', err);
      setAplPercent(fallbackApl, 'video', label);
    } finally {
      setIsProcessing(false);
    }
  };

  // Stessa misura dell'anteprima: contenuto inquadrato nel rapporto del LEDwall, ritaglio o bande nere compresi
  const framed = useMemo(
    () => (analysis ? aplDaFrames(analysis.frames, modulesW, modulesH, fit) : null),
    [analysis, modulesW, modulesH, fit]
  );

  useEffect(() => {
    if (analysis && framed) setAplPercent(framed.averageAplPercent, analysis.source, analysis.name);
  }, [analysis, framed, setAplPercent]);

  const aplRange =
    framed && analysis && analysis.frames.length > 1 ? { min: framed.minAplPercent, max: framed.maxAplPercent } : null;

  const goToWizard = (step: number) => {
    setStep(step);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#07090C] flex items-center justify-center text-xs font-medium text-[#9AA3AD]">
        Inizializzazione simulatore...
      </div>
    );
  }

  const standbyWmq = hasStandby ? pStandby : 0;
  const profile = softwareOff
    ? calcolaProfiloEnergetico(dimensions.areaM2, 0, 0, 0, operatingHoursDay, hasStandby, true, tariffEurKwh, pMax, pStandby)
    : liveProfile;
  const kwIstantanei = (profile.dayPowerWmq * dimensions.areaM2) / 1000;

  const sample = aplSource === 'video' ? SAMPLES.find((s) => s.label === videoFileName) : undefined;
  const previewSource: PreviewSource | null =
    uploadPreview ?? (sample ? { kind: 'video', url: asset(`/samples/${sample.file}`) } : null);
  const wattsForApl = (apl: number) =>
    calcolaPotenzaWmq({ apl: apl / 100, lum: softwareOff ? 0 : liveLumDiurna / 100, pMax, pStandby: standbyWmq }) * dimensions.areaM2;

  return (
    <div className="min-h-screen flex flex-col bg-[#07090C] selection:bg-[#12B76A] selection:text-[#07090C]">
      {/* Header express */}
      <header className="sticky top-0 z-50 bg-[#0D1117] border-b border-[#1A2028]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3 select-none">
            <img src={asset('/img/logo-veroled-white.png')} alt="VEROLED" className="h-6 w-auto object-contain" />
            <span className="text-xs text-[#9AA3AD] font-medium border-l border-[#1A2028] pl-3 hidden sm:inline-block">
              Calcolo Express
            </span>
          </Link>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-full bg-[#0D2818] border border-[#163826] text-[11px] font-medium text-[#34D399] hidden md:flex items-center space-x-1.5">
              <Zap className="w-3 h-3" />
              <span>Una schermata · risultati live</span>
            </span>
            <Link
              href="/"
              onClick={() => goToWizard(0)}
              className="px-3.5 py-1.5 rounded-lg border border-[#1A2028] bg-[#10141D] text-xs font-semibold text-[#E8EDF2] hover:bg-[#161F30] hover:border-[#2D3748] transition-colors flex items-center space-x-1.5"
            >
              <LayoutList className="w-3.5 h-3.5 text-[#9AA3AD]" />
              <span>Wizard completo</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
          {/* Colonna configurazione + risultati */}
          <div className="space-y-5 min-w-0">
            {/* 1. Schermo */}
            <section className="bg-[#0D1117] p-5 rounded-xl border border-[#1A2028] shadow-sm space-y-5">
              <div className="flex items-center space-x-2 text-white font-semibold text-sm">
                <span className="w-5 h-5 rounded-full bg-[#0D2818] border border-[#163826] text-[#34D399] text-[11px] flex items-center justify-center font-bold">1</span>
                <Monitor className="w-4 h-4 text-[#12B76A]" />
                <span>Il tuo LEDwall</span>
              </div>

              {/* Selection: il tetto di nit è del componente montato, cioè della combinazione Selection × passo */}
              <div className="space-y-2">
                <span className="text-xs text-[#868D97] font-medium">Selection VeroLED <span className="text-[#667085]">(qualità dei chip: a parità di passo cambia il tetto di nit)</span></span>
                <div className="flex flex-wrap gap-2">
                  {TIERS.map((t) => {
                    const sel = tier === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTier(t.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center space-x-1.5 ${
                          sel
                            ? 'border border-[#12B76A] bg-[#0D2818] text-[#34D399] font-semibold shadow-sm'
                            : 'border border-[#1A2028] bg-[#10141D] text-[#E8EDF2] hover:border-[#12B76A]'
                        }`}
                      >
                        <span>{t.name}</span>
                        <span className="text-[10px] font-mono text-[#868D97]">{t.wire}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Passo */}
              <div className="space-y-2">
                <span className="text-xs text-[#868D97] font-medium">Passo pixel</span>
                <div className="flex flex-wrap gap-2">
                  {PASSI_CATALOGO.map((p) => {
                    const dato = datoCatalogo(tier, p);
                    const selected = stessoPasso(pitchMm, p);
                    // Gate: selezionabile solo se il listino ha il dato di QUESTA combinazione e arriva ai nit richiesti
                    const reachable = dato !== null && targetOutdoorNits <= dato.maxNits;
                    const est = dato ? stimaPotenzaDaPassoNit(p, targetOutdoorNits, undefined, undefined, undefined, true, dato) : null;
                    const stress = !est ? '' : est.sforzoPercent >= 90 ? 'text-[#F87171]' : est.sforzoPercent >= 65 ? 'text-[#FBBF24]' : 'text-[#34D399]';
                    return (
                      <button
                        key={p}
                        type="button"
                        disabled={!reachable}
                        onClick={() => setPitchMm(p)}
                        title={
                          !dato
                            ? `Dato non disponibile: il listino non ha il tetto di nit del P${p} ${tierLabel}`
                            : !reachable
                            ? `Il P${p} ${tierLabel} si ferma a ${n(dato.maxNits)} nit: non esiste a ${n(targetOutdoorNits)} nit`
                            : `P${p} ${tierLabel}: fino a ${n(dato.maxNits)} nit · ${dato.chip}`
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                          !reachable
                            ? selected
                              ? 'border border-[#F87171] bg-[#2A1111] text-[#F87171] font-semibold cursor-not-allowed'
                              : `border border-[#1A2028] bg-[#0B0E13] text-[#4B5563] cursor-not-allowed ${dato ? 'line-through decoration-[#4B5563]' : ''}`
                            : selected
                            ? 'border border-[#12B76A] bg-[#0D2818] text-[#34D399] font-semibold shadow-sm cursor-pointer'
                            : 'border border-[#1A2028] bg-[#10141D] text-[#E8EDF2] hover:border-[#12B76A] cursor-pointer'
                        }`}
                      >
                        <span>P{p}</span>
                        {!dato ? (
                          <span className="text-[10px] font-mono">n.d.</span>
                        ) : reachable && est ? (
                          <span className={`text-[10px] font-mono ${stress}`}>{est.sforzoPercent}%</span>
                        ) : (
                          <span className="text-[10px] font-mono">max {n(dato.maxNits)}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-[#868D97]">
                  La percentuale è lo sforzo dei chip {tierLabel} a {n(targetOutdoorNits)} nit, cioè quanta parte del tetto di listino di quella combinazione stai usando: cambia con la luminosità e con la Selection, non con il contenuto.
                  {PASSI_CATALOGO.some((p) => { const d = datoCatalogo(tier, p); return d !== null && targetOutdoorNits > d.maxNits; }) && (
                    <> I passi barrati in {tierLabel} non arrivano a {n(targetOutdoorNits)} nit.</>
                  )}
                  {PASSI_CATALOGO.some((p) => datoCatalogo(tier, p) === null) && (
                    <> «n.d.» = dato non disponibile per questa Selection: il listino non ha il tetto di nit di quella combinazione, e non usiamo quello di un&apos;altra.</>
                  )}
                </p>
              </div>

              {/* Dimensioni */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-xs text-[#868D97] font-medium">Dimensioni (base × altezza, metri)</span>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min={1}
                      max={40}
                      step={1}
                      value={modulesW}
                      onChange={(e) => setDimensioniMetri(parseInt(e.target.value || '1', 10), modulesH)}
                      className="w-full px-3 py-2 rounded-lg bg-[#10141D] border border-[#1A2028] text-white text-sm tabular-nums focus:border-[#12B76A] outline-none"
                    />
                    <span className="text-[#868D97] text-sm">×</span>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      step={1}
                      value={modulesH}
                      onChange={(e) => setDimensioniMetri(modulesW, parseInt(e.target.value || '1', 10))}
                      className="w-full px-3 py-2 rounded-lg bg-[#10141D] border border-[#1A2028] text-white text-sm tabular-nums focus:border-[#12B76A] outline-none"
                    />
                    <span className="text-[#868D97] text-xs whitespace-nowrap">m</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {SIZE_PRESETS.map((s) => {
                      const sel = modulesW === s.w && modulesH === s.h;
                      return (
                        <button
                          key={`${s.w}x${s.h}`}
                          type="button"
                          onClick={() => setDimensioniMetri(s.w, s.h)}
                          className={`px-2 py-1 rounded text-[11px] font-medium cursor-pointer transition-colors ${
                            sel ? 'bg-[#0D2818] text-[#34D399] border border-[#163826]' : 'bg-[#10141D] text-[#9AA3AD] border border-[#1A2028] hover:text-white'
                          }`}
                        >
                          {s.w}×{s.h} m
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-[#868D97] tabular-nums">
                    {n(dimensions.areaM2, 0)} m² · {dimensions.totalCabinets} cabinet · {n(dimensions.resolutionX)}×{n(dimensions.resolutionY)} px
                  </p>
                </div>

                {/* Nit */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#868D97] font-medium flex items-center space-x-1.5">
                      <Sun className="w-3.5 h-3.5 text-[#FBBF24]" />
                      <span>Luminosità di picco</span>
                    </span>
                    <span className="text-sm font-semibold text-white tabular-nums">{softwareOff ? '0 nit · spento' : `${n(targetOutdoorNits)} nit`}</span>
                  </div>
                  <input
                    type="range"
                    min={2500}
                    max={nitSliderMax}
                    step={500}
                    value={Math.min(targetOutdoorNits, nitSliderMax)}
                    disabled={softwareOff}
                    onChange={(e) => setTargetOutdoorNits(parseInt(e.target.value, 10))}
                    className={`w-full custom-slider ${softwareOff ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                  />
                  <div className="flex justify-between text-[10px] text-[#868D97]">
                    <span>2.500 · ombra</span>
                    <span>5.000 · outdoor</span>
                    <span>{n(nitSliderMax)} · massimo {tierLabel}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSoftwareOff((v) => !v)}
                    aria-pressed={softwareOff}
                    className={`w-full px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center justify-center space-x-1.5 ${
                      softwareOff
                        ? 'border border-[#12B76A] bg-[#0D2818] text-[#34D399] font-semibold'
                        : 'border border-[#1A2028] bg-[#10141D] text-[#E8EDF2] hover:border-[#12B76A]'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>Spento da software · {n(standbyWmq)} W/m²</span>
                  </button>
                  {softwareOff ? (
                    <p className="text-[11px] text-[#868D97]">
                      Schermo nero ma alimentato: il P{pitchMm} assorbe {n(standbyWmq)} W/m² di sola elettronica, 24 ore su 24. Si azzera solo staccando la linea con un relè.
                    </p>
                  ) : datoMancante ? (
                    <p className="text-[11px] text-[#F87171] flex items-start space-x-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>Dato non disponibile per il P{pitchMm} {tierLabel}: il listino non ha il tetto di nit di questa combinazione. Scegli un passo con il dato oppure un&apos;altra Selection.</span>
                    </p>
                  ) : nitsOverLimit ? (
                    <p className="text-[11px] text-[#F87171] flex items-start space-x-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>Il P{pitchMm} {tierLabel} si ferma a {n(datoScelto.maxNits)} nit ({datoScelto.chip}): a {n(targetOutdoorNits)} nit non è una scelta valida. Scegli un passo non barrato.</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-[#868D97]">Tetto di listino del P{pitchMm} {tierLabel}: {n(datoScelto.maxNits)} nit · {datoScelto.chip}</p>
                  )}
                </div>
              </div>

              {/* Distanza di visione */}
              <div className="space-y-2">
                <span className="text-xs text-[#868D97] font-medium flex items-center space-x-1.5">
                  <Eye className="w-3.5 h-3.5 text-[#12B76A]" />
                  <span>Da dove lo guardano? <span className="text-[#667085]">(distanza a terra dal piede dello schermo)</span></span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {DISTANCE_PRESETS.map((d) => {
                    const sel = Math.abs(groundViewingDistM - d.d) < 0.5;
                    return (
                      <button
                        key={d.d}
                        type="button"
                        onClick={() => setGroundViewingDistM(d.d)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                          sel
                            ? 'border border-[#12B76A] bg-[#0D2818] text-[#34D399] font-semibold'
                            : 'border border-[#1A2028] bg-[#10141D] text-[#E8EDF2] hover:border-[#12B76A]'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={groundViewingDistM}
                      onChange={(e) => setGroundViewingDistM(parseFloat(e.target.value || '1'))}
                      className="w-20 px-2 py-1.5 rounded-lg bg-[#10141D] border border-[#1A2028] text-white text-xs tabular-nums focus:border-[#12B76A] outline-none"
                    />
                    <span className="text-[11px] text-[#868D97]">m</span>
                  </div>
                </div>
              </div>

              {/* Quota della base: con la distanza a terra dà la linea di vista reale */}
              <div className="space-y-2">
                <span className="text-xs text-[#868D97] font-medium flex items-center space-x-1.5">
                  <ArrowUpFromLine className="w-3.5 h-3.5 text-[#12B76A]" />
                  <span>A che altezza è la base dello schermo?</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {BASE_HEIGHT_PRESETS.map((b) => {
                    const sel = Math.abs(installHeightM - b.h) < 0.25;
                    return (
                      <button
                        key={b.h}
                        type="button"
                        onClick={() => setInstallHeightM(b.h)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                          sel
                            ? 'border border-[#12B76A] bg-[#0D2818] text-[#34D399] font-semibold'
                            : 'border border-[#1A2028] bg-[#10141D] text-[#E8EDF2] hover:border-[#12B76A]'
                        }`}
                      >
                        {b.label}
                      </button>
                    );
                  })}
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="number"
                      min={0}
                      max={150}
                      value={installHeightM}
                      onChange={(e) => setInstallHeightM(parseFloat(e.target.value || '0'))}
                      className="w-20 px-2 py-1.5 rounded-lg bg-[#10141D] border border-[#1A2028] text-white text-xs tabular-nums focus:border-[#12B76A] outline-none"
                    />
                    <span className="text-[11px] text-[#868D97]">m</span>
                  </div>
                </div>
                <p className="text-[11px] text-[#868D97] tabular-nums">
                  Schermo da {n(installHeightM, 1)} a {n(installHeightM + dimensions.heightM, 1)} m di quota · linea di vista al centro{' '}
                  <span className="text-white font-medium">{n(alternative.lineOfSightDistM, 1)} m</span> ({n(alternative.lineOfSightBaseM, 1)} m alla base, {n(alternative.lineOfSightTopM, 1)} m in cima) · da lì l&apos;occhio fonde i pixel fino al P{n(alternative.minResolvablePitchMm, 1)}
                </p>
              </div>
            </section>

            {/* 2. Contenuto */}
            <section className="bg-[#0D1117] p-5 rounded-xl border border-[#1A2028] shadow-sm space-y-4">
              <div className="flex items-center space-x-2 text-white font-semibold text-sm">
                <span className="w-5 h-5 rounded-full bg-[#0D2818] border border-[#163826] text-[#34D399] text-[11px] flex items-center justify-center font-bold">2</span>
                <Play className="w-4 h-4 text-[#12B76A]" />
                <span>Cosa trasmetti</span>
                <span className="text-[11px] text-[#868D97] font-normal hidden sm:inline">· il contenuto pesa più del 70% della bolletta</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-4">
                <label
                  className="block cursor-pointer"
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                >
                  <input type="file" accept="video/*,image/*" onChange={handleUpload} className="hidden" />
                  <div className={`h-full min-h-[104px] p-4 rounded-xl border border-dashed text-center transition-colors flex flex-col items-center justify-center ${
                    dragOver ? 'border-[#12B76A] bg-[#0D2818]' : 'border-[#2D3748] bg-[#10141D] hover:bg-[#161F30]'
                  }`}>
                    {isProcessing ? (
                      <div className="w-full space-y-2">
                        <span className="text-xs font-medium text-[#12B76A] block">Analisi 30 frame · {progress}%</span>
                        <div className="w-full h-1.5 bg-[#1A2028] rounded-full overflow-hidden">
                          <div className="h-full bg-[#12B76A] transition-all duration-200" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    ) : videoFileName && aplSource !== 'manual' ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-center space-x-2 text-xs font-medium text-[#34D399]">
                          <CheckCircle2 className="w-4 h-4 text-[#12B76A]" />
                          <span className="truncate max-w-[220px]">{videoFileName}</span>
                        </div>
                        <span className="text-[11px] text-[#9AA3AD] tabular-nums block">
                          APL medio {n(aplPercent, 1)}%
                          {aplRange ? ` · da ${n(aplRange.min, 0)}% a ${n(aplRange.max, 0)}%` : ''}
                        </span>
                        <span className="text-[11px] text-[#667085] block">Trascina un altro file per sostituirlo</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center justify-center space-x-2 text-xs font-medium text-[#E8EDF2]">
                          <Upload className="w-4 h-4 text-[#9AA3AD]" />
                          <span>Trascina qui il video o la foto dello spot</span>
                        </div>
                        <span className="text-[11px] text-[#667085] block">mp4, webm, jpg, png · analisi locale, nulla viene caricato online</span>
                        {analysisError && (
                          <span className="text-[11px] text-[#F87171] flex items-center justify-center space-x-1 pt-1">
                            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                            <span>{analysisError}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </label>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#868D97] font-medium">Oppure imposta l&apos;APL</span>
                    <span className="text-sm font-semibold text-white tabular-nums">{n(aplPercent, 0)}%</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={100}
                    value={Math.round(aplPercent)}
                    onChange={(e) => {
                      replaceUploadPreview(null);
                      setAnalysis(null);
                      setAplPercent(parseInt(e.target.value, 10), 'manual');
                    }}
                    className="w-full custom-slider cursor-pointer"
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    {SAMPLES.map((sm) => (
                      <button key={sm.file} type="button" onClick={() => loadSample(sm.file, sm.label, sm.fallbackApl)} disabled={isProcessing}
                        className="py-1.5 px-2 rounded-lg border border-[#1A2028] bg-[#10141D] hover:bg-[#161F30] text-[#E8EDF2] text-[11px] font-medium flex items-center justify-center space-x-1 cursor-pointer">
                        <Play className="w-3 h-3 text-[#12B76A]" /><span>{sm.button}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* 3. Consumi */}
            <section className="bg-[#0D1117] p-5 rounded-xl border border-[#1A2028] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-white font-semibold text-sm">
                  <span className="w-5 h-5 rounded-full bg-[#0D2818] border border-[#163826] text-[#34D399] text-[11px] flex items-center justify-center font-bold">3</span>
                  <Zap className="w-4 h-4 text-[#12B76A]" />
                  <span>Quanto consuma</span>
                  <span className="text-[11px] text-[#868D97] font-normal hidden sm:inline tabular-nums">
                    · {softwareOff
                      ? 'a schermo spento da software, tutto il giorno'
                      : aplSource === 'manual'
                      ? `con l'APL impostato al ${n(aplPercent, 0)}%`
                      : `con la media ${aplSource === 'foto' ? 'della tua foto' : 'del tuo video'} (APL ${n(aplPercent, 0)}%)`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="text-[11px] text-[#9AA3AD] hover:text-white flex items-center space-x-1 cursor-pointer"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>{operatingHoursDay} h/giorno · {n(tariffEurKwh, 2)} €/kWh</span>
                  {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {showAdvanced && (
                <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-[#10141D] border border-[#1A2028]">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] text-[#868D97]">
                      <span>Ore accese al giorno</span>
                      <span className="text-white tabular-nums">{operatingHoursDay} h</span>
                    </div>
                    <input type="range" min={1} max={24} value={operatingHoursDay} onChange={(e) => setSchedule(parseInt(e.target.value, 10))} className="w-full custom-slider cursor-pointer" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] text-[#868D97]">
                      <span>Tariffa energia</span>
                      <span className="text-white tabular-nums">{n(tariffEurKwh, 2)} €/kWh</span>
                    </div>
                    <input type="range" min={0.10} max={0.60} step={0.01} value={tariffEurKwh} onChange={(e) => setTariffRate(parseFloat(e.target.value))} className="w-full custom-slider cursor-pointer" />
                  </div>
                  <p className="col-span-2 text-[11px] text-[#667085]">Di notte lo schermo scende al 10% (norma CEI). Spento da software il P{pitchMm} assorbe comunque {n(standbyWmq)} W/m².</p>
                </div>
              )}

              {configNonValida && !softwareOff && (
                <p className="p-3 rounded-lg bg-[#2A1111] border border-[#5B1F1F] text-[11px] text-[#FCA5A5] flex items-start space-x-2">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>
                    {datoScelto
                      ? `Configurazione non valida: il P${pitchMm} ${tierLabel} non esiste a ${n(targetOutdoorNits)} nit. I consumi qui sotto sono quelli del P${pitchMm} ${tierLabel} al suo tetto di ${n(datoScelto.maxNits)} nit, non alla luminosità che hai chiesto.`
                      : `Configurazione non validabile: per il P${pitchMm} ${tierLabel} il listino non ha il tetto di nit. I consumi qui sotto sono una stima sul solo passo, senza la verifica che questa combinazione arrivi a ${n(targetOutdoorNits)} nit.`}
                  </span>
                </p>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-lg bg-[#10141D] border border-[#1A2028]">
                  <span className="text-[10px] uppercase text-[#868D97] font-medium block">Potenza in esercizio</span>
                  <span className="text-xl font-semibold text-white tabular-nums">{kwIstantanei < 10 ? n(kwIstantanei * 1000) : n(kwIstantanei, 1)}<span className="text-xs text-[#9AA3AD] ml-1">{kwIstantanei < 10 ? 'W' : 'kW'}</span></span>
                  <span className="text-[11px] text-[#868D97] block tabular-nums">{n(profile.dayPowerWmq)} W/m² · picco {n(pMax)} W/m²</span>
                </div>
                <div className="p-3.5 rounded-lg bg-[#10141D] border border-[#1A2028]">
                  <span className="text-[10px] uppercase text-[#868D97] font-medium block">Energia al giorno</span>
                  <span className="text-xl font-semibold text-white tabular-nums">{n(profile.totalDailyKwh, 1)}<span className="text-xs text-[#9AA3AD] ml-1">kWh</span></span>
                  <span className="text-[11px] text-[#868D97] block tabular-nums">{n(profile.annualKwh)} kWh/anno</span>
                </div>
                <div className="p-3.5 rounded-lg bg-[#10141D] border border-[#1A2028]">
                  <span className="text-[10px] uppercase text-[#868D97] font-medium block">Bolletta al mese</span>
                  <span className="text-xl font-semibold text-white tabular-nums">{n(profile.monthlyCostEur)}<span className="text-xs text-[#9AA3AD] ml-1">€</span></span>
                  <span className="text-[11px] text-[#868D97] block tabular-nums">{n(profile.dailyCostEur, 2)} €/giorno</span>
                </div>
                <div className={`p-3.5 rounded-lg border ${configNonValida && !softwareOff ? 'bg-[#10141D] border-[#1A2028]' : 'bg-[#0D2818] border-[#163826]'}`}>
                  <span className={`text-[10px] uppercase font-medium block ${configNonValida && !softwareOff ? 'text-[#868D97]' : 'text-[#34D399]'}`}>Bolletta all&apos;anno</span>
                  <span className="text-xl font-semibold text-white tabular-nums">{n(profile.annualCostEur)}<span className="text-xs text-[#9AA3AD] ml-1">€</span></span>
                  <span className="text-[11px] text-[#868D97] block tabular-nums">{n(profile.annualKwh * 0.305 / 1000, 2)} t CO₂/anno</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <Link
                  href="/"
                  onClick={() => goToWizard(9)}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-[#12B76A] hover:bg-[#0E9F5D] text-white font-semibold text-xs tracking-wide flex items-center justify-center space-x-2 transition-colors shadow-sm"
                >
                  <FileText className="w-4 h-4" />
                  <span>Scarica il report PDF</span>
                </Link>
                <Link
                  href="/"
                  onClick={() => goToWizard(7)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-[#1A2028] bg-[#10141D] hover:bg-[#161F30] text-[#E8EDF2] font-semibold text-xs flex items-center justify-center space-x-2 transition-colors"
                >
                  <LayoutList className="w-4 h-4 text-[#9AA3AD]" />
                  <span>Approfondisci nel wizard</span>
                </Link>
              </div>
            </section>
          </div>

          {/* Anteprima live + banner consiglio (sticky su desktop) */}
          <div className="lg:sticky lg:top-24 space-y-5">
            <section className="bg-[#0D1117] p-4 rounded-xl border border-[#1A2028] shadow-sm">
              <ContentPreview
                source={previewSource}
                ratioW={modulesW}
                ratioH={modulesH}
                resolutionLabel={`${n(dimensions.resolutionX)}×${n(dimensions.resolutionY)} px`}
                aplPercent={aplPercent}
                wattsForApl={wattsForApl}
                softwareOff={softwareOff}
                fit={fit}
                onFitChange={setFit}
                staleFileName={!previewSource && aplSource !== 'manual' ? videoFileName : undefined}
              />
            </section>
            <RecommendationBanner
              alternative={alternative}
              installHeightM={installHeightM}
              groundViewingDistM={groundViewingDistM}
              onApply={() => setPitchMm(alternative.proposed.pitchMm)}
            />
          </div>
        </div>
      </main>

      <WizardFooter />
    </div>
  );
};
