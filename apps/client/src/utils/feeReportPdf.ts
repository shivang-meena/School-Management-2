export interface StudentFeeReportRow {
  studentName: string;
  studentId: string;
  rollNumber?: string | number;
  className?: string;
  sectionName?: string;
  totalFee: number;
  paidAmount: number;
  remainingFee: number;
  creditBalance: number;
}

export interface FeeReportData {
  schoolName?: string;
  filterClass?: string;
  filterSection?: string;
  academicYear?: string;
  students: StudentFeeReportRow[];
}

export function generateFeeReportPdfString(data: FeeReportData): string {
  const sanitize = (str: any) =>
    String(str ?? '-')
      .replace(/[\u2014\u2013]/g, '-')
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/[\r\n]+/g, ' ')
      .replace(/[^\x20-\x7E]/g, '');

  const money = (val: any) =>
    Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

  const schoolName = data.schoolName || 'Arihant Public School';
  const filterClass = data.filterClass || 'All Classes';
  const filterSection = data.filterSection || 'All Sections';
  const academicYear = data.academicYear || 'Current Academic Year';
  const students = data.students || [];

  const totalAssessed = students.reduce((sum, s) => sum + Number(s.totalFee || 0), 0);
  const totalPaid = students.reduce((sum, s) => sum + Number(s.paidAmount || 0), 0);
  const totalDue = students.reduce((sum, s) => sum + Number(s.remainingFee || 0), 0);
  const totalCredit = students.reduce((sum, s) => sum + Number(s.creditBalance || 0), 0);

  const ROWS_PER_PAGE = 16;
  const numPages = Math.max(1, Math.ceil(students.length / ROWS_PER_PAGE));
  const genDateStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const genTimeStr = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const pageStreams: string[] = [];

  for (let pageIdx = 0; pageIdx < numPages; pageIdx++) {
    const pageNum = pageIdx + 1;
    const isFirstPage = pageNum === 1;
    const isLastPage = pageNum === numPages;
    const pageStudents = students.slice(
      pageIdx * ROWS_PER_PAGE,
      (pageIdx + 1) * ROWS_PER_PAGE
    );

    let stream = '';

    // Page Background
    stream += '1 1 1 rg 0 0 842 595 re f\n';
    // Page Outer Border
    stream += '0.08 0.16 0.35 RG 1.2 w 25 25 792 545 re S\n';
    stream += '0.80 0.85 0.92 RG 0.6 w 28 28 786 539 re S\n';

    // Top Header Banner
    if (isFirstPage) {
      stream += '0.06 0.15 0.32 rg 30 514 782 50 re f\n';
      stream += 'BT /F2 16 Tf 1 1 1 rg 46 545 Td (' + sanitize(schoolName.toUpperCase()) + ') Tj ET\n';
      stream += 'BT /F1 8.5 Tf 0.82 0.89 0.98 rg 46 532 Td (CBSE AFFILIATED SENIOR SECONDARY SCHOOL · OFFICIAL STUDENT FEE SUMMARY REPORT) Tj ET\n';
      stream += 'BT /F1 7.5 Tf 0.70 0.80 0.95 rg 46 521 Td (Arihant ERP Financial & Student Fee Management System) Tj ET\n';

      // Header Right Tag
      stream += '0.12 0.28 0.58 rg 660 522 142 34 re f\n';
      stream += '0.35 0.55 0.85 RG 0.8 w 660 522 142 34 re S\n';
      stream += 'BT /F2 9 Tf 1 1 1 rg 675 542 Td (CLASS FEE REPORT) Tj ET\n';
      stream += 'BT /F1 7.5 Tf 0.85 0.93 1 rg 675 530 Td (Administrative Copy) Tj ET\n';

      // Filter Criteria Card (Y: 476 to 506, height: 30)
      stream += '0.96 0.98 1.0 rg 30 476 782 32 re f\n';
      stream += '0.82 0.87 0.94 RG 0.6 w 30 476 782 32 re S\n';

      stream += 'BT /F2 8 Tf 0.30 0.38 0.50 rg 44 493 Td (Class Filter:) Tj ET\n';
      stream += 'BT /F2 8.5 Tf 0.06 0.15 0.35 rg 102 493 Td (' + sanitize(filterClass) + ') Tj ET\n';

      stream += 'BT /F2 8 Tf 0.30 0.38 0.50 rg 195 493 Td (Section:) Tj ET\n';
      stream += 'BT /F2 8.5 Tf 0.06 0.15 0.35 rg 240 493 Td (' + sanitize(filterSection) + ') Tj ET\n';

      stream += 'BT /F2 8 Tf 0.30 0.38 0.50 rg 330 493 Td (Academic Year:) Tj ET\n';
      stream += 'BT /F2 8.5 Tf 0.06 0.15 0.35 rg 405 493 Td (' + sanitize(academicYear) + ') Tj ET\n';

      stream += 'BT /F2 8 Tf 0.30 0.38 0.50 rg 520 493 Td (Filtered Students:) Tj ET\n';
      stream += 'BT /F2 8.5 Tf 0.06 0.15 0.35 rg 605 493 Td (' + sanitize(students.length) + ') Tj ET\n';

      stream += 'BT /F2 8 Tf 0.30 0.38 0.50 rg 670 493 Td (Generated:) Tj ET\n';
      stream += 'BT /F1 8 Tf 0.10 0.15 0.25 rg 725 493 Td (' + sanitize(genDateStr) + ') Tj ET\n';
    } else {
      // Compact Header on continuation pages
      stream += '0.06 0.15 0.32 rg 30 535 782 28 re f\n';
      stream += 'BT /F2 11 Tf 1 1 1 rg 44 547 Td (' + sanitize(schoolName.toUpperCase()) + ' · STUDENT FEE REPORT) Tj ET\n';
      stream += 'BT /F1 8 Tf 0.82 0.89 0.98 rg 480 547 Td (Class: ' + sanitize(filterClass) + ' · Section: ' + sanitize(filterSection) + ' · Year: ' + sanitize(academicYear) + ') Tj ET\n';
      stream += 'BT /F2 8.5 Tf 1 1 1 rg 740 547 Td (Page ' + pageNum + ' of ' + numPages + ') Tj ET\n';
    }

    // Table Header Top Y
    const tableHeaderY = isFirstPage ? 450 : 508;
    const tableHeaderH = 22;

    // Table Header Background
    stream += '0.08 0.18 0.38 rg 30 ' + tableHeaderY + ' 782 ' + tableHeaderH + ' re f\n';
    stream += '0.80 0.85 0.92 RG 0.5 w 30 ' + tableHeaderY + ' 782 ' + tableHeaderH + ' re S\n';

    // Header Text Columns
    stream += 'BT /F2 7.5 Tf 1 1 1 rg 36 ' + (tableHeaderY + 7) + ' Td (S.N.) Tj ET\n';
    stream += 'BT /F2 7.5 Tf 1 1 1 rg 70 ' + (tableHeaderY + 7) + ' Td (STUDENT ID) Tj ET\n';
    stream += 'BT /F2 7.5 Tf 1 1 1 rg 150 ' + (tableHeaderY + 7) + ' Td (ROLL NO) Tj ET\n';
    stream += 'BT /F2 7.5 Tf 1 1 1 rg 205 ' + (tableHeaderY + 7) + ' Td (STUDENT NAME) Tj ET\n';
    stream += 'BT /F2 7.5 Tf 1 1 1 rg 375 ' + (tableHeaderY + 7) + ' Td (CLASS - SEC) Tj ET\n';
    stream += 'BT /F2 7.5 Tf 1 1 1 rg 460 ' + (tableHeaderY + 7) + ' Td (TOTAL FEE \\(Rs.\\)) Tj ET\n';
    stream += 'BT /F2 7.5 Tf 1 1 1 rg 548 ' + (tableHeaderY + 7) + ' Td (PAID \\(Rs.\\)) Tj ET\n';
    stream += 'BT /F2 7.5 Tf 1 1 1 rg 632 ' + (tableHeaderY + 7) + ' Td (REMAINING \\(Rs.\\)) Tj ET\n';
    stream += 'BT /F2 7.5 Tf 1 1 1 rg 720 ' + (tableHeaderY + 7) + ' Td (CREDIT \\(Rs.\\)) Tj ET\n';

    // Data Rows
    const rowH = 18;
    let curRowY = tableHeaderY;

    if (pageStudents.length === 0) {
      curRowY -= rowH * 2;
      stream += '1 1 1 rg 30 ' + curRowY + ' 782 ' + (rowH * 2) + ' re f\n';
      stream += '0.88 0.91 0.95 RG 0.5 w 30 ' + curRowY + ' 782 ' + (rowH * 2) + ' re S\n';
      stream += 'BT /F1 9 Tf 0.45 0.50 0.55 rg 320 ' + (curRowY + 14) + ' Td (No student fee accounts found for this selection.) Tj ET\n';
    } else {
      pageStudents.forEach((student, rIdx) => {
        const globalIdx = pageIdx * ROWS_PER_PAGE + rIdx + 1;
        curRowY -= rowH;

        // Alternate Row Background
        if (rIdx % 2 === 1) {
          stream += '0.96 0.98 1.0 rg 30 ' + curRowY + ' 782 ' + rowH + ' re f\n';
        } else {
          stream += '1 1 1 rg 30 ' + curRowY + ' 782 ' + rowH + ' re f\n';
        }

        // Row Bottom Divider
        stream += '0.88 0.91 0.95 RG 0.5 w 30 ' + curRowY + ' 782 0 re S\n';

        const textY = curRowY + 5;
        const rollStr = student.rollNumber ? String(student.rollNumber) : '-';
        const classSecStr = [student.className, student.sectionName ? 'Sec ' + student.sectionName : '']
          .filter(Boolean)
          .join(' - ') || '-';
        const remNum = Number(student.remainingFee || 0);
        const crNum = Number(student.creditBalance || 0);

        // Columns Data
        stream += 'BT /F1 7.5 Tf 0.35 0.40 0.48 rg 38 ' + textY + ' Td (' + globalIdx + ') Tj ET\n';
        stream += 'BT /F2 7.5 Tf 0.06 0.15 0.35 rg 70 ' + textY + ' Td (' + sanitize(student.studentId) + ') Tj ET\n';
        stream += 'BT /F1 7.5 Tf 0.15 0.20 0.30 rg 155 ' + textY + ' Td (' + sanitize(rollStr) + ') Tj ET\n';
        stream += 'BT /F2 8 Tf 0.10 0.15 0.25 rg 205 ' + textY + ' Td (' + sanitize(student.studentName.slice(0, 32)) + ') Tj ET\n';
        stream += 'BT /F1 7.5 Tf 0.20 0.25 0.35 rg 375 ' + textY + ' Td (' + sanitize(classSecStr) + ') Tj ET\n';
        stream += 'BT /F1 8 Tf 0.10 0.15 0.25 rg 460 ' + textY + ' Td (' + money(student.totalFee) + ') Tj ET\n';
        stream += 'BT /F2 8 Tf 0.05 0.45 0.20 rg 548 ' + textY + ' Td (' + money(student.paidAmount) + ') Tj ET\n';

        // Remaining Column (red bold if pending, green if cleared)
        if (remNum > 0) {
          stream += 'BT /F2 8 Tf 0.75 0.15 0.15 rg 632 ' + textY + ' Td (' + money(remNum) + ') Tj ET\n';
        } else {
          stream += 'BT /F1 8 Tf 0.45 0.50 0.55 rg 632 ' + textY + ' Td (0.00) Tj ET\n';
        }

        // Credit Column
        if (crNum > 0) {
          stream += 'BT /F2 8 Tf 0.12 0.38 0.75 rg 720 ' + textY + ' Td (' + money(crNum) + ') Tj ET\n';
        } else {
          stream += 'BT /F1 8 Tf 0.45 0.50 0.55 rg 720 ' + textY + ' Td (0.00) Tj ET\n';
        }
      });
    }

    // On Last Page: Render Grand Total Row & Summary Cards & Signatory Block
    if (isLastPage && students.length > 0) {
      curRowY -= 22;
      const totalY = curRowY;

      // Grand Total Row Bar
      stream += '0.10 0.22 0.45 rg 30 ' + totalY + ' 782 22 re f\n';
      stream += '0.06 0.15 0.32 RG 0.8 w 30 ' + totalY + ' 782 22 re S\n';

      const totTextY = totalY + 7;
      stream += 'BT /F2 8 Tf 1 1 1 rg 44 ' + totTextY + ' Td (GRAND TOTAL \\(' + students.length + ' STUDENTS\\)) Tj ET\n';
      stream += 'BT /F2 8.5 Tf 1 1 1 rg 460 ' + totTextY + ' Td (' + money(totalAssessed) + ') Tj ET\n';
      stream += 'BT /F2 8.5 Tf 0.65 0.95 0.75 rg 548 ' + totTextY + ' Td (' + money(totalPaid) + ') Tj ET\n';
      stream += 'BT /F2 8.5 Tf 1 0.80 0.80 rg 632 ' + totTextY + ' Td (' + money(totalDue) + ') Tj ET\n';
      stream += 'BT /F2 8.5 Tf 0.80 0.90 1.0 rg 720 ' + totTextY + ' Td (' + money(totalCredit) + ') Tj ET\n';

      // 4 Metric Summary Cards Below Table (Y: totalY - 45)
      const cardsY = totalY - 48;
      const cardW = 145;
      const cardH = 38;

      // Card 1: Total Assessed
      stream += '0.96 0.98 1.0 rg 30 ' + cardsY + ' ' + cardW + ' ' + cardH + ' re f\n';
      stream += '0.82 0.87 0.94 RG 0.6 w 30 ' + cardsY + ' ' + cardW + ' ' + cardH + ' re S\n';
      stream += 'BT /F2 7 Tf 0.35 0.42 0.55 rg 40 ' + (cardsY + 24) + ' Td (TOTAL ASSESSED FEE) Tj ET\n';
      stream += 'BT /F2 11 Tf 0.08 0.18 0.38 rg 40 ' + (cardsY + 9) + ' Td (Rs. ' + money(totalAssessed) + ') Tj ET\n';

      // Card 2: Total Collected
      stream += '0.94 0.99 0.96 rg 185 ' + cardsY + ' ' + cardW + ' ' + cardH + ' re f\n';
      stream += '0.70 0.90 0.78 RG 0.6 w 185 ' + cardsY + ' ' + cardW + ' ' + cardH + ' re S\n';
      stream += 'BT /F2 7 Tf 0.15 0.50 0.28 rg 195 ' + (cardsY + 24) + ' Td (TOTAL COLLECTED / PAID) Tj ET\n';
      stream += 'BT /F2 11 Tf 0.05 0.50 0.25 rg 195 ' + (cardsY + 9) + ' Td (Rs. ' + money(totalPaid) + ') Tj ET\n';

      // Card 3: Total Outstanding Due
      stream += '1.0 0.96 0.96 rg 340 ' + cardsY + ' ' + cardW + ' ' + cardH + ' re f\n';
      stream += '0.95 0.75 0.75 RG 0.6 w 340 ' + cardsY + ' ' + cardW + ' ' + cardH + ' re S\n';
      stream += 'BT /F2 7 Tf 0.70 0.20 0.20 rg 350 ' + (cardsY + 24) + ' Td (TOTAL OUTSTANDING DUE) Tj ET\n';
      stream += 'BT /F2 11 Tf 0.75 0.15 0.15 rg 350 ' + (cardsY + 9) + ' Td (Rs. ' + money(totalDue) + ') Tj ET\n';

      // Card 4: Advance / Credit
      stream += '0.95 0.97 1.0 rg 495 ' + cardsY + ' ' + cardW + ' ' + cardH + ' re f\n';
      stream += '0.75 0.85 0.95 RG 0.6 w 495 ' + cardsY + ' ' + cardW + ' ' + cardH + ' re S\n';
      stream += 'BT /F2 7 Tf 0.20 0.40 0.70 rg 505 ' + (cardsY + 24) + ' Td (TOTAL ADVANCE / CREDIT) Tj ET\n';
      stream += 'BT /F2 11 Tf 0.12 0.38 0.75 rg 505 ' + (cardsY + 9) + ' Td (Rs. ' + money(totalCredit) + ') Tj ET\n';

      // Signatory Block (Right side)
      stream += '0.70 0.75 0.85 RG 0.8 w 660 ' + (cardsY + 18) + ' 152 0 re S\n';
      stream += 'BT /F2 8 Tf 0.10 0.15 0.25 rg 675 ' + (cardsY + 6) + ' Td (Authorized Signatory) Tj ET\n';
      stream += 'BT /F1 7 Tf 0.40 0.45 0.55 rg 680 ' + (cardsY - 4) + ' Td (Accounts Department) Tj ET\n';
    }

    // Page Footer Bar (at bottom Y = 38)
    stream += '0.85 0.89 0.94 RG 0.5 w 30 38 782 0 re S\n';
    stream += 'BT /F1 7 Tf 0.45 0.50 0.55 rg 32 28 Td (Generated on: ' + sanitize(genDateStr) + ' at ' + sanitize(genTimeStr) + ' | Arihant Public School ERP · Fee Ledger Statement) Tj ET\n';
    stream += 'BT /F2 7.5 Tf 0.35 0.42 0.55 rg 745 28 Td (Page ' + pageNum + ' of ' + numPages + ') Tj ET\n';

    pageStreams.push(stream);
  }

  // Build PDF-1.4 file
  const enc = new TextEncoder();
  const N = numPages;

  const header = '%PDF-1.4\n';
  const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';

  // Obj 2: Pages
  const kidsStr = Array.from({ length: N }, (_, i) => `${3 + i} 0 R`).join(' ');
  const obj2 = `2 0 obj\n<< /Type /Pages /Kids [${kidsStr}] /Count ${N} >>\nendobj\n`;

  // Page objects (3 to 2+N)
  const font1Id = 2 * N + 3;
  const font2Id = 2 * N + 4;
  let pageObjs = '';
  for (let p = 1; p <= N; p++) {
    const pageObjId = 2 + p;
    const contentObjId = 2 + N + p;
    pageObjs += `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Contents ${contentObjId} 0 R /Resources << /Font << /F1 ${font1Id} 0 R /F2 ${font2Id} 0 R >> >> >>\nendobj\n`;
  }

  // Content Stream objects (3+N to 2+2N)
  let contentObjs = '';
  for (let p = 1; p <= N; p++) {
    const contentObjId = 2 + N + p;
    const streamStr = pageStreams[p - 1];
    const streamLen = enc.encode(streamStr).length;
    contentObjs += `${contentObjId} 0 obj\n<< /Length ${streamLen} >>\nstream\n${streamStr}\nendstream\nendobj\n`;
  }

  // Font objects
  const objFont1 = `${font1Id} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;
  const objFont2 = `${font2Id} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`;

  // Offsets calculation
  const totalObjCount = 2 * N + 4;
  const objStrings: string[] = [
    '', // 0 is dummy
    obj1,
    obj2,
  ];

  for (let p = 1; p <= N; p++) {
    const pageObjId = 2 + p;
    const contentObjId = 2 + N + p;
    const pageStr = `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Contents ${contentObjId} 0 R /Resources << /Font << /F1 ${font1Id} 0 R /F2 ${font2Id} 0 R >> >> >>\nendobj\n`;
    objStrings.push(pageStr);
  }

  for (let p = 1; p <= N; p++) {
    const contentObjId = 2 + N + p;
    const streamStr = pageStreams[p - 1];
    const streamLen = enc.encode(streamStr).length;
    const contentStr = `${contentObjId} 0 obj\n<< /Length ${streamLen} >>\nstream\n${streamStr}\nendstream\nendobj\n`;
    objStrings.push(contentStr);
  }

  objStrings.push(objFont1);
  objStrings.push(objFont2);

  const offsets: number[] = [0];
  let currentOffset = enc.encode(header).length;

  for (let i = 1; i <= totalObjCount; i++) {
    offsets.push(currentOffset);
    currentOffset += enc.encode(objStrings[i]).length;
  }

  const startxref = currentOffset;

  let xref = `xref\n0 ${totalObjCount + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= totalObjCount; i++) {
    xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }

  const trailer = `trailer\n<< /Size ${totalObjCount + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;

  let pdfContent = header;
  for (let i = 1; i <= totalObjCount; i++) {
    pdfContent += objStrings[i];
  }
  pdfContent += xref + trailer;

  return pdfContent;
}

export function downloadFeeReportPdf(data: FeeReportData): void {
  try {
    const pdf = generateFeeReportPdfString(data);
    if (typeof document !== 'undefined') {
      const blob = new Blob([pdf], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const classPart = (data.filterClass || 'All_Classes').replace(/[^a-zA-Z0-9_-]/g, '_');
      const secPart = (data.filterSection || 'All_Sections').replace(/[^a-zA-Z0-9_-]/g, '_');
      const cleanName = `Fee_Report_${classPart}_${secPart}`;
      a.download = `${cleanName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
  } catch (err) {
    console.error('Failed to generate fee report PDF:', err);
  }
}
