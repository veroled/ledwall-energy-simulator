'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useSimulatorStore, useSimulatorComputed, BASE_MAX_M, ALTEZZA_MAX_M } from '../../store/useSimulatorStore';
import { stimaPotenzaDaPassoNit, calcolaPotenzaWmq, calcolaProfiloEnergetico, datoCatalogo, passiDelTier, stessoPasso, tierName, TIERS, PASSI_CATALOGO } from '../../core/physics';
import { RecommendationBanner } from './RecommendationBanner';
import { ContentSlot, type DemoSlot, type SlotInfo } from './ContentSlot';
import { APL_DEMO_PROVVISORIO } from '../../core/demo-veroled';
import {
  Play,
  Zap,
  Sun,
  Eye,
  Info,
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

const fmtPotenza = (watt: number) => (watt < 10000 ? `${n(watt)} W` : `${n(watt / 1000, 1)} kW`);

const subscribeNoop = () => () => {};
const useMounted = () => useSyncExternalStore(subscribeNoop, () => true, () => false);

const SIZE_PRESETS = [
  { w: 4, h: 2 },
  { w: 6, h: 3 },
  { w: 8, h: 4 },
  { w: 10, h: 5 },
];

// Il LEDwall "standard di mercato" su cui gira la schermata semplice: la Selection più diffusa in commercio,
// al passo outdoor più comune e alla sua luminosità di listino. I nit incidono sul consumo, quindi non si
// lasciano a caso: valgono quelli dichiarati per questa combinazione.
const STANDARD = { tier: 'bronze' as const, pitchMm: 3.91 };

const CONTENT_PRESETS = [
  { apl: 15, label: 'Scuro', hint: 'fondi neri, scritte' },
  { apl: 30, label: 'Misto', hint: 'spot pubblicitari' },
  { apl: 60, label: 'Chiaro', hint: 'fondi bianchi, foto' },
];

const CONTATTI_URL = 'https://veroled.it/contatti/';

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
    expressTecnico,
    modulesW,
    modulesH,
    targetOutdoorNits,
    groundViewingDistM,
    installHeightM,
    operatingHoursDay,
    tariffEurKwh,
    liveLumDiurna,
    hasStandby,
    hasNightDimming,
    nightDimmingPercent,
    setPitchMm,
    setTier,
    setExpressTecnico,
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

  const { dimensions, alternative, pMax, pStandby } = useSimulatorComputed();

  const mounted = useMounted();
  const [showAdvanced, setShowAdvanced] = useState(false);
  // Schermo nero da software: i LED sono spenti ma alimentatori, schede e ricevitori restano accesi
  const [softwareOff, setSoftwareOff] = useState(false);
  // Confronto contenuti: due slot indipendenti. A è "il tuo contenuto" e alimenta report e wizard, B è il paragone.
  const [slotA, setSlotA] = useState<SlotInfo | null>(null);
  const [slotB, setSlotB] = useState<SlotInfo | null>(null);
  // Solo modalità tecnica: APL uniforme scelto a mano al posto del contenuto dello slot A
  const [manualAplA, setManualAplA] = useState<number | null>(null);

  useEffect(() => {
    // La modalità express ragiona in metri interi su cabinet 1000×1000
    setFormatId('1000x1000');
  }, [setFormatId]);

  const tecnico = expressTecnico === true;
  const applicaStandard = () => {
    const dato = datoCatalogo(STANDARD.tier, STANDARD.pitchMm);
    setTier(STANDARD.tier);
    setPitchMm(STANDARD.pitchMm);
    if (dato) setTargetOutdoorNits(dato.maxNits);
  };
  useEffect(() => {
    // Nella schermata semplice il calcolo gira SEMPRE sul LEDwall standard, anche se dal wizard o dalla
    // modalità tecnica erano rimasti altri valori in memoria: altrimenti la riga "calcolato su" mentirebbe.
    if (!tecnico) applicaStandard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tecnico]);

  const tier = storedTier ?? 'bronze';
  const tierLabel = tierName(tier);
  // Tetto di nit della combinazione Selection × passo: dal listino, oppure assente (mai preso in prestito)
  const datoScelto = datoCatalogo(tier, pitchMm);
  const datoMancante = datoScelto === null;
  const nitsOverLimit = datoScelto !== null && targetOutdoorNits > datoScelto.maxNits;
  // Lo slider copre tutto il catalogo: l'utente deve poter chiedere più nit di quanti la combinazione regga,
  // perché è lì che scatta il controllo. Il tetto della combinazione scelta è segnato sulla barra.
  const NIT_MIN = 2500;
  const nitSliderMax = Math.max(...TIERS.flatMap((t) => passiDelTier(t.id).map((r) => r.maxNits)));
  const tettoPos = datoScelto ? Math.max(0, Math.min(100, ((datoScelto.maxNits - NIT_MIN) / (nitSliderMax - NIT_MIN)) * 100)) : null;

  // Lo slot A è il contenuto del cliente: il suo APL è quello che finisce nello store, quindi nel report e nel wizard
  useEffect(() => {
    if (!slotA) return;
    const origine = slotA.origine === 'manual' ? 'manual' : slotA.origine === 'foto' ? 'foto' : 'video';
    setAplPercent(slotA.aplPercent, origine, origine === 'manual' ? undefined : slotA.nome);
  }, [slotA, setAplPercent]);

  const goToWizard = (step: number) => {
    setStep(step);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center text-xs font-medium text-[var(--mute)]">
        Inizializzazione simulatore...
      </div>
    );
  }

  const standbyWmq = hasStandby ? pStandby : 0;

  // La demo VeroLED, disegnata dal vivo alla misura dello schermo (src/core/demo-veroled.ts)
  const demoA: DemoSlot = { versione: 'chiaro' };
  const demoB: DemoSlot = { versione: 'ottimizzato' };

  // Stessa funzione per i due slot: cambia solo l'APL, la configurazione dello schermo è condivisa
  const profiloPer = (aplPercentSlot: number) =>
    softwareOff
      ? calcolaProfiloEnergetico(dimensions.areaM2, 0, 0, 0, operatingHoursDay, hasStandby, true, tariffEurKwh, pMax, pStandby)
      : calcolaProfiloEnergetico(dimensions.areaM2, aplPercentSlot / 100, liveLumDiurna / 100, nightDimmingPercent / 100, operatingHoursDay, hasStandby, hasNightDimming, tariffEurKwh, pMax, pStandby);
  const profiloA = profiloPer(slotA?.aplPercent ?? APL_DEMO_PROVVISORIO.chiaro);
  const profiloB = profiloPer(slotB?.aplPercent ?? APL_DEMO_PROVVISORIO.ottimizzato);
  const aplA = slotA?.aplPercent ?? APL_DEMO_PROVVISORIO.chiaro;
  const aplB = slotB?.aplPercent ?? APL_DEMO_PROVVISORIO.ottimizzato;
  // Differenza A − B con il segno vero: se il cliente carica in B un contenuto più chiaro, si dice
  const deltaAnnuoEur = Math.round(profiloA.annualCostEur) - Math.round(profiloB.annualCostEur);
  const deltaPercento = profiloA.annualCostEur > 0 ? Math.round((Math.abs(deltaAnnuoEur) / Math.max(profiloA.annualCostEur, profiloB.annualCostEur)) * 100) : 0;
  const resolutionLabel = `${n(dimensions.resolutionX)}×${n(dimensions.resolutionY)} px`;

  const wattsForApl = (apl: number) =>
    calcolaPotenzaWmq({ apl: apl / 100, lum: softwareOff ? 0 : liveLumDiurna / 100, pMax, pStandby: standbyWmq }) * dimensions.areaM2;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] selection:bg-[var(--text)] selection:text-[var(--bg)]">
      {/* La testata è quella del sito (SiteHeader nel layout): qui solo il titolo della pagina e i due
          comandi dello strumento. Prima c'era una seconda barra col logo e il badge «Due dati · risultati
          live» (08/11/2026, il titolare: «c'è qualcosa di troppo?»). */}
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="min-w-0">
          {/* Briciole e titolo come le altre pagine del sito: H1 sulla scala unica (40–72 px, peso 400). */}
          <nav aria-label="Percorso" className="text-xs text-[var(--mute)] mb-4">
            <a href="/" className="text-[var(--mute)] hover:text-[var(--text)]">home</a> / <a href="/tool/" className="text-[var(--mute)] hover:text-[var(--text)]">strumenti</a> / calcolo express
          </nav>
          <h1 className="text-[clamp(40px,6vw,72px)] leading-[1.22] tracking-[0.02em] font-normal text-[var(--text)]">quanto consuma il tuo ledwall</h1>
          <p className="mt-2 text-sm text-[var(--mute)] max-w-[60ch]">Scrivi le misure e confronta due contenuti sullo stesso schermo: kW, kWh e bolletta, calcolati mentre scrivi.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setExpressTecnico(!tecnico)}
            aria-pressed={tecnico}
            className={`min-h-[44px] px-4 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer ${
              tecnico ? 'border-[var(--text)] bg-[var(--s2)] text-[var(--text)]' : 'border-[var(--line)] bg-[var(--s1)] text-[var(--text)] hover:bg-[var(--s2)]'
            }`}
          >
            <Settings2 className="w-4 h-4 text-[var(--mute)]" />
            <span>{tecnico ? 'Modalità tecnica attiva' : 'Modalità tecnica'}</span>
          </button>
          <Link
            href="/"
            onClick={() => goToWizard(0)}
            className="min-h-[44px] px-4 rounded-lg border border-[var(--line)] bg-[var(--s1)] text-sm font-medium text-[var(--text)] hover:bg-[var(--s2)] transition-colors flex items-center gap-2"
          >
            <LayoutList className="w-4 h-4 text-[var(--mute)]" />
            <span>Wizard completo</span>
          </Link>
        </div>
      </div>

      <main className="flex-grow max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
          {/* Colonna configurazione + risultati */}
          <div className="space-y-5 min-w-0">
            {/* 1. Schermo */}
            <section className="bg-[var(--s1)] p-5 rounded-xl border border-[var(--line)] shadow-sm space-y-5">
              <div className="flex items-center space-x-2 text-white font-semibold text-sm">
                <span className="w-5 h-5 rounded-full bg-[var(--s2)] border border-[var(--line)] text-[var(--text)] text-[11px] flex items-center justify-center font-bold">1</span>
                <Monitor className="w-4 h-4 text-[var(--mute)]" />
                <span>{tecnico ? 'Il tuo LEDwall' : 'Quanto è grande'}</span>
              </div>

              {tecnico && (<>
              {/* Selection: il tetto di nit è del componente montato, cioè della combinazione Selection × passo */}
              <div className="space-y-2">
                <span className="text-xs text-[var(--mute)] font-medium">Selection VeroLED <span className="text-[var(--faint)]">(qualità dei chip: a parità di passo cambia il tetto di nit)</span></span>
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
                            ? 'border border-[var(--text)] bg-[var(--s2)] text-[var(--text)] font-semibold'
                            : 'border border-[var(--line)] bg-[var(--s1)] text-[var(--text)] hover:border-[var(--mute)]'
                        }`}
                      >
                        <span>{t.name}</span>
                        <span className="text-[10px] font-mono text-[var(--mute)]">{t.wire}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Passo */}
              <div className="space-y-2">
                <span className="text-xs text-[var(--mute)] font-medium">Passo pixel</span>
                <div className="flex flex-wrap gap-2">
                  {PASSI_CATALOGO.map((p) => {
                    const dato = datoCatalogo(tier, p);
                    const selected = stessoPasso(pitchMm, p);
                    // Il passo si sceglie per la distanza di visione ed è SEMPRE selezionabile: la Selection decide
                    // quanti nit regge, e il controllo severo sta sul valore di nit, non sul bottone.
                    const oltreTetto = dato !== null && targetOutdoorNits > dato.maxNits;
                    const est = dato && !oltreTetto ? stimaPotenzaDaPassoNit(p, targetOutdoorNits, undefined, undefined, undefined, true, dato) : null;
                    const stress = !est ? '' : est.sforzoPercent >= 90 ? 'text-[var(--alarm)]' : est.sforzoPercent >= 65 ? 'text-[var(--warn)]' : 'text-[var(--ok)]';
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPitchMm(p)}
                        title={
                          !dato
                            ? `P${p} ${tierLabel}: tetto di nit non ancora censito per questa combinazione`
                            : `P${p} ${tierLabel}: fino a ${n(dato.maxNits)} nit · ${dato.chip}`
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center space-x-1.5 ${
                          selected
                            ? 'border border-[var(--text)] bg-[var(--s2)] text-[var(--text)] font-semibold'
                            : 'border border-[var(--line)] bg-[var(--s1)] text-[var(--text)] hover:border-[var(--mute)]'
                        }`}
                      >
                        <span>P{p}</span>
                        {!dato ? (
                          <span className="text-[10px] font-mono text-[var(--mute)]">n.d.</span>
                        ) : est ? (
                          <span className={`text-[10px] font-mono ${stress}`}>{est.sforzoPercent}%</span>
                        ) : (
                          <span className="text-[10px] font-mono text-[var(--warn)]">max {n(dato.maxNits)}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-[var(--mute)]">
                  Tutti i passi sono selezionabili: il passo si sceglie per la distanza di visione, la Selection decide quanti nit regge. La percentuale è lo sforzo dei chip {tierLabel} a {n(targetOutdoorNits)} nit (quota del tetto di listino di quella combinazione); «max» indica un tetto più basso dei nit impostati; «n.d.» un tetto non ancora censito nel listino, che non stimiamo né prendiamo da un&apos;altra Selection.
                </p>
              </div>

              </>)}

              {/* Dimensioni */}
              <div className={`grid grid-cols-1 gap-4 ${tecnico ? 'sm:grid-cols-2' : ''}`}>
                <div className="space-y-2">
                  <span className="text-xs text-[var(--mute)] font-medium">Dimensioni (base × altezza, metri)</span>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min={1}
                      max={BASE_MAX_M}
                      step={1}
                      value={modulesW}
                      onChange={(e) => setDimensioniMetri(parseInt(e.target.value || '1', 10), modulesH)}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--s1)] border border-[var(--line)] text-white text-sm tabular-nums focus:border-[var(--focus)] outline-none"
                    />
                    <span className="text-[var(--mute)] text-sm">×</span>
                    <input
                      type="number"
                      min={1}
                      max={ALTEZZA_MAX_M}
                      step={1}
                      value={modulesH}
                      onChange={(e) => setDimensioniMetri(modulesW, parseInt(e.target.value || '1', 10))}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--s1)] border border-[var(--line)] text-white text-sm tabular-nums focus:border-[var(--focus)] outline-none"
                    />
                    <span className="text-[var(--mute)] text-xs whitespace-nowrap">m</span>
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
                            sel ? 'bg-[var(--s2)] text-[var(--text)] border border-[var(--text)]' : 'bg-[var(--s1)] text-[var(--mute)] border border-[var(--line)] hover:text-white'
                          }`}
                        >
                          {s.w}×{s.h} m
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-[var(--mute)] tabular-nums">
                    {n(dimensions.areaM2, 0)} m² · {dimensions.totalCabinets} cabinet · {n(dimensions.resolutionX)}×{n(dimensions.resolutionY)} px
                  </p>
                </div>

                {/* Nit */}
                {tecnico && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[var(--mute)] font-medium flex items-center space-x-1.5">
                      <Sun className="w-3.5 h-3.5 text-[var(--warn)]" />
                      <span>Luminosità di picco</span>
                    </span>
                    <span className="text-sm font-semibold text-white tabular-nums">{softwareOff ? '0 nit · spento' : `${n(targetOutdoorNits)} nit`}</span>
                  </div>
                  <div className="relative">
                    <input
                      type="range"
                      min={NIT_MIN}
                      max={nitSliderMax}
                      step={500}
                      value={Math.min(targetOutdoorNits, nitSliderMax)}
                      disabled={softwareOff}
                      onChange={(e) => setTargetOutdoorNits(parseInt(e.target.value, 10))}
                      className={`w-full custom-slider ${softwareOff ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                    />
                    {tettoPos !== null && !softwareOff && (
                      <span
                        className={`absolute top-0 h-4 w-0.5 rounded pointer-events-none ${nitsOverLimit ? 'bg-[var(--alarm)]' : 'bg-[var(--ok)]'}`}
                        style={{ left: `calc(8px + (100% - 16px) * ${tettoPos / 100})` }}
                        title={`Tetto P${pitchMm} ${tierLabel}: ${n(datoScelto?.maxNits ?? 0)} nit`}
                      />
                    )}
                  </div>
                  <div className="flex justify-between text-[10px] text-[var(--mute)]">
                    <span className="whitespace-nowrap">2.500</span>
                    <span className={`text-center ${nitsOverLimit ? 'text-[var(--alarm)]' : 'text-[var(--ok)]'}`}>
                      {datoScelto ? `▏tetto P${pitchMm} ${tierLabel}: ${n(datoScelto.maxNits)}` : 'tetto non censito'}
                    </span>
                    <span className="whitespace-nowrap">{n(nitSliderMax)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSoftwareOff((v) => !v)}
                    aria-pressed={softwareOff}
                    className={`w-full px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center justify-center space-x-1.5 ${
                      softwareOff
                        ? 'border border-[var(--text)] bg-[var(--s2)] text-[var(--text)] font-semibold'
                        : 'border border-[var(--line)] bg-[var(--s1)] text-[var(--text)] hover:border-[var(--mute)]'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>Spento da software · {n(standbyWmq, Number.isInteger(standbyWmq) ? 0 : 1)} W/m²</span>
                  </button>
                  {softwareOff ? (
                    <p className="text-[11px] text-[var(--mute)]">
                      Schermo nero ma alimentato: il P{pitchMm} assorbe {n(standbyWmq, Number.isInteger(standbyWmq) ? 0 : 1)} W/m² di sola elettronica, 24 ore su 24. Si azzera solo staccando la linea con un relè.
                    </p>
                  ) : datoMancante ? (
                    <p className="text-[11px] text-[var(--focus)] flex items-start space-x-1.5">
                      <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>Tetto di nit non ancora censito per il P{pitchMm} {tierLabel}: il passo resta valido come scelta, ma non possiamo verificare che regga {n(targetOutdoorNits)} nit. È un dato che manca nel listino, non un limite del prodotto.</span>
                    </p>
                  ) : nitsOverLimit ? (
                    <div className="p-2.5 rounded-lg bg-[rgb(var(--alarm-rgb)/12%)] border border-[rgb(var(--alarm-rgb)/35%)] space-y-2">
                      <p className="text-[11px] text-[var(--alarm)] flex items-start space-x-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span>{n(targetOutdoorNits)} nit superano il tetto del P{pitchMm} {tierLabel}: {n(datoScelto.maxNits)} nit ({datoScelto.chip}). Questo valore non è erogabile: finché resta, risultati e report non sono validi.</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => setTargetOutdoorNits(Math.floor(datoScelto.maxNits / 500) * 500)}
                        className="w-full px-3 py-1.5 rounded-lg bg-[var(--alarm)] hover:bg-[var(--alarm)] text-[rgb(var(--alarm-rgb)/12%)] text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Riporta a {n(Math.floor(datoScelto.maxNits / 500) * 500)} nit
                      </button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-[var(--mute)]">Tetto di listino del P{pitchMm} {tierLabel}: {n(datoScelto.maxNits)} nit · {datoScelto.chip}</p>
                  )}
                </div>
                )}
              </div>

              {tecnico && (<>
              {/* Distanza di visione */}
              <div className="space-y-2">
                <span className="text-xs text-[var(--mute)] font-medium flex items-center space-x-1.5">
                  <Eye className="w-3.5 h-3.5 text-[var(--mute)]" />
                  <span>Da dove lo guardano? <span className="text-[var(--faint)]">(distanza a terra dal piede dello schermo)</span></span>
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
                            ? 'border border-[var(--text)] bg-[var(--s2)] text-[var(--text)] font-semibold'
                            : 'border border-[var(--line)] bg-[var(--s1)] text-[var(--text)] hover:border-[var(--mute)]'
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
                      className="w-20 px-2 py-1.5 rounded-lg bg-[var(--s1)] border border-[var(--line)] text-white text-xs tabular-nums focus:border-[var(--focus)] outline-none"
                    />
                    <span className="text-[11px] text-[var(--mute)]">m</span>
                  </div>
                </div>
              </div>

              {/* Quota della base: con la distanza a terra dà la linea di vista reale */}
              <div className="space-y-2">
                <span className="text-xs text-[var(--mute)] font-medium flex items-center space-x-1.5">
                  <ArrowUpFromLine className="w-3.5 h-3.5 text-[var(--mute)]" />
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
                            ? 'border border-[var(--text)] bg-[var(--s2)] text-[var(--text)] font-semibold'
                            : 'border border-[var(--line)] bg-[var(--s1)] text-[var(--text)] hover:border-[var(--mute)]'
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
                      className="w-20 px-2 py-1.5 rounded-lg bg-[var(--s1)] border border-[var(--line)] text-white text-xs tabular-nums focus:border-[var(--focus)] outline-none"
                    />
                    <span className="text-[11px] text-[var(--mute)]">m</span>
                  </div>
                </div>
                <p className="text-[11px] text-[var(--mute)] tabular-nums">
                  Schermo da {n(installHeightM, 1)} a {n(installHeightM + dimensions.heightM, 1)} m di quota · linea di vista al centro{' '}
                  <span className="text-white font-medium">{n(alternative.lineOfSightDistM, 1)} m</span> ({n(alternative.lineOfSightBaseM, 1)} m alla base, {n(alternative.lineOfSightTopM, 1)} m in cima) · da lì l&apos;occhio fonde i pixel fino al P{n(alternative.minResolvablePitchMm, 1)}
                </p>
              </div>
              </>)}
            </section>

            {/* 2. Contenuto: due slot indipendenti a confronto sullo stesso schermo */}
            <section className="bg-[var(--s1)] p-5 rounded-xl border border-[var(--line)] shadow-sm space-y-4">
              <div className="flex items-center space-x-2 text-white font-semibold text-sm">
                <span className="w-5 h-5 rounded-full bg-[var(--s2)] border border-[var(--line)] text-[var(--text)] text-[11px] flex items-center justify-center font-bold">2</span>
                <Play className="w-4 h-4 text-[var(--mute)]" />
                <span>Cosa trasmetti</span>
                <span className="text-[11px] text-[var(--mute)] font-normal hidden sm:inline">· stesso schermo, due contenuti: il contenuto pesa più del 70% della bolletta</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ContentSlot
                  id="A"
                  titolo={slotA && slotA.origine !== 'demo' ? 'Il tuo contenuto' : 'Contenuto chiaro · demo'}
                  sottotitolo="è il contenuto che finisce nel report PDF"
                  demo={demoA}
                  ratioW={modulesW}
                  ratioH={modulesH}
                  resolutionLabel={resolutionLabel}
                  wattsForApl={wattsForApl}
                  softwareOff={softwareOff}
                  semplice={!tecnico}
                  manualAplPercent={tecnico ? manualAplA : null}
                  onInfo={setSlotA}
                />
                <ContentSlot
                  id="B"
                  titolo={slotB && slotB.origine !== 'demo' ? 'Il tuo confronto' : 'Contenuto ottimizzato · demo'}
                  sottotitolo="stesso schermo, contenuto diverso"
                  demo={demoB}
                  ratioW={modulesW}
                  ratioH={modulesH}
                  resolutionLabel={resolutionLabel}
                  wattsForApl={wattsForApl}
                  softwareOff={softwareOff}
                  semplice={!tecnico}
                  onInfo={setSlotB}
                />
              </div>

              {tecnico && (
                <div className="p-3 rounded-lg bg-[var(--s1)] border border-[var(--line)] space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[var(--mute)] font-medium">Slot A senza file: imposta l&apos;APL a mano</span>
                    <span className="text-sm font-semibold text-white tabular-nums">{manualAplA !== null ? `${n(manualAplA)}%` : 'dal contenuto'}</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={100}
                    value={manualAplA ?? Math.round(aplA)}
                    onChange={(e) => setManualAplA(parseInt(e.target.value, 10))}
                    className="w-full custom-slider cursor-pointer"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {CONTENT_PRESETS.map((c) => (
                      <button
                        key={c.apl}
                        type="button"
                        title={c.hint}
                        onClick={() => setManualAplA(c.apl)}
                        className={`py-1.5 px-3 rounded-lg text-[11px] font-medium cursor-pointer transition-colors ${
                          manualAplA === c.apl
                            ? 'border border-[var(--text)] bg-[var(--s2)] text-[var(--text)] font-semibold'
                            : 'border border-[var(--line)] bg-[var(--s1)] text-[var(--text)] hover:border-[var(--mute)]'
                        }`}
                      >
                        {c.label} · {c.apl}%
                      </button>
                    ))}
                    {manualAplA !== null && (
                      <button type="button" onClick={() => setManualAplA(null)} className="py-1.5 px-3 rounded-lg text-[11px] font-medium cursor-pointer border border-[var(--line)] bg-[var(--s1)] text-[var(--mute)] hover:text-white">
                        Torna al contenuto
                      </button>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* 3. Consumi */}
            <section className="bg-[var(--s1)] p-5 rounded-xl border border-[var(--line)] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-white font-semibold text-sm">
                  <span className="w-5 h-5 rounded-full bg-[var(--s2)] border border-[var(--line)] text-[var(--text)] text-[11px] flex items-center justify-center font-bold">3</span>
                  <Zap className="w-4 h-4 text-[var(--mute)]" />
                  <span>Quanto consuma</span>
                  <span className="text-[11px] text-[var(--mute)] font-normal hidden sm:inline tabular-nums">
                    · {softwareOff ? 'a schermo spento da software, tutto il giorno' : 'lo stesso schermo con i due contenuti'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="text-[11px] text-[var(--mute)] hover:text-white flex items-center space-x-1 cursor-pointer"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>{operatingHoursDay} h/giorno · {n(tariffEurKwh, 2)} €/kWh</span>
                  {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {showAdvanced && (
                <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-[var(--s1)] border border-[var(--line)]">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] text-[var(--mute)]">
                      <span>Ore accese al giorno</span>
                      <span className="text-white tabular-nums">{operatingHoursDay} h</span>
                    </div>
                    <input type="range" min={1} max={24} value={operatingHoursDay} onChange={(e) => setSchedule(parseInt(e.target.value, 10))} className="w-full custom-slider cursor-pointer" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] text-[var(--mute)]">
                      <span>Tariffa energia</span>
                      <span className="text-white tabular-nums">{n(tariffEurKwh, 2)} €/kWh</span>
                    </div>
                    <input type="range" min={0.10} max={0.60} step={0.01} value={tariffEurKwh} onChange={(e) => setTariffRate(parseFloat(e.target.value))} className="w-full custom-slider cursor-pointer" />
                  </div>
                  <p className="col-span-2 text-[11px] text-[var(--faint)]">Di notte lo schermo scende al 10% (norma CEI). Spento da software il P{pitchMm} assorbe comunque {n(standbyWmq, Number.isInteger(standbyWmq) ? 0 : 1)} W/m².</p>
                </div>
              )}

              {nitsOverLimit && datoScelto && !softwareOff && (
                <p className="p-3 rounded-lg bg-[rgb(var(--alarm-rgb)/12%)] border border-[rgb(var(--alarm-rgb)/35%)] text-[11px] text-[var(--alarm)] flex items-start space-x-2">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>
                    Risultati non validi: il P{pitchMm} {tierLabel} non eroga {n(targetOutdoorNits)} nit. I consumi qui sotto sono quelli al suo tetto di {n(datoScelto.maxNits)} nit, non alla luminosità che hai chiesto. Abbassa i nit o cambia Selection.
                  </span>
                </p>
              )}
              {datoMancante && !softwareOff && (
                <p className="p-3 rounded-lg bg-[var(--s2)] border border-[#1E3A5F] text-[11px] text-[var(--focus)] flex items-start space-x-2">
                  <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>
                    Tetto non ancora censito per il P{pitchMm} {tierLabel}: i consumi qui sotto sono una stima sul solo passo a {n(targetOutdoorNits)} nit, senza la verifica che questa combinazione ci arrivi.
                  </span>
                </p>
              )}

              {/* Su schermi stretti la colonna di destra finisce in fondo: la differenza si ripete qui, in evidenza */}
              {!softwareOff && deltaAnnuoEur !== 0 && (
                <div className="lg:hidden p-3 rounded-lg bg-[var(--s2)] border border-[var(--line)]">
                  <span className="text-xl font-semibold text-white tabular-nums">{n(Math.abs(deltaAnnuoEur))} €</span>
                  <span className="text-xs text-[var(--mute)] ml-1.5">all&apos;anno di differenza · {deltaAnnuoEur > 0 ? 'B' : 'A'} spende il {deltaPercento}% in meno</span>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left tabular-nums">
                  <thead>
                    <tr className="text-[10px] uppercase text-[var(--mute)]">
                      <th className="py-2 pr-3 font-medium"></th>
                      <th className="py-2 px-3 font-medium text-[var(--text)]">A · {slotA?.origine === 'demo' || !slotA ? 'contenuto chiaro' : 'il tuo contenuto'}</th>
                      <th className="py-2 pl-3 font-medium text-[var(--text)]">B · {slotB?.origine === 'demo' || !slotB ? 'contenuto ottimizzato' : 'il tuo confronto'}</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm text-white">
                    {([
                      ['Luminosità media del contenuto', `${n(aplA, 0)}%`, `${n(aplB, 0)}%`],
                      ['Potenza in esercizio', fmtPotenza(profiloA.dayPowerWmq * dimensions.areaM2), fmtPotenza(profiloB.dayPowerWmq * dimensions.areaM2)],
                      ['Energia al giorno', `${n(profiloA.totalDailyKwh, 1)} kWh`, `${n(profiloB.totalDailyKwh, 1)} kWh`],
                      ['Bolletta al mese', `${n(profiloA.monthlyCostEur)} €`, `${n(profiloB.monthlyCostEur)} €`],
                    ] as const).map(([voce, a, b]) => (
                      <tr key={voce} className="border-t border-[var(--line)]">
                        <td className="py-2 pr-3 text-xs text-[var(--mute)]">{voce}</td>
                        <td className="py-2 px-3 font-medium">{a}</td>
                        <td className="py-2 pl-3 font-medium">{b}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-[var(--line)]">
                      <td className="py-3 pr-3 text-xs text-[var(--mute)]">Bolletta all&apos;anno</td>
                      <td className="py-3 px-3 text-xl font-semibold">{n(profiloA.annualCostEur)}<span className="text-xs text-[var(--mute)] ml-1">€</span></td>
                      <td className="py-3 pl-3 text-xl font-semibold">{n(profiloB.annualCostEur)}<span className="text-xs text-[var(--mute)] ml-1">€</span></td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-[11px] text-[var(--mute)] pt-1 tabular-nums">
                  Picco dello schermo {n(pMax)} W/m² · {n(profiloA.annualKwh)} kWh/anno con A, {n(profiloB.annualKwh)} con B · {n((profiloA.annualKwh * 0.305) / 1000, 2)} t CO₂/anno con A
                </p>
              </div>

              {!tecnico && (
                <div className="p-3 rounded-lg bg-[var(--s1)] border border-[var(--line)] flex flex-col sm:flex-row sm:items-center gap-3">
                  <p className="text-[11px] text-[var(--mute)] leading-relaxed flex-1">
                    Calcolato su un <span className="text-white font-medium">LEDwall standard di mercato</span> (P{pitchMm} {tierLabel}) alla sua luminosità di listino, {n(targetOutdoorNits)} nit.
                    Passo, qualità dei chip e luminosità cambiano il consumo: se vuoi scoprire quanto consuma la tua configurazione, contattaci.
                  </p>
                  <a
                    href={CONTATTI_URL}
                    className="min-h-[44px] inline-flex items-center justify-center px-4 rounded-lg border border-[var(--line)] text-[var(--text)] hover:bg-[var(--s2)] font-semibold text-sm whitespace-nowrap text-center transition-colors"
                  >
                    Contattaci
                  </a>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                {nitsOverLimit && !softwareOff ? (
                  <span
                    title="I nit impostati superano il tetto della combinazione: il report non si può generare"
                    className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--line)] text-[var(--faint)] font-semibold text-xs tracking-wide flex items-center justify-center space-x-2 cursor-not-allowed"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Report bloccato: nit oltre il tetto</span>
                  </span>
                ) : (
                  <Link
                    href="/"
                    onClick={() => goToWizard(9)}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--pieno-fondo)] hover:bg-[var(--pieno-fondo-hover)] text-[var(--pieno-testo)] font-semibold text-xs tracking-wide flex items-center justify-center space-x-2 transition-colors shadow-sm"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Scarica il report PDF</span>
                  </Link>
                )}
                <Link
                  href="/"
                  onClick={() => goToWizard(7)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-[var(--line)] bg-[var(--s1)] hover:bg-[var(--s2)] text-[var(--text)] font-semibold text-xs flex items-center justify-center space-x-2 transition-colors"
                >
                  <LayoutList className="w-4 h-4 text-[var(--mute)]" />
                  <span>Approfondisci nel wizard</span>
                </Link>
              </div>
            </section>
          </div>

          {/* Anteprima live + banner consiglio (sticky su desktop) */}
          <div className="lg:sticky lg:top-24 space-y-5">
            <section className="bg-[var(--s1)] p-5 rounded-xl border border-[var(--line)] shadow-sm space-y-3">
              <span className="text-xs font-medium text-[var(--mute)] flex items-center space-x-2">
                <Zap className="w-3.5 h-3.5" />
                <span>Quanto pesa il contenuto</span>
              </span>
              {softwareOff ? (
                <p className="text-sm text-[var(--text)]">A schermo spento da software il contenuto non conta: resta solo l&apos;elettronica.</p>
              ) : deltaAnnuoEur === 0 ? (
                <p className="text-sm text-[var(--text)]">I due contenuti costano uguale: {n(profiloA.annualCostEur)} € all&apos;anno.</p>
              ) : (
                <>
                  <div>
                    <span className="text-3xl font-semibold text-white tabular-nums">{n(Math.abs(deltaAnnuoEur))} €</span>
                    <span className="text-sm text-[var(--mute)] ml-1.5">all&apos;anno di differenza</span>
                  </div>
                  <p className="text-xs text-[var(--text)] leading-relaxed">
                    Sullo stesso schermo, il contenuto <b>{deltaAnnuoEur > 0 ? 'B' : 'A'}</b> spende il <b>{deltaPercento}% in meno</b> del contenuto <b>{deltaAnnuoEur > 0 ? 'A' : 'B'}</b>:
                    {' '}{n(Math.min(profiloA.annualCostEur, profiloB.annualCostEur))} € contro {n(Math.max(profiloA.annualCostEur, profiloB.annualCostEur))} € di bolletta annua.
                  </p>
                </>
              )}
              <div className="space-y-1.5 pt-1">
                {([['A', profiloA.annualCostEur, 'bg-[var(--text)]'], ['B', profiloB.annualCostEur, 'bg-[var(--mute)]']] as const).map(([id, costo, colore]) => (
                  <div key={id} className="flex items-center space-x-2 text-[11px] text-[var(--mute)] tabular-nums">
                    <span className="w-3 font-semibold text-white">{id}</span>
                    <div className="flex-1 h-2 rounded-full bg-[var(--line)] overflow-hidden">
                      <div className={`h-full rounded-full ${colore}`} style={{ width: `${Math.max(3, (costo / Math.max(profiloA.annualCostEur, profiloB.annualCostEur, 1)) * 100)}%` }} />
                    </div>
                    <span className="w-16 text-right">{n(costo)} €</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-[var(--mute)] leading-relaxed">
                Carica il tuo spot nello slot A o B per confrontarlo: fondi scuri e colori in risalto costano meno di fondi bianchi, a parità di schermo.
              </p>
            </section>
            {/* Il consiglio sul passo dipende dalla distanza di visione, che la schermata semplice non chiede */}
            {tecnico && (
              <RecommendationBanner
                alternative={alternative}
                installHeightM={installHeightM}
                groundViewingDistM={groundViewingDistM}
                onApply={() => setPitchMm(alternative.proposed.pitchMm)}
              />
            )}
          </div>
        </div>
      </main>

    </div>
  );
};
