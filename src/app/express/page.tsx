import type { Metadata } from 'next';
import { ExpressSimulator } from '../../components/express/ExpressSimulator';

export const metadata: Metadata = {
  title: 'VeroLED — Calcolo Express LEDwall',
  description:
    'Configura un LEDwall in una schermata: passo, dimensioni, nit e contenuto. Consumi immediati e alternativa consigliata.',
};

export default function ExpressPage() {
  return <ExpressSimulator />;
}
