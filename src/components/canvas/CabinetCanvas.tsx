'use client';

import React, { useRef, useEffect } from 'react';
import { useSimulatorStore } from '../../store/useSimulatorStore';
import { CABINET_FORMATS } from '../../config/config';

export const CabinetCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { modulesW, modulesH, formatId, pitchMm, setModulesW, setModulesH } = useSimulatorStore();
  const format = CABINET_FORMATS.find((f) => f.id === formatId) || CABINET_FORMATS[0];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dimensione canvas responsiva
    const width = canvas.parentElement?.clientWidth || 500;
    const height = 260;
    canvas.width = width;
    canvas.height = height;

    // Sfondo superficie light sobrio
    ctx.fillStyle = '#F7F8FA';
    ctx.fillRect(0, 0, width, height);

    // Calcolo griglia con padding
    const padding = 35;
    const availableW = width - padding * 2;
    const availableH = height - padding * 2;

    const cellW = Math.min(availableW / modulesW, 70);
    const ratio = format.heightMm / format.widthMm;
    const cellH = cellW * ratio;

    const totalGridW = cellW * modulesW;
    const totalGridH = cellH * modulesH;
    const startX = (width - totalGridW) / 2;
    const startY = (height - totalGridH) / 2;

    // Disegna ciascun cabinet modulare
    for (let r = 0; r < modulesH; r++) {
      for (let c = 0; c < modulesW; c++) {
        const x = startX + c * cellW;
        const y = startY + r * cellH;

        // Card cabinet bianca con bordo sottile grigio
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);

        ctx.strokeStyle = '#D0D5DD';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 1, y + 1, cellW - 2, cellH - 2);

        // Indicatore discreto centrale
        if (cellW > 35) {
          ctx.fillStyle = '#12B76A';
          ctx.beginPath();
          ctx.arc(x + cellW / 2, y + cellH / 2, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Disegna quote dimensionali in metri
    const totalMetriW = ((modulesW * format.widthMm) / 1000).toFixed(2);
    const totalMetriH = ((modulesH * format.heightMm) / 1000).toFixed(2);

    ctx.fillStyle = '#475467';
    ctx.font = '500 11px Inter, sans-serif';
    ctx.textAlign = 'center';

    // Quota orizzontale superiore
    ctx.fillText(`${totalMetriW} m`, width / 2, startY - 12);
    ctx.strokeStyle = '#D0D5DD';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startX, startY - 6);
    ctx.lineTo(startX + totalGridW, startY - 6);
    ctx.stroke();

    // Quota verticale laterale
    ctx.save();
    ctx.translate(startX - 14, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${totalMetriH} m`, 0, 0);
    ctx.restore();
  }, [modulesW, modulesH, format, pitchMm]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-[#E4E7EC] bg-[#F7F8FA] p-3 flex flex-col items-center">
      <div className="w-full flex items-center justify-between px-2 py-1 text-xs text-[#667085]">
        <span className="font-medium">Griglia Cabinet 2D</span>
        <span className="font-semibold text-[#101828]">{format.name}</span>
      </div>
      <canvas ref={canvasRef} className="w-full rounded-lg" />
      <div className="w-full flex items-center justify-center space-x-6 pt-3 pb-1 text-xs text-[#344054]">
        <div className="flex items-center space-x-2">
          <span className="text-[#667085]">Colonne:</span>
          <button
            type="button"
            onClick={() => setModulesW(modulesW - 1)}
            className="w-6 h-6 rounded border border-[#D0D5DD] bg-white text-[#344054] font-semibold hover:bg-[#F9FAFB] flex items-center justify-center transition-colors cursor-pointer"
          >
            -
          </button>
          <span className="font-semibold text-[#101828] tabular-nums min-w-[20px] text-center">{modulesW}</span>
          <button
            type="button"
            onClick={() => setModulesW(modulesW + 1)}
            className="w-6 h-6 rounded border border-[#D0D5DD] bg-white text-[#344054] font-semibold hover:bg-[#F9FAFB] flex items-center justify-center transition-colors cursor-pointer"
          >
            +
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[#667085]">Righe:</span>
          <button
            type="button"
            onClick={() => setModulesH(modulesH - 1)}
            className="w-6 h-6 rounded border border-[#D0D5DD] bg-white text-[#344054] font-semibold hover:bg-[#F9FAFB] flex items-center justify-center transition-colors cursor-pointer"
          >
            -
          </button>
          <span className="font-semibold text-[#101828] tabular-nums min-w-[20px] text-center">{modulesH}</span>
          <button
            type="button"
            onClick={() => setModulesH(modulesH + 1)}
            className="w-6 h-6 rounded border border-[#D0D5DD] bg-white text-[#344054] font-semibold hover:bg-[#F9FAFB] flex items-center justify-center transition-colors cursor-pointer"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
};
