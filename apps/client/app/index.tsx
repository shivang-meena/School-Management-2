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
import { Header } from '../src/components/Header';
import { useSubmitAdmission, useNotices } from '../src/hooks/useQueries';

// Illustrative profiles for the public showcase; these are not student records.
const featuredStudents = [
  { name: 'Aarav Sharma', initials: 'AS', className: 'Class XII', score: '98.6', achievement: 'Academic excellence', subject: 'Mathematics & Science', color: '#4C61C8', background: '#EDF0FF', rank: '01' },
  { name: 'Ananya Verma', initials: 'AV', className: 'Class X', score: '98.2', achievement: 'Outstanding achiever', subject: 'Science & English', color: '#2A8278', background: '#E9F5F0', rank: '02' },
  { name: 'Kabir Mehta', initials: 'KM', className: 'Class XII', score: '97.8', achievement: 'Scholastic distinction', subject: 'Commerce & Economics', color: '#AE753A', background: '#FCF2E5', rank: '03' },
  { name: 'Diya Patel', initials: 'DP', className: 'Class X', score: '97.4', achievement: 'All-round excellence', subject: 'Languages & Mathematics', color: '#AA6182', background: '#F9EDF3', rank: '04' },
];
const portals = [
  { role: 'ADMIN', icon: '▦', title: 'Administration', subtitle: 'THE BIG PICTURE', description: 'Bring student records, academics, attendance and school finances together.', features: 'Students · Fees · Accounts', action: 'Admin portal', color: '#5267D5', background: '#EEF1FF' },
  { role: 'EMPLOYEE', icon: '▤', title: 'Teachers & employees', subtitle: 'MAKE EVERY DAY COUNT', description: 'Access your timetable, attendance and salary, with tools for your assigned role.', features: 'Classes · Attendance · Payroll', action: 'Employee portal', color: '#268378', background: '#EAF6F2' },
  { role: 'STUDENT', icon: '✧', title: 'Students', subtitle: 'YOUR LEARNING JOURNEY', description: 'Stay on top of your classes, published results, attendance and fee information.', features: 'Timetable · Results · Fees', action: 'Student portal', color: '#AB7538', background: '#FCF3E6' },
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
  const { data: publicNotices, isLoading: noticesLoading, isError: noticesError, refetch: refreshNotices } = useNotices('PUBLIC');

  const handleSubmitAdmission = () => {
    if (!formData.name || !formData.mobile || !formData.guardianName) {
      Alert.alert('Validation Error', 'Please fill all required admission fields.');
      return;
    }

    submitAdmission(formData, {
      onSuccess: () => {
        Alert.alert('Success', 'Admission registration submitted successfully! School admin will review it.');
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
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.workspace, compact && styles.workspaceCompact]}>
          <View style={[styles.hero, stacked && styles.heroStacked, compact && styles.heroCompact]}>
            <View style={styles.heroGlow} pointerEvents="none" />
            <View style={styles.heroCopy}>
              <View style={styles.heroTag}><View style={styles.tagDot}/><Text style={styles.heroTagText}>WELCOME TO YOUR SCHOOL COMMUNITY</Text></View>
              <Text accessibilityRole="header" style={[styles.heroTitle, compact && styles.heroTitleCompact]}>Big dreams.{compact ? ' ' : '\n'}Brighter futures.</Text>
              <Text style={styles.heroSubtitle}>A place to learn, a space to grow. Bringing students, educators and school life together with Shivora.</Text>
              <View style={styles.heroActions}>
                <TouchableOpacity accessibilityRole="button" style={styles.primaryBtn} onPress={() => router.push('/(auth)/login')}><Text style={styles.primaryBtnText}>Enter your portal</Text><Text style={styles.buttonArrow}>↗</Text></TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" style={styles.secondaryBtn} onPress={() => setAdmissionModal(true)}><Text style={styles.secondaryBtnText}>Apply for admission</Text><Text style={styles.secondaryArrow}>→</Text></TouchableOpacity>
              </View>
              <View style={styles.heroFootnote}><Text style={styles.heroFootnoteSymbol}>✧</Text><Text style={styles.heroFootnoteText}>One connected space. Every step of the school journey.</Text></View>
            </View>
            {!stacked ? <View style={styles.heroVisual} accessible={false}>
              <View style={styles.visualOrbit}/><View style={styles.visualOrbitSmall}/>
              <View style={styles.visualSheet}>
                <View style={styles.visualSheetTop}><Text style={styles.visualEyebrow}>THE NEXT CHAPTER</Text><Text style={styles.visualStar}>✦</Text></View>
                <Text style={styles.visualTitle}>Learning{'\n'}without limits.</Text>
                <View style={styles.bookScene}><View style={[styles.book, styles.bookOne]}><Text style={styles.bookText}>DREAM</Text></View><View style={[styles.book, styles.bookTwo]}><Text style={styles.bookText}>DISCOVER</Text></View><View style={[styles.book, styles.bookThree]}><Text style={styles.bookText}>BECOME</Text></View></View>
                <View style={styles.visualBottom}><View style={styles.visualDot}/><Text style={styles.visualCaption}>Curiosity is just the beginning.</Text></View>
              </View>
              <View style={styles.floatingBadge}><View style={styles.floatingIcon}><Text style={styles.floatingStar}>★</Text></View><View><Text style={styles.floatingTitle}>Made for bright minds</Text><Text style={styles.floatingCopy}>And the people who inspire them</Text></View></View>
              <Text style={styles.sparkle}>✧</Text>
            </View> : null}
          </View>

          <View style={styles.valuesStrip}>
            {[['01', 'Stay connected', 'School updates in one place'], ['02', 'Learn with purpose', 'Academics at your fingertips'], ['03', 'Move forward', 'A simpler school day']].map(([number, title, copy]) => <View key={number} style={[styles.valueItem, compact && styles.valueItemCompact]}><Text style={styles.valueNumber}>{number}</Text><View><Text style={styles.valueTitle}>{title}</Text><Text style={styles.valueCopy}>{copy}</Text></View></View>)}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeading}><View style={styles.sectionHeadingCopy}><Text style={styles.eyebrow}>A SPACE FOR EVERYONE</Text><Text accessibilityRole="header" style={styles.sectionTitle}>Your role. Your workspace.</Text></View><Text style={styles.sectionAside}>Choose your portal to get started.</Text></View>
            <View style={styles.portalGrid}>{portals.map(portal => <TouchableOpacity key={portal.role} accessibilityRole="button" accessibilityLabel={`Sign in to ${portal.title}`} activeOpacity={0.8} style={[styles.portalCard, compact && styles.fullWidth]} onPress={() => router.push({ pathname: '/(auth)/login', params: { role: portal.role } })}>
              <View style={styles.portalTop}><View style={[styles.portalIcon, { backgroundColor: portal.background }]}><Text style={[styles.portalSymbol, { color: portal.color }]}>{portal.icon}</Text></View><Text style={styles.portalArrow}>↗</Text></View>
              <Text style={[styles.portalEyebrow, { color: portal.color }]}>{portal.subtitle}</Text><Text style={styles.portalTitle}>{portal.title}</Text><Text style={styles.portalDescription}>{portal.description}</Text>
              <Text style={styles.portalFeatures}>{portal.features}</Text><View style={styles.portalFooter}><Text style={[styles.portalLink, { color: portal.color }]}>{portal.action}</Text><Text style={[styles.portalLink, { color: portal.color }]}>→</Text></View>
            </TouchableOpacity>)}</View>
          </View>

          <View style={[styles.achieversSection, compact && styles.achieversCompact]}>
            <View style={styles.sectionHeading}><View style={styles.sectionHeadingCopy}><View style={styles.eyebrowRow}><Text style={styles.goldEyebrow}>STUDENT TOPPERS</Text><Text style={styles.sampleBadge}>SAMPLE PROFILES</Text></View><Text accessibilityRole="header" style={styles.sectionTitle}>Our students. Our pride.</Text><Text style={styles.sectionDescription}>Celebrating the dedication, curiosity and effort behind every milestone.</Text></View><View style={styles.achievementSeal}><Text style={styles.sealStar}>✦</Text><Text style={styles.sealText}>WALL OF{'\n'}EXCELLENCE</Text></View></View>
            <View style={styles.achieversGrid}>{featuredStudents.map(student => <View key={student.name} style={[styles.studentCard, { borderTopColor: student.color, flexBasis: width >= 1120 ? '21%' : '44%' }, compact && styles.fullWidth]}>
              <View style={styles.studentTop}><Text style={styles.studentClass}>{student.className}</Text><View style={[styles.rankBadge, { backgroundColor: student.background }]}><Text style={[styles.rankText, { color: student.color }]}>★ {student.rank}</Text></View></View>
              <View style={[styles.studentAvatar, { backgroundColor: student.background }]}><Text style={[styles.studentInitials, { color: student.color }]}>{student.initials}</Text><View style={[styles.avatarStar, { backgroundColor: student.color }]}><Text style={styles.avatarStarText}>✦</Text></View></View>
              <Text style={styles.studentName}>{student.name}</Text><Text style={styles.studentSubject}>{student.subject}</Text>
              <View style={styles.scoreRow}><Text style={[styles.score, { color: student.color }]}>{student.score}<Text style={styles.percent}>%</Text></Text><Text style={styles.scoreLabel}>OVERALL SCORE</Text></View>
              <View style={[styles.studentAchievement, { backgroundColor: student.background }]}><Text style={[styles.achievementText, { color: student.color }]}>{student.achievement}</Text></View>
            </View>)}</View>
            <Text style={styles.sampleNote}>Illustrative student names and scores shown for this showcase.</Text>
          </View>

          <View style={[styles.bottomGrid, stacked && styles.bottomGridStacked]}>
            <View style={styles.noticePanel}>
              <View style={styles.noticeHeading}><View style={styles.sectionHeadingCopy}><Text style={styles.eyebrow}>IN THE LOOP</Text><Text accessibilityRole="header" style={styles.sectionTitle}>School notice board</Text></View><View style={styles.publicBadge}><View style={styles.publicDot}/><Text style={styles.publicBadgeText}>PUBLIC UPDATES</Text></View></View>
              {noticesLoading ? <View style={styles.noticeEmpty}><ActivityIndicator color="#5267D5"/><Text style={styles.emptyText}>Loading school announcements…</Text></View> : noticesError ? <View style={styles.noticeEmpty}><Text style={styles.emptyTitle}>Updates are unavailable right now</Text><Text style={styles.emptyText}>Please try loading the notice board again.</Text><TouchableOpacity accessibilityRole="button" onPress={() => refreshNotices()} style={styles.retryButton}><Text style={styles.retryText}>Refresh notices ↻</Text></TouchableOpacity></View> : publicNotices && publicNotices.length > 0 ? <View style={styles.noticeList}>{publicNotices.slice(0, 3).map((notice: any, index: number) => <View key={notice.id} style={styles.noticeCard}>
                <View style={styles.noticeNumber}><Text style={styles.noticeNumberText}>0{index + 1}</Text></View><View style={styles.noticeBody}><View style={styles.noticeHeader}><Text style={styles.noticeTitle}>{notice.title}</Text>{notice.date ? <Text style={styles.noticeDate}>{notice.date}</Text> : null}</View><Text style={styles.noticeMsg}>{notice.message}</Text></View>
              </View>)}</View> : <View style={styles.noticeEmpty}><View style={styles.emptyIcon}><Text style={styles.emptyIconText}>▤</Text></View><Text style={styles.emptyTitle}>You're all caught up.</Text><Text style={styles.emptyText}>New public announcements will appear here.{'\n'}Check back for the latest from your school.</Text></View>}
            </View>
            <View style={[styles.admissionsPanel, stacked && styles.admissionsPanelStacked]}>
              <View style={styles.admissionDecor} pointerEvents="none"/><Text style={styles.admissionEyebrow}>THE JOURNEY STARTS HERE</Text><Text accessibilityRole="header" style={styles.admissionTitle}>A new chapter{'\n'}for a bright mind.</Text><Text style={styles.admissionCopy}>Interested in joining our school community? Send an admission inquiry and take the first step.</Text>
              <View style={styles.admissionSteps}><Text style={styles.admissionStep}>01   Share student details</Text><Text style={styles.admissionStep}>02   Submit your inquiry</Text><Text style={styles.admissionStep}>03   School reviews your application</Text></View>
              <TouchableOpacity accessibilityRole="button" style={styles.admissionButton} onPress={() => setAdmissionModal(true)}><Text style={styles.admissionButtonText}>Start an application</Text><Text style={styles.admissionButtonText}>↗</Text></TouchableOpacity>
            </View>
          </View>
          <View style={styles.footer}><Text style={styles.footerBrand}>SHIVORA<Text style={styles.footerBrandLight}>  /  SCHOOL CONNECT</Text></Text><Text style={styles.footerText}>A little more connected. A lot more possible.</Text></View>
        </View>
      </ScrollView>
      {/* Admission Application Modal */}
      <Modal visible={admissionModal} animationType="slide" transparent onRequestClose={() => setAdmissionModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Student Admission Application</Text>
              <Text style={styles.modalSubtitle}>Fill the details to register an admission inquiry.</Text>

              <Text style={styles.label}>Student Full Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(t) => setFormData({ ...formData, name: t })}
                placeholder="e.g. Kabir Malhotra"
              />

              <Text style={styles.label}>Email Address *</Text>
              <TextInput
                style={styles.input}
                keyboardType="email-address"
                value={formData.email}
                onChangeText={(t) => setFormData({ ...formData, email: t })}
                placeholder="student@example.com"
              />

              <Text style={styles.label}>Mobile Number *</Text>
              <TextInput
                style={styles.input}
                keyboardType="phone-pad"
                value={formData.mobile}
                onChangeText={(t) => setFormData({ ...formData, mobile: t })}
                placeholder="9876543210"
              />

              <Text style={styles.label}>Applying for Class *</Text>
              <TextInput
                style={styles.input}
                value={formData.applyingClass}
                onChangeText={(t) => setFormData({ ...formData, applyingClass: t })}
                placeholder="Class 6 / 7 / 8 / 9 / 10"
              />

              <Text style={styles.label}>Parent / Guardian Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.guardianName}
                onChangeText={(t) => setFormData({ ...formData, guardianName: t })}
                placeholder="Parent Full Name"
              />

              <Text style={styles.label}>Parent Mobile *</Text>
              <TextInput
                style={styles.input}
                keyboardType="phone-pad"
                value={formData.guardianContact}
                onChangeText={(t) => setFormData({ ...formData, guardianContact: t })}
                placeholder="Parent Mobile Number"
              />

              <Text style={styles.label}>Residential Address *</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                multiline
                value={formData.address}
                onChangeText={(t) => setFormData({ ...formData, address: t })}
                placeholder="Full address..."
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
                    {isPending ? 'Submitting...' : 'Submit Application'}
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
  container: { flex: 1, backgroundColor: '#F6F7FB' },
  scroll: { paddingBottom: 18 },
  workspace: { width: '100%', maxWidth: 1320, alignSelf: 'center', paddingHorizontal: 36, paddingTop: 28, gap: 36 },
  workspaceCompact: { paddingHorizontal: 18, paddingTop: 18, gap: 28 },
  hero: { backgroundColor: '#172B46', borderRadius: 24, padding: 46, flexDirection: 'row', alignItems: 'center', gap: 32, overflow: 'hidden', minHeight: 370 },
  heroStacked: { minHeight: 0 }, heroCompact: { padding: 26, borderRadius: 20 },
  heroGlow: { position: 'absolute', width: 520, height: 520, borderRadius: 260, right: -150, top: -170, backgroundColor: '#203957', opacity: 0.7 },
  heroCopy: { flex: 1, minWidth: 0 },
  heroTag: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 11, borderRadius: 7, backgroundColor: '#243D58', marginBottom: 21 },
  tagDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#A9C9BA' },
  heroTagText: { color: '#CEDDEB', fontSize: 9, fontWeight: '700', letterSpacing: 1.4, flexShrink: 1 },
  heroTitle: { color: '#FFFFFF', fontSize: 49, fontWeight: '800', lineHeight: 57, letterSpacing: -1.7 },
  heroTitleCompact: { fontSize: 35, lineHeight: 43, letterSpacing: -1 },
  heroSubtitle: { color: '#B5C5D8', fontSize: 14, lineHeight: 24, marginTop: 17, maxWidth: 450 },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 25 },
  primaryBtn: { backgroundColor: '#D5E4B9', paddingHorizontal: 18, minHeight: 47, borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 20 },
  primaryBtnText: { color: '#23392B', fontSize: 12, fontWeight: '700' }, buttonArrow: { color: '#23392B', fontSize: 19 },
  secondaryBtn: { borderWidth: 1, borderColor: '#52647C', paddingHorizontal: 17, minHeight: 47, borderRadius: 9, flexDirection: 'row', alignItems: 'center', gap: 16 },
  secondaryBtnText: { color: '#F3F6FB', fontSize: 12, fontWeight: '600' }, secondaryArrow: { color: '#D7E2F0', fontSize: 17 },
  heroFootnote: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24 }, heroFootnoteSymbol: { color: '#D5E4B9', fontSize: 18 }, heroFootnoteText: { color: '#9FB3CD', fontSize: 10, lineHeight: 16, flexShrink: 1 },
  heroVisual: { width: 350, height: 330, justifyContent: 'center', alignItems: 'center' }, visualOrbit: { width: 300, height: 300, borderRadius: 150, borderWidth: 1, borderColor: '#496079', position: 'absolute' }, visualOrbitSmall: { width: 246, height: 246, borderRadius: 123, backgroundColor: '#29435E', position: 'absolute' },
  visualSheet: { backgroundColor: '#F4F2E9', borderRadius: 17, padding: 24, width: 247, height: 288, transform: [{ rotate: '-7deg' }] }, visualSheetTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, visualEyebrow: { fontSize: 8, letterSpacing: 1.5, fontWeight: '700', color: '#6B7769' }, visualStar: { fontSize: 26, color: '#B58A48' }, visualTitle: { fontSize: 27, lineHeight: 33, fontWeight: '800', color: '#253B37', marginTop: 9, letterSpacing: -0.8 }, bookScene: { marginTop: 17, gap: 5 }, book: { height: 21, borderRadius: 4, paddingHorizontal: 15, justifyContent: 'center', borderLeftWidth: 7 }, bookOne: { width: '86%', alignSelf: 'flex-end', backgroundColor: '#ADBCE9', borderLeftColor: '#879ACF' }, bookTwo: { width: '94%', backgroundColor: '#E7C08F', borderLeftColor: '#CFA677' }, bookThree: { backgroundColor: '#B5CBB3', borderLeftColor: '#8DAF8A' }, bookText: { color: '#33423C', fontSize: 7, fontWeight: '800', letterSpacing: 2 }, visualBottom: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 }, visualDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#75956B' }, visualCaption: { color: '#73806F', fontSize: 8 },
  floatingBadge: { position: 'absolute', bottom: 5, right: 0, backgroundColor: '#FFFFFF', padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 10, shadowColor: '#05142C', shadowOpacity: 0.16, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 }, floatingIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#FAF0DF', justifyContent: 'center', alignItems: 'center' }, floatingStar: { color: '#BC9251', fontSize: 20 }, floatingTitle: { color: '#263A54', fontSize: 10, fontWeight: '700' }, floatingCopy: { color: '#7B889A', fontSize: 8, marginTop: 4 }, sparkle: { position: 'absolute', top: 4, right: 15, color: '#D5E4B9', fontSize: 43 },
  valuesStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, borderBottomWidth: 1, borderBottomColor: '#E4E8F0', paddingBottom: 26, marginTop: -10 }, valueItem: { flex: 1, minWidth: 235, flexDirection: 'row', alignItems: 'center', gap: 14 }, valueItemCompact: { flexBasis: '100%' }, valueNumber: { color: '#8D9CAF', fontSize: 11, borderWidth: 1, borderColor: '#E0E5ED', borderRadius: 12, padding: 12, backgroundColor: '#FFFFFF' }, valueTitle: { color: '#314259', fontSize: 12, fontWeight: '700' }, valueCopy: { color: '#8490A1', fontSize: 11, marginTop: 5 },
  section: { gap: 20 }, sectionHeading: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 15 }, sectionHeadingCopy: { flex: 1, minWidth: 200 }, eyebrow: { color: '#6476BB', fontSize: 9, fontWeight: '800', letterSpacing: 1.8, marginBottom: 9 }, sectionTitle: { color: '#24354E', fontSize: 24, lineHeight: 31, fontWeight: '700', letterSpacing: -0.65 }, sectionAside: { color: '#8894A7', fontSize: 11 }, sectionDescription: { color: '#777365', fontSize: 12, lineHeight: 20, marginTop: 8 },
  portalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 }, portalCard: { flex: 1, minWidth: 260, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#E5E9F1', shadowColor: '#253B68', shadowOpacity: 0.025, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } }, fullWidth: { flexBasis: '100%', minWidth: 0 }, portalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, portalIcon: { width: 45, height: 45, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, portalSymbol: { fontSize: 26 }, portalArrow: { color: '#A3ADBD', fontSize: 22 }, portalEyebrow: { fontSize: 8, fontWeight: '700', letterSpacing: 1.3, marginTop: 23 }, portalTitle: { color: '#27384F', fontSize: 18, fontWeight: '700', marginTop: 8 }, portalDescription: { color: '#6F7C91', fontSize: 12, lineHeight: 21, marginTop: 9, flex: 1 }, portalFeatures: { color: '#97A1B1', fontSize: 10, marginTop: 19, marginBottom: 17 }, portalFooter: { borderTopWidth: 1, borderTopColor: '#EDF0F6', paddingTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, portalLink: { fontSize: 12, fontWeight: '700' },
  achieversSection: { backgroundColor: '#F2F0E9', borderWidth: 1, borderColor: '#EAE6DD', borderRadius: 22, padding: 28, gap: 22 }, achieversCompact: { padding: 18 }, eyebrowRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 9 }, goldEyebrow: { color: '#9D814F', fontSize: 9, fontWeight: '800', letterSpacing: 1.5 }, sampleBadge: { color: '#8D8474', backgroundColor: '#E8E4DA', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3, fontSize: 7, letterSpacing: 0.8, fontWeight: '600' }, achievementSeal: { flexDirection: 'row', alignItems: 'center', gap: 8 }, sealStar: { color: '#B79B65', fontSize: 37 }, sealText: { color: '#A18A62', fontSize: 8, lineHeight: 13, letterSpacing: 1.2, fontWeight: '700' }, achieversGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 }, studentCard: { flex: 1, minWidth: 210, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8E5DF', borderTopWidth: 3, borderRadius: 14, padding: 19, alignItems: 'center' }, studentTop: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, studentClass: { color: '#8A92A0', fontSize: 9, fontWeight: '600' }, rankBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 }, rankText: { fontSize: 9, fontWeight: '700' }, studentAvatar: { width: 66, height: 66, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginTop: 14, marginBottom: 16 }, studentInitials: { fontSize: 22, fontWeight: '700' }, avatarStar: { position: 'absolute', right: -5, bottom: -4, width: 24, height: 24, borderRadius: 9, borderWidth: 3, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }, avatarStarText: { color: '#FFFFFF', fontSize: 12 }, studentName: { color: '#293A51', fontSize: 15, fontWeight: '700', textAlign: 'center' }, studentSubject: { color: '#8D97A6', fontSize: 9, lineHeight: 15, marginTop: 5, textAlign: 'center' }, scoreRow: { alignItems: 'center', marginTop: 18, marginBottom: 17 }, score: { fontSize: 29, fontWeight: '800', letterSpacing: -0.8 }, percent: { fontSize: 14, fontWeight: '500' }, scoreLabel: { color: '#9CA4B0', fontSize: 7, letterSpacing: 1.4, marginTop: 4 }, studentAchievement: { width: '100%', borderRadius: 7, paddingVertical: 8, paddingHorizontal: 4 }, achievementText: { textAlign: 'center', fontSize: 9, fontWeight: '600' }, sampleNote: { color: '#9B9385', fontSize: 10, textAlign: 'center', lineHeight: 16, marginTop: -7 },
  bottomGrid: { flexDirection: 'row', alignItems: 'stretch', gap: 22 }, bottomGridStacked: { flexDirection: 'column' }, noticePanel: { flex: 1, minWidth: 0, borderWidth: 1, borderColor: '#E5E9F1', backgroundColor: '#FFFFFF', borderRadius: 18, padding: 26 }, noticeHeading: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 18 }, publicBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EDF6F1', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 5 }, publicDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#4F9B80' }, publicBadgeText: { color: '#558574', fontSize: 7, letterSpacing: 0.8, fontWeight: '700' }, noticeEmpty: { flex: 1, minHeight: 210, alignItems: 'center', justifyContent: 'center', paddingVertical: 24 }, emptyIcon: { backgroundColor: '#F2F4FA', width: 54, height: 54, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 17 }, emptyIconText: { color: '#97A5C2', fontSize: 26 }, emptyTitle: { color: '#596980', fontSize: 15, fontWeight: '600', textAlign: 'center' }, emptyText: { color: '#95A0B1', fontSize: 12, lineHeight: 21, textAlign: 'center', marginTop: 8 }, retryButton: { paddingHorizontal: 16, paddingVertical: 12, marginTop: 8 }, retryText: { color: '#5267D5', fontSize: 12, fontWeight: '700' }, noticeList: { gap: 0 }, noticeCard: { flexDirection: 'row', gap: 13, paddingVertical: 19, borderTopWidth: 1, borderTopColor: '#EDF0F5' }, noticeNumber: { width: 35, height: 37, borderRadius: 9, backgroundColor: '#F0F3FC', justifyContent: 'center', alignItems: 'center' }, noticeNumberText: { color: '#7A8AB0', fontSize: 11, fontWeight: '600' }, noticeBody: { flex: 1, minWidth: 0 }, noticeHeader: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'space-between', alignItems: 'center' }, noticeTitle: { color: '#3F5068', fontSize: 13, fontWeight: '700', flexShrink: 1 }, noticeDate: { color: '#9AA5B5', fontSize: 9 }, noticeMsg: { color: '#718098', fontSize: 12, lineHeight: 20, marginTop: 7 },
  admissionsPanel: { width: 340, backgroundColor: '#EAF0E2', borderRadius: 18, padding: 28, overflow: 'hidden', borderWidth: 1, borderColor: '#E0E7D6' }, admissionsPanelStacked: { width: '100%' }, admissionDecor: { position: 'absolute', right: -55, top: -55, width: 160, height: 160, borderRadius: 80, borderWidth: 23, borderColor: '#E2EAD8' }, admissionEyebrow: { color: '#80916D', fontSize: 8, letterSpacing: 1.4, fontWeight: '700', marginBottom: 15 }, admissionTitle: { color: '#3E5238', fontSize: 27, fontWeight: '700', lineHeight: 34, letterSpacing: -0.6 }, admissionCopy: { color: '#67795C', fontSize: 12, lineHeight: 21, marginTop: 12 }, admissionSteps: { gap: 10, marginVertical: 23 }, admissionStep: { color: '#728268', fontSize: 10, lineHeight: 16 }, admissionButton: { backgroundColor: '#FFFFFF', paddingHorizontal: 15, paddingVertical: 14, borderRadius: 9, flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 'auto' }, admissionButtonText: { color: '#4D6742', fontSize: 12, fontWeight: '700' },
  footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingTop: 7, paddingBottom: 12 }, footerBrand: { color: '#718099', fontSize: 10, fontWeight: '800', letterSpacing: 1 }, footerBrandLight: { color: '#A2ACBC', fontSize: 8, fontWeight: '500' }, footerText: { color: '#A2ACBC', fontSize: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 29, 49, 0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 }, modalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 26, width: '100%', maxWidth: 520, maxHeight: '90%' }, modalTitle: { fontSize: 21, fontWeight: '700', color: '#24354E', marginBottom: 7 }, modalSubtitle: { fontSize: 12, lineHeight: 20, color: '#8490A1', marginBottom: 22 }, label: { fontSize: 12, fontWeight: '600', color: '#596A80', marginBottom: 7 }, input: { backgroundColor: '#F8FAFD', color: '#24354E', borderWidth: 1, borderColor: '#E0E6EF', borderRadius: 9, paddingHorizontal: 13, paddingVertical: 12, minHeight: 45, fontSize: 13, marginBottom: 16 }, modalButtons: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 12, marginTop: 12 }, cancelBtn: { paddingHorizontal: 16, minHeight: 44, justifyContent: 'center', borderRadius: 9, borderWidth: 1, borderColor: '#E0E6EF' }, cancelBtnText: { color: '#718099', fontWeight: '600', fontSize: 12 }, submitBtn: { backgroundColor: '#5267D5', paddingHorizontal: 18, minHeight: 44, justifyContent: 'center', borderRadius: 9 }, submitBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
});