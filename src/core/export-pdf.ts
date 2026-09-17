/**
 * Generatore Report Audit Energetico (PDF)
 * Utilizza jsPDF e jspdf-autotable per creare un documento vettoriale ad alta risoluzione
 * Include il logo ufficiale VeroLED e le specifiche ingegneristiche certificate.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ScreenDimensions, ScenarioResult, DailyEnergyProfile, PowerQualityAnalysis, OpticalConsultingResult, AlternativeProposal, tierName } from './physics';
import { VEROLED_LOGO_PNG_BASE64 } from '../assets/logo-base64';

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

function formatItalianNumber(num: number): string {
  return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function generaReportPdf(data: ReportData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 18;

  // 1. Header Brand VeroLED Luxury Engineering
  doc.setFillColor(7, 9, 14); // Deep Obsidian Black
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Accent Lines (Neon Cyan + Emerald)
  doc.setDrawColor(0, 240, 255);
  doc.setLineWidth(0.8);
  doc.line(0, 42, pageWidth, 42);

  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.3);
  doc.line(0, 42.8, pageWidth, 42.8);

  // Logo Ufficiale VeroLED (1400x373, Aspect Ratio ~3.75)
  // Posizionato a x=16, y=7, w=48mm, h=12.8mm per massima nitidezza vettoriale
  doc.addImage(VEROLED_LOGO_PNG_BASE64, 'PNG', 16, 7, 48, 12.8);

  // Sottotitolo e Metadata Header a Sinistra
  doc.setTextColor(0, 240, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('ENERGY AUDIT REPORT · SCHEDA TECNICA DOOH & CEI 64-8', 16, 27);

  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.text('Simulazione Energetica & Fotometrica Dinamica · Algoritmo APL & Lux', 16, 33);

  // Badge Certificazione e Riferimento a Destra
  doc.setFillColor(15, 23, 42);
  doc.setDrawColor(0, 240, 255);
  doc.setLineWidth(0.4);
  doc.roundedRect(pageWidth - 76, 7, 60, 6.5, 1.5, 1.5, 'FD');

  doc.setTextColor(0, 240, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.text('FLEET MONITOR PRO · CEI 64-8', pageWidth - 46, 11.5, { align: 'center' });

  doc.setTextColor(226, 232, 240);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  const adesso = new Date();
  const due = (v: number) => String(v).padStart(2, '0');
  const docId = `VERO-AUDIT-${adesso.getFullYear()}${due(adesso.getMonth() + 1)}${due(adesso.getDate())}-${due(adesso.getHours())}${due(adesso.getMinutes())}`;
  doc.text(`Doc. ID: ${docId}`, pageWidth - 16, 18.5, { align: 'right' });

  const dataString = new Date().toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Data elaborazione: ${dataString}`, pageWidth - 16, 23.5, { align: 'right' });
  doc.text('Normative: CEI 64-8 · ITU-R BT.709', pageWidth - 16, 28.5, { align: 'right' });
  doc.text('Validazione: Ingegneria VeroLED S.r.l.', pageWidth - 16, 33.5, { align: 'right' });

  // 2. Intestazione Committente / Destinatario (se forniti)
  y = 48;
  if (data.userCompany || data.userName) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(16, y, pageWidth - 32, 9.5, 1.5, 1.5, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    const committenteStr = `COMMITTENTE: ${data.userName || ''} ${data.userCompany ? `(${data.userCompany})` : ''}`.trim();
    doc.text(committenteStr, 20, y + 6);

    if (data.userEmail) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Ref. Contatto: ${data.userEmail}`, pageWidth - 20, y + 6, { align: 'right' });
    }
    y += 13.5;
  }

  // 3. Sezione 1: Specifiche Tecniche Impianto (Terminologia esatta Cabinet)
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('1. Specifiche Tecniche dell\'Impianto LEDwall Outdoor', 16, y);
  y += 3.5;

  const numCabinets = data.dimensions.totalCabinets;
  const cols = data.dimensions.modulesW ?? Math.round(data.dimensions.widthM / 1.0);
  const rows = data.dimensions.modulesH ?? Math.round(data.dimensions.heightM / 1.0);
  const formatText = data.dimensions.formatName || 'Cabinet 1000 × 1000 mm';
  const weightPerCab = Math.round(data.dimensions.weightKg / (numCabinets || 1));

  const specsData = [
    ['Dimensioni Esterne (L × A)', `${data.dimensions.widthM.toFixed(2)} × ${data.dimensions.heightM.toFixed(2)} m`],
    ['Superficie Totale', `${data.dimensions.areaM2.toFixed(2)} m²`],
    ['Composizione Cabinet', `${numCabinets} cabinet (${cols} col. × ${rows} righe)`],
    ['Formato Singolo Cabinet', formatText],
    ['Passo Pixel (Pixel Pitch)', `P${data.dimensions.pitchMm} mm`],
    ['Risoluzione Nativa Display', `${formatItalianNumber(data.dimensions.resolutionX)} × ${formatItalianNumber(data.dimensions.resolutionY)} pixel (${formatItalianNumber(Math.round((data.dimensions.resolutionX * data.dimensions.resolutionY) / 1000))} kpx totali)`],
    ['Peso Struttura Stimato', `~${formatItalianNumber(data.dimensions.weightKg)} kg (~${weightPerCab} kg/cabinet)`],
    ['APL Medio Palinsesto (Densità Bianco)', `${data.aplPercent}% (Average Picture Level ponderato)`],
    ['Ciclo Operativo Giornaliero', `${data.profile.dayHours} ore diurne (Sole/Ombra) + ${data.profile.nightHours} ore notturne (Dimmed)`],
    ['Tariffa Elettrica di Riferimento', `${data.tariffaEurKwh.toFixed(2)} €/kWh (Costo medio energia B2B)`],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Parametro Tecnico Impianto', 'Valore Rilevato / Parametrizzato']],
    body: specsData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [0, 240, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 1.6,
    },
    columnStyles: {
      0: { cellWidth: 70, fontStyle: 'bold', textColor: [51, 65, 85] },
      1: { textColor: [15, 23, 42] },
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 1.5,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    margin: { left: 16, right: 16 },
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // 4. Sezione 2: Benchmark Comparativo Scenari
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('2. Benchmark Economico-Energetico Annuale (Scenario A vs Scenario B)', 16, y);
  y += 3.5;

  const benchmarkData = [
    [
      'Consumo Elettrico Annuo (kWh)',
      `${formatItalianNumber(data.scenario.annualKwhA)} kWh`,
      `${formatItalianNumber(data.scenario.annualKwhB)} kWh`,
      `-${formatItalianNumber(data.scenario.savingsKwh)} kWh (-${data.scenario.savingsPercent.toFixed(1)}%)`,
    ],
    [
      'Costo Annuo Energia Elettrica (€)',
      `${formatItalianNumber(data.scenario.annualCostEurA)} €`,
      `${formatItalianNumber(data.scenario.annualCostEurB)} €`,
      `-${formatItalianNumber(data.scenario.savingsEur)} €/anno`,
    ],
    [
      'Costo Mensile Medio Elettricità (€)',
      `${formatItalianNumber(data.scenario.annualCostEurA / 12)} €`,
      `${formatItalianNumber(data.scenario.annualCostEurB / 12)} €`,
      `-${formatItalianNumber(data.scenario.savingsEur / 12)} €/mese`,
    ],
    [
      'Emissioni CO2 Annuali Evitate (t)',
      `${(data.scenario.annualKwhA * 0.000305).toFixed(1)} ton CO2`,
      `${(data.scenario.annualKwhB * 0.000305).toFixed(1)} ton CO2`,
      `-${data.scenario.co2SavedTons.toFixed(1)} ton CO2 abbattute`,
    ],
    [
      'Fattore di Potenza Rete (PF / cos phi)',
      data.powerQuality ? `~${data.powerQuality.powerFactorA.toFixed(2)} (sfasamento)` : '~0.52 (sfasamento)',
      data.powerQuality ? `${data.powerQuality.powerFactorB.toFixed(2)} (Interleaved/SVG)` : '0.98 (Interleaved/SVG)',
      'PF >= 0.95 garantito h24',
    ],
    [
      'Penali ARERA Reattiva (Del. 232/22)',
      data.powerQuality && data.powerQuality.penaleAreraEurAnnoA > 0 ? `A rischio (~${formatItalianNumber(data.powerQuality.penaleAreraEurAnnoA)} €/a)` : 'A rischio (> 1.800 €/a)',
      '0 €/anno (Completamente azzerate)',
      'Zero penali reattiva',
    ],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Indicatore di Performance Economica', 'Scenario A (Non Gestito)', 'Scenario B (Fleet Monitor)', 'Risparmio Diretto Certificato']],
    body: benchmarkData,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 1.8,
    },
    columnStyles: {
      0: { cellWidth: 58, fontStyle: 'bold', textColor: [51, 65, 85] },
      1: { cellWidth: 40, halign: 'right', textColor: [100, 116, 139] },
      2: { cellWidth: 40, halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] },
      3: { halign: 'right', fontStyle: 'bold', textColor: [16, 185, 129] },
    },
    styles: {
      fontSize: 7.6,
      cellPadding: 1.6,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 16, right: 16 },
  });

  y = (doc as any).lastAutoTable.finalY + 5;

  // Box Risparmio Evidenziato Premium
  doc.setFillColor(236, 253, 245); // Emerald 50
  doc.setDrawColor(16, 185, 129); // Emerald 500
  doc.setLineWidth(0.6);
  doc.roundedRect(16, y, pageWidth - 32, 15, 2, 2, 'FD');

  // Barra di accento verticale verde smeraldo a sinistra
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(16, y, 3, 15, 1, 1, 'F');

  doc.setTextColor(6, 95, 70); // Emerald 800
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(
    `RISPARMIO CERTIFICATO: ${formatItalianNumber(data.scenario.savingsEur)} €/ANNO  (-${data.scenario.savingsPercent.toFixed(1)}% DI RIDUZIONE BOLLETTA)`,
    23,
    y + 6
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text(
    `L'ottimizzazione fotometrica e lo standby zero ammortizzano l'investimento hardware in 12-16 mesi, incrementando del 40% la vita utile dei LED.`,
    23,
    y + 11
  );

  y += 20;

  // 5. Sezione 3: Breakdown Ingegneristico del Risparmio
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('3. Da dove nasce il Risparmio Annuale (Breakdown Ingegneristico)', 16, y);
  y += 3.5;

  const breakdownRows = [
    [
      '1. Dimming Notturno Automatico (10% max)',
      `${formatItalianNumber(data.scenario.breakdown.nightDimmingEur)} €`,
      `${data.scenario.savingsEur > 0 ? ((data.scenario.breakdown.nightDimmingEur / data.scenario.savingsEur) * 100).toFixed(1) : '0'}%`,
      'Evita l\'abbagliamento notturno e rispetta le leggi anti-inquinamento luminoso CEI, riducendo i consumi serali fino all\'80%.',
    ],
    [
      '2. Sensore Lux & Dimming Adattivo APL',
      `${formatItalianNumber(data.scenario.breakdown.adaptiveLuxEur)} €`,
      `${data.scenario.savingsEur > 0 ? ((data.scenario.breakdown.adaptiveLuxEur / data.scenario.savingsEur) * 100).toFixed(1) : '0'}%`,
      'Regola i nit in tempo reale secondo l\'illuminamento solare effettivo e la percentuale di bianco dello spot video (algoritmo APL).',
    ],
    [
      '3. Standby Zero (Disconnessione Bistabile)',
      `${formatItalianNumber(data.scenario.breakdown.standbyZeroEur)} €`,
      `${data.scenario.savingsEur > 0 ? ((data.scenario.breakdown.standbyZeroEur / data.scenario.savingsEur) * 100).toFixed(1) : '0'}%`,
      'Disconnette fisicamente i moduli a display spento, azzerando le perdite di magnetizzazione dei trasformatori (50 W/m²).',
    ],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Funzione Ottimizzata', 'Risparmio Annuo', 'Incidenza', 'Descrizione Beneficio Tecnologico']],
    body: breakdownRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 1.6,
    },
    columnStyles: {
      0: { cellWidth: 54, fontStyle: 'bold', textColor: [15, 23, 42] },
      1: { cellWidth: 26, halign: 'right', fontStyle: 'bold', textColor: [16, 185, 129] },
      2: { cellWidth: 16, halign: 'center', fontStyle: 'bold', textColor: [0, 160, 200] },
      3: { textColor: [71, 85, 105], fontSize: 6.8 },
    },
    styles: {
      fontSize: 7.2,
      cellPadding: 1.5,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    margin: { left: 16, right: 16 },
  });

  y = (doc as any).lastAutoTable.finalY + 5;

  // 6. Box Conformità Normativa & Standard CEI
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(16, y, pageWidth - 32, 16.5, 1.5, 1.5, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('CONFORMITÀ NORMATIVA & AFFIDABILITÀ IMPIANTO VEROLED', 20, y + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    '• Norma CEI 64-8 sez. 714: Protezione contro le sovratensioni, differenziali tipo B e correttezza termica dei quadri.',
    20,
    y + 9
  );
  doc.text(
    '• Norma UNI EN 12464-2 & ITU-R BT.709: Limiti di luminanza notturna anti-abbagliamento e calibrazione fotometrica D65.',
    20,
    y + 13
  );

  // 7. Footer Disclaimer & Firma Ufficiale (No collisioni)
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(16, 276, pageWidth - 16, 276);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Nota di riservatezza: Il presente documento e le stime energetiche elaborate costituiscono proprietà intellettuale di VeroLED S.r.l. Valori conformi ai modelli CEI 64-8 e ITU-R BT.709.',
    16,
    280.5
  );

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text(
    'VeroLED S.r.l. · Tecnologie Display LED Professionali · veroled.it · info@veroled.it',
    16,
    285
  );

  const totalPages = data.opticalConsulting ? 2 : 1;
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Fleet Monitor PRO · Audit Energetico Ufficiale · Pagina 1 di ${totalPages}`,
    pageWidth - 16,
    285,
    { align: 'right' }
  );

  // Se presente la consulenza ottica (Confronto Passo Cliente vs Sistema), genera la Pagina 2
  if (data.opticalConsulting) {
    const opt = data.opticalConsulting;
    doc.addPage();
    let y2 = 18;

    // Header Pagina 2
    doc.setFillColor(7, 9, 14);
    doc.rect(0, 0, pageWidth, 42, 'F');

    doc.setDrawColor(0, 240, 255);
    doc.setLineWidth(0.8);
    doc.line(0, 42, pageWidth, 42);

    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(0.3);
    doc.line(0, 42.8, pageWidth, 42.8);

    doc.addImage(VEROLED_LOGO_PNG_BASE64, 'PNG', 16, 7, 48, 12.8);

    doc.setTextColor(0, 240, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('ALLEGATO TECNICO · STUDIO OTTICO & ANALISI TCO 24 MESI', 16, 27);

    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.text('Criterio di Acuità Visiva Snellen (1 Arcminuto) · Valutazione Offerta RFP DOOH', 16, 33);

    doc.setFillColor(15, 23, 42);
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(0.4);
    doc.roundedRect(pageWidth - 76, 7, 60, 6.5, 1.5, 1.5, 'FD');

    doc.setTextColor(16, 185, 129);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.text('CONSULENZA INGEGNERISTICA VEROLED', pageWidth - 46, 11.5, { align: 'center' });

    doc.setTextColor(226, 232, 240);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('Allegato: VERO-OPTICAL-2026', pageWidth - 16, 18.5, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Data elaborazione: ${dataString}`, pageWidth - 16, 23.5, { align: 'right' });
    doc.text('Modello: Criterio Snellen / 1 arcmin', pageWidth - 16, 28.5, { align: 'right' });
    doc.text('Applicazione: Locazione Operativa 24 Mesi', pageWidth - 16, 33.5, { align: 'right' });

    y2 = 48;

    // Sezione 1: Geometria di Installazione e Fisica della Visione
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('1. Geometria del Sito & Risoluzione Limite dell\'Occhio Umano', 16, y2);
    y2 += 4;

    const alt = data.alternative;
    const it1 = (v: number) => v.toLocaleString('it-IT', { maximumFractionDigits: 1 });
    const it2 = (v: number) => v.toLocaleString('it-IT', { maximumFractionDigits: 2 });
    // Simbolo davanti all'importo: nel font standard lo spazio dopo il glifo dell'euro si perde ("3.024 €in più")
    const eur = (v: number) => `€ ${formatItalianNumber(v)}`;
    const eurTxt = (v: number) => eur(Math.abs(v));
    /** Differenza A − B detta in chiaro e con il verso giusto: mai un "+0" che nasconde un costo in più */
    const deltaTxt = (aMenoB: number, unita = '') =>
      aMenoB === 0
        ? 'Nessuna differenza'
        : aMenoB > 0
        ? `Display B costa ${eurTxt(aMenoB)}${unita} in meno`
        : `Display B costa ${eurTxt(aMenoB)}${unita} in più`;

    // ⚠️ Solo caratteri del set WinAnsi: il font standard di jsPDF non ha radice, minore-uguale, pedici.
    //    Un solo glifo fuori set fa scrivere l'intera cella in un'altra codifica: lettere distanziate e
    //    testo troncato (è il difetto del PDF del 17/09/2026). `test/export-pdf.test.ts` lo impedisce.
    const tolleranza =
      opt.recommendedToThresholdRatio > 1.05
        ? `P${opt.recommendedPitchMm} mm, ${it2(opt.recommendedToThresholdRatio)} volte la soglia (tolleranza commerciale, nota 3)`
        : `P${opt.recommendedPitchMm} mm, entro la soglia di fusione`;
    const geoData = [
      ['Quota della base dello schermo (h)', `${it1(opt.installHeightM)} m · centro schermo a ${it1(opt.centerHeightM)} m`],
      ['Distanza del pubblico a terra (d)', `${it1(opt.groundViewingDistM)} m`],
      ['Linea di vista reale (D, nota 1)', `${it1(opt.lineOfSightDistM)} m al centro · ${it1(opt.lineOfSightBaseM)} m alla base · ${it1(opt.lineOfSightTopM)} m in cima`],
      ['Soglia di fusione dei pixel (nota 2)', `${it2(opt.minResolvablePitchMm)} mm`],
      ['Passo commerciale di riferimento', tolleranza],
    ];

    autoTable(doc, {
      startY: y2,
      head: [['Parametro', 'Valore']],
      body: geoData,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [0, 240, 255],
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: 1.8,
      },
      styles: {
        fontSize: 7.6,
        cellPadding: 1.8,
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
        overflow: 'linebreak',
        halign: 'left',
      },
      columnStyles: {
        0: { cellWidth: 66, fontStyle: 'bold', textColor: [15, 23, 42] },
        1: { textColor: [30, 41, 59] },
      },
      margin: { left: 16, right: 16 },
    });

    y2 = (doc as any).lastAutoTable.finalY + 2.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.4);
    doc.setTextColor(100, 116, 139);
    const noteGeo = [
      'Nota 1 · D = radice quadrata di ((h + H/2) al quadrato + d al quadrato), con H altezza dello schermo: la distanza si misura fino al centro.',
      'Nota 2 · Criterio Snellen 20/20: 1 arcminuto = 0,000291 rad. Sopra questa soglia l\'occhio separa i singoli diodi.',
      ...(opt.recommendedToThresholdRatio > 1.05
        ? ['Nota 3 · Il passo di riferimento è il passo commerciale outdoor per questa fascia di distanza. Supera la soglia teorica: è una tolleranza commerciale dichiarata, non la fusione completa dei pixel.']
        : []),
    ];
    for (const nota of noteGeo) {
      const righe = doc.splitTextToSize(nota, pageWidth - 32);
      doc.text(righe, 16, y2 + 2.5);
      y2 += righe.length * 2.9;
    }
    y2 += 5;

    // Sezione 2: Display A (scelta del cliente) contro Display B (proposta del motore express)
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('2. Confronto: scelta del cliente e proposta VeroLED', 16, y2);
    y2 += 4;

    if (alt) {
      const T = tierName(alt.tier);
      const A = alt.current;
      const B = alt.proposed;
      const stessa = Math.abs(A.pitchMm - B.pitchMm) < 0.05;
      const esito: Record<AlternativeProposal['kind'], string> = {
        pitch: 'A è più fitto del necessario: B rende uguale e consuma meno',
        coarse: 'A è troppo largo per la distanza: la trama si vede',
        brightness: 'A non arriva ai nit richiesti',
        compromise: 'Nessun passo della Selection soddisfa nit e distanza: B è il compromesso',
        nodata: 'Tetto di nit di A non censito a listino: non validabile',
        fleet: 'A soddisfa nit e distanza',
        none: 'A soddisfa nit e distanza',
      };
      const tettoA = alt.currentMaxNits !== null ? `${formatItalianNumber(alt.currentMaxNits)} nit` : 'non censito a listino';
      const tettoB = B.hardware.tettoNoto ? `${formatItalianNumber(B.hardware.maxPhysicalNits)} nit` : 'non censito a listino';
      const densA = Math.round(Math.pow(1000 / A.pitchMm, 2));
      const densB = Math.round(Math.pow(1000 / B.pitchMm, 2));
      const densDelta =
        densA === densB
          ? 'Stessa densità'
          : densA > densB
          ? `Display A ha il ${formatItalianNumber(Math.round((densA / densB - 1) * 100))}% di pixel in più`
          : `Display B ha il ${formatItalianNumber(Math.round((densB / densA - 1) * 100))}% di pixel in più`;
      const cA = alt.canoneCurrent;
      const cB = alt.canoneProposed;
      const canoneTxt = (c: typeof cA, mesi = 1) => (c ? `${eur(c.rataMensileEur * mesi)}${mesi === 1 ? ' al mese' : ''}` : 'prezzo non a listino');
      const energiaA24 = A.annualCostEur * 2;
      const energiaB24 = B.annualCostEur * 2;

      const compRows: string[][] = [
        ['Passo e Selection', `P${A.pitchMm} mm ${T}`, stessa ? 'coincide con A' : `P${B.pitchMm} mm ${T}`, esito[alt.kind]],
        ['Densità pixel', `${formatItalianNumber(densA)} px/m²`, `${formatItalianNumber(densB)} px/m²`, densDelta],
        ['Tetto di nit a listino', tettoA, tettoB, `Richiesti: ${formatItalianNumber(A.nits)} nit`],
        [
          'Sforzo dei chip (nota 4)',
          alt.currentMaxNits !== null ? `${A.hardware.sforzoPercent}%` : 'non dichiarabile',
          B.hardware.tettoNoto ? `${B.hardware.sforzoPercent}%` : 'non dichiarabile',
          '',
        ],
        ['Canone noleggio mensile (nota 5)', canoneTxt(cA), canoneTxt(cB), cA && cB ? deltaTxt(cA.rataMensileEur - cB.rataMensileEur, ' al mese') : 'Non confrontabile'],
        ['Canone noleggio 24 mesi', canoneTxt(cA, 24), canoneTxt(cB, 24), cA && cB ? deltaTxt((cA.rataMensileEur - cB.rataMensileEur) * 24) : 'Non confrontabile'],
        ['Energia elettrica 24 mesi (nota 6)', eur(energiaA24), eur(energiaB24), deltaTxt(energiaA24 - energiaB24)],
        [
          'TOTALE 24 MESI (noleggio + energia)',
          cA ? eur(cA.rataMensileEur * 24 + energiaA24) : 'prezzo non a listino',
          cB ? eur(cB.rataMensileEur * 24 + energiaB24) : 'prezzo non a listino',
          cA && cB ? deltaTxt(cA.rataMensileEur * 24 + energiaA24 - (cB.rataMensileEur * 24 + energiaB24)) : 'Non confrontabile',
        ],
      ];

      autoTable(doc, {
        startY: y2,
        head: [['Voce', 'Display A · scelta del cliente', 'Display B · proposta VeroLED', 'Differenza']],
        body: stessa ? compRows.map((r) => [r[0], r[1], r[2] === 'coincide con A' ? r[2] : '—', r[0].startsWith('Passo') || r[0].startsWith('Tetto') ? r[3] : '—']) : compRows,
        theme: 'grid',
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.6,
          cellPadding: 1.8,
        },
        columnStyles: {
          0: { cellWidth: 48, fontStyle: 'bold', textColor: [15, 23, 42] },
          1: { cellWidth: 38, textColor: [51, 65, 85] },
          2: { cellWidth: 38, fontStyle: 'bold', textColor: [16, 185, 129] },
          3: { fontStyle: 'bold', textColor: [15, 23, 42] },
        },
        styles: {
          fontSize: 7.2,
          cellPadding: 1.7,
          lineColor: [226, 232, 240],
          lineWidth: 0.2,
          overflow: 'linebreak',
          halign: 'left',
        },
        margin: { left: 16, right: 16 },
      });

      y2 = (doc as any).lastAutoTable.finalY + 2.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.4);
      doc.setTextColor(100, 116, 139);
      const noteComp = [
        'Nota 4 · Quota del tetto di nit di listino della combinazione Selection × passo usata per dare i nit richiesti.',
        `Nota 5 · Noleggio operativo a 24 mesi con le regole di veroledsrl.com/noleggio-operativo: prezzo di listino + posa, coefficiente del broker, assicurazione all-risk. Istruttoria una tantum esclusa${cA ? ` (${eur(cA.istruttoriaEur)})` : ''}. Struttura, processore video e quadro elettrico si quotano sul sopralluogo.`,
        `Nota 6 · Stima a ${formatItalianNumber(A.nits)} nit con il contenuto e le ore dichiarate, dimming notturno al 10%.`,
      ];
      for (const nota of noteComp) {
        const righe = doc.splitTextToSize(nota, pageWidth - 32);
        doc.text(righe, 16, y2 + 2.5);
        y2 += righe.length * 2.9;
      }
      y2 += 4;

      // Sezione 3: verdetto, lo stesso testo che il cliente legge nel Calcolo Express
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      const corpo = [alt.headline, ...alt.reasons.map((r) => `- ${r}`)].map(pdfSafe).flatMap((t) => doc.splitTextToSize(t, pageWidth - 40) as string[]);
      const altezzaBox = 9 + corpo.length * 3.2;
      const positivo = alt.currentIsValid;
      doc.setFillColor(248, 250, 252);
      if (positivo) doc.setDrawColor(16, 185, 129); else doc.setDrawColor(217, 119, 6);
      doc.setLineWidth(0.4);
      doc.roundedRect(16, y2, pageWidth - 32, altezzaBox, 1.5, 1.5, 'FD');
      if (positivo) doc.setTextColor(16, 185, 129); else doc.setTextColor(180, 83, 9);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.text('3. VERDETTO', 20, y2 + 5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(51, 65, 85);
      doc.text(corpo, 20, y2 + 9.5);
    } else {
      const splitVerdict = doc.splitTextToSize(pdfSafe(opt.scientificVerdict), pageWidth - 40);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(51, 65, 85);
      doc.text(splitVerdict, 16, y2 + 3);
    }

    // Footer Pagina 2
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(16, 276, pageWidth - 16, 276);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'Nota di riservatezza: Studio fotometrico ed economico redatto da VeroLED S.r.l. sulla base della formula di acuità visiva Snellen e della Delibera ARERA 232/2022/R/eel.',
      16,
      280.5
    );

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(
      'VeroLED S.r.l. · Tecnologie Display LED Professionali · veroled.it · info@veroled.it',
      16,
      285
    );

    doc.setFont('helvetica', 'normal');
    doc.text(
      'Fleet Monitor PRO · Allegato Perizia Ottica · Pagina 2 di 2',
      pageWidth - 16,
      285,
      { align: 'right' }
    );
  }

  return doc;
}

