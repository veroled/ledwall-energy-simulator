/**
 * Generatore Report Audit Energetico (PDF)
 *
 * Direzione artistica: Dark Spatial Minimalism (riferimento WHITEvoid). Nero pieno di fondo, bianco e grigio
 * titanio, un solo accento freddo; griglia svizzera a 12 colonne su A4 orizzontale, molto vuoto, divisori
 * hairline al 10% di opacita'; titoli in Helvetica, metadati e indici in monospace (JetBrains Mono incorporato).
 * Ogni pagina e' una tavola: numero di sezione in alto a sinistra, titolo a una riga, figura che emerge dal
 * buio, scheda tecnica a griglia.
 *
 * I numeri arrivano tutti dal motore (physics.ts): qui non nasce nessun dato.
 */
import jsPDF, { GState } from 'jspdf';
import { ScreenDimensions, ScenarioResult, DailyEnergyProfile, PowerQualityAnalysis, OpticalConsultingResult, AlternativeProposal, tierName } from './physics';
import { VEROLED_LOGO_PNG_BASE64 } from '../assets/logo-base64';
import { JBMONO_REGULAR_TTF_BASE64, JBMONO_MEDIUM_TTF_BASE64 } from '../assets/pdf-fonts';

export interface ReportData {
  dimensions: ScreenDimensions;
  scenario: ScenarioResult;
  profile: DailyEnergyProfile;
  aplPercent: number;
  tariffaEurKwh: number;
  powerQuality?: PowerQualityAnalysis;
  opticalConsulting?: OpticalConsultingResult;
  /** Verdetto e proposta del motore express: la pagina ottica legge da qui, così PDF e schermo non si contraddicono */
  alternative?: AlternativeProposal;
  userName?: string;
  userCompany?: string;
  userEmail?: string;
}

/**
 * Il font standard di jsPDF copre solo il set WinAnsi (cp1252). Un carattere fuori set — radice, minore-uguale,
 * frecce, pedici — fa scrivere l'INTERA stringa in un'altra codifica: lettere distanziate e testo troncato.
 */
const WINANSI_EXTRA = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
export function isWinAnsi(testo: string): boolean {
  for (const ch of testo) {
    if (ch.charCodeAt(0) > 0xff && !WINANSI_EXTRA.includes(ch)) return false;
  }
  return true;
}

/** Rende stampabile un testo che arriva dal motore: i simboli fuori set diventano parole, mai glifi rotti */
export function pdfSafe(testo: string): string {
  const mappa: Record<string, string> = { '√': 'radice di ', '≤': 'fino a ', '≥': 'almeno ', '→': '->', '←': '<-', '₂': '2', '≈': 'circa ', '−': '-' };
  let out = '';
  for (const ch of testo) out += isWinAnsi(ch) ? ch : mappa[ch] ?? '?';
  return out.replace(/ {2,}/g, ' ');
}

