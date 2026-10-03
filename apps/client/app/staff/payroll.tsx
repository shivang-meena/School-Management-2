import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PayrollManager } from '../../src/components/PayrollManager';
import { useAuth } from '../../src/hooks/useAuth';
import { useTheme } from '../../src/context/ThemeContext';

export default function StaffPayrollScreen() {
  const { user } = useAuth();
  const { colors: tc } = useTheme();

  if (user?.subRole !== 'ACCOUNTANT') {
    return (
      <View style={[s.restricted, { backgroundColor: tc.canvas }]}>
        <Text style={[s.restrictedText, { color: tc.muted }]}>Access restricted to Accountants only.</Text>
      </View>
    );
  }

  return <PayrollManager />;
}

const s = StyleSheet.create({
  restricted: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  restrictedText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
