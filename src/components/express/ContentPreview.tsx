'use client';

import React, { useEffect, useRef, useState } from 'react';
import { calcolaAplInquadrato, type FitMode } from '../../core/apl-engine';
import { disegnaDemo, type VersioneDemo } from '../../core/demo-veroled';
import { preparaDemo } from './demo-risorse';
import { Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, AlertTriangle, MonitorPlay } from 'lucide-react';

const n = (v: number, d = 0) => v.toLocaleString('it-IT', { maximumFractionDigits: d, minimumFractionDigits: d, useGrouping: 'always' } as Intl.NumberFormatOptions);

/**
 * Cosa mostra il riquadro: il file del cliente (video o foto) oppure la demo VeroLED, che non è un
 * file ma un disegno fatto alla misura dello schermo. `url` è la chiave del contenuto.
 */
export type PreviewSource =
  | { kind: 'video' | 'image'; url: string }
  | { kind: 'demo'; url: string; versione: VersioneDemo };

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
  /** Schermata semplice: niente sigle tecniche (APL) nelle etichette */
  semplice?: boolean;
  /** Dentro uno slot del confronto: niente intestazione, la dà già lo slot */
  compatta?: boolean;
  /** Il nome del file è noto ma il file non è più in memoria (pagina ricaricata) */
  staleFileName?: string;
}

