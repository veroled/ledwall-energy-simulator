'use client';

import React from 'react';

export const WizardFooter: React.FC = () => {
  return (
    <footer className="bg-[#111318] text-[#98A2B3] border-t border-[#1F242F] px-6 py-6 text-xs font-sans">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-white tracking-wider">VEROLED</span>
          <span>·</span>
          <span>Tecnologie Display LED Professionali</span>
          <span>·</span>
          <span>Norme CEI 64-8 / ITU-R BT.709</span>
        </div>
        <div className="text-[#667085] text-[11px]">
          © 2026 VeroLED S.r.l. · P.IVA 01234567890 · <a href="https://veroledsrl.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">veroledsrl.com</a>
        </div>
      </div>
    </footer>
  );
};

