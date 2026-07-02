import { jsPDF } from 'jspdf';
import { TcmDiagnosisResult, ChatMessage, Language, SavedPatient } from '@/types';

class PDFLayoutHelper {
  doc: jsPDF;
  y: number;
  margin: number;
  pageWidth: number;
  pageHeight: number;
  primaryColor: [number, number, number] = [99, 102, 241]; // Indigo/Blue-Purple #6366f1
  secondaryColor: [number, number, number] = [139, 92, 246]; // Purple #8b5cf6
  textColor: [number, number, number] = [33, 41, 54]; // Dark slate
  mutedTextColor: [number, number, number] = [100, 116, 139]; // Slate 500
  borderColor: [number, number, number] = [226, 232, 240]; // Light gray border

  constructor(doc: jsPDF, margin = 40) {
    this.doc = doc;
    this.y = margin;
    this.margin = margin;
    const pageSize = doc.internal.pageSize;
    this.pageWidth = pageSize.getWidth();
    this.pageHeight = pageSize.getHeight();
  }

  checkPageSpace(neededHeight: number, isFirstPage = false) {
    if (this.y + neededHeight > this.pageHeight - this.margin - 10) {
      this.doc.addPage();
      this.y = this.margin;
      this.drawHeaderFooter(isFirstPage);
    }
  }

  drawHeaderFooter(isFirstPage = false) {
    // Draw visual accent line at the top of each page
    this.doc.setFillColor(this.primaryColor[0], this.primaryColor[1], this.primaryColor[2]);
    this.doc.rect(this.margin, 15, this.pageWidth - (this.margin * 2), 3, 'F');

    this.doc.setFont("Helvetica", "normal");
    this.doc.setFontSize(8);
    this.doc.setTextColor(this.mutedTextColor[0], this.mutedTextColor[1], this.mutedTextColor[2]);
    this.doc.text("TCM WU-XING PRO CLINICAL DIAGNOSIS SYSTEM", this.margin, 25);

    // Footer divider and stamp text
    this.doc.setFillColor(this.borderColor[0], this.borderColor[1], this.borderColor[2]);
    this.doc.rect(this.margin, this.pageHeight - 25, this.pageWidth - (this.margin * 2), 0.5, 'F');
    this.doc.text("Confidential Clinical Document • Generated automatically via Gemini TCM Engine", this.margin, this.pageHeight - 15);
  }

  drawSectionHeader(title: string) {
    this.checkPageSpace(25);
    this.y += 10;
    
    // Tiny colored indicator box
    this.doc.setFillColor(this.secondaryColor[0], this.secondaryColor[1], this.secondaryColor[2]);
    this.doc.rect(this.margin, this.y - 10, 4, 12, 'F');

    this.doc.setFont("Helvetica", "bold");
    this.doc.setFontSize(11);
    this.doc.setTextColor(this.primaryColor[0], this.primaryColor[1], this.primaryColor[2]);
    this.doc.text(title.toUpperCase(), this.margin + 10, this.y);
    
    this.y += 5;
    this.doc.setDrawColor(this.borderColor[0], this.borderColor[1], this.borderColor[2]);
    this.doc.line(this.margin, this.y, this.pageWidth - this.margin, this.y);
    this.y += 10;
  }

  drawBullet(text: string, xOffset = 0) {
    const wrappedText = this.doc.splitTextToSize(text, this.pageWidth - (this.margin * 2) - xOffset - 15);
    const textHeight = wrappedText.length * 14;
    this.checkPageSpace(textHeight + 5);

    this.doc.setFont("Helvetica", "normal");
    this.doc.setFontSize(9);
    this.doc.setTextColor(this.textColor[0], this.textColor[1], this.textColor[2]);
    
    // Draw neat bullet circle
    this.doc.setFillColor(this.secondaryColor[0], this.secondaryColor[1], this.secondaryColor[2]);
    this.doc.circle(this.margin + xOffset + 4, this.y - 3, 2, 'F');

    // Draw wrapped text
    this.doc.text(wrappedText, this.margin + xOffset + 12, this.y);
    this.y += textHeight + 4;
  }

  drawTextParagraph(text: string, xOffset = 0, fontSize = 9, isBold = false) {
    const wrappedText = this.doc.splitTextToSize(text, this.pageWidth - (this.margin * 2) - xOffset);
    const textHeight = wrappedText.length * (fontSize + 4);
    this.checkPageSpace(textHeight + 5);

    this.doc.setFont("Helvetica", isBold ? "bold" : "normal");
    this.doc.setFontSize(fontSize);
    this.doc.setTextColor(this.textColor[0], this.textColor[1], this.textColor[2]);
    this.doc.text(wrappedText, this.margin + xOffset, this.y);
    this.y += textHeight + 4;
  }
}

