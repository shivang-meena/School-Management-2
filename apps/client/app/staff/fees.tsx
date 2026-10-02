import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AdminOperationsScreen } from '../../src/components/AdminOperationsScreen';
import { useAuth } from '../../src/hooks/useAuth';
import { colors } from '../../src/theme';

export default function StaffFeesScreen() {
  const { user } = useAuth();

  if (user?.subRole !== 'ACCOUNTANT') {
    return (
      <View style={s.restricted}>
        <Text style={s.restrictedText}>Access restricted to Accountants only.</Text>
      </View>
    );
  }

  return (
    <AdminOperationsScreen
      mode="fees"
      title="Student Fees"
      eyebrow="STUDENT FEE MANAGEMENT"
      description="View student fee accounts, track dues and balances, and record payments."
    />
  );
}

const s = StyleSheet.create({
  restricted: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  restrictedText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontWeight: '600',
  },
});
