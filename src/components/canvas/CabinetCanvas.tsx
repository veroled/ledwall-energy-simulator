'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useSimulatorStore } from '../../store/useSimulatorStore';
import { CABINET_FORMATS } from '../../config/config';
import { Play, Pause, ZoomIn, Sparkles, Layers, SlidersHorizontal, RefreshCw } from 'lucide-react';

export const CabinetCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Modalità scena: 'kinetic' (DOOH kinetic typo), 'glitch' (Cyber Glitch continuo), 'rgb' (Test Pattern)
  const [sceneMode, setSceneMode] = useState<'kinetic' | 'glitch' | 'rgb'>('kinetic');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [showMacroLoupe, setShowMacroLoupe] = useState<boolean>(true);

  const { modulesW, modulesH, formatId, pitchMm, setModulesW, setModulesH } = useSimulatorStore();
  const format = CABINET_FORMATS.find((f) => f.id === formatId) || CABINET_FORMATS[0];

  // Calcoli fisici esatti e conteggio reale dei pixel
  const widthM = (modulesW * format.widthMm) / 1000;
  const heightM = (modulesH * format.heightMm) / 1000;
  const areaM2 = widthM * heightM;

  // Pixel esatti per singolo cabinet e totali
  const cabPixW = Math.round(format.widthMm / pitchMm);
  const cabPixH = Math.round(format.heightMm / pitchMm);
  const totalPixW = modulesW * cabPixW;
  const totalPixH = modulesH * cabPixH;
  const totalDiodes = totalPixW * totalPixH;
  const totalWeightKg = modulesW * modulesH * format.weightKg;

  // Loop di animazione a 60fps con kinetic typography, glitch e adattamento totale a qualsiasi formato
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let startTime = performance.now();
    let glitchActive = false;
    let glitchDuration = 0;
    let nextGlitchTime = 1800;

    // Offscreen buffer per generare la grafica animata adattiva
    const offCanvas = document.createElement('canvas');
    const offCtx = offCanvas.getContext('2d');

    const render = (currentTime: number) => {
      const elapsed = isPlaying ? (currentTime - startTime) / 1000 : 0;

      // Gestione glitch casuale periodico (ogni 2.2 - 3.8 secondi)
      if (isPlaying) {
        if (!glitchActive && currentTime > nextGlitchTime) {
          glitchActive = true;
          glitchDuration = currentTime + 100 + Math.random() * 150;
        } else if (glitchActive && currentTime > glitchDuration) {
          glitchActive = false;
          nextGlitchTime = currentTime + 2400 + Math.random() * 2200;
        }
      }

      // Dimensioni canvas responsive ad alta densità
      const containerW = canvas.parentElement?.clientWidth || 580;
      const displayW = Math.max(320, containerW);
      const displayH = 340;

      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== displayW * dpr || canvas.height !== displayH * dpr) {
        canvas.width = displayW * dpr;
        canvas.height = displayH * dpr;
        canvas.style.width = `${displayW}px`;
        canvas.style.height = `${displayH}px`;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Sfondo profondo
      ctx.fillStyle = '#030508';
      ctx.fillRect(0, 0, displayW, displayH);

      // Calcolo area utile display
      const paddingX = 42;
      const paddingY = 38;
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
      const startY = (displayH - screenH) / 2 + 4;

      const cabW = screenW / modulesW;
      const cabH = screenH / modulesH;

      // 1. CHASSIS METALLICO PERIMETRALE
      ctx.fillStyle = '#080C14';
      ctx.fillRect(startX - 4, startY - 4, screenW + 8, screenH + 8);
      ctx.strokeStyle = '#1D2533';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(startX - 4, startY - 4, screenW + 8, screenH + 8);

      // Viti e staffe angolari
      ctx.fillStyle = '#323E50';
      ctx.beginPath();
      ctx.arc(startX - 2, startY - 2, 1.8, 0, Math.PI * 2);
      ctx.arc(startX + screenW + 2, startY - 2, 1.8, 0, Math.PI * 2);
      ctx.arc(startX - 2, startY + screenH + 2, 1.8, 0, Math.PI * 2);
      ctx.arc(startX + screenW + 2, startY + screenH + 2, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // 2. RENDERING CONTENUTO GRAFICO DINAMICO SU OFFSCREEN BUFFER ADATTIVO
      const bufW = Math.max(320, Math.round(screenW));
      const bufH = Math.max(100, Math.round(screenH));
      if (offCanvas.width !== bufW || offCanvas.height !== bufH) {
        offCanvas.width = bufW;
        offCanvas.height = bufH;
      }

      if (offCtx) {
        offCtx.clearRect(0, 0, bufW, bufH);

        if (sceneMode === 'rgb') {
          // Pattern calibrazione RGB a barre
          const colors = ['#FF0033', '#00FF66', '#0066FF', '#FFFF00', '#00FFFF', '#FF00FF', '#FFFFFF', '#12B76A'];
          const barW = bufW / colors.length;
          colors.forEach((col, i) => {
            offCtx.fillStyle = col;
            offCtx.fillRect(i * barW, 0, barW, bufH);
          });
        } else {
          // MODALITÀ DOOH KINETIC & GLITCH (ADATTAMENTO TOTALE A QUALSIASI FORMATO)
          const t = elapsed;

          // Sfondo vibrante con onde cinetiche
          const grad = offCtx.createLinearGradient(0, 0, bufW, bufH);
          const shift = Math.sin(t * 0.8) * 0.2;
          grad.addColorStop(0, '#020A14');
          grad.addColorStop(Math.max(0, 0.35 + shift), '#07251E');
          grad.addColorStop(Math.min(1, 0.7 + shift), '#12B76A');
          grad.addColorStop(1, '#05192C');
          offCtx.fillStyle = grad;
          offCtx.fillRect(0, 0, bufW, bufH);

          // Onde luminose animate
          const pulse = Math.sin(t * 2) * 0.15 + 0.85;
          offCtx.fillStyle = 'rgba(18, 183, 106, 0.35)';
          offCtx.beginPath();
          offCtx.arc(
            bufW * 0.7 + Math.cos(t) * 25,
            bufH * 0.4 + Math.sin(t * 1.2) * 15,
            Math.min(bufW, bufH) * 0.45 * pulse,
            0,
            Math.PI * 2
          );
          offCtx.fill();

          offCtx.fillStyle = 'rgba(56, 189, 248, 0.25)';
          offCtx.beginPath();
          offCtx.arc(
            bufW * 0.25 - Math.sin(t) * 20,
            bufH * 0.65 + Math.cos(t) * 15,
            Math.min(bufW, bufH) * 0.4 * pulse,
            0,
            Math.PI * 2
          );
          offCtx.fill();

          // Griglia geometrica cyber
          offCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          offCtx.lineWidth = 1;
          const gridCols = 8;
          for (let i = 0; i <= gridCols; i++) {
            offCtx.beginPath();
            offCtx.moveTo((i * bufW) / gridCols, 0);
            offCtx.lineTo((i * bufW) / gridCols, bufH);
            offCtx.stroke();
          }

          offCtx.save();

          // GLITCH EFFECT: Spostamento orizzontale a fette (cyber slice glitch)
          const isGlitching = glitchActive || sceneMode === 'glitch';
          if (isGlitching) {
            const slices = 4;
            const sliceH = bufH / slices;
            for (let s = 0; s < slices; s++) {
              if (Math.sin(t * 30 + s) > 0.1) {
                const sOffset = (Math.sin(t * 50 + s * 10) * (glitchActive ? 14 : 7));
                const sliceY = s * sliceH;
                try {
                  const sliceImg = offCtx.getImageData(0, sliceY, bufW, sliceH);
                  offCtx.putImageData(sliceImg, sOffset, sliceY);
                } catch {
                  // Fallback sicuro se off-canvas ha vincoli cross-origin
                }
              }
            }
          }

          // KINETIC TYPOGRAPHY ADATTIVA (CALCOLO GEOMETRICO DELLO SPAZIO PER NON TAGLIARE MAI I TESTI)
          if (aspect >= 2.0) {
            // 1. FORMATO WIDE / STRISCIONE ORIZZONTALE (es. 8x2, 10x2, 12x3)
            const titleSize = Math.min(bufH * 0.46, bufW * 0.18);
            offCtx.font = `900 ${titleSize}px Inter, sans-serif`;
            offCtx.fillStyle = '#FFFFFF';
            offCtx.textAlign = 'left';
            offCtx.textBaseline = 'middle';

            // Titolo cinetico con shimmer
            const shimmerX = (t * 220) % (bufW * 0.6);
            const textGrad = offCtx.createLinearGradient(shimmerX - 60, 0, shimmerX + 60, 0);
            textGrad.addColorStop(0, '#FFFFFF');
            textGrad.addColorStop(0.5, '#72F6B8');
            textGrad.addColorStop(1, '#FFFFFF');
            offCtx.fillStyle = textGrad;
            offCtx.fillText('VEROLED', bufW * 0.05, bufH * 0.40);

            // Ticker tape cinetico a scorrimento orizzontale in basso
            const tickerSize = Math.min(bufH * 0.22, bufW * 0.05);
            offCtx.font = `700 ${tickerSize}px Inter, sans-serif`;
            offCtx.fillStyle = '#34D399';
            const tickerText = '▶ EXPRESSIONS OF LIGHT · 3840Hz REFRESH · P' + pitchMm + 'mm HIGH BRIGHTNESS · ';
            const tWidth = offCtx.measureText(tickerText).width || 300;
            const scrollX = -( (t * 60) % tWidth );
            offCtx.fillText(tickerText + tickerText, bufW * 0.05 + scrollX, bufH * 0.78);

            // Telemetria destra
            offCtx.textAlign = 'right';
            offCtx.font = `600 ${tickerSize * 0.9}px Inter, sans-serif`;
            offCtx.fillStyle = '#E8EDF2';
            offCtx.fillText(`${totalPixW}×${totalPixH} PX`, bufW * 0.95, bufH * 0.40);
            offCtx.fillStyle = '#9AA3AD';
            offCtx.fillText(`P${pitchMm} mm`, bufW * 0.95, bufH * 0.78);
          } else if (aspect <= 0.85) {
            // 2. FORMATO VERTICALE / TOTEM (es. 2x4, 2x5, 2x6)
            // Testo impilato verticale, grande e perfettamente centrato
            const titleSize = Math.min(bufW * 0.32, bufH * 0.14);
            offCtx.font = `900 ${titleSize}px Inter, sans-serif`;
            offCtx.fillStyle = '#FFFFFF';
            offCtx.textAlign = 'center';
            offCtx.textBaseline = 'middle';

            const pulseScale = 1 + Math.sin(t * 2) * 0.03;
            offCtx.save();
            offCtx.scale(pulseScale, pulseScale);
            offCtx.fillText('VERO', (bufW / 2) / pulseScale, (bufH * 0.22) / pulseScale);
            offCtx.fillText('LED', (bufW / 2) / pulseScale, (bufH * 0.38) / pulseScale);
            offCtx.restore();

            // Sottotitoli compatti verticali
            const subSize = Math.min(bufW * 0.15, bufH * 0.065);
            offCtx.font = `800 ${subSize}px Inter, sans-serif`;
            offCtx.fillStyle = '#34D399';
            offCtx.fillText('OUTDOOR', bufW / 2, bufH * 0.58);

            offCtx.font = `600 ${subSize * 0.9}px Inter, sans-serif`;
            offCtx.fillStyle = '#FFFFFF';
            offCtx.fillText(`P${pitchMm} mm`, bufW / 2, bufH * 0.72);

            offCtx.fillStyle = '#9AA3AD';
            offCtx.font = `500 ${subSize * 0.8}px Inter, sans-serif`;
            offCtx.fillText(`${totalPixW}×${totalPixH}`, bufW / 2, bufH * 0.86);
          } else {
            // 3. FORMATO STANDARD / BILLBOARD (es. 6x4, 5x3, 4x3, 4x4)
            // Header HUD
            const hudSize = Math.min(bufW * 0.045, bufH * 0.09);
            offCtx.font = `700 ${hudSize}px Inter, sans-serif`;
            offCtx.fillStyle = 'rgba(255, 255, 255, 0.75)';
            offCtx.textAlign = 'left';
            offCtx.textBaseline = 'top';
            offCtx.fillText(`● LIVE · P${pitchMm} mm`, bufW * 0.05, bufH * 0.08);

            offCtx.textAlign = 'right';
            offCtx.fillText(`${totalPixW} × ${totalPixH} PX`, bufW * 0.95, bufH * 0.08);

            // Typo BIG VEROLED centrata con kinetic breathing
            const titleSize = Math.min(bufW * 0.23, bufH * 0.32);
            offCtx.font = `900 ${titleSize}px Inter, sans-serif`;
            offCtx.textAlign = 'center';
            offCtx.textBaseline = 'middle';

            const kineticScale = 1 + Math.sin(t * 1.8) * 0.025;
            offCtx.save();
            offCtx.scale(kineticScale, kineticScale);

            // Shimmer effect sulle lettere
            const shimmerX = (t * 180) % (bufW * 1.2);
            const textGrad = offCtx.createLinearGradient(shimmerX - 80, 0, shimmerX + 80, 0);
            textGrad.addColorStop(0, '#FFFFFF');
            textGrad.addColorStop(0.5, '#72F6B8');
            textGrad.addColorStop(1, '#FFFFFF');
            offCtx.fillStyle = textGrad;
            offCtx.fillText('VEROLED', (bufW / 2) / kineticScale, (bufH * 0.44) / kineticScale);
            offCtx.restore();

            // Ticker tape cinetico orizzontale a scorrimento continuo in basso (non si taglia mai!)
            const tickerSize = Math.min(bufW * 0.052, bufH * 0.12);
            offCtx.font = `700 ${tickerSize}px Inter, sans-serif`;
            offCtx.fillStyle = '#34D399';
            offCtx.textAlign = 'left';
            offCtx.textBaseline = 'middle';

            const tickerText = '★ EXPRESSIONS OF LIGHT · HIGH RESOLUTION DOOH · 3840Hz PWM REFRESH · VEROLED FLEET MONITOR · ';
            const tWidth = offCtx.measureText(tickerText).width || 350;
            const scrollX = -( (t * 55) % tWidth );
            offCtx.fillText(tickerText + tickerText, bufW * 0.05 + scrollX, bufH * 0.78);
          }

          // Scanline PWM dinamica a scorrimento
          const scanY = ((t * 140) % bufH);
          offCtx.fillStyle = 'rgba(255, 255, 255, 0.14)';
          offCtx.fillRect(0, scanY, bufW, Math.max(2, bufH * 0.035));

          offCtx.restore();
        }
      }

      // 3. PROIEZIONE SULLA MATRICE DIODI FISICA (CONTA ESATTA DEI PIXEL)
      ctx.drawImage(offCanvas, startX, startY, screenW, screenH);

      // RETINATURA FISICA A DIODI (LOUVER MASK):
      // Spaziatura diodi direttamente proporzionale al pixel pitch (più fine a P2.6, molto sgranata e grossa a P8/P10)
      const diodeStep = Math.max(3.0, Math.min(8.8, 3.0 + (pitchMm - 2.6) * 0.62));
      const colsDiodes = Math.round(screenW / diodeStep);
      const rowsDiodes = Math.round(screenH / diodeStep);

      const dxStep = screenW / colsDiodes;
      const dyStep = screenH / rowsDiodes;

      // Maschera nera dei socket dei singoli diodi SMD
      ctx.fillStyle = '#05070B';
      for (let r = 0; r < rowsDiodes; r++) {
        const py = startY + r * dyStep;
        for (let c = 0; c < colsDiodes; c++) {
          const px = startX + c * dxStep;

          // Bordo socket quadrato nero intorno a ciascun package SMD
          ctx.strokeStyle = 'rgba(2, 3, 5, 0.85)';
          ctx.lineWidth = 0.9;
          ctx.strokeRect(px, py, dxStep, dyStep);

          // Mascheramento per dare forma circolare all'ottica SMD
          ctx.fillStyle = 'rgba(2, 3, 5, 0.42)';
          ctx.fillRect(px, py, dxStep * 0.15, dyStep);
          ctx.fillRect(px + dxStep * 0.85, py, dxStep * 0.15, dyStep);
          ctx.fillRect(px, py, dxStep, dyStep * 0.15);
          ctx.fillRect(px, py + dyStep * 0.85, dxStep, dyStep * 0.15);
        }
      }

      // 4. FUGHE MECCANICHE DEI CABINET (1.5mm) E DEI SOTTOMODULI
      ctx.strokeStyle = '#010203';
      ctx.lineWidth = 1.6;

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

      // Sottomoduli interni
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 0.8;
      for (let c = 0; c < modulesW; c++) {
        const mx = startX + c * cabW + cabW / 2;
        ctx.beginPath();
        ctx.moveTo(mx, startY);
        ctx.lineTo(mx, startY + screenH);
        ctx.stroke();
      }
      for (let r = 0; r < modulesH; r++) {
        const my = startY + r * cabH + cabH / 2;
        ctx.beginPath();
        ctx.moveTo(startX, my);
        ctx.lineTo(startX + screenW, my);
        ctx.stroke();
      }

      // 5. QUOTE ARCHITETTONICHE DI PRECISIONE
      ctx.fillStyle = '#9AA3AD';
      ctx.font = '600 11px Inter, sans-serif';
      ctx.textAlign = 'center';

      // Quota orizzontale
      const quoteTopY = startY - 14;
      ctx.fillText(`${widthM.toFixed(2)} m (${totalPixW} px)`, displayW / 2, quoteTopY - 4);

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

      // Quota verticale
      const quoteLeftX = startX - 16;
      ctx.save();
      ctx.translate(quoteLeftX, displayH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(`${heightM.toFixed(2)} m (${totalPixH} px)`, 0, -4);

      ctx.beginPath();
      ctx.moveTo(-screenH / 2, 0);
      ctx.lineTo(screenH / 2, 0);
      ctx.moveTo(-screenH / 2, -4);
      ctx.lineTo(-screenH / 2, 4);
      ctx.moveTo(screenH / 2, -4);
      ctx.lineTo(screenH / 2, 4);
      ctx.stroke();
      ctx.restore();

      // 6. LENTE D'INGRANDIMENTO MACRO 8X (ISPEZIONE FISICA DEL SINGOLO DIODO SMD)
      if (showMacroLoupe) {
        const loupeSize = 110;
        const loupeX = startX + screenW - loupeSize - 8;
        const loupeY = startY + screenH - loupeSize - 8;

        ctx.save();
        ctx.beginPath();
        ctx.arc(loupeX + loupeSize / 2, loupeY + loupeSize / 2, loupeSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = '#060910';
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#12B76A';
        ctx.stroke();
        ctx.clip();

        // Disegno 4 package SMD reali ingranditi al microscopio ottico
        const pSize = 38;
        const cx = loupeX + loupeSize / 2;
        const cy = loupeY + loupeSize / 2;

        const smdOffsets = [
          [-pSize / 2 - 2, -pSize / 2 - 2],
          [pSize / 2 + 2, -pSize / 2 - 2],
          [-pSize / 2 - 2, pSize / 2 + 2],
          [pSize / 2 + 2, pSize / 2 + 2],
        ];

        smdOffsets.forEach(([ox, oy]) => {
          const sx = cx + ox;
          const sy = cy + oy;

          // Corpo nero package SMD metallico
          ctx.fillStyle = '#0D1117';
          ctx.fillRect(sx - pSize / 2, sy - pSize / 2, pSize, pSize);
          ctx.strokeStyle = '#2A3649';
          ctx.lineWidth = 1;
          ctx.strokeRect(sx - pSize / 2, sy - pSize / 2, pSize, pSize);

          // Sub-pixel RGB reali (Rosso, Verde, Blu)
          ctx.fillStyle = '#FF1A4B';
          ctx.beginPath();
          ctx.arc(sx - 7, sy - 4, 3.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#12B76A';
          ctx.beginPath();
          ctx.arc(sx + 7, sy - 4, 3.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#0088FF';
          ctx.beginPath();
          ctx.arc(sx, sy + 7, 3.5, 0, Math.PI * 2);
          ctx.fill();

          // Filo d'oro wire bond
          ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(sx - 7, sy - 4);
          ctx.lineTo(sx - 12, sy - 12);
          ctx.moveTo(sx + 7, sy - 4);
          ctx.lineTo(sx + 12, sy - 12);
          ctx.stroke();
        });

        ctx.restore();
        ctx.fillStyle = '#12B76A';
        ctx.font = 'bold 9px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`MACRO 8X (P${pitchMm})`, loupeX + loupeSize / 2, loupeY + loupeSize + 12);
      }

      ctx.restore();

      if (isPlaying) {
        animFrameIdRef.current = requestAnimationFrame(render);
      }
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [modulesW, modulesH, format, pitchMm, sceneMode, isPlaying, showMacroLoupe, widthM, heightM, totalPixW, totalPixH]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-[#1A2028] bg-[#04060A] p-4 flex flex-col space-y-3">
      {/* 1. BARRA SUPERIORE: CONTROLLI COLONNE E RIGHE RIGOROSAMENTE IN ALTO */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1A2028]">
        {/* Info Formato e Risoluzione */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1.5">
            <Layers className="w-4 h-4 text-[#12B76A]" />
            <span className="font-semibold text-xs text-white">Griglia Cabinet 2D</span>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded bg-[#0D1117] text-[#9AA3AD] border border-[#1A2028]">
            {format.name}
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded bg-[#0D2818] text-[#34D399] border border-[#163826] font-medium">
            Passo P{pitchMm} mm
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded bg-[#10141D] text-[#E8EDF2] border border-[#1A2028] tabular-nums font-mono">
            {totalPixW} × {totalPixH} px
          </span>
        </div>

        {/* CONTROLLI COLONNE E RIGHE DIRETTAMENTE SOPRA AL DISPLAY */}
        <div className="flex items-center space-x-3 text-xs text-[#E8EDF2]">
          {/* Colonne */}
          <div className="flex items-center space-x-1.5 bg-[#0D1117] px-2 py-1 rounded-lg border border-[#1A2028]">
            <span className="text-[#868D97] font-medium text-[11px]">Colonne:</span>
            <button
              type="button"
              onClick={() => setModulesW(modulesW - 1)}
              className="w-5 h-5 rounded bg-[#10141D] hover:bg-[#161F30] border border-[#1A2028] text-white font-bold flex items-center justify-center transition-colors cursor-pointer"
              title="Riduci colonne"
            >
              -
            </button>
            <span className="font-semibold text-white tabular-nums min-w-[22px] text-center">
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
          <div className="flex items-center space-x-1.5 bg-[#0D1117] px-2 py-1 rounded-lg border border-[#1A2028]">
            <span className="text-[#868D97] font-medium text-[11px]">Righe:</span>
            <button
              type="button"
              onClick={() => setModulesH(modulesH - 1)}
              className="w-5 h-5 rounded bg-[#10141D] hover:bg-[#161F30] border border-[#1A2028] text-white font-bold flex items-center justify-center transition-colors cursor-pointer"
              title="Riduci righe"
            >
              -
            </button>
            <span className="font-semibold text-white tabular-nums min-w-[22px] text-center">
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

      {/* 2. TOOLBAR KINETIC DOOH & EFFETTI VISIVI */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Selettore Stile Scena */}
        <div className="flex items-center space-x-1.5 bg-[#0D1117] p-0.5 rounded-lg border border-[#1A2028]">
          <button
            type="button"
            onClick={() => setSceneMode('kinetic')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center space-x-1 transition-colors cursor-pointer ${
              sceneMode === 'kinetic'
                ? 'bg-[#12B76A] text-white font-semibold'
                : 'text-[#868D97] hover:text-[#E8EDF2]'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Kinetic Typo DOOH</span>
          </button>
          <button
            type="button"
            onClick={() => setSceneMode('glitch')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center space-x-1 transition-colors cursor-pointer ${
              sceneMode === 'glitch'
                ? 'bg-[#12B76A] text-white font-semibold'
                : 'text-[#868D97] hover:text-[#E8EDF2]'
            }`}
          >
            <RefreshCw className="w-3 h-3" />
            <span>Cyber Glitch</span>
          </button>
          <button
            type="button"
            onClick={() => setSceneMode('rgb')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center space-x-1 transition-colors cursor-pointer ${
              sceneMode === 'rgb'
                ? 'bg-[#12B76A] text-white font-semibold'
                : 'text-[#868D97] hover:text-[#E8EDF2]'
            }`}
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Test RGB</span>
          </button>
        </div>

        {/* Controlli Animazione e Lente Macro */}
        <div className="flex items-center space-x-2">
          {/* Lente Diodi Macro 8X */}
          <button
            type="button"
            onClick={() => setShowMacroLoupe(!showMacroLoupe)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center space-x-1.5 border transition-colors cursor-pointer ${
              showMacroLoupe
                ? 'bg-[#0D2818] text-[#34D399] border-[#1B4D2E]'
                : 'bg-[#0D1117] text-[#9AA3AD] border-[#1A2028] hover:text-white'
            }`}
          >
            <ZoomIn className="w-3 h-3 text-[#12B76A]" />
            <span>{showMacroLoupe ? 'Lente Diodi Attiva' : 'Lente Diodi 8X'}</span>
          </button>

          {/* Play / Pausa */}
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-2.5 py-1 rounded-lg bg-[#0D1117] border border-[#1A2028] hover:bg-[#10141D] text-[#E8EDF2] text-[11px] font-medium flex items-center space-x-1 cursor-pointer"
            title={isPlaying ? 'Metti in pausa animazione' : 'Avvia animazione'}
          >
            {isPlaying ? <Pause className="w-3 h-3 text-[#F87171]" /> : <Play className="w-3 h-3 text-[#12B76A]" />}
            <span>{isPlaying ? 'Pausa' : 'Play'}</span>
          </button>
        </div>
      </div>

      {/* 3. DISPLAY LEDWALL REALE PIXELLATO CON KINETIC TYPOGRAPHY ADATTIVA */}
      <div className="w-full flex items-center justify-center overflow-hidden rounded-lg bg-[#020406] py-1 border border-[#161C24] shadow-inner">
        <canvas ref={canvasRef} className="block select-none" />
      </div>

      {/* 4. CONTA REALE DEI PIXEL E TELEMETRIA FISICA IN TEMPO REALE */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
        <div className="p-2 rounded-lg bg-[#0D1117] border border-[#1A2028]">
          <div className="text-[10px] text-[#868D97] uppercase tracking-wider">Superficie Effettiva</div>
          <div className="font-semibold text-white tabular-nums mt-0.5">
            {areaM2.toFixed(2)} m² <span className="text-[#868D97] font-normal">({widthM.toFixed(1)}×{heightM.toFixed(1)}m)</span>
          </div>
        </div>

        <div className="p-2 rounded-lg bg-[#0D1117] border border-[#1A2028]">
          <div className="text-[10px] text-[#868D97] uppercase tracking-wider">Conta Pixel Esatta</div>
          <div className="font-semibold text-white tabular-nums mt-0.5">
            {totalPixW} × {totalPixH} px
          </div>
        </div>

        <div className="p-2 rounded-lg bg-[#0D1117] border border-[#1A2028]">
          <div className="text-[10px] text-[#868D97] uppercase tracking-wider">Totale Diodi SMD</div>
          <div className="font-semibold text-[#34D399] tabular-nums mt-0.5">
            {totalDiodes.toLocaleString('it-IT')} LED
          </div>
        </div>

        <div className="p-2 rounded-lg bg-[#0D1117] border border-[#1A2028]">
          <div className="text-[10px] text-[#868D97] uppercase tracking-wider">Cabinet &amp; Peso</div>
          <div className="font-semibold text-white tabular-nums mt-0.5">
            {modulesW * modulesH} pz <span className="text-[#868D97] font-normal">(~{totalWeightKg} kg)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
