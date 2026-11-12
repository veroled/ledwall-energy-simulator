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
  const { scenario, interno, nitInterno, pStandby } = useSimulatorComputed();
  const { breakdown, savingsEur } = scenario;

  // in interno: niente riduzione notturna; il risparmio viene dalla luminanza tarata e dal relè fuori orario
  const data = interno ? [
    {
      name: `Luminanza tarata a ${nitInterno} nit`,
      valore: Math.round(breakdown.adaptiveLuxEur),
      colore: 'var(--focus)',
      desc: 'Lo schermo lavora alla luminanza scelta invece che ai 600 nit di fabbrica',
    },
    {
      name: 'Relè fuori orario',
      valore: Math.round(breakdown.standbyZeroEur),
      colore: 'var(--ok)',
      desc: `Schermo spento invece che nero e acceso: ${Math.round(pStandby)} W/m² in meno fuori orario`,
    },
  ] : [
    {
      name: 'Dimming Notturno (10%)',
      valore: Math.round(breakdown.nightDimmingEur),
      colore: 'var(--ok)',
      desc: 'Risparmio dall\'abbattimento dei nit nelle ore notturne',
    },
    {
      name: 'Sensore Lux & APL Diurno',
      valore: Math.round(breakdown.adaptiveLuxEur),
      colore: 'var(--focus)',
      desc: 'Adattamento dinamico al sole, cielo coperto e densità bianco',
    },
    {
      name: 'Standby Zero (Relè Smart)',
      valore: Math.round(breakdown.standbyZeroEur),
      colore: 'var(--ok)',
      desc: `Azzeramento integrale dei ${Math.round(pStandby)} W/m² passivi a display spento`,
    },
  ];

  return (
    <div className="w-full bg-[var(--s1)] p-4 rounded-xl border border-[var(--line)] shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-white">
          Origine del Risparmio Annuale ({Math.round(savingsEur).toLocaleString('it-IT')} €)
        </span>
        <span className="text-xs font-semibold text-[var(--ok)]">
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
            <XAxis type="number" stroke="var(--mute)" fontSize={10} unit=" €" />
            <YAxis
              type="category"
              dataKey="name"
              stroke="var(--mute)"
              fontSize={11}
              width={160}
              tickLine={false}
            />
            <Tooltip
              formatter={(val: any) => [`${val} € / anno`, 'Risparmio']}
              contentStyle={{
                backgroundColor: 'var(--s1)',
                borderColor: 'var(--line)',
                borderRadius: '8px',
                fontSize: '11px',
                fontFamily: 'Inter, sans-serif',
                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                color: 'var(--text)',
              }}
              itemStyle={{ color: 'var(--text)' }}
            />
            <Bar dataKey="valore" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.colore} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--line)] text-xs">
        {data.map((item, i) => (
          <div key={i} className="flex flex-col">
            <span className="text-[var(--mute)] truncate">{item.name}</span>
            <span className="font-semibold text-white tabular-nums">
              {item.valore.toLocaleString('it-IT')} €{' '}
              <span className="text-[var(--mute)] font-normal">
                ({savingsEur > 0 ? ((item.valore / savingsEur) * 100).toFixed(0) : 0}%)
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