export const exportDiagnosisToPDF = (
  diagnosis: TcmDiagnosisResult, 
  patient: Partial<SavedPatient> | null, 
  language: Language,
  clinicName = "CINTA FITRI TCM PRO CLINIC",
  clinicAddress = "",
  clinicPhone = ""
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const layout = new PDFLayoutHelper(doc);
  const isIndo = language !== Language.ENGLISH;

  // Let's set initial top space
  layout.drawHeaderFooter(true);
  layout.y = 50;

  // Draw elegant main header banner
  doc.setFillColor(17, 24, 39); // Deep dark background block
  doc.rect(layout.margin, layout.y, layout.pageWidth - (layout.margin * 2), 70, 'F');

  // Title in block
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  const mainTitle = isIndo ? "LAPORAN DIAGNOSIS KLINIS TCM" : "TCM CLINICAL DIAGNOSIS REPORT";
  doc.text(mainTitle, layout.margin + 20, layout.y + 30);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(191, 196, 210);
  const subtitle = clinicName || "CINTA FITRI TCM PRO CLINIC";
  doc.text(subtitle, layout.margin + 20, layout.y + 48);

  // Date / Timestamp inside header
  const dateStr = new Date().toLocaleString(isIndo ? 'id-ID' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
  doc.text(`${isIndo ? "Waktu" : "Date"}: ${dateStr}`, layout.pageWidth - layout.margin - 160, layout.y + 30);

  layout.y += 85;

  // Patient details section
  if (patient) {
    layout.drawSectionHeader(isIndo ? "Data Registrasi Pasien" : "Patient Registration Data");
    
    // Draw elegant details container
    doc.setFillColor(248, 250, 252); // soft slate bg
    doc.rect(layout.margin, layout.y, layout.pageWidth - (layout.margin * 2), 90, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(layout.margin, layout.y, layout.pageWidth - (layout.margin * 2), 90, 'D');

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);

    // Left Column
    doc.text(`${isIndo ? "Nama Pasien" : "Patient Name"}:`, layout.margin + 15, layout.y + 20);
    doc.text(`${isIndo ? "Usia / Gender" : "Age / Gender"}:`, layout.margin + 15, layout.y + 40);
    doc.text(`${isIndo ? "Telepon" : "Phone"}:`, layout.margin + 15, layout.y + 60);
    doc.text(`${isIndo ? "Alamat" : "Address"}:`, layout.margin + 15, layout.y + 80);

    // Right Column Labels
    doc.text(`${isIndo ? "Keluhan Utama" : "Chief Complaint"}:`, layout.margin + 240, layout.y + 20);
    doc.text(`${isIndo ? "Gejala Penyerta" : "Accompanying Symptoms"}:`, layout.margin + 240, layout.y + 40);

    // Dynamic Values - Normal font
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    
    doc.text(patient.patientName || "Anonymous", layout.margin + 95, layout.y + 20);
    doc.text(`${patient.age || "-"} th / ${patient.sex || "-"}`, layout.margin + 95, layout.y + 40);
    doc.text(patient.phone || "-", layout.margin + 95, layout.y + 60);
    doc.text(patient.address || "-", layout.margin + 95, layout.y + 80);

    // Wrapped Chief Complaint
    const wrappedComplaint = doc.splitTextToSize(patient.complaint || "-", layout.pageWidth - layout.margin - (layout.margin + 325));
    doc.text(wrappedComplaint, layout.margin + 325, layout.y + 20);

    // Accompanying Symptoms list truncate
    const syms = patient.selectedSymptoms?.join(", ") || patient.symptoms || "-";
    const wrappedSyms = doc.splitTextToSize(syms, layout.pageWidth - layout.margin - (layout.margin + 325));
    doc.text(wrappedSyms, layout.margin + 325, layout.y + 40);

    layout.y += 105;

    // Tongue & Pulse diagnostics sub-section
    if (patient.tongue || patient.pulse) {
      layout.checkPageSpace(50);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(99, 102, 241);
      doc.text(isIndo ? "■ DIAGNOSIS DIAGNOSTIK UTAMA" : "■ MAIN DIAGNOSTIC PARAMETERS", layout.margin, layout.y);
      layout.y += 15;

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      
      const tongueStr = patient.tongue ? 
        `${isIndo ? 'Warna Lidah' : 'Tongue Body'}: ${patient.tongue.body_color || '-'}, ${isIndo ? 'Selaput' : 'Coating'}: ${patient.tongue.coating_color || '-'} (${patient.tongue.coating_quality || '-'})` : '-';
      
      const pulseStr = patient.pulse ? 
        `${isIndo ? 'Nadi' : 'Pulse'}: ${patient.pulse.qualities?.join(", ") || '-'}` : '-';

      layout.drawTextParagraph(`• ${isIndo ? "Lidah" : "Tongue"}: ${tongueStr}`, 10);
      layout.drawTextParagraph(`• ${isIndo ? "Nadi" : "Pulse"}: ${pulseStr}`, 10);
      layout.y += 10;
    }
  }

  // Diagnosis Section
  layout.drawSectionHeader(isIndo ? "Kesimpulan Diagnosis & Diferensiasi Pola" : "Diagnostic Summary & Pattern Differentiation");
  
  // Syndrome/Pattern Box
  doc.setFillColor(239, 246, 255); // Soft blue bg
  doc.rect(layout.margin, layout.y, layout.pageWidth - (layout.margin * 2), 40, 'F');
  doc.setDrawColor(191, 219, 254);
  doc.rect(layout.margin, layout.y, layout.pageWidth - (layout.margin * 2), 40, 'D');

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 138); // Deep blue
  doc.text(`${isIndo ? "Pola Utama" : "Primary Pattern"}:`, layout.margin + 15, layout.y + 24);
  
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(29, 78, 216); // Bright royal blue
  doc.text(diagnosis.patternId || "Undifferentiated Pattern", layout.margin + 105, layout.y + 24);

  // Confidence Rating badge
  const confidence = diagnosis.confidence ? Math.round(diagnosis.confidence * 100) : 100;
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 58, 138);
  doc.text(`Match: ${confidence}%`, layout.pageWidth - layout.margin - 80, layout.y + 24);

  layout.y += 55;

  // Analysis / Explanation
  if (diagnosis.explanation) {
    layout.drawTextParagraph(isIndo ? "Deskripsi Klinis & Analisis Patofisiologi:" : "Clinical Description & Pathological Analysis:", 0, 10, true);
    layout.drawTextParagraph(diagnosis.explanation, 10);
    layout.y += 5;
  }

  // Treatment principles
  if (diagnosis.treatment_principle && diagnosis.treatment_principle.length > 0) {
    layout.drawSectionHeader(isIndo ? "Prinsip Terapi / Metode Pengobatan" : "Treatment Principles");
    diagnosis.treatment_principle.forEach(principle => {
      layout.drawBullet(principle);
    });
  }

  // Acupuncture Points section
  if (diagnosis.recommendedPoints && diagnosis.recommendedPoints.length > 0) {
    layout.drawSectionHeader(isIndo ? "Rencana Terapi Akupunktur (Meridian Utama)" : "Acupuncture Therapy Plan (Primary Meridians)");
    diagnosis.recommendedPoints.forEach(pt => {
      layout.drawBullet(`[${pt.code}] - ${pt.description}`);
    });
  }

  // Master Tung Acupuncture points
  if (diagnosis.masterTungPoints && diagnosis.masterTungPoints.length > 0) {
    layout.drawSectionHeader(isIndo ? "Terapi Komplementer: Titik Master Tung" : "Complementary Therapy: Master Tung Points");
    diagnosis.masterTungPoints.forEach(pt => {
      layout.drawBullet(`[${pt.code}] - ${pt.description}`);
    });
  }

  // Herbal prescription
  if (diagnosis.herbal_recommendation) {
    layout.drawSectionHeader(isIndo ? "Rekomendasi Terapi Herbal" : "Herbal Therapy Recommendation");
    const formulaName = diagnosis.herbal_recommendation.formula_name || diagnosis.classical_prescription || "-";
    
    layout.drawTextParagraph(`${isIndo ? "Resep Klasik / Formula" : "Classical Prescription"}: ${formulaName}`, 0, 10, true);
    
    if (diagnosis.herbal_recommendation.chief && diagnosis.herbal_recommendation.chief.length > 0) {
      layout.drawTextParagraph(`${isIndo ? "Komposisi Utama (Chief Herbs)" : "Primary Herbs (Chief Ingredients)"}:`, 10, 9, true);
      diagnosis.herbal_recommendation.chief.forEach(herb => {
        layout.drawBullet(herb, 15);
      });
    }
  }

  // Lifestyle advice
  if (diagnosis.lifestyleAdvice) {
    layout.drawSectionHeader(isIndo ? "Saran Pola Makan, Emosi & Gaya Hidup" : "Dietary, Emotional & Lifestyle Advice");
    layout.drawTextParagraph(diagnosis.lifestyleAdvice, 10);
  }

  // Signatures at the end
  layout.checkPageSpace(100);
  layout.y += 30;
  
  const lineY = layout.y + 40;
  doc.setDrawColor(203, 213, 225);
  doc.line(layout.pageWidth - layout.margin - 160, lineY, layout.pageWidth - layout.margin, lineY);
  
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(isIndo ? "Tanda Tangan Praktisi / Dokter" : "Practitioner Signature", layout.pageWidth - layout.margin - 145, lineY + 12);

  // Clinic Details Footer at bottom
  if (clinicAddress || clinicPhone) {
    layout.checkPageSpace(40);
    layout.y = layout.pageHeight - 50;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    const detailStr = `${clinicAddress} ${clinicPhone ? `| Tlp: ${clinicPhone}` : ''}`;
    doc.text(detailStr, layout.margin, layout.y);
  }

  // Save the PDF
  const filename = `TCM-Diagnosis-${patient?.patientName || "Report"}-${Date.now()}.pdf`;
  doc.save(filename);
};

