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
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../src/components/Header';
import { useSubmitAdmission, useNotices } from '../src/hooks/useQueries';
import { colors, radius, shadow } from '../src/theme';

const featuredStudents = [
  {
    name: 'Aarav Sharma',
    initials: 'AS',
    className: 'Class XII',
    score: '98.6',
    achievement: 'Academic Excellence',
    subject: 'Mathematics & Science',
    color: '#2563eb',
    background: '#eff6ff',
    rank: '01',
  },
  {
    name: 'Ananya Verma',
    initials: 'AV',
    className: 'Class X',
    score: '98.2',
    achievement: 'Outstanding Achiever',
    subject: 'Science & English',
    color: '#059669',
    background: '#ecfdf5',
    rank: '02',
  },
  {
    name: 'Kabir Mehta',
    initials: 'KM',
    className: 'Class XII',
    score: '97.8',
    achievement: 'Scholastic Distinction',
    subject: 'Commerce & Economics',
    color: '#d97706',
    background: '#fffbeb',
    rank: '03',
  },
  {
    name: 'Diya Patel',
    initials: 'DP',
    className: 'Class X',
    score: '97.4',
    achievement: 'All-round Excellence',
    subject: 'Languages & Mathematics',
    color: '#7c3aed',
    background: '#f5f3ff',
    rank: '04',
  },
];

const portals = [
  {
    role: 'ADMIN',
    icon: 'shield-checkmark-outline' as const,
    title: 'Administration',
    subtitle: 'THE BIG PICTURE',
    description: 'Manage student records, staff payroll, admissions, and institutional finances.',
    features: 'Students · Fees · Accounts · HR',
    action: 'Admin portal',
    color: '#2563eb',
    background: '#eff6ff',
  },
  {
    role: 'EMPLOYEE',
    icon: 'briefcase-outline' as const,
    title: 'Teachers & Employees',
    subtitle: 'MAKE EVERY DAY COUNT',
    description: 'Mark student attendance, review class timetables, and access monthly salary slips.',
    features: 'Classes · Attendance · Payroll',
    action: 'Employee portal',
    color: '#d97706',
    background: '#fffbeb',
  },
  {
    role: 'STUDENT',
    icon: 'school-outline' as const,
    title: 'Students & Parents',
    subtitle: 'YOUR LEARNING JOURNEY',
    description: 'View daily timetable, term results, verified fee receipts, and attendance percentage.',
    features: 'Timetable · Results · Fees',
    action: 'Student portal',
    color: '#059669',
    background: '#ecfdf5',
  },
];

