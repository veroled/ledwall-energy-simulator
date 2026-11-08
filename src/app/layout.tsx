import type { Metadata } from 'next';
import './globals.css';
import cornice from './cornice-sito.json';

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
        {/* La cornice è quella del sito (08/11/2026): testata, menu e piè di pagina letti dalla build di
            veroled.it da scripts/sync-cornice-sito.mjs. Prima qui c'era una striscia di link propria
            («← VeroLED Home · ⚡ Calcolo Express · …») e un H1 nascosto: ora il titolo è nella pagina. */}
        <style dangerouslySetInnerHTML={{ __html: cornice.css }} />
        <div dangerouslySetInnerHTML={{ __html: cornice.testata + cornice.menu }} style={{ display: 'contents' }} />
        <div style={{ height: 56 }} aria-hidden="true" />
        {children}
        <div dangerouslySetInnerHTML={{ __html: cornice.piede }} style={{ display: 'contents' }} />
        {cornice.script.map((src) => <script key={src} src={src} defer />)}
      </body>
    </html>
  );
}

