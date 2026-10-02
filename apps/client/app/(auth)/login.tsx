import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/hooks/useAuth';
import { Role } from '@erp/contracts';
import { colors, radius, shadow } from '../../src/theme';

const ROLES: { key: Role; label: string; icon: keyof typeof Ionicons.glyphMap; hint: string }[] = [
  { key: 'ADMIN',    label: 'Admin',         icon: 'shield-checkmark-outline', hint: 'e.g. ADMIN001' },
  { key: 'EMPLOYEE', label: 'Teacher/Staff', icon: 'briefcase-outline',        hint: 'e.g. EMP000001' },
  { key: 'STUDENT',  label: 'Student',       icon: 'school-outline',           hint: 'e.g. STU000001' },
];

export default function LoginScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams();
  const { login, user, isLoading: authLoading } = useAuth();

  const [role, setRole]               = useState<Role>((params.role as Role) || 'ADMIN');
  const [userId, setUserId]           = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [idFocused, setIdFocused]     = useState(false);
  const [pwFocused, setPwFocused]     = useState(false);

  const currentRole = ROLES.find(r => r.key === role)!;

  const handleRoleChange = (selectedRole: Role) => {
    setRole(selectedRole);
    setErrorMessage('');
    setUserId('');
    setPassword('');
  };

  const handleLogin = async () => {
    if (user) {
      setErrorMessage(`Already logged in as ${user.name || user.loginId}. Sign out first.`);
      return;
    }
    const trimmedId = userId.trim();
    if (!trimmedId) {
      const msg = 'Please enter your User ID or Email.';
      setErrorMessage(msg);
      Alert.alert('Missing details', msg);
      return;
    }
    if (!password) {
      const msg = 'Please enter your password.';
      setErrorMessage(msg);
      Alert.alert('Missing details', msg);
      return;
    }
    if (password.length < 8) {
      const msg = 'Password must be at least 8 characters long.';
      setErrorMessage(msg);
      Alert.alert('Invalid password', msg);
      return;
    }
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      await login({ userId: trimmedId, password, role });
      if (role === 'ADMIN')         router.replace('/admin/dashboard');
      else if (role === 'EMPLOYEE') router.replace('/staff/dashboard');
      else                          router.replace('/student/dashboard');
    } catch (err: any) {
      const rawMsg = err.response?.data?.message || err.message || 'Login failed. Please check credentials.';
      const msg = Array.isArray(rawMsg) ? rawMsg.join(' | ') : rawMsg;
      setErrorMessage(msg);
      Alert.alert('Authentication Failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCurrentPortal = () => {
    if (user?.role === 'ADMIN')         router.replace('/admin/dashboard');
    else if (user?.role === 'EMPLOYEE') router.replace('/staff/dashboard');
    else                                router.replace('/student/dashboard');
  };

  const desktop = width >= 960;

  return (
    <ScrollView
      style={s.page}
      contentContainerStyle={s.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Ambient glow orbs */}
      <View style={s.orbTopLeft} pointerEvents="none" />
      <View style={s.orbBottomRight} pointerEvents="none" />

      <View style={[s.layout, desktop && s.layoutDesktop]}>

        {/* ── Left Story Panel (desktop only) ── */}
        {desktop ? (
          <View style={s.story}>
            <View style={s.storyBadge}>
              <Ionicons name="school" size={36} color="#ffffff" />
            </View>
            <Text style={s.storyEyebrow}>ARIHANT PUBLIC SCHOOL</Text>
            <Text style={s.storyTitle}>A connected campus.{'\n'}A brighter tomorrow.</Text>
            <Text style={s.storyCopy}>
              A unified ERP system empowering administrators, faculty, students, and parents
              with real-time academic records, attendance tracking, and finance workflows.
            </Text>
            <View style={s.storyFeatures}>
              {[
                { label: 'Academic & Examination Portal',      icon: 'ribbon-outline'   as const },
                { label: 'Attendance & Class Timetables',      icon: 'calendar-outline' as const },
                { label: 'Fee Structures & Instant Receipts',  icon: 'card-outline'     as const },
              ].map(item => (
                <View key={item.label} style={s.featureRow}>
                  <View style={s.featureIcon}>
                    <Ionicons name={item.icon} size={15} color={colors.blueLight} />
                  </View>
                  <Text style={s.featureText}>{item.label}</Text>
                </View>
              ))}
            </View>
            <Text style={s.storyFooter}>Powered by School ERP Platform · 2026</Text>
          </View>
        ) : null}

        {/* ── Login Card ── */}
        <View style={s.card}>
          {/* Card glow border */}
          <View style={s.cardGlow} pointerEvents="none" />

          {/* Header */}
          <View style={s.cardHeader}>
            <View style={s.lockBadge}>
              <Ionicons name="lock-closed" size={22} color="#ffffff" />
            </View>
            <Text style={s.cardTitle}>Portal Sign In</Text>
            <Text style={s.cardSubtitle}>Choose your role and enter credentials to continue</Text>
          </View>

          {authLoading ? (
            <View style={s.sessionBox}>
              <ActivityIndicator color={colors.blueLight} />
              <Text style={s.sessionTitle}>Checking saved session…</Text>
            </View>
          ) : user ? (
            <View style={s.sessionBox}>
              <Ionicons name="checkmark-circle" size={28} color={colors.success} />
              <Text style={s.sessionTitle}>Already Logged In</Text>
              <Text style={s.sessionText}>
                {user.name || user.loginId} is active as{' '}
                {user.role === 'ADMIN' ? 'Administrator' : user.role === 'EMPLOYEE' ? 'Employee' : 'Student'}.
              </Text>
              <TouchableOpacity style={s.ctaBtn} onPress={openCurrentPortal}>
                <Text style={s.ctaBtnText}>Open Current Portal</Text>
                <Ionicons name="arrow-forward" size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* ── Role Switcher ── */}
              <View style={s.roleTabs}>
                {ROLES.map(r => {
                  const active = role === r.key;
                  return (
                    <TouchableOpacity
                      key={r.key}
                      style={[s.roleTab, active && s.roleTabActive]}
                      onPress={() => handleRoleChange(r.key)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={r.icon}
                        size={15}
                        color={active ? '#ffffff' : 'rgba(255,255,255,0.35)'}
                      />
                      <Text style={[s.roleTabText, active && s.roleTabTextActive]}>{r.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* ── Error ── */}
              {errorMessage ? (
                <View style={s.errorBox}>
                  <Ionicons name="alert-circle" size={15} color={colors.danger} />
                  <Text style={s.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              {/* ── Form ── */}
              <View style={s.form}>
                <Text style={s.label}>
                  {role === 'ADMIN' ? 'Admin Login ID' : role === 'EMPLOYEE' ? 'Employee ID' : 'Student ID'}
                </Text>
                <View style={[s.inputWrap, idFocused && s.inputWrapFocused]}>
                  <Ionicons name="person-outline" size={17} color={idFocused ? colors.blueLight : 'rgba(255,255,255,0.30)'} style={{ marginRight: 10 }} />
                  <TextInput
                    style={s.input}
                    value={userId}
                    onChangeText={setUserId}
                    placeholder={currentRole.hint}
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    autoCapitalize="characters"
                    onFocus={() => setIdFocused(true)}
                    onBlur={() => setIdFocused(false)}
                  />
                </View>

                <Text style={[s.label, { marginTop: 16 }]}>Password</Text>
                <View style={[s.inputWrap, pwFocused && s.inputWrapFocused]}>
                  <Ionicons name="lock-closed-outline" size={17} color={pwFocused ? colors.blueLight : 'rgba(255,255,255,0.30)'} style={{ marginRight: 10 }} />
                  <TextInput
                    style={s.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    secureTextEntry={!showPassword}
                    onFocus={() => setPwFocused(true)}
                    onBlur={() => setPwFocused(false)}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={s.eyeBtn} activeOpacity={0.7}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={17} color="rgba(255,255,255,0.30)" />
                  </TouchableOpacity>
                </View>

                {/* ── CTA ── */}
                <TouchableOpacity
                  style={[s.ctaBtn, isSubmitting && { opacity: 0.65 }]}
                  onPress={handleLogin}
                  disabled={isSubmitting}
                  activeOpacity={0.85}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <Text style={s.ctaBtnText}>
                        Sign in as {role === 'ADMIN' ? 'Admin' : role === 'EMPLOYEE' ? 'Staff' : 'Student'}
                      </Text>
                      <Ionicons name="arrow-forward" size={16} color="#ffffff" />
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={s.backLink} onPress={() => router.push('/')} activeOpacity={0.7}>
                  <Ionicons name="arrow-back" size={13} color={colors.blueLight} />
                  <Text style={s.backLinkText}>Return to School Website</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#080c14' },
  container: {
    minHeight: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  // ── Ambient Orbs ──────────────────────────────────────────────
  orbTopLeft: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: 250,
    top: -160,
    left: -160,
    backgroundColor: 'rgba(99,102,241,0.18)',
  },
  orbBottomRight: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    bottom: -120,
    right: -120,
    backgroundColor: 'rgba(139,92,246,0.14)',
  },

  // ── Layout ────────────────────────────────────────────────────
  layout: {
    width: '100%',
    maxWidth: 1040,
    alignItems: 'center',
    justifyContent: 'center',
  },
  layoutDesktop: {
    flexDirection: 'row',
    gap: 64,
    alignItems: 'center',
  },

  // ── Story Panel ───────────────────────────────────────────────
  story: { flex: 1, paddingVertical: 20 },
  storyBadge: {
    width: 68,
    height: 68,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    ...shadow.md,
  },
  storyEyebrow: {
    color: colors.blueLight,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '800',
  },
  storyTitle: {
    color: '#f0f6ff',
    fontSize: 34,
    lineHeight: 44,
    fontWeight: '900',
    marginTop: 12,
    letterSpacing: -0.5,
  },
  storyCopy: {
    color: 'rgba(255,255,255,0.50)',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 14,
    maxWidth: 420,
  },
  storyFeatures: { marginTop: 24, gap: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.30)',
  },
  featureText: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600' },
  storyFooter: { color: 'rgba(255,255,255,0.25)', fontSize: 11, marginTop: 32 },

  // ── Login Card ────────────────────────────────────────────────
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: radius.xxl,
    padding: 32,
    width: '100%',
    maxWidth: 440,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    ...shadow.lg,
  },
  cardGlow: {
    position: 'absolute',
    top: -80,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(99,102,241,0.12)',
  },
  cardHeader: { alignItems: 'center', marginBottom: 24 },
  lockBadge: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    ...shadow.sm,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#f0f6ff',
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 5,
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── Role Tabs ─────────────────────────────────────────────────
  roleTabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: radius.md,
    padding: 4,
    marginBottom: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  roleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: radius.sm,
  },
  roleTabActive: {
    backgroundColor: colors.primary,
    ...shadow.sm,
  },
  roleTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.35)',
  },
  roleTabTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },

  // ── Error Box ─────────────────────────────────────────────────
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.dangerLight,
    padding: 12,
    borderRadius: radius.md,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.30)',
  },
  errorText: { color: colors.danger, fontSize: 12, fontWeight: '600', flex: 1 },

  // ── Form ──────────────────────────────────────────────────────
  form: { width: '100%' },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 8,
    letterSpacing: 0.4,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 14,
    minHeight: 50,
  },
  inputWrapFocused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(99,102,241,0.08)',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#f0f6ff',
    minHeight: 48,
  },
  eyeBtn: { padding: 6 },

  // ── CTA Button ────────────────────────────────────────────────
  ctaBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    minHeight: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 22,
    ...shadow.md,
  },
  ctaBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },

  // ── Back Link ─────────────────────────────────────────────────
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 18,
    paddingVertical: 6,
  },
  backLinkText: { color: colors.blueLight, fontSize: 12, fontWeight: '700' },

  // ── Session Box ───────────────────────────────────────────────
  sessionBox: {
    backgroundColor: 'rgba(99,102,241,0.10)',
    padding: 20,
    borderRadius: radius.lg,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.25)',
  },
  sessionTitle: { fontSize: 16, fontWeight: '800', color: '#f0f6ff' },
  sessionText: { fontSize: 12, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 18 },
});
