import { colors, surfaces } from '../theme';
import React from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

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
  const fees = useQuery<any>({ queryKey: ['student-fees-me'], queryFn: async () => (await api.get('/fees/me')).data });
  const [paymentModalVisible, setPaymentModalVisible] = React.useState(false);
  const [amountText, setAmountText] = React.useState('');
  const [paymentError, setPaymentError] = React.useState('');
  const [paymentStarting, setPaymentStarting] = React.useState(false);
  const account = fees.data;
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
            {outstanding > 0 ? <TouchableOpacity accessibilityRole="button" disabled={paymentStarting} onPress={openPaymentModal} style={[s.payButton, paymentStarting && s.disabled]}><Text style={s.payButtonText}>{paymentStarting ? 'Opening payment…' : 'Pay Online'}</Text></TouchableOpacity> : <Text style={s.paidMessage}>No outstanding fee is due.</Text>}
            {adjustments.length ? <Text style={s.adjustment}>Adjustments included: ₹{money(adjustments.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0))}</Text> : null}
          </View>

          <View style={s.sectionHeader}><View><Text style={s.sectionTitle}>Payment history</Text><Text style={s.muted}>{transactions.length} payment record(s)</Text></View></View>
          {transactions.length ? transactions.map((transaction: any) => <View style={s.paymentCard} key={transaction.id}>
            <View style={s.paymentTop}><View style={s.paymentCopy}><Text style={s.receipt}>{transaction.receiptNo || 'Payment record'}</Text><Text style={s.paymentDate}>{date(transaction.paymentDate)}</Text></View><View style={[s.status, transaction.status !== 'SUCCESS' && s.pendingStatus]}><Text style={[s.statusText, transaction.status !== 'SUCCESS' && s.pendingStatusText]}>{String(transaction.status || 'UNKNOWN').replace('_', ' ')}</Text></View></View>
            <View style={s.paymentDetails}><Text style={s.amount}>₹{money(transaction.amount)}</Text><Text style={s.method}>{String(transaction.method || 'METHOD NOT SET').replace('_', ' ')}</Text></View>
            {transaction.reference ? <Text style={s.meta}>Reference: {transaction.reference}</Text> : null}
            {transaction.remarks ? <Text style={s.meta}>Remarks: {transaction.remarks}</Text> : null}
          </View>) : <View style={s.state}><Text style={s.stateTitle}>No payment records yet</Text><Text style={s.muted}>Your fee payment receipts will appear here after a successful payment.</Text></View>}
        </>}
    </ScrollView>

    <Modal visible={paymentModalVisible} transparent animationType="fade" onRequestClose={closePaymentModal}>
      <View style={s.overlay}>
        <View style={s.modalCard}>
          <Text style={s.eyebrow}>RAZORPAY PAYMENT</Text>
          <Text style={s.modalTitle}>Enter payment amount</Text>
          <Text style={s.muted}>Enter the amount you want to pay. Any extra amount will be added to your credit balance.</Text>
          <Text style={s.dueText}>Remaining fee: ₹{money(outstanding)}</Text>
          <TextInput
            autoFocus
            keyboardType="decimal-pad"
            value={amountText}
            onChangeText={(value) => { setAmountText(value.replace(/[^0-9.]/g, '')); setPaymentError(''); }}
            placeholder="Enter amount"
            placeholderTextColor="#8A98A8"
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

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { ...surfaces.content, gap: 18 },
  hero: { ...surfaces.card, backgroundColor: colors.surface, borderRadius: 16, padding: 24 },
  eyebrow: { color: colors.blue, fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '700', marginTop: 8 },
  description: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 8 },
  summaryPanel: { ...surfaces.card, backgroundColor: colors.surface, borderRadius: 14, padding: 20 },
  accountHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  accountCopy: { flex: 1, minWidth: 180 },
  panelTitle: { color: colors.ink, fontSize: 19, fontWeight: '700' },
  refresh: { backgroundColor: colors.paleBlue, borderRadius: 9, minHeight: 40, paddingHorizontal: 13, justifyContent: 'center' },
  refreshText: { color: colors.blue, fontWeight: '700', fontSize: 12 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 18 },
  summaryCard: { flex: 1, minWidth: 160, backgroundColor: '#F4F7FC', borderRadius: 12, padding: 14 },
  summaryLabel: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  summaryValue: { color: colors.ink, fontSize: 21, fontWeight: '800', marginTop: 7 },
  paid: { color: '#18734A' },
  remaining: { color: '#B42318' },
  credit: { color: '#A66B1F' },
  payButton: { backgroundColor: colors.blue, borderRadius: 10, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 18, paddingHorizontal: 18 },
  payButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  paidMessage: { color: '#18734A', fontSize: 13, fontWeight: '700', marginTop: 18 },
  adjustment: { color: colors.muted, fontSize: 12, marginTop: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.ink, fontSize: 21, fontWeight: '800' },
  paymentCard: { ...surfaces.card, backgroundColor: colors.surface, borderRadius: 14, padding: 18, gap: 10 },
  paymentTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  paymentCopy: { flex: 1, minWidth: 180 },
  receipt: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  paymentDate: { color: colors.muted, fontSize: 12, marginTop: 4 },
  status: { backgroundColor: '#EAF4EF', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  statusText: { color: '#287A54', fontSize: 10, fontWeight: '800' },
  pendingStatus: { backgroundColor: '#FFF4D6' },
  pendingStatusText: { color: '#A66B1F' },
  paymentDetails: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  amount: { color: colors.ink, fontSize: 22, fontWeight: '800' },
  method: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  state: { ...surfaces.card, backgroundColor: colors.surface, borderRadius: 14, padding: 28, alignItems: 'center', gap: 8 },
  stateTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  error: { color: '#B42318', fontWeight: '700', textAlign: 'center' },
  retry: { color: colors.blue, fontWeight: '800', marginTop: 8 },
  overlay: { flex: 1, backgroundColor: 'rgba(7, 26, 47, 0.58)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 480, backgroundColor: colors.surface, borderRadius: 16, padding: 24, gap: 12 },
  modalTitle: { color: colors.ink, fontSize: 22, fontWeight: '800' },
  dueText: { color: colors.ink, fontSize: 14, fontWeight: '800', marginTop: 4 },
  amountInput: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, color: colors.ink, fontSize: 20, fontWeight: '700', minHeight: 52, paddingHorizontal: 14, marginTop: 4 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  cancelButton: { minHeight: 44, borderRadius: 9, justifyContent: 'center', paddingHorizontal: 16, backgroundColor: '#EEF2F7' },
  cancelText: { color: colors.ink, fontWeight: '800' },
  confirmButton: { minHeight: 44, borderRadius: 9, justifyContent: 'center', paddingHorizontal: 16, backgroundColor: colors.blue },
  confirmText: { color: '#FFFFFF', fontWeight: '800' },
  disabled: { opacity: 0.6 },
});
