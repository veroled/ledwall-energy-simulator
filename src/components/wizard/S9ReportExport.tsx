'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useSimulatorStore, useSimulatorComputed } from '../../store/useSimulatorStore';
import { generaReportPdf } from '../../core/export-pdf';
import { FileDown, Share2, Mail, RefreshCw, ShieldCheck } from 'lucide-react';

export const S9ReportExport: React.FC = () => {
  const { lead, setLead, resetToDefaults } = useSimulatorStore();
  const { dimensions, profile, scenario, powerQuality, opticalConsulting, alternative } = useSimulatorComputed();
  // Il report è un documento che va al cliente: non si genera se i nit impostati superano il tetto
  // di listino della combinazione Selection × passo (tetto noto e superato; il dato mancante non blocca).
  const nitOltreTetto = alternative.currentHasData && !alternative.currentMeetsBrightness;
  const state = useSimulatorStore();

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(lead.submitted);

  const handleDownloadPdf = () => {
    try {
      const doc = generaReportPdf({
        dimensions,
        scenario,
        profile,
        aplPercent: state.aplPercent,
        tariffaEurKwh: state.tariffEurKwh,
        powerQuality,
        opticalConsulting,
        userName: lead.name,
        userCompany: lead.company,
        userEmail: lead.email,
      });
      doc.save(`VeroLED_Audit_Energetico_${dimensions.widthM}x${dimensions.heightM}m.pdf`);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Errore durante la generazione del PDF:', err);
    }
  };

  const handleShareUrl = () => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('w', String(state.modulesW));
    url.searchParams.set('h', String(state.modulesH));
    url.searchParams.set('p', String(state.pitchMm));
    url.searchParams.set('apl', String(state.aplPercent));
    url.searchParams.set('hours', String(state.operatingHoursDay));
    url.searchParams.set('tariff', String(state.tariffEurKwh));

    navigator.clipboard.writeText(url.toString());
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLead({ submitted: true });
    setLeadSubmitted(true);
    handleDownloadPdf();
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
          Fase 9 di 9 · Audit Finale
        </span>
        <h2 className="text-2xl md:text-3xl font-semibold text-white">
          Il tuo Audit Energetico è Pronto
        </h2>
        <p className="text-sm text-[#9AA3AD] max-w-2xl mx-auto">
          Scarica il documento tecnico completo o richiedi un&apos;analisi personalizzata agli ingegneri VeroLED.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* PDF Document Preview Card */}
        <div className="bg-[#0D1117] p-6 rounded-xl border border-[#1A2028] shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-full aspect-[4/3] rounded-xl bg-[#04060A] border border-[#1A2028] p-5 flex flex-col justify-between text-xs text-[#E8EDF2]">
              <div className="flex justify-between items-center border-b border-[#1A2028] pb-2">
                <span className="font-semibold text-white tracking-wider uppercase">VeroLED Energy Audit</span>
                <span className="text-[10px] text-[#34D399] bg-[#0D2818] border border-[#163826] px-2 py-0.5 rounded font-semibold">CEI 64-8 Compliant</span>
              </div>

              <div className="space-y-2 py-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#868D97]">Display:</span>
                  <span className="text-white font-semibold tabular-nums">
                    {dimensions.areaM2.toFixed(1)} m² ({dimensions.widthM}×{dimensions.heightM} m)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#868D97]">Passo Pixel:</span>
                  <span className="text-white font-medium">P{dimensions.pitchMm} mm Outdoor</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#868D97]">Risparmio Stimato:</span>
                  <span className="text-[#12B76A] font-semibold tabular-nums">
                    +{Math.round(scenario.savingsEur).toLocaleString('it-IT')} € / anno
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#868D97]">Taglio Bolletta:</span>
                  <span className="text-[#34D399] font-semibold tabular-nums">-{scenario.savingsPercent.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#868D97]">CO₂ Abbattuta:</span>
                  <span className="text-white font-semibold tabular-nums">{scenario.co2SavedTons.toFixed(1)} ton/anno</span>
                </div>
              </div>

              <div className="text-[10px] text-[#868D97] border-t border-[#1A2028] pt-2 flex justify-between items-center">
                <span>Modello: Fleet Monitor PRO</span>
                <span>Garanzia: Fino a 8 anni</span>
              </div>
            </div>

            {/* Download Buttons */}
            <div className="space-y-2">
              {nitOltreTetto && (
                <p className="p-2.5 rounded-lg bg-[#2A1111] border border-[#5B1F1F] text-[11px] text-[#FCA5A5] leading-relaxed">
                  Report bloccato: i {alternative.current.nits.toLocaleString('it-IT')} nit impostati superano il tetto di listino del P{alternative.current.pitchMm} ({(alternative.currentMaxNits ?? 0).toLocaleString('it-IT')} nit). Torna al passo 2 e abbassa i nit o cambia Selection.
                </p>
              )}
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={nitOltreTetto}
                className={`w-full py-2.5 rounded-lg font-semibold text-xs tracking-wider flex items-center justify-center space-x-2 transition-colors shadow-sm ${
                  nitOltreTetto ? 'bg-[#1A2028] text-[#667085] cursor-not-allowed' : 'bg-[#12B76A] hover:bg-[#0E9F5D] text-white cursor-pointer'
                }`}
              >
                <FileDown className="w-4 h-4" />
                <span>
                  {downloadSuccess ? '✓ PDF SCARICATO' : 'SCARICA PDF UFFICIALE'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleShareUrl}
                className="w-full py-2 rounded-lg border border-[#1A2028] bg-[#10141D] hover:bg-[#161F30] hover:border-[#2D3748] text-xs text-[#E8EDF2] font-medium transition-colors flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-[#9AA3AD]" />
                <span>{copiedUrl ? '✓ Link Copiato!' : 'Copia Link Condivisibile (URL Parametrico)'}</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={resetToDefaults}
            className="text-xs text-[#868D97] hover:text-white font-medium flex items-center justify-center space-x-1.5 pt-1 cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Azzera e ricomincia simulazione</span>
          </button>
        </div>

        {/* Optional Lead Generation Form */}
        <div className="bg-[#0D1117] p-6 rounded-xl border border-[#1A2028] shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-[#12B76A] text-xs font-semibold uppercase tracking-wider">
              <Mail className="w-4 h-4" />
              <span>Consulenza Energetica Gratuita</span>
            </div>
            <h3 className="font-semibold text-white text-base mt-1">
              Vuoi un dimensionamento esecutivo?
            </h3>
            <p className="text-xs text-[#9AA3AD] mt-1 leading-relaxed">
              Ricevi l&apos;Audit Energetico via email e richiedi un&apos;analisi tecnica di fattibilità direttamente dall&apos;ufficio ingegneristico VeroLED.
            </p>
          </div>

          {leadSubmitted ? (
            <div className="p-6 rounded-xl bg-[#0D2818] border border-[#163826] text-center space-y-2">
              <ShieldCheck className="w-10 h-10 text-[#12B76A] mx-auto" />
              <div className="font-semibold text-[#34D399] text-sm">Richiesta inviata con successo!</div>
              <p className="text-xs text-[#E8EDF2]">
                Un nostro ingegnere prenderà in carico i parametri del tuo display entro 24 ore lavorative.
              </p>
            </div>
          ) : (
            <form onSubmit={handleLeadSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#9AA3AD] mb-1 font-medium">Nome e Cognome:</label>
                <input
                  type="text"
                  required
                  placeholder="Mario Rossi"
                  value={lead.name}
                  onChange={(e) => setLead({ name: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-[#07090C] border border-[#1A2028] text-white placeholder-[#667085] focus:border-[#12B76A] outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-[#9AA3AD] mb-1 font-medium">Azienda / Insegna:</label>
                <input
                  type="text"
                  required
                  placeholder="Media Outdoor SpA"
                  value={lead.company}
                  onChange={(e) => setLead({ company: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-[#07090C] border border-[#1A2028] text-white placeholder-[#667085] focus:border-[#12B76A] outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-[#9AA3AD] mb-1 font-medium">Email Aziendale:</label>
                <input
                  type="email"
                  required
                  placeholder="mario@mediaoutdoor.it"
                  value={lead.email}
                  onChange={(e) => setLead({ email: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-[#07090C] border border-[#1A2028] text-white placeholder-[#667085] focus:border-[#12B76A] outline-none text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-[#12B76A] hover:bg-[#0E9F5D] text-white font-semibold text-xs uppercase tracking-wider transition-colors shadow-sm cursor-pointer mt-2"
              >
                Invia Report via Email &amp; Richiedi Contatto
              </button>

              <span className="text-[10px] text-[#868D97] block text-center mt-1">
                Nessun obbligo di acquisto. Trattamento dati ai sensi del GDPR.
              </span>
            </form>
          )}
        </div>
      </div>
    </motion.div>
  );
};