export function generaReportPdf(data: ReportData): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.addFileToVFS('JBMono-Regular.ttf', JBMONO_REGULAR_TTF_BASE64);
  doc.addFont('JBMono-Regular.ttf', 'JBMono', 'normal');
  doc.addFileToVFS('JBMono-Medium.ttf', JBMONO_MEDIUM_TTF_BASE64);
  doc.addFont('JBMono-Medium.ttf', 'JBMono', 'bold');

  // ── Sistema: formato, griglia a 12 colonne, palette ──
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 16; // margine
  const GUTTER = 5;
  const COL = (W - 2 * M - 11 * GUTTER) / 12;
  const colX = (i: number) => M + i * (COL + GUTTER);
  const span = (n: number) => n * COL + (n - 1) * GUTTER;

  type RGB = [number, number, number];
  const BIANCO: RGB = [255, 255, 255];
  const TITANIO: RGB = [136, 144, 150];
  const CIANO: RGB = [126, 232, 255];
  const AMBRA: RGB = [255, 179, 64];

  const opacita = (o: number) => doc.setGState(new GState({ opacity: o, 'stroke-opacity': o }));
  const fmt = (v: number, d = 0) => v.toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: 'always' } as Intl.NumberFormatOptions);
  const eur = (v: number) => `€ ${fmt(Math.round(v))}`;

  const mono = (size: number, colore: RGB = TITANIO, peso: 'normal' | 'bold' = 'normal') => {
    doc.setFont('JBMono', peso);
    doc.setFontSize(size);
    doc.setTextColor(...colore);
    doc.setCharSpace(0);
  };
  const sans = (size: number, colore: RGB = BIANCO, peso: 'normal' | 'bold' = 'normal') => {
    doc.setFont('helvetica', peso);
    doc.setFontSize(size);
    doc.setTextColor(...colore);
    doc.setCharSpace(0);
  };
  /** Divisore hairline: bianco al 10% di opacità */
  const hairline = (x1: number, y1: number, x2: number, y2: number, o = 0.1) => {
    opacita(o);
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.12);
    doc.line(x1, y1, x2, y2);
    opacita(1);
  };

  const adesso = new Date();
  const due = (v: number) => String(v).padStart(2, '0');
  const docId = `VERO-AUDIT-${adesso.getFullYear()}${due(adesso.getMonth() + 1)}${due(adesso.getDate())}-${due(adesso.getHours())}${due(adesso.getMinutes())}`;
  const dataTxt = adesso.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const dim = data.dimensions;
  const alt = data.alternative;
  const opt = data.opticalConsulting;
  const formato = `${fmt(dim.widthM, dim.widthM % 1 ? 1 : 0)} × ${fmt(dim.heightM, dim.heightM % 1 ? 1 : 0)} m`;
  const selection = alt ? tierName(alt.tier) : null;

  let tavola = 0;
  const tavole: (() => void)[] = [];

  /** Cornice comune: fondo nero, indice di sezione, identità del documento, piede */
  const cornice = (indice: string, etichetta: string, titolo: string, sottotitolo?: string) => {
    if (tavola > 0) doc.addPage();
    tavola += 1;
    doc.setFillColor(0, 0, 0);
    doc.rect(0, 0, W, H, 'F');

    mono(30, BIANCO, 'bold');
    doc.text(indice, M, 28);
    mono(7.5, TITANIO);
    doc.setCharSpace(0.35);
    doc.text(`// ${etichetta}`, M + 24, 21.5);
    doc.setCharSpace(0);
    mono(6.5, TITANIO);
    doc.text(docId, W - M, 21.5, { align: 'right' });
    doc.text(dataTxt, W - M, 26, { align: 'right' });
    hairline(M, 34, W - M, 34);

    // Titolo a una riga: si riduce finché sta nelle 9 colonne
    let corpo = 27;
    sans(corpo, BIANCO, 'bold');
    while (doc.getTextWidth(titolo) > span(10) && corpo > 14) { corpo -= 1; doc.setFontSize(corpo); }
    doc.setCharSpace(-0.25);
    doc.text(titolo, M, 52);
    doc.setCharSpace(0);
    if (sottotitolo) {
      sans(9.5, TITANIO);
      doc.text(doc.splitTextToSize(sottotitolo, span(7)) as string[], M, 60, { lineHeightFactor: 1.45 });
    }
  };
  const piede = (n: number, totale: number) => {
    hairline(M, H - 15, W - M, H - 15);
    mono(6.2, TITANIO);
    doc.setCharSpace(0.25);
    doc.text('VEROLED S.R.L.  ·  VEROLED.IT  ·  INFO@VEROLED.IT', M, H - 9.5);
    doc.setCharSpace(0);
    doc.text(`${due(n)} / ${due(totale)}`, W - M, H - 9.5, { align: 'right' });
  };

  /** Scheda tecnica a griglia: etichetta in monospace, valore esatto sotto, hairline sopra ogni cella */
  const scheda = (voci: [string, string, string?][], x: number, y: number, colonne: number, larghezza: number, passoRiga = 17) => {
    const wCella = (larghezza - (colonne - 1) * GUTTER) / colonne;
    voci.forEach(([etichetta, valore, nota], i) => {
      const cx = x + (i % colonne) * (wCella + GUTTER);
      const cy = y + Math.floor(i / colonne) * passoRiga;
      hairline(cx, cy, cx + wCella, cy);
      mono(6, TITANIO);
      doc.setCharSpace(0.25);
      doc.text(etichetta.toUpperCase(), cx, cy + 4.6);
      doc.setCharSpace(0);
      let corpo = 12.5;
      sans(corpo, BIANCO);
      while (doc.getTextWidth(valore) > wCella && corpo > 8) { corpo -= 0.5; doc.setFontSize(corpo); }
      const righeValore = doc.splitTextToSize(valore, wCella) as string[];
      doc.text(righeValore, cx, cy + 10.6, { lineHeightFactor: 1.15 });
      if (nota) {
        mono(5.6, TITANIO);
        doc.text(doc.splitTextToSize(nota, wCella) as string[], cx, cy + 14.2 + (righeValore.length - 1) * corpo * 0.4);
      }
    });
    return y + Math.ceil(voci.length / colonne) * passoRiga;
  };

  /** Lo schermo che emerge dal buio: alone a strati, superficie luminosa, giunzioni dei cabinet, quote */
  const figuraSchermo = (cx: number, cy: number, maxW: number, maxH: number, luminanza: number, quote = true) => {
    const k = Math.min(maxW / dim.widthM, maxH / dim.heightM);
    const w = dim.widthM * k;
    const h = dim.heightM * k;
    const x = cx - w / 2;
    const y = cy - h / 2;
    for (let i = 18; i >= 1; i--) {
      opacita(0.006 + 0.011 * luminanza);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x - i * 0.9, y - i * 0.9, w + i * 1.8, h + i * 1.8, i * 0.9, i * 0.9, 'F');
    }
    opacita(1);
    const g = Math.round(18 + 237 * Math.max(0, Math.min(1, luminanza)));
    doc.setFillColor(g, g, g);
    doc.rect(x, y, w, h, 'F');
    // giunzioni dei cabinet da 1 m: danno la scala
    opacita(0.22);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.1);
    for (let i = 1; i < Math.round(dim.widthM); i++) doc.line(x + i * k, y, x + i * k, y + h);
    for (let j = 1; j < Math.round(dim.heightM); j++) doc.line(x, y + j * k, x + w, y + j * k);
    opacita(1);
    if (quote) {
      hairline(x, y + h + 5, x + w, y + h + 5, 0.35);
      hairline(x, y + h + 3.5, x, y + h + 6.5, 0.35);
      hairline(x + w, y + h + 3.5, x + w, y + h + 6.5, 0.35);
      mono(6.2, TITANIO);
      doc.text(`${fmt(dim.widthM, dim.widthM % 1 ? 1 : 0)} m`, cx, y + h + 10, { align: 'center' });
      hairline(x - 5, y, x - 5, y + h, 0.35);
      hairline(x - 6.5, y, x - 3.5, y, 0.35);
      hairline(x - 6.5, y + h, x - 3.5, y + h, 0.35);
      doc.text(`${fmt(dim.heightM, dim.heightM % 1 ? 1 : 0)} m`, x - 8, cy, { align: 'right', baseline: 'middle' });
    }
    return { x, y, w, h };
  };

  /** Numero monumentale con unità in monospace */
  const numero = (valore: string, unita: string, x: number, y: number, corpo = 54, colore: RGB = BIANCO) => {
    sans(corpo, colore, 'bold');
    doc.setCharSpace(-0.6);
    doc.text(valore, x, y);
    const w = doc.getTextWidth(valore) - 0.6 * valore.length * 0.3528;
    doc.setCharSpace(0);
    mono(8, TITANIO);
    doc.text(unita, x + w + 3, y);
  };

  /** Barra orizzontale sottile: confronto di grandezze senza decorazione */
  const barra = (x: number, y: number, larghezza: number, quota: number, colore: RGB) => {
    hairline(x, y, x + larghezza, y, 0.18);
    doc.setFillColor(...colore);
    doc.rect(x, y - 0.6, Math.max(0.6, larghezza * Math.max(0, Math.min(1, quota))), 1.2, 'F');
  };

  // ───────────────────────── 00 · COPERTINA ─────────────────────────
  tavole.push(() => {
    tavola += 1;
    doc.setFillColor(0, 0, 0);
    doc.rect(0, 0, W, H, 'F');
    doc.addImage(VEROLED_LOGO_PNG_BASE64, 'PNG', M, M, 45, 12);
    mono(6.5, TITANIO);
    doc.text(docId, W - M, 21.5, { align: 'right' });
    doc.text(dataTxt, W - M, 26, { align: 'right' });

    figuraSchermo(colX(6) + span(6) / 2, 92, span(6) - 24, 92, 0.92, true);

    mono(7.5, TITANIO);
    doc.setCharSpace(0.35);
    doc.text('00 // ENERGY AUDIT', M, 128);
    doc.setCharSpace(0);
    sans(40, BIANCO, 'bold');
    doc.setCharSpace(-0.5);
    doc.text('Luce, misurata.', M, 146);
    doc.setCharSpace(0);
    sans(10, TITANIO);
    doc.text(doc.splitTextToSize(`Audit energetico di uno strumento di luce da ${formato}: potenza, energia e costo di esercizio calcolati sul contenuto reale e sulle ore dichiarate.`, span(5)) as string[], M, 156, { lineHeightFactor: 1.45 });

    const committente = [data.userCompany, data.userName].filter(Boolean).join(' · ');
    scheda(
      [
        ['Formato', formato],
        ['Superficie', `${fmt(dim.areaM2, dim.areaM2 % 1 ? 1 : 0)} m²`],
        ['Passo', `P${dim.pitchMm} mm${selection ? ` · ${selection}` : ''}`],
        ...(committente ? ([['Committente', committente]] as [string, string][]) : []),
      ],
      M, 176, committente ? 4 : 3, span(committente ? 8 : 6), 16
    );
  });

  // ───────────────────────── 01 · LO STRUMENTO ─────────────────────────
  tavole.push(() => {
    cornice('01', 'LO STRUMENTO', `${fmt(dim.areaM2, dim.areaM2 % 1 ? 1 : 0)} metri quadrati di luce.`, 'La superficie emissiva, la sua risoluzione nativa e il componente che la genera. Ogni valore è quello di listino della combinazione Selection e passo.');
    figuraSchermo(colX(7) + span(5) / 2, 112, span(5) - 22, 78, 0.85, true);
    const hw = alt?.current.hardware;
    scheda(
      [
        ['Formato', formato],
        ['Superficie emissiva', `${fmt(dim.areaM2, dim.areaM2 % 1 ? 1 : 0)} m²`],
        ['Passo pixel', `P${dim.pitchMm} mm`],
        ['Selection', selection ?? 'non indicata'],
        ['Risoluzione nativa', `${fmt(dim.resolutionX)} × ${fmt(dim.resolutionY)} px`, `${fmt((dim.resolutionX * dim.resolutionY) / 1000)} kpx totali`],
        ['Densità', `${fmt(Math.round(Math.pow(1000 / dim.pitchMm, 2)))} px/m²`],
        ['Luminanza di listino', alt && alt.currentMaxNits !== null ? `${fmt(alt.currentMaxNits)} nit` : 'non censita', alt ? `richiesti ${fmt(alt.current.nits)} nit` : undefined],
        ['Chip LED', hw && hw.tettoNoto ? hw.tecnologiaChip : 'non censito'],
        ['Composizione', `${dim.totalCabinets} cabinet`, dim.formatName ?? undefined],
        ['Massa stimata', `${fmt(dim.weightKg)} kg`],
        ['Potenza di picco', alt ? `${fmt(alt.current.pMaxWmq)} W/m²` : 'n.d.', 'bianco pieno alla luminanza richiesta'],
        ['Sforzo dei chip', hw && hw.tettoNoto ? `${hw.sforzoPercent}%` : 'non dichiarabile', 'quota del tetto di listino'],
      ],
      M, 74, 3, span(7) - GUTTER, 19
    );
  });

  // ───────────────────────── 02 · IL CONTENUTO ─────────────────────────
  tavole.push(() => {
    cornice('02', 'IL CONTENUTO', 'Il contenuto decide il consumo.', 'Un LEDwall emette luce propria: un pixel nero è un diodo spento. La luminosità media dell\'immagine (APL) pesa più di ogni altra scelta sulla bolletta.');
    const apl = data.aplPercent / 100;
    figuraSchermo(colX(7) + span(5) / 2, 108, span(5) - 22, 70, apl, false);
    mono(6.2, TITANIO);
    doc.text(`SUPERFICIE AL ${fmt(data.aplPercent, 1)}% DI LUMINOSITÀ MEDIA`, colX(7) + span(5) / 2, 154, { align: 'center' });

    numero(fmt(data.aplPercent, 1), '% APL', M, 100, 58);
    // scala 0-100 con la posizione del contenuto
    const sx = M, sy = 116, sw = span(6);
    barra(sx, sy, sw, apl, CIANO);
    mono(5.8, TITANIO);
    [0, 25, 50, 75, 100].forEach((t) => { hairline(sx + (sw * t) / 100, sy - 2, sx + (sw * t) / 100, sy + 2, 0.3); doc.text(String(t), sx + (sw * t) / 100, sy + 6.5, { align: 'center' }); });
    doc.text('NERO', sx, sy - 4.5);
    doc.text('BIANCO PIENO', sx + sw, sy - 4.5, { align: 'right' });

    scheda(
      [
        ['Potenza in esercizio', `${fmt(data.profile.dayPowerWmq * dim.areaM2)} W`, `${fmt(data.profile.dayPowerWmq)} W/m² con questo contenuto`],
        ['Ciclo operativo', `${data.profile.dayHours} h + ${data.profile.nightHours} h`, 'piena luminosità + regime notturno'],
        ['Tariffa energia', `${fmt(data.tariffaEurKwh, 2)} €/kWh`],
      ],
      M, 140, 3, span(6), 20
    );
  });

  // ───────────────────────── 03 · IL CONSUMO ─────────────────────────
  tavole.push(() => {
    cornice('03', 'IL CONSUMO', 'Energia, misurata su un anno.', 'Costo di esercizio dello strumento con il contenuto e le ore dichiarate. Sola energia attiva: l\'eventuale energia reattiva della fornitura non è inclusa.');
    numero(fmt(Math.round(data.profile.annualCostEur)), 'EURO / ANNO', M, 112, 64);
    scheda(
      [
        ['Energia annua', `${fmt(data.profile.annualKwh)} kWh`],
        ['Energia al giorno', `${fmt(data.profile.totalDailyKwh, 1)} kWh`, `${fmt(data.profile.dayKwh, 1)} diurni + ${fmt(data.profile.nightKwh, 1)} notturni`],
        ['Costo al mese', eur(data.profile.monthlyCostEur)],
        ['Costo al giorno', `€ ${fmt(data.profile.dailyCostEur, 2)}`],
        ['Regime diurno', `${fmt(data.profile.dayPowerWmq)} W/m²`, `${data.profile.dayHours} ore`],
        ['Regime notturno', `${fmt(data.profile.nightPowerWmq)} W/m²`, `${data.profile.nightHours} ore`],
        ['Emissioni', `${fmt((data.profile.annualKwh * 0.305) / 1000, 2)} t CO2`, '0,305 kg CO2 per kWh, rete italiana'],
        ['Tariffa', `${fmt(data.tariffaEurKwh, 2)} €/kWh`],
      ],
      M, 132, 4, span(12), 20
    );
  });

  // ───────────────────────── 04 · LA GESTIONE ─────────────────────────
  tavole.push(() => {
    const sc = data.scenario;
    cornice('04', 'LA GESTIONE', 'La gestione come strumento.', 'Lo stesso impianto in due regimi: luminosità fissa giorno e notte, oppure governata da Fleet Monitor con sensore di luce, dimming notturno e distacco a schermo spento. Valori stimati dal modello.');
    const bx = M, bw = span(7);
    const maxKwh = Math.max(sc.annualKwhA, sc.annualKwhB, 1);
    mono(6.2, TITANIO);
    doc.text('A · NON GESTITO', bx, 84);
    sans(15, BIANCO);
    doc.text(`${fmt(sc.annualKwhA)} kWh   ${eur(sc.annualCostEurA)}`, bx, 92);
    barra(bx, 97, bw, sc.annualKwhA / maxKwh, BIANCO);
    mono(6.2, CIANO);
    doc.text('B · FLEET MONITOR', bx, 110);
    sans(15, BIANCO);
    doc.text(`${fmt(sc.annualKwhB)} kWh   ${eur(sc.annualCostEurB)}`, bx, 118);
    barra(bx, 123, bw, sc.annualKwhB / maxKwh, CIANO);

    mono(6.2, TITANIO);
    doc.text('RISPARMIO STIMATO', colX(8), 84);
    numero(`${fmt(sc.savingsPercent, 1)}`, '%', colX(8), 104, 44, CIANO);
    sans(11, BIANCO);
    doc.text(`${eur(sc.savingsEur)} all'anno`, colX(8), 114);
    mono(5.8, TITANIO);
    doc.text(doc.splitTextToSize('Rispetto al regime A, non alla bolletta della tavola 03, che applica già il dimming notturno.', span(4)) as string[], colX(8), 120);

    const voci: [string, number, string][] = [
      ['Sensore di luce e dimming adattivo', sc.breakdown.adaptiveLuxEur, 'la luminanza diurna segue l\'ambiente'],
      ['Dimming notturno', sc.breakdown.nightDimmingEur, 'regime serale conforme ai limiti di luminanza'],
      ['Distacco a schermo spento', sc.breakdown.standbyZeroEur, 'azzera l\'assorbimento dell\'elettronica'],
    ];
    const totale = Math.max(1, voci.reduce((a, v) => a + v[1], 0));
    voci.forEach(([nome, valore, nota], i) => {
      const y = 142 + i * 13;
      hairline(M, y - 5, W - M, y - 5);
      mono(6.2, TITANIO);
      doc.text(`0${i + 1}`, M, y);
      sans(10, BIANCO);
      doc.text(nome, colX(1), y);
      mono(5.8, TITANIO);
      doc.text(nota, colX(1), y + 4);
      barra(colX(6), y - 1, span(4), valore / totale, CIANO);
      sans(10, BIANCO);
      doc.text(eur(valore), W - M, y, { align: 'right' });
    });
  });

  // ───────────────────────── 05 · LA GEOMETRIA ─────────────────────────
  if (opt) {
    tavole.push(() => {
      cornice('05', 'LA GEOMETRIA', 'La distanza definisce il passo.', 'La linea di vista si misura dall\'occhio al centro della superficie. A quella distanza l\'occhio separa due diodi solo oltre un arcminuto: è la soglia che fissa il passo utile.');
      // figura: osservatore a terra, schermo in quota, ipotenusa tratteggiata
      const fx = colX(6), fw = span(6), terra = 150;
      const cima = opt.installHeightM + opt.screenHeightM;
      const sy = 62 / Math.max(cima, 12);
      const xOss = fx + 8, xSch = fx + fw - 34;
      const yBase = terra - opt.installHeightM * sy;
      const yCima = Math.min(yBase - 5, terra - cima * sy);
      const yCentro = (yBase + yCima) / 2;
      hairline(fx, terra, fx + fw, terra, 0.3);
      doc.setFillColor(255, 255, 255);
      doc.circle(xOss, terra - 11, 1.1, 'F');
      hairline(xOss, terra - 9.8, xOss, terra, 0.9);
      if (opt.installHeightM > 0) hairline(xSch, yBase, xSch, terra, 0.35);
      for (let i = 6; i >= 1; i--) { opacita(0.03); doc.setFillColor(255, 255, 255); doc.rect(xSch - 1.2 - i, yCima - i, 2.4 + 2 * i, yBase - yCima + 2 * i, 'F'); }
      opacita(1);
      doc.setFillColor(255, 255, 255);
      doc.rect(xSch - 1.2, yCima, 2.4, yBase - yCima, 'F');
      doc.setDrawColor(...CIANO);
      doc.setLineWidth(0.25);
      doc.setLineDashPattern([1.6, 1.4], 0);
      doc.line(xOss + 1.5, terra - 11, xSch - 2, yCentro);
      doc.setLineDashPattern([], 0);
      mono(7.5, CIANO, 'bold');
      doc.text(`${fmt(opt.lineOfSightDistM, 1)} m`, (xOss + xSch) / 2, (terra - 11 + yCentro) / 2 - 3, { align: 'center' });
      mono(5.8, TITANIO);
      doc.text(`CIMA ${fmt(cima, 1)} m`, xSch + 5, Math.min(yCima + 1.5, yCentro - 5));
      doc.setTextColor(...BIANCO);
      doc.text(`CENTRO ${fmt(opt.centerHeightM, 1)} m`, xSch + 5, yCentro + 1);
      doc.setTextColor(...TITANIO);
      doc.text(`BASE ${fmt(opt.installHeightM, 1)} m`, xSch + 5, Math.max(yBase + 1.5, yCentro + 7));
      hairline(xOss, terra + 5, xSch, terra + 5, 0.35);
      doc.text(`${fmt(opt.groundViewingDistM, 1)} m A TERRA`, (xOss + xSch) / 2, terra + 10, { align: 'center' });

      const oltre = opt.recommendedToThresholdRatio > 1.05;
      scheda(
        [
          ['Linea di vista', `${fmt(opt.lineOfSightDistM, 1)} m`, `${fmt(opt.lineOfSightBaseM, 1)} m alla base · ${fmt(opt.lineOfSightTopM, 1)} m in cima`],
          ['Soglia di fusione', `${fmt(opt.minResolvablePitchMm, 2)} mm`, '1 arcminuto = 0,000291 rad'],
          ['Passo di riferimento', `P${opt.recommendedPitchMm} mm`, oltre ? `${fmt(opt.recommendedToThresholdRatio, 2)} volte la soglia: tolleranza commerciale` : 'entro la soglia di fusione'],
          ['Passo scelto', `P${opt.clientPitchMm} mm`, opt.isClientPitchTooCoarse ? 'troppo largo: la trama si vede' : opt.isClientPitchOverkill ? 'più fitto del necessario' : 'coerente con la distanza'],
        ],
        M, 78, 2, span(5), 22
      );
      if (oltre) {
        mono(5.8, TITANIO);
        doc.text(doc.splitTextToSize('Il passo di riferimento è il passo commerciale outdoor per questa fascia di distanza. Supera la soglia teorica: è una tolleranza dichiarata, non la fusione completa dei pixel.', span(5)) as string[], M, 130, { lineHeightFactor: 1.5 });
      }
    });
  }

  // ───────────────────────── 06 · IL VERDETTO ─────────────────────────
  if (alt) {
    tavole.push(() => {
      const T = tierName(alt.tier);
      const A = alt.current;
      const B = alt.proposed;
      const stessa = Math.abs(A.pitchMm - B.pitchMm) < 0.05;
      const accento: RGB = alt.currentIsValid ? CIANO : AMBRA;
      const esito: Record<AlternativeProposal['kind'], string> = {
        pitch: 'Un passo più largo rende uguale e consuma meno.',
        coarse: 'Il passo è troppo largo per la distanza.',
        brightness: 'La luminanza richiesta non è raggiungibile.',
        compromise: 'Nessun passo soddisfa entrambi i requisiti.',
        nodata: 'Il tetto di luminanza non è ancora censito.',
        fleet: 'Il passo è giusto.',
        none: 'Configurazione bilanciata.',
      };
      cornice('06', 'IL VERDETTO', esito[alt.kind]);
      doc.setFillColor(...accento);
      doc.rect(M, 58, 22, 0.6, 'F');

      // testo del verdetto: lo stesso che il cliente legge nel Calcolo Express
      sans(10.5, BIANCO);
      const titolo = doc.splitTextToSize(pdfSafe(alt.headline), span(stessa ? 12 : 5)) as string[];
      doc.text(titolo, M, 70, { lineHeightFactor: 1.45 });
      let y = 70 + titolo.length * 5.4 + 4;
      alt.reasons.forEach((r, i) => {
        const righe = doc.splitTextToSize(pdfSafe(r), span(stessa ? 11 : 5) - 8) as string[];
        hairline(M, y - 4.2, M + span(stessa ? 12 : 5), y - 4.2);
        mono(6, TITANIO);
        doc.text(`0${i + 1}`, M, y);
        sans(8.6, TITANIO);
        doc.text(righe, M + 8, y, { lineHeightFactor: 1.45 });
        y += righe.length * 4.4 + 4.5;
      });

      const cA = alt.canoneCurrent;
      const cB = alt.canoneProposed;
      const delta = (aMenoB: number, unita = '') => (aMenoB === 0 ? 'nessuna differenza' : `B costa ${eur(Math.abs(aMenoB))}${unita} in ${aMenoB > 0 ? 'meno' : 'più'}`);
      if (stessa) {
        // la proposta coincide con la scelta: una sola scheda, niente colonne vuote
        scheda(
          [
            ['Combinazione', `P${A.pitchMm} mm · ${T}`],
            ['Tetto di luminanza', alt.currentMaxNits !== null ? `${fmt(alt.currentMaxNits)} nit` : 'non censito', `richiesti ${fmt(A.nits)} nit`],
            ['Canone noleggio 24 mesi', cA ? `${eur(cA.rataMensileEur)} al mese` : 'prezzo non a listino', cA ? `${eur(cA.rataMensileEur * 24)} in totale · istruttoria ${eur(cA.istruttoriaEur)} esclusa` : undefined],
            ['Energia 24 mesi', eur(A.annualCostEur * 2)],
            ['Con Fleet Monitor', `${eur(alt.fleetMonitorCostEur)} all'anno`, `-${alt.fleetMonitorExtraPercent}% sulla bolletta di ${eur(B.annualCostEur)}`],
            ['Totale 24 mesi', cA ? eur(cA.rataMensileEur * 24 + A.annualCostEur * 2) : 'non calcolabile', 'noleggio + energia'],
          ],
          M, Math.max(y + 6, 122), 3, span(12), 21
        );
      } else {
        // confronto A / B, con le differenze dette in chiaro e con il verso giusto
        const tx = colX(6), tw = span(6);
        const c = [tx, tx + tw * 0.34, tx + tw * 0.56, tx + tw * 0.78];
        mono(6, TITANIO);
        doc.setCharSpace(0.25);
        doc.text('VOCE', c[0], 70);
        doc.text('A · SCELTA', c[1], 70);
        doc.setTextColor(...CIANO);
        doc.text(alt.kind === 'compromise' ? 'B · COMPROMESSO' : 'B · PROPOSTA', c[2], 70);
        doc.setCharSpace(0);
        const righe: [string, string, string, string][] = [
          ['Passo · Selection', `P${A.pitchMm} ${T}`, `P${B.pitchMm} ${T}`, ''],
          ['Tetto di luminanza', alt.currentMaxNits !== null ? `${fmt(alt.currentMaxNits)} nit` : 'non censito', B.hardware.tettoNoto ? `${fmt(B.hardware.maxPhysicalNits)} nit` : 'non censito', `richiesti ${fmt(A.nits)}`],
          ['Sforzo dei chip', alt.currentMaxNits !== null ? `${A.hardware.sforzoPercent}%` : 'n.d.', B.hardware.tettoNoto ? `${B.hardware.sforzoPercent}%` : 'n.d.', ''],
          ['Canone al mese', cA ? eur(cA.rataMensileEur) : 'non a listino', cB ? eur(cB.rataMensileEur) : 'non a listino', cA && cB ? delta(cA.rataMensileEur - cB.rataMensileEur) : ''],
          ['Canone 24 mesi', cA ? eur(cA.rataMensileEur * 24) : 'non a listino', cB ? eur(cB.rataMensileEur * 24) : 'non a listino', cA && cB ? delta((cA.rataMensileEur - cB.rataMensileEur) * 24) : ''],
          ['Energia 24 mesi', eur(A.annualCostEur * 2), eur(B.annualCostEur * 2), delta(A.annualCostEur * 2 - B.annualCostEur * 2)],
          ['Totale 24 mesi', cA ? eur(cA.rataMensileEur * 24 + A.annualCostEur * 2) : 'n.c.', cB ? eur(cB.rataMensileEur * 24 + B.annualCostEur * 2) : 'n.c.', cA && cB ? delta(cA.rataMensileEur * 24 + A.annualCostEur * 2 - (cB.rataMensileEur * 24 + B.annualCostEur * 2)) : ''],
        ];
        righe.forEach(([voce, a, b, d], i) => {
          const ry = 80 + i * 12.5;
          hairline(tx, ry - 5.5, tx + tw, ry - 5.5);
          mono(6, TITANIO);
          doc.text(voce.toUpperCase(), c[0], ry);
          sans(9.5, BIANCO, i === righe.length - 1 ? 'bold' : 'normal');
          doc.text(a, c[1], ry);
          doc.text(b, c[2], ry);
          if (d) { mono(5.6, accento); doc.text(doc.splitTextToSize(d, tw * 0.22) as string[], c[3], ry - 1.2); }
        });
        mono(5.6, TITANIO);
        doc.text(doc.splitTextToSize('Canoni: noleggio operativo a 24 mesi con le regole di veroledsrl.com/noleggio-operativo (listino + posa, coefficiente del broker, assicurazione). Istruttoria, struttura, processore video e quadro esclusi.', tw) as string[], tx, 172, { lineHeightFactor: 1.5 });
      }
    });
  }

  tavole.forEach((disegna, i) => { disegna(); piede(i + 1, tavole.length); });
  return doc;
}
