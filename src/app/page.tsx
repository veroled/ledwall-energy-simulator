import { SimulatorWizard } from './SimulatorWizard';

const mainJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  'name': 'Simulatore Consumi LEDwall Outdoor & DOOH VeroLED',
  'url': 'https://veroled.it/simulatore-consumi/',
  'applicationCategory': 'BusinessApplication',
  'operatingSystem': 'All',
  'browserRequirements': 'Requires JavaScript',
  'description': 'Simulatore ingegneristico dei consumi orari e annuali per maxischermi outdoor e DOOH con formula APL e telemetria Fleet Monitor PRO.',
  'provider': {
    '@type': 'Organization',
    'name': 'VeroLED',
    'url': 'https://veroled.it/'
  }
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(mainJsonLd) }}
      />
      <SimulatorWizard />
    </>
  );
}
