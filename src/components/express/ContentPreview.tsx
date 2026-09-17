'use client';

import React, { useEffect, useRef, useState } from 'react';
import { calcolaAplInquadrato, type FitMode } from '../../core/apl-engine';
import { Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, AlertTriangle, MonitorPlay } from 'lucide-react';

const n = (v: number, d = 0) => v.toLocaleString('it-IT', { maximumFractionDigits: d, minimumFractionDigits: d });

export interface PreviewSource {
  kind: 'video' | 'image';
  url: string;
}

interface ContentPreviewProps {
  source: PreviewSource | null;
  /** Base e altezza del LEDwall: fissano il rapporto del riquadro */
  ratioW: number;
  ratioH: number;
  resolutionLabel: string;
  /** APL dello store: fa da riferimento quando non c'è un frame da misurare */
  aplPercent: number;
  /** Potenza assorbita dall'intero schermo (W) a un dato APL % */
  wattsForApl: (aplPercent: number) => number;
  /** Adattamento del contenuto allo schermo, condiviso con l'analisi APL */
  fit: FitMode;
  onFitChange: (fit: FitMode) => void;
  /** Schermo nero da software: resta solo l'assorbimento dell'elettronica */
  softwareOff?: boolean;
  /** Il nome del file è noto ma il file non è più in memoria (pagina ricaricata) */
  staleFileName?: string;
}

const MAX_BOX_HEIGHT_PX = 230;
const SAMPLE_INTERVAL_MS = 250;

const formatWatts = (w: number) => (w < 10000 ? `${n(w)} W` : `${n(w / 1000, 1)} kW`);

export const ContentPreview: React.FC<ContentPreviewProps> = (props) => (
  // La key azzera lettura live e stato del player a ogni cambio di contenuto
  <ContentPreviewInner key={props.source?.url ?? 'vuoto'} {...props} />
);