export default function IndexScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 680;
  const stacked = width < 1000;
  const [admissionModal, setAdmissionModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    dob: '2012-05-15',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    mobile: '',
    email: '',
    address: '',
    previousSchool: '',
    applyingClass: 'Class 6',
    guardianName: '',
    guardianContact: '',
  });

  const { mutate: submitAdmission, isPending } = useSubmitAdmission();
  const {
    data: publicNotices,
    isLoading: noticesLoading,
    isError: noticesError,
    refetch: refreshNotices,
  } = useNotices('PUBLIC');

  const handleSubmitAdmission = () => {
    if (!formData.name || !formData.mobile || !formData.guardianName) {
      Alert.alert('Validation Error', 'Please fill all required admission fields (*).');
      return;
    }

    submitAdmission(formData, {
      onSuccess: () => {
        Alert.alert(
          'Application Submitted! 🎉',
          'Admission registration submitted successfully! School admin will review it.',
        );
        setAdmissionModal(false);
        setFormData({
          name: '',
          dob: '2012-05-15',
          gender: 'Male',
          mobile: '',
          email: '',
          address: '',
          previousSchool: '',
          applyingClass: 'Class 6',
          guardianName: '',
          guardianContact: '',
        });
      },
      onError: (err: any) => {
        Alert.alert('Submission Error', err.response?.data?.message || 'Failed to submit application.');
      },
    });
  };

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.workspace, compact && styles.workspaceCompact]}>
          {/* Hero Section */}
          <View style={[styles.hero, stacked && styles.heroStacked, compact && styles.heroCompact]}>
            <View style={styles.heroGlow} pointerEvents="none" />
            <View style={styles.heroCopy}>
              <View style={styles.heroTag}>
                <Ionicons name="sparkles" size={13} color="#93c5fd" />
                <Text style={styles.heroTagText}>WELCOME TO ARIHANT PUBLIC SCHOOL</Text>
              </View>
              <Text
                accessibilityRole="header"
                style={[styles.heroTitle, compact && styles.heroTitleCompact]}
              >
                Big dreams.{compact ? ' ' : '\n'}Brighter futures.
              </Text>
              <Text style={styles.heroSubtitle}>
                A place to learn, a space to grow. Empowering students, educators, and families with
                our modern integrated school ERP.
              </Text>
              <View style={styles.heroActions}>
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.primaryBtn}
                  onPress={() => router.push('/(auth)/login')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="log-in-outline" size={18} color="#0f172a" />
                  <Text style={styles.primaryBtnText}>Enter Portal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.secondaryBtn}
                  onPress={() => setAdmissionModal(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="document-text-outline" size={17} color="#ffffff" />
                  <Text style={styles.secondaryBtnText}>Apply for Admission</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.heroFootnote}>
                <Ionicons name="shield-checkmark" size={15} color="#60a5fa" />
                <Text style={styles.heroFootnoteText}>
                  CBSE Affiliated · Class 6–12 · Unified Cloud Administration
                </Text>
              </View>
            </View>

            {!stacked ? (
              <View style={styles.heroVisual} accessible={false}>
                <View style={styles.visualOrbit} />
                <View style={styles.visualOrbitSmall} />
                <View style={styles.visualSheet}>
                  <View style={styles.visualSheetTop}>
                    <Text style={styles.visualEyebrow}>ACADEMIC EXCELLENCE</Text>
                    <Ionicons name="star" size={18} color="#d97706" />
                  </View>
                  <Text style={styles.visualTitle}>Learning{'\n'}without limits.</Text>
                  <View style={styles.bookScene}>
                    <View style={[styles.book, styles.bookOne]}>
                      <Text style={styles.bookText}>DREAM</Text>
                    </View>
                    <View style={[styles.book, styles.bookTwo]}>
                      <Text style={styles.bookText}>DISCOVER</Text>
                    </View>
                    <View style={[styles.book, styles.bookThree]}>
                      <Text style={styles.bookText}>BECOME</Text>
                    </View>
                  </View>
                  <View style={styles.visualBottom}>
                    <Ionicons name="school" size={14} color="#059669" />
                    <Text style={styles.visualCaption}>Knowledge is just the beginning.</Text>
                  </View>
                </View>
                <View style={styles.floatingBadge}>
                  <View style={styles.floatingIcon}>
                    <Ionicons name="medal-outline" size={20} color="#d97706" />
                  </View>
                  <View>
                    <Text style={styles.floatingTitle}>100% Board Pass Rate</Text>
                    <Text style={styles.floatingCopy}>State & National Rankers</Text>
                  </View>
                </View>
              </View>
            ) : null}
          </View>

          {/* Quick Values Strip */}
          <View style={styles.valuesStrip}>
            {[
              ['01', 'Stay Connected', 'Instant school announcements & notices in one place'],
              ['02', 'Learn with Purpose', 'Academics, results & class timetables at your fingertips'],
              ['03', 'Seamless Operations', 'Fast digital fees, payroll & attendance management'],
            ].map(([number, title, copy]) => (
              <View key={number} style={[styles.valueItem, compact && styles.valueItemCompact]}>
                <Text style={styles.valueNumber}>{number}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.valueTitle}>{title}</Text>
                  <Text style={styles.valueCopy}>{copy}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Portals Grid */}
          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionHeadingCopy}>
                <Text style={styles.eyebrow}>ROLE-BASED WORKSPACES</Text>
                <Text accessibilityRole="header" style={styles.sectionTitle}>
                  Select Your Portal
                </Text>
              </View>
              <Text style={styles.sectionAside}>Direct role navigation</Text>
            </View>
            <View style={styles.portalGrid}>
              {portals.map((portal) => (
                <TouchableOpacity
                  key={portal.role}
                  accessibilityRole="button"
                  accessibilityLabel={`Sign in to ${portal.title}`}
                  activeOpacity={0.8}
                  style={[styles.portalCard, compact && styles.fullWidth]}
                  onPress={() =>
                    router.push({
                      pathname: '/(auth)/login',
                      params: { role: portal.role },
                    })
                  }
                >
                  <View style={styles.portalTop}>
                    <View style={[styles.portalIcon, { backgroundColor: portal.background }]}>
                      <Ionicons name={portal.icon} size={24} color={portal.color} />
                    </View>
                    <Ionicons name="arrow-forward" size={18} color={portal.color} />
                  </View>
                  <Text style={[styles.portalEyebrow, { color: portal.color }]}>
                    {portal.subtitle}
                  </Text>
                  <Text style={styles.portalTitle}>{portal.title}</Text>
                  <Text style={styles.portalDescription}>{portal.description}</Text>
                  <Text style={styles.portalFeatures}>{portal.features}</Text>
                  <View style={styles.portalFooter}>
                    <Text style={[styles.portalLink, { color: portal.color }]}>
                      {portal.action}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={portal.color} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Student Achievers Section */}
          <View style={[styles.achieversSection, compact && styles.achieversCompact]}>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionHeadingCopy}>
                <View style={styles.eyebrowRow}>
                  <Text style={styles.goldEyebrow}>STUDENT TOPPERS</Text>
                  <Text style={styles.sampleBadge}>EXCELLENCE ROLL</Text>
                </View>
                <Text accessibilityRole="header" style={styles.sectionTitle}>
                  Our Students · Our Pride
                </Text>
                <Text style={styles.sectionDescription}>
                  Celebrating the dedication, curiosity, and effort behind every academic milestone.
                </Text>
              </View>
              <View style={styles.achievementSeal}>
                <Ionicons name="trophy-outline" size={28} color="#d97706" />
                <Text style={styles.sealText}>WALL OF{'\n'}EXCELLENCE</Text>
              </View>
            </View>
            <View style={styles.achieversGrid}>
              {featuredStudents.map((student) => (
                <View
                  key={student.name}
                  style={[
                    styles.studentCard,
                    { borderTopColor: student.color, flexBasis: width >= 1120 ? '22%' : '45%' },
                    compact && styles.fullWidth,
                  ]}
                >
                  <View style={styles.studentTop}>
                    <Text style={styles.studentClass}>{student.className}</Text>
                    <View style={[styles.rankBadge, { backgroundColor: student.background }]}>
                      <Text style={[styles.rankText, { color: student.color }]}>
                        ★ Rank {student.rank}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.studentAvatar, { backgroundColor: student.background }]}>
                    <Text style={[styles.studentInitials, { color: student.color }]}>
                      {student.initials}
                    </Text>
                  </View>
                  <Text style={styles.studentName}>{student.name}</Text>
                  <Text style={styles.studentSubject}>{student.subject}</Text>
                  <View style={styles.scoreRow}>
                    <Text style={[styles.score, { color: student.color }]}>
                      {student.score}
                      <Text style={styles.percent}>%</Text>
                    </Text>
                    <Text style={styles.scoreLabel}>OVERALL SCORE</Text>
                  </View>
                  <View
                    style={[styles.studentAchievement, { backgroundColor: student.background }]}
                  >
                    <Text style={[styles.achievementText, { color: student.color }]}>
                      {student.achievement}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Bottom Grid: Notice Board + Admission Inquiry */}
          <View style={[styles.bottomGrid, stacked && styles.bottomGridStacked]}>
            <View style={styles.noticePanel}>
              <View style={styles.noticeHeading}>
                <View style={styles.sectionHeadingCopy}>
                  <Text style={styles.eyebrow}>COMMUNITY BOARD</Text>
                  <Text accessibilityRole="header" style={styles.sectionTitle}>
                    School Notice Board
                  </Text>
                </View>
                <View style={styles.publicBadge}>
                  <View style={styles.publicDot} />
                  <Text style={styles.publicBadgeText}>LIVE UPDATES</Text>
                </View>
              </View>

              {noticesLoading ? (
                <View style={styles.noticeEmpty}>
                  <ActivityIndicator color={colors.blue} />
                  <Text style={styles.emptyText}>Loading school announcements…</Text>
                </View>
              ) : noticesError ? (
                <View style={styles.noticeEmpty}>
                  <Text style={styles.emptyTitle}>Updates are unavailable right now</Text>
                  <Text style={styles.emptyText}>Please try loading the notice board again.</Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => refreshNotices()}
                    style={styles.retryButton}
                  >
                    <Text style={styles.retryText}>Refresh notices ↻</Text>
                  </TouchableOpacity>
                </View>
              ) : publicNotices && publicNotices.length > 0 ? (
                <View style={styles.noticeList}>
                  {publicNotices.slice(0, 3).map((notice: any, index: number) => (
                    <View key={notice.id || index} style={styles.noticeCard}>
                      <View style={styles.noticeNumber}>
                        <Ionicons name="megaphone-outline" size={16} color={colors.blue} />
                      </View>
                      <View style={styles.noticeBody}>
                        <View style={styles.noticeHeader}>
                          <Text style={styles.noticeTitle}>{notice.title}</Text>
                          {notice.date ? (
                            <Text style={styles.noticeDate}>{notice.date}</Text>
                          ) : null}
                        </View>
                        <Text style={styles.noticeMsg}>{notice.message}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.noticeEmpty}>
                  <Ionicons name="notifications-off-outline" size={32} color={colors.muted} />
                  <Text style={styles.emptyTitle}>All caught up!</Text>
                  <Text style={styles.emptyText}>No public announcements posted today.</Text>
                </View>
              )}
            </View>

            <View style={[styles.admissionsPanel, stacked && styles.admissionsPanelStacked]}>
              <Text style={styles.admissionEyebrow}>ADMISSIONS OPEN 2026–27</Text>
              <Text accessibilityRole="header" style={styles.admissionTitle}>
                A new chapter{'\n'}starts here.
              </Text>
              <Text style={styles.admissionCopy}>
                Interested in enrolling your child at Arihant Public School? Send an admission inquiry
                and our administrative office will contact you.
              </Text>
              <View style={styles.admissionSteps}>
                <Text style={styles.admissionStep}>01  ·  Submit online inquiry</Text>
                <Text style={styles.admissionStep}>02  ·  Verification & campus visit</Text>
                <Text style={styles.admissionStep}>03  ·  Document submission & enrollment</Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.admissionButton}
                onPress={() => setAdmissionModal(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.admissionButtonText}>Start Application</Text>
                <Ionicons name="arrow-forward" size={16} color="#15803d" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerBrand}>
              ARIHANT PUBLIC SCHOOL · <Text style={styles.footerBrandLight}>ERP PLATFORM</Text>
            </Text>
            <Text style={styles.footerText}>
              © 2026 Arihant Public School. All rights reserved.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Admission Application Modal */}
      <Modal
        visible={admissionModal}
        animationType="fade"
        transparent
        onRequestClose={() => setAdmissionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Admission Inquiry Application</Text>
                <Text style={styles.modalSubtitle}>
                  Please fill in the student details to register your inquiry.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setAdmissionModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Student Full Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(t) => setFormData({ ...formData, name: t })}
                placeholder="e.g. Aarav Sharma"
                placeholderTextColor={colors.muted}
              />

              <Text style={styles.label}>Email Address *</Text>
              <TextInput
                style={styles.input}
                keyboardType="email-address"
                value={formData.email}
                onChangeText={(t) => setFormData({ ...formData, email: t })}
                placeholder="student@example.com"
                placeholderTextColor={colors.muted}
              />

              <Text style={styles.label}>Student Contact Number *</Text>
              <TextInput
                style={styles.input}
                keyboardType="phone-pad"
                value={formData.mobile}
                onChangeText={(t) => setFormData({ ...formData, mobile: t })}
                placeholder="10-digit mobile number"
                placeholderTextColor={colors.muted}
              />

              <Text style={styles.label}>Applying for Class *</Text>
              <TextInput
                style={styles.input}
                value={formData.applyingClass}
                onChangeText={(t) => setFormData({ ...formData, applyingClass: t })}
                placeholder="e.g. Class 6 / Class 9"
                placeholderTextColor={colors.muted}
              />

              <Text style={styles.label}>Parent / Guardian Full Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.guardianName}
                onChangeText={(t) => setFormData({ ...formData, guardianName: t })}
                placeholder="Parent full name"
                placeholderTextColor={colors.muted}
              />

              <Text style={styles.label}>Parent Contact Number *</Text>
              <TextInput
                style={styles.input}
                keyboardType="phone-pad"
                value={formData.guardianContact}
                onChangeText={(t) => setFormData({ ...formData, guardianContact: t })}
                placeholder="Parent mobile number"
                placeholderTextColor={colors.muted}
              />

              <Text style={styles.label}>Residential Address</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                multiline
                value={formData.address}
                onChangeText={(t) => setFormData({ ...formData, address: t })}
                placeholder="Complete postal address..."
                placeholderTextColor={colors.muted}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setAdmissionModal(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitBtn, isPending && { opacity: 0.6 }]}
                  onPress={handleSubmitAdmission}
                  disabled={isPending}
                >
                  <Text style={styles.submitBtnText}>
                    {isPending ? 'Submitting...' : 'Submit Inquiry'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080c14' },
  scroll: { paddingBottom: 24 },
  workspace: {
    width: '100%',
    maxWidth: 1320,
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingTop: 24,
    gap: 32,
  },
  workspaceCompact: { paddingHorizontal: 16, paddingTop: 16, gap: 24 },
  hero: {
    backgroundColor: '#0f172a',
    borderRadius: radius.xl,
    padding: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
    overflow: 'hidden',
    minHeight: 360,
    ...shadow.lg,
  },
  heroStacked: { minHeight: 0 },
  heroCompact: { padding: 24, borderRadius: radius.lg },
  heroGlow: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: 250,
    right: -100,
    top: -150,
    backgroundColor: 'rgba(37,99,235,0.2)',
  },
  heroCopy: { flex: 1, minWidth: 0 },
  heroTag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  heroTagText: {
    color: '#bfdbfe',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 44,
    fontWeight: '900',
    lineHeight: 52,
    letterSpacing: -1.2,
  },
  heroTitleCompact: { fontSize: 32, lineHeight: 40, letterSpacing: -0.8 },
  heroSubtitle: {
    color: '#cbd5e1',
    fontSize: 15,
    lineHeight: 24,
    marginTop: 14,
    maxWidth: 480,
  },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 24 },
  primaryBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    minHeight: 46,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...shadow.md,
  },
  primaryBtnText: { color: '#0f172a', fontSize: 13, fontWeight: '800' },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 18,
    minHeight: 46,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  secondaryBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  heroFootnote: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24 },
  heroFootnoteText: { color: '#94a3b8', fontSize: 11, fontWeight: '500' },
  heroVisual: { width: 340, height: 320, justifyContent: 'center', alignItems: 'center' },
  visualOrbit: {
    width: 290,
    height: 290,
    borderRadius: 145,
    borderWidth: 1,
    borderColor: '#334155',
    position: 'absolute',
  },
  visualOrbitSmall: {
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: '#1e293b',
    position: 'absolute',
  },
  visualSheet: {
    backgroundColor: '#ffffff',
    borderRadius: radius.lg,
    padding: 22,
    width: 240,
    height: 270,
    transform: [{ rotate: '-6deg' }],
    ...shadow.lg,
  },
  visualSheetTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  visualEyebrow: { fontSize: 8, letterSpacing: 1.2, fontWeight: '800', color: colors.blue },
  visualTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 8,
    letterSpacing: -0.6,
  },
  bookScene: { marginTop: 14, gap: 5 },
  book: {
    height: 22,
    borderRadius: 4,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderLeftWidth: 6,
  },
  bookOne: {
    width: '90%',
    alignSelf: 'flex-end',
    backgroundColor: '#eff6ff',
    borderLeftColor: '#3b82f6',
  },
  bookTwo: {
    width: '95%',
    backgroundColor: '#fffbeb',
    borderLeftColor: '#f59e0b',
  },
  bookThree: {
    backgroundColor: '#ecfdf5',
    borderLeftColor: '#10b981',
  },
  bookText: { color: '#0f172a', fontSize: 8, fontWeight: '800', letterSpacing: 1.5 },
  visualBottom: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  visualCaption: { color: '#64748b', fontSize: 9, fontWeight: '500' },
  floatingBadge: {
    position: 'absolute',
    bottom: 5,
    right: 0,
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...shadow.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  floatingIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingTitle: { color: '#0f172a', fontSize: 11, fontWeight: '800' },
  floatingCopy: { color: '#64748b', fontSize: 9, marginTop: 2 },
  valuesStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 24,
  },
  valueItem: { flex: 1, minWidth: 240, flexDirection: 'row', alignItems: 'center', gap: 14 },
  valueItemCompact: { flexBasis: '100%' },
  valueNumber: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: '800',
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
    borderRadius: radius.md,
    padding: 10,
    backgroundColor: '#ffffff',
    ...shadow.sm,
  },
  valueTitle: { color: '#0f172a', fontSize: 13, fontWeight: '800' },
  valueCopy: { color: colors.muted, fontSize: 11, marginTop: 3, lineHeight: 16 },
  section: { gap: 16 },
  sectionHeading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 14,
  },
  sectionHeadingCopy: { flex: 1, minWidth: 200 },
  eyebrow: {
    color: colors.blue,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  sectionAside: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  sectionDescription: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 6 },
  portalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  portalCard: {
    flex: 1,
    minWidth: 270,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: radius.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    ...shadow.sm,
  },
  fullWidth: { flexBasis: '100%', minWidth: 0 },
  portalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  portalIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portalEyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginBottom: 4 },
  portalTitle: { color: '#f0f6ff', fontSize: 18, fontWeight: '800', marginBottom: 6 },
  portalDescription: {
    color: 'rgba(255,255,255,0.50)',
    fontSize: 12,
    lineHeight: 19,
    flex: 1,
    marginBottom: 14,
  },
  portalFeatures: { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '600', marginBottom: 14 },
  portalFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  portalLink: { fontSize: 13, fontWeight: '700' },
  achieversSection: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: radius.xl,
    padding: 28,
    gap: 20,
    ...shadow.sm,
  },
  achieversCompact: { padding: 18 },
  eyebrowRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  goldEyebrow: { color: '#d97706', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  sampleBadge: {
    color: '#059669',
    backgroundColor: '#ecfdf5',
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  achievementSeal: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sealText: {
    color: '#d97706',
    fontSize: 9,
    lineHeight: 14,
    letterSpacing: 1.2,
    fontWeight: '800',
  },
  achieversGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  studentCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    borderTopWidth: 4,
    borderRadius: radius.lg,
    padding: 18,
    alignItems: 'center',
    ...shadow.sm,
  },
  studentTop: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  studentClass: { color: 'rgba(255,255,255,0.40)', fontSize: 10, fontWeight: '700' },
  rankBadge: { borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  rankText: { fontSize: 10, fontWeight: '800' },
  studentAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  studentInitials: { fontSize: 20, fontWeight: '800' },
  studentName: { color: '#f0f6ff', fontSize: 15, fontWeight: '800', textAlign: 'center' },
  studentSubject: { color: 'rgba(255,255,255,0.40)', fontSize: 10, marginTop: 4, textAlign: 'center' },
  scoreRow: { alignItems: 'center', marginTop: 14, marginBottom: 12 },
  score: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  percent: { fontSize: 14, fontWeight: '600' },
  scoreLabel: { color: 'rgba(255,255,255,0.30)', fontSize: 8, letterSpacing: 1.4, marginTop: 2 },
  studentAchievement: {
    width: '100%',
    borderRadius: radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  achievementText: { textAlign: 'center', fontSize: 10, fontWeight: '700' },
  bottomGrid: { flexDirection: 'row', alignItems: 'stretch', gap: 20 },
  bottomGridStacked: { flexDirection: 'column' },
  noticePanel: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.xl,
    padding: 24,
    ...shadow.sm,
  },
  noticeHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
  },
  publicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(52,211,153,0.12)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.25)',
  },
  publicDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34d399' },
  publicBadgeText: { color: '#34d399', fontSize: 9, letterSpacing: 0.8, fontWeight: '800' },
  noticeEmpty: {
    flex: 1,
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyTitle: { color: '#f0f6ff', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  emptyText: { color: 'rgba(255,255,255,0.35)', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 6 },
  retryButton: { paddingHorizontal: 16, paddingVertical: 10, marginTop: 8 },
  retryText: { color: colors.blueLight, fontSize: 12, fontWeight: '700' },
  noticeList: { gap: 12 },
  noticeCard: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  noticeNumber: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.paleBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noticeBody: { flex: 1, minWidth: 0 },
  noticeHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noticeTitle: { color: '#f0f6ff', fontSize: 14, fontWeight: '800', flexShrink: 1 },
  noticeDate: { color: 'rgba(255,255,255,0.35)', fontSize: 10 },
  noticeMsg: { color: 'rgba(255,255,255,0.50)', fontSize: 12, lineHeight: 18, marginTop: 4 },
  admissionsPanel: {
    width: 340,
    backgroundColor: 'rgba(52,211,153,0.08)',
    borderRadius: radius.xl,
    padding: 26,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.20)',
    justifyContent: 'space-between',
    ...shadow.sm,
  },
  admissionsPanelStacked: { width: '100%' },
  admissionEyebrow: {
    color: '#34d399',
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '800',
    marginBottom: 8,
  },
  admissionTitle: {
    color: '#f0f6ff',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  admissionCopy: { color: 'rgba(255,255,255,0.55)', fontSize: 12, lineHeight: 19, marginTop: 10 },
  admissionSteps: { gap: 8, marginVertical: 18 },
  admissionStep: { color: '#34d399', fontSize: 11, fontWeight: '600' },
  admissionButton: {
    backgroundColor: 'rgba(52,211,153,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.35)',
  },
  admissionButtonText: { color: '#34d399', fontSize: 13, fontWeight: '800' },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  footerBrand: {
    color: '#f0f6ff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  footerBrandLight: { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '500' },
  footerText: { color: 'rgba(255,255,255,0.30)', fontSize: 11 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(4,8,18,0.80)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#0e1525',
    borderRadius: radius.xl,
    padding: 26,
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    ...shadow.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#f0f6ff', letterSpacing: -0.3 },
  modalSubtitle: { fontSize: 12, lineHeight: 18, color: 'rgba(255,255,255,0.45)', marginTop: 3 },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.50)', marginBottom: 6 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#f0f6ff',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    fontSize: 13,
    marginBottom: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    minHeight: 42,
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  cancelBtnText: { color: 'rgba(255,255,255,0.50)', fontWeight: '700', fontSize: 12 },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    minHeight: 42,
    justifyContent: 'center',
    borderRadius: radius.md,
    ...shadow.sm,
  },
  submitBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },
});



