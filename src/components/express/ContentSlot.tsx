'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { analizzaVideoApl, caricaFrameFoto, aplDaFrames, type FitMode } from '../../core/apl-engine';
import { fotogrammiDemo, VERSIONI_DEMO, type VersioneDemo } from '../../core/demo-veroled';
import { preparaDemo } from './demo-risorse';
import { ContentPreview, type PreviewSource } from './ContentPreview';
import { Upload, CheckCircle2, AlertTriangle, RotateCcw } from 'lucide-react';

const n = (v: number, d = 0) => v.toLocaleString('it-IT', { maximumFractionDigits: d, minimumFractionDigits: d, useGrouping: 'always' } as Intl.NumberFormatOptions);

/** La demo di uno slot: quale versione del contenuto VeroLED (src/core/demo-veroled.ts) */
export interface DemoSlot {
  versione: VersioneDemo;
}

export interface SlotInfo {
  aplPercent: number;
  origine: 'demo' | 'video' | 'foto' | 'manual';
  nome: string;
}

interface ContentSlotProps {
  id: 'A' | 'B';
  titolo: string;
  sottotitolo: string;
  demo: DemoSlot;
  ratioW: number;
  ratioH: number;
  resolutionLabel: string;
  /** Stessa funzione per entrambi gli slot: cambia solo il contenuto, mai la formula */
  wattsForApl: (aplPercent: number) => number;
  softwareOff: boolean;
  semplice: boolean;
  /** Se impostato (modalità tecnica) sostituisce il contenuto con un APL uniforme scelto a mano */
  manualAplPercent?: number | null;
  onInfo: (info: SlotInfo) => void;
}

/**
 * Uno slot del confronto contenuti: la sua anteprima, la sua casella di upload, la sua analisi APL.
 * Ogni slot è indipendente: caricare un file qui non tocca l'altro.
 */
