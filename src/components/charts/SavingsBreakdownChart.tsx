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
      colore: '#22A0C2',
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
    <div className="w-full bg-[#0D1117] p-4 rounded-xl border border-[#1A2028] shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-white">
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
            <XAxis type="number" stroke="#868D97" fontSize={10} unit=" €" />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#9AA3AD"
              fontSize={11}
              width={160}
              tickLine={false}
            />
            <Tooltip
              formatter={(val: any) => [`${val} € / anno`, 'Risparmio']}
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
            <Bar dataKey="valore" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.colore} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1A2028] text-xs">
        {data.map((item, i) => (
          <div key={i} className="flex flex-col">
            <span className="text-[#868D97] truncate">{item.name}</span>
            <span className="font-semibold text-white tabular-nums">
              {item.valore.toLocaleString('it-IT')} €{' '}
              <span className="text-[#868D97] font-normal">
                ({savingsEur > 0 ? ((item.valore / savingsEur) * 100).toFixed(0) : 0}%)
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
