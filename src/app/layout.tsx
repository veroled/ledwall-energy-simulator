import type { Metadata } from 'next';
import './globals.css';

/*
 * Il carattere e' Google Sans Flex della base comune veroled-ui (src/ui/font), lo stesso del CMS:
 * niente piu' Inter e JetBrains Mono scaricati da Google Fonts a ogni build.
 */

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
    <html lang="it" className="h-full" data-theme="scuro">
      <body className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--text)] antialiased">
        {/* A 390 px questa barra usciva dallo schermo e la pagina era larga 580 px: ora scorre dentro di se'. */}
        <nav style={{ padding: '0 20px', fontSize: '13px', background: 'var(--bg)', borderBottom: '1px solid var(--line)', display: 'flex', gap: '14px', alignItems: 'center', zIndex: 99, position: 'relative', overflowX: 'auto', whiteSpace: 'nowrap', maxWidth: '100vw' }}>
          <a href="/" style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 500, display: 'inline-flex', alignItems: 'center', minHeight: 44 }}>← VeroLED Home</a>
          <span style={{ color: 'var(--faint)' }}>·</span>
          <a href="/simulatore-consumi/express/" style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 500, display: 'inline-flex', alignItems: 'center', minHeight: 44 }}>⚡ Calcolo Express</a>
          <span style={{ color: 'var(--faint)' }}>·</span>
          <a href="/calcolatore-ledwall/" style={{ color: 'var(--mute)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', minHeight: 44 }}>Calcolatore Risoluzione</a>
          <span style={{ color: 'var(--faint)' }}>·</span>
          <a href="/configuratore/" style={{ color: 'var(--mute)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', minHeight: 44 }}>Configuratore</a>
          <span style={{ color: 'var(--faint)' }}>·</span>
          <a href="/prezzi-ledwall/" style={{ color: 'var(--mute)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', minHeight: 44 }}>Listino Prezzi</a>
          <span style={{ color: 'var(--faint)' }}>·</span>
          <a href="/cultura/quanto-consuma-un-ledwall/" style={{ color: 'var(--mute)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', minHeight: 44 }}>Guida Consumi &amp; APL</a>
          <span style={{ color: 'var(--faint)' }}>·</span>
          <a href="/contatti/" style={{ color: 'var(--mute)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', minHeight: 44 }}>Contatti</a>
        </nav>
        <h1 style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>Simulatore Consumi e Dimensionamento LEDwall — Calcolo Preventivo VeroLED</h1>
        {children}
      </body>
    </html>
  );
}

