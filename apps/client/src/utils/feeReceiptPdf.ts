export interface FeeReceiptData {
  receiptNo: string;
  paymentDate?: string | Date;
  amount: number | string;
  method?: string;
  status?: string;
  reference?: string;
  remarks?: string;
  studentName?: string;
  studentId?: string;
  rollNumber?: string | number;
  className?: string;
  sectionName?: string;
  academicYear?: string;
  assessed?: number | string;
  netPaid?: number | string;
  outstanding?: number | string;
  creditBalance?: number | string;
  schoolName?: string;
}

function numberToWords(num: number): string {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const n = Math.floor(Math.abs(num));
  if (n === 0) return 'Rupees Zero Only';

  function convert(n: number): string {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + convert(n % 10000000) : '');
  }

  return 'Rupees ' + convert(n).trim() + ' Only';
}

export function generateFeeReceiptPdfString(data: FeeReceiptData): string {
  const sanitize = (str: any) =>
    String(str ?? '-')
      .replace(/[\u2014\u2013]/g, '-')
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/[\r\n]+/g, ' ')
      .replace(/[^\x20-\x7E]/g, '');

  const money = (val: any) => Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const dateFormatted = (val: any) => {
    if (!val) return '-';
    try {
      return new Date(val).toLocaleDateString('en-IN');
    } catch {
      return String(val);
    }
  };

  const schoolName = data.schoolName || 'Arihant Public School';
  const receiptNo = data.receiptNo || 'APS-RCP-0000000';
  const paymentDate = data.paymentDate || new Date();
  const method = String(data.method || 'ONLINE').replace('_', ' ');
  const status = String(data.status || 'SUCCESS').replace('_', ' ');
  const amountNum = Number(data.amount || 0);
  const reference = data.reference || '';
  const remarks = data.remarks || '';
  const studentName = data.studentName || 'Student';
  const studentId = data.studentId || '-';
  const rollNumber = data.rollNumber ? String(data.rollNumber) : '';
  const academicYear = data.academicYear || 'Current Academic Year';
  const secPart = data.sectionName
    ? (data.sectionName.toLowerCase().startsWith('sec') ? data.sectionName : `Section ${data.sectionName}`)
    : '';
  const classSecStr = [data.className, secPart].filter(Boolean).join(' - ') || (data.className || 'Class 1 - Section A');
  const assessed = Number(data.assessed || 0);
  const netPaid = Number(data.netPaid || 0);
  const outstanding = Number(data.outstanding || 0);
  const creditBalance = Number(data.creditBalance || 0);

  let stream = '';

  // Background and borders
  stream += '1 1 1 rg 0 0 595 842 re f\n';
  stream += '0.08 0.16 0.35 RG 1.2 w 30 30 535 782 re S\n';
  stream += '0.80 0.85 0.92 RG 0.6 w 34 34 527 774 re S\n';

  const isReversed = String(data.status || '').toUpperCase() === 'REVERSED';

  // 1. Header Banner
  stream += '0.06 0.15 0.32 rg 34 736 527 72 re f\n';
  stream += 'BT /F2 18 Tf 1 1 1 rg 50 782 Td (' + sanitize(schoolName.toUpperCase()) + ') Tj ET\n';
  stream += 'BT /F1 8.5 Tf 0.82 0.89 0.98 rg 50 768 Td (CBSE AFFILIATED SENIOR SECONDARY SCHOOL) Tj ET\n';
  stream += 'BT /F1 7.5 Tf 0.70 0.80 0.95 rg 50 754 Td (Official School Fee Management Portal · Fee Receipt & Acknowledgement) Tj ET\n';

  // Header Right Badge
  if (isReversed) {
    stream += '0.80 0.15 0.15 rg 415 748 135 48 re f\n';
    stream += '0.95 0.40 0.40 RG 0.8 w 415 748 135 48 re S\n';
    stream += 'BT /F2 11 Tf 1 1 1 rg 422 775 Td (VOID / CANCELLED) Tj ET\n';
    stream += 'BT /F1 8 Tf 1 0.90 0.90 rg 432 758 Td (Reversed Transaction) Tj ET\n';
  } else {
    stream += '0.12 0.28 0.58 rg 415 748 135 48 re f\n';
    stream += '0.35 0.55 0.85 RG 0.8 w 415 748 135 48 re S\n';
    stream += 'BT /F2 11 Tf 1 1 1 rg 432 775 Td (FEE RECEIPT) Tj ET\n';
    stream += 'BT /F1 8 Tf 0.85 0.93 1 rg 432 758 Td (Student / Parent Copy) Tj ET\n';
  }

  // 2. Receipt Details Cards (Side by Side)
  // Left: Receipt Info
  stream += '0.96 0.98 1.0 rg 45 608 245 112 re f\n';
  stream += '0.82 0.87 0.94 RG 0.5 w 45 608 245 112 re S\n';
  stream += '0.12 0.22 0.42 rg 45 698 245 22 re f\n';
  stream += 'BT /F2 8.5 Tf 1 1 1 rg 55 705 Td (RECEIPT & PAYMENT DETAILS) Tj ET\n';

  stream += 'BT /F2 8 Tf 0.35 0.40 0.50 rg 55 684 Td (Receipt Number:) Tj ET\n';
  stream += 'BT /F2 8.5 Tf 0.06 0.15 0.35 rg 135 684 Td (' + sanitize(receiptNo) + ') Tj ET\n';

  stream += 'BT /F2 8 Tf 0.35 0.40 0.50 rg 55 668 Td (Payment Date:) Tj ET\n';
  stream += 'BT /F1 8.5 Tf 0.10 0.15 0.25 rg 135 668 Td (' + sanitize(dateFormatted(paymentDate)) + ') Tj ET\n';

  stream += 'BT /F2 8 Tf 0.35 0.40 0.50 rg 55 652 Td (Payment Mode:) Tj ET\n';
  stream += 'BT /F2 8.5 Tf 0.10 0.15 0.25 rg 135 652 Td (' + sanitize(method) + ') Tj ET\n';

  stream += 'BT /F2 8 Tf 0.35 0.40 0.50 rg 55 636 Td (Transaction Ref:) Tj ET\n';
  stream += 'BT /F1 8 Tf 0.20 0.25 0.35 rg 135 636 Td (' + sanitize(reference || remarks || '-') + ') Tj ET\n';

  stream += 'BT /F2 8 Tf 0.35 0.40 0.50 rg 55 620 Td (Receipt Status:) Tj ET\n';
  if (isReversed) {
    stream += 'BT /F2 8.5 Tf 0.85 0.15 0.15 rg 135 620 Td (CANCELLED / REVERSED) Tj ET\n';
  } else {
    stream += 'BT /F2 8.5 Tf 0.05 0.50 0.25 rg 135 620 Td (' + sanitize(status) + ' VERIFIED) Tj ET\n';
  }

  // Right: Student Info
  stream += '0.96 0.98 1.0 rg 305 608 245 112 re f\n';
  stream += '0.82 0.87 0.94 RG 0.5 w 305 608 245 112 re S\n';
  stream += '0.12 0.22 0.42 rg 305 698 245 22 re f\n';
  stream += 'BT /F2 8.5 Tf 1 1 1 rg 315 705 Td (STUDENT INFORMATION) Tj ET\n';

  stream += 'BT /F2 8 Tf 0.35 0.40 0.50 rg 315 684 Td (Student Name:) Tj ET\n';
  stream += 'BT /F2 8.5 Tf 0.06 0.15 0.35 rg 395 684 Td (' + sanitize(studentName) + ') Tj ET\n';

  stream += 'BT /F2 8 Tf 0.35 0.40 0.50 rg 315 668 Td (Student ID:) Tj ET\n';
  stream += 'BT /F1 8.5 Tf 0.10 0.15 0.25 rg 395 668 Td (' + sanitize(studentId) + ') Tj ET\n';

  stream += 'BT /F2 8 Tf 0.35 0.40 0.50 rg 315 652 Td (Roll Number:) Tj ET\n';
  stream += 'BT /F1 8.5 Tf 0.10 0.15 0.25 rg 395 652 Td (' + sanitize(rollNumber || '-') + ') Tj ET\n';

  stream += 'BT /F2 8 Tf 0.35 0.40 0.50 rg 315 636 Td (Class & Section:) Tj ET\n';
  stream += 'BT /F1 8.5 Tf 0.10 0.15 0.25 rg 395 636 Td (' + sanitize(classSecStr) + ') Tj ET\n';

  stream += 'BT /F2 8 Tf 0.35 0.40 0.50 rg 315 620 Td (Academic Year:) Tj ET\n';
  stream += 'BT /F1 8.5 Tf 0.10 0.15 0.25 rg 395 620 Td (' + sanitize(academicYear) + ') Tj ET\n';

  // 3. Particulars Table
  stream += '0.08 0.18 0.36 rg 45 575 505 22 re f\n';
  stream += 'BT /F2 8.5 Tf 1 1 1 rg 55 582 Td (#) Tj ET\n';
  stream += 'BT /F2 8.5 Tf 1 1 1 rg 85 582 Td (Fee Description / Particulars) Tj ET\n';
  stream += 'BT /F2 8.5 Tf 1 1 1 rg 300 582 Td (Payment Mode & Reference) Tj ET\n';
  stream += 'BT /F2 8.5 Tf 1 1 1 rg 460 582 Td (Amount) Tj ET\n';

  // Table Row
  stream += '1 1 1 rg 45 535 505 40 re f\n';
  stream += '0.85 0.89 0.94 RG 0.5 w 45 535 505 40 re S\n';

  stream += 'BT /F1 8.5 Tf 0.2 0.25 0.35 rg 55 554 Td (1) Tj ET\n';
  stream += 'BT /F2 9 Tf 0.05 0.12 0.30 rg 85 558 Td (School Fee Payment · ' + sanitize(academicYear) + ') Tj ET\n';
  stream += 'BT /F1 7.5 Tf 0.45 0.50 0.60 rg 85 544 Td (Receipt No: ' + sanitize(receiptNo) + ') Tj ET\n';

  const refDisplay = reference ? `Ref: ${reference}` : remarks ? `Note: ${remarks}` : 'Direct Receipt';
  stream += 'BT /F1 8 Tf 0.2 0.25 0.35 rg 300 554 Td (' + sanitize(method + ' (' + refDisplay + ')') + ') Tj ET\n';
  stream += 'BT /F2 9.5 Tf 0.05 0.12 0.30 rg 450 554 Td (INR ' + sanitize(money(amountNum)) + ') Tj ET\n';

  // Total Paid Highlight Row
  stream += '0.92 0.95 0.99 rg 45 502 505 33 re f\n';
  stream += '0.15 0.30 0.65 RG 1 w 45 502 505 33 re S\n';
  stream += 'BT /F2 9.5 Tf 0.06 0.15 0.35 rg 85 514 Td (TOTAL AMOUNT RECEIVED IN THIS RECEIPT:) Tj ET\n';
  stream += 'BT /F2 12 Tf 0.05 0.18 0.55 rg 435 513 Td (INR ' + sanitize(money(amountNum)) + ') Tj ET\n';

  // Amount in words Box
  stream += '0.98 0.98 0.99 rg 45 465 505 28 re f\n';
  stream += '0.85 0.89 0.94 RG 0.5 w 45 465 505 28 re S\n';
  stream += 'BT /F2 8 Tf 0.35 0.40 0.50 rg 55 474 Td (Amount in Words:) Tj ET\n';
  stream += 'BT /F2 8.5 Tf 0.06 0.15 0.35 rg 145 474 Td (' + sanitize(numberToWords(amountNum)) + ') Tj ET\n';

  // 4. Student Fee Ledger Summary
  stream += 'BT /F2 9 Tf 0.08 0.16 0.35 rg 45 440 Td (STUDENT FEE ACCOUNT SUMMARY STATUS) Tj ET\n';
  const summaryY = 375;
  const cardW = 120;
  const cardH = 55;

  // Box 1: Total Assessed
  stream += '0.97 0.98 1.0 rg 45 ' + summaryY + ' ' + cardW + ' ' + cardH + ' re f\n';
  stream += '0.82 0.87 0.94 RG 0.5 w 45 ' + summaryY + ' ' + cardW + ' ' + cardH + ' re S\n';
  stream += 'BT /F1 7.5 Tf 0.40 0.45 0.55 rg 55 ' + (summaryY + 38) + ' Td (Total Assessed Fee) Tj ET\n';
  stream += 'BT /F2 10 Tf 0.10 0.15 0.25 rg 55 ' + (summaryY + 18) + ' Td (INR ' + sanitize(money(assessed)) + ') Tj ET\n';

  // Box 2: Total Paid
  stream += '0.95 0.99 0.96 rg 173 ' + summaryY + ' ' + cardW + ' ' + cardH + ' re f\n';
  stream += '0.70 0.88 0.75 RG 0.5 w 173 ' + summaryY + ' ' + cardW + ' ' + cardH + ' re S\n';
  stream += 'BT /F1 7.5 Tf 0.20 0.50 0.30 rg 183 ' + (summaryY + 38) + ' Td (Total Fee Paid) Tj ET\n';
  stream += 'BT /F2 10 Tf 0.05 0.55 0.20 rg 183 ' + (summaryY + 18) + ' Td (INR ' + sanitize(money(netPaid)) + ') Tj ET\n';

  // Box 3: Remaining Due
  stream += '0.99 0.96 0.96 rg 301 ' + summaryY + ' ' + cardW + ' ' + cardH + ' re f\n';
  stream += '0.92 0.78 0.78 RG 0.5 w 301 ' + summaryY + ' ' + cardW + ' ' + cardH + ' re S\n';
  stream += 'BT /F1 7.5 Tf 0.60 0.25 0.25 rg 311 ' + (summaryY + 38) + ' Td (Remaining Due) Tj ET\n';
  stream += 'BT /F2 10 Tf 0.75 0.15 0.15 rg 311 ' + (summaryY + 18) + ' Td (INR ' + sanitize(money(outstanding)) + ') Tj ET\n';

  // Box 4: Credit Balance
  stream += '0.99 0.98 0.93 rg 430 ' + summaryY + ' ' + cardW + ' ' + cardH + ' re f\n';
  stream += '0.92 0.85 0.65 RG 0.5 w 430 ' + summaryY + ' ' + cardW + ' ' + cardH + ' re S\n';
  stream += 'BT /F1 7.5 Tf 0.60 0.45 0.10 rg 440 ' + (summaryY + 38) + ' Td (Advance / Credit) Tj ET\n';
  stream += 'BT /F2 10 Tf 0.65 0.45 0.05 rg 440 ' + (summaryY + 18) + ' Td (INR ' + sanitize(money(creditBalance)) + ') Tj ET\n';

  // 5. Remarks Box
  if (remarks || reference) {
    stream += '0.98 0.98 0.99 rg 45 325 505 38 re f\n';
    stream += '0.85 0.89 0.94 RG 0.5 w 45 325 505 38 re S\n';
    stream += 'BT /F2 7.5 Tf 0.35 0.40 0.50 rg 55 348 Td (TRANSACTION REMARKS / NOTES:) Tj ET\n';
    const noteText = [reference ? `Reference: ${reference}` : '', remarks ? `Remarks: ${remarks}` : ''].filter(Boolean).join(' | ');
    stream += 'BT /F1 8 Tf 0.10 0.15 0.25 rg 55 334 Td (' + sanitize(noteText) + ') Tj ET\n';
  }

  // 6. Terms & Signature Section
  const termsY = 120;
  // Left: Instructions
  stream += '0.97 0.98 1.0 rg 45 ' + termsY + ' 310 185 re f\n';
  stream += '0.82 0.87 0.94 RG 0.5 w 45 ' + termsY + ' 310 185 re S\n';
  stream += 'BT /F2 8.5 Tf 0.10 0.20 0.40 rg 55 ' + (termsY + 168) + ' Td (IMPORTANT RECEIPT TERMS & NOTES) Tj ET\n';
  stream += 'BT /F1 7.5 Tf 0.30 0.35 0.45 rg 55 ' + (termsY + 150) + ' Td (1. This receipt confirms verified credit to the student fee account.) Tj ET\n';
  stream += 'BT /F1 7.5 Tf 0.30 0.35 0.45 rg 55 ' + (termsY + 135) + ' Td (2. Any extra payment is credited towards advance fees.) Tj ET\n';
  stream += 'BT /F1 7.5 Tf 0.30 0.35 0.45 rg 55 ' + (termsY + 120) + ' Td (3. Please preserve this document for academic and tax records.) Tj ET\n';
  stream += 'BT /F1 7.5 Tf 0.30 0.35 0.45 rg 55 ' + (termsY + 105) + ' Td (4. Fees once paid are subject to institutional fee policies.) Tj ET\n';
  stream += 'BT /F1 7.5 Tf 0.30 0.35 0.45 rg 55 ' + (termsY + 90) + ' Td (5. For discrepancies, reach accounts office within 7 working days.) Tj ET\n';
  stream += 'BT /F2 7.5 Tf 0.08 0.18 0.38 rg 55 ' + (termsY + 68) + ' Td (Official ERP Digital Acknowledgment) Tj ET\n';
  stream += 'BT /F1 7 Tf 0.40 0.45 0.55 rg 55 ' + (termsY + 54) + ' Td (Generated securely via Arihant Public School ERP Portal.) Tj ET\n';
  stream += 'BT /F1 7 Tf 0.40 0.45 0.55 rg 55 ' + (termsY + 40) + ' Td (System validated transaction - physical signature optional.) Tj ET\n';

  // Right: Seal & Stamp Box
  stream += '1 1 1 rg 365 ' + termsY + ' 185 185 re f\n';
  stream += '0.82 0.87 0.94 RG 0.5 w 365 ' + termsY + ' 185 185 re S\n';

  // Simulated Seal Badge
  if (isReversed) {
    stream += '0.99 0.94 0.94 rg 385 ' + (termsY + 85) + ' 145 75 re f\n';
    stream += '0.80 0.20 0.20 RG 0.8 w 385 ' + (termsY + 85) + ' 145 75 re S\n';
    stream += '0.80 0.20 0.20 RG 0.5 w 388 ' + (termsY + 88) + ' 139 69 re S\n';
    stream += 'BT /F2 8 Tf 0.80 0.15 0.15 rg 400 ' + (termsY + 138) + ' Td (ARIHANT PUBLIC SCHOOL) Tj ET\n';
    stream += 'BT /F2 7.5 Tf 0.85 0.10 0.10 rg 395 ' + (termsY + 122) + ' Td (CANCELLED / REVERSED) Tj ET\n';
    stream += 'BT /F1 7 Tf 0.50 0.20 0.20 rg 415 ' + (termsY + 106) + ' Td (ACCOUNTS OFFICE) Tj ET\n';
    stream += 'BT /F1 6.5 Tf 0.50 0.20 0.20 rg 405 ' + (termsY + 92) + ' Td (' + sanitize(dateFormatted(paymentDate)) + ') Tj ET\n';
  } else {
    stream += '0.94 0.97 1.0 rg 385 ' + (termsY + 85) + ' 145 75 re f\n';
    stream += '0.20 0.40 0.70 RG 0.8 w 385 ' + (termsY + 85) + ' 145 75 re S\n';
    stream += '0.20 0.40 0.70 RG 0.5 w 388 ' + (termsY + 88) + ' 139 69 re S\n';
    stream += 'BT /F2 8 Tf 0.08 0.18 0.40 rg 400 ' + (termsY + 138) + ' Td (ARIHANT PUBLIC SCHOOL) Tj ET\n';
    stream += 'BT /F2 7.5 Tf 0.05 0.50 0.20 rg 410 ' + (termsY + 122) + ' Td (FEE VERIFIED / PAID) Tj ET\n';
    stream += 'BT /F1 7 Tf 0.35 0.40 0.50 rg 415 ' + (termsY + 106) + ' Td (ACCOUNTS OFFICE) Tj ET\n';
    stream += 'BT /F1 6.5 Tf 0.40 0.45 0.55 rg 405 ' + (termsY + 92) + ' Td (' + sanitize(dateFormatted(paymentDate)) + ') Tj ET\n';
  }

  // Signatory Line
  stream += '0.70 0.75 0.85 RG 0.8 w 385 ' + (termsY + 38) + ' 145 0 re S\n';
  stream += 'BT /F2 8 Tf 0.10 0.15 0.25 rg 400 ' + (termsY + 25) + ' Td (Authorized Signatory) Tj ET\n';
  stream += 'BT /F1 7 Tf 0.40 0.45 0.55 rg 405 ' + (termsY + 14) + ' Td (Accounts Department) Tj ET\n';

  // 7. Footer
  const dateStr = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  stream += '0.85 0.89 0.94 RG 0.5 w 45 60 505 0 re S\n';
  stream += 'BT /F1 7 Tf 0.45 0.50 0.55 rg 45 48 Td (Generated on: ' + sanitize(dateStr) + ' | Arihant Public School ERP | Receipt: ' + sanitize(receiptNo) + ') Tj ET\n';
  stream += 'BT /F1 7 Tf 0.45 0.50 0.55 rg 490 48 Td (Page 1 of 1) Tj ET\n';

  const enc = new TextEncoder();
  const streamBytes = enc.encode(stream);

  const header = '%PDF-1.4\n';
  const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
  const obj3 = '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n';
  const obj4 = '4 0 obj\n<< /Length ' + streamBytes.length + ' >>\nstream\n' + stream + '\nendstream\nendobj\n';
  const obj5 = '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';
  const obj6 = '6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n';

  const o1 = enc.encode(header).length;
  const o2 = o1 + enc.encode(obj1).length;
  const o3 = o2 + enc.encode(obj2).length;
  const o4 = o3 + enc.encode(obj3).length;
  const o5 = o4 + enc.encode(obj4).length;
  const o6 = o5 + enc.encode(obj5).length;
  const startxref = o6 + enc.encode(obj6).length;

  let xref = 'xref\n0 7\n0000000000 65535 f \n';
  xref += String(o1).padStart(10, '0') + ' 00000 n \n';
  xref += String(o2).padStart(10, '0') + ' 00000 n \n';
  xref += String(o3).padStart(10, '0') + ' 00000 n \n';
  xref += String(o4).padStart(10, '0') + ' 00000 n \n';
  xref += String(o5).padStart(10, '0') + ' 00000 n \n';
  xref += String(o6).padStart(10, '0') + ' 00000 n \n';
  xref += 'trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n' + startxref + '\n%%EOF\n';

  return header + obj1 + obj2 + obj3 + obj4 + obj5 + obj6 + xref;
}

export function downloadFeeReceiptPdf(data: FeeReceiptData): void {
  try {
    const pdf = generateFeeReceiptPdfString(data);
    if (typeof document !== 'undefined') {
      const blob = new Blob([pdf], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanName = (data.receiptNo || 'Fee_Receipt').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `${cleanName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
  } catch (err) {
    console.error('Failed to generate fee receipt PDF:', err);
  }
}
