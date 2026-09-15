/**
 * Generatore Report Audit Energetico (PDF)
 * Utilizza jsPDF e jspdf-autotable per creare un documento vettoriale ad alta risoluzione
 * Include il logo ufficiale VeroLED e le specifiche ingegneristiche certificate.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ScreenDimensions, ScenarioResult, DailyEnergyProfile } from './physics';
import { VEROLED_LOGO_PNG_BASE64 } from '../assets/logo-base64';

export interface ReportData {
  dimensions: ScreenDimensions;
  scenario: ScenarioResult;
  profile: DailyEnergyProfile;
  aplPercent: number;
  tariffaEurKwh: number;
  userName?: string;
  userCompany?: string;
  userEmail?: string;
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
  doc.text('Doc. ID: VERO-AUDIT-2026-0915', pageWidth - 16, 18.5, { align: 'right' });

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
      `-${formatItalianNumber(data.scenario.savingsEur)} € / anno`,
    ],
    [
      'Costo Mensile Medio Elettricità (€)',
      `${formatItalianNumber(data.scenario.annualCostEurA / 12)} €`,
      `${formatItalianNumber(data.scenario.annualCostEurB / 12)} €`,
      `-${formatItalianNumber(data.scenario.savingsEur / 12)} € / mese`,
    ],
    [
      'Emissioni CO2 Annuali Evitate (t)',
      `${(data.scenario.annualKwhA * 0.000305).toFixed(1)} ton CO2`,
      `${(data.scenario.annualKwhB * 0.000305).toFixed(1)} ton CO2`,
      `-${data.scenario.co2SavedTons.toFixed(1)} ton CO2 abbattute`,
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
    `RISPARMIO CERTIFICATO: ${formatItalianNumber(data.scenario.savingsEur)} € / ANNO  (-${data.scenario.savingsPercent.toFixed(1)}% DI RIDUZIONE BOLLETTA)`,
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
    'VeroLED S.r.l. · Tecnologie Display LED Professionali · https://veroledsrl.com',
    16,
    285
  );

  doc.setFont('helvetica', 'normal');
  doc.text(
    'Fleet Monitor PRO · Audit Energetico Ufficiale · Pagina 1 di 1',
    pageWidth - 16,
    285,
    { align: 'right' }
  );

  return doc;
}

