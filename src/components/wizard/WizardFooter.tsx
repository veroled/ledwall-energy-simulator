'use client';

import React from 'react';

export const WizardFooter: React.FC = () => {
  return (
    <footer className="bg-[var(--bg)] text-[var(--mute)] border-t border-[var(--line)] px-6 py-6 text-xs font-sans">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-white tracking-wider">VEROLED</span>
          <span>·</span>
          <span>Tecnologie Display LED Professionali</span>
          <span>·</span>
          <span>Norme CEI 64-8 / ITU-R BT.709</span>
        </div>
        <div className="text-[var(--faint)] text-[11px]">
          © 2026 VeroLED S.r.l. · <a href="https://veroled.it" target="_blank" rel="noopener noreferrer" className="text-[var(--mute)] hover:text-white transition-colors">veroled.it</a>
        </div>
      </div>
    </footer>
  );
};
