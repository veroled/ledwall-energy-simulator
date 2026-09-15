'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useSimulatorComputed } from '../../store/useSimulatorStore';

export const SavingsBreakdownChart: React.FC = () => {
  const { scenario } = useSimulatorComputed();
  const { breakdown, savingsEur } = scenario;

  const data = [
    {
      name: 'Dimming Notturno (10%)',
      valore: Math.round(breakdown.nightDimmingEur),
      colore: '#12B76A',
      desc: 'Risparmio dall\'abbattimento dei nit nelle ore notturne',
    },
    {
      name: 'Sensore Lux & APL Diurno',
      valore: Math.round(breakdown.adaptiveLuxEur),
      colore: '#0BA5EC',
      desc: 'Adattamento dinamico al sole, cielo coperto e densità bianco',
    },
    {
      name: 'Standby Zero (Relè Smart)',
      valore: Math.round(breakdown.standbyZeroEur),
      colore: '#0E9F5D',
      desc: 'Azzeramento integrale dei 50 W/m² passivi a display spento',
    },
  ];

  return (
    <div className="w-full bg-white p-4 rounded-xl border border-[#E4E7EC] shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#101828]">
          Origine del Risparmio Annuale ({Math.round(savingsEur).toLocaleString('it-IT')} €)
        </span>
        <span className="text-xs font-semibold text-[#12B76A]">
          Ripartizione Componenti
        </span>
      </div>

      <div className="w-full h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <XAxis type="number" stroke="#98A2B3" fontSize={10} unit=" €" />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#475467"
              fontSize={11}
              width={160}
              tickLine={false}
            />
            <Tooltip
              formatter={(val: any) => [`${val} € / anno`, 'Risparmio']}
              contentStyle={{
                backgroundColor: '#FFFFFF',
                borderColor: '#E4E7EC',
                borderRadius: '8px',
                fontSize: '11px',
                fontFamily: 'Inter, sans-serif',
                boxShadow: '0 1px 3px rgba(16,24,40,0.1)',
                color: '#101828',
              }}
            />
            <Bar dataKey="valore" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.colore} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#F2F4F7] text-xs">
        {data.map((item, i) => (
          <div key={i} className="flex flex-col">
            <span className="text-[#667085] truncate">{item.name}</span>
            <span className="font-semibold text-[#101828] tabular-nums">
              {item.valore.toLocaleString('it-IT')} €{' '}
              <span className="text-[#98A2B3] font-normal">
                ({savingsEur > 0 ? ((item.valore / savingsEur) * 100).toFixed(0) : 0}%)
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
