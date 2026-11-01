'use client';

import { asset } from '../../config/paths';
import { FONT_DEMO, TESTI_DEMO, VERSIONI_DEMO, type VersioneDemo } from '../../core/demo-veroled';

/*
 * Carattere e scritta ufficiale, caricati una volta sola per tutta la pagina.
 * Prima di disegnare si aspettano entrambi: un fotogramma col carattere di sistema avrebbe un'altra
 * luminosità, e la misura direbbe un numero che lo schermo non mostra.
 */
const scritte = new Map<VersioneDemo, Promise<HTMLImageElement | null>>();
let carattere: Promise<void> | null = null;

function caricaCarattere(): Promise<void> {
  if (!carattere) {
    const testo = TESTI_DEMO.parole.join('') + TESTI_DEMO.firma;
    carattere = typeof document !== 'undefined' && document.fonts
      ? Promise.all([document.fonts.load(`700 40px ${FONT_DEMO}`, testo), document.fonts.load(`500 40px ${FONT_DEMO}`, testo)])
          .then(() => undefined)
          .catch(() => undefined)
      : Promise.resolve();
  }
  return carattere;
}

function caricaScritta(versione: VersioneDemo): Promise<HTMLImageElement | null> {
  let p = scritte.get(versione);
  if (!p) {
    p = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      // Senza scritta il disegno esce lo stesso: meglio una demo senza logo che nessuna demo
      img.onerror = () => resolve(null);
      img.src = asset(VERSIONI_DEMO[versione].scritta);
    });
    scritte.set(versione, p);
  }
  return p;
}

/** Tutto ciò che serve per disegnare la versione richiesta; risolve con la scritta (o null) */
export async function preparaDemo(versione: VersioneDemo): Promise<HTMLImageElement | null> {
  const [img] = await Promise.all([caricaScritta(versione), caricaCarattere()]);
  return img;
}