export const ContentSlot: React.FC<ContentSlotProps> = ({
  id,
  titolo,
  sottotitolo,
  demo,
  ratioW,
  ratioH,
  resolutionLabel,
  wattsForApl,
  softwareOff,
  semplice,
  manualAplPercent = null,
  onInfo,
}) => {
  const [upload, setUpload] = useState<{ source: PreviewSource; nome: string; tipo: 'video' | 'foto' } | null>(null);
  // Frame campionati del contenuto in uso (demo o file del cliente), con la chiave di ciò che rappresentano:
  // l'APL si ricalcola su questi a ogni cambio di formato o adattamento, senza rianalizzare il file
  const [analisi, setAnalisi] = useState<{ chiave: string; frames: HTMLCanvasElement[] } | null>(null);
  const [fit, setFit] = useState<FitMode>('cover');
  const [progress, setProgress] = useState<number | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const uploadUrlRef = useRef<string | null>(null);

  useEffect(() => () => {
    if (uploadUrlRef.current) URL.revokeObjectURL(uploadUrlRef.current);
  }, []);

  const manuale = manualAplPercent !== null;
  const etichettaDemo = VERSIONI_DEMO[demo.versione].etichetta;
  // La demo si ridisegna alla misura dello schermo: la sua chiave cambia col formato, quella di un file no
  const chiaveDemo = `demo:${demo.versione}:${ratioW}x${ratioH}`;
  const chiaveAttiva = upload ? upload.source.url : chiaveDemo;

  // Misura della demo: 30 fotogrammi disegnati nel rapporto del LEDwall, a ogni cambio di formato.
  // Finché la misura non c'è lo slot non dichiara niente (la pagina tiene APL_DEMO_PROVVISORIO per quell'istante).
  useEffect(() => {
    if (upload || manuale) return;
    let annullata = false;
    preparaDemo(demo.versione).then((scritta) => {
      if (!annullata) setAnalisi({ chiave: chiaveDemo, frames: fotogrammiDemo(demo.versione, ratioW, ratioH, scritta) });
    });
    return () => { annullata = true; };
  }, [chiaveDemo, demo.versione, ratioW, ratioH, upload, manuale]);

  const caricaFile = async (file: File) => {
    const video = file.type.startsWith('video/');
    const foto = file.type.startsWith('image/');
    if (!video && !foto) {
      setErrore('Formato non supportato: carica un video o una foto.');
      return;
    }
    setErrore(null);
    setProgress(0);
    if (uploadUrlRef.current) URL.revokeObjectURL(uploadUrlRef.current);
    const url = URL.createObjectURL(file);
    uploadUrlRef.current = url;
    setUpload({ source: { kind: video ? 'video' : 'image', url }, nome: file.name, tipo: video ? 'video' : 'foto' });
    setAnalisi(null);
    try {
      const frames = video ? (await analizzaVideoApl(file, (p) => setProgress(p))).frames : [await caricaFrameFoto(file)];
      setAnalisi({ chiave: url, frames });
    } catch (err) {
      console.warn(`Slot ${id}: analisi non riuscita`, err);
      setErrore(err instanceof Error ? err.message : 'Analisi non riuscita.');
    } finally {
      setProgress(null);
    }
  };

  const ripristinaDemo = () => {
    if (uploadUrlRef.current) URL.revokeObjectURL(uploadUrlRef.current);
    uploadUrlRef.current = null;
    setUpload(null);
    setAnalisi(null);
    setErrore(null);
  };

  // Stessa misura dell'anteprima: contenuto inquadrato nel rapporto del LEDwall, ritaglio o bande nere compresi
  const misura = useMemo(
    () => (analisi && analisi.chiave === chiaveAttiva ? aplDaFrames(analisi.frames, ratioW, ratioH, fit) : null),
    [analisi, chiaveAttiva, ratioW, ratioH, fit]
  );

  const aplPercent = manuale ? (manualAplPercent as number) : misura ? misura.averageAplPercent : null;
  const origine: SlotInfo['origine'] = manuale ? 'manual' : upload ? upload.tipo : 'demo';
  const nome = manuale ? 'APL impostato a mano' : upload ? upload.nome : etichettaDemo;

  useEffect(() => {
    if (aplPercent !== null) onInfo({ aplPercent, origine, nome });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aplPercent, origine, nome]);

  const source: PreviewSource | null = manuale ? null : upload ? upload.source : { kind: 'demo', url: `demo:${demo.versione}`, versione: demo.versione };
  const inAnalisi = progress !== null;

  return (
    <div className="p-3.5 rounded-xl bg-[var(--s1)] border border-[var(--line)] space-y-3 min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold text-white flex items-center space-x-2">
          <span className={`w-5 h-5 rounded-md text-[11px] flex items-center justify-center font-bold ${id === 'A' ? 'bg-[rgb(var(--ok-rgb)/10%)] text-[var(--ok)] border border-[rgb(var(--ok-rgb)/30%)]' : 'bg-[var(--line)] text-[var(--text)] border border-[var(--s3)]'}`}>{id}</span>
          <span>{titolo}</span>
        </span>
        <span className="text-[10px] text-[var(--mute)] truncate">{sottotitolo}</span>
      </div>

      <ContentPreview
        source={source}
        ratioW={ratioW}
        ratioH={ratioH}
        resolutionLabel={resolutionLabel}
        aplPercent={aplPercent ?? 0}
        wattsForApl={wattsForApl}
        fit={fit}
        onFitChange={setFit}
        softwareOff={softwareOff}
        semplice={semplice}
        compatta
      />

      <label
        className="block cursor-pointer"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) caricaFile(f); }}
      >
        <input
          type="file"
          accept="video/*,image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) caricaFile(f); e.target.value = ''; }}
        />
        <div className={`px-3 py-2.5 rounded-lg border border-dashed text-center transition-colors ${dragOver ? 'border-[var(--ok)] bg-[rgb(var(--ok-rgb)/10%)]' : 'border-[var(--s3)] bg-[var(--s1)] hover:bg-[var(--s2)]'}`}>
          {inAnalisi ? (
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-[var(--ok)] block">Analisi 30 frame · {progress}%</span>
              <div className="w-full h-1 bg-[var(--line)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--pieno-fondo)] transition-all duration-200" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : (
            <div className="space-y-0.5">
              <span className="text-[11px] font-medium text-[var(--text)] flex items-center justify-center space-x-1.5">
                {upload ? <CheckCircle2 className="w-3.5 h-3.5 text-[var(--ok)] flex-shrink-0" /> : <Upload className="w-3.5 h-3.5 text-[var(--mute)] flex-shrink-0" />}
                <span className="truncate max-w-[220px]">{upload ? upload.nome : `Carica il tuo video o la tua foto nello slot ${id}`}</span>
              </span>
              <span className="text-[10px] text-[var(--faint)] block tabular-nums">
                {manuale
                  ? 'Contenuto sostituito dall\'APL impostato a mano'
                  : aplPercent !== null
                  ? `${upload ? 'Il tuo file' : etichettaDemo} · luminosità media ${n(aplPercent, 1)}%${misura && analisi && analisi.frames.length > 1 ? ` (da ${n(misura.minAplPercent)}% a ${n(misura.maxAplPercent)}%)` : ''}`
                  : upload ? 'analisi locale, nulla viene caricato online' : 'misura della demo in corso…'}
              </span>
            </div>
          )}
        </div>
      </label>

      {errore && (
        <p className="text-[11px] text-[var(--alarm)] flex items-start space-x-1.5">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{errore}</span>
        </p>
      )}
      {upload && (
        <button type="button" onClick={ripristinaDemo} className="text-[11px] text-[var(--mute)] hover:text-white flex items-center space-x-1 cursor-pointer">
          <RotateCcw className="w-3 h-3" />
          <span>Torna alla demo</span>
        </button>
      )}
    </div>
  );
};
