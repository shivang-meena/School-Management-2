import { colors, surfaces } from '../theme';
import { useTheme, THEME_PALETTES, ThemeColors } from '../context/ThemeContext';
import React from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { downloadFeeReceiptPdf } from '../utils/feeReceiptPdf';

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void;
  modal?: { ondismiss?: () => void };
};

type RazorpayCheckout = { open: () => void };

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayCheckout;
  }
}

function loadRazorpayCheckout() {
  if (Platform.OS !== 'web') {
    return Promise.reject(new Error('Razorpay mobile checkout needs a native app build. Please use the web portal for now.'));
  }
  if (typeof window === 'undefined') return Promise.reject(new Error('Payment checkout is not available here.'));
  if (window.Razorpay) return Promise.resolve(window.Razorpay);

  return new Promise<NonNullable<Window['Razorpay']>>((resolve, reject) => {
    const existing = document.getElementById('razorpay-checkout-script') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => window.Razorpay ? resolve(window.Razorpay) : reject(new Error('Razorpay checkout could not be loaded.')), { once: true });
      existing.addEventListener('error', () => reject(new Error('Razorpay checkout could not be loaded.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.id = 'razorpay-checkout-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => window.Razorpay ? resolve(window.Razorpay) : reject(new Error('Razorpay checkout could not be loaded.'));
    script.onerror = () => reject(new Error('Razorpay checkout could not be loaded.'));
    document.body.appendChild(script);
  });
}

function money(value: any) {
  return Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function date(value: any) {
  const raw = String(value || '').slice(0, 10);
  return raw ? raw.split('-').reverse().join('/') : 'Date not available';
}

export function StudentFeesScreen() {
  const { isDark } = useTheme();
  const s = getThemedStyles(isDark);
  const fees = useQuery<any>({ queryKey: ['student-fees-me'], queryFn: async () => (await api.get('/fees/me')).data });
  const [paymentModalVisible, setPaymentModalVisible] = React.useState(false);
  const [amountText, setAmountText] = React.useState('');
  const [paymentError, setPaymentError] = React.useState('');
  const [paymentStarting, setPaymentStarting] = React.useState(false);
  const account = fees.data;
  const studentId = account?.student?.studentId;
  const studentQuery = useQuery<any>({
    queryKey: ['student-profile-receipt-meta', studentId],
    queryFn: async () => (await api.get(`/students/${studentId}`)).data,
    enabled: Boolean(studentId),
  });
  const attendanceQuery = useQuery<any>({
    queryKey: ['student-attendance-receipt-meta', studentId],
    queryFn: async () => (await api.get(`/attendance/students/${studentId}`)).data,
    enabled: Boolean(studentId),
  });
  const transactions = Array.isArray(account?.transactions) ? account.transactions : [];
  const adjustments = Array.isArray(account?.adjustments) ? account.adjustments : [];
  const outstanding = Number(account?.outstanding || 0);

  const openPaymentModal = () => {
    setAmountText('');
    setPaymentError('');
    setPaymentModalVisible(true);
  };

  const closePaymentModal = () => {
    if (!paymentStarting) setPaymentModalVisible(false);
  };

  const startOnlinePayment = async () => {
    const amount = Number(amountText.trim());
    if (!amountText.trim() || !Number.isFinite(amount) || amount <= 0) {
      setPaymentError('Please enter a valid amount.');
      return;
    }
    if (Math.round(amount * 100) !== amount * 100) {
      setPaymentError('Amount can have maximum two decimal places.');
      return;
    }

    setPaymentStarting(true);
    setPaymentError('');
    try {
      const orderResponse = await api.post('/fees/online/orders', { feeAccountId: account.id, amount });
      const order = orderResponse.data;
      const Razorpay = await loadRazorpayCheckout();
      const checkout = new Razorpay({
        key: order.keyId,
        amount: Math.round(Number(order.amount) * 100),
        currency: order.currency || 'INR',
        name: 'School Fee Payment',
        description: `Fee payment for ${account?.student?.name || 'student'}`,
        order_id: order.gatewayOrderId,
        prefill: { name: account?.student?.name, email: account?.student?.email, contact: account?.student?.mobile },
        theme: { color: colors.blue },
        handler: async (response) => {
          try {
            await api.post('/fees/online/verify', {
              orderId: order.orderId,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
            });
            setPaymentModalVisible(false);
            setAmountText('');
            await fees.refetch();
            Alert.alert('Payment successful', 'Your fee payment has been registered successfully.');
          } catch (error: any) {
            setPaymentError(error?.response?.data?.message || 'Payment was received but verification is pending. Please refresh after some time.');
          } finally {
            setPaymentStarting(false);
          }
        },
        modal: { ondismiss: () => setPaymentStarting(false) },
      });
      checkout.open();
    } catch (error: any) {
      setPaymentStarting(false);
      setPaymentError(error?.response?.data?.message || error?.message || 'Online payment could not be started.');
    }
  };

  return <View style={s.page}>
    <ScrollView contentContainerStyle={s.content}>
      <View style={s.hero}>
        <Text style={s.eyebrow}>MY FEE ACCOUNT</Text>
        <Text style={s.title}>Fees & Payments</Text>
        <Text style={s.description}>Your assessed fee, verified payments, remaining balance and payment history.</Text>
      </View>

      {fees.isLoading ? <View style={s.state}><ActivityIndicator color={colors.blue} /><Text style={s.muted}>Loading fee details…</Text></View>
        : fees.isError ? <View style={s.state}><Text style={s.error}>Fee details could not be loaded.</Text><TouchableOpacity onPress={() => { void fees.refetch(); }}><Text style={s.retry}>Try again</Text></TouchableOpacity></View>
        : <>
          <View style={s.summaryPanel}>
            <View style={s.accountHeader}>
              <View style={s.accountCopy}>
                <Text style={s.panelTitle}>{account?.academicYear?.name || 'Current academic year'}</Text>
                <Text style={s.muted}>{account?.student?.name || 'Student'} · Fee account summary</Text>
              </View>
              <TouchableOpacity accessibilityRole="button" onPress={() => { void fees.refetch(); }} style={s.refresh}><Text style={s.refreshText}>↻ Refresh</Text></TouchableOpacity>
            </View>
            <View style={s.summaryGrid}>
              <View style={s.summaryCard}><Text style={s.summaryLabel}>Total assessed</Text><Text style={s.summaryValue}>₹{money(account?.assessed)}</Text></View>
              <View style={s.summaryCard}><Text style={s.summaryLabel}>Total paid</Text><Text style={[s.summaryValue, s.paid]}>₹{money(account?.netPaid)}</Text></View>
              <View style={s.summaryCard}><Text style={s.summaryLabel}>Remaining</Text><Text style={[s.summaryValue, s.remaining]}>₹{money(account?.outstanding)}</Text></View>
              <View style={s.summaryCard}><Text style={s.summaryLabel}>Credit</Text><Text style={[s.summaryValue, s.credit]}>₹{money(account?.creditBalance)}</Text></View>
            </View>
            <TouchableOpacity accessibilityRole="button" disabled={paymentStarting} onPress={openPaymentModal} style={[s.payButton, paymentStarting && s.disabled]}>
              <Text style={s.payButtonText}>{paymentStarting ? 'Opening payment…' : outstanding > 0 ? 'Pay Online' : 'Pay Online (Advance / Extra)'}</Text>
            </TouchableOpacity>
            {outstanding <= 0 ? <Text style={s.paidMessage}>No outstanding fee is due. Any extra payment will be added to your credit balance.</Text> : null}
            {adjustments.length ? <Text style={s.adjustment}>Adjustments included: ₹{money(adjustments.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0))}</Text> : null}
          </View>

          <View style={s.sectionHeader}><View><Text style={s.sectionTitle}>Payment history</Text><Text style={s.muted}>{transactions.length} payment record(s)</Text></View></View>
          {transactions.length ? transactions.map((transaction: any) => {
            const studentEnrollment = studentQuery.data?.enrollments?.find((e: any) => e.status === 'CURRENT') || studentQuery.data?.enrollments?.[0];
            const accountEnrollment = account?.student?.enrollments?.[0];
            const className =
              account?.className ||
              accountEnrollment?.section?.schoolClass?.name ||
              studentEnrollment?.section?.schoolClass?.name ||
              account?.feeStructure?.schoolClass?.name ||
              attendanceQuery.data?.section?.className ||
              '';
            const sectionName =
              account?.sectionName ||
              accountEnrollment?.section?.name ||
              studentEnrollment?.section?.name ||
              attendanceQuery.data?.section?.name ||
              '';
            const rollNumber =
              account?.rollNumber ||
              accountEnrollment?.rollNumber ||
              studentEnrollment?.rollNumber ||
              attendanceQuery.data?.rollNumber ||
              attendanceQuery.data?.student?.rollNumber ||
              '';

            return (
              <View style={s.paymentCard} key={transaction.id}>
                <View style={s.paymentTop}>
                  <View style={s.paymentCopy}>
                    <Text style={s.receipt}>{transaction.receiptNo || 'Payment record'}</Text>
                    <Text style={s.paymentDate}>{date(transaction.paymentDate)}</Text>
                  </View>
                  <View style={s.actionsRow}>
                    <TouchableOpacity
                      accessibilityRole="button"
                      style={s.downloadReceiptBtn}
                      onPress={() => {
                        downloadFeeReceiptPdf({
                          receiptNo: transaction.receiptNo,
                          paymentDate: transaction.paymentDate,
                          amount: transaction.amount,
                          method: transaction.method,
                          status: transaction.status,
                          reference: transaction.reference,
                          remarks: transaction.remarks,
                          studentName: account?.student?.name,
                          studentId: account?.student?.studentId,
                          rollNumber,
                          className,
                          sectionName,
                          academicYear: account?.academicYear?.name,
                          assessed: account?.assessed,
                          netPaid: account?.netPaid,
                          outstanding: account?.outstanding,
                          creditBalance: account?.creditBalance,
                        });
                      }}
                    >
                      <Text style={s.downloadReceiptText}>⬇ Receipt PDF</Text>
                    </TouchableOpacity>
                    <View style={[s.status, transaction.status !== 'SUCCESS' && s.pendingStatus]}>
                      <Text style={[s.statusText, transaction.status !== 'SUCCESS' && s.pendingStatusText]}>
                        {String(transaction.status || 'UNKNOWN').replace('_', ' ')}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={s.paymentDetails}>
                  <Text style={s.amount}>₹{money(transaction.amount)}</Text>
                  <Text style={s.method}>{String(transaction.method || 'METHOD NOT SET').replace('_', ' ')}</Text>
                </View>
                {transaction.reference ? <Text style={s.meta}>Reference: {transaction.reference}</Text> : null}
                {transaction.remarks ? <Text style={s.meta}>Remarks: {transaction.remarks}</Text> : null}
              </View>
            );
          }) : <View style={s.state}><Text style={s.stateTitle}>No payment records yet</Text><Text style={s.muted}>Your fee payment receipts will appear here after a successful payment.</Text></View>}
        </>}
    </ScrollView>

    <Modal visible={paymentModalVisible} transparent animationType="fade" onRequestClose={closePaymentModal}>
      <View style={s.overlay}>
        <View style={s.modalCard}>
          <Text style={s.eyebrow}>RAZORPAY PAYMENT</Text>
          <Text style={s.modalTitle}>Enter payment amount</Text>
          <Text style={s.muted}>Enter the amount you want to pay. Any extra amount will be added to your credit balance.</Text>
          <Text style={s.dueText}>{outstanding > 0 ? `Remaining fee: ₹${money(outstanding)}` : 'Remaining fee: ₹0 (Advance payment)'}</Text>
          <TextInput
            autoFocus
            keyboardType="decimal-pad"
            value={amountText}
            onChangeText={(value) => { setAmountText(value.replace(/[^0-9.]/g, '')); setPaymentError(''); }}
            placeholder="Enter amount"
            placeholderTextColor={isDark ? "rgba(255,255,255,0.25)" : "rgba(17,25,54,0.35)"}
            editable={!paymentStarting}
            style={s.amountInput}
          />
          {paymentError ? <Text style={s.error}>{paymentError}</Text> : null}
          <View style={s.modalActions}>
            <TouchableOpacity disabled={paymentStarting} onPress={closePaymentModal} style={s.cancelButton}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity disabled={paymentStarting} onPress={() => { void startOnlinePayment(); }} style={[s.confirmButton, paymentStarting && s.disabled]}><Text style={s.confirmText}>{paymentStarting ? 'Please wait…' : 'Continue to Pay'}</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  </View>;
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

const createStyles = (tc: ThemeColors, isDark: boolean) => ({
  page: { flex: 1, backgroundColor: tc.canvas },
  content: { ...surfaces.content, gap: 18 },
  hero: {
    ...surfaces.card,
    backgroundColor: tc.panel,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: tc.line,
  },
  eyebrow: { color: isDark ? colors.blueLight : colors.primary, fontSize: 10, fontWeight: '800' as const, letterSpacing: 1.4 },
  title: { color: tc.text, fontSize: 28, fontWeight: '800' as const, marginTop: 8, letterSpacing: -0.3 },
  description: { color: tc.muted, fontSize: 14, lineHeight: 21, marginTop: 8 },
  summaryPanel: {
    ...surfaces.card,
    backgroundColor: tc.panel,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: tc.line,
  },
  accountHeader: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, justifyContent: 'space-between' as const, flexWrap: 'wrap' as const, gap: 12 },
  accountCopy: { flex: 1, minWidth: 180 },
  panelTitle: { color: tc.text, fontSize: 19, fontWeight: '800' as const },
  refresh: {
    backgroundColor: isDark ? 'rgba(147, 155, 255, 0.15)' : 'rgba(99, 102, 241, 0.12)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(147, 155, 255, 0.30)' : 'rgba(99, 102, 241, 0.30)',
    borderRadius: 9,
    minHeight: 40,
    paddingHorizontal: 13,
    justifyContent: 'center' as const,
  },
  refreshText: { color: isDark ? colors.blueLight : colors.primary, fontWeight: '700' as const, fontSize: 12 },
  summaryGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 12, marginTop: 18 },
  summaryCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
    borderWidth: 1,
    borderColor: tc.line,
    borderRadius: 12,
    padding: 14,
  },
  summaryLabel: { color: tc.muted, fontSize: 12, fontWeight: '700' as const },
  summaryValue: { color: tc.text, fontSize: 21, fontWeight: '800' as const, marginTop: 7 },
  paid: { color: colors.success },
  remaining: { color: colors.danger },
  credit: { color: colors.warning },
  payButton: { backgroundColor: colors.primary, borderRadius: 10, minHeight: 48, alignItems: 'center' as const, justifyContent: 'center' as const, marginTop: 18, paddingHorizontal: 18 },
  payButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' as const },
  paidMessage: { color: colors.success, fontSize: 13, fontWeight: '700' as const, marginTop: 10 },
  adjustment: { color: tc.muted, fontSize: 12, marginTop: 14 },
  sectionHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const },
  sectionTitle: { color: tc.text, fontSize: 21, fontWeight: '800' as const },
  paymentCard: {
    ...surfaces.card,
    backgroundColor: tc.panel,
    borderRadius: 14,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: tc.line,
  },
  paymentTop: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, justifyContent: 'space-between' as const, flexWrap: 'wrap' as const, gap: 12 },
  paymentCopy: { flex: 1, minWidth: 180 },
  receipt: { color: tc.text, fontSize: 16, fontWeight: '800' as const },
  paymentDate: { color: tc.muted, fontSize: 12, marginTop: 4 },
  actionsRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    flexWrap: 'wrap' as const,
  },
  downloadReceiptBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: isDark ? 'rgba(96, 165, 250, 0.15)' : 'rgba(59, 130, 246, 0.12)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(96, 165, 250, 0.35)' : 'rgba(59, 130, 246, 0.30)',
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  downloadReceiptText: {
    color: isDark ? '#93c5fd' : '#2563eb',
    fontSize: 10.5,
    fontWeight: '800' as const,
  },
  status: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.30)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: { color: colors.success, fontSize: 10, fontWeight: '800' as const },
  pendingStatus: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.30)',
  },
  pendingStatusText: { color: colors.warning },
  paymentDetails: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: 12 },
  amount: { color: tc.text, fontSize: 22, fontWeight: '800' as const },
  method: { color: tc.muted, fontSize: 12, fontWeight: '700' as const },
  meta: { color: tc.muted, fontSize: 12, lineHeight: 18 },
  state: {
    ...surfaces.card,
    backgroundColor: tc.panel,
    borderRadius: 14,
    padding: 28,
    alignItems: 'center' as const,
    gap: 8,
    borderWidth: 1,
    borderColor: tc.line,
  },
  stateTitle: { color: tc.text, fontSize: 18, fontWeight: '800' as const, textAlign: 'center' as const },
  muted: { color: tc.muted, fontSize: 13, lineHeight: 20 },
  error: { color: colors.danger, fontWeight: '700' as const, textAlign: 'center' as const },
  retry: { color: isDark ? colors.blueLight : colors.primary, fontWeight: '800' as const, marginTop: 8 },
  overlay: { flex: 1, backgroundColor: 'rgba(4, 8, 18, 0.70)', alignItems: 'center' as const, justifyContent: 'center' as const, padding: 20 },
  modalCard: {
    width: '100%' as const,
    maxWidth: 480,
    backgroundColor: tc.panel,
    borderRadius: 16,
    padding: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: tc.line,
  },
  modalTitle: { color: tc.text, fontSize: 22, fontWeight: '800' as const },
  dueText: { color: tc.text, fontSize: 14, fontWeight: '800' as const, marginTop: 4 },
  amountInput: {
    borderWidth: 1.5,
    borderColor: tc.line,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
    borderRadius: 10,
    color: tc.text,
    fontSize: 20,
    fontWeight: '700' as const,
    minHeight: 52,
    paddingHorizontal: 14,
    marginTop: 4,
  },
  modalActions: { flexDirection: 'row' as const, justifyContent: 'flex-end' as const, gap: 10, marginTop: 8 },
  cancelButton: {
    minHeight: 44,
    borderRadius: 9,
    justifyContent: 'center' as const,
    paddingHorizontal: 16,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(17, 25, 54, 0.06)',
    borderWidth: 1,
    borderColor: tc.line,
  },
  cancelText: { color: tc.text, fontWeight: '800' as const },
  confirmButton: { minHeight: 44, borderRadius: 9, justifyContent: 'center' as const, paddingHorizontal: 16, backgroundColor: colors.primary },
  confirmText: { color: '#FFFFFF', fontWeight: '800' as const },
  disabled: { opacity: 0.6 },
});
