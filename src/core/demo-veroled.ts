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

/*
 * Il pannello di celle colorate sta sul FONDO della versione (08/11/2026, il titolare: «manca qualcosa?»).
 * Prima stava su #111 in tutte e due: il mosaico occupava il 62 % del riquadro ed era identico, e a
 * colpo d'occhio A e B sembravano lo stesso contenuto. Ora A è chiaro dappertutto e B scuro dappertutto.
 * `pannelloMedio` è il colore medio delle celle sul loro fondo (copertura 72,9 %, alfa medio 0,75).
 */
export const VERSIONI_DEMO: Record<VersioneDemo, { fondo: string; testo: string; scritta: string; etichetta: string; pannello: string; pannelloMedio: string }> = {
  // Fondo crema e testo scuro: il contenuto «come lo fanno tutti»
  chiaro: { fondo: '#f4f1ea', testo: '#1b1c1e', scritta: '/brand/scritta-nera.svg', etichetta: 'Demo · contenuto chiaro', pannello: '#f4f1ea', pannelloMedio: '#b5b39e' },
  // Fondo nero e testo chiaro: lo stesso messaggio, con meno luce
  ottimizzato: { fondo: '#000000', testo: '#e8eaed', scritta: '/brand/scritta-bianca.svg', etichetta: 'Demo · contenuto ottimizzato', pannello: '#111111', pannelloMedio: '#4f4e3c' },
};

/**
 * Luminosità media usata dalla pagina SOLO nell'istante prima della prima misura (il tempo di
 * caricare carattere e scritta): poi vale quella misurata sul disegno, nel formato dello schermo.
 * Misurata in Chromium in 3:2 il 01/11/2026, rimisurata l'08/11/2026 col pannello sul fondo della versione; scripts/verifica-demo.mjs controlla che resti entro
 * 10 punti dalla misura vera in tutti i formati, altrimenti la cifra che lampeggia mentirebbe.
 */
export const APL_DEMO_PROVVISORIO: Record<VersioneDemo, number> = { chiaro: 77, ottimizzato: 20 };

/** Proporzioni della scritta ufficiale (viewBox di public/brand/scritta-*.svg) */
const SCRITTA_W = 836.61;
const SCRITTA_H = 132;

const COLORI_PANNELLO = ['#2f6fdb', '#d9542c', '#1f9d55', '#e0a020'];

/** Quello che il disegno usa del contesto 2D: basta questo, e le prove possono passarne uno finto */
export type ContestoDemo = Pick<
  CanvasRenderingContext2D,
  'fillStyle' | 'globalAlpha' | 'font' | 'textAlign' | 'textBaseline' | 'fillRect' | 'fillText' | 'drawImage'
>;

