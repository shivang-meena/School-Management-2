import { colors, surfaces } from '../theme';
import { useTheme, THEME_PALETTES, ThemeColors } from '../context/ThemeContext';
import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
type Props = { title:string; eyebrow:string; description:string; endpoint:string; admin?:boolean; actionLabel?:string };
export function PortalModuleScreen({title,eyebrow,description,endpoint,admin=false}:Props){
 const { isDark } = useTheme();
 const s = getThemedStyles(isDark);
 const {data,isLoading,isError,refetch}=useQuery({queryKey:['module',endpoint],queryFn:async()=>(await api.get(endpoint)).data});
 const isSalaryEndpoint = endpoint.includes('/employees/');
 const rows = isSalaryEndpoint ? (Array.isArray(data?.monthlySalaries) ? data.monthlySalaries : []) : Array.isArray(data) ? data : data ? Object.entries(data).filter(([,value])=>Array.isArray(value)).flatMap(([,value])=>value as any[]) : [];
 const formatMoney = (value:any) => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
 const salaryPaid = (row:any) => (row?.payments || []).filter((payment:any)=>payment.status === 'SUCCESS').reduce((sum:number,payment:any)=>sum + Number(payment.amount || 0), 0);
 const totalPaid = isSalaryEndpoint ? rows.reduce((sum:number,row:any)=>sum + salaryPaid(row), 0) : 0;
 const currentSalary = isSalaryEndpoint ? rows[0] : null;
 const currentMonthRemaining = currentSalary ? Math.max(Number(currentSalary.netPayable || 0) - salaryPaid(currentSalary), 0) : 0;
 const extraPaid = isSalaryEndpoint ? rows.reduce((sum:number,row:any)=>sum + Math.max(salaryPaid(row) - Number(row.netPayable || 0), 0), 0) : 0;
 const totalRemaining = isSalaryEndpoint ? rows.reduce((sum:number,row:any)=>sum + Math.max(Number(row.netPayable || 0) - salaryPaid(row), 0), 0) : 0;
 const emptyMessage = endpoint.includes('attendance') ? 'No attendance records are available for your account yet.' : endpoint.includes('fees') ? 'No fee account or payment information is available yet.' : endpoint.includes('results') || endpoint.includes('assessments') ? 'No published academic results are available yet.' : endpoint.includes('notices') ? 'No notices have been published for you yet.' : endpoint.includes('timetable') ? 'No academic periods are available for your class yet.' : 'No school records are available yet.';
  return (
    <View style={s.page}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.hero}>
          <View style={s.heroCopy}>
            <Text style={s.eyebrow}>{eyebrow}</Text>
            <Text style={s.title}>{title}</Text>
            <Text style={s.description}>{description}</Text>
          </View>
          {admin ? (
            <TouchableOpacity accessibilityRole="button" style={s.action} onPress={() => refetch()}>
              <Text style={s.actionText}>↻ Refresh data</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {!isLoading && !isError && isSalaryEndpoint && rows.length ? (
          <View style={s.salarySummary}>
            <Text style={s.summaryTitle}>Payment summary</Text>
            <View style={s.summaryGrid}>
              <View style={s.summaryCard}>
                <Text style={s.summaryLabel}>Total paid</Text>
                <Text style={s.summaryValue}>₹{formatMoney(totalPaid)}</Text>
              </View>
              <View style={s.summaryCard}>
                <Text style={s.summaryLabel}>This month remaining</Text>
                <Text style={s.summaryValue}>₹{formatMoney(currentMonthRemaining)}</Text>
              </View>
              <View style={s.summaryCard}>
                <Text style={s.summaryLabel}>Extra paid / credit</Text>
                <Text style={s.summaryValue}>₹{formatMoney(extraPaid)}</Text>
              </View>
              <View style={s.summaryCard}>
                <Text style={s.summaryLabel}>Total remaining</Text>
                <Text style={s.summaryValue}>₹{formatMoney(totalRemaining)}</Text>
              </View>
            </View>
          </View>
        ) : null}

        {isLoading ? (
          <View style={s.state}>
            <ActivityIndicator color={colors.primary} />
            <Text style={s.stateText}>Loading verified school records…</Text>
          </View>
        ) : isError ? (
          <View style={s.state}>
            <Text style={s.error}>Records could not be loaded.</Text>
            <TouchableOpacity onPress={() => refetch()}>
              <Text style={s.retry}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : rows.length === 0 ? (
          <View style={s.state}>
            <Text style={s.emptyIcon}>◇</Text>
            <Text style={s.stateTitle}>No records available</Text>
            <Text style={s.stateText}>{emptyMessage}</Text>
          </View>
        ) : (
          <View style={s.grid}>
            {rows.slice(0, 50).map((row: any, index: number) => {
              const paid = isSalaryEndpoint ? salaryPaid(row) : 0;
              const payable = isSalaryEndpoint ? Number(row.netPayable || 0) : 0;
              const monthLabel =
                isSalaryEndpoint && row.month && row.year
                  ? new Date(2000, row.month - 1, 1).toLocaleString('en-US', { month: 'long' }) + ' ' + row.year
                  : '';
              const salaryStatus = paid >= payable && payable > 0 ? 'PAID' : paid > 0 ? 'PARTIALLY PAID' : 'PENDING';
              const cardTitle = isSalaryEndpoint
                ? monthLabel
                : String(row.title || row.name || row.studentId || row.employeeId || `Record ${index + 1}`);
              const cardBadge = isSalaryEndpoint
                ? salaryStatus
                : String(row.status || row.type || 'ACTIVE').split('_').join(' ');
              const cardBody = isSalaryEndpoint
                ? 'Gross ₹' +
                  formatMoney(row.grossAmount) +
                  ' · Deduction ₹' +
                  formatMoney(row.deductionAmount) +
                  ' · Payable ₹' +
                  formatMoney(payable) +
                  ' · Paid ₹' +
                  formatMoney(paid) +
                  ' · Remaining ₹' +
                  formatMoney(Math.max(payable - paid, 0)) +
                  (row.payments?.[0]?.paidDate
                    ? ' · Last paid ' + new Date(row.payments[0].paidDate).toLocaleDateString('en-IN')
                    : '')
                : String(
                    row.message ||
                      row.designation ||
                      row.description ||
                      row.academicYear?.name ||
                      'Additional details are not available.'
                  );
              return (
                <View style={s.card} key={row.id || index}>
                  <View style={s.cardTop}>
                    <Text style={s.cardTitle}>{cardTitle}</Text>
                    <View style={s.badge}>
                      <Text style={s.badgeText}>{cardBadge}</Text>
                    </View>
                  </View>
                  <Text style={s.cardBody}>{cardBody}</Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
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

const createStyles = (tc: ThemeColors, isDark: boolean) => ({
  page: { flex: 1, backgroundColor: tc.canvas },
  content: { ...surfaces.content },
  hero: {
    ...surfaces.card,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    gap: 20,
    marginBottom: 20,
    padding: 24,
    borderRadius: 16,
    backgroundColor: tc.panel,
    borderWidth: 1,
    borderColor: tc.line,
    flexWrap: 'wrap' as const,
  },
  heroCopy: { flex: 1 },
  salarySummary: {
    ...surfaces.card,
    backgroundColor: tc.panel,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: tc.line,
    borderRadius: 14,
  },
  summaryTitle: { color: tc.text, fontSize: 17, fontWeight: '800' as const, marginBottom: 12 },
  summaryGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 12 },
  summaryCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
    borderWidth: 1,
    borderColor: tc.line,
    borderRadius: 12,
    padding: 14,
  },
  summaryLabel: { color: tc.muted, fontSize: 12, fontWeight: '700' as const },
  summaryValue: { color: tc.text, fontSize: 20, fontWeight: '800' as const, marginTop: 6 },
  eyebrow: { fontWeight: '800' as const, fontSize: 10, letterSpacing: 1.4, color: isDark ? colors.blueLight : colors.primary },
  title: { marginVertical: 6, fontSize: 28, color: tc.text, fontWeight: '800' as const, letterSpacing: -0.3 },
  description: { fontSize: 14, maxWidth: 720, lineHeight: 21, color: tc.muted },
  action: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center' as const,
    backgroundColor: colors.primary,
    minHeight: 44,
  },
  actionText: { fontWeight: '800' as const, color: '#080c14' },
  state: {
    ...surfaces.card,
    backgroundColor: tc.panel,
    padding: 42,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: tc.line,
    borderRadius: 14,
  },
  stateTitle: { fontSize: 18, fontWeight: '800' as const, color: tc.text, marginBottom: 5 },
  stateText: { color: tc.muted, fontSize: 13, marginTop: 9, textAlign: 'center' as const },
  emptyIcon: { fontSize: 36, color: isDark ? colors.blueLight : colors.primary },
  error: { color: colors.danger, fontWeight: '700' as const },
  retry: { color: isDark ? colors.blueLight : colors.primary, fontWeight: '800' as const, marginTop: 10 },
  grid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 14 },
  card: {
    ...surfaces.card,
    backgroundColor: tc.panel,
    padding: 18,
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 14,
    borderColor: tc.line,
  },
  cardTop: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, flexWrap: 'wrap' as const, gap: 12 },
  cardTitle: { fontSize: 15, fontWeight: '800' as const, color: tc.text, flex: 1 },
  cardBody: { color: tc.muted, fontSize: 13, lineHeight: 19, marginTop: 12 },
  badge: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.30)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: { fontSize: 10, fontWeight: '800' as const, color: colors.success },
});
