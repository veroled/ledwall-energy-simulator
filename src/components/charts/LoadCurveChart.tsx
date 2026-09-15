'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useSimulatorComputed, useSimulatorStore } from '../../store/useSimulatorStore';

// Curva fotometrica solare reale (Standard DIN 5034 / CIE):
// Alba ore 06:00 (bassa luce), Picco irraggiamento ore 13:00 (massimo lux), Tramonto ore 20:30, Crepuscolo ore 21:30
function getSolarLuxFactor(hour: number): number {
  if (hour < 6 || hour > 21) return 0;
  const angle = ((hour - 5.5) / 15.5) * Math.PI;
  return Math.max(0, Math.min(1, Math.pow(Math.sin(angle), 1.3)));
}

export const LoadCurveChart: React.FC = () => {
  const { dimensions, profile } = useSimulatorComputed();
  const { operatingHoursDay, hasNightDimming, nightDimmingPercent, liveLumDiurna, aplPercent, hasStandby } =
    useSimulatorStore();

  // Genera 24 punti orari (00:00 -> 23:00)
  const data = [];
  const startDay = 6;
  const endDay = startDay + operatingHoursDay;

  const pMaxEffettivo = dimensions.pitchMm <= 3.91 ? 650 : 500;
  const pStandbyBase = hasStandby ? 50 : 0;

  for (let hour = 0; hour < 24; hour++) {
    const isDay = hour >= startDay && hour < endDay;
    const timeLabel = `${String(hour).padStart(2, '0')}:00`;

    // Scenario A: Non Gestito (senza sensori lux)
    let kwA = 0;
    if (operatingHoursDay >= 24) {
      kwA = ((pStandbyBase + (aplPercent / 100) * pMaxEffettivo * 1.0) * dimensions.areaM2) / 1000;
    } else if (isDay) {
      kwA = ((pStandbyBase + (aplPercent / 100) * pMaxEffettivo * 1.0) * dimensions.areaM2) / 1000;
    } else {
      kwA = (pStandbyBase * dimensions.areaM2) / 1000;
    }

    // Scenario B: Fleet Monitor VeroLED con Sensore Ottico Lux
    let kwB = 0;
    if (isDay) {
      const solar = getSolarLuxFactor(hour);
      const lumFrac = hour >= 21
        ? 0.15
        : (0.25 + 0.75 * solar) * (liveLumDiurna / 100);

      const efficienzaVeroled = 0.78;
      kwB = (((aplPercent / 100) * pMaxEffettivo * lumFrac * efficienzaVeroled) * dimensions.areaM2) / 1000;
    } else if (operatingHoursDay >= 24 && hasNightDimming) {
      kwB = (((aplPercent / 100) * pMaxEffettivo * (nightDimmingPercent / 100) * 0.45) * dimensions.areaM2) / 1000;
    } else {
      kwB = 0;
    }

    data.push({
      time: timeLabel,
      'Scenario A (Non Gestito)': Math.round(kwA * 100) / 100,
      'Scenario B (Fleet Monitor)': Math.round(kwB * 100) / 100,
    });
  }

  return (
    <div className="w-full h-64 bg-[#0D1117] p-4 rounded-xl border border-[#1A2028] shadow-sm flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
        <div className="space-y-0.5">
          <span className="text-xs font-semibold text-white block">
            Curva di Carico 24h (Potenza kW assorbita)
          </span>
          <span className="text-xs text-[#9AA3AD] block">
            <span className="text-[#F87171] font-medium">Scenario A (Non Gestito)</span>: 100% fisso · <span className="text-[#12B76A] font-medium">Scenario B (Fleet Monitor)</span>: sensore Lux VeroLED
          </span>
        </div>
        <span className="text-xs font-medium text-[#E8EDF2] bg-[#10141D] border border-[#1A2028] px-2 py-1 rounded-md self-start sm:self-auto tabular-nums">
          Acceso: {profile.dayHours}h · Standby: {profile.nightHours}h
        </span>
      </div>

      <div className="flex-grow w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradScenarioA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F04438" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#F04438" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="gradScenarioB" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#12B76A" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#12B76A" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              stroke="#868D97"
              fontSize={10}
              tickLine={false}
              interval={3}
            />
            <YAxis stroke="#868D97" fontSize={10} tickLine={false} unit=" kW" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0D1117',
                borderColor: '#1A2028',
                borderRadius: '8px',
                fontSize: '11px',
                fontFamily: 'Inter, sans-serif',
                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                color: '#FFFFFF',
              }}
              itemStyle={{ color: '#E8EDF2' }}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px', fontFamily: 'Inter, sans-serif', paddingTop: '4px' }}
            />
            <Area
              type="monotone"
              dataKey="Scenario A (Non Gestito)"
              stroke="#F04438"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#gradScenarioA)"
            />
            <Area
              type="monotone"
              dataKey="Scenario B (Fleet Monitor)"
              stroke="#12B76A"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#gradScenarioB)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
