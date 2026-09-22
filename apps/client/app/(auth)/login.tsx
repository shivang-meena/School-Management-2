import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { Role } from '@erp/contracts';
import { colors, surfaces } from '../../src/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams();
  const { login, user, isLoading: authLoading } = useAuth();

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
    if (user) {
      setErrorMessage(`Already logged in as ${user.name || user.loginId}. Sign out first to use another account.`);
      return;
    }
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const profile = await login({
        userId: userId.trim(),
        password,
        role,
      });

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

  const openCurrentPortal = () => {
    if (user?.role === 'ADMIN') router.replace('/(admin)/dashboard');
    else if (user?.role === 'EMPLOYEE') router.replace('/(staff)/dashboard');
    else router.replace('/(student)/dashboard');
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.layout}>
        {width >= 960 ? <View style={styles.story}>
          <Image source={require('../../assets/icon.png')} style={styles.schoolLogo} resizeMode="contain" />
          <Text style={styles.storyEyebrow}>SHIVORA TECHNOLOGIES</Text>
          <Text style={styles.storyTitle}>A connected campus.{'\n'}A brighter tomorrow.</Text>
          <Text style={styles.storyCopy}>A thoughtful space for the people who make our school special. Manage your day, stay informed and focus on what matters.</Text>
          <View style={styles.storyFeatures}>{['Learning & academics', 'People & school life', 'One school community'].map((label, index) => <View key={label} style={styles.storyFeature}><Text style={styles.featureNumber}>0{index + 1}</Text><Text style={styles.featureText}>{label}</Text></View>)}</View>
          <Text style={styles.storyFooter}>Technology for better workflows.</Text>
        </View> : null}
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <Image source={require('../../assets/icon.png')} style={styles.loginLogo} resizeMode="contain" />
          <Text style={styles.title}>Welcome to your school</Text>
          <Text style={styles.subtitle}>Choose your portal and sign in to continue.</Text>
        </View>

        {authLoading ? <View style={styles.sessionNotice}><ActivityIndicator color={colors.blue} /><Text style={styles.sessionTitle}>Checking saved session…</Text></View> : user ? <View style={styles.sessionNotice}>
          <Text style={styles.sessionTitle}>Already logged in</Text>
          <Text style={styles.sessionText}>{user.name || user.loginId} is already logged in as {user.role === 'ADMIN' ? 'Admin' : user.role === 'EMPLOYEE' ? 'Employee' : 'Student'} in this browser. Sign out before using another account.</Text>
          <TouchableOpacity style={styles.loginButton} onPress={openCurrentPortal}><Text style={styles.loginButtonText}>Open current portal →</Text></TouchableOpacity>
        </View> : <>
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
              style={[styles.loginButton, isSubmitting && { opacity: 0.65 }]}
              onPress={handleLogin}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.loginButtonText}>Sign in as {role === 'ADMIN' ? 'Admin' : role === 'EMPLOYEE' ? 'Employee' : 'Student'}  →</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.backLink} onPress={() => router.push('/')}>
              <Text style={styles.backLinkText}>← Back to School Home</Text>
            </TouchableOpacity>
          </View>
        </>}
      </View>
    </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  layout: { width: '100%', maxWidth: 1080, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 72 },
  story: { flex: 1, paddingVertical: 36 },
  schoolLogo: { width: 190, height: 86, borderRadius: 12, backgroundColor: '#fff', marginBottom: 28 },
  storyEyebrow: { color: colors.blue, fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  storyTitle: { color: colors.ink, fontSize: 39, lineHeight: 49, fontWeight: '800', marginTop: 18 },
  storyCopy: { color: colors.muted, fontSize: 14, lineHeight: 24, marginTop: 20 },
  storyFeatures: { marginTop: 28, gap: 14 },
  storyFeature: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureNumber: { color: colors.blue, backgroundColor: '#E6EDFC', padding: 10, borderRadius: 8, fontSize: 11, fontWeight: '700' },
  featureText: { color: '#4B6082', fontSize: 13, fontWeight: '600' },
  storyFooter: { color: '#8A9AB2', fontSize: 11, marginTop: 42 },
  loginLogo: { width: 150, height: 68, borderRadius: 10, backgroundColor: '#fff', marginBottom: 20 },
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
    ...surfaces.card,
    padding: 30,
    width: '100%',
    maxWidth: 440,
    shadowColor: '#000',
    shadowOpacity: 0.04,
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
  sessionNotice: {
    backgroundColor: '#EEF4FF',
    borderWidth: 1,
    borderColor: '#C9D9FF',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    gap: 10,
  },
  sessionTitle: {
    color: '#17315A',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  sessionText: {
    color: '#526A8C',
    fontSize: 13,
    lineHeight: 20,
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
    paddingVertical: 14,
    fontSize: 14,
    marginBottom: 16,
    color: '#0f172a',
  },
  loginButton: {
    backgroundColor: colors.blue,
    paddingVertical: 15,
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
