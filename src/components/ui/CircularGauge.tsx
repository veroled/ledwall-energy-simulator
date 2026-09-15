'use client';

import React from 'react';

interface CircularGaugeProps {
  currentKw: number;
  maxKw: number;
  label?: string;
}

export const CircularGauge: React.FC<CircularGaugeProps> = ({
  currentKw,
  maxKw,
  label = 'POTENZA ATTIVA',
}) => {
  const safeMax = maxKw > 0 ? maxKw : 1;
  const ratio = Math.min(1, Math.max(0, currentKw / safeMax));

  // Arco a 270 gradi (raggio 38 -> circonferenza = 2 * PI * 38 = 238.76)
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75;
  const strokeDashoffset = arcLength - arcLength * ratio;

  // Colore solido e sobrio: verde standard, o rosso solo se sovraccarico (>90%)
  const strokeColor = ratio > 0.9 ? '#F04438' : '#12B76A';

  return (
    <div className="relative flex flex-col items-center justify-center p-4">
      <div className="relative w-44 h-44 flex items-center justify-center">
        <svg className="w-full h-full -rotate-[135deg]" viewBox="0 0 100 100">
          {/* Background track dark */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="#1A2028"
            strokeWidth="6"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
          />
          {/* Active fill track */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke={strokeColor}
            strokeWidth="6"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-300 ease-out"
          />
        </svg>

        {/* Center Value */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-semibold text-white tabular-nums tracking-tight">
            {currentKw.toFixed(2)}
          </span>
          <span className="text-xs font-semibold text-[#9AA3AD] tracking-wider -mt-0.5">
            kW ATTIVI
          </span>
          <span className="text-xs text-[#868D97] tabular-nums mt-0.5">
            {(ratio * 100).toFixed(0)}% del picco
          </span>
        </div>
      </div>

      <div className="text-xs text-[#868D97] text-center -mt-1">
        {label}: <span className="text-white font-semibold tabular-nums">{maxKw.toFixed(2)} kW Max</span>
      </div>
    </div>
  );
};
