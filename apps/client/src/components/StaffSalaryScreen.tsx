import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { colors, radius } from '../theme';
import { useTheme, THEME_PALETTES, ThemeColors } from '../context/ThemeContext';
import { downloadSalarySlipPdf, SalarySlipPdfData } from '../utils/salarySlipPdf';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function formatRupees(val: number | string | undefined | null): string {
  const num = Number(val || 0);
  return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function formatDate(val: any): string {
  if (!val) return '—';
  try {
    return new Date(val).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(val);
  }
}

export function StaffSalaryScreen() {
  const { user } = useAuth();
  const { isDark, colors: tc } = useTheme();
  const s = getThemedStyles(isDark);
  const [selectedMonthSalary, setSelectedMonthSalary] = useState<any | null>(null);
  const [activeModal, setActiveModal] = useState<'SLIP' | 'RECEIPTS' | null>(null);

  // Fetch employee's own salary data
  const { data, isLoading, isError, refetch } = useQuery<{
    employee: any;
    currentSalary: number;
    salaries: any[];
  }>({
    queryKey: ['my-salary'],
    queryFn: async () => {
      const res = await api.get('/salary/my-salary');
      return res.data;
    },
  });

  const employee = data?.employee;
  const salaries = data?.salaries || [];
  const latestSalary = salaries[0] || null;

  const closeModal = () => {
    setActiveModal(null);
    setSelectedMonthSalary(null);
  };

  const handleOpenSlip = (salaryItem: any) => {
    setSelectedMonthSalary(salaryItem);
    setActiveModal('SLIP');
  };

  const handleOpenReceipts = (salaryItem: any) => {
    setSelectedMonthSalary(salaryItem);
    setActiveModal('RECEIPTS');
  };

  // Download official PDF salary slip
  const handleDownloadPdf = (salaryItem: any) => {
    const snapshot = (salaryItem?.snapshot as any) || {};
    const slipData: SalarySlipPdfData = {
      employeeId: employee?.employeeId || user?.employeeId || 'EMP',
      name: employee?.name || user?.name || 'Staff Member',
      designation: employee?.designation,
      subRole: employee?.subRole,
      month: salaryItem.month,
      year: salaryItem.year,
      monthLabel: `${MONTH_NAMES[salaryItem.month - 1]} ${salaryItem.year}`,
      grossAmount: Number(salaryItem.grossAmount || 0),
      deductionAmount: Number(salaryItem.deductionAmount || 0),
      absenceDeduction: snapshot.absenceDeduction,
      lateDeduction: snapshot.lateDeduction,
      lateCount: snapshot.lateCount,
      deductionUnits: Number(salaryItem.deductionUnits || snapshot.deductionUnits || 0),
      previousBalance: Number(salaryItem.previousBalance || 0),
      previousDuesBreakdown: salaryItem.previousDuesBreakdown || [],
      joinedMidMonthNote: snapshot.joinedMidMonth
        ? `Joined on ${new Date(snapshot.joiningDate).toLocaleDateString('en-IN')}, ${snapshot.daysWorkedInJoiningMonth} days worked`
        : undefined,
      effectivePayable: Number(salaryItem.effectiveTotalPayable || salaryItem.netPayable || 0),
      paidAmount: Number(salaryItem.paidAmount || 0),
      remainingDue: Number(salaryItem.remainingDue || 0),
      advanceCredit: Number(salaryItem.advanceCredit || 0),
      paymentMethod: salaryItem.payments?.[0]?.method || 'CASH',
      paymentReference: salaryItem.payments?.[0]?.reference || undefined,
      paymentDate: salaryItem.payments?.[0]?.paidDate || undefined,
      attendanceStatuses: snapshot.statuses || {},
      schoolName: 'ARIHANT PUBLIC SCHOOL',
    };

    downloadSalarySlipPdf(slipData);
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* ── 1. Top Hero Section ── */}
      <View style={s.hero}>
        <View style={s.heroLeft}>
          <Text style={s.eyebrow}>MY COMPENSATION & DISBURSEMENTS</Text>
          <Text style={s.title}>Salary & Payslips</Text>
          <Text style={s.subtitle}>
            View your monthly salary statements, attendance deductions (₹100/late fine), payment transaction receipts, and download official payslips.
          </Text>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          style={s.refreshBtn}
          onPress={() => refetch()}
        >
          <Ionicons name="refresh-outline" size={16} color={tc.text} />
          <Text style={s.refreshBtnText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* ── 2. Summary KPI Cards ── */}
      {latestSalary ? (
        <View style={s.statsGrid}>
          <View style={[s.statCard, { borderLeftColor: colors.primary }]}>
            <View style={s.statHeader}>
              <Text style={s.statLabel}>CURRENT BASE SALARY</Text>
              <Ionicons name="wallet-outline" size={18} color={colors.primary} />
            </View>
            <Text style={s.statValue}>{formatRupees(data?.currentSalary || employee?.salaryRevisions?.[0]?.amount)}</Text>
            <Text style={s.statMeta}>Monthly sanctioned pay</Text>
          </View>

          <View style={[s.statCard, { borderLeftColor: '#38bdf8' }]}>
            <View style={s.statHeader}>
              <Text style={s.statLabel}>{MONTH_NAMES[latestSalary.month - 1].toUpperCase()} PAYABLE</Text>
              <Ionicons name="calendar-outline" size={18} color="#38bdf8" />
            </View>
            <Text style={s.statValue}>{formatRupees(latestSalary.effectiveTotalPayable)}</Text>
            <Text style={s.statMeta}>
              Net after deductions & dues
            </Text>
          </View>

          <View style={[s.statCard, { borderLeftColor: colors.success }]}>
            <View style={s.statHeader}>
              <Text style={s.statLabel}>AMOUNT RECEIVED</Text>
              <Ionicons name="checkmark-done-circle-outline" size={18} color={colors.success} />
            </View>
            <Text style={[s.statValue, { color: colors.success }]}>{formatRupees(latestSalary.paidAmount)}</Text>
            <Text style={s.statMeta}>
              Disbursed for {MONTH_NAMES[latestSalary.month - 1]}
            </Text>
          </View>

          <View style={[s.statCard, { borderLeftColor: latestSalary.remainingDue > 0 ? colors.warning : '#a78bfa' }]}>
            <View style={s.statHeader}>
              <Text style={s.statLabel}>BALANCE STATUS</Text>
              <Ionicons
                name={latestSalary.remainingDue > 0 ? 'alert-circle-outline' : 'shield-checkmark-outline'}
                size={18}
                color={latestSalary.remainingDue > 0 ? colors.warning : '#a78bfa'}
              />
            </View>
            <Text style={[s.statValue, { color: latestSalary.remainingDue > 0 ? colors.warning : colors.ink }]}>
              {latestSalary.remainingDue > 0
                ? formatRupees(latestSalary.remainingDue)
                : latestSalary.advanceCredit > 0
                ? `+${formatRupees(latestSalary.advanceCredit)} (Adv)`
                : '₹0 (Settled)'}
            </Text>
            <Text style={s.statMeta}>
              {latestSalary.remainingDue > 0 ? 'Pending to be disbursed' : 'No dues pending'}
            </Text>
          </View>
        </View>
      ) : null}

      {/* ── 3. Monthly Statements List ── */}
      <View style={s.listContainer}>
        <Text style={s.sectionTitle}>Monthly Salary Statements & Slips</Text>

        {isLoading ? (
          <View style={s.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={s.loadingText}>Loading your verified salary records...</Text>
          </View>
        ) : isError ? (
          <View style={s.errorContainer}>
            <Ionicons name="alert-circle-outline" size={36} color={colors.danger} />
            <Text style={s.errorTitle}>Could not load salary records</Text>
            <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
              <Text style={s.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : salaries.length === 0 ? (
          <View style={s.emptyContainer}>
            <Ionicons name="receipt-outline" size={48} color={colors.muted} />
            <Text style={s.emptyTitle}>No salary statements available yet</Text>
            <Text style={s.emptySubtitle}>
              Monthly salary calculations will appear here as soon as attendance records and pay periods are processed.
            </Text>
          </View>
        ) : (
          salaries.map((salaryItem: any) => {
            const snapshot = (salaryItem.snapshot as any) || {};
            const att = snapshot.statuses || {};
            const pCount = att.PRESENT || 0;
            const aCount = att.ABSENT || 0;
            const hdCount = att.HALF_DAY || 0;
            const lCount = snapshot.lateCount ?? (att.LATE || 0);

            const isPaid = salaryItem.status === 'PAID';
            const isPartial = salaryItem.status === 'PARTIAL';
            const isUnpaid = salaryItem.status === 'UNPAID';
            const isAdvance = salaryItem.status === 'ADVANCE_COVERED' || salaryItem.status === 'OVERPAID' || salaryItem.advanceCredit > 0;

            const payments = salaryItem.payments || [];
            const prevBal = Number(salaryItem.previousBalance || 0);

            return (
              <View key={salaryItem.id} style={s.monthCard}>
                {/* Card Header */}
                <View style={s.monthCardHeader}>
                  <View>
                    <View style={s.monthTitleRow}>
                      <Text style={s.monthTitle}>
                        {MONTH_NAMES[salaryItem.month - 1]} {salaryItem.year}
                      </Text>
                      {snapshot.joinedMidMonth ? (
                        <View style={s.proRataBadge}>
                          <Text style={s.proRataBadgeText}>
                            Joined {formatDate(snapshot.joiningDate)} ({snapshot.daysWorkedInJoiningMonth} days worked)
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={s.monthMeta}>
                      Base Salary: {formatRupees(salaryItem.grossAmount)}
                    </Text>
                  </View>

                  <View style={s.statusBadgeBox}>
                    {isPaid ? (
                      <View style={s.badgeSuccess}><Text style={s.badgeSuccessText}>PAID</Text></View>
                    ) : isPartial ? (
                      <View style={s.badgeWarning}><Text style={s.badgeWarningText}>PARTIALLY PAID</Text></View>
                    ) : isAdvance ? (
                      <View style={s.badgePurple}><Text style={s.badgePurpleText}>ADVANCE COVERED</Text></View>
                    ) : (
                      <View style={s.badgeDanger}><Text style={s.badgeDangerText}>UNPAID</Text></View>
                    )}
                  </View>
                </View>

                {/* Attendance & Deductions Bar */}
                <View style={s.attBar}>
                  <View style={s.attPillRow}>
                    <View style={s.attPillPresent}><Text style={s.attPillPresentText}>Present: {pCount}d</Text></View>
                    {aCount > 0 ? <View style={s.attPillAbsent}><Text style={s.attPillAbsentText}>Absent: {aCount}d</Text></View> : null}
                    {hdCount > 0 ? <View style={s.attPillHalfDay}><Text style={s.attPillHalfDayText}>Half-Day: {hdCount}</Text></View> : null}
                    {lCount > 0 ? <View style={s.attPillLate}><Text style={s.attPillLateText}>Late: {lCount} (₹100/late)</Text></View> : null}
                  </View>
                  <Text style={s.deductionSummary}>
                    Deductions: <Text style={{ color: salaryItem.deductionAmount > 0 ? colors.danger : colors.muted, fontWeight: '700' }}>
                      {salaryItem.deductionAmount > 0 ? `-${formatRupees(salaryItem.deductionAmount)}` : '₹0'}
                    </Text>
                  </Text>
                </View>

                {/* Previous Dues Breakdown Note (if any) */}
                {salaryItem.previousDuesBreakdown?.length > 0 ? (
                  <View style={s.duesBreakdownBox}>
                    <Text style={s.duesBreakdownTitle}>Pichle Mahino Ka Baki Hisab (Previous Dues Included):</Text>
                    {salaryItem.previousDuesBreakdown.map((due: any, i: number) => (
                      <View key={i} style={s.dueItemRow}>
                        <Text style={s.dueItemText}>
                          • <Text style={{ fontWeight: '700' }}>{due.monthLabel}</Text> {due.note ? `(${due.note})` : ''}
                        </Text>
                        <Text style={[s.dueItemAmount, due.isDue ? { color: colors.warning } : { color: '#a78bfa' }]}>
                          {due.isDue ? `+${formatRupees(due.balance)} Due` : `-${formatRupees(Math.abs(due.balance))} Adv`}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {/* Financial Summary Numbers */}
                <View style={s.figuresRow}>
                  <View style={s.figureCol}>
                    <Text style={s.figureLabel}>FINAL NET PAYABLE</Text>
                    <Text style={[s.figureValue, { color: colors.ink }]}>{formatRupees(salaryItem.effectiveTotalPayable)}</Text>
                  </View>
                  <View style={s.figureCol}>
                    <Text style={s.figureLabel}>RECEIVED SO FAR</Text>
                    <Text style={[s.figureValue, { color: colors.success }]}>{formatRupees(salaryItem.paidAmount)}</Text>
                  </View>
                  <View style={s.figureCol}>
                    <Text style={s.figureLabel}>REMAINING BALANCE</Text>
                    <Text style={[s.figureValue, { color: salaryItem.remainingDue > 0 ? colors.warning : colors.muted }]}>
                      {salaryItem.remainingDue > 0
                        ? formatRupees(salaryItem.remainingDue)
                        : salaryItem.advanceCredit > 0
                        ? `Advance: ${formatRupees(salaryItem.advanceCredit)}`
                        : '₹0 (Settled)'}
                    </Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={s.cardActions}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={s.btnSlip}
                    onPress={() => handleOpenSlip(salaryItem)}
                  >
                    <Ionicons name="document-text-outline" size={15} color={colors.ink} />
                    <Text style={s.btnSlipText}>View Salary Slip</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    accessibilityRole="button"
                    style={s.btnDownload}
                    onPress={() => handleDownloadPdf(salaryItem)}
                  >
                    <Ionicons name="download-outline" size={15} color="#080c14" />
                    <Text style={s.btnDownloadText}>Download Slip (PDF)</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    accessibilityRole="button"
                    style={s.btnReceipts}
                    onPress={() => handleOpenReceipts(salaryItem)}
                  >
                    <Ionicons name="receipt-outline" size={15} color={colors.ink} />
                    <Text style={s.btnReceiptsText}>
                      Receipts ({payments.length})
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 1: SALARY SLIP PREVIEW ── */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={activeModal === 'SLIP' && !!selectedMonthSalary}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { maxWidth: 650 }]}>
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalEyebrow}>EMPLOYEE SALARY SLIP</Text>
                <Text style={s.modalTitle}>{employee?.name || user?.name}</Text>
                <Text style={s.modalSubtitle}>
                  {MONTH_NAMES[(selectedMonthSalary?.month || 1) - 1]} {selectedMonthSalary?.year} • {employee?.employeeId || user?.employeeId}
                </Text>
              </View>
              <TouchableOpacity onPress={closeModal} style={s.modalCloseBtn}>
                <Ionicons name="close" size={20} color={tc.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.modalContent}>
              <View style={s.slipPreviewCard}>
                <View style={s.slipHeaderBlock}>
                  <Text style={s.slipSchoolTitle}>ARIHANT PUBLIC SCHOOL</Text>
                  <Text style={s.slipSubTitle}>Staff Payroll Disbursement Statement</Text>
                  <Text style={s.slipPeriodTitle}>
                    Month: {MONTH_NAMES[(selectedMonthSalary?.month || 1) - 1]} {selectedMonthSalary?.year}
                  </Text>
                </View>

                <View style={s.slipMetaGrid}>
                  <Text style={s.slipMetaItem}><Text style={s.bold}>Employee ID:</Text> {employee?.employeeId || user?.employeeId}</Text>
                  <Text style={s.slipMetaItem}><Text style={s.bold}>Designation:</Text> {employee?.designation || 'Staff'} ({employee?.subRole})</Text>
                  <Text style={s.slipMetaItem}><Text style={s.bold}>Joining Date:</Text> {formatDate(employee?.joiningDate)}</Text>
                  <Text style={s.slipMetaItem}><Text style={s.bold}>Payment Mode:</Text> {selectedMonthSalary?.payments?.[0]?.method || 'CASH'}</Text>
                </View>

                {/* Attendance Summary */}
                <View style={s.slipAttBox}>
                  <Text style={s.slipAttTitle}>ATTENDANCE BREAKDOWN (30 DAYS BASIS):</Text>
                  <Text style={s.slipAttText}>
                    Present: {(selectedMonthSalary?.snapshot as any)?.statuses?.PRESENT || 0} Days •
                    Absent: {(selectedMonthSalary?.snapshot as any)?.statuses?.ABSENT || 0} Days •
                    Half-Day: {(selectedMonthSalary?.snapshot as any)?.statuses?.HALF_DAY || 0} •
                    Late Marks: {(selectedMonthSalary?.snapshot as any)?.lateCount || 0} (₹100 fine each)
                  </Text>
                </View>

                {/* Earnings vs Deductions Table */}
                <View style={s.slipTableBlock}>
                  <View style={s.slipTableHead}>
                    <Text style={[s.slipTh, { flex: 1 }]}>EARNINGS</Text>
                    <Text style={[s.slipTh, { width: 100, textAlign: 'right' }]}>AMOUNT</Text>
                    <Text style={[s.slipTh, { flex: 1 }]}>DEDUCTIONS</Text>
                    <Text style={[s.slipTh, { width: 100, textAlign: 'right' }]}>AMOUNT</Text>
                  </View>

                  <View style={s.slipTableRow}>
                    <Text style={[s.slipTd, { flex: 1 }]}>
                      Basic Salary {(selectedMonthSalary?.snapshot as any)?.joinedMidMonth ? `(Joined ${formatDate((selectedMonthSalary?.snapshot as any)?.joiningDate)})` : ''}
                    </Text>
                    <Text style={[s.slipTd, { width: 100, textAlign: 'right' }]}>{formatRupees(selectedMonthSalary?.grossAmount)}</Text>
                    <Text style={[s.slipTd, { flex: 1 }]}>Absence Deduction</Text>
                    <Text style={[s.slipTd, { width: 100, textAlign: 'right', color: colors.danger }]}>
                      -{formatRupees((selectedMonthSalary?.snapshot as any)?.absenceDeduction || 0)}
                    </Text>
                  </View>

                  <View style={s.slipTableRow}>
                    <Text style={[s.slipTd, { flex: 1 }]}>—</Text>
                    <Text style={[s.slipTd, { width: 100, textAlign: 'right' }]}>—</Text>
                    <Text style={[s.slipTd, { flex: 1 }]}>Late Fine (₹100/late)</Text>
                    <Text style={[s.slipTd, { width: 100, textAlign: 'right', color: colors.danger }]}>
                      -{formatRupees((selectedMonthSalary?.snapshot as any)?.lateDeduction || 0)}
                    </Text>
                  </View>

                  <View style={[s.slipTableRow, { backgroundColor: 'rgba(255,255,255,0.04)' }]}>
                    <Text style={[s.slipTdBold, { flex: 1 }]}>Total Earnings (A)</Text>
                    <Text style={[s.slipTdBold, { width: 100, textAlign: 'right' }]}>{formatRupees(selectedMonthSalary?.grossAmount)}</Text>
                    <Text style={[s.slipTdBold, { flex: 1 }]}>Total Deductions (B)</Text>
                    <Text style={[s.slipTdBold, { width: 100, textAlign: 'right', color: colors.danger }]}>
                      -{formatRupees(selectedMonthSalary?.deductionAmount)}
                    </Text>
                  </View>
                </View>

                {/* Final Settlement Summary */}
                <View style={s.slipSettlement}>
                  <View style={s.slipSettlementRow}>
                    <Text style={s.slipSettlementLabel}>Previous Carry-Forward:</Text>
                    <Text style={s.slipSettlementVal}>
                      {selectedMonthSalary?.previousBalance > 0
                        ? `+${formatRupees(selectedMonthSalary?.previousBalance)} (Due)`
                        : selectedMonthSalary?.previousBalance < 0
                        ? `-${formatRupees(Math.abs(selectedMonthSalary?.previousBalance))} (Advance)`
                        : '₹0'}
                    </Text>
                  </View>

                  {/* Previous Dues List */}
                  {selectedMonthSalary?.previousDuesBreakdown?.length > 0 ? (
                    <View style={s.duesBreakdownBox}>
                      <Text style={s.duesBreakdownTitle}>Pichle Mahino Ka Baki Hisab (Unpaid Dues Breakdown):</Text>
                      {selectedMonthSalary.previousDuesBreakdown.map((due: any, idx: number) => (
                        <View key={idx} style={s.dueItemRow}>
                          <Text style={s.dueItemText}>
                            • <Text style={{ fontWeight: '700' }}>{due.monthLabel}</Text> {due.note ? `(${due.note})` : ''}
                          </Text>
                          <Text style={[s.dueItemAmount, due.isDue ? { color: colors.warning } : { color: '#a78bfa' }]}>
                            {due.isDue ? `+${formatRupees(due.balance)} (Due)` : `-${formatRupees(Math.abs(due.balance))} (Adv)`}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  <View style={[s.slipSettlementRow, { backgroundColor: 'rgba(147,155,255,0.12)', paddingVertical: 6 }]}>
                    <Text style={[s.slipSettlementLabel, { fontWeight: '800', color: colors.primary }]}>
                      FINAL NET PAYABLE:
                    </Text>
                    <Text style={[s.slipSettlementVal, { fontWeight: '800', color: colors.primary, fontSize: 16 }]}>
                      {formatRupees(selectedMonthSalary?.effectiveTotalPayable)}
                    </Text>
                  </View>
                  <View style={s.slipSettlementRow}>
                    <Text style={s.slipSettlementLabel}>Amount Received So Far:</Text>
                    <Text style={[s.slipSettlementVal, { color: colors.success, fontWeight: '700' }]}>
                      {formatRupees(selectedMonthSalary?.paidAmount)}
                    </Text>
                  </View>
                  <View style={s.slipSettlementRow}>
                    <Text style={s.slipSettlementLabel}>Remaining Due / Advance:</Text>
                    <Text style={[s.slipSettlementVal, { fontWeight: '700' }]}>
                      {selectedMonthSalary?.remainingDue > 0
                        ? `${formatRupees(selectedMonthSalary?.remainingDue)} (Due)`
                        : selectedMonthSalary?.advanceCredit > 0
                        ? `${formatRupees(selectedMonthSalary?.advanceCredit)} (Advance Credit)`
                        : 'NIL (₹0)'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Actions */}
              <View style={s.slipActionRow}>
                <TouchableOpacity
                  accessibilityRole="button"
                  style={s.btnDownloadPdf}
                  onPress={() => handleDownloadPdf(selectedMonthSalary)}
                >
                  <Ionicons name="download-outline" size={18} color="#080c14" />
                  <Text style={s.btnDownloadPdfText}>Download Salary Slip (PDF)</Text>
                </TouchableOpacity>

                {Platform.OS === 'web' && typeof window !== 'undefined' ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={s.btnPrintSlip}
                    onPress={() => window.print()}
                  >
                    <Ionicons name="print-outline" size={18} color={tc.text} />
                    <Text style={s.btnPrintSlipText}>Print</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 2: PAYMENT RECEIPTS ── */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={activeModal === 'RECEIPTS' && !!selectedMonthSalary}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { maxWidth: 600 }]}>
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalEyebrow}>PAYMENT TRANSACTIONS RECEIPT</Text>
                <Text style={s.modalTitle}>Disbursement History</Text>
                <Text style={s.modalSubtitle}>
                  {MONTH_NAMES[(selectedMonthSalary?.month || 1) - 1]} {selectedMonthSalary?.year}
                </Text>
              </View>
              <TouchableOpacity onPress={closeModal} style={s.modalCloseBtn}>
                <Ionicons name="close" size={20} color={tc.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.modalContent}>
              <View style={s.auditNoticeBox}>
                <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
                <Text style={s.auditNoticeText}>
                  Verified Ledger: All payments listed below are recorded and approved by School Accounts.
                </Text>
              </View>

              {(!selectedMonthSalary?.payments || selectedMonthSalary.payments.length === 0) ? (
                <View style={s.emptyNoticeBox}>
                  <Text style={s.emptyNotice}>No disbursements recorded for this month yet.</Text>
                </View>
              ) : (
                selectedMonthSalary.payments.map((tx: any) => (
                  <View key={tx.id} style={s.txItem}>
                    <View style={s.txLeft}>
                      <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                      <View>
                        <Text style={s.txAmount}>{formatRupees(tx.amount)}</Text>
                        <Text style={s.txMeta}>
                          Disbursed on {formatDate(tx.paidDate)} via <Text style={{ fontWeight: '700', color: tc.text }}>{tx.method || 'CASH'}</Text>
                        </Text>
                        {tx.reference ? (
                          <Text style={s.txRef}>Reference / UTR: {tx.reference}</Text>
                        ) : null}
                      </View>
                    </View>
                    <View style={s.txRight}>
                      <View style={s.txStatusBadge}>
                        <Text style={s.txStatusText}>SUCCESS</Text>
                      </View>
                      {tx.remarks ? <Text style={s.txRemarks}>"{tx.remarks}"</Text> : null}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

let stylesDark: any = null;
let stylesLight: any = null;

function getThemedStyles(isDark: boolean) {
  if (isDark) {
    if (!stylesDark) stylesDark = StyleSheet.create(createStyles(THEME_PALETTES.dark, true) as any);
    return stylesDark;
  } else {
    if (!stylesLight) stylesLight = StyleSheet.create(createStyles(THEME_PALETTES.light, false) as any);
    return stylesLight;
  }
}

function createStyles(tc: ThemeColors, isDark: boolean) {
  return {
    container: {
      flex: 1,
      backgroundColor: tc.canvas,
    },
    content: {
      padding: 16,
      gap: 16,
    },
    hero: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'flex-start' as const,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : tc.panel,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: tc.line,
      padding: 16,
      gap: 12,
    },
    heroLeft: {
      flex: 1,
    },
    eyebrow: {
      fontSize: 10.5,
      fontWeight: '800' as const,
      color: tc.primary,
      letterSpacing: 1,
      marginBottom: 4,
    },
    title: {
      fontSize: 22,
      fontWeight: '800' as const,
      color: tc.text,
    },
    subtitle: {
      fontSize: 13,
      color: tc.muted,
      marginTop: 3,
      lineHeight: 18,
    },
    refreshBtn: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
      borderWidth: 1,
      borderColor: tc.line,
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: radius.sm,
    },
    refreshBtnText: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: tc.text,
    },

    // KPI Grid
    statsGrid: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: 12,
    },
    statCard: {
      flex: 1,
      minWidth: 160,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : tc.panel,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: tc.line,
      borderLeftWidth: 4,
      padding: 14,
      gap: 4,
    },
    statHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
    },
    statLabel: {
      fontSize: 10,
      fontWeight: '800' as const,
      color: tc.muted,
      letterSpacing: 0.5,
    },
    statValue: {
      fontSize: 20,
      fontWeight: '800' as const,
      color: tc.text,
      marginTop: 2,
    },
    statMeta: {
      fontSize: 11,
      color: tc.muted,
    },

    // Section List
    listContainer: {
      gap: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '800' as const,
      color: tc.text,
      letterSpacing: 0.3,
    },

    // Loading & Empty
    loadingContainer: {
      padding: 50,
      alignItems: 'center' as const,
      gap: 12,
    },
    loadingText: {
      fontSize: 13,
      color: tc.muted,
    },
    errorContainer: {
      padding: 40,
      alignItems: 'center' as const,
      gap: 10,
      backgroundColor: isDark ? 'rgba(248, 113, 113, 0.08)' : 'rgba(248, 113, 113, 0.12)',
      borderRadius: radius.md,
    },
    errorTitle: {
      fontSize: 15,
      fontWeight: '700' as const,
      color: colors.danger,
    },
    retryBtn: {
      backgroundColor: tc.primary,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: radius.sm,
      marginTop: 6,
    },
    retryBtnText: {
      fontSize: 12,
      fontWeight: '700' as const,
      color: '#080c14',
    },
    emptyContainer: {
      padding: 50,
      alignItems: 'center' as const,
      gap: 10,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : tc.panel,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: tc.line,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: tc.text,
    },
    emptySubtitle: {
      fontSize: 12.5,
      color: tc.muted,
      textAlign: 'center' as const,
      maxWidth: 420,
    },

    // Month Card
    monthCard: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : tc.panel,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: tc.line,
      padding: 16,
      gap: 12,
    },
    monthCardHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'flex-start' as const,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.05)' : tc.line,
      paddingBottom: 10,
    },
    monthTitleRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
      flexWrap: 'wrap' as const,
    },
    monthTitle: {
      fontSize: 16,
      fontWeight: '800' as const,
      color: tc.text,
    },
    proRataBadge: {
      backgroundColor: isDark ? 'rgba(147, 155, 255, 0.15)' : 'rgba(91, 140, 255, 0.15)',
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 4,
    },
    proRataBadgeText: {
      fontSize: 10.5,
      fontWeight: '700' as const,
      color: tc.primary,
    },
    monthMeta: {
      fontSize: 12,
      color: tc.muted,
      marginTop: 2,
    },
    statusBadgeBox: {
      alignItems: 'flex-end' as const,
    },
    badgeSuccess: {
      backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : 'rgba(52, 211, 153, 0.12)',
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.success,
    },
    badgeSuccessText: {
      fontSize: 10.5,
      fontWeight: '800' as const,
      color: isDark ? '#34d399' : '#059669',
    },
    badgeWarning: {
      backgroundColor: isDark ? 'rgba(251, 191, 36, 0.15)' : 'rgba(251, 191, 36, 0.12)',
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.warning,
    },
    badgeWarningText: {
      fontSize: 10.5,
      fontWeight: '800' as const,
      color: isDark ? '#fbbf24' : '#d97706',
    },
    badgeDanger: {
      backgroundColor: isDark ? 'rgba(248, 113, 113, 0.15)' : 'rgba(248, 113, 113, 0.12)',
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.danger,
    },
    badgeDangerText: {
      fontSize: 10.5,
      fontWeight: '800' as const,
      color: isDark ? '#f87171' : '#dc2626',
    },
    badgePurple: {
      backgroundColor: isDark ? 'rgba(167, 139, 250, 0.18)' : 'rgba(167, 139, 250, 0.15)',
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: '#a78bfa',
    },
    badgePurpleText: {
      fontSize: 10.5,
      fontWeight: '800' as const,
      color: isDark ? '#c4b5fd' : '#7c3aed',
    },

    // Attendance Bar
    attBar: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      flexWrap: 'wrap' as const,
      gap: 8,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
      padding: 10,
      borderRadius: radius.sm,
    },
    attPillRow: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: 6,
    },
    attPillPresent: {
      backgroundColor: 'rgba(52, 211, 153, 0.12)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    attPillPresentText: {
      fontSize: 11,
      fontWeight: '700' as const,
      color: isDark ? '#34d399' : '#059669',
    },
    attPillAbsent: {
      backgroundColor: 'rgba(248, 113, 113, 0.12)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    attPillAbsentText: {
      fontSize: 11,
      fontWeight: '700' as const,
      color: isDark ? '#f87171' : '#dc2626',
    },
    attPillHalfDay: {
      backgroundColor: 'rgba(251, 191, 36, 0.12)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    attPillHalfDayText: {
      fontSize: 11,
      fontWeight: '700' as const,
      color: isDark ? '#fbbf24' : '#d97706',
    },
    attPillLate: {
      backgroundColor: 'rgba(167, 139, 250, 0.15)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    attPillLateText: {
      fontSize: 11,
      fontWeight: '700' as const,
      color: isDark ? '#c4b5fd' : '#7c3aed',
    },
    deductionSummary: {
      fontSize: 11.5,
      color: tc.muted,
    },

    // Previous Dues Box
    duesBreakdownBox: {
      backgroundColor: isDark ? 'rgba(251, 191, 36, 0.08)' : 'rgba(251, 191, 36, 0.06)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(251, 191, 36, 0.25)' : 'rgba(251, 191, 36, 0.35)',
      borderRadius: radius.sm,
      padding: 10,
      gap: 4,
    },
    duesBreakdownTitle: {
      fontSize: 11,
      fontWeight: '800' as const,
      color: isDark ? colors.warning : '#d97706',
      letterSpacing: 0.5,
    },
    dueItemRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      paddingTop: 3,
    },
    dueItemText: {
      fontSize: 11.5,
      color: tc.text,
    },
    dueItemAmount: {
      fontSize: 12,
      fontWeight: '800' as const,
    },

    // Financial figures
    figuresRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
      padding: 12,
      borderRadius: radius.sm,
      gap: 8,
    },
    figureCol: {
      flex: 1,
    },
    figureLabel: {
      fontSize: 10,
      fontWeight: '800' as const,
      color: tc.muted,
      letterSpacing: 0.5,
    },
    figureValue: {
      fontSize: 15,
      fontWeight: '800' as const,
      marginTop: 2,
    },

    // Card Actions
    cardActions: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: 8,
      justifyContent: 'flex-end' as const,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255, 255, 255, 0.04)' : tc.line,
      paddingTop: 10,
    },
    btnSlip: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 5,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
      borderWidth: 1,
      borderColor: tc.line,
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: radius.sm,
    },
    btnSlipText: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: tc.text,
    },
    btnDownload: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 5,
      backgroundColor: tc.primary,
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: radius.sm,
    },
    btnDownloadText: {
      fontSize: 12,
      fontWeight: '800' as const,
      color: '#080c14',
    },
    btnReceipts: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 5,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
      borderWidth: 1,
      borderColor: tc.line,
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: radius.sm,
    },
    btnReceiptsText: {
      fontSize: 12,
      color: tc.text,
    },

    // Modal Common
    modalOverlay: {
      flex: 1,
      backgroundColor: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      padding: 16,
    },
    modalBox: {
      width: '100%',
      maxHeight: '90%',
      backgroundColor: isDark ? '#0c121e' : tc.panel,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(147, 155, 255, 0.2)' : tc.line,
      overflow: 'hidden' as const,
    },
    modalHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'flex-start' as const,
      padding: 18,
      borderBottomWidth: 1,
      borderBottomColor: tc.line,
    },
    modalEyebrow: {
      fontSize: 10.5,
      fontWeight: '800' as const,
      color: tc.primary,
      letterSpacing: 1,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '800' as const,
      color: tc.text,
      marginTop: 2,
    },
    modalSubtitle: {
      fontSize: 12,
      color: tc.muted,
      marginTop: 2,
    },
    modalCloseBtn: {
      padding: 6,
      borderRadius: radius.sm,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
    },
    modalContent: {
      padding: 18,
      gap: 14,
    },

    // Slip preview card
    slipPreviewCard: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : tc.panel,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: tc.line,
      padding: 16,
      gap: 12,
    },
    slipHeaderBlock: {
      alignItems: 'center' as const,
      borderBottomWidth: 1,
      borderBottomColor: tc.line,
      paddingBottom: 10,
      gap: 2,
    },
    slipSchoolTitle: {
      fontSize: 16,
      fontWeight: '800' as const,
      color: tc.text,
      letterSpacing: 0.5,
    },
    slipSubTitle: {
      fontSize: 11,
      color: tc.muted,
    },
    slipPeriodTitle: {
      fontSize: 12,
      fontWeight: '700' as const,
      color: isDark ? colors.warning : '#d97706',
      marginTop: 2,
    },
    slipMetaGrid: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: 10,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
      padding: 10,
      borderRadius: radius.sm,
    },
    slipMetaItem: {
      fontSize: 11.5,
      color: tc.text,
      minWidth: 180,
    },
    bold: {
      fontWeight: '700' as const,
      color: tc.muted,
    },
    slipAttBox: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
      padding: 10,
      borderRadius: radius.sm,
      borderLeftWidth: 3,
      borderLeftColor: tc.primary,
      gap: 2,
    },
    slipAttTitle: {
      fontSize: 10,
      fontWeight: '800' as const,
      color: tc.primary,
    },
    slipAttText: {
      fontSize: 11.5,
      color: tc.text,
    },
    slipTableBlock: {
      borderWidth: 1,
      borderColor: tc.line,
      borderRadius: radius.sm,
      overflow: 'hidden' as const,
    },
    slipTableHead: {
      flexDirection: 'row' as const,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
      paddingVertical: 7,
      paddingHorizontal: 10,
    },
    slipTh: {
      fontSize: 10.5,
      fontWeight: '800' as const,
      color: tc.muted,
    },
    slipTableRow: {
      flexDirection: 'row' as const,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255, 255, 255, 0.04)' : tc.line,
    },
    slipTd: {
      fontSize: 11.5,
      color: tc.text,
    },
    slipTdBold: {
      fontSize: 12,
      fontWeight: '800' as const,
      color: tc.text,
    },
    slipSettlement: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: tc.line,
      padding: 10,
      gap: 4,
    },
    slipSettlementRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: 4,
    },
    slipSettlementLabel: {
      fontSize: 12,
      color: tc.muted,
    },
    slipSettlementVal: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: tc.text,
    },
    slipActionRow: {
      flexDirection: 'row' as const,
      gap: 10,
      justifyContent: 'flex-end' as const,
      marginTop: 6,
    },
    btnDownloadPdf: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
      backgroundColor: tc.primary,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: radius.sm,
    },
    btnDownloadPdfText: {
      fontSize: 12.5,
      fontWeight: '800' as const,
      color: '#080c14',
    },
    btnPrintSlip: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
      borderWidth: 1,
      borderColor: tc.line,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: radius.sm,
    },
    btnPrintSlipText: {
      fontSize: 12.5,
      fontWeight: '700' as const,
      color: tc.text,
    },

    // Receipts Modal
    auditNoticeBox: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
      backgroundColor: isDark ? 'rgba(147, 155, 255, 0.1)' : 'rgba(91, 140, 255, 0.1)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(147, 155, 255, 0.2)' : tc.line,
      borderRadius: radius.sm,
      padding: 10,
    },
    auditNoticeText: {
      fontSize: 11.5,
      color: tc.text,
      flex: 1,
    },
    emptyNoticeBox: {
      padding: 24,
      alignItems: 'center' as const,
    },
    emptyNotice: {
      fontSize: 13,
      color: tc.muted,
      fontStyle: 'italic' as const,
    },
    txItem: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.04)' : tc.line,
      borderRadius: radius.sm,
      padding: 10,
    },
    txLeft: {
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      gap: 10,
      flex: 1,
    },
    txAmount: {
      fontSize: 15,
      fontWeight: '800' as const,
      color: tc.text,
    },
    txMeta: {
      fontSize: 11.5,
      color: tc.muted,
      marginTop: 2,
    },
    txRef: {
      fontSize: 10.5,
      color: tc.primary,
      marginTop: 2,
    },
    txRight: {
      alignItems: 'flex-end' as const,
      gap: 4,
    },
    txStatusBadge: {
      backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : 'rgba(52, 211, 153, 0.12)',
      paddingVertical: 2,
      paddingHorizontal: 6,
      borderRadius: 4,
    },
    txStatusText: {
      fontSize: 10,
      fontWeight: '800' as const,
      color: isDark ? '#34d399' : '#059669',
    },
    txRemarks: {
      fontSize: 10.5,
      color: tc.muted,
      fontStyle: 'italic' as const,
      maxWidth: 160,
    },
  };
}
