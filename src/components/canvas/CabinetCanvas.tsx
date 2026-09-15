'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useSimulatorStore } from '../../store/useSimulatorStore';
import { CABINET_FORMATS } from '../../config/config';
import { Play, Pause, Sparkles, Zap, Crown, Monitor, SlidersHorizontal, RotateCw } from 'lucide-react';

// Tipologie di Cartelli Pubblicitari DOOH ("Partelli / Cartelli") ad altissimo contrasto e colori vivaci
export type SpotType = 'cyber' | 'turbo' | 'luxury' | 'veroled' | 'rgb';

interface SpotMeta {
  id: SpotType;
  label: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
}

const SPOTS: SpotMeta[] = [
  { id: 'cyber', label: 'Cyber 8K', badge: 'NEON CYBER', icon: Sparkles, accentColor: '#00F5FF' },
  { id: 'turbo', label: 'Turbo Energy', badge: 'HIGH VOLTAGE', icon: Zap, accentColor: '#FF6600' },
  { id: 'luxury', label: 'Milano Gold', badge: 'LUXURY DOOH', icon: Crown, accentColor: '#FFD700' },
  { id: 'veroled', label: 'VeroLED Pro', badge: 'BROADCAST', icon: Monitor, accentColor: '#00FF88' },
  { id: 'rgb', label: 'Test RGB', badge: 'SMPTE CALIB', icon: SlidersHorizontal, accentColor: '#38BDF8' },
];

