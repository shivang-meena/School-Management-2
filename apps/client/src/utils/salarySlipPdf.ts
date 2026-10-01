import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PreviousDueBreakdownItem {
  month: number;
  year: number;
  monthLabel: string;
  balance: number;
  isDue: boolean;
  isAdvance: boolean;
  note?: string;
}

export interface SalarySlipPdfData {
  employeeId: string;
  name: string;
  designation?: string;
  subRole?: string;
  month: number;
  year: number;
  monthLabel: string;
  grossAmount: number;
  deductionAmount: number;
  absenceDeduction?: number;
  lateDeduction?: number;
  lateCount?: number;
  deductionUnits?: number;
  previousBalance: number;
  previousDuesBreakdown?: PreviousDueBreakdownItem[];
  joinedMidMonthNote?: string;
  effectivePayable: number;
  paidAmount: number;
  remainingDue: number;
  advanceCredit: number;
  paymentMethod?: string;
  paymentReference?: string;
  paymentDate?: string;
  attendanceStatuses?: Record<string, number>;
  schoolName?: string;
}

export function downloadSalarySlipPdf(data: SalarySlipPdfData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  const money = (val: any) =>
    'Rs. ' + Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── 1. Header Box ──
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, margin, pageWidth - margin * 2, 28, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(data.schoolName || 'ARIHANT PUBLIC SCHOOL', pageWidth / 2, margin + 9, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text('CAMPUS MANAGEMENT SYSTEM • STAFF PAYROLL & DISBURSEMENT', pageWidth / 2, margin + 15, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(251, 191, 36); // amber-400
  doc.text(`SALARY SLIP FOR ${data.monthLabel.toUpperCase()}`, pageWidth / 2, margin + 22, { align: 'center' });

  // ── 2. Employee & Pay Period Details ──
  let curY = margin + 33;
  const colW = (pageWidth - margin * 2) / 2;

  const empDetails = [
    ['Employee ID:', data.employeeId || '—', 'Pay Period:', data.monthLabel],
    ['Staff Name:', data.name || '—', 'Designation / Role:', `${data.designation || 'Staff'} (${data.subRole || 'General'})`],
    ['Slip Issue Date:', new Date().toLocaleDateString('en-IN'), 'Payment Mode:', data.paymentMethod || 'CASH'],
  ];

  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: margin },
    theme: 'plain',
    body: empDetails,
    styles: {
      fontSize: 8.5,
      cellPadding: 2,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [100, 116, 139], cellWidth: 32 },
      1: { fontStyle: 'bold', textColor: [15, 23, 42], cellWidth: colW - 32 },
      2: { fontStyle: 'bold', textColor: [100, 116, 139], cellWidth: 34 },
      3: { fontStyle: 'bold', textColor: [15, 23, 42], cellWidth: colW - 34 },
    },
  });

  curY = (doc as any).lastAutoTable.finalY + 3;

  // ── 3. Attendance Summary Card ──
  const statuses = data.attendanceStatuses || {};
  const presentCount = statuses.PRESENT || 0;
  const absentCount = statuses.ABSENT || 0;
  const halfDayCount = statuses.HALF_DAY || 0;
  const lateCount = data.lateCount ?? (statuses.LATE || 0);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, curY, pageWidth - margin * 2, 12, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('MONTHLY ATTENDANCE SUMMARY (30 DAYS BASIS):', margin + 4, curY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(
    `Present: ${presentCount} Days   |   Absent: ${absentCount} Days   |   Half-Days: ${halfDayCount}   |   Late Marks: ${lateCount} (Rs. 100/late)`,
    margin + 4,
    curY + 9
  );

  curY += 16;

  // ── 4. Earnings and Deductions Table ──
  const absenceAmt = data.absenceDeduction ?? ((data.grossAmount / 30) * (data.deductionUnits || (absentCount + halfDayCount * 0.5)));
  const lateAmt = data.lateDeduction ?? (lateCount * 100);

  const earningsVsDeductions = [
    [
      'Basic Monthly Salary' + (data.joinedMidMonthNote ? ` (${data.joinedMidMonthNote})` : ''),
      money(data.grossAmount),
      `Absence Deduction (${absentCount} A + ${halfDayCount} HD)`,
      money(absenceAmt),
    ],
    [
      '',
      '',
      `Late Arrival Fine (${lateCount} Late @ Rs.100)`,
      money(lateAmt),
    ],
    [
      'Gross Total Earnings (A)',
      money(data.grossAmount),
      'Total Attendance Deductions (B)',
      money(data.deductionAmount),
    ],
  ];

  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: margin },
    head: [['EARNINGS', 'AMOUNT (INR)', 'DEDUCTIONS', 'AMOUNT (INR)']],
    body: earningsVsDeductions,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 36, halign: 'right' },
      2: { cellWidth: 55 },
      3: { cellWidth: 36, halign: 'right' },
    },
    didParseCell: (hookData) => {
      if (hookData.section === 'body' && hookData.row.index === 2) {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fillColor = [241, 245, 249];
      }
    },
  });

  curY = (doc as any).lastAutoTable.finalY + 4;

  // ── 5. Carry Forward & Net Settlement Table ──
  const prevBal = data.previousBalance || 0;
  const netPayableBox: any[] = [
    ['Gross Salary This Month (A)', money(data.grossAmount)],
    ['Less Total Attendance Deductions (B)', `- ${money(data.deductionAmount)}`],
    ['Net Earnings This Month (A - B)', money(Math.max(0, data.grossAmount - data.deductionAmount))],
  ];

  if (data.previousDuesBreakdown && data.previousDuesBreakdown.length > 0) {
    data.previousDuesBreakdown.forEach((due) => {
      const sign = due.balance > 0 ? '+ ' : '- ';
      const statusLabel = due.balance > 0 ? 'Due' : 'Advance';
      const detail = due.note ? ` [${due.note}]` : '';
      netPayableBox.push([
        `Previous Month Adjustment: ${due.monthLabel}${detail} (${statusLabel})`,
        `${sign}${money(Math.abs(due.balance))}`,
      ]);
    });
  } else if (prevBal !== 0) {
    netPayableBox.push([
      'Previous Month Adjustment (Carry-Forward)',
      prevBal > 0 ? `+ ${money(prevBal)} (Due)` : `- ${money(Math.abs(prevBal))} (Advance)`,
    ]);
  } else {
    netPayableBox.push([
      'Previous Month Adjustment (Carry-Forward)',
      'NIL (Rs. 0.00)',
    ]);
  }

  const finalPayableIndex = netPayableBox.length;
  netPayableBox.push(['FINAL NET PAYABLE TO STAFF', money(data.effectivePayable)]);

  const paidDetail = data.paymentDate
    ? `Amount Paid So Far (${data.paymentMethod || 'CASH'} on ${new Date(data.paymentDate).toLocaleDateString('en-IN')}${data.paymentReference ? ` | Ref: ${data.paymentReference}` : ''})`
    : 'Amount Paid / Disbursed So Far';
  netPayableBox.push([paidDetail, money(data.paidAmount)]);

  const balanceIndex = netPayableBox.length;
  netPayableBox.push([
    data.remainingDue > 0 ? 'OUTSTANDING BALANCE DUE' : 'BALANCE STATUS',
    data.remainingDue > 0
      ? `${money(data.remainingDue)} (PENDING)`
      : data.advanceCredit > 0
      ? `${money(data.advanceCredit)} (ADVANCE CREDIT CARRIED TO NEXT MONTH)`
      : 'FULLY SETTLED (NIL)',
  ]);

  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: margin },
    head: [['PAYROLL SETTLEMENT & RUNNING LEDGER SUMMARY', 'AMOUNT (INR)']],
    body: netPayableBox,
    theme: 'grid',
    headStyles: {
      fillColor: [51, 65, 85],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 135 },
      1: { cellWidth: 47, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (hookData) => {
      if (hookData.section === 'body') {
        if (hookData.row.index === finalPayableIndex) {
          hookData.cell.styles.fillColor = [254, 243, 199]; // amber light
          hookData.cell.styles.fontStyle = 'bold';
          hookData.cell.styles.textColor = [146, 64, 14];
        } else if (hookData.row.index === balanceIndex) {
          hookData.cell.styles.fillColor = data.remainingDue > 0 ? [254, 226, 226] : [220, 252, 231];
          hookData.cell.styles.fontStyle = 'bold';
          hookData.cell.styles.textColor = data.remainingDue > 0 ? [153, 27, 27] : [22, 101, 52];
        }
      }
    },
  });

  curY = (doc as any).lastAutoTable.finalY + 4;

  // ── 6. Payment Transaction Notes ──
  if (data.paidAmount > 0) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, curY, pageWidth - margin * 2, 10, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const txDate = data.paymentDate ? `on ${new Date(data.paymentDate).toLocaleDateString('en-IN')}` : '';
    const txRef = data.paymentReference ? `| Ref: ${data.paymentReference}` : '';
    doc.text(
      `Disbursement Details: Received ${money(data.paidAmount)} via ${data.paymentMethod || 'CASH'} ${txDate} ${txRef}.`,
      margin + 4,
      curY + 6
    );
    curY += 14;
  } else {
    curY += 6;
  }

  // ── 7. Signatures ──
  const sigY = pageHeight - 32;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);

  // Left: Employee
  doc.line(margin + 5, sigY, margin + 45, sigY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Employee Signature', margin + 10, sigY + 4.5);

  // Middle: Accountant
  doc.line(pageWidth / 2 - 20, sigY, pageWidth / 2 + 20, sigY);
  doc.text('Accountant / HR In-charge', pageWidth / 2 - 18, sigY + 4.5);

  // Right: Principal
  doc.line(pageWidth - margin - 45, sigY, pageWidth - margin - 5, sigY);
  doc.text('Principal / Authorized Seal', pageWidth - margin - 42, sigY + 4.5);

  // ── 8. Disclaimer Footer ──
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'This is an official computer-generated salary statement issued by Arihant Public School. All transactions are permanently audited.',
    pageWidth / 2,
    pageHeight - 12,
    { align: 'center' }
  );

  // ── 9. Save PDF ──
  const cleanId = (data.employeeId || 'EMP').replace(/[^a-zA-Z0-9]/g, '_');
  const cleanMonth = `${data.month}_${data.year}`;
  doc.save(`SalarySlip_${cleanId}_${cleanMonth}.pdf`);
}
