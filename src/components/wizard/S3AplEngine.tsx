'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useSimulatorStore } from '../../store/useSimulatorStore';
import { analizzaVideoApl, analizzaFotoApl, VideoAplResult } from '../../core/apl-engine';
import { Video, Sliders, Upload, CheckCircle2, ArrowRight, Play } from 'lucide-react';

export const S3AplEngine: React.FC = () => {
  const { aplPercent, videoFileName, setAplPercent, nextStep } = useSimulatorStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [, setVideoResult] = useState<VideoAplResult | null>(null);

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      if (file.type.startsWith('video/')) {
        const res = await analizzaVideoApl(file, (p) => setProgress(p));
        setVideoResult(res);
        setAplPercent(res.averageAplPercent, 'video', file.name);
      } else if (file.type.startsWith('image/')) {
        const apl = await analizzaFotoApl(file);
        setAplPercent(apl, 'foto', file.name);
      }
    } catch (err: any) {
      console.warn('Errore analisi video, fallback su slider:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadSample = async () => {
    setIsProcessing(true);
    setProgress(15);
    try {
      const res = await fetch('/samples/file-3.mp4');
      const blob = await res.blob();
      const file = new File([blob], 'file-3.mp4', { type: 'video/mp4' });
      const analysis = await analizzaVideoApl(file, (p) => setProgress(p));
      setVideoResult(analysis);
      setAplPercent(analysis.averageAplPercent, 'video', 'file-3.mp4 (Showroom SBN-MK)');
    } catch {
      setAplPercent(23, 'video', 'file-3.mp4 (Showroom SBN-MK)');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadSample10 = async () => {
    setIsProcessing(true);
    setProgress(15);
    try {
      const res = await fetch('/samples/file-10.mp4');
      const blob = await res.blob();
      const file = new File([blob], 'file-10.mp4', { type: 'video/mp4' });
      const analysis = await analizzaVideoApl(file, (p) => setProgress(p));
      setVideoResult(analysis);
      setAplPercent(analysis.averageAplPercent, 'video', 'file-10.mp4 (Kinetic Wall)');
    } catch {
      setAplPercent(50, 'video', 'file-10.mp4 (Kinetic Wall)');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="w-full max-w-4xl space-y-6"
    >
      <div className="text-center space-y-2">
        <span className="text-xs font-semibold text-[#12B76A] tracking-wider uppercase">
          Fase 3 di 9 · Contenuti &amp; Video
        </span>
        <h2 className="text-2xl md:text-3xl font-semibold text-white">
          Vuoi caricare un video o impostare l&apos;APL stimato?
        </h2>
        <p className="text-sm text-[#9AA3AD] max-w-2xl mx-auto">
          L&apos;APL (Average Picture Level) indica la percentuale media di pixel accesi: determina oltre il 70% dei consumi elettrici effettivi del display.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* APL Video Engine */}
        <div className="bg-[#0D1117] p-6 rounded-xl border border-[#1A2028] shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-white font-semibold text-sm">
              <Video className="w-4 h-4 text-[#12B76A]" />
              <span>APL Engine (Video / Foto)</span>
            </div>
            <p className="text-xs text-[#9AA3AD] leading-relaxed">
              Carica un video promozionale (.mp4/.webm). Campionamento in locale di 30 fotogrammi secondo lo standard fotometrico ITU-R BT.709.
            </p>
          </div>

          <label className="block cursor-pointer">
            <input
              type="file"
              accept="video/*,image/*"
              onChange={handleVideoUpload}
              className="hidden"
            />
            <div className="p-5 rounded-xl border border-dashed border-[#2D3748] bg-[#10141D] hover:bg-[#161F30] text-center transition-colors">
              {isProcessing ? (
                <div className="space-y-2">
                  <span className="text-xs font-medium text-[#12B76A] block">
                    Campionamento 30 frame ({progress}%)
                  </span>
                  <div className="w-full h-1.5 bg-[#1A2028] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#12B76A] transition-all duration-200"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              ) : videoFileName ? (
                <div className="flex items-center justify-center space-x-2 text-xs font-medium text-[#34D399]">
                  <CheckCircle2 className="w-4 h-4 text-[#12B76A]" />
                  <span className="truncate max-w-[200px]">{videoFileName}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2 text-xs font-medium text-[#9AA3AD]">
                  <Upload className="w-4 h-4 text-[#9AA3AD]" />
                  <span>Trascina spot o clicca per caricare</span>
                </div>
              )}
            </div>
          </label>

          {/* Pulsanti rapidi campioni */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleLoadSample}
              disabled={isProcessing}
              className="py-2 px-2.5 rounded-lg border border-[#1A2028] bg-[#10141D] hover:bg-[#161F30] hover:border-[#2D3748] text-[#E8EDF2] text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors cursor-pointer truncate"
            >
              <Play className="w-3 h-3 text-[#12B76A] flex-shrink-0" />
              <span className="truncate">file-3 (APL 23%)</span>
            </button>

            <button
              type="button"
              onClick={handleLoadSample10}
              disabled={isProcessing}
              className="py-2 px-2.5 rounded-lg border border-[#1A2028] bg-[#10141D] hover:bg-[#161F30] hover:border-[#2D3748] text-[#E8EDF2] text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors cursor-pointer truncate"
            >
              <Play className="w-3 h-3 text-[#12B76A] flex-shrink-0" />
              <span className="truncate">file-10 (APL 50%)</span>
            </button>
          </div>
        </div>

        {/* APL Manual Slider */}
        <div className="bg-[#0D1117] p-6 rounded-xl border border-[#1A2028] shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-white font-semibold text-sm">
              <Sliders className="w-4 h-4 text-[#12B76A]" />
              <span>Slider Manuale APL</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#868D97] font-medium">VALORE IMPOSTATO:</span>
              <span className="text-2xl font-semibold text-white tabular-nums">{aplPercent}%</span>
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

          <div className="space-y-2 pt-2">
            <span className="text-xs font-semibold text-[#868D97] block uppercase tracking-wide">
              Preset Standard DOOH:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAplPercent(15, 'manual')}
                className={`text-xs p-2.5 rounded-lg border transition-colors cursor-pointer text-left ${
                  aplPercent === 15
                    ? 'border-[#12B76A] bg-[#0D2818] text-[#34D399] font-semibold'
                    : 'border-[#1A2028] bg-[#10141D] text-[#9AA3AD] hover:border-[#2D3748] hover:text-[#E8EDF2]'
                }`}
              >
                15% Sfondo Scuro
              </button>
              <button
                type="button"
                onClick={() => setAplPercent(30, 'manual')}
                className={`text-xs p-2.5 rounded-lg border transition-colors cursor-pointer text-left ${
                  aplPercent === 30
                    ? 'border-[#12B76A] bg-[#0D2818] text-[#34D399] font-semibold'
                    : 'border-[#1A2028] bg-[#10141D] text-[#9AA3AD] hover:border-[#2D3748] hover:text-[#E8EDF2]'
                }`}
              >
                30% Spot Commerciale
              </button>
              <button
                type="button"
                onClick={() => setAplPercent(65, 'manual')}
                className={`text-xs p-2.5 rounded-lg border transition-colors cursor-pointer text-left ${
                  aplPercent === 65
                    ? 'border-[#12B76A] bg-[#0D2818] text-[#34D399] font-semibold'
                    : 'border-[#1A2028] bg-[#10141D] text-[#9AA3AD] hover:border-[#2D3748] hover:text-[#E8EDF2]'
                }`}
              >
                65% Sport / Outdoor
              </button>
              <button
                type="button"
                onClick={() => setAplPercent(85, 'manual')}
                className={`text-xs p-2.5 rounded-lg border transition-colors cursor-pointer text-left ${
                  aplPercent === 85
                    ? 'border-[#12B76A] bg-[#0D2818] text-[#34D399] font-semibold'
                    : 'border-[#1A2028] bg-[#10141D] text-[#9AA3AD] hover:border-[#2D3748] hover:text-[#E8EDF2]'
                }`}
              >
                85% Grafica Chiara
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={nextStep}
          className="px-6 py-2.5 rounded-lg bg-[#12B76A] hover:bg-[#0E9F5D] text-white font-semibold text-xs tracking-wider flex items-center space-x-2 transition-colors shadow-sm cursor-pointer"
        >
          <span>Continua allo Standby</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};