export const CabinetCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Selezione cartello DOOH attivo
  const [activeSpot, setActiveSpot] = useState<SpotType>('cyber');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [autoRotate, setAutoRotate] = useState<boolean>(true); // Rotazione automatica cartelli ogni 5s

  const { modulesW, modulesH, formatId, pitchMm, setModulesW, setModulesH } = useSimulatorStore();
  const format = CABINET_FORMATS.find((f) => f.id === formatId) || CABINET_FORMATS[0];

  // Dimensioni fisiche e calcolo pixel esatti
  const widthM = (modulesW * format.widthMm) / 1000;
  const heightM = (modulesH * format.heightMm) / 1000;
  const areaM2 = widthM * heightM;

  const cabPixW = Math.round(format.widthMm / pitchMm);
  const cabPixH = Math.round(format.heightMm / pitchMm);
  const totalPixW = modulesW * cabPixW;
  const totalPixH = modulesH * cabPixH;
  const totalDiodes = totalPixW * totalPixH;
  const totalWeightKg = modulesW * modulesH * format.weightKg;

  // Loop animazione 60fps con quantizzazione reale a diodi fisici, bloom 10.000 nit e kinetic typography
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let startTime = performance.now();
    let currentSpot = activeSpot;
    let lastSpotSwitchTime = performance.now();
    let spotIndex = SPOTS.findIndex((s) => s.id === activeSpot);

    // Offscreen buffer a risoluzione nativa della matrice diodi
    const offCanvas = document.createElement('canvas');
    const offCtx = offCanvas.getContext('2d');

    // Buffer per pre-renderizzare il tassello della maschera louver a diodi
    const tileCanvas = document.createElement('canvas');
    const tileCtx = tileCanvas.getContext('2d');

    let currentTilePitch = 0;
    let louverPattern: CanvasPattern | null = null;

    // Generatore particelle cinetiche luminescenti
    const particles = Array.from({ length: 28 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.08,
      vy: -0.04 - Math.random() * 0.08,
      size: 0.8 + Math.random() * 1.6,
      hue: Math.random(),
    }));

    const render = (currentTime: number) => {
      // Rotazione automatica dei cartelli DOOH ogni 5.5 secondi
      if (autoRotate && isPlaying) {
        if (currentTime - lastSpotSwitchTime > 5500) {
          spotIndex = (spotIndex + 1) % SPOTS.length;
          currentSpot = SPOTS[spotIndex].id;
          setActiveSpot(currentSpot);
          lastSpotSwitchTime = currentTime;
        }
      } else {
        currentSpot = activeSpot;
      }

      const elapsed = isPlaying ? (currentTime - startTime) / 1000 : 0;
      const t = elapsed;

      // Dimensioni responsive del canvas
      const containerW = canvas.parentElement?.clientWidth || 580;
      const displayW = Math.max(320, containerW);
      const displayH = 290;

      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== displayW * dpr || canvas.height !== displayH * dpr) {
        canvas.width = displayW * dpr;
        canvas.height = displayH * dpr;
        canvas.style.width = `${displayW}px`;
        canvas.style.height = `${displayH}px`;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Sfondo scuro profondo dello chassis
      ctx.fillStyle = '#030508';
      ctx.fillRect(0, 0, displayW, displayH);

      // Calcolo area visibile dello schermo
      const paddingX = 36;
      const paddingY = 26;
      const availW = displayW - paddingX * 2;
      const availH = displayH - paddingY * 2;

      const aspect = (modulesW * format.widthMm) / (modulesH * format.heightMm);
      let screenW = availW;
      let screenH = screenW / aspect;

      if (screenH > availH) {
        screenH = availH;
        screenW = screenH * aspect;
      }

      const startX = Math.round((displayW - screenW) / 2);
      const startY = Math.round((displayH - screenH) / 2 + 4);

      const cabW = screenW / modulesW;
      const cabH = screenH / modulesH;

      // 1. CHASSIS ESTERNO IN ALLUMINIO DIE-CAST
      ctx.fillStyle = '#070A0F';
      ctx.fillRect(startX - 4, startY - 4, screenW + 8, screenH + 8);
      ctx.strokeStyle = '#161F2E';
      ctx.lineWidth = 1.4;
      ctx.strokeRect(startX - 4, startY - 4, screenW + 8, screenH + 8);

      // Viti angolari di fissaggio a telaio
      ctx.fillStyle = '#2B374A';
      ctx.beginPath();
      ctx.arc(startX - 2, startY - 2, 1.8, 0, Math.PI * 2);
      ctx.arc(startX + screenW + 2, startY - 2, 1.8, 0, Math.PI * 2);
      ctx.arc(startX - 2, startY + screenH + 2, 1.8, 0, Math.PI * 2);
      ctx.arc(startX + screenW + 2, startY + screenH + 2, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // 2. CALCOLO DELLA PASSO DIODO REALE (PIXEL FISICI DISCRETI)
      // Più il passo pitch è grande (P10), più i singoli diodi sono grossi e distanziati con ampi spazi neri!
      // A P2.6, la densità è altissima e fine.
      const diodePitch = Math.max(2.6, Math.min(9.5, 2.6 + (pitchMm - 2.6) * 0.72));
      const diodeCols = Math.max(20, Math.floor(screenW / diodePitch));
      const diodeRows = Math.max(12, Math.floor(screenH / diodePitch));

      const actualScreenWidth = diodeCols * diodePitch;
      const actualScreenHeight = diodeRows * diodePitch;
      const offsetX = startX + (screenW - actualScreenWidth) / 2;
      const offsetY = startY + (screenH - actualScreenHeight) / 2;

      // Aggiornamento offscreen buffer alla risoluzione esatta della matrice diodi
      if (offCanvas.width !== diodeCols || offCanvas.height !== diodeRows) {
        offCanvas.width = diodeCols;
        offCanvas.height = diodeRows;
      }

      // Aggiornamento del pattern del tassello Louver Mask
      const tilePitchInt = Math.round(diodePitch);
      if (currentTilePitch !== tilePitchInt || !louverPattern) {
        currentTilePitch = tilePitchInt;
        tileCanvas.width = tilePitchInt;
        tileCanvas.height = tilePitchInt;
        if (tileCtx) {
          // Maschera nera plastica matte intorno al diodo
          tileCtx.fillStyle = '#020407';
          tileCtx.fillRect(0, 0, tilePitchInt, tilePitchInt);

          // Apertura ottica circolare al centro (trasparente: fa passare la luce viva del LED)
          tileCtx.globalCompositeOperation = 'destination-out';
          tileCtx.beginPath();
          const radius = Math.max(1, (tilePitchInt * 0.44));
          tileCtx.arc(tilePitchInt / 2, tilePitchInt / 2, radius, 0, Math.PI * 2);
          tileCtx.fill();
          tileCtx.globalCompositeOperation = 'source-over';

          // Bordo conico riflettente della lente del package SMD
          tileCtx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
          tileCtx.lineWidth = 0.6;
          tileCtx.beginPath();
          tileCtx.arc(tilePitchInt / 2, tilePitchInt / 2, radius, 0, Math.PI * 2);
          tileCtx.stroke();
        }
        louverPattern = ctx.createPattern(tileCanvas, 'repeat');
      }

      // 3. GENERAZIONE CONTENUTI VIVACI NELL'OFFSCREEN BUFFER (DIODO PER DIODO)
      if (offCtx) {
        offCtx.clearRect(0, 0, diodeCols, diodeRows);

        if (currentSpot === 'rgb') {
          // ================= CARTELLO 5: TEST COLLAUDO RGB SMPTE =================
          const testColors = [
            '#FF0000', // Red
            '#00FF00', // Green
            '#0033FF', // Blue
            '#FFFF00', // Yellow
            '#00FFFF', // Cyan
            '#FF00FF', // Magenta
            '#FFFFFF', // White 100%
            '#12B76A', // VeroLED Green
          ];
          const barW = diodeCols / testColors.length;
          testColors.forEach((color, i) => {
            offCtx.fillStyle = color;
            offCtx.fillRect(i * barW, 0, barW, diodeRows);
          });

          // Griglia di allineamento bianca
          offCtx.strokeStyle = '#000000';
          offCtx.lineWidth = 1;
          offCtx.strokeRect(0, 0, diodeCols, diodeRows);
          offCtx.fillStyle = '#000000';
          offCtx.font = `900 ${Math.max(7, Math.floor(diodeRows * 0.18))}px Inter, sans-serif`;
          offCtx.textAlign = 'center';
          offCtx.textBaseline = 'middle';
          offCtx.fillText(`SMPTE 100% · P${pitchMm}mm`, diodeCols / 2, diodeRows * 0.5);

        } else if (currentSpot === 'cyber') {
          // ================= CARTELLO 1: CYBERPUNK 8K (CYAN & NEON MAGENTA) =================
          // Sfondo profondo con gradiente laser ultra-saturo
          const grad = offCtx.createLinearGradient(0, 0, diodeCols, diodeRows);
          grad.addColorStop(0, '#020014');
          grad.addColorStop(0.4, '#190033');
          grad.addColorStop(0.75, '#001A33');
          grad.addColorStop(1, '#000814');
          offCtx.fillStyle = grad;
          offCtx.fillRect(0, 0, diodeCols, diodeRows);

          // Raggi ed equalizzatore grafico audio-reattivo sul fondo
          const numBars = Math.min(18, Math.floor(diodeCols / 4));
          const barWidth = diodeCols / numBars;
          for (let b = 0; b < numBars; b++) {
            const h = Math.abs(Math.sin(t * 3.5 + b * 0.7)) * (diodeRows * 0.45);
            const barGrad = offCtx.createLinearGradient(0, diodeRows - h, 0, diodeRows);
            barGrad.addColorStop(0, '#00F5FF');
            barGrad.addColorStop(0.6, '#FF007F');
            barGrad.addColorStop(1, '#6600FF');
            offCtx.fillStyle = barGrad;
            offCtx.fillRect(b * barWidth + 1, diodeRows - h, barWidth - 2, h);
          }

          // Particelle cinetiche al neon
          particles.forEach((p) => {
            p.x = (p.x + p.vx * 0.05 + 1) % 1;
            p.y = (p.y + p.vy * 0.05 + 1) % 1;
            offCtx.fillStyle = p.hue > 0.5 ? '#00F5FF' : '#FF007F';
            offCtx.fillRect(p.x * diodeCols, p.y * diodeRows, 1.5, 1.5);
          });

          // Kinetic Typography Cyber
          if (aspect >= 2.0) {
            // Layout Wide Banner
            const fSize = Math.min(diodeRows * 0.52, diodeCols * 0.16);
            offCtx.font = `900 ${fSize}px Inter, sans-serif`;
            offCtx.textAlign = 'left';
            offCtx.textBaseline = 'middle';
            offCtx.fillStyle = '#00F5FF';
            offCtx.fillText('CYBER VISION', diodeCols * 0.04, diodeRows * 0.4);

            offCtx.fillStyle = '#FFE600';
            offCtx.font = `800 ${fSize * 0.45}px Inter, sans-serif`;
            offCtx.fillText('8K HDR · 3840Hz REFRESH', diodeCols * 0.04, diodeRows * 0.78);
          } else if (aspect <= 0.85) {
            // Layout Totem Verticale
            const fSize = Math.min(diodeCols * 0.32, diodeRows * 0.16);
            offCtx.font = `900 ${fSize}px Inter, sans-serif`;
            offCtx.textAlign = 'center';
            offCtx.textBaseline = 'middle';
            offCtx.fillStyle = '#00F5FF';
            offCtx.fillText('CYBER', diodeCols / 2, diodeRows * 0.25);
            offCtx.fillStyle = '#FF007F';
            offCtx.fillText('NEON', diodeCols / 2, diodeRows * 0.45);
            offCtx.fillStyle = '#FFE600';
            offCtx.fillText('8K HDR', diodeCols / 2, diodeRows * 0.65);
          } else {
            // Layout Standard
            const titleSize = Math.min(diodeCols * 0.22, diodeRows * 0.34);
            offCtx.font = `900 ${titleSize}px Inter, sans-serif`;
            offCtx.textAlign = 'center';
            offCtx.textBaseline = 'middle';

            // Glow sweep text
            const sweepX = (t * 60) % (diodeCols * 1.5) - diodeCols * 0.25;
            const textGrad = offCtx.createLinearGradient(sweepX - 25, 0, sweepX + 25, 0);
            textGrad.addColorStop(0, '#00F5FF');
            textGrad.addColorStop(0.5, '#FFFFFF');
            textGrad.addColorStop(1, '#FF007F');
            offCtx.fillStyle = textGrad;
            offCtx.fillText('CYBER 8K', diodeCols / 2, diodeRows * 0.42);

            // Ticker tape scorrevole inferiore
            const tickerSize = Math.min(diodeCols * 0.06, diodeRows * 0.16);
            offCtx.font = `800 ${tickerSize}px Inter, sans-serif`;
            offCtx.fillStyle = '#FFE600';
            offCtx.textAlign = 'left';
            const tickTxt = '★ ULTRA NEON DOOH · 10.000 NITS OUTDOOR · P' + pitchMm + 'mm HIGH REFRESH · ';
            const tW = offCtx.measureText(tickTxt).width || 120;
            const scrollX = -( (t * 22) % tW );
            offCtx.fillText(tickTxt + tickTxt, diodeCols * 0.04 + scrollX, diodeRows * 0.82);
          }

          // Cyber glitch sweep
          if (Math.sin(t * 8) > 0.82) {
            const gy = Math.floor(Math.random() * diodeRows);
            const gh = Math.floor(Math.random() * 4) + 1;
            offCtx.fillStyle = '#00F5FF';
            offCtx.fillRect(0, gy, diodeCols, gh);
          }

        } else if (currentSpot === 'turbo') {
          // ================= CARTELLO 2: TURBO ENERGY (ELECTRIC LIME & BLAZING SUN ORANGE) =================
          // Sfondo energia vibrante
          const grad = offCtx.createLinearGradient(0, 0, diodeCols, diodeRows);
          grad.addColorStop(0, '#100600');
          grad.addColorStop(0.4, '#3D1300');
          grad.addColorStop(0.8, '#0B2404');
          grad.addColorStop(1, '#020C02');
          offCtx.fillStyle = grad;
          offCtx.fillRect(0, 0, diodeCols, diodeRows);

          // Chevrons cinetici ad alta velocità
          const chevronOffset = (t * 40) % 24;
          offCtx.strokeStyle = 'rgba(255, 102, 0, 0.4)';
          offCtx.lineWidth = 2;
          for (let x = -24; x < diodeCols + 24; x += 18) {
            const cx = x + chevronOffset;
            offCtx.beginPath();
            offCtx.moveTo(cx, 0);
            offCtx.lineTo(cx + 8, diodeRows / 2);
            offCtx.lineTo(cx, diodeRows);
            offCtx.stroke();
          }

          // Typo audace Turbo
          if (aspect >= 2.0) {
            let fSize = Math.min(diodeRows * 0.50, diodeCols * 0.13);
            offCtx.font = `900 ${fSize}px Inter, sans-serif`;
            while (offCtx.measureText('TURBO FORCE').width > diodeCols * 0.55 && fSize > 6) {
              fSize -= 1;
              offCtx.font = `900 ${fSize}px Inter, sans-serif`;
            }
            offCtx.textAlign = 'left';
            offCtx.textBaseline = 'middle';
            offCtx.fillStyle = '#FF6600';
            offCtx.fillText('TURBO FORCE', diodeCols * 0.05, diodeRows * 0.42);

            offCtx.fillStyle = '#00FF66';
            offCtx.font = `800 ${fSize * 0.45}px Inter, sans-serif`;
            offCtx.fillText('100% RAW ENERGY · ZERO COMPROMISE', diodeCols * 0.05, diodeRows * 0.8);
          } else if (aspect <= 0.85) {
            const fSize = Math.min(diodeCols * 0.30, diodeRows * 0.15);
            offCtx.font = `900 ${fSize}px Inter, sans-serif`;
            offCtx.textAlign = 'center';
            offCtx.textBaseline = 'middle';
            offCtx.fillStyle = '#FF6600';
            offCtx.fillText('TURBO', diodeCols / 2, diodeRows * 0.25);
            offCtx.fillStyle = '#00FF66';
            offCtx.fillText('FORCE', diodeCols / 2, diodeRows * 0.45);
            offCtx.fillStyle = '#FFFFFF';
            offCtx.fillText('100%', diodeCols / 2, diodeRows * 0.65);
          } else {
            // Standard layout: impilato dinamico ultra-punchy
            const titleSize = Math.min(diodeCols * 0.22, diodeRows * 0.27);
            offCtx.font = `900 ${titleSize}px Inter, sans-serif`;
            offCtx.textAlign = 'center';
            offCtx.textBaseline = 'middle';

            const pulse = 1 + Math.sin(t * 4) * 0.035;
            offCtx.save();
            offCtx.scale(pulse, pulse);
            offCtx.fillStyle = '#FF6600';
            offCtx.fillText('TURBO', (diodeCols / 2) / pulse, (diodeRows * 0.28) / pulse);
            offCtx.fillStyle = '#00FF66';
            offCtx.fillText('FORCE', (diodeCols / 2) / pulse, (diodeRows * 0.52) / pulse);
            offCtx.restore();

            const tickerSize = Math.min(diodeCols * 0.058, diodeRows * 0.15);
            offCtx.font = `800 ${tickerSize}px Inter, sans-serif`;
            offCtx.fillStyle = '#FFFFFF';
            offCtx.textAlign = 'left';
            const tickTxt = '⚡ MAXIMUM POWER · ZERO EMISSION · HIGH VOLTAGE PERFORMANCE · ';
            const tW = offCtx.measureText(tickTxt).width || 120;
            const scrollX = -( (t * 26) % tW );
            offCtx.fillText(tickTxt + tickTxt, diodeCols * 0.04 + scrollX, diodeRows * 0.82);
          }

        } else if (currentSpot === 'luxury') {
          // ================= CARTELLO 3: MILANO GOLD (LIQUID GOLD & ROYAL CRIMSON) =================
          const grad = offCtx.createLinearGradient(0, 0, diodeCols, diodeRows);
          grad.addColorStop(0, '#120A00');
          grad.addColorStop(0.5, '#261702');
          grad.addColorStop(1, '#0A0005');
          offCtx.fillStyle = grad;
          offCtx.fillRect(0, 0, diodeCols, diodeRows);

          // Riflesso sweep dorato ad arco
          const goldX = (t * 18) % (diodeCols * 1.6) - diodeCols * 0.3;
          const goldBeam = offCtx.createLinearGradient(goldX - 20, 0, goldX + 20, diodeRows);
          goldBeam.addColorStop(0, 'rgba(255, 215, 0, 0)');
          goldBeam.addColorStop(0.5, 'rgba(255, 235, 140, 0.45)');
          goldBeam.addColorStop(1, 'rgba(255, 215, 0, 0)');
          offCtx.fillStyle = goldBeam;
          offCtx.fillRect(0, 0, diodeCols, diodeRows);

          // Particelle dorate fluttuanti
          particles.forEach((p) => {
            p.y = (p.y - 0.003 + 1) % 1;
            offCtx.fillStyle = '#FFD700';
            offCtx.fillRect(p.x * diodeCols, p.y * diodeRows, 1.2, 1.2);
          });

          // Typo Luxury
          if (aspect >= 2.0) {
            let fSize = Math.min(diodeRows * 0.50, diodeCols * 0.13);
            offCtx.font = `900 ${fSize}px Inter, sans-serif`;
            while (offCtx.measureText('MILANO COUTURE').width > diodeCols * 0.55 && fSize > 6) {
              fSize -= 1;
              offCtx.font = `900 ${fSize}px Inter, sans-serif`;
            }
            offCtx.textAlign = 'left';
            offCtx.textBaseline = 'middle';
            offCtx.fillStyle = '#FFD700';
            offCtx.fillText('MILANO COUTURE', diodeCols * 0.05, diodeRows * 0.42);

            offCtx.fillStyle = '#FFF2B2';
            offCtx.font = `700 ${fSize * 0.42}px Inter, sans-serif`;
            offCtx.fillText('DIAMOND EDITION · TIMELESS LUXURY', diodeCols * 0.05, diodeRows * 0.8);
          } else if (aspect <= 0.85) {
            const fSize = Math.min(diodeCols * 0.28, diodeRows * 0.15);
            offCtx.font = `900 ${fSize}px Inter, sans-serif`;
            offCtx.textAlign = 'center';
            offCtx.textBaseline = 'middle';
            offCtx.fillStyle = '#FFD700';
            offCtx.fillText('MILANO', diodeCols / 2, diodeRows * 0.26);
            offCtx.fillStyle = '#FFF2B2';
            offCtx.fillText('GOLD', diodeCols / 2, diodeRows * 0.46);
            offCtx.fillStyle = '#FF1744';
            offCtx.fillText('EDITION', diodeCols / 2, diodeRows * 0.66);
          } else {
            let titleSize = Math.min(diodeCols * 0.19, diodeRows * 0.32);
            offCtx.font = `900 ${titleSize}px Inter, sans-serif`;
            while (offCtx.measureText('MILANO GOLD').width > diodeCols * 0.86 && titleSize > 6) {
              titleSize -= 1;
              offCtx.font = `900 ${titleSize}px Inter, sans-serif`;
            }
            offCtx.textAlign = 'center';
            offCtx.textBaseline = 'middle';
            offCtx.fillStyle = '#FFD700';
            offCtx.fillText('MILANO GOLD', diodeCols / 2, diodeRows * 0.42);

            const tickerSize = Math.min(diodeCols * 0.058, diodeRows * 0.15);
            offCtx.font = `700 ${tickerSize}px Inter, sans-serif`;
            offCtx.fillStyle = '#FFF2B2';
            offCtx.textAlign = 'left';
            const tickTxt = '◆ DIAMOND EDITION ◆ HIGH LUXURY JEWELRY ◆ VOGUE MILANO ◆ ';
            const tW = offCtx.measureText(tickTxt).width || 120;
            const scrollX = -( (t * 18) % tW );
            offCtx.fillText(tickTxt + tickTxt, diodeCols * 0.04 + scrollX, diodeRows * 0.82);
          }

        } else {
          // ================= CARTELLO 4: VEROLED PRO (EMERALD GREEN & ELECTRIC AZURE) =================
          const grad = offCtx.createLinearGradient(0, 0, diodeCols, diodeRows);
          grad.addColorStop(0, '#021008');
          grad.addColorStop(0.45, '#002E19');
          grad.addColorStop(0.85, '#011A24');
          grad.addColorStop(1, '#020A10');
          offCtx.fillStyle = grad;
          offCtx.fillRect(0, 0, diodeCols, diodeRows);

          // Onde luminose azzurre e smeraldo
          const waveR = Math.min(diodeCols, diodeRows) * 0.4;
          offCtx.fillStyle = 'rgba(0, 255, 136, 0.35)';
          offCtx.beginPath();
          offCtx.arc(diodeCols * 0.7 + Math.sin(t) * 12, diodeRows * 0.4, waveR, 0, Math.PI * 2);
          offCtx.fill();

          offCtx.fillStyle = 'rgba(0, 229, 255, 0.28)';
          offCtx.beginPath();
          offCtx.arc(diodeCols * 0.25 - Math.cos(t) * 10, diodeRows * 0.65, waveR * 0.9, 0, Math.PI * 2);
          offCtx.fill();

          // Typo VeroLED
          if (aspect >= 2.0) {
            const fSize = Math.min(diodeRows * 0.52, diodeCols * 0.17);
            offCtx.font = `900 ${fSize}px Inter, sans-serif`;
            offCtx.textAlign = 'left';
            offCtx.textBaseline = 'middle';
            offCtx.fillStyle = '#FFFFFF';
            offCtx.fillText('VEROLED', diodeCols * 0.05, diodeRows * 0.42);

            offCtx.fillStyle = '#00FF88';
            offCtx.font = `800 ${fSize * 0.45}px Inter, sans-serif`;
            offCtx.fillText('EXPRESSIONS OF LIGHT · FLEET MONITOR PRO', diodeCols * 0.05, diodeRows * 0.8);
          } else if (aspect <= 0.85) {
            const fSize = Math.min(diodeCols * 0.3, diodeRows * 0.16);
            offCtx.font = `900 ${fSize}px Inter, sans-serif`;
            offCtx.textAlign = 'center';
            offCtx.textBaseline = 'middle';
            offCtx.fillStyle = '#FFFFFF';
            offCtx.fillText('VERO', diodeCols / 2, diodeRows * 0.26);
            offCtx.fillStyle = '#00FF88';
            offCtx.fillText('LED', diodeCols / 2, diodeRows * 0.46);
            offCtx.fillStyle = '#00E5FF';
            offCtx.fillText('OUTDOOR', diodeCols / 2, diodeRows * 0.66);
          } else {
            const titleSize = Math.min(diodeCols * 0.24, diodeRows * 0.35);
            offCtx.font = `900 ${titleSize}px Inter, sans-serif`;
            offCtx.textAlign = 'center';
            offCtx.textBaseline = 'middle';

            const shimmer = (t * 40) % (diodeCols * 1.5) - diodeCols * 0.25;
            const textGrad = offCtx.createLinearGradient(shimmer - 30, 0, shimmer + 30, 0);
            textGrad.addColorStop(0, '#FFFFFF');
            textGrad.addColorStop(0.5, '#72F6B8');
            textGrad.addColorStop(1, '#00E5FF');
            offCtx.fillStyle = textGrad;
            offCtx.fillText('VEROLED', diodeCols / 2, diodeRows * 0.42);

            const tickerSize = Math.min(diodeCols * 0.06, diodeRows * 0.15);
            offCtx.font = `800 ${tickerSize}px Inter, sans-serif`;
            offCtx.fillStyle = '#00FF88';
            offCtx.textAlign = 'left';
            const tickTxt = '★ EXPRESSIONS OF LIGHT · 3840Hz HIGH REFRESH · CEI 64-8 CERTIFIED · ';
            const tW = offCtx.measureText(tickTxt).width || 120;
            const scrollX = -( (t * 22) % tW );
            offCtx.fillText(tickTxt + tickTxt, diodeCols * 0.04 + scrollX, diodeRows * 0.82);
          }
        }
      }

      // 4. PROIEZIONE A DIODI REALI CON QUANTIZZAZIONE NEAREST-NEIGHBOR
      // Disattiviamo l'interpolazione anti-aliasing in modo che OGNI singolo pixel sia un blocco solido e netto!
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(offCanvas, offsetX, offsetY, actualScreenWidth, actualScreenHeight);

      // 5. APPLICAZIONE DELLA MASCHERA OTTICA LOUVER A DIODI SMD (VERA STRUTTURA A PUNTI LED)
      // Il louver pattern copre i bordi con plastica nera opaca e lascia aperte solo le aperture circolari dei singoli diodi!
      if (louverPattern) {
        ctx.save();
        ctx.translate(offsetX, offsetY);
        ctx.fillStyle = louverPattern;
        ctx.fillRect(0, 0, actualScreenWidth, actualScreenHeight);
        ctx.restore();
      }

      // 6. BLOOM EMISSIVO AD ALTA LUMINANZA (EFFETTO 10.000 NIT OUTDOOR)
      // I colori brillanti irradiano una leggera luminescenza ottica sui diodi circostanti
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.28;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(offCanvas, offsetX, offsetY, actualScreenWidth, actualScreenHeight);
      ctx.restore();

      // 7. FUGHE MECCANICHE DEI CABINET DIE-CAST (1.5mm) E SOTTOMODULI
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.8;

      for (let c = 1; c < modulesW; c++) {
        const cx = Math.round(startX + c * cabW);
        ctx.beginPath();
        ctx.moveTo(cx, startY);
        ctx.lineTo(cx, startY + screenH);
        ctx.stroke();
      }

      for (let r = 1; r < modulesH; r++) {
        const ry = Math.round(startY + r * cabH);
        ctx.beginPath();
        ctx.moveTo(startX, ry);
        ctx.lineTo(startX + screenW, ry);
        ctx.stroke();
      }

      // Sottomoduli interni
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.lineWidth = 0.8;
      for (let c = 0; c < modulesW; c++) {
        const mx = Math.round(startX + c * cabW + cabW / 2);
        ctx.beginPath();
        ctx.moveTo(mx, startY);
        ctx.lineTo(mx, startY + screenH);
        ctx.stroke();
      }
      for (let r = 0; r < modulesH; r++) {
        const my = Math.round(startY + r * cabH + cabH / 2);
        ctx.beginPath();
        ctx.moveTo(startX, my);
        ctx.lineTo(startX + screenW, my);
        ctx.stroke();
      }

      // 8. QUOTE ARCHITETTONICHE DI PRECISIONE
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
  }, [modulesW, modulesH, format, pitchMm, activeSpot, isPlaying, autoRotate, widthM, heightM, totalPixW, totalPixH]);

  return (
    <div className="w-full flex flex-col items-center space-y-2.5">
      {/* 1. TOOLBAR SUPERIORE: CONTROLLI COLONNE E RIGHE DIRETTAMENTE A MONTE DEL DISPLAY */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-[#0A0D14] border border-[#161C26]">
        {/* Identificativo Cabinet & Passo Selezionato */}
        <div className="flex items-center space-x-2">
          <div className="px-2 py-1 rounded bg-[#0D1420] border border-[#1E293B] text-[11px] font-semibold text-[#38BDF8] flex items-center space-x-1">
            <span>Griglia Cabinet 2D</span>
          </div>
          <span className="text-xs text-[#9AA3AD] hidden sm:inline">
            {format.name}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-[#0D2818] border border-[#1B4D2E] text-[10px] font-bold text-[#34D399]">
            Passo P{pitchMm} mm
          </span>
          <span className="text-[10px] text-[#6B7280] font-mono">
            {totalPixW} × {totalPixH} px
          </span>
        </div>

        {/* Stepper Colonne e Righe */}
        <div className="flex items-center space-x-3 text-xs">
          {/* Colonne */}
          <div className="flex items-center space-x-1.5 bg-[#0D1117] px-2 py-1 rounded-lg border border-[#1A2028]">
            <span className="text-[#868D97] font-medium text-[11px]">Colonne:</span>
            <button
              type="button"
              onClick={() => setModulesW(modulesW - 1)}
              disabled={modulesW <= 1}
              className="w-5 h-5 rounded bg-[#10141D] hover:bg-[#161F30] disabled:opacity-40 border border-[#1A2028] text-white font-bold flex items-center justify-center transition-colors cursor-pointer"
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
              disabled={modulesH <= 1}
              className="w-5 h-5 rounded bg-[#10141D] hover:bg-[#161F30] disabled:opacity-40 border border-[#1A2028] text-white font-bold flex items-center justify-center transition-colors cursor-pointer"
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

      {/* 2. SELETTORE DEI CARTELLI PUBBLICITARI DOOH ("PARTELLI / CARTELLI") CON COLORI VIVACI */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Selettore Spot Commerciali */}
        <div className="flex items-center space-x-1 bg-[#0D1117] p-1 rounded-lg border border-[#1A2028] overflow-x-auto">
          {SPOTS.map((spot) => {
            const Icon = spot.icon;
            const isActive = activeSpot === spot.id;
            return (
              <button
                key={spot.id}
                type="button"
                onClick={() => {
                  setActiveSpot(spot.id);
                  setAutoRotate(false); // Disattiva rotazione automatica se l'utente clicca un cartello specifico
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center space-x-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#12B76A] text-white font-semibold shadow-sm'
                    : 'text-[#868D97] hover:text-[#E8EDF2]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{spot.label}</span>
              </button>
            );
          })}
        </div>

        {/* Controlli Rotazione e Playback */}
        <div className="flex items-center space-x-2">
          {/* Rotazione Automatica Spot */}
          <button
            type="button"
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center space-x-1.5 border transition-colors cursor-pointer ${
              autoRotate
                ? 'bg-[#0D2818] text-[#34D399] border-[#1B4D2E]'
                : 'bg-[#0D1117] text-[#9AA3AD] border-[#1A2028] hover:text-white'
            }`}
            title="Cambia cartello automaticamente ogni 5 secondi"
          >
            <RotateCw className={`w-3 h-3 ${autoRotate ? 'animate-spin text-[#34D399]' : 'text-[#868D97]'}`} />
            <span>{autoRotate ? 'Auto-Spot ON' : 'Rotazione Off'}</span>
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

      {/* 3. DISPLAY LEDWALL REALE: MATRICE A DIODI SMD DISCRETI, LOUVER MASK & BLOOM EMISSIVO */}
      <div className="w-full flex items-center justify-center overflow-hidden rounded-lg bg-[#020406] py-1 border border-[#161C24] shadow-2xl">
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
