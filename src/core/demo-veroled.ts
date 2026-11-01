/**
 * Il contenuto dimostrativo dei due slot del confronto, disegnato dal vivo nella pagina.
 *
 * Prima erano diciotto video (nove formati × due versioni), con uno spot di terzi e le bande nere
 * registrate dentro il file: «Riempi» non poteva toglierle, e uno schermo in un formato che non
 * era fra i nove si vedeva ritagliato. Qui il disegno si fa alla misura del LEDwall, qualunque
 * sia, e la luminosità media si misura su quello che si disegna.
 *
 * Le due versioni sono lo STESSO contenuto: cambia solo quanta luce emette il fondo, che è
 * esattamente il confronto della pagina.
 *
 * ⛔ Questo file non importa niente: la verifica nel browser (scripts/verifica-demo.mjs) lo
 *    trascrive in JavaScript e lo carica da solo in Chromium.
 * ⛔ Il disegno dipende solo da t, W e H, mai dall'orologio: stesso istante, stessa immagine.
 *    È ciò che rende ripetibile la misura.
 * ⛔ Niente misure in pixel assoluti: tutto è proporzionale al lato corto, così l'immagine (e la
 *    sua luminosità) è la stessa nel riquadro dell'anteprima e nei fotogrammi piccoli della misura.
 */

export type VersioneDemo = 'chiaro' | 'ottimizzato';

/** Le righe di testo, approvate dal titolare il 01/11/2026 */
export const TESTI_DEMO = { parole: ['LEDWALL', 'VETRINE', 'EVENTI', 'CITTÀ'], firma: 'veroled.it' } as const;

/** Ogni parola resta 6 s: quattro parole fanno un giro di 24 s, poi il disegno si richiude su se stesso */
export const SECONDI_PER_PAROLA = 6;
export const DURATA_DEMO_SEC = SECONDI_PER_PAROLA * TESTI_DEMO.parole.length;

/** Il carattere della base comune veroled-ui (src/ui/font/font.css) */
export const FONT_DEMO = '"Google Sans Flex Variable", sans-serif';

export const VERSIONI_DEMO: Record<VersioneDemo, { fondo: string; testo: string; scritta: string; etichetta: string }> = {
  // Fondo crema e testo scuro: il contenuto «come lo fanno tutti»
  chiaro: { fondo: '#f4f1ea', testo: '#1b1c1e', scritta: '/brand/scritta-nera.svg', etichetta: 'Demo · contenuto chiaro' },
  // Fondo nero e testo chiaro: lo stesso messaggio, con meno luce
  ottimizzato: { fondo: '#000000', testo: '#e8eaed', scritta: '/brand/scritta-bianca.svg', etichetta: 'Demo · contenuto ottimizzato' },
};

/**
 * Luminosità media usata dalla pagina SOLO nell'istante prima della prima misura (il tempo di
 * caricare carattere e scritta): poi vale quella misurata sul disegno, nel formato dello schermo.
 * Misurata in Chromium in 3:2 il 01/11/2026; scripts/verifica-demo.mjs controlla che resti entro
 * 10 punti dalla misura vera in tutti i formati, altrimenti la cifra che lampeggia mentirebbe.
 */
export const APL_DEMO_PROVVISORIO: Record<VersioneDemo, number> = { chiaro: 52, ottimizzato: 20 };

/** Proporzioni della scritta ufficiale (viewBox di public/brand/scritta-*.svg) */
const SCRITTA_W = 836.61;
const SCRITTA_H = 132;

const COLORI_PANNELLO = ['#2f6fdb', '#d9542c', '#1f9d55', '#e0a020'];

/** Quello che il disegno usa del contesto 2D: basta questo, e le prove possono passarne uno finto */
export type ContestoDemo = Pick<
  CanvasRenderingContext2D,
  'fillStyle' | 'globalAlpha' | 'font' | 'textAlign' | 'textBaseline' | 'fillRect' | 'fillText' | 'drawImage'
>;

/**
 * Disegna il fotogramma all'istante t (secondi) in un'area W×H.
 * `scritta` è la scritta ufficiale già caricata; se manca (o il browser non la sa disegnare) il
 * fotogramma esce senza, ma esce.
 */
