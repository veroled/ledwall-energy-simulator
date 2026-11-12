'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useSimulatorStore } from '../../store/useSimulatorStore';
import { prodottoInterno } from '../../core/interno';
import { estraiTestoDaPdf, analizzaTestoSchedaTecnica, DatiSchedaTecnica } from '../../core/pdf-parser';
import { FileText, Settings, Upload, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

export const S1DataSource: React.FC = () => {
  const { dataSource, setDataSource, setDatiSchedaTecnica, nextStep, ambiente, setAmbiente, prodottoInterno: idInterno } = useSimulatorStore();
  const mip = prodottoInterno(idInterno);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<DatiSchedaTecnica | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Formato file non supportato. Si prega di caricare un documento PDF.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const text = await estraiTestoDaPdf(file);
      const parsed = analizzaTestoSchedaTecnica(text, file.name);
      setExtractedData(parsed);
      setDatiSchedaTecnica(parsed);
      setDataSource('pdf');
    } catch (err: any) {
      setErrorMessage('Impossibile estrarre il testo dal PDF. Verranno applicati i parametri stimati di default.');
      setDataSource('manual');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 15 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -15 }}
      className="w-full max-w-3xl space-y-6"
    >
      <div className="border-b border-[var(--line)] pb-4">
        <h2 className="text-xl font-semibold text-white">
          1. Fonte Dati Tecnico-Dimensionali
        </h2>
        <p className="text-xs text-[var(--mute)] mt-1">
          Scegli se analizzare un preventivo PDF esistente oppure configurare i parametri con i profili certificati VeroLED.
        </p>
      </div>

      {/* Dove va lo schermo (12/11/2026): il ramo interno usa le misure del Titan Max MiP */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-[var(--mute)]">Dove va lo schermo?</div>
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Dove va lo schermo">
          {(['esterno', 'interno'] as const).map((a) => (
            <button
              key={a}
              type="button"
              role="radio"
              aria-checked={ambiente === a}
              onClick={() => setAmbiente(a)}
              className={`min-h-12 px-4 py-3 rounded-lg border text-left text-sm font-semibold transition-colors cursor-pointer ${
                ambiente === a ? 'border-2 border-[var(--ok)] text-white bg-[rgb(var(--ok-rgb)/10%)]' : 'border-[var(--line)] text-[var(--text)] bg-[var(--s1)] hover:border-[var(--s3)]'
              }`}
            >
              {a === 'esterno' ? 'All\'esterno' : 'In interno'}
              <span className="block text-xs font-normal text-[var(--mute)] mt-0.5">
                {a === 'esterno' ? 'Facciate, DOOH, piazze: luce del sole e notte' : 'Sale controllo, negozi, sale riunioni'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {ambiente === 'interno' ? (
        <div className="p-6 rounded-lg bg-[var(--s1)] border border-[var(--line)] space-y-3">
          <h3 className="font-semibold text-white text-base">{mip.nome}: i consumi misurati</h3>
          <p className="text-xs text-[var(--mute)] leading-relaxed">
            Il calcolo parte dalle nostre misure alla presa su un cabinet {mip.nome} {mip.passoMisura} da 600 × 337,5 mm:
            {' '}<strong className="text-white">{mip.wNeroCabinet} W</strong> con lo schermo acceso e nero,
            {' '}<strong className="text-white">{mip.wBiancoCabinet.toLocaleString('it-IT')} W</strong> col bianco pieno a {mip.nitMisura} nit (calibrazione D65).
            Fra i due valori la potenza cresce col contenuto e con la luminanza; oltre i {mip.nitMisura} nit, fino ai {mip.nitMax.toLocaleString('it-IT')} a D93, è una stima.
          </p>
          <a href={mip.scheda} className="text-xs font-medium text-[var(--text)] underline underline-offset-2">Scheda del {mip.nome}</a>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
        {/* Option A: Upload PDF */}
        <div
          onClick={() => setDataSource('pdf')}
          className={`bg-[var(--s1)] p-6 rounded-lg cursor-pointer border transition-colors flex flex-col justify-between space-y-4 relative ${
            dataSource === 'pdf'
              ? 'border-2 border-[var(--ok)] bg-[rgb(var(--ok-rgb)/10%)]/30'
              : 'border-[var(--line)] hover:border-[var(--s3)]'
          }`}
        >
          {dataSource === 'pdf' && (
            <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[var(--pieno-fondo)]"></span>
          )}
          <div className="space-y-2.5">
            <div className="w-10 h-10 rounded-lg bg-[var(--s1)] border border-[var(--line)] flex items-center justify-center text-white">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-base">Carica Scheda / Preventivo (PDF)</h3>
            <p className="text-xs text-[var(--mute)] leading-relaxed">
              Trascina il PDF della scheda tecnica. Estrarremo in automatico W/m², nits, passo pixel e dimensioni cabinet.
            </p>
          </div>

          <label className="block cursor-pointer">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="p-4 rounded-lg border border-dashed border-[var(--s3)] bg-[var(--s1)] hover:bg-[var(--s2)] text-center transition-colors">
              {isProcessing ? (
                <span className="text-xs font-medium text-[var(--ok)]">
                  Analisi testo PDF in corso...
                </span>
              ) : extractedData ? (
                <div className="flex items-center justify-center space-x-2 text-xs font-medium text-[var(--ok)]">
                  <CheckCircle2 className="w-4 h-4 text-[var(--ok)]" />
                  <span className="truncate max-w-[180px]">{extractedData.nomeFile}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2 text-xs text-[var(--mute)]">
                  <Upload className="w-4 h-4 text-[var(--mute)]" />
                  <span>Clicca o trascina PDF</span>
                </div>
              )}
            </div>
          </label>
        </div>

        {/* Option B: Manual Config */}
        <div
          onClick={() => {
            setDataSource('manual');
            setDatiSchedaTecnica(null);
            setExtractedData(null);
          }}
          className={`bg-[var(--s1)] p-6 rounded-lg cursor-pointer border transition-colors flex flex-col justify-between space-y-4 relative ${
            dataSource === 'manual'
              ? 'border-2 border-[var(--ok)] bg-[rgb(var(--ok-rgb)/10%)]/30'
              : 'border-[var(--line)] hover:border-[var(--s3)]'
          }`}
        >
          {dataSource === 'manual' && (
            <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[var(--pieno-fondo)]"></span>
          )}
          <div className="space-y-2.5">
            <div className="w-10 h-10 rounded-lg bg-[var(--s1)] border border-[var(--line)] flex items-center justify-center text-white">
              <Settings className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-base">Configurazione Manuale Guidata</h3>
            <p className="text-xs text-[var(--mute)] leading-relaxed">
              Configura passo passo dimensioni dello schermo, tecnologia del silicio e formato cabinet secondo il catalogo VeroLED.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-[var(--s1)] border border-[var(--line)] text-center">
            <span className="text-xs font-medium text-[var(--text)]">
              Profilo Zenit Outdoor Certificato
            </span>
          </div>
        </div>
      </div>

      )}

      {ambiente === 'esterno' && extractedData && (
        <div className="p-4 rounded-lg bg-[var(--s1)] border border-[var(--line)] text-xs text-[var(--mute)] space-y-1.5">
          <div className="text-white font-semibold">Parametri rilevati dalla scheda tecnica:</div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>• Potenza Max: <strong className="text-white">{extractedData.pMaxWmq.valore} W/m²</strong></div>
            <div>• Standby: <strong className="text-white">{extractedData.pStandbyWmq.valore} W/m²</strong></div>
            <div>• Passo Pixel: <strong className="text-white">P{extractedData.pitchMm.valore} mm</strong></div>
            <div>• Luminosità: <strong className="text-white">{extractedData.nits.valore} nit</strong></div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-lg bg-[rgb(var(--alarm-rgb)/12%)] border border-[rgb(var(--alarm-rgb)/35%)] text-xs text-[var(--alarm)] flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={nextStep}
          className="px-6 py-2.5 rounded-lg bg-[var(--pieno-fondo)] hover:bg-[var(--pieno-fondo-hover)] text-[var(--pieno-testo)] font-semibold text-xs flex items-center space-x-2 transition-colors cursor-pointer shadow-sm"
        >
          <span>Continua al Dimensionamento</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};