export const exportConversationToPDF = (
  messages: ChatMessage[], 
  language: Language,
  clinicName = "CINTA FITRI TCM PRO CLINIC"
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const layout = new PDFLayoutHelper(doc);
  const isIndo = language !== Language.ENGLISH;

  layout.drawHeaderFooter(true);
  layout.y = 50;

  // Header Box
  doc.setFillColor(15, 23, 42); // slate 900
  doc.rect(layout.margin, layout.y, layout.pageWidth - (layout.margin * 2), 60, 'F');

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  const mainTitle = isIndo ? "TRANSKRIP KONSULTASI TCM" : "TCM CONSULTATION CHAT TRANSCRIPT";
  doc.text(mainTitle, layout.margin + 20, layout.y + 26);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(clinicName, layout.margin + 20, layout.y + 44);

  const dateStr = new Date().toLocaleString(isIndo ? 'id-ID' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
  doc.text(`${isIndo ? "Tanggal" : "Date"}: ${dateStr}`, layout.pageWidth - layout.margin - 160, layout.y + 26);

  layout.y += 80;

  messages.forEach((msg, idx) => {
    // Determine height needed for header + text
    const sender = msg.role === 'user' ? (isIndo ? "PASIEN / DOKTER" : "USER / PRACTITIONER") : "ASISTEN KLINIS TCM AI";
    const headerStr = `[${idx + 1}] ${sender} (${new Date(msg.timestamp).toLocaleTimeString()})`;
    
    // We wrap the text
    const wrappedText = doc.splitTextToSize(msg.text, layout.pageWidth - (layout.margin * 2) - 30);
    const textHeight = wrappedText.length * 13;
    
    // Total space: header (15pt) + text + box padding (20pt)
    layout.checkPageSpace(textHeight + 45);

    // Draw sender background block
    if (msg.role === 'user') {
      doc.setFillColor(243, 244, 246); // Light gray
      doc.setDrawColor(229, 231, 235);
    } else {
      doc.setFillColor(239, 246, 255); // Soft blue/purple
      doc.setDrawColor(219, 234, 254);
    }
    
    doc.rect(layout.margin, layout.y, layout.pageWidth - (layout.margin * 2), textHeight + 30, 'DF');

    // Draw header
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(msg.role === 'user' ? 75 : 99, msg.role === 'user' ? 85 : 102, msg.role === 'user' ? 99 : 241);
    doc.text(headerStr, layout.margin + 15, layout.y + 15);

    // Draw text
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(33, 41, 54);
    doc.text(wrappedText, layout.margin + 15, layout.y + 28);

    layout.y += textHeight + 40;

    // If there is a tcm diagnosis included, briefly mention it or attach detail notice
    if (msg.tcmResult) {
      layout.checkPageSpace(40);
      doc.setFillColor(236, 253, 245); // light green bg
      doc.setDrawColor(167, 243, 208);
      doc.rect(layout.margin + 15, layout.y - 25, layout.pageWidth - (layout.margin * 2) - 30, 20, 'DF');

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(6, 95, 70);
      doc.text(isIndo ? "• DIKEMAS DENGAN FORMULA LAPORAN DIAGNOSIS KLINIS TCM DI BAWAH" : "• BUNDLED WITH FULL TCM DIAGNOSIS REPORT ATTACHED", layout.margin + 25, layout.y - 12);
      layout.y += 10;
    }
  });

  // Save the PDF
  const filename = `TCM-Chat-Transcript-${Date.now()}.pdf`;
  doc.save(filename);
};
