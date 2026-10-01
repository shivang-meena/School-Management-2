import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface MarksheetPdfData {
  title: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  totalMarks: number;
  maximumMarks: number;
  percentage: number;
  student?: {
    name?: string;
    studentId?: string;
    rollNumber?: number;
    className?: string;
    sectionName?: string;
    academicYear?: string;
  };
  subjects: {
    subject?: { name: string; code?: string };
    date?: string;
    marks: number | null;
    maximumMarks: number;
    entryStatus: string;
    remarks?: string | null;
  }[];
}

function getGradeLetter(percent: number): string {
  if (percent >= 90) return 'A+';
  if (percent >= 80) return 'A';
  if (percent >= 70) return 'B+';
  if (percent >= 60) return 'B';
  if (percent >= 50) return 'C';
  if (percent >= 33) return 'D';
  return 'E';
}

function getDivisionText(percent: number): string {
  if (percent >= 75) return 'Distinction (1st Div)';
  if (percent >= 60) return 'First Division';
  if (percent >= 45) return 'Second Division';
  if (percent >= 33) return 'Third Division';
  return 'Needs Improvement';
}

export function downloadMarksheetPdf(data: MarksheetPdfData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ── Outer Border ──
  doc.setDrawColor(45, 55, 75);
  doc.setLineWidth(0.7);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

  doc.setDrawColor(180, 190, 205);
  doc.setLineWidth(0.25);
  doc.rect(9.5, 9.5, pageWidth - 19, pageHeight - 19);

  // ── School Header ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(20, 32, 58);
  doc.text('ARIHANT PUBLIC SCHOOL', pageWidth / 2, 22, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90, 100, 115);
  doc.text('Affiliated to CBSE / State Board • Academic Session Record', pageWidth / 2, 28, { align: 'center' });

  doc.setDrawColor(215, 220, 230);
  doc.setLineWidth(0.4);
  doc.line(16, 32, pageWidth - 16, 32);

  // ── Marksheet Title ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(25, 38, 65);
  doc.text('OFFICIAL STUDENT MARKSHEET', pageWidth / 2, 39, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(60, 75, 100);
  const examTitle = String(data.title || 'EXAMINATION').toUpperCase();
  doc.text(`EXAMINATION: ${examTitle}`, pageWidth / 2, 45, { align: 'center' });

  // ── Student Details Box ──
  const studentName = data.student?.name || 'Student';
  const studentId = data.student?.studentId || '—';
  const className = data.student?.className
    ? `${data.student.className}${data.student.sectionName ? ' - ' + data.student.sectionName : ''}`
    : 'Class 1 - A';
  const rollNo = data.student?.rollNumber != null ? `#${data.student.rollNumber}` : '—';
  const session = data.student?.academicYear || '2026-2027';
  const issueDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  autoTable(doc, {
    startY: 49,
    theme: 'plain',
    styles: { fontSize: 9.5, cellPadding: 2, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [90, 100, 115], cellWidth: 32 },
      1: { fontStyle: 'bold', cellWidth: 60 },
      2: { fontStyle: 'bold', textColor: [90, 100, 115], cellWidth: 35 },
      3: { fontStyle: 'bold', cellWidth: 50 },
    },
    body: [
      ['Student Name:', studentName, 'Roll Number:', rollNo],
      ['Student ID:', studentId, 'Class & Section:', className],
      ['Academic Session:', session, 'Date of Issue:', issueDate],
    ],
  });

  const lastTable = (doc as any).lastAutoTable;
  const tableStartY = (lastTable?.finalY || 68) + 4;

  // ── Subjects Table ──
  const tableBody = (data.subjects || []).map((sub, idx) => {
    const isAbsent = sub.entryStatus === 'ABSENT';
    const subMax = sub.maximumMarks || 100;
    const subPass = Math.round(subMax * 0.33);
    const marks = isAbsent ? null : (sub.marks ?? 0);
    const percent = isAbsent ? 0 : Math.round(((marks || 0) / subMax) * 100);
    const grade = isAbsent ? '—' : getGradeLetter(percent);
    const isPass = !isAbsent && (marks || 0) >= subPass;
    const resultStr = isAbsent ? 'ABSENT' : isPass ? 'PASS' : 'FAIL';

    return [
      String(idx + 1).padStart(2, '0'),
      sub.subject?.name || 'Subject',
      sub.subject?.code || '—',
      String(subMax),
      String(subPass),
      isAbsent ? 'ABSENT' : String(marks),
      isAbsent ? '0%' : `${percent}%`,
      grade,
      resultStr,
    ];
  });

  const totalMax = data.maximumMarks || 100;
  const totalPass = Math.round(totalMax * 0.33);
  const totalObtained = data.totalMarks || 0;
  const overallPercent = data.percentage || 0;
  const overallGrade = getGradeLetter(overallPercent);
  const overallPass = overallPercent >= 33;
  const overallResultStr = overallPass ? 'PASSED' : 'NEEDS IMPROVEMENT';

  autoTable(doc, {
    startY: tableStartY,
    theme: 'grid',
    head: [['#', 'Subject Name', 'Code', 'Max Marks', 'Pass Marks', 'Marks Obtained', 'Percentage', 'Grade', 'Status']],
    body: tableBody,
    foot: [
      [
        '',
        'GRAND TOTAL',
        '',
        String(totalMax),
        String(totalPass),
        String(totalObtained),
        `${overallPercent}%`,
        overallGrade,
        overallResultStr,
      ],
    ],
    headStyles: {
      fillColor: [35, 48, 72],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
    },
    footStyles: {
      fillColor: [242, 245, 250],
      textColor: [20, 30, 50],
      fontStyle: 'bold',
      fontSize: 9.5,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [30, 41, 59],
      cellPadding: 3,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 46, fontStyle: 'bold' },
      2: { halign: 'center', cellWidth: 16 },
      3: { halign: 'center', cellWidth: 20 },
      4: { halign: 'center', cellWidth: 20 },
      5: { halign: 'center', cellWidth: 24, fontStyle: 'bold' },
      6: { halign: 'center', cellWidth: 20 },
      7: { halign: 'center', cellWidth: 16 },
      8: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
    },
  });

  const afterTableY = ((doc as any).lastAutoTable?.finalY || 160) + 6;

  // ── Result Summary Card ──
  doc.setDrawColor(210, 218, 230);
  doc.setFillColor(248, 250, 253);
  doc.roundedRect(16, afterTableY, pageWidth - 32, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(70, 80, 95);

  doc.text('TOTAL MARKS OBTAINED:', 22, afterTableY + 8);
  doc.setFontSize(12);
  doc.setTextColor(25, 38, 65);
  doc.text(`${totalObtained} / ${totalMax}`, 22, afterTableY + 16);

  doc.setFontSize(9.5);
  doc.setTextColor(70, 80, 95);
  doc.text('AGGREGATE PERCENTAGE:', 85, afterTableY + 8);
  doc.setFontSize(12);
  doc.setTextColor(25, 38, 65);
  doc.text(`${overallPercent}% (Grade: ${overallGrade})`, 85, afterTableY + 16);

  doc.setFontSize(9.5);
  doc.setTextColor(70, 80, 95);
  doc.text('FINAL RESULT:', 150, afterTableY + 8);
  doc.setFontSize(11);
  doc.setTextColor(overallPass ? 22 : 220, overallPass ? 130 : 38, overallPass ? 80 : 38);
  doc.text(`${overallResultStr}`, 150, afterTableY + 16);

  // ── Grading Legend ──
  const legendY = afterTableY + 28;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(70, 80, 95);
  doc.text('Grading Scale:', 16, legendY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(110, 120, 135);
  doc.text(
    'A+ (90-100%)  •  A (80-89%)  •  B+ (70-79%)  •  B (60-69%)  •  C (50-59%)  •  D (33-49% Pass)  •  E (<33% Needs Improvement)',
    38,
    legendY
  );

  // ── Signature Section ──
  const sigY = pageHeight - 34;
  doc.setDrawColor(180, 190, 205);
  doc.setLineWidth(0.3);

  // Class Teacher
  doc.line(22, sigY, 68, sigY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(70, 80, 95);
  doc.text('Class Teacher Signature', 26, sigY + 5);

  // Exam Controller
  doc.line(85, sigY, 130, sigY);
  doc.text('Checked By / Coordinator', 87, sigY + 5);

  // Principal
  doc.line(148, sigY, 190, sigY);
  doc.text('Principal Signature & Seal', 150, sigY + 5);

  // Bottom Notice
  doc.setFontSize(7.5);
  doc.setTextColor(150, 160, 175);
  doc.text(
    'This is a verified computer-generated mark statement issued by Arihant Public School.',
    pageWidth / 2,
    pageHeight - 12,
    { align: 'center' }
  );

  // ── Save & Download PDF ──
  const cleanStudentName = studentName.replace(/[^a-zA-Z0-9]/g, '_');
  const cleanExamTitle = (data.title || 'Exam').replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Marksheet_${cleanStudentName}_${cleanExamTitle}.pdf`;

  doc.save(fileName);
}
