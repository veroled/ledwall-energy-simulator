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
  title: 'VeroLED — LEDwall Energy Simulator (DOOH & Outdoor)',
  description:
    'Calcola in tempo reale i consumi reali e i costi di un maxischermo LEDwall outdoor. Scopri come tagliare oltre il 50% con Fleet Monitor VeroLED.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="h-full">
      <body className={`${inter.variable} ${jetbrainsMono.variable} min-h-screen flex flex-col bg-[#FFFFFF] text-[#101828] antialiased`}>
        {children}
      </body>
    </html>
  );
}