const ContentPreviewInner: React.FC<ContentPreviewProps> = ({
  source,
  ratioW,
  ratioH,
  resolutionLabel,
  aplPercent,
  wattsForApl,
  fit,
  onFitChange,
  softwareOff = false,
  staleFileName,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [liveApl, setLiveApl] = useState<number | null>(null);
  const [mediaError, setMediaError] = useState(false);

  const w = Math.max(1, ratioW);
  const h = Math.max(1, ratioH);

  // Misura l'APL di ciò che il ledwall mostrerebbe davvero: stesso rapporto, stesso ritaglio
  const sampleFrame = (media: HTMLVideoElement | HTMLImageElement, srcW: number, srcH: number) => {
    const apl = calcolaAplInquadrato(media, srcW, srcH, w, h, fit);
    // Frame non ancora decodificato o canvas non leggibile: resta il valore dello store
    if (apl !== null) setLiveApl(apl);
  };

  useEffect(() => {
    if (source?.kind !== 'video') return;
    const timer = setInterval(() => {
      const v = videoRef.current;
      if (v && v.readyState >= 2) sampleFrame(v, v.videoWidth, v.videoHeight);
    }, SAMPLE_INTERVAL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, fit, w, h]);

  useEffect(() => {
    if (source?.kind !== 'image') return;
    const img = imageRef.current;
    if (img?.complete) sampleFrame(img, img.naturalWidth, img.naturalHeight);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, fit, w, h]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => setMediaError(true));
    else v.pause();
  };

  const shownApl = liveApl ?? aplPercent;
  const isLive = source !== null && liveApl !== null && !mediaError;
  const grey = Math.round((Math.max(0, Math.min(100, aplPercent)) / 100) * 255);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-[#868D97] font-medium flex items-center space-x-1.5">
          <MonitorPlay className="w-3.5 h-3.5 text-[#12B76A]" />
          <span>Anteprima sul tuo LEDwall</span>
        </span>
        <span className="text-[#667085] tabular-nums">{n(ratioW)}×{n(ratioH)} m · {resolutionLabel}</span>
      </div>

      <div className="flex items-center justify-center py-1">
        <div
          className="relative overflow-hidden rounded-[3px] bg-black ring-1 ring-[#2D3748] shadow-[0_0_24px_rgba(18,183,106,0.08)]"
          style={{ aspectRatio: `${w} / ${h}`, width: `min(100%, calc(${MAX_BOX_HEIGHT_PX}px * ${w} / ${h}))` }}
        >
          {source?.kind === 'video' && !mediaError && (
            <video
              ref={videoRef}
              src={source.url}
              autoPlay
              loop
              muted={muted}
              playsInline
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onError={() => setMediaError(true)}
              onClick={togglePlay}
              className="absolute inset-0 w-full h-full cursor-pointer"
              style={{ objectFit: fit }}
            />
          )}
          {source?.kind === 'image' && !mediaError && (
            <img
              ref={imageRef}
              src={source.url}
              alt="Anteprima del contenuto sul LEDwall"
              onLoad={(e) => sampleFrame(e.currentTarget, e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
              onError={() => setMediaError(true)}
              className="absolute inset-0 w-full h-full"
              style={{ objectFit: fit }}
            />
          )}
          {(!source || mediaError) && (
            <div
              className="absolute inset-0 flex items-center justify-center text-center px-2"
              style={{ backgroundColor: mediaError ? '#000' : `rgb(${grey},${grey},${grey})` }}
            >
              <span
                className="text-[10px] leading-tight font-medium flex items-center space-x-1"
                style={{ color: mediaError ? '#F87171' : grey > 140 ? '#07090C' : '#E8EDF2' }}
              >
                {mediaError ? (
                  <>
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                    <span>Il browser non riproduce questo file</span>
                  </>
                ) : (
                  <span>{staleFileName ? 'Ricarica il file per rivederlo qui' : `Schermo uniforme al ${n(aplPercent)}%`}</span>
                )}
              </span>
            </div>
          )}
          {softwareOff && (
            <div className="absolute inset-0 bg-black flex items-center justify-center text-center px-2">
              <span className="text-[10px] leading-tight font-medium text-[#667085]">Spento da software</span>
            </div>
          )}
          {/* Giunzioni dei cabinet da 1 m: danno la scala, sul muro vero non si vedono */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.10]"
            style={{
              backgroundImage:
                'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
              backgroundSize: `${100 / w}% ${100 / h}%`,
            }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[10px] uppercase text-[#868D97] font-medium flex items-center space-x-1.5">
            {isLive && playing && !softwareOff && <span className="w-1.5 h-1.5 rounded-full bg-[#12B76A] animate-pulse" />}
            <span>{softwareOff ? 'Solo elettronica' : isLive ? 'Adesso sullo schermo' : 'APL impostato'}</span>
          </span>
          <span className="text-sm font-semibold text-white tabular-nums block">
            {formatWatts(wattsForApl(shownApl))}
            <span className="text-[11px] text-[#9AA3AD] font-normal ml-1.5">{softwareOff ? 'LED spenti' : `APL ${n(shownApl, 0)}%`}</span>
          </span>
        </div>

        {source && !mediaError && (
          <div className="flex items-center space-x-1 flex-shrink-0">
            {source.kind === 'video' && (
              <>
                <button
                  type="button"
                  onClick={togglePlay}
                  title={playing ? 'Pausa' : 'Riproduci'}
                  className="p-1.5 rounded-lg border border-[#1A2028] bg-[#10141D] hover:bg-[#161F30] text-[#E8EDF2] cursor-pointer"
                >
                  {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setMuted((m) => !m)}
                  title={muted ? 'Attiva audio' : 'Disattiva audio'}
                  className="p-1.5 rounded-lg border border-[#1A2028] bg-[#10141D] hover:bg-[#161F30] text-[#E8EDF2] cursor-pointer"
                >
                  {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => onFitChange(fit === 'cover' ? 'contain' : 'cover')}
              title={fit === 'cover' ? 'Mostra tutto il contenuto (bande nere)' : 'Riempi lo schermo (ritaglia)'}
              className="px-2 py-1.5 rounded-lg border border-[#1A2028] bg-[#10141D] hover:bg-[#161F30] text-[#E8EDF2] text-[11px] font-medium flex items-center space-x-1 cursor-pointer"
            >
              {fit === 'cover' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span>{fit === 'cover' ? 'Adatta' : 'Riempi'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