/** La parte di schermo da disegnare, in pixel dello schermo intero: il canvas è grande quanto lei */
export interface VistaDemo {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Oltre il 5:1 (nastri da stadio, pali verticali) lo schema «scritta sopra, pannello sotto» non
 * regge più: lo schermo diventa un NASTRO che scorre lungo il lato lungo.
 */
export const SOGLIA_NASTRO = 5;

export function formaNastro(ratioW: number, ratioH: number): 'orizzontale' | 'verticale' | null {
  if (ratioW >= SOGLIA_NASTRO * ratioH) return 'orizzontale';
  if (ratioH >= SOGLIA_NASTRO * ratioW) return 'verticale';
  return null;
}

/**
 * Disegna il fotogramma all'istante t (secondi) di uno schermo W×H.
 * `scritta` è la scritta ufficiale già caricata; se manca (o il browser non la sa disegnare) il
 * fotogramma esce senza, ma esce.
 * `vista` (solo per i nastri) disegna un pezzo dello schermo: serve alla lente dell'anteprima, che
 * ingrandisce un tratto di un nastro da 100 m senza disegnarlo tutto a quella scala.
 */
export function disegnaDemo(
  x: ContestoDemo,
  t: number,
  W: number,
  H: number,
  versione: VersioneDemo,
  scritta: CanvasImageSource | null,
  vista?: VistaDemo
): void {
  t = ((t % DURATA_DEMO_SEC) + DURATA_DEMO_SEC) % DURATA_DEMO_SEC;
  const nastro = formaNastro(W, H);
  if (nastro) disegnaNastro(x, t, W, H, versione, scritta, nastro === 'verticale', vista ?? { x: 0, y: 0, w: W, h: H });
  else disegnaRiquadro(x, t, W, H, versione, scritta);
}

function disegnaScritta(x: ContestoDemo, scritta: CanvasImageSource, sx: number, sy: number, sw: number) {
  try {
    x.drawImage(scritta, sx, sy, sw, (sw * SCRITTA_H) / SCRITTA_W);
  } catch {
    // Un browser che non sa disegnare un SVG senza misure proprie: il fotogramma esce senza scritta
  }
}

type Blocco = { tipo: 'scritta' | 'parola' | 'pannello' | 'firma'; testo?: string; lungo: number };

/**
 * La sequenza del nastro, in multipli del lato corto: scritta, poi ogni parola seguita da un tratto
 * di pannello, poi la firma. Sul verticale il testo resta orizzontale (deciso dal titolare il
 * 01/11/2026) e i blocchi sono bassi: il palo si legge senza piegare la testa.
 * Le lunghezze tengono i fondi del testo a circa il 40 % dello schermo, come nello schema normale:
 * così chiaro e ottimizzato hanno lo stesso scarto di luminosità a qualunque formato.
 */
function blocchiNastro(verticale: boolean): Blocco[] {
  const pannello: Blocco = { tipo: 'pannello', lungo: verticale ? 1 : 6.6 };
  return [
    { tipo: 'scritta', lungo: verticale ? 0.45 : 2.6 },
    ...TESTI_DEMO.parole.flatMap((p): Blocco[] => [{ tipo: 'parola', testo: p, lungo: verticale ? 0.45 : p.length * 0.43 + 0.5 }, pannello]),
    { tipo: 'firma', lungo: verticale ? 0.4 : 2.4 },
  ];
}

/** Lunghezza del giro del nastro, in multipli del lato corto */
export function lunghezzaGiroNastro(verticale: boolean): number {
  return blocchiNastro(verticale).reduce((a, b) => a + b.lungo, 0);
}

function disegnaNastro(
  x: ContestoDemo,
  t: number,
  W: number,
  H: number,
  versione: VersioneDemo,
  scritta: CanvasImageSource | null,
  verticale: boolean,
  vista: VistaDemo
): void {
  const V = VERSIONI_DEMO[versione];
  const s = verticale ? W : H;
  const u = s / 100;
  const blocchi = blocchiNastro(verticale);
  const giroPx = lunghezzaGiroNastro(verticale) * s;
  // In 24 s il nastro avanza di un giro intero: a qualunque lunghezza, il fotogramma a 24 s è
  // quello a 0. Scorre verso sinistra (orizzontale) o verso l'alto (verticale).
  const spostamento = (t / DURATA_DEMO_SEC) * giroPx;
  const da = verticale ? vista.y : vista.x;
  const a = da + (verticale ? vista.h : vista.w);
  const colore = Math.floor(t / SECONDI_PER_PAROLA);

  x.globalAlpha = 1;
  x.fillStyle = V.fondo;
  x.fillRect(0, 0, vista.w, vista.h);
  x.textAlign = 'center';
  x.textBaseline = 'middle';

  for (let n = Math.floor((da + spostamento) / giroPx) - 1; n * giroPx - spostamento < a; n++) {
    let pos = n * giroPx - spostamento;
    for (const b of blocchi) {
      const lungo = b.lungo * s;
      if (pos + lungo > da && pos < a) {
        // Il blocco in coordinate del canvas della vista
        const bx = verticale ? -vista.x : pos - vista.x;
        const by = verticale ? pos - vista.y : -vista.y;
        const bw = verticale ? W : lungo;
        const bh = verticale ? lungo : H;
        if (b.tipo === 'pannello') {
          x.fillStyle = VERSIONI_DEMO[versione].pannello;
          x.fillRect(bx, by, bw, bh);
          const lato = u * 7;
          if (lato < 1) {
            // Celle più piccole di un pixel (la miniatura di un nastro da 100 m): migliaia di
            // rettangoli invisibili a ogni fotogramma. Si stende il loro colore medio. Non tocca la
            // misura, che disegna con un lato corto di almeno 48 px (celle da 3 px e oltre).
            x.fillStyle = VERSIONI_DEMO[versione].pannelloMedio;
            x.fillRect(bx, by, bw, bh);
            pos += lungo;
            continue;
          }
          const passo = lato + u * 1.2;
          const m = (passo - lato) / 2;
          for (let j = 0; m + j * passo < bh; j++) {
            const cy = by + m + j * passo;
            if (cy + lato < 0 || cy > vista.h) continue;
            for (let i = 0; m + i * passo < bw; i++) {
              const cx = bx + m + i * passo;
              if (cx + lato < 0 || cx > vista.w) continue;
              const onda = 0.5 + 0.5 * Math.cos(2 * Math.PI * (t / SECONDI_PER_PAROLA - (i + j) / 14));
              x.fillStyle = COLORI_PANNELLO[(i * 3 + j + colore) % COLORI_PANNELLO.length];
              x.globalAlpha = 0.5 + 0.5 * onda;
              x.fillRect(cx, cy, lato, lato);
            }
          }
          x.globalAlpha = 1;
        } else if (b.tipo === 'scritta') {
          if (scritta) {
            const sw = Math.min(bw * 0.8, (bh * 0.34 * SCRITTA_W) / SCRITTA_H);
            disegnaScritta(x, scritta, bx + (bw - sw) / 2, by + (bh - (sw * SCRITTA_H) / SCRITTA_W) / 2, sw);
          }
        } else {
          const testo = b.tipo === 'firma' ? TESTI_DEMO.firma : (b.testo as string);
          const dim = b.tipo === 'firma'
            ? Math.min(bh * 0.36, (bw * 0.84) / (testo.length * 0.55))
            : Math.min(bh * 0.56, (bw * 0.84) / (testo.length * 0.64));
          x.font = `${b.tipo === 'firma' ? 500 : 700} ${dim}px ${FONT_DEMO}`;
          x.fillStyle = V.testo;
          x.fillText(testo, bx + bw / 2, by + bh / 2);
        }
      }
      pos += lungo;
    }
  }
}

/** Il disegno degli schermi «normali», fino al 5:1: scritta e parola sopra, pannello sotto */
function disegnaRiquadro(
  x: ContestoDemo,
  t: number,
  W: number,
  H: number,
  versione: VersioneDemo,
  scritta: CanvasImageSource | null
): void {
  const V = VERSIONI_DEMO[versione];
  const u = Math.min(W, H) / 100;

  x.globalAlpha = 1;
  x.fillStyle = V.fondo;
  x.fillRect(0, 0, W, H);

  // Il pannello di pixel: la parte bassa, acceso da un'onda, sul fondo della versione.
  const gy0 = H * 0.38;
  x.fillStyle = V.pannello;
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
    disegnaScritta(x, scritta, (W - sw) / 2, alto * 0.12, sw);
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

/** Lato corto minimo dei fotogrammi della misura: sotto, nei nastri lunghi il testo diventa poltiglia */
export const LATO_CORTO_MISURA_PX = 48;

/**
 * Misure in pixel dei fotogrammi della misura, nella forma esatta dello schermo: lato lungo 480 px,
 * ma il lato corto non scende sotto i 48 (un nastro 100×1 si misura a 4800×48, non a 480×5).
 */
export function misureFotogramma(ratioW: number, ratioH: number): { W: number; H: number } {
  const rw = Math.max(0.01, ratioW);
  const rh = Math.max(0.01, ratioH);
  const lungo = Math.max(LATO_MISURA_PX, (LATO_CORTO_MISURA_PX * Math.max(rw, rh)) / Math.min(rw, rh));
  const corto = (lungo * Math.min(rw, rh)) / Math.max(rw, rh);
  return rw >= rh ? { W: Math.round(lungo), H: Math.round(corto) } : { W: Math.round(corto), H: Math.round(lungo) };
}

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
  const { W, H } = misureFotogramma(ratioW, ratioH);
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
