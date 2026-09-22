import { colors, surfaces } from '../theme';
import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

function money(value: any) {
  return Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function date(value: any) {
  const raw = String(value || '').slice(0, 10);
  return raw ? raw.split('-').reverse().join('/') : 'Date not available';
}

export function StudentFeesScreen() {
  const fees = useQuery<any>({ queryKey: ['student-fees-me'], queryFn: async () => (await api.get('/fees/me')).data });
  const account = fees.data;
  const transactions = Array.isArray(account?.transactions) ? account.transactions : [];
  const adjustments = Array.isArray(account?.adjustments) ? account.adjustments : [];

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
});
