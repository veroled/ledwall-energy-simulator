'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useSimulatorStore } from '../../store/useSimulatorStore';
import { CABINET_FORMATS } from '../../config/config';
import { MonitorPlay, Grid, SlidersHorizontal, Layers } from 'lucide-react';

export const CabinetCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [viewMode, setViewMode] = useState<'dooh' | 'diodes' | 'rgb'>('dooh');

  const { modulesW, modulesH, formatId, pitchMm, setModulesW, setModulesH } = useSimulatorStore();
  const format = CABINET_FORMATS.find((f) => f.id === formatId) || CABINET_FORMATS[0];

  // Calcoli fisici e risoluzione
  const widthM = (modulesW * format.widthMm) / 1000;
  const heightM = (modulesH * format.heightMm) / 1000;
  const areaM2 = widthM * heightM;
  const resW = Math.round((modulesW * format.widthMm) / pitchMm);
  const resH = Math.round((modulesH * format.heightMm) / pitchMm);
  const totalPixels = resW * resH;
  const totalWeightKg = modulesW * modulesH * format.weightKg;

  // Render canvas fotorealistico con matrice a diodi LED reali
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dimensioni canvas responsive ad alta densità (supporto Retina)
    const containerW = canvas.parentElement?.clientWidth || 560;
    const displayW = Math.max(320, containerW);
    const displayH = 340;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = displayW * dpr;
    canvas.height = displayH * dpr;
    canvas.style.width = `${displayW}px`;
    canvas.style.height = `${displayH}px`;

    ctx.scale(dpr, dpr);

    // Sfondo chassis profondo
    ctx.fillStyle = '#04060A';
    ctx.fillRect(0, 0, displayW, displayH);

    // Area utile per il display LEDwall
    const paddingX = 45;
    const paddingY = 40;
    const availW = displayW - paddingX * 2;
    const availH = displayH - paddingY * 2;

    const aspect = (modulesW * format.widthMm) / (modulesH * format.heightMm);
    let screenW = availW;
    let screenH = screenW / aspect;

    if (screenH > availH) {
      screenH = availH;
      screenW = screenH * aspect;
    }

    const startX = (displayW - screenW) / 2;
    const startY = (displayH - screenH) / 2 + 6;

    const cabW = screenW / modulesW;
    const cabH = screenH / modulesH;

    // 1. CORNICE METALLICA PERIMETRALE / BEZEL CHASSIS
    ctx.fillStyle = '#090D14';
    ctx.fillRect(startX - 4, startY - 4, screenW + 8, screenH + 8);
    ctx.strokeStyle = '#1E2633';
    ctx.lineWidth = 1;
    ctx.strokeRect(startX - 4, startY - 4, screenW + 8, screenH + 8);

    // Viti / staffe angolari di montaggio
    const drawScrew = (sx: number, sy: number) => {
      ctx.fillStyle = '#2D3748';
      ctx.beginPath();
      ctx.arc(sx, sy, 1.8, 0, Math.PI * 2);
      ctx.fill();
    };
    drawScrew(startX - 2, startY - 2);
    drawScrew(startX + screenW + 2, startY - 2);
    drawScrew(startX - 2, startY + screenH + 2);
    drawScrew(startX + screenW + 2, startY + screenH + 2);

    // 2. CREA GRAFICA DOOH AD ALTO IMPATTO SU CANVAS AUSILIARIO
    const offCanvas = document.createElement('canvas');
    const offW = 240;
    const offH = Math.max(60, Math.round(offW / aspect));
    offCanvas.width = offW;
    offCanvas.height = offH;
    const offCtx = offCanvas.getContext('2d');

    if (offCtx) {
      if (viewMode === 'dooh') {
        // Visuale Commerciale DOOH ad alto contrasto (VeroLED Expressions of Light)
        const grad = offCtx.createLinearGradient(0, 0, offW, offH);
        grad.addColorStop(0, '#040F1E');
        grad.addColorStop(0.35, '#0B2D26');
        grad.addColorStop(0.7, '#12B76A');
        grad.addColorStop(1, '#06182B');
        offCtx.fillStyle = grad;
        offCtx.fillRect(0, 0, offW, offH);

        // Cerchi / neon glow artistici
        offCtx.fillStyle = 'rgba(18, 183, 106, 0.45)';
        offCtx.beginPath();
        offCtx.arc(offW * 0.75, offH * 0.4, offH * 0.6, 0, Math.PI * 2);
        offCtx.fill();

        offCtx.fillStyle = 'rgba(56, 189, 248, 0.35)';
        offCtx.beginPath();
        offCtx.arc(offW * 0.25, offH * 0.65, offH * 0.55, 0, Math.PI * 2);
        offCtx.fill();

        // Tipografia centrale del visual DOOH
        offCtx.fillStyle = '#FFFFFF';
        offCtx.font = `bold ${Math.max(10, Math.round(offH * 0.28))}px Inter, sans-serif`;
        offCtx.textAlign = 'center';
        offCtx.textBaseline = 'middle';
        offCtx.fillText('VEROLED', offW / 2, offH * 0.42);

        offCtx.fillStyle = '#E8EDF2';
        offCtx.font = `600 ${Math.max(6, Math.round(offH * 0.12))}px Inter, sans-serif`;
        offCtx.fillText('HIGH RESOLUTION OUTDOOR', offW / 2, offH * 0.72);
      } else if (viewMode === 'rgb') {
        // Pattern calibrazione RGB a bande
        const bands = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#00FFFF', '#FF00FF', '#FFFFFF', '#12B76A'];
        const bandW = offW / bands.length;
        bands.forEach((color, i) => {
          offCtx.fillStyle = color;
          offCtx.fillRect(i * bandW, 0, bandW, offH);
        });
      } else {
        // Schermo spento / black mask pura
        offCtx.fillStyle = '#06080C';
        offCtx.fillRect(0, 0, offW, offH);
      }
    }

    const offData = offCtx ? offCtx.getImageData(0, 0, offW, offH) : null;

    // 3. GENERAZIONE MATRICE PIXELLATA REALE (SMD LED DIODES)
    // Determina la densità dei diodi visibili in base al pixel pitch selezionato
    const targetPitchPx = Math.max(3.2, Math.min(8.5, 3.2 + (pitchMm - 2.6) * 0.55));
    const diodesX = Math.max(modulesW * 4, Math.round(screenW / targetPitchPx));
    const diodesY = Math.max(modulesH * 4, Math.round(screenH / targetPitchPx));

    const stepX = screenW / diodesX;
    const stepY = screenH / diodesY;
    const diodeRadius = Math.max(1.0, Math.min(2.8, (stepX * 0.72) / 2));

    // Sfondo maschera ottica nera (louver mask)
    ctx.fillStyle = '#06090D';
    ctx.fillRect(startX, startY, screenW, screenH);

    // Disegno singolo diodo SMD
    for (let dy = 0; dy < diodesY; dy++) {
      const py = startY + dy * stepY + stepY / 2;
      const normY = dy / (diodesY - 1 || 1);
      const sampleY = Math.min(offH - 1, Math.floor(normY * offH));

      for (let dx = 0; dx < diodesX; dx++) {
        const px = startX + dx * stepX + stepX / 2;
        const normX = dx / (diodesX - 1 || 1);
        const sampleX = Math.min(offW - 1, Math.floor(normX * offW));

        let r = 25, g = 30, b = 38;

        if (offData && viewMode !== 'diodes') {
          const idx = (sampleY * offW + sampleX) * 4;
          r = offData.data[idx];
          g = offData.data[idx + 1];
          b = offData.data[idx + 2];
        } else if (viewMode === 'diodes') {
          r = 18;
          g = 22;
          b = 28;
        }

        // Socket nero del package SMD
        ctx.fillStyle = '#030507';
        ctx.fillRect(px - stepX * 0.46, py - stepY * 0.46, stepX * 0.92, stepY * 0.92);

        // Corpo diodo LED con colore campionato
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.beginPath();
        ctx.arc(px, py, diodeRadius, 0, Math.PI * 2);
        ctx.fill();

        // Punto di emissione focale centrale (brillantezza ottica)
        if (viewMode !== 'diodes' && (r > 60 || g > 60 || b > 60)) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.beginPath();
          ctx.arc(px, py, diodeRadius * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 4. LINEE DI SEPARAZIONE CABINET & MODULI (FUGHE MECCANICHE REALISTICHE)
    ctx.strokeStyle = '#020305';
    ctx.lineWidth = 1.5;

    for (let c = 1; c < modulesW; c++) {
      const cx = startX + c * cabW;
      ctx.beginPath();
      ctx.moveTo(cx, startY);
      ctx.lineTo(cx, startY + screenH);
      ctx.stroke();
    }

    for (let r = 1; r < modulesH; r++) {
      const ry = startY + r * cabH;
      ctx.beginPath();
      ctx.moveTo(startX, ry);
      ctx.lineTo(startX + screenW, ry);
      ctx.stroke();
    }

    // Sub-moduli interni
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.lineWidth = 0.75;
    for (let c = 0; c < modulesW; c++) {
      const midX = startX + c * cabW + cabW / 2;
      ctx.beginPath();
      ctx.moveTo(midX, startY);
      ctx.lineTo(midX, startY + screenH);
      ctx.stroke();
    }
    for (let r = 0; r < modulesH; r++) {
      const midY = startY + r * cabH + cabH / 2;
      ctx.beginPath();
      ctx.moveTo(startX, midY);
      ctx.lineTo(startX + screenW, midY);
      ctx.stroke();
    }

    // 5. QUOTE DIMENSIONALI TECNICHE CON FRECCE ARCHITETTONICHE
    ctx.fillStyle = '#9AA3AD';
    ctx.font = '600 11px Inter, sans-serif';
    ctx.textAlign = 'center';

    // Quota Superiore (Larghezza)
    const quoteTopY = startY - 14;
    ctx.fillText(`${widthM.toFixed(2)} m (${resW} px)`, displayW / 2, quoteTopY - 4);

    ctx.strokeStyle = '#2D3748';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startX, quoteTopY);
    ctx.lineTo(startX + screenW, quoteTopY);
    ctx.moveTo(startX, quoteTopY - 4);
    ctx.lineTo(startX, quoteTopY + 4);
    ctx.moveTo(startX + screenW, quoteTopY - 4);
    ctx.lineTo(startX + screenW, quoteTopY + 4);
    ctx.stroke();

    // Quota Laterale Sinistra (Altezza)
    const quoteLeftX = startX - 16;
    ctx.save();
    ctx.translate(quoteLeftX, displayH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${heightM.toFixed(2)} m (${resH} px)`, 0, -4);

    ctx.beginPath();
    ctx.moveTo(-screenH / 2, 0);
    ctx.lineTo(screenH / 2, 0);
    ctx.moveTo(-screenH / 2, -4);
    ctx.lineTo(-screenH / 2, 4);
    ctx.moveTo(screenH / 2, -4);
    ctx.lineTo(screenH / 2, 4);
    ctx.stroke();
    ctx.restore();
  }, [modulesW, modulesH, format, pitchMm, viewMode, widthM, heightM, resW, resH]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-[#1A2028] bg-[#04060A] p-4 flex flex-col space-y-3">
      {/* 1. BARRA DI CONTROLLO SUPERIORE: COLONNE & RIGHE SPOSTATE SOPRA ALLA GRAFICA */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1A2028]">
        {/* Info Formato Cabinet */}
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-[#12B76A]" />
          <span className="font-semibold text-xs text-white">Griglia Cabinet 2D</span>
          <span className="text-[11px] px-2 py-0.5 rounded bg-[#0D1117] text-[#9AA3AD] border border-[#1A2028]">
            {format.name}
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded bg-[#0D2818] text-[#34D399] border border-[#163826] font-medium">
            Passo P{pitchMm} mm
          </span>
        </div>

        {/* CONTROLLI COLONNE E RIGHE DIRETTAMENTE SOPRA AL DISPLAY */}
        <div className="flex items-center space-x-4 text-xs text-[#E8EDF2]">
          {/* Colonne */}
          <div className="flex items-center space-x-1.5 bg-[#0D1117] px-2.5 py-1.5 rounded-lg border border-[#1A2028]">
            <span className="text-[#868D97] font-medium">Colonne:</span>
            <button
              type="button"
              onClick={() => setModulesW(modulesW - 1)}
              className="w-5 h-5 rounded bg-[#10141D] hover:bg-[#161F30] border border-[#1A2028] text-white font-bold flex items-center justify-center transition-colors cursor-pointer"
              title="Riduci colonne"
            >
              -
            </button>
            <span className="font-semibold text-white tabular-nums min-w-[24px] text-center">
              {modulesW}
            </span>
            <button
              type="button"
              onClick={() => setModulesW(modulesW + 1)}
              className="w-5 h-5 rounded bg-[#10141D] hover:bg-[#161F30] border border-[#1A2028] text-white font-bold flex items-center justify-center transition-colors cursor-pointer"
              title="Aumenta colonne"
            >
              +
            </button>
          </div>

          {/* Righe */}
          <div className="flex items-center space-x-1.5 bg-[#0D1117] px-2.5 py-1.5 rounded-lg border border-[#1A2028]">
            <span className="text-[#868D97] font-medium">Righe:</span>
            <button
              type="button"
              onClick={() => setModulesH(modulesH - 1)}
              className="w-5 h-5 rounded bg-[#10141D] hover:bg-[#161F30] border border-[#1A2028] text-white font-bold flex items-center justify-center transition-colors cursor-pointer"
              title="Riduci righe"
            >
              -
            </button>
            <span className="font-semibold text-white tabular-nums min-w-[24px] text-center">
              {modulesH}
            </span>
            <button
              type="button"
              onClick={() => setModulesH(modulesH + 1)}
              className="w-5 h-5 rounded bg-[#10141D] hover:bg-[#161F30] border border-[#1A2028] text-white font-bold flex items-center justify-center transition-colors cursor-pointer"
              title="Aumenta righe"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* 2. SELETTORE MODALITÀ GRAFICA LEDWALL PIXELLATA */}
      <div className="w-full flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1 text-[#868D97]">
          <span>Visualizzazione matrice:</span>
        </div>
        <div className="flex items-center space-x-1 bg-[#0D1117] p-0.5 rounded-lg border border-[#1A2028]">
          <button
            type="button"
            onClick={() => setViewMode('dooh')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center space-x-1 transition-colors cursor-pointer ${
              viewMode === 'dooh'
                ? 'bg-[#12B76A] text-white font-semibold'
                : 'text-[#868D97] hover:text-[#E8EDF2]'
            }`}
          >
            <MonitorPlay className="w-3 h-3" />
            <span>Video DOOH</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('diodes')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center space-x-1 transition-colors cursor-pointer ${
              viewMode === 'diodes'
                ? 'bg-[#12B76A] text-white font-semibold'
                : 'text-[#868D97] hover:text-[#E8EDF2]'
            }`}
          >
            <Grid className="w-3 h-3" />
            <span>Matrice SMD</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('rgb')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center space-x-1 transition-colors cursor-pointer ${
              viewMode === 'rgb'
                ? 'bg-[#12B76A] text-white font-semibold'
                : 'text-[#868D97] hover:text-[#E8EDF2]'
            }`}
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Test RGB</span>
          </button>
        </div>
      </div>

      {/* 3. CANVAS PIXELLATO REALE AD ALTA DEFINIZIONE */}
      <div className="w-full flex items-center justify-center overflow-hidden rounded-lg bg-[#020406] py-1 border border-[#161C24]">
        <canvas ref={canvasRef} className="block select-none" />
      </div>

      {/* 4. SCHEDA TELEMETRIA TECNICA IN TEMPO REALE SOTTO IL CANVAS */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
        <div className="p-2 rounded-lg bg-[#0D1117] border border-[#1A2028]">
          <div className="text-[10px] text-[#868D97] uppercase tracking-wider">Superficie</div>
          <div className="font-semibold text-white tabular-nums mt-0.5">
            {areaM2.toFixed(2)} m² <span className="text-[#868D97] font-normal">({widthM.toFixed(1)}×{heightM.toFixed(1)}m)</span>
          </div>
        </div>

        <div className="p-2 rounded-lg bg-[#0D1117] border border-[#1A2028]">
          <div className="text-[10px] text-[#868D97] uppercase tracking-wider">Risoluzione Reale</div>
          <div className="font-semibold text-white tabular-nums mt-0.5">
            {resW} × {resH} px
          </div>
        </div>

        <div className="p-2 rounded-lg bg-[#0D1117] border border-[#1A2028]">
          <div className="text-[10px] text-[#868D97] uppercase tracking-wider">Totale Diodi LED</div>
          <div className="font-semibold text-[#34D399] tabular-nums mt-0.5">
            {totalPixels.toLocaleString('it-IT')} SMD
          </div>
        </div>

        <div className="p-2 rounded-lg bg-[#0D1117] border border-[#1A2028]">
          <div className="text-[10px] text-[#868D97] uppercase tracking-wider">Struttura Cabinet</div>
          <div className="font-semibold text-white tabular-nums mt-0.5">
            {modulesW * modulesH} pz <span className="text-[#868D97] font-normal">(~{totalWeightKg} kg)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
