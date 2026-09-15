'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useSimulatorStore, useSimulatorComputed } from '../../store/useSimulatorStore';
import { CircularGauge } from '../ui/CircularGauge';
import { LoadCurveChart } from '../charts/LoadCurveChart';
import { analizzaVideoApl, analizzaFotoApl } from '../../core/apl-engine';
import {
  ArrowRight,
  ArrowLeft,
  Upload,
  CheckCircle2,
  Film,
  Sparkles,
  ShieldCheck,
  Play,
  Moon,
  Tv,
  Activity,
  FileText,
} from 'lucide-react';

export const S7Dashboard: React.FC = () => {
  const {
    aplPercent,
    liveLumDiurna,
    videoFileName,
    setLiveLumDiurna,
    setAplPercent,
    nextStep,
    prevStep,
  } = useSimulatorStore();

  const {
    dimensions,
    profile,
    scenario,
    instantaneousPowerKw,
    maxNominalPowerKw,
  } = useSimulatorComputed();

  const [isAnalyzingVideo, setIsAnalyzingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);

  const handleInlineMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzingVideo(true);
    setVideoProgress(0);

    try {
      if (file.type.startsWith('video/')) {
        const res = await analizzaVideoApl(file, (p) => setVideoProgress(p));
        setAplPercent(res.averageAplPercent, 'video', file.name);
      } else if (file.type.startsWith('image/')) {
        const apl = await analizzaFotoApl(file);
        setAplPercent(apl, 'foto', file.name);
      }
    } catch (err) {
      console.warn('Errore analisi media:', err);
    } finally {
      setIsAnalyzingVideo(false);
    }
  };

  const handleLoadSampleVideo = async () => {
    setIsAnalyzingVideo(true);
    setVideoProgress(15);
    try {
      const res = await fetch('/samples/file-3.mp4');
      const blob = await res.blob();
      const file = new File([blob], 'file-3.mp4', { type: 'video/mp4' });
      const analysis = await analizzaVideoApl(file, (p) => setVideoProgress(p));
      setAplPercent(analysis.averageAplPercent, 'video', 'file-3.mp4 (Showroom SBN-MK)');
    } catch {
      setAplPercent(23, 'video', 'file-3.mp4 (Showroom SBN-MK)');
    } finally {
      setIsAnalyzingVideo(false);
    }
  };

  const handleLoadSampleVideo10 = async () => {
    setIsAnalyzingVideo(true);
    setVideoProgress(15);
    try {
      const res = await fetch('/samples/file-10.mp4');
      const blob = await res.blob();
      const file = new File([blob], 'file-10.mp4', { type: 'video/mp4' });
      const analysis = await analizzaVideoApl(file, (p) => setVideoProgress(p));
      setAplPercent(analysis.averageAplPercent, 'video', 'file-10.mp4 (Kinetic Wall)');
    } catch {
      setAplPercent(50, 'video', 'file-10.mp4 (Kinetic Wall)');
    } finally {
      setIsAnalyzingVideo(false);
    }
  };

  const contentPresets = [
    {
      apl: 15,
      title: 'Sfondo Scuro / Notiziario',
      sub: 'UI Dark Mode & Loghi',
      desc: 'Minimo assorbimento: accesi solo i pixel necessari',
      badge: 'Consumo Minimo',
      icon: Moon,
    },
    {
      apl: 30,
      title: 'Spot Commerciale Standard',
      sub: 'DOOH Benchmark Italia',
      desc: 'Video pubblicitario tipico a contrasto bilanciato',
      badge: 'Standard DOOH',
      icon: Tv,
    },
    {
      apl: 65,
      title: 'Sport & Eventi All\'aperto',
      sub: 'Calcio / Tennis / Live',
      desc: 'Grandi campiture verdi, erba e cieli luminosi',
      badge: 'Carico Alto',
      icon: Activity,
    },
    {
      apl: 85,
      title: 'Testo su Fondo Bianco Pieno',
      sub: 'Grafica Chiara / Flash',
      desc: 'Massimo carico termico ed elettrico per gli alimentatori',
      badge: 'Carico Critico',
      icon: FileText,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="w-full max-w-5xl space-y-6"
    >
      {/* Header Dashboard */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#1A2028] pb-4 gap-4">
        <div>
          <span className="text-xs font-semibold text-[#12B76A] tracking-wider uppercase">
            Pannello di Controllo · Calcolo Realtime
          </span>
          <h2 className="text-2xl md:text-3xl font-semibold text-white">
            Dashboard Energetica Istantanea
          </h2>
        </div>
        <div className="flex items-center space-x-2 text-xs text-[#9AA3AD] bg-[#10141D] px-3.5 py-1.5 rounded-full border border-[#1A2028]">
          <span className="w-2 h-2 rounded-full bg-[#12B76A]"></span>
          <span className="font-medium">Calcolo attivo in tempo reale</span>
        </div>
      </div>

      {/* TAVOLA COMPARATIVA ULTRA-CHIARA: PRIMA vs DOPO vs RISPARMIO */}
      <div className="p-6 rounded-xl bg-[#0D1117] border border-[#1A2028] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1A2028] pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-[#0D2818] text-[#34D399]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm md:text-base font-semibold text-white">
                Confronto Immediato Bolletta ({dimensions.areaM2.toFixed(1)} m² · APL {aplPercent}%)
              </h3>
              <p className="text-xs text-[#9AA3AD]">
                Confronto tra impianto non gestito e ottimizzazione Fleet Monitor VeroLED
              </p>
            </div>
          </div>
          <div className="px-3 py-1 rounded-full bg-[#0D2818] border border-[#163826] text-[#34D399] text-xs font-semibold self-start sm:self-auto tabular-nums">
            Taglio Bolletta: -{scenario.savingsPercent.toFixed(1)}%
          </div>
        </div>

        {/* 3 Colonne a Confronto Diretto */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Colonna 1: Senza Gestione (Muted Red) */}
          <div className="p-4 rounded-xl border border-[#4E1D24] bg-[#2A1215] space-y-3">
            <div className="flex justify-between items-center text-xs font-semibold text-[#F87171]">
              <span>Senza Gestione</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#3D1418] text-[#F87171] border border-[#5A1C22] font-medium">Tradizionale</span>
            </div>
            <div>
              <div className="text-xs text-[#9AA3AD]">Bolletta Elettrica Annua:</div>
              <div className="text-2xl font-semibold text-[#F87171] tabular-nums">
                {Math.round(scenario.annualCostEurA).toLocaleString('it-IT')} €<span className="text-xs text-[#9AA3AD] font-normal"> / anno</span>
              </div>
              <div className="text-xs text-[#FCA5A5] mt-0.5 tabular-nums">
                pari a {Math.round(scenario.annualCostEurA / 12).toLocaleString('it-IT')} € al mese
              </div>
            </div>
            <div className="pt-2 border-t border-[#4E1D24] text-xs text-[#E8EDF2] space-y-1">
              <div>Luminosità fissa 100% (senza sensore)</div>
              <div>Standby passivo di notte (~50 W/m²)</div>
            </div>
          </div>

          {/* Colonna 2: Con Fleet Monitor (Muted Green) */}
          <div className="p-4 rounded-xl border border-[#163826] bg-[#0D1E16] space-y-3">
            <div className="flex justify-between items-center text-xs font-semibold text-[#34D399]">
              <span>Con Fleet Monitor</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#0D2818] text-[#34D399] border border-[#163826] font-medium">VeroLED PRO</span>
            </div>
            <div>
              <div className="text-xs text-[#9AA3AD]">Nuova Bolletta con Gestione:</div>
              <div className="text-2xl font-semibold text-[#34D399] tabular-nums">
                {Math.round(scenario.annualCostEurB).toLocaleString('it-IT')} €<span className="text-xs text-[#9AA3AD] font-normal"> / anno</span>
              </div>
              <div className="text-xs text-[#86EFAC] mt-0.5 tabular-nums">
                pari a {Math.round(scenario.annualCostEurB / 12).toLocaleString('it-IT')} € al mese
              </div>
            </div>
            <div className="pt-2 border-t border-[#163826] text-xs text-[#E8EDF2] space-y-1">
              <div>Sensore Lux modulante in tempo reale</div>
              <div>Standby Zero reale a relè (0 kW)</div>
            </div>
          </div>

          {/* Colonna 3: Il Risparmio Diretto */}
          <div className="p-4 rounded-xl border border-[#12B76A] bg-[#0D2818] space-y-3">
            <div className="flex justify-between items-center text-xs font-semibold text-[#34D399]">
              <span>Risparmio Netto</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#10141D] text-[#34D399] border border-[#163826] font-semibold tabular-nums">-{scenario.savingsPercent.toFixed(1)}%</span>
            </div>
            <div>
              <div className="text-xs text-[#E8EDF2]">Risparmio economico annuo:</div>
              <div className="text-2xl md:text-3xl font-semibold text-[#12B76A] tabular-nums">
                +{Math.round(scenario.savingsEur).toLocaleString('it-IT')} €<span className="text-xs text-[#34D399] font-normal"> / anno</span>
              </div>
              <div className="text-xs text-[#34D399] mt-0.5 tabular-nums">
                risparmi +{Math.round(scenario.savingsEur / 12).toLocaleString('it-IT')} € ogni mese
              </div>
            </div>
            <div className="pt-2 border-t border-[#163826] text-xs text-[#E8EDF2]">
              <div className="text-[#9AA3AD] text-[10px] uppercase tracking-wide">In 5 anni di esercizio:</div>
              <div className="text-sm font-semibold text-white tabular-nums">
                +{Math.round(scenario.savingsEur * 5).toLocaleString('it-IT')} € risparmiati
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bento Grid Principale */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Gauge Potenza Widget */}
        <div className="bg-[#0D1117] p-4 rounded-xl border border-[#1A2028] shadow-sm flex flex-col items-center justify-center">
          <CircularGauge
            currentKw={instantaneousPowerKw}
            maxKw={maxNominalPowerKw}
            label="Potenza Nominale Massima"
          />
        </div>

        {/* 4 KPI Contatori */}
        <div className="md:col-span-2 grid grid-cols-2 gap-4">
          <div className="bg-[#0D1117] p-5 rounded-xl border border-[#1A2028] shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#868D97] font-medium uppercase tracking-wide">Potenza Attiva Istantanea:</span>
              <span className="text-[10px] text-[#12B76A] font-semibold">Luce Diurna</span>
            </div>
            <div className="text-2xl font-semibold text-white tabular-nums mt-1">
              {instantaneousPowerKw.toFixed(2)} kW
            </div>
            <div className="text-xs text-[#9AA3AD] mt-1 flex justify-between tabular-nums">
              <span>Costo orario attivo:</span>
              <strong className="text-white font-semibold">{profile.hourlyCostEur.toFixed(2)} €/h</strong>
            </div>
          </div>

          <div className="bg-[#0D1117] p-5 rounded-xl border border-[#1A2028] shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#868D97] font-medium uppercase tracking-wide">Consumo Energetico Annuo:</span>
              <span className="text-[10px] text-[#34D399] font-semibold tabular-nums">
                -{scenario.savingsPercent.toFixed(1)}% kWh
              </span>
            </div>
            <div className="text-2xl font-semibold text-[#12B76A] tabular-nums mt-1">
              {Math.round(scenario.annualKwhB).toLocaleString('it-IT')} kWh
            </div>
            <div className="text-xs text-[#9AA3AD] mt-1 flex justify-between tabular-nums">
              <span>Senza gestione:</span>
              <span className="text-[#F87171] font-medium">
                {Math.round(scenario.annualKwhA).toLocaleString('it-IT')} kWh
              </span>
            </div>
          </div>

          <div className="bg-[#0D1117] p-5 rounded-xl border border-[#1A2028] shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#868D97] font-medium uppercase tracking-wide">Bolletta Mensile Media:</span>
              <span className="text-[10px] text-[#34D399] font-semibold tabular-nums">
                -{Math.round(scenario.savingsEur / 12).toLocaleString('it-IT')} €/mese
              </span>
            </div>
            <div className="text-2xl font-semibold text-white tabular-nums mt-1">
              {Math.round(scenario.annualCostEurB / 12).toLocaleString('it-IT')} €
            </div>
            <div className="text-xs text-[#9AA3AD] mt-1 flex justify-between tabular-nums">
              <span>Senza gestione:</span>
              <span className="text-[#F87171] font-medium">
                {Math.round(scenario.annualCostEurA / 12).toLocaleString('it-IT')} €/mese
              </span>
            </div>
          </div>

          <div className="bg-[#0D1117] p-5 rounded-xl border border-[#163826] bg-[#0D1E16]/30 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#34D399] font-semibold uppercase tracking-wide">Bolletta Annuale Totale:</span>
              <span className="text-[10px] text-[#34D399] font-semibold tabular-nums">
                -{Math.round(scenario.savingsEur).toLocaleString('it-IT')} €/anno
              </span>
            </div>
            <div className="text-2xl font-semibold text-[#12B76A] tabular-nums mt-1">
              {Math.round(scenario.annualCostEurB).toLocaleString('it-IT')} €
            </div>
            <div className="text-xs text-[#9AA3AD] mt-1 flex justify-between tabular-nums">
              <span>Senza gestione:</span>
              <span className="text-[#F87171] font-medium">
                {Math.round(scenario.annualCostEurA).toLocaleString('it-IT')} €/anno
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SIMULATORE CONTENUTI */}
      <div className="bg-[#0D1117] p-6 rounded-xl border border-[#1A2028] shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1A2028] pb-3">
          <div className="flex items-center space-x-2 text-white font-semibold text-sm">
            <Film className="w-5 h-5 text-[#12B76A]" />
            <span>Simulatore Contenuti — Regola il Video o Foto in Tempo Reale</span>
          </div>
          <span className="text-xs text-[#9AA3AD] flex items-center space-x-1">
            <Sparkles className="w-3.5 h-3.5 text-[#12B76A]" />
            <span>Verifica l&apos;impatto immediato dei contenuti sulla bolletta</span>
          </span>
        </div>

        {/* 4 Card Preset Contenuti */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {contentPresets.map((preset) => {
            const isSelected = aplPercent === preset.apl;
            const IconComp = preset.icon;
            return (
              <button
                key={preset.apl}
                type="button"
                onClick={() => setAplPercent(preset.apl, 'manual')}
                className={`p-4 rounded-xl text-left border transition-colors cursor-pointer flex flex-col justify-between space-y-2.5 ${
                  isSelected
                    ? 'border-[#12B76A] bg-[#0D2818]'
                    : 'border-[#1A2028] bg-[#10141D] hover:border-[#2D3748] hover:bg-[#161F30]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <IconComp className={`w-4 h-4 ${isSelected ? 'text-[#34D399]' : 'text-[#868D97]'}`} />
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border tabular-nums ${
                    isSelected ? 'bg-[#0D2818] text-[#34D399] border-[#163826]' : 'bg-[#07090C] text-[#9AA3AD] border-[#1A2028]'
                  }`}>
                    APL {preset.apl}%
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-white text-xs leading-snug">{preset.title}</div>
                  <div className="text-xs text-[#868D97] mt-0.5">{preset.sub}</div>
                </div>
                <div className="text-xs text-[#868D97] leading-tight pt-1 border-t border-[#1A2028]">
                  {preset.desc}
                </div>
              </button>
            );
          })}
        </div>

        {/* Upload Diretto Video o Foto Spot */}
        <div className="p-4 rounded-xl border border-dashed border-[#2D3748] bg-[#10141D] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3 text-center sm:text-left">
            <div className="w-10 h-10 rounded-lg bg-[#07090C] border border-[#1A2028] flex items-center justify-center text-[#12B76A] flex-shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">
                Vuoi testare lo spot pubblicitario effettivo del cliente?
              </div>
              <div className="text-xs text-[#868D97]">
                Carica file video (.mp4/.webm) o foto: campionamento 30 fotogrammi ITU-R BT.709 in locale.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="video/*,image/*"
                onChange={handleInlineMediaUpload}
                className="hidden"
              />
              <div className="px-3.5 py-2 rounded-lg bg-[#07090C] border border-[#1A2028] hover:bg-[#161F30] hover:border-[#2D3748] text-[#E8EDF2] text-xs font-medium transition-colors flex items-center space-x-2">
                {isAnalyzingVideo ? (
                  <span>Analisi in corso ({videoProgress}%)...</span>
                ) : videoFileName ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#12B76A]" />
                    <span className="truncate max-w-[140px]">{videoFileName}</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-[#9AA3AD]" />
                    <span>Carica Spot Cliente</span>
                  </>
                )}
              </div>
            </label>

            <button
              type="button"
              onClick={handleLoadSampleVideo}
              disabled={isAnalyzingVideo}
              className="px-3 py-2 rounded-lg bg-[#07090C] border border-[#1A2028] hover:bg-[#161F30] hover:border-[#2D3748] text-[#E8EDF2] text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <Play className="w-3 h-3 text-[#12B76A]" />
              <span>file-3 (23%)</span>
            </button>

            <button
              type="button"
              onClick={handleLoadSampleVideo10}
              disabled={isAnalyzingVideo}
              className="px-3 py-2 rounded-lg bg-[#07090C] border border-[#1A2028] hover:bg-[#161F30] hover:border-[#2D3748] text-[#E8EDF2] text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <Play className="w-3 h-3 text-[#12B76A]" />
              <span>file-10 (50%)</span>
            </button>
          </div>
        </div>

        {/* Sliders Continui */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-[#868D97] font-medium">Regolazione fine APL (% bianco):</span>
              <span className="text-white font-semibold tabular-nums">{aplPercent}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              value={aplPercent}
              onChange={(e) => setAplPercent(parseInt(e.target.value, 10), 'manual')}
              className="w-full custom-slider cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-[#868D97] font-medium">Luminosità diurna di picco:</span>
              <span className="text-white font-semibold tabular-nums">{liveLumDiurna}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={liveLumDiurna}
              onChange={(e) => setLiveLumDiurna(parseInt(e.target.value, 10))}
              className="w-full custom-slider cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Live 24h Load Curve Chart */}
      <LoadCurveChart />

      {/* Navigation Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-[#0D1117] border border-[#1A2028] shadow-sm">
        <button
          type="button"
          onClick={prevStep}
          className="w-full sm:w-auto px-4 py-2 rounded-lg border border-[#1A2028] bg-[#10141D] text-[#E8EDF2] hover:bg-[#161F30] hover:border-[#2D3748] text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Rivedi Orari e Tariffa</span>
        </button>

        <button
          type="button"
          onClick={nextStep}
          className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#12B76A] hover:bg-[#0E9F5D] text-white font-semibold text-xs tracking-wider flex items-center justify-center space-x-2 transition-colors shadow-sm cursor-pointer"
        >
          <span>Vedi Dettaglio Scenari e Risparmio Fleet Monitor</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};
