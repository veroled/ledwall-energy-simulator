import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Simulatore Consumi LEDwall: Efficienza Energetica, APL & TCO | VeroLED',
  description:
    'Simulatore consumi energetici per maxischermi LEDwall outdoor e DOOH: calcola kWh reali con formula APL, curva crepuscolare e telemetria Fleet Monitor PRO.',
  metadataBase: new URL('https://veroled.it'),
  alternates: {
    canonical: 'https://veroled.it/simulatore-consumi/',
  },
  openGraph: {
    title: 'Simulatore Consumi LEDwall: Efficienza Energetica, APL & TCO | VeroLED',
    description:
      'Simulatore consumi energetici per maxischermi LEDwall outdoor e DOOH: calcola kWh reali con formula APL, curva crepuscolare e telemetria Fleet Monitor PRO.',
    url: 'https://veroled.it/simulatore-consumi/',
    type: 'website',
    siteName: 'VeroLED',
    locale: 'it_IT',
    images: [
      {
        url: 'https://veroled.it/og-image.png',
        width: 1200,
        height: 630,
        alt: 'VeroLED Simulatore Consumi',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Simulatore Consumi LEDwall: Efficienza Energetica, APL & TCO | VeroLED',
    description:
      'Simulatore consumi energetici per maxischermi LEDwall outdoor e DOOH: calcola kWh reali con formula APL, curva crepuscolare e telemetria Fleet Monitor PRO.',
    images: ['https://veroled.it/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="h-full">
      <body className={`${inter.variable} ${jetbrainsMono.variable} min-h-screen flex flex-col bg-[#07090C] text-[#E8EDF2] antialiased`}>
        <nav style={{ padding: '10px 20px', fontSize: '12px', background: '#0d1117', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '14px', alignItems: 'center', zIndex: 99, position: 'relative' }}>
          <a href="/" style={{ color: '#2dd4bf', textDecoration: 'none', fontWeight: 600 }}>← VeroLED Home</a>
          <span style={{ color: '#64748b' }}>·</span>
          <a href="/simulatore-consumi/express/" style={{ color: '#22a0c2', textDecoration: 'none', fontWeight: 600 }}>⚡ Calcolo Express</a>
          <span style={{ color: '#64748b' }}>·</span>
          <a href="/calcolatore-ledwall/" style={{ color: '#94a3b8', textDecoration: 'none' }}>Calcolatore Risoluzione</a>
          <span style={{ color: '#64748b' }}>·</span>
          <a href="/configuratore/" style={{ color: '#94a3b8', textDecoration: 'none' }}>Configuratore</a>
          <span style={{ color: '#64748b' }}>·</span>
          <a href="/prezzi-ledwall/" style={{ color: '#94a3b8', textDecoration: 'none' }}>Listino Prezzi</a>
          <span style={{ color: '#64748b' }}>·</span>
          <a href="/cultura/quanto-consuma-un-ledwall/" style={{ color: '#94a3b8', textDecoration: 'none' }}>Guida Consumi &amp; APL</a>
          <span style={{ color: '#64748b' }}>·</span>
          <a href="/contatti/" style={{ color: '#94a3b8', textDecoration: 'none' }}>Contatti</a>
        </nav>
        <h1 style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>Simulatore Consumi e Dimensionamento LEDwall — Calcolo Preventivo VeroLED</h1>
        {children}
      </body>
    </html>
  );
}

