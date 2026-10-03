import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { colors, radius, shadow } from '../theme';
import { useTheme, THEME_PALETTES, ThemeColors } from '../context/ThemeContext';
import { downloadSalarySlipPdf, SalarySlipPdfData } from '../utils/salarySlipPdf';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SUB_ROLES = [
  { value: '', label: 'All Staff' },
  { value: 'TEACHER', label: 'Teachers' },
  { value: 'ACCOUNTANT', label: 'Accountants' },
  { value: 'STAFF', label: 'Staff' },
];

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'ONLINE', label: 'UPI / Online' },
  { value: 'BANK', label: 'Bank Transfer (NEFT/IMPS)' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'OTHER', label: 'Other' },
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

export function PayrollManager() {
  const { isDark, colors: tc } = useTheme();
  const s = getThemedStyles(isDark);
  const { user } = useAuth();
  const isAccountant = user?.subRole === 'ACCOUNTANT';
  const queryClient = useQueryClient();
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSubRole, setSelectedSubRole] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNPAID' | 'PARTIAL' | 'PAID' | 'ADVANCE'>('ALL');

  // Modals state
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [activeModal, setActiveModal] = useState<'PAY' | 'SLIP' | 'HISTORY' | 'REVISE' | null>(null);

  // Form states
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [paymentRemarks, setPaymentRemarks] = useState<string>('');

  const [revisionAmount, setRevisionAmount] = useState<string>('');
  const [revisionDate, setRevisionDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [revisionReason, setRevisionReason] = useState<string>('Annual increment');

  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string>('');
  const [actionSuccess, setActionSuccess] = useState<string>('');

  // Fetch accounts data for selected month/year
  const { data: employees = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['salary-accounts', selectedYear, selectedMonth, selectedSubRole],
    queryFn: async () => {
      const res = await api.get('/salary/accounts', {
        params: {
          year: selectedYear,
          month: selectedMonth,
          subRole: selectedSubRole || undefined,
        },
      });
      return res.data;
    },
  });

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp: any) => {
      const matchSearch =
        !searchQuery ||
        emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employeeId?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'PAID') return emp.salaryStatus === 'PAID';
      if (statusFilter === 'PARTIAL') return emp.salaryStatus === 'PARTIAL';
      if (statusFilter === 'UNPAID') return emp.salaryStatus === 'UNPAID';
      if (statusFilter === 'ADVANCE') return emp.salaryStatus === 'ADVANCE_COVERED' || emp.salaryStatus === 'OVERPAID' || emp.advanceCredit > 0;
      return true;
    });
  }, [employees, searchQuery, statusFilter]);

  // Aggregate KPI summary
  const summary = useMemo(() => {
    let totalEmployees = employees.length;
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNetPayable = 0;
    let totalPaid = 0;
    let totalPendingDues = 0;
    let totalAdvanceCredit = 0;

    employees.forEach((emp: any) => {
      totalGross += Number(emp.currentGross || 0);
      totalDeductions += Number(emp.currentDeduction || 0);
      totalNetPayable += Number(emp.effectivePayable || 0);
      totalPaid += Number(emp.paidAmount || 0);
      totalPendingDues += Number(emp.remainingDue || 0);
      totalAdvanceCredit += Number(emp.advanceCredit || 0);
    });

    return {
      totalEmployees,
      totalGross,
      totalDeductions,
      totalNetPayable,
      totalPaid,
      totalPendingDues,
      totalAdvanceCredit,
    };
  }, [employees]);

  // Handlers for Opening Modals
  const handleOpenPay = (employee: any) => {
    setSelectedEmployee(employee);
    const due = Math.max(0, Number(employee.remainingDue || 0));
    setPaymentAmount(due > 0 ? String(due) : '');
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentMethod('CASH');
    setPaymentReference('');
    setPaymentRemarks('');
    setActionError('');
    setActionSuccess('');
    setActiveModal('PAY');
  };

  const handleOpenSlip = (employee: any) => {
    setSelectedEmployee(employee);
    setActiveModal('SLIP');
  };

  const handleOpenHistory = (employee: any) => {
    setSelectedEmployee(employee);
    setActiveModal('HISTORY');
  };

  const handleOpenRevise = (employee: any) => {
    if (isAccountant) return;
    setSelectedEmployee(employee);
    setRevisionAmount(String(employee.currentSalary || ''));
    setRevisionDate(new Date().toISOString().slice(0, 10));
    setRevisionReason('Annual increment');
    setActionError('');
    setActionSuccess('');
    setActiveModal('REVISE');
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedEmployee(null);
    setActionError('');
    setActionSuccess('');
  };

  // Submit Salary Payment
  const handleRecordPayment = async () => {
    if (!selectedEmployee) return;
    const salaryId = selectedEmployee.selectedSalary?.id;
    if (!salaryId) {
      setActionError('No calculated salary record exists for this employee for this month.');
      return;
    }

    const amt = Number(paymentAmount.trim());
    if (isNaN(amt) || amt <= 0) {
      setActionError('Please enter a valid positive payment amount.');
      return;
    }

    setActionLoading(true);
    setActionError('');
    try {
      await api.post(`/salary/${salaryId}/payments`, {
        amount: amt,
        paidDate: paymentDate,
        method: paymentMethod,
        reference: paymentReference.trim() || undefined,
        remarks: paymentRemarks.trim() || undefined,
      });

      setActionSuccess(`Payment of ${formatRupees(amt)} recorded successfully!`);
      await queryClient.invalidateQueries({ queryKey: ['salary-accounts'] });
      await refetch();
      setTimeout(() => {
        closeModal();
      }, 900);
    } catch (err: any) {
      setActionError(err.response?.data?.message || err.message || 'Failed to record payment');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Salary Revision
  const handleRecordRevision = async () => {
    if (!selectedEmployee) return;
    const amt = Number(revisionAmount.trim());
    if (isNaN(amt) || amt <= 0) {
      setActionError('Please enter a valid positive salary amount.');
      return;
    }

    if (!revisionDate) {
      setActionError('Please enter a valid effective date.');
      return;
    }

    setActionLoading(true);
    setActionError('');
    try {
      await api.post(`/employees/${selectedEmployee.id}/salary-revisions`, {
        amount: amt,
        effectiveDate: revisionDate,
        reason: revisionReason.trim() || 'Annual revision',
      });

      setActionSuccess(`Base salary updated to ${formatRupees(amt)} successfully!`);
      await queryClient.invalidateQueries({ queryKey: ['salary-accounts'] });
      await refetch();
      setTimeout(() => {
        closeModal();
      }, 900);
    } catch (err: any) {
      setActionError(err.response?.data?.message || err.message || 'Failed to update salary');
    } finally {
      setActionLoading(false);
    }
  };

  // Download PDF Slip
  const handleDownloadSlip = (emp: any) => {
    const slip = emp.selectedSalary;
    const snapshot = (slip?.snapshot as any) || {};
    const slipData: SalarySlipPdfData = {
      employeeId: emp.employeeId,
      name: emp.name,
      designation: emp.designation,
      subRole: emp.subRole,
      month: selectedMonth,
      year: selectedYear,
      monthLabel: `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`,
      grossAmount: Number(emp.currentGross || 0),
      deductionAmount: Number(emp.currentDeduction || 0),
      absenceDeduction: snapshot.absenceDeduction,
      lateDeduction: snapshot.lateDeduction,
      lateCount: snapshot.lateCount,
      deductionUnits: Number(slip?.deductionUnits || snapshot.deductionUnits || 0),
      previousBalance: Number(emp.previousBalance || 0),
      previousDuesBreakdown: emp.previousDuesBreakdown || [],
      joinedMidMonthNote: snapshot.joinedMidMonth
        ? `Joined on ${new Date(snapshot.joiningDate).toLocaleDateString('en-IN')}, ${snapshot.daysWorkedInJoiningMonth} days worked`
        : undefined,
      effectivePayable: Number(emp.effectivePayable || 0),
      paidAmount: Number(emp.paidAmount || 0),
      remainingDue: Number(emp.remainingDue || 0),
      advanceCredit: Number(emp.advanceCredit || 0),
      paymentMethod: slip?.payments?.[0]?.method || 'CASH',
      paymentReference: slip?.payments?.[0]?.reference || undefined,
      paymentDate: slip?.payments?.[0]?.paidDate || undefined,
      attendanceStatuses: emp.attendanceStatuses || {},
      schoolName: 'ARIHANT PUBLIC SCHOOL',
    };

    downloadSalarySlipPdf(slipData);
  };

  // Month navigation
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  return (
    <View style={s.container}>
      {/* ── 1. Top Month Navigator & Title ── */}
      <View style={s.topBar}>
        <View>
          <Text style={s.eyebrow}>PAYROLL & SALARY DISBURSEMENT</Text>
          <Text style={s.headingTitle}>Staff Payroll Management</Text>
          <Text style={s.subheading}>
            Manage attendance-based monthly salaries, ₹100/late deductions, ledger carry-forward dues, and print official payslips.
          </Text>
        </View>

        <View style={s.monthSelectorCard}>
          <TouchableOpacity
            accessibilityRole="button"
            style={s.monthNavBtn}
            onPress={handlePrevMonth}
          >
            <Ionicons name="chevron-back" size={20} color={colors.ink} />
          </TouchableOpacity>

          <View style={s.monthDisplay}>
            <Ionicons name="calendar-outline" size={16} color={colors.primary} />
            <Text style={s.monthYearText}>
              {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </Text>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            style={s.monthNavBtn}
            onPress={handleNextMonth}
          >
            <Ionicons name="chevron-forward" size={20} color={colors.ink} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 2. Summary KPI Cards ── */}
      <View style={s.statsGrid}>
        <View style={[s.statCard, { borderLeftColor: colors.primary }]}>
          <View style={s.statHeader}>
            <Text style={s.statLabel}>TOTAL EMPLOYEES</Text>
            <Ionicons name="people-outline" size={18} color={colors.primary} />
          </View>
          <Text style={s.statValue}>{summary.totalEmployees}</Text>
          <Text style={s.statMeta}>Active school staff</Text>
        </View>

        <View style={[s.statCard, { borderLeftColor: '#38bdf8' }]}>
          <View style={s.statHeader}>
            <Text style={s.statLabel}>MONTHLY GROSS SALARY</Text>
            <Ionicons name="wallet-outline" size={18} color="#38bdf8" />
          </View>
          <Text style={s.statValue}>{formatRupees(summary.totalGross)}</Text>
          <Text style={s.statMeta}>
            Deductions: <Text style={{ color: colors.danger }}>-{formatRupees(summary.totalDeductions)}</Text>
          </Text>
        </View>

        <View style={[s.statCard, { borderLeftColor: colors.success }]}>
          <View style={s.statHeader}>
            <Text style={s.statLabel}>TOTAL PAID DISBURSED</Text>
            <Ionicons name="checkmark-done-circle-outline" size={18} color={colors.success} />
          </View>
          <Text style={[s.statValue, { color: colors.success }]}>{formatRupees(summary.totalPaid)}</Text>
          <Text style={s.statMeta}>
            Net Payable: {formatRupees(summary.totalNetPayable)}
          </Text>
        </View>

        <View style={[s.statCard, { borderLeftColor: summary.totalPendingDues > 0 ? colors.warning : '#a78bfa' }]}>
          <View style={s.statHeader}>
            <Text style={s.statLabel}>PENDING DUES / ADVANCE</Text>
            <Ionicons name="alert-circle-outline" size={18} color={summary.totalPendingDues > 0 ? colors.warning : '#a78bfa'} />
          </View>
          <Text style={[s.statValue, { color: summary.totalPendingDues > 0 ? colors.warning : tc.text }]}>
            {formatRupees(summary.totalPendingDues)}
          </Text>
          <Text style={s.statMeta}>
            Advance Credit: <Text style={{ color: '#a78bfa' }}>{formatRupees(summary.totalAdvanceCredit)}</Text>
          </Text>
        </View>
      </View>

      {/* ── 3. Filters and Search Row ── */}
      <View style={s.filterContainer}>
        {/* Search */}
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={18} color={tc.muted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search by Employee Name or ID (EMP...)"
            placeholderTextColor={tc.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={tc.muted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Role Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
          {SUB_ROLES.map((role) => (
            <TouchableOpacity
              key={role.value}
              style={[s.filterChip, selectedSubRole === role.value && s.filterChipActive]}
              onPress={() => setSelectedSubRole(role.value)}
            >
              <Text style={[s.filterChipText, selectedSubRole === role.value && s.filterChipTextActive]}>
                {role.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Status Chips */}
        <View style={s.statusFilterRow}>
          {(['ALL', 'UNPAID', 'PARTIAL', 'PAID', 'ADVANCE'] as const).map((st) => (
            <TouchableOpacity
              key={st}
              style={[s.statusChip, statusFilter === st && s.statusChipActive]}
              onPress={() => setStatusFilter(st)}
            >
              <Text style={[s.statusChipText, statusFilter === st && s.statusChipTextActive]}>
                {st === 'ADVANCE' ? 'ADVANCE/CREDIT' : st}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── 4. Main Employees Table ── */}
      {isLoading ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingText}>Calculating monthly attendance & payroll ledger...</Text>
        </View>
      ) : filteredEmployees.length === 0 ? (
        <View style={s.emptyContainer}>
          <Ionicons name="wallet-outline" size={48} color={colors.muted} />
          <Text style={s.emptyTitle}>No employee records found</Text>
          <Text style={s.emptySubtitle}>
            {searchQuery
              ? `No staff matches "${searchQuery}". Try a different name or ID.`
              : 'No staff available for the selected sub-role filter.'}
          </Text>
        </View>
      ) : (
        <ScrollView horizontal style={s.tableScroll} contentContainerStyle={{ minWidth: '100%' }}>
          <View style={s.table}>
            {/* Table Header */}
            <View style={s.tableHeaderRow}>
              <Text style={[s.th, { width: 220 }]}>STAFF MEMBER</Text>
              <Text style={[s.th, { width: 110, textAlign: 'right' }]}>BASE GROSS</Text>
              <Text style={[s.th, { width: 180 }]}>ATTENDANCE (30D)</Text>
              <Text style={[s.th, { width: 130, textAlign: 'right' }]}>DEDUCTIONS</Text>
              <Text style={[s.th, { width: 130, textAlign: 'right' }]}>PREV. BALANCE</Text>
              <Text style={[s.th, { width: 120, textAlign: 'right' }]}>NET PAYABLE</Text>
              <Text style={[s.th, { width: 110, textAlign: 'right' }]}>PAID SO FAR</Text>
              <Text style={[s.th, { width: 120, textAlign: 'center' }]}>STATUS</Text>
              <Text style={[s.th, { width: 230, textAlign: 'center' }]}>ACTIONS</Text>
            </View>

            {/* Table Rows */}
            {filteredEmployees.map((emp: any, idx: number) => {
              const att = emp.attendanceStatuses || {};
              const pCount = att.PRESENT || 0;
              const aCount = att.ABSENT || 0;
              const hdCount = att.HALF_DAY || 0;
              const lCount = att.LATE || 0;

              const prevBal = Number(emp.previousBalance || 0);
              const isPaid = emp.salaryStatus === 'PAID';
              const isPartial = emp.salaryStatus === 'PARTIAL';
              const isUnpaid = emp.salaryStatus === 'UNPAID';
              const isAdvance = emp.salaryStatus === 'ADVANCE_COVERED' || emp.salaryStatus === 'OVERPAID' || emp.advanceCredit > 0;

              return (
                <View
                  key={emp.id}
                  style={[s.tableRow, idx % 2 === 1 && s.tableRowAlt]}
                >
                  {/* Staff Info */}
                  <View style={[s.td, { width: 220 }]}>
                    <Text style={s.empName} numberOfLines={1}>{emp.name}</Text>
                    <View style={s.empMetaRow}>
                      <Text style={s.empIdBadge}>{emp.employeeId}</Text>
                      <Text style={s.empRoleBadge}>{emp.subRole || 'STAFF'}</Text>
                    </View>
                  </View>

                  {/* Base Gross */}
                  <View style={[s.td, { width: 110, alignItems: 'flex-end' }]}>
                    <Text style={s.cellMoney}>{formatRupees(emp.currentGross)}</Text>
                  </View>

                  {/* Attendance Badges */}
                  <View style={[s.td, { width: 180, flexDirection: 'row', flexWrap: 'wrap', gap: 4 }]}>
                    <View style={s.attPillPresent}>
                      <Text style={s.attPillPresentText}>P: {pCount}</Text>
                    </View>
                    {aCount > 0 ? (
                      <View style={s.attPillAbsent}>
                        <Text style={s.attPillAbsentText}>A: {aCount}</Text>
                      </View>
                    ) : null}
                    {hdCount > 0 ? (
                      <View style={s.attPillHalfDay}>
                        <Text style={s.attPillHalfDayText}>HD: {hdCount}</Text>
                      </View>
                    ) : null}
                    {lCount > 0 ? (
                      <View style={s.attPillLate}>
                        <Text style={s.attPillLateText}>Late: {lCount}</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Deductions */}
                  <View style={[s.td, { width: 130, alignItems: 'flex-end' }]}>
                    <Text style={[s.cellMoney, emp.currentDeduction > 0 && { color: colors.danger }]}>
                      {emp.currentDeduction > 0 ? `-${formatRupees(emp.currentDeduction)}` : '₹0'}
                    </Text>
                    {lCount > 0 ? (
                      <Text style={s.cellSubMeta}>Late fine: -₹{lCount * 100}</Text>
                    ) : null}
                  </View>

                  {/* Prev Balance */}
                  <View style={[s.td, { width: 130, alignItems: 'flex-end' }]}>
                    {prevBal > 0 ? (
                      <>
                        <Text style={[s.cellMoney, { color: colors.warning }]}>+{formatRupees(prevBal)}</Text>
                        <Text style={s.cellSubMeta}>
                          {emp.previousDuesBreakdown?.[0]?.monthLabel
                            ? `${emp.previousDuesBreakdown[0].monthLabel.slice(0, 3)} Due`
                            : 'Pending Due'}
                        </Text>
                      </>
                    ) : prevBal < 0 ? (
                      <>
                        <Text style={[s.cellMoney, { color: '#a78bfa' }]}>-{formatRupees(Math.abs(prevBal))}</Text>
                        <Text style={s.cellSubMeta}>Advance Credit</Text>
                      </>
                    ) : (
                      <Text style={[s.cellMoney, { color: colors.muted }]}>₹0</Text>
                    )}
                  </View>

                  {/* Net Payable */}
                  <View style={[s.td, { width: 120, alignItems: 'flex-end' }]}>
                    <Text style={[s.cellMoneyBold, { color: colors.ink }]}>
                      {formatRupees(emp.effectivePayable)}
                    </Text>
                  </View>

                  {/* Paid So Far */}
                  <View style={[s.td, { width: 110, alignItems: 'flex-end' }]}>
                    <Text style={[s.cellMoney, emp.paidAmount > 0 && { color: colors.success, fontWeight: '700' }]}>
                      {formatRupees(emp.paidAmount)}
                    </Text>
                  </View>

                  {/* Status */}
                  <View style={[s.td, { width: 120, alignItems: 'center' }]}>
                    {isPaid ? (
                      <View style={s.badgeSuccess}>
                        <Text style={s.badgeSuccessText}>PAID</Text>
                      </View>
                    ) : isPartial ? (
                      <View style={s.badgeWarning}>
                        <Text style={s.badgeWarningText}>PARTIAL</Text>
                      </View>
                    ) : isAdvance ? (
                      <View style={s.badgePurple}>
                        <Text style={s.badgePurpleText}>ADVANCE</Text>
                      </View>
                    ) : (
                      <View style={s.badgeDanger}>
                        <Text style={s.badgeDangerText}>UNPAID</Text>
                      </View>
                    )}
                  </View>

                  {/* Actions */}
                  <View style={[s.td, { width: 230, flexDirection: 'row', gap: 6, justifyContent: 'center' }]}>
                    <TouchableOpacity
                      accessibilityRole="button"
                      style={s.actionBtnPay}
                      onPress={() => handleOpenPay(emp)}
                    >
                      <Ionicons name="cash-outline" size={14} color="#080c14" />
                      <Text style={s.actionBtnPayText}>Pay</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      accessibilityRole="button"
                      style={s.actionBtnSlip}
                      onPress={() => handleOpenSlip(emp)}
                    >
                      <Ionicons name="document-text-outline" size={14} color={colors.ink} />
                      <Text style={s.actionBtnSlipText}>Slip</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      accessibilityRole="button"
                      style={s.actionBtnHistory}
                      onPress={() => handleOpenHistory(emp)}
                    >
                      <Ionicons name="time-outline" size={14} color={colors.ink} />
                      <Text style={s.actionBtnHistoryText}>History</Text>
                    </TouchableOpacity>

                    {!isAccountant ? (
                      <TouchableOpacity
                        accessibilityRole="button"
                        style={s.actionBtnRevise}
                        onPress={() => handleOpenRevise(emp)}
                      >
                        <Ionicons name="pencil-outline" size={13} color={colors.muted} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 1: PAY SALARY ── */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={activeModal === 'PAY' && !!selectedEmployee}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalEyebrow}>RECORD SALARY DISBURSEMENT</Text>
                <Text style={s.modalTitle}>{selectedEmployee?.name}</Text>
                <Text style={s.modalSubtitle}>
                  {selectedEmployee?.employeeId} • {selectedEmployee?.subRole} • {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                </Text>
              </View>
              <TouchableOpacity onPress={closeModal} style={s.modalCloseBtn}>
                <Ionicons name="close" size={20} color={tc.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.modalContent}>
              {/* Financial Calculation Breakdown */}
              <View style={s.breakdownCard}>
                <Text style={s.breakdownTitle}>Payroll Calculation Breakdown</Text>
                <View style={s.breakdownRow}>
                  <Text style={s.breakdownLabel}>Base Gross Salary:</Text>
                  <Text style={s.breakdownValue}>{formatRupees(selectedEmployee?.currentGross)}</Text>
                </View>
                <View style={s.breakdownRow}>
                  <Text style={s.breakdownLabel}>Attendance Deductions (Absent + Late):</Text>
                  <Text style={[s.breakdownValue, { color: colors.danger }]}>
                    -{formatRupees(selectedEmployee?.currentDeduction)}
                  </Text>
                </View>
                <View style={s.breakdownRow}>
                  <Text style={s.breakdownLabel}>Net Earned This Month:</Text>
                  <Text style={s.breakdownValue}>
                    {formatRupees(Math.max(0, (selectedEmployee?.currentGross || 0) - (selectedEmployee?.currentDeduction || 0)))}
                  </Text>
                </View>
                <View style={s.breakdownRow}>
                  <Text style={s.breakdownLabel}>Previous Month Balance (Carry-Forward):</Text>
                  <Text style={[
                    s.breakdownValue,
                    selectedEmployee?.previousBalance > 0
                      ? { color: colors.warning }
                      : selectedEmployee?.previousBalance < 0
                      ? { color: '#a78bfa' }
                      : { color: colors.muted }
                  ]}>
                    {selectedEmployee?.previousBalance > 0
                      ? `+${formatRupees(selectedEmployee?.previousBalance)} (Due)`
                      : selectedEmployee?.previousBalance < 0
                      ? `-${formatRupees(Math.abs(selectedEmployee?.previousBalance))} (Advance)`
                      : '₹0'}
                  </Text>
                </View>

                {selectedEmployee?.previousDuesBreakdown?.length > 0 ? (
                  <View style={s.duesBreakdownBox}>
                    <Text style={s.duesBreakdownTitle}>Pichle Mahino Ka Baki Hisab (Unpaid Dues Breakdown):</Text>
                    {selectedEmployee.previousDuesBreakdown.map((due: any, idx: number) => (
                      <View key={idx} style={s.dueItemRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.dueItemMonth}>{due.monthLabel}</Text>
                          {due.note ? <Text style={s.dueItemNote}>• {due.note}</Text> : null}
                          <Text style={s.dueItemCalc}>
                            Net: {formatRupees(due.netPayable)} | Paid: {formatRupees(due.paidAmount)}
                          </Text>
                        </View>
                        <Text style={[s.dueItemBalance, due.isDue ? { color: colors.warning } : { color: '#a78bfa' }]}>
                          {due.isDue ? `+${formatRupees(due.balance)} (Due)` : `-${formatRupees(Math.abs(due.balance))} (Adv)`}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                <View style={[s.breakdownRow, s.breakdownHighlight]}>
                  <Text style={s.breakdownHighlightLabel}>FINAL NET PAYABLE:</Text>
                  <Text style={s.breakdownHighlightValue}>{formatRupees(selectedEmployee?.effectivePayable)}</Text>
                </View>
                <View style={s.breakdownRow}>
                  <Text style={s.breakdownLabel}>Already Paid So Far:</Text>
                  <Text style={[s.breakdownValue, { color: colors.success }]}>
                    {formatRupees(selectedEmployee?.paidAmount)}
                  </Text>
                </View>
                <View style={[s.breakdownRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6 }]}>
                  <Text style={[s.breakdownLabel, { fontWeight: '700' }]}>Outstanding Remaining Due:</Text>
                  <Text style={[s.breakdownValue, { fontWeight: '700', color: selectedEmployee?.remainingDue > 0 ? colors.warning : colors.success }]}>
                    {selectedEmployee?.remainingDue > 0
                      ? formatRupees(selectedEmployee?.remainingDue)
                      : selectedEmployee?.advanceCredit > 0
                      ? `Advance Credit: ${formatRupees(selectedEmployee?.advanceCredit)}`
                      : 'Fully Paid (₹0)'}
                  </Text>
                </View>
              </View>

              {/* Payment Form Fields */}
              <View style={s.formGroup}>
                <Text style={s.formLabel}>Amount to Disburse (₹) *</Text>
                <TextInput
                  style={s.formInput}
                  keyboardType="numeric"
                  placeholder="e.g. 15000"
                  placeholderTextColor={tc.muted}
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                />
                <Text style={s.fieldHelp}>
                  You can pay full remaining due, a partial amount, or extra advance credit.
                </Text>
              </View>

              <View style={s.formGroup}>
                <Text style={s.formLabel}>Payment Date (YYYY-MM-DD) *</Text>
                <TextInput
                  style={s.formInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={tc.muted}
                  value={paymentDate}
                  onChangeText={setPaymentDate}
                />
              </View>

              <View style={s.formGroup}>
                <Text style={s.formLabel}>Payment Mode *</Text>
                <View style={s.methodChoiceRow}>
                  {PAYMENT_METHODS.map((m) => (
                    <TouchableOpacity
                      key={m.value}
                      style={[s.methodChip, paymentMethod === m.value && s.methodChipActive]}
                      onPress={() => setPaymentMethod(m.value)}
                    >
                      <Text style={[s.methodChipText, paymentMethod === m.value && s.methodChipTextActive]}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={s.formGroup}>
                <Text style={s.formLabel}>Transaction Reference / UTR / Cheque No.</Text>
                <TextInput
                  style={s.formInput}
                  placeholder="e.g. UPI-92817293, CHEQUE-44021 (Optional)"
                  placeholderTextColor={tc.muted}
                  value={paymentReference}
                  onChangeText={setPaymentReference}
                />
              </View>

              <View style={s.formGroup}>
                <Text style={s.formLabel}>Remarks / Notes</Text>
                <TextInput
                  style={[s.formInput, { height: 60 }]}
                  multiline
                  placeholder="Optional remarks or disbursement notes"
                  placeholderTextColor={tc.muted}
                  value={paymentRemarks}
                  onChangeText={setPaymentRemarks}
                />
              </View>

              {actionError ? <Text style={s.errorBanner}>{actionError}</Text> : null}
              {actionSuccess ? <Text style={s.successBanner}>{actionSuccess}</Text> : null}

              <TouchableOpacity
                accessibilityRole="button"
                style={[s.btnSubmit, actionLoading && s.btnDisabled]}
                onPress={handleRecordPayment}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#080c14" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#080c14" />
                    <Text style={s.btnSubmitText}>Save & Record Payment</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 2: OFFICIAL SALARY SLIP ── */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={activeModal === 'SLIP' && !!selectedEmployee}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { maxWidth: 650 }]}>
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalEyebrow}>EMPLOYEE PAYSLIP PREVIEW</Text>
                <Text style={s.modalTitle}>{selectedEmployee?.name}</Text>
                <Text style={s.modalSubtitle}>
                  {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                </Text>
              </View>
              <TouchableOpacity onPress={closeModal} style={s.modalCloseBtn}>
                <Ionicons name="close" size={20} color={tc.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.modalContent}>
              {/* Slip Layout Preview */}
              <View style={s.slipPreviewCard}>
                <View style={s.slipHeaderBlock}>
                  <Text style={s.slipSchoolTitle}>ARIHANT PUBLIC SCHOOL</Text>
                  <Text style={s.slipSubTitle}>Staff Payroll Disbursement Statement</Text>
                  <Text style={s.slipPeriodTitle}>
                    Month: {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                  </Text>
                </View>

                <View style={s.slipMetaGrid}>
                  <Text style={s.slipMetaItem}><Text style={s.bold}>Employee ID:</Text> {selectedEmployee?.employeeId}</Text>
                  <Text style={s.slipMetaItem}><Text style={s.bold}>Designation:</Text> {selectedEmployee?.designation || 'Staff'} ({selectedEmployee?.subRole})</Text>
                  <Text style={s.slipMetaItem}><Text style={s.bold}>Joining Date:</Text> {formatDate(selectedEmployee?.joiningDate)}</Text>
                  <Text style={s.slipMetaItem}><Text style={s.bold}>Payment Mode:</Text> {selectedEmployee?.selectedSalary?.payments?.[0]?.method || 'CASH'}</Text>
                </View>

                <View style={s.slipAttBox}>
                  <Text style={s.slipAttTitle}>ATTENDANCE BREAKDOWN (30 DAYS BASIS):</Text>
                  <Text style={s.slipAttText}>
                    Present: {selectedEmployee?.attendanceStatuses?.PRESENT || 0} Days •
                    Absent: {selectedEmployee?.attendanceStatuses?.ABSENT || 0} Days •
                    Half-Day: {selectedEmployee?.attendanceStatuses?.HALF_DAY || 0} •
                    Late Marks: {selectedEmployee?.attendanceStatuses?.LATE || 0} (₹100 fine each)
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
                    <Text style={[s.slipTd, { flex: 1 }]}>Basic Salary</Text>
                    <Text style={[s.slipTd, { width: 100, textAlign: 'right' }]}>{formatRupees(selectedEmployee?.currentGross)}</Text>
                    <Text style={[s.slipTd, { flex: 1 }]}>Absence Deduction</Text>
                    <Text style={[s.slipTd, { width: 100, textAlign: 'right', color: colors.danger }]}>
                      -{formatRupees(selectedEmployee?.selectedSalary?.snapshot?.absenceDeduction || 0)}
                    </Text>
                  </View>

                  <View style={s.slipTableRow}>
                    <Text style={[s.slipTd, { flex: 1 }]}>—</Text>
                    <Text style={[s.slipTd, { width: 100, textAlign: 'right' }]}>—</Text>
                    <Text style={[s.slipTd, { flex: 1 }]}>Late Fine (₹100/late)</Text>
                    <Text style={[s.slipTd, { width: 100, textAlign: 'right', color: colors.danger }]}>
                      -{formatRupees(selectedEmployee?.selectedSalary?.snapshot?.lateDeduction || 0)}
                    </Text>
                  </View>

                  <View style={[s.slipTableRow, { backgroundColor: 'rgba(255,255,255,0.04)' }]}>
                    <Text style={[s.slipTdBold, { flex: 1 }]}>Total Earnings (A)</Text>
                    <Text style={[s.slipTdBold, { width: 100, textAlign: 'right' }]}>{formatRupees(selectedEmployee?.currentGross)}</Text>
                    <Text style={[s.slipTdBold, { flex: 1 }]}>Total Deductions (B)</Text>
                    <Text style={[s.slipTdBold, { width: 100, textAlign: 'right', color: colors.danger }]}>
                      -{formatRupees(selectedEmployee?.currentDeduction)}
                    </Text>
                  </View>
                </View>

                {/* Final Settlement */}
                <View style={s.slipSettlement}>
                  <View style={s.slipSettlementRow}>
                    <Text style={s.slipSettlementLabel}>Previous Carry-Forward:</Text>
                    <Text style={s.slipSettlementVal}>
                      {selectedEmployee?.previousBalance > 0
                        ? `+${formatRupees(selectedEmployee?.previousBalance)} (Due)`
                        : selectedEmployee?.previousBalance < 0
                        ? `-${formatRupees(Math.abs(selectedEmployee?.previousBalance))} (Advance)`
                        : '₹0'}
                    </Text>
                  </View>

                  {selectedEmployee?.previousDuesBreakdown?.length > 0 ? (
                    <View style={s.duesBreakdownBox}>
                      <Text style={s.duesBreakdownTitle}>Pichle Mahino Ka Baki Hisab (Unpaid Dues Breakdown):</Text>
                      {selectedEmployee.previousDuesBreakdown.map((due: any, idx: number) => (
                        <View key={idx} style={s.dueItemRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={s.dueItemMonth}>{due.monthLabel}</Text>
                            {due.note ? <Text style={s.dueItemNote}>• {due.note}</Text> : null}
                            <Text style={s.dueItemCalc}>
                              Net: {formatRupees(due.netPayable)} | Paid: {formatRupees(due.paidAmount)}
                            </Text>
                          </View>
                          <Text style={[s.dueItemBalance, due.isDue ? { color: colors.warning } : { color: '#a78bfa' }]}>
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
                      {formatRupees(selectedEmployee?.effectivePayable)}
                    </Text>
                  </View>
                  <View style={s.slipSettlementRow}>
                    <Text style={s.slipSettlementLabel}>Amount Disbursed / Paid:</Text>
                    <Text style={[s.slipSettlementVal, { color: colors.success, fontWeight: '700' }]}>
                      {formatRupees(selectedEmployee?.paidAmount)}
                    </Text>
                  </View>
                  <View style={s.slipSettlementRow}>
                    <Text style={s.slipSettlementLabel}>Remaining Due / Advance:</Text>
                    <Text style={[s.slipSettlementVal, { fontWeight: '700' }]}>
                      {selectedEmployee?.remainingDue > 0
                        ? `${formatRupees(selectedEmployee?.remainingDue)} (Due)`
                        : selectedEmployee?.advanceCredit > 0
                        ? `${formatRupees(selectedEmployee?.advanceCredit)} (Advance Credit)`
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
                  onPress={() => handleDownloadSlip(selectedEmployee)}
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
                    <Ionicons name="print-outline" size={18} color={colors.ink} />
                    <Text style={s.btnPrintSlipText}>Print</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 3: SALARY & PAYMENT HISTORY (IMMUTABLE AUDIT LOG) ── */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={activeModal === 'HISTORY' && !!selectedEmployee}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { maxWidth: 700 }]}>
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalEyebrow}>IMMUTABLE FINANCIAL LEDGER</Text>
                <Text style={s.modalTitle}>{selectedEmployee?.name} — Salary History</Text>
                <Text style={s.modalSubtitle}>
                  {selectedEmployee?.employeeId} • Base Salary: {formatRupees(selectedEmployee?.currentSalary)}
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
                  Audit Record: All past salary disbursements and ledger transactions are permanent and cannot be deleted.
                </Text>
              </View>

              {selectedEmployee?.monthlySalaries?.length === 0 ? (
                <Text style={s.emptyNotice}>No previous monthly salary records found.</Text>
              ) : (
                selectedEmployee?.monthlySalaries?.map((salary: any) => {
                  const payments = salary.payments || [];
                  const net = Number(salary.currentMonthNet ?? (Number(salary.grossAmount) - Number(salary.deductionAmount)));
                  const payable = Number(salary.effectiveTotalPayable ?? salary.netPayable);
                  const paid = Number(salary.paidAmount ?? payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0));
                  const due = Math.max(0, payable - paid);

                  return (
                    <View key={salary.id} style={s.historyCard}>
                      <View style={s.historyCardHeader}>
                        <View>
                          <Text style={s.historyPeriodTitle}>
                            {MONTH_NAMES[salary.month - 1]} {salary.year}
                          </Text>
                          <Text style={s.historyMeta}>
                            Gross: {formatRupees(salary.grossAmount)} • Deductions: -{formatRupees(salary.deductionAmount)} • Prev Balance: {formatRupees(salary.previousBalance)}
                          </Text>
                        </View>
                        <View style={s.historyBadgeRow}>
                          <Text style={s.historyPayableBadge}>
                            Net Payable: {formatRupees(payable)}
                          </Text>
                        </View>
                      </View>

                      {/* Payment Transactions List */}
                      <View style={s.historyTxList}>
                        <Text style={s.historyTxTitle}>Payment Transactions:</Text>
                        {payments.length === 0 ? (
                          <Text style={s.noTxText}>No payments recorded for this period yet.</Text>
                        ) : (
                          payments.map((tx: any) => (
                            <View key={tx.id} style={s.txItem}>
                              <View style={s.txLeft}>
                                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                                <View>
                                  <Text style={s.txAmount}>{formatRupees(tx.amount)}</Text>
                                  <Text style={s.txMeta}>
                                    Paid on {formatDate(tx.paidDate)} via {tx.method || 'CASH'}
                                    {tx.reference ? ` • Ref: ${tx.reference}` : ''}
                                  </Text>
                                </View>
                              </View>
                              <View style={s.txRight}>
                                <Text style={s.txStatusSuccess}>SUCCESS</Text>
                                {tx.remarks ? <Text style={s.txRemarks}>{tx.remarks}</Text> : null}
                              </View>
                            </View>
                          ))
                        )}
                      </View>

                      <View style={s.historyCardFooter}>
                        <Text style={s.historyFooterText}>
                          Paid: <Text style={{ color: colors.success, fontWeight: '700' }}>{formatRupees(paid)}</Text> •{' '}
                          Remaining Due: <Text style={{ color: due > 0 ? colors.warning : colors.ink, fontWeight: '700' }}>{formatRupees(due)}</Text>
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 4: UPDATE BASE SALARY REVISION ── */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={activeModal === 'REVISE' && !!selectedEmployee}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalEyebrow}>UPDATE EMPLOYEE SALARY</Text>
                <Text style={s.modalTitle}>{selectedEmployee?.name}</Text>
                <Text style={s.modalSubtitle}>
                  Current Base Salary: {formatRupees(selectedEmployee?.currentSalary)}
                </Text>
              </View>
              <TouchableOpacity onPress={closeModal} style={s.modalCloseBtn}>
                <Ionicons name="close" size={20} color={tc.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.modalContent}>
              <View style={s.formGroup}>
                <Text style={s.formLabel}>New Base Salary (₹) *</Text>
                <TextInput
                  style={s.formInput}
                  keyboardType="numeric"
                  placeholder="e.g. 18000"
                  placeholderTextColor={tc.muted}
                  value={revisionAmount}
                  onChangeText={setRevisionAmount}
                />
              </View>

              <View style={s.formGroup}>
                <Text style={s.formLabel}>Effective Date (YYYY-MM-DD) *</Text>
                <TextInput
                  style={s.formInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={tc.muted}
                  value={revisionDate}
                  onChangeText={setRevisionDate}
                />
              </View>

              <View style={s.formGroup}>
                <Text style={s.formLabel}>Reason for Revision *</Text>
                <TextInput
                  style={[s.formInput, { height: 60 }]}
                  multiline
                  placeholder="e.g. Annual revision, Promotion, Performance increment"
                  placeholderTextColor={tc.muted}
                  value={revisionReason}
                  onChangeText={setRevisionReason}
                />
              </View>

              {actionError ? <Text style={s.errorBanner}>{actionError}</Text> : null}
              {actionSuccess ? <Text style={s.successBanner}>{actionSuccess}</Text> : null}

              <TouchableOpacity
                accessibilityRole="button"
                style={[s.btnSubmit, actionLoading && s.btnDisabled]}
                onPress={handleRecordRevision}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#080c14" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={18} color="#080c14" />
                    <Text style={s.btnSubmitText}>Update Base Salary</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

let stylesDark: any = null;
let stylesLight: any = null;

function getThemedStyles(isDark: boolean) {
  if (isDark) {
    if (!stylesDark) stylesDark = StyleSheet.create(createStyles(THEME_PALETTES.dark, true));
    return stylesDark;
  } else {
    if (!stylesLight) stylesLight = StyleSheet.create(createStyles(THEME_PALETTES.light, false));
    return stylesLight;
  }
}

function createStyles(tc: ThemeColors, isDark: boolean) {
  return {
  container: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  topBar: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: tc.primary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  headingTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: tc.text,
  },
  subheading: {
    fontSize: 13,
    color: tc.muted,
    marginTop: 2,
    maxWidth: 620,
  },
  monthSelectorCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : tc.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: tc.border,
    padding: 4,
    gap: 6,
  },
  monthNavBtn: {
    padding: 8,
    borderRadius: radius.sm,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
  },
  monthDisplay: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingHorizontal: 10,
  },
  monthYearText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: tc.text,
  },

  // KPI Stats Grid
  statsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : tc.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: tc.border,
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
    fontSize: 10.5,
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
    fontSize: 11.5,
    color: tc.muted,
  },

  // Filters & Search
  filterContainer: {
    gap: 10,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : tc.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: tc.border,
    padding: 12,
  },
  searchBox: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.03)',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: tc.border,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: tc.text,
  },
  chipRow: {
    flexDirection: 'row' as const,
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: isDark ? 'rgba(147, 155, 255, 0.16)' : 'rgba(14, 165, 233, 0.12)',
    borderColor: tc.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: tc.muted,
    fontWeight: '600' as const,
  },
  filterChipTextActive: {
    color: tc.text,
    fontWeight: '700' as const,
  },
  statusFilterRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: tc.border,
    paddingTop: 8,
  },
  statusChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
  },
  statusChipActive: {
    backgroundColor: tc.primary,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: tc.muted,
  },
  statusChipTextActive: {
    color: '#ffffff',
  },

  // Loading & Empty
  loadingContainer: {
    padding: 60,
    alignItems: 'center' as const,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: tc.muted,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center' as const,
    gap: 10,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : tc.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: tc.border,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: tc.text,
  },
  emptySubtitle: {
    fontSize: 13,
    color: tc.muted,
    textAlign: 'center' as const,
    maxWidth: 400,
  },

  // Main Table
  tableScroll: {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : tc.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: tc.border,
  },
  table: {
    minWidth: 1150,
  },
  tableHeaderRow: {
    flexDirection: 'row' as const,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.03)',
    borderBottomWidth: 1,
    borderBottomColor: tc.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  th: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: tc.muted,
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: tc.border,
  },
  tableRowAlt: {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.015)' : 'rgba(0, 0, 0, 0.015)',
  },
  td: {
    paddingHorizontal: 4,
  },
  empName: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: tc.text,
  },
  empMetaRow: {
    flexDirection: 'row' as const,
    gap: 6,
    marginTop: 3,
  },
  empIdBadge: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: tc.primary,
    backgroundColor: isDark ? 'rgba(147, 155, 255, 0.12)' : 'rgba(14, 165, 233, 0.12)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  empRoleBadge: {
    fontSize: 10,
    color: tc.muted,
  },
  cellMoney: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: tc.text,
  },
  cellMoneyBold: {
    fontSize: 13,
    fontWeight: '800' as const,
  },
  cellSubMeta: {
    fontSize: 10,
    color: tc.muted,
    marginTop: 1,
  },

  // Attendance Pills
  attPillPresent: {
    backgroundColor: isDark ? 'rgba(52, 211, 153, 0.12)' : 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(52, 211, 153, 0.25)' : 'rgba(16, 185, 129, 0.25)',
  },
  attPillPresentText: {
    fontSize: 10.5,
    fontWeight: '700' as const,
    color: isDark ? colors.success : '#059669',
  },
  attPillAbsent: {
    backgroundColor: isDark ? 'rgba(248, 113, 113, 0.12)' : 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(248, 113, 113, 0.25)' : 'rgba(239, 68, 68, 0.25)',
  },
  attPillAbsentText: {
    fontSize: 10.5,
    fontWeight: '700' as const,
    color: isDark ? colors.danger : '#dc2626',
  },
  attPillHalfDay: {
    backgroundColor: isDark ? 'rgba(251, 191, 36, 0.12)' : 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(251, 191, 36, 0.25)' : 'rgba(245, 158, 11, 0.25)',
  },
  attPillHalfDayText: {
    fontSize: 10.5,
    fontWeight: '700' as const,
    color: isDark ? colors.warning : '#d97706',
  },
  attPillLate: {
    backgroundColor: isDark ? 'rgba(167, 139, 250, 0.15)' : 'rgba(124, 58, 237, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(167, 139, 250, 0.3)' : 'rgba(124, 58, 237, 0.25)',
  },
  attPillLateText: {
    fontSize: 10.5,
    fontWeight: '700' as const,
    color: isDark ? '#c4b5fd' : '#7c3aed',
  },

  // Status Badges
  badgeSuccess: {
    backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : 'rgba(16, 185, 129, 0.12)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: isDark ? colors.success : '#059669',
  },
  badgeSuccessText: {
    fontSize: 10.5,
    fontWeight: '800' as const,
    color: isDark ? colors.success : '#059669',
  },
  badgeWarning: {
    backgroundColor: isDark ? 'rgba(251, 191, 36, 0.15)' : 'rgba(245, 158, 11, 0.12)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: isDark ? colors.warning : '#d97706',
  },
  badgeWarningText: {
    fontSize: 10.5,
    fontWeight: '800' as const,
    color: isDark ? colors.warning : '#d97706',
  },
  badgeDanger: {
    backgroundColor: isDark ? 'rgba(248, 113, 113, 0.15)' : 'rgba(239, 68, 68, 0.12)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: isDark ? colors.danger : '#dc2626',
  },
  badgeDangerText: {
    fontSize: 10.5,
    fontWeight: '800' as const,
    color: isDark ? colors.danger : '#dc2626',
  },
  badgePurple: {
    backgroundColor: isDark ? 'rgba(167, 139, 250, 0.18)' : 'rgba(124, 58, 237, 0.12)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: isDark ? '#a78bfa' : '#7c3aed',
  },
  badgePurpleText: {
    fontSize: 10.5,
    fontWeight: '800' as const,
    color: isDark ? '#c4b5fd' : '#7c3aed',
  },

  // Row Action Buttons
  actionBtnPay: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    backgroundColor: tc.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  actionBtnPayText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: '#ffffff',
  },
  actionBtnSlip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
    borderWidth: 1,
    borderColor: tc.border,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  actionBtnSlipText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: tc.text,
  },
  actionBtnHistory: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
    borderWidth: 1,
    borderColor: tc.border,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  actionBtnHistoryText: {
    fontSize: 11,
    color: tc.text,
  },
  actionBtnRevise: {
    padding: 6,
    borderRadius: radius.sm,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
    borderWidth: 1,
    borderColor: tc.border,
  },

  // Modal Common Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 16,
  },
  modalBox: {
    width: '100%' as const,
    maxWidth: 540,
    maxHeight: '90%' as const,
    backgroundColor: tc.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: tc.border,
    overflow: 'hidden' as const,
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: tc.border,
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

  // Financial Breakdown in Pay Modal
  breakdownCard: {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: tc.border,
    padding: 14,
    gap: 6,
  },
  breakdownTitle: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: tc.primary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  breakdownRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  breakdownLabel: {
    fontSize: 12,
    color: tc.muted,
  },
  breakdownValue: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: tc.text,
  },
  breakdownHighlight: {
    backgroundColor: isDark ? 'rgba(147, 155, 255, 0.12)' : 'rgba(14, 165, 233, 0.12)',
    padding: 8,
    borderRadius: radius.sm,
    marginTop: 4,
  },
  breakdownHighlightLabel: {
    fontSize: 12.5,
    fontWeight: '800' as const,
    color: tc.primary,
  },
  breakdownHighlightValue: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: tc.text,
  },

  // Form Fields
  formGroup: {
    gap: 6,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: tc.text,
  },
  formInput: {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
    borderWidth: 1,
    borderColor: tc.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: tc.text,
  },
  fieldHelp: {
    fontSize: 11,
    color: tc.muted,
  },
  methodChoiceRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
  },
  methodChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
    borderWidth: 1,
    borderColor: tc.border,
  },
  methodChipActive: {
    backgroundColor: isDark ? 'rgba(147, 155, 255, 0.18)' : 'rgba(14, 165, 233, 0.15)',
    borderColor: tc.primary,
  },
  methodChipText: {
    fontSize: 11.5,
    color: tc.muted,
    fontWeight: '600' as const,
  },
  methodChipTextActive: {
    color: tc.text,
    fontWeight: '700' as const,
  },
  errorBanner: {
    backgroundColor: isDark ? 'rgba(248, 113, 113, 0.15)' : 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: tc.danger,
    borderRadius: radius.sm,
    padding: 10,
    fontSize: 12,
    color: tc.danger,
    fontWeight: '600' as const,
  },
  successBanner: {
    backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: tc.success,
    borderRadius: radius.sm,
    padding: 10,
    fontSize: 12,
    color: tc.success,
    fontWeight: '700' as const,
  },
  btnSubmit: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: 6,
    backgroundColor: tc.primary,
    borderRadius: radius.sm,
    paddingVertical: 12,
    marginTop: 6,
  },
  btnSubmitText: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: '#ffffff',
  },
  btnDisabled: {
    opacity: 0.6,
  },

  // Slip Modal
  slipPreviewCard: {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: tc.border,
    padding: 16,
    gap: 12,
  },
  slipHeaderBlock: {
    alignItems: 'center' as const,
    borderBottomWidth: 1,
    borderBottomColor: tc.border,
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
    color: tc.warning,
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
    borderColor: tc.border,
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
    borderTopColor: tc.border,
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
    borderColor: tc.border,
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
    color: '#ffffff',
  },
  btnPrintSlip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
    borderWidth: 1,
    borderColor: tc.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.sm,
  },
  btnPrintSlipText: {
    fontSize: 12.5,
    fontWeight: '700' as const,
    color: tc.text,
  },

  // History Modal
  auditNoticeBox: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    backgroundColor: isDark ? 'rgba(147, 155, 255, 0.1)' : 'rgba(14, 165, 233, 0.08)',
    borderWidth: 1,
    borderColor: tc.border,
    borderRadius: radius.sm,
    padding: 10,
  },
  auditNoticeText: {
    fontSize: 11.5,
    color: tc.text,
    flex: 1,
  },
  emptyNotice: {
    textAlign: 'center' as const,
    padding: 24,
    color: tc.muted,
    fontSize: 13,
  },
  historyCard: {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : tc.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: tc.border,
    padding: 14,
    gap: 10,
  },
  historyCardHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    borderBottomWidth: 1,
    borderBottomColor: tc.border,
    paddingBottom: 8,
  },
  historyPeriodTitle: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: tc.text,
  },
  historyMeta: {
    fontSize: 11,
    color: tc.muted,
    marginTop: 2,
  },
  historyBadgeRow: {
    alignItems: 'flex-end' as const,
  },
  historyPayableBadge: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: tc.primary,
  },
  historyTxList: {
    gap: 6,
  },
  historyTxTitle: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: tc.muted,
    letterSpacing: 0.5,
  },
  noTxText: {
    fontSize: 12,
    color: tc.muted,
    fontStyle: 'italic' as const,
  },
  txItem: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
    borderWidth: 1,
    borderColor: tc.border,
    borderRadius: radius.sm,
    padding: 8,
  },
  txLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  txAmount: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: tc.text,
  },
  txMeta: {
    fontSize: 11,
    color: tc.muted,
  },
  txRight: {
    alignItems: 'flex-end' as const,
  },
  txStatusSuccess: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: tc.success,
  },
  txRemarks: {
    fontSize: 10,
    color: tc.muted,
    maxWidth: 150,
  },
  historyCardFooter: {
    borderTopWidth: 1,
    borderTopColor: tc.border,
    paddingTop: 8,
    alignItems: 'flex-end' as const,
  },
  historyFooterText: {
    fontSize: 11.5,
    color: tc.muted,
  },
  duesBreakdownBox: {
    backgroundColor: isDark ? 'rgba(251, 191, 36, 0.08)' : 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(251, 191, 36, 0.25)' : 'rgba(245, 158, 11, 0.25)',
    borderRadius: radius.sm,
    padding: 10,
    marginTop: 6,
    gap: 6,
  },
  duesBreakdownTitle: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: tc.warning,
    letterSpacing: 0.5,
  },
  dueItemRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    borderTopWidth: 1,
    borderTopColor: tc.border,
    paddingTop: 4,
  },
  dueItemMonth: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: tc.text,
  },
  dueItemNote: {
    fontSize: 10.5,
    color: tc.muted,
  },
  dueItemCalc: {
    fontSize: 10.5,
    color: tc.muted,
  },
  dueItemBalance: {
    fontSize: 12,
    fontWeight: '800' as const,
  },
  };
}
