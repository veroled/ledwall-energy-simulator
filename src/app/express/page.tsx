import type { Metadata } from 'next';
import { ExpressSimulator } from '../../components/express/ExpressSimulator';

export const metadata: Metadata = {
  title: 'Simulatore Consumi LEDwall: Calcolo Bolletta, kWh e APL | VeroLED',
  description:
    'Simulatore consumi LEDwall online: calcola kW di picco, assorbimento medio orario con formula APL, spesa annuale in bolletta e risparmio con Common Cathode.',
  alternates: {
    canonical: 'https://veroled.it/simulatore-consumi/express/',
  },
  openGraph: {
    title: 'Simulatore Consumi LEDwall: Calcolo Bolletta, kWh e APL | VeroLED',
    description:
      'Simulatore consumi LEDwall online: calcola kW di picco, assorbimento medio orario con formula APL, spesa annuale in bolletta e risparmio con Common Cathode.',
    url: 'https://veroled.it/simulatore-consumi/express/',
    type: 'website',
    siteName: 'VeroLED',
    locale: 'it_IT',
    images: [
      {
        url: 'https://veroled.it/og-image.png',
        width: 1200,
        height: 630,
        alt: 'VeroLED Simulatore Consumi Express',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Simulatore Consumi LEDwall: Calcolo Bolletta, kWh e APL | VeroLED',
    description:
      'Simulatore consumi LEDwall online: calcola kW di picco, assorbimento medio orario con formula APL, spesa annuale in bolletta e risparmio con Common Cathode.',
    images: ['https://veroled.it/og-image.png'],
  },
};

const expressJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  'name': 'Simulatore Consumi Express LEDwall VeroLED',
  'url': 'https://veroled.it/simulatore-consumi/express/',
  'applicationCategory': 'BusinessApplication',
  'operatingSystem': 'All',
  'browserRequirements': 'Requires JavaScript',
  'description': 'Simulatore energetico per il calcolo in tempo reale di consumi elettrici in kWh, formula APL e risparmio in bolletta per schermi LEDwall.',
  'provider': {
    '@type': 'Organization',
    'name': 'VeroLED',
    'url': 'https://veroled.it/'
  }
};

export default function ExpressPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(expressJsonLd) }}
      />
      <ExpressSimulator />
    </>
  );
}