export function disegnaDemo(
  x: ContestoDemo,
  t: number,
  W: number,
  H: number,
  versione: VersioneDemo,
  scritta: CanvasImageSource | null
): void {
  const V = VERSIONI_DEMO[versione];
  const u = Math.min(W, H) / 100;
  t = ((t % DURATA_DEMO_SEC) + DURATA_DEMO_SEC) % DURATA_DEMO_SEC;

  x.globalAlpha = 1;
  x.fillStyle = V.fondo;
  x.fillRect(0, 0, W, H);

  // Il pannello di pixel: la parte bassa, su fondo scuro in tutte e due le versioni, acceso da
  // un'onda. È la parte uguale; cambia solo il fondo sopra.
  const gy0 = H * 0.38;
  x.fillStyle = '#111111';
  x.fillRect(0, gy0, W, H - gy0);
  const lato = u * 7;
  const passo = lato + u * 1.2;
  const margine = (passo - lato) / 2;
  const giro = Math.floor(t / SECONDI_PER_PAROLA);
  for (let j = 0; gy0 + margine + j * passo < H; j++) {
    for (let i = 0; margine + i * passo < W; i++) {
      const onda = 0.5 + 0.5 * Math.cos(2 * Math.PI * (t / SECONDI_PER_PAROLA - (i + j) / 14));
      x.fillStyle = COLORI_PANNELLO[(i * 3 + j + giro) % COLORI_PANNELLO.length];
      x.globalAlpha = 0.5 + 0.5 * onda;
      x.fillRect(margine + i * passo, gy0 + margine + j * passo, lato, lato);
    }
  }
  x.globalAlpha = 1;

  // Sopra il pannello: la scritta ufficiale così com'è, la parola che cambia, la firma
  const alto = gy0;
  if (scritta) {
    const sw = Math.min(W * 0.6, (alto * 0.22 * SCRITTA_W) / SCRITTA_H, u * 70);
    const sh = (sw * SCRITTA_H) / SCRITTA_W;
    try {
      x.drawImage(scritta, (W - sw) / 2, alto * 0.12, sw, sh);
    } catch {
      // Un browser che non sa disegnare un SVG senza misure proprie: il fotogramma esce senza scritta
    }
  }

  // La parola entra, resta ed esce in dissolvenza: alla fine dei 6 s è già sparita, quindi il
  // passaggio alla parola dopo (e la richiusura del giro) non dà scatti
  const parola = TESTI_DEMO.parole[giro % TESTI_DEMO.parole.length];
  const f = (t % SECONDI_PER_PAROLA) / SECONDI_PER_PAROLA;
  const a = Math.max(0, Math.min(1, f / 0.12, (1 - f) / 0.12));
  const dim = Math.min((W * 0.84) / (parola.length * 0.64), alto * 0.34);
  x.font = `700 ${dim}px ${FONT_DEMO}`;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillStyle = V.testo;
  x.globalAlpha = a;
  x.fillText(parola, W / 2 + (1 - a) * u * 6, alto * 0.6);
  x.globalAlpha = 1;
  x.font = `500 ${Math.min(u * 4.2, alto * 0.1)}px ${FONT_DEMO}`;
  x.fillText(TESTI_DEMO.firma, W / 2, alto * 0.88);
}

/** Lato lungo dei fotogrammi della misura: poi il motore APL li riduce a 160 px, come i video */
export const LATO_MISURA_PX = 480;
export const FOTOGRAMMI_MISURA = 30;

/**
 * I fotogrammi su cui si misura la luminosità media: 30, distribuiti uniformemente sul giro di
 * 24 s, nel rapporto del LEDwall. Stesso numero del campionamento dei video del cliente.
 */
export function fotogrammiDemo(
  versione: VersioneDemo,
  ratioW: number,
  ratioH: number,
  scritta: CanvasImageSource | null,
  crea: () => HTMLCanvasElement = () => document.createElement('canvas')
): HTMLCanvasElement[] {
  const rw = Math.max(0.01, ratioW);
  const rh = Math.max(0.01, ratioH);
  const W = Math.max(8, Math.round(rw >= rh ? LATO_MISURA_PX : (LATO_MISURA_PX * rw) / rh));
  const H = Math.max(8, Math.round(rh > rw ? LATO_MISURA_PX : (LATO_MISURA_PX * rh) / rw));
  const out: HTMLCanvasElement[] = [];
  for (let k = 0; k < FOTOGRAMMI_MISURA; k++) {
    const c = crea();
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d');
    if (!ctx) continue;
    disegnaDemo(ctx, ((k + 0.5) * DURATA_DEMO_SEC) / FOTOGRAMMI_MISURA, W, H, versione, scritta);
    out.push(c);
  }
  return out;
}