const MAX_BOX_HEIGHT_PX = 230;
const SAMPLE_INTERVAL_MS = 250;
/** La demo non ha bisogno di più fotogrammi di un video: su un telefono è CPU risparmiata */
const DEMO_FPS = 30;
/** Con «riduci movimento» la demo resta ferma qui: la parola è a piena opacità */
const DEMO_ISTANTE_FERMO = 1.5;

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
  semplice = false,
  compatta = false,
  staleFileName,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Stato della demo letto dal ciclo di disegno senza farlo ripartire: in pausa o no, e l'istante
  const demoPausaRef = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [liveApl, setLiveApl] = useState<number | null>(null);
  const [mediaError, setMediaError] = useState(false);

  const w = Math.max(1, ratioW);
  const h = Math.max(1, ratioH);

  // Misura l'APL di ciò che il ledwall mostrerebbe davvero: stesso rapporto, stesso ritaglio
  const sampleFrame = (media: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement, srcW: number, srcH: number) => {
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

  // La demo: si disegna alla misura del riquadro (per la densità dello schermo), al massimo a 30
  // fotogrammi al secondo, e solo quando il riquadro è visibile. Il tempo avanza solo mentre gira,
  // quindi pausa e ripresa continuano dallo stesso punto.
  const versioneDemo = source?.kind === 'demo' ? source.versione : null;
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!versioneDemo || !canvas) return;
    let annullato = false;
    let raf = 0;
    let scritta: HTMLImageElement | null = null;
    let pronta = false;
    let visibile = true;
    let t = DEMO_ISTANTE_FERMO;
    let ultimo: number | null = null;
    const fermo = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const disegna = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx || !pronta) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const W = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const H = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== W) canvas.width = W;
      if (canvas.height !== H) canvas.height = H;
      disegnaDemo(ctx, t, W, H, versioneDemo, scritta);
    };

    const ciclo = (ora: number) => {
      if (annullato) return;
      raf = requestAnimationFrame(ciclo);
      if (ultimo === null) ultimo = ora;
      const dt = (ora - ultimo) / 1000;
      if (dt < 1 / DEMO_FPS - 0.002) return;
      ultimo = ora;
      if (!demoPausaRef.current && visibile) {
        // Una scheda rimasta in secondo piano non fa saltare l'animazione di minuti
        t += Math.min(dt, 0.25);
        disegna();
      }
    };

    const ridimensiona = new ResizeObserver(() => disegna());
    ridimensiona.observe(canvas);
    const osserva = new IntersectionObserver((voci) => { visibile = voci.some((v) => v.isIntersecting); });
    osserva.observe(canvas);

    preparaDemo(versioneDemo).then((img) => {
      if (annullato) return;
      scritta = img;
      pronta = true;
      disegna();
      if (fermo) {
        demoPausaRef.current = true;
        setPlaying(false);
      } else {
        setPlaying(!demoPausaRef.current);
        raf = requestAnimationFrame(ciclo);
      }
    });

    return () => {
      annullato = true;
      cancelAnimationFrame(raf);
      ridimensiona.disconnect();
      osserva.disconnect();
    };
  }, [versioneDemo]);

  // Lettura dal vivo della demo: dal canvas stesso, cioè da quello che si vede
  useEffect(() => {
    if (source?.kind !== 'demo') return;
    const timer = setInterval(() => {
      const c = canvasRef.current;
      if (c && c.width > 1) sampleFrame(c, c.width, c.height);
    }, SAMPLE_INTERVAL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, w, h]);

  useEffect(() => {
    if (source?.kind !== 'image') return;
    const img = imageRef.current;
    if (img?.complete) sampleFrame(img, img.naturalWidth, img.naturalHeight);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, fit, w, h]);

  const togglePlay = () => {
    if (source?.kind === 'demo') {
      demoPausaRef.current = !demoPausaRef.current;
      setPlaying(!demoPausaRef.current);
      return;
    }
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
      {!compatta && (
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-[var(--mute)] font-medium flex items-center space-x-1.5">
          <MonitorPlay className="w-3.5 h-3.5 text-[var(--ok)]" />
          <span>Anteprima sul tuo LEDwall</span>
        </span>
        <span className="text-[var(--faint)] tabular-nums">{n(ratioW)}×{n(ratioH)} m · {resolutionLabel}</span>
      </div>
      )}

      <div className="flex items-center justify-center py-1">
        <div
          className="relative overflow-hidden rounded-[3px] bg-black ring-1 ring-[var(--s3)] shadow-[0_0_24px_rgba(18,183,106,0.08)]"
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
          {source?.kind === 'demo' && (
            <canvas
              ref={canvasRef}
              onClick={togglePlay}
              role="img"
              aria-label="Contenuto dimostrativo VeroLED, disegnato alla misura del LEDwall"
              className="absolute inset-0 w-full h-full cursor-pointer"
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
                style={{ color: mediaError ? 'var(--alarm)' : grey > 140 ? 'var(--bg)' : 'var(--text)' }}
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
              <span className="text-[10px] leading-tight font-medium text-[var(--faint)]">Spento da software</span>
            </div>
          )}
          {/* Giunzioni dei cabinet da 1 m: danno la scala, sul muro vero non si vedono */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.10]"
            style={{
              backgroundImage:
                'linear-gradient(to right, var(--text) 1px, transparent 1px), linear-gradient(to bottom, var(--text) 1px, transparent 1px)',
              backgroundSize: `${100 / w}% ${100 / h}%`,
            }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[10px] uppercase text-[var(--mute)] font-medium flex items-center space-x-1.5">
            {isLive && playing && !softwareOff && <span className="w-1.5 h-1.5 rounded-full bg-[var(--pieno-fondo)] animate-pulse" />}
            <span>{softwareOff ? 'Solo elettronica' : isLive ? 'Adesso sullo schermo' : semplice ? 'Con questo contenuto' : 'APL impostato'}</span>
          </span>
          <span className="text-sm font-semibold text-white tabular-nums block">
            {formatWatts(wattsForApl(shownApl))}
            <span className="text-[11px] text-[var(--mute)] font-normal ml-1.5">{softwareOff ? 'LED spenti' : semplice ? `luminosità media ${n(shownApl, 0)}%` : `APL ${n(shownApl, 0)}%`}</span>
          </span>
        </div>

        {source && !mediaError && (
          <div className="flex items-center space-x-1 flex-shrink-0">
            {(source.kind === 'video' || source.kind === 'demo') && (
              <>
                <button
                  type="button"
                  onClick={togglePlay}
                  title={playing ? 'Pausa' : 'Riproduci'}
                  className="p-1.5 rounded-lg border border-[var(--line)] bg-[var(--s1)] hover:bg-[var(--s2)] text-[var(--text)] cursor-pointer"
                >
                  {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                {source.kind === 'video' && (
                <button
                  type="button"
                  onClick={() => setMuted((m) => !m)}
                  title={muted ? 'Attiva audio' : 'Disattiva audio'}
                  className="p-1.5 rounded-lg border border-[var(--line)] bg-[var(--s1)] hover:bg-[var(--s2)] text-[var(--text)] cursor-pointer"
                >
                  {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
                )}
              </>
            )}
            {/* La demo è disegnata alla misura dello schermo: non c'è niente da adattare */}
            {source.kind !== 'demo' && (
            <button
              type="button"
              onClick={() => onFitChange(fit === 'cover' ? 'contain' : 'cover')}
              title={fit === 'cover' ? 'Mostra tutto il contenuto (bande nere)' : 'Riempi lo schermo (ritaglia)'}
              className="px-2 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--s1)] hover:bg-[var(--s2)] text-[var(--text)] text-[11px] font-medium flex items-center space-x-1 cursor-pointer"
            >
              {fit === 'cover' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span>{fit === 'cover' ? 'Adatta' : 'Riempi'}</span>
            </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
