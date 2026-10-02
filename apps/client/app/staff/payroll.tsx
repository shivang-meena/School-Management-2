import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PayrollManager } from '../../src/components/PayrollManager';
import { useAuth } from '../../src/hooks/useAuth';
import { colors } from '../../src/theme';

export default function StaffPayrollScreen() {
  const { user } = useAuth();

  if (user?.subRole !== 'ACCOUNTANT') {
    return (
      <View style={s.restricted}>
        <Text style={s.restrictedText}>Access restricted to Accountants only.</Text>
      </View>
    );
  }

  return <PayrollManager />;
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
