/**
 * Parser Scheda Tecnica e Preventivi LEDwall (PDF)
 * Estrae W/m², standby, passo pixel, nits, dimensioni cabinet.
 * Regola: Mai inventare dati mancanti; i campi assenti vengono precompilati con i default
 * certificati VeroLED e marcati esplicitamente come "STIMATO".
 */
import { asset } from '../config/paths';
import { CONFIG } from '../config/config';

export interface ParametroEstratto<T> {
  valore: T;
  isStimato: boolean;
  fonte: 'PDF' | 'STIMATO';
}

export interface DatiSchedaTecnica {
  nomeFile: string;
  pMaxWmq: ParametroEstratto<number>;
  pStandbyWmq: ParametroEstratto<number>;
  pitchMm: ParametroEstratto<number>;
  nits: ParametroEstratto<number>;
  cabinetWidthMm: ParametroEstratto<number>;
  cabinetHeightMm: ParametroEstratto<number>;
  modelloRilevato?: string;
}

/**
 * Estrae tutto il testo da un file PDF tramite pdfjs-dist
 */
export async function estraiTestoDaPdf(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    // Import dinamico per evitare problemi di SSR in Next.js
    const pdfjs = await import('pdfjs-dist');
    
    // Configura il worker se necessario
    if (!pdfjs.GlobalWorkerOptions.workerSrc && typeof window !== 'undefined') {
      // Worker servito dallo stesso dominio: la CSP di veroledsrl.com ammette solo worker-src 'self'
      pdfjs.GlobalWorkerOptions.workerSrc = asset('/pdf.worker.min.mjs');
    }

    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;
    let fullText = '';

    const maxPages = Math.min(pdfDoc.numPages, 10);
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str || '')
        .join(' ');
      fullText += ` ${pageText}`;
    }

    return fullText;
  } catch (error) {
    console.warn('[PDF Parser] Errore estrazione testo da PDF, uso fallback profilo stimato:', error);
    return '';
  }
}

/**
 * Analizza il testo estratto e identifica i parametri ingegneristici
 */
export function analizzaTestoSchedaTecnica(rawText: string, nomeFile: string): DatiSchedaTecnica {
  const text = rawText.toLowerCase();

  // 1. Estrazione Potenza Massima (W/m² o W/sqm)
  // Es: "500 w/m²", "max power: 650 w/mq", "potenza max 550w/m2"
  let pMax = CONFIG.P_MAX_DEFAULT;
  let pMaxFound = false;
  const pMaxMatch = text.match(/(?:max(?:ima)?(?:\s+power)?|potenza\s+max(?:sima)?)[^\d]{0,25}(\d{3,4})\s*(?:w\/?m(?:²|q|2)?|watt)/i)
    || text.match(/(\d{3,4})\s*(?:w\/?m(?:²|q|2)|watt\/?m(?:²|q|2))/i);

  if (pMaxMatch && pMaxMatch[1]) {
    const val = parseInt(pMaxMatch[1], 10);
    if (val >= 150 && val <= 1500) {
      pMax = val;
      pMaxFound = true;
    }
  }

  // 2. Estrazione Standby (W/m² o W/cabinet)
  let pStandby = CONFIG.P_STANDBY_DEFAULT;
  let pStandbyFound = false;
  const standbyMatch = text.match(/(?:standby|stand-by|sleep\s+mode|riposo)[^\d]{0,25}(\d{1,3})\s*(?:w\/?m(?:²|q|2)?|watt)/i);
  if (standbyMatch && standbyMatch[1]) {
    const val = parseInt(standbyMatch[1], 10);
    if (val >= 0 && val <= 200) {
      pStandby = val;
      pStandbyFound = true;
    }
  }

  // 3. Estrazione Passo Pixel (Pitch)
  // Es: "P3.91", "pixel pitch: 2.6mm", "Passo 4.8"
  let pitch = CONFIG.TOP_QUALITY_PROFILE.pitch;
  let pitchFound = false;
  const pitchMatch = text.match(/(?:pixel\s*pitch|passo\s*pixel|pitch|passo)[^\d]{0,15}(?:p)?(\d+[.,]\d+)/i)
    || text.match(/\bp(\d+[.,]\d+)\b/i);

  if (pitchMatch && pitchMatch[1]) {
    const val = parseFloat(pitchMatch[1].replace(',', '.'));
    if (val >= 0.9 && val <= 20) {
      pitch = val;
      pitchFound = true;
    }
  }

  // 4. Estrazione Luminosità (Nits / cd/m²)
  let nits = CONFIG.TOP_QUALITY_PROFILE.maxNits;
  let nitsFound = false;
  const nitsMatch = text.match(/(\d{3,5})\s*(?:nits?|cd\/?m(?:²|q|2))/i)
    || text.match(/(?:luminosit[àa]|brightness)[^\d]{0,15}(\d{3,5})/i);

  if (nitsMatch && nitsMatch[1]) {
    const val = parseInt(nitsMatch[1], 10);
    if (val >= 500 && val <= 15000) {
      nits = val;
      nitsFound = true;
    }
  }

  // 5. Dimensioni Cabinet
  let cabW = 1000;
  let cabH = 1000;
  let cabFound = false;
  const cabMatch = text.match(/(\d{3,4})\s*[x×*]\s*(\d{3,4})\s*mm/i);
  if (cabMatch && cabMatch[1] && cabMatch[2]) {
    const w = parseInt(cabMatch[1], 10);
    const h = parseInt(cabMatch[2], 10);
    if (w >= 250 && w <= 2000 && h >= 250 && h <= 2000) {
      cabW = w;
      cabH = h;
      cabFound = true;
    }
  }

  return {
    nomeFile,
    pMaxWmq: {
      valore: pMax,
      isStimato: !pMaxFound,
      fonte: pMaxFound ? 'PDF' : 'STIMATO',
    },
    pStandbyWmq: {
      valore: pStandby,
      isStimato: !pStandbyFound,
      fonte: pStandbyFound ? 'PDF' : 'STIMATO',
    },
    pitchMm: {
      valore: pitch,
      isStimato: !pitchFound,
      fonte: pitchFound ? 'PDF' : 'STIMATO',
    },
    nits: {
      valore: nits,
      isStimato: !nitsFound,
      fonte: nitsFound ? 'PDF' : 'STIMATO',
    },
    cabinetWidthMm: {
      valore: cabW,
      isStimato: !cabFound,
      fonte: cabFound ? 'PDF' : 'STIMATO',
    },
    cabinetHeightMm: {
      valore: cabH,
      isStimato: !cabFound,
      fonte: cabFound ? 'PDF' : 'STIMATO',
    },
  };
}
