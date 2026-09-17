import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { Role } from '@erp/contracts';

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { login, isLoading: authLoading } = useAuth();

  const [role, setRole] = useState<Role>((params.role as Role) || 'ADMIN');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleRoleChange = (selectedRole: Role) => {
    setRole(selectedRole);
    setErrorMessage('');
    setUserId('');
    setPassword('');
  };

  const handleLogin = async () => {
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const profile = await login({
        userId: userId.trim(),
        password,
        role,
      });

      if (profile.mustChangePassword && role === 'ADMIN') {
        router.replace('/(auth)/change-password');
        return;
      }
      if (role === 'ADMIN') {
        router.replace('/(admin)/dashboard');
      } else if (role === 'EMPLOYEE') {
        router.replace('/(staff)/dashboard');
      } else {
        router.replace('/(student)/dashboard');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Login failed. Please check credentials.';
      setErrorMessage(msg);
      Alert.alert('Authentication Failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logoIcon}>🎓</Text>
          <Text style={styles.title}>Arihant Public School</Text>
          <Text style={styles.subtitle}>One secure campus. Every school workflow.</Text>
        </View>

        {/* Role Switcher Tabs */}
        <View style={styles.roleTabs}>
          {(['ADMIN', 'EMPLOYEE', 'STUDENT'] as Role[]).map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.roleTab, role === r && styles.activeRoleTab]}
              onPress={() => handleRoleChange(r)}
            >
              <Text style={[styles.roleTabText, role === r && styles.activeRoleTabText]}>
                {r === 'ADMIN' ? 'Admin' : r === 'EMPLOYEE' ? 'Employee' : 'Student'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Error notice */}
        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Form Inputs */}
        <View style={styles.form}>
          <Text style={styles.label}>
            {role === 'ADMIN' ? 'Admin login ID' : role === 'EMPLOYEE' ? 'Employee ID (EMP000001)' : 'Student ID (STU000001)'}
          </Text>
          <TextInput
            style={styles.input}
            value={userId}
            onChangeText={setUserId}
            placeholder="Enter ID or email"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In as {role}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.backLink} onPress={() => router.push('/')}>
            <Text style={styles.backLinkText}>← Back to School Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#071A2F',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoIcon: {
    fontSize: 38,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  roleTabs: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
  },
  roleTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeRoleTab: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  roleTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  activeRoleTabText: {
    color: '#2563eb',
    fontWeight: '700',
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    padding: 10,
    borderRadius: 6,
    marginBottom: 16,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
    textAlign: 'center',
  },
  form: {
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 16,
    color: '#0f172a',
  },
  loginButton: {
    backgroundColor: '#C88728',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  loginButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  backLink: {
    alignItems: 'center',
    marginTop: 18,
  },
  backLinkText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
});
