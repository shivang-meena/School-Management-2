import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Header } from '../../src/components/Header';
import { AdminNav } from '../../src/components/AdminNav';
import { useAccountsOverview } from '../../src/hooks/useQueries';
import { api } from '../../src/services/api';
import { useQueryClient } from '@tanstack/react-query';

export default function AccountsManagementScreen() {
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    type: 'EXPENSE' as 'EXPENSE' | 'INCOME',
    title: '',
    amount: 5000,
    date: new Date().toISOString().split('T')[0],
    description: '',
  });

  const { data: accounts, isLoading } = useAccountsOverview();

  const handleCreate = async () => {
    if (!formData.title || !formData.amount) {
      Alert.alert('Validation Error', 'Title and amount are required.');
      return;
    }

    try {
      await api.post('/accounts', {
        ...formData,
        amount: Number(formData.amount),
      });
      queryClient.invalidateQueries({ queryKey: ['accounts-overview'] });
      Alert.alert('Transaction Recorded', 'Entry added to accounting ledger.');
      setModalVisible(false);
      setFormData({
        type: 'EXPENSE',
        title: '',
        amount: 5000,
        date: new Date().toISOString().split('T')[0],
        description: '',
      });
    } catch {
      Alert.alert('Error', 'Failed to add transaction.');
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Confirm Delete', 'Delete this transaction entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/accounts/${id}`);
            queryClient.invalidateQueries({ queryKey: ['accounts-overview'] });
          } catch {
            Alert.alert('Error', 'Failed to delete transaction.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Header title="Institution Finances" />
      <AdminNav />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.pageTitle}>Accounting & Treasury</Text>
            <Text style={styles.pageSubtitle}>Campus cash flow, operational costs & salaries</Text>
          </View>

          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.addBtnText}>+ Add Transaction</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 30 }} />
        ) : (
          <>
            {/* Financial Overview Grid */}
            <View style={styles.summaryGrid}>
              <View style={[styles.summaryCard, { borderLeftColor: '#10b981' }]}>
                <Text style={styles.sLabel}>Total Revenue (Inflow)</Text>
                <Text style={[styles.sVal, { color: '#16a34a' }]}>
                  ₹{(accounts?.grandTotalIncome || 0).toLocaleString('en-IN')}
                </Text>
                <Text style={styles.sHint}>
                  Fees: ₹{(accounts?.totalFeesCollected || 0).toLocaleString('en-IN')} | Other: ₹{(accounts?.totalOtherIncome || 0).toLocaleString('en-IN')}
                </Text>
              </View>

              <View style={[styles.summaryCard, { borderLeftColor: '#ef4444' }]}>
                <Text style={styles.sLabel}>Total Outflow (Expenses)</Text>
                <Text style={[styles.sVal, { color: '#dc2626' }]}>
                  ₹{(accounts?.grandTotalExpense || 0).toLocaleString('en-IN')}
                </Text>
                <Text style={styles.sHint}>
                  Payroll: ₹{(accounts?.totalMonthlySalary || 0).toLocaleString('en-IN')} | Ops: ₹{(accounts?.totalExpenses || 0).toLocaleString('en-IN')}
                </Text>
              </View>

              <View style={[styles.summaryCard, { borderLeftColor: '#3b82f6' }]}>
                <Text style={styles.sLabel}>Net Cash Balance</Text>
                <Text style={[styles.sVal, { color: '#2563eb' }]}>
                  ₹{(accounts?.netBalance || 0).toLocaleString('en-IN')}
                </Text>
                <Text style={styles.sHint}>Surplus / Reserve funds</Text>
              </View>
            </View>

            {/* Transactions Ledger */}
            <Text style={styles.sectionHeader}>Operational Ledger Entries</Text>
            <View style={styles.transList}>
              {accounts?.recentTransactions?.map((t: any) => (
                <View key={t.id} style={styles.transCard}>
                  <View style={styles.transLeft}>
                    <View style={[
                      styles.typeBadge,
                      t.type === 'INCOME' ? styles.incomeBadge : styles.expenseBadge
                    ]}>
                      <Text style={[
                        styles.typeText,
                        t.type === 'INCOME' ? styles.incomeText : styles.expenseText
                      ]}>
                        {t.type}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.transTitle}>{t.title}</Text>
                      <Text style={styles.transDate}>📅 {t.date} {t.description ? `• ${t.description}` : ''}</Text>
                    </View>
                  </View>

                  <View style={styles.transRight}>
                    <Text style={[
                      styles.transAmount,
                      t.type === 'INCOME' ? styles.incomeText : styles.expenseText
                    ]}>
                      {t.type === 'INCOME' ? '+' : '-'}₹{t.amount?.toLocaleString('en-IN')}
                    </Text>
                    <TouchableOpacity onPress={() => handleDelete(t.id)}>
                      <Text style={styles.delLink}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Add Transaction Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Record Income or Expense</Text>

            <Text style={styles.label}>Transaction Category</Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.catBtn, formData.type === 'EXPENSE' && styles.activeExpBtn]}
                onPress={() => setFormData({ ...formData, type: 'EXPENSE' })}
              >
                <Text style={[styles.catText, formData.type === 'EXPENSE' && styles.activeCatText]}>
                  Expense (Outflow)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.catBtn, formData.type === 'INCOME' && styles.activeIncBtn]}
                onPress={() => setFormData({ ...formData, type: 'INCOME' })}
              >
                <Text style={[styles.catText, formData.type === 'INCOME' && styles.activeCatText]}>
                  Income (Inflow)
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Title / Purpose *</Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(t) => setFormData({ ...formData, title: t })}
              placeholder="e.g. Science Lab Equipment"
            />

            <Text style={styles.label}>Amount (₹) *</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={String(formData.amount)}
              onChangeText={(t) => setFormData({ ...formData, amount: Number(t) || 0 })}
              placeholder="Amount in Rupees"
            />

            <Text style={styles.label}>Date</Text>
            <TextInput
              style={styles.input}
              value={formData.date}
              onChangeText={(t) => setFormData({ ...formData, date: t })}
            />

            <Text style={styles.label}>Description / Invoice Ref</Text>
            <TextInput
              style={styles.input}
              value={formData.description}
              onChangeText={(t) => setFormData({ ...formData, description: t })}
              placeholder="Optional notes"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreate}>
                <Text style={styles.saveBtnText}>Save Entry</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 20, paddingBottom: 40 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  pageSubtitle: { fontSize: 13, color: '#64748b' },
  addBtn: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  addBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 24 },
  summaryCard: {
    backgroundColor: '#ffffff',
    flex: 1,
    minWidth: 200,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 4 },
  sVal: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  sHint: { fontSize: 11, color: '#94a3b8' },
  sectionHeader: { fontSize: 17, fontWeight: '700', color: '#1e293b', marginBottom: 14 },
  transList: { gap: 10 },
  transCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  incomeBadge: { backgroundColor: '#dcfce7' },
  expenseBadge: { backgroundColor: '#fee2e2' },
  typeText: { fontSize: 10, fontWeight: '800' },
  incomeText: { color: '#16a34a' },
  expenseText: { color: '#dc2626' },
  transTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  transDate: { fontSize: 12, color: '#64748b', marginTop: 2 },
  transRight: { alignItems: 'flex-end', gap: 4 },
  transAmount: { fontSize: 16, fontWeight: '800' },
  delLink: { fontSize: 11, color: '#94a3b8' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 460,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: '#334155', marginBottom: 4 },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 12,
  },
  row: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  catBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
  },
  activeExpBtn: { backgroundColor: '#fee2e2', borderColor: '#ef4444' },
  activeIncBtn: { backgroundColor: '#dcfce7', borderColor: '#10b981' },
  catText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  activeCatText: { color: '#0f172a', fontWeight: '700' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e1' },
  cancelBtnText: { color: '#64748b', fontWeight: '600' },
  saveBtn: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  saveBtnText: { color: '#ffffff', fontWeight: '700' },
});
