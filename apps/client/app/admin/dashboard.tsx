import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  View,
  useColorScheme,
  Platform,
  Animated,
  AccessibilityInfo,
  Image,
  LayoutChangeEvent,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Rect,
  G,
  Ellipse,
  Circle,
  Path,
} from 'react-native-svg';
import {
  useFonts,
  BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  useStudents,
  useStaff,
  useAccountsOverview,
  useAcademics,
  useNotices,
  useTimetable,
  useAttendanceByDate,
} from '../../src/hooks/useQueries';
import { useAuth } from '../../src/hooks/useAuth';
import { useTheme } from '../../src/context/ThemeContext';
import { api } from '../../src/services/api';
import { useQuery } from '@tanstack/react-query';

// Optional School photo constant (renders in the 58% banner space when provided)
const SCHOOL_PHOTO: string | null = null;

// Palette definitions matching original theme
const FIXED_PALETTE = {
  ink: '#111936',
  mint: '#5BE0B3',
  sky: '#8E9BFF',
  sun: '#FFC93C',
  coral: '#FF6B57',
};

const THEME_COLORS = {
  light: {
    canvas: '#EEF0FF',
    panel: '#FFFFFF',
    text: '#111936',
    muted: '#5E668C',
    line: '#DCE0F5',
    side: '#FFFFFF',
    ...FIXED_PALETTE,
  },
  dark: {
    canvas: '#0C1230',
    panel: '#161E45',
    text: '#F2F3FF',
    muted: '#98A0CC',
    line: '#27316A',
    side: '#080C22',
    ...FIXED_PALETTE,
  },
};

// SVG Path definitions matching HTML exactly
const SVG_ICONS = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  users: "M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20 M10 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35 M15.5 5.2a3.5 3.5 0 0 1 0 6.6",
  user: "M19 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-7A3.5 3.5 0 0 0 5 18.5V20 M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
  cal: "M4 6h16v14H4z M16 3v4 M8 3v4 M4 11h16",
  card: "M3 6h18v12H3z M3 10h18 M7 15h3",
  brief: "M3 8h18v12H3z M9 8V5h6v3 M3 13h18",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 2",
  book: "M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z M5 17a3 3 0 0 1 3-3h10",
  bell: "M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z M10 21h4",
  moon: "M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z",
  sun: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
};

// Quick action cards definition
const QUICK_ACTIONS = [
  { label: 'Add student', icon: 'users', color: FIXED_PALETTE.sun, path: 'students' },
  { label: 'Collect fee', icon: 'card', color: FIXED_PALETTE.mint, path: 'fees' },
  { label: 'Mark attendance', icon: 'cal', color: FIXED_PALETTE.sky, path: 'attendance' },
  { label: 'Run payroll', icon: 'brief', color: FIXED_PALETTE.coral, path: 'salary' },
];

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { theme: themeMode, toggleTheme } = useTheme();
  const palette = themeMode === 'dark' ? THEME_COLORS.dark : THEME_COLORS.light;

  const [containerWidth, setContainerWidth] = useState(1200);
  const [reduceMotion, setReduceMotion] = useState(false);

  // Load Google Fonts
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_500Medium,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
  });

  // Inject Google font stylesheet on web for instant crisp rendering
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const linkId = 'bricolage-font-link';
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href =
          'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&display=swap';
        document.head.appendChild(link);
      }
    }
  }, []);

  // Check accessibility reduced motion
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => setReduceMotion(enabled))
      .catch(() => setReduceMotion(false));
  }, []);

  // Real backend queries
  const { user } = useAuth();
  const students = useStudents();
  const staff = useStaff();
  const accounts = useAccountsOverview();
  const academics = useAcademics();
  const notices = useNotices();
  const timetable = useTimetable();

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const staffAttendance = useAttendanceByDate('EMPLOYEE', todayStr);

  // Fetch all fee accounts to calculate real collected and due
  const feeAccountsQuery = useQuery({
    queryKey: ['fees', 'accounts', 'all'],
    queryFn: async () => {
      try {
        const res = await api.get('/fees/accounts');
        return res.data;
      } catch {
        return [];
      }
    },
  });

  // Dynamic Greeting based on current hour
  const greetingText = useMemo(() => {
    const h = new Date().getHours();
    const timeWord = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
    const adminName = user?.name ? user.name.split(' ')[0] : 'Admin';
    return `Good ${timeWord}, ${adminName}`;
  }, [user]);

  // Dynamic Date in en-IN format
  const dateFormatted = useMemo(() => {
    return new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }, []);

  // Current Month Name
  const currentMonthName = useMemo(() => {
    return new Date().toLocaleDateString('en-IN', { month: 'long' });
  }, []);

  // Real Class List & Range
  const classesList = useMemo(() => {
    const rawClasses = academics.data?.classes || [];
    if (!Array.isArray(rawClasses) || rawClasses.length === 0) return [];
    return rawClasses.map((c: any, index: number) => {
      const pct = c.attendanceRate != null ? Number(c.attendanceRate) : 0;
      const rawName = String(c.name || '').trim();
      const displayLabel = rawName.replace(/^class\s*/i, '').trim() || String(index + 1);
      return {
        id: c.id || String(index + 1),
        name: rawName || String(index + 1),
        displayLabel,
        number: index + 1,
        pct,
      };
    });
  }, [academics.data]);

  const classRangeText = useMemo(() => {
    if (classesList.length === 0) return null;
    const first = classesList[0].name;
    const last = classesList[classesList.length - 1].name;
    return `Classes ${first} to ${last}`;
  }, [classesList]);

  const activeAcademicYear = useMemo(() => {
    const years = academics.data?.academicYears || [];
    const current = years.find((y: any) => y.isCurrent);
    return current?.name || null;
  }, [academics.data]);

  // Subtitle with student and staff count
  const headerSubtitle = useMemo(() => {
    const totalStudents = students.data?.length ?? 0;
    const totalStaff = staff.data?.length ?? 0;
    const countPart = `${totalStudents.toLocaleString('en-IN')} students and ${totalStaff.toLocaleString('en-IN')} staff`;
    if (classRangeText) {
      return `${dateFormatted}. ${countPart} across ${classRangeText}.`;
    }
    return `${dateFormatted}. ${countPart}.`;
  }, [students.data, staff.data, dateFormatted, classRangeText]);

  // Fees calculations
  const { collectedStr, dueStr, receivedPct } = useMemo(() => {
    let collected = 0;
    let due = 0;

    if (Array.isArray(feeAccountsQuery.data)) {
      for (const acc of feeAccountsQuery.data) {
        if (acc.netPaid != null) collected += Number(acc.netPaid);
        else if (Array.isArray(acc.transactions)) {
          for (const t of acc.transactions) {
            if (t.status === 'SUCCESS') collected += Number(t.amount || 0);
          }
        }
        if (acc.outstanding != null) due += Number(acc.outstanding);
      }
    } else if (accounts.data?.income != null) {
      collected = Number(accounts.data.income || 0);
    }

    const total = collected + due;
    const pct = total > 0 ? Math.min(100, Math.round((collected / total) * 100)) : 0;

    const formatFee = (amount: number) => {
      if (!amount || amount === 0) return '₹0';
      if (amount >= 10000000) {
        const cr = amount / 10000000;
        return `₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2)}Cr`;
      }
      if (amount >= 100000) {
        const l = amount / 100000;
        return `₹${l % 1 === 0 ? l.toFixed(0) : l.toFixed(2)}L`;
      }
      return `₹${Math.round(amount).toLocaleString('en-IN')}`;
    };

    return {
      collectedStr: formatFee(collected),
      dueStr: formatFee(due),
      receivedPct: pct,
    };
  }, [feeAccountsQuery.data, accounts.data]);

  // Staff in calculations
  const { presentStaffCount, totalStaffCount, notInStaffCount, staffInitialsList, remainingStaffCount } =
    useMemo(() => {
      const allStaff = Array.isArray(staff.data) ? staff.data : [];
      const total = allStaff.length;

      let present = 0;
      if (Array.isArray(staffAttendance.data)) {
        present = staffAttendance.data.filter((r: any) => r.status === 'PRESENT').length;
      }

      const initials = allStaff.slice(0, 5).map((member: any) => {
        const name = String(member.name || member.loginId || 'Staff').trim();
        const parts = name.split(/\s+/);
        if (parts.length >= 2) {
          return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
      });

      return {
        presentStaffCount: present,
        totalStaffCount: total,
        notInStaffCount: Math.max(0, total - present),
        staffInitialsList: initials,
        remainingStaffCount: Math.max(0, total - 5),
      };
    }, [staff.data, staffAttendance.data]);

  // Today's School Day Timetable
  const todaySchedule = useMemo(() => {
    const entries = Array.isArray(timetable.data) ? timetable.data : [];
    if (entries.length === 0) return [];

    const todayDay = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    const dayEntries = entries.filter((e: any) => !e.dayOfWeek || String(e.dayOfWeek).toUpperCase() === todayDay);

    dayEntries.sort((a: any, b: any) => String(a.startTime || '').localeCompare(String(b.startTime || '')));

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return dayEntries.map((e: any) => {
      let status: 'done' | 'now' | 'upcoming' = 'upcoming';
      if (e.startTime && e.endTime) {
        const [sh, sm] = String(e.startTime).split(':').map(Number);
        const [eh, em] = String(e.endTime).split(':').map(Number);
        const startMin = (sh || 0) * 60 + (sm || 0);
        const endMin = (eh || 0) * 60 + (em || 0);

        if (currentMinutes > endMin) {
          status = 'done';
        } else if (currentMinutes >= startMin && currentMinutes <= endMin) {
          status = 'now';
        } else {
          status = 'upcoming';
        }
      }
      return {
        id: e.id,
        title: e.subject?.name || e.title || e.periodName || 'Class Session',
        time: e.startTime ? `${e.startTime}` : 'TBD',
        status,
      };
    });
  }, [timetable.data]);

  // Real Notices
  const realNotices = useMemo(() => {
    const raw = Array.isArray(notices.data) ? notices.data : [];
    return raw.slice(0, 3).map((n: any) => {
      const audienceLabel = n.audience ? String(n.audience).replace(/_/g, ' ') : 'All classes';
      const isPublished = n.published ?? true;
      return {
        id: n.id,
        title: n.title || 'Announcement',
        audience: audienceLabel,
        pill: isPublished ? 'Published' : 'Scheduled',
      };
    });
  }, [notices.data]);

  // Staggered Tile Animations
  const animValues = useRef<Animated.Value[]>([]).current;
  useEffect(() => {
    if (classesList.length > 0) {
      while (animValues.length < classesList.length) {
        animValues.push(new Animated.Value(reduceMotion ? 1 : 0));
      }
      if (!reduceMotion) {
        const anims = classesList.map((_, i) =>
          Animated.timing(animValues[i], {
            toValue: 1,
            duration: 450,
            delay: i * 55,
            useNativeDriver: true,
          })
        );
        Animated.stagger(55, anims).start();
      }
    }
  }, [classesList.length, reduceMotion]);

  // Layout Measurement for container-based breakpoints
  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - containerWidth) > 4) {
      setContainerWidth(w);
    }
  };

  const isDesktop = containerWidth >= 800;
  const isMid = containerWidth >= 600 && containerWidth < 800;
  const isMobile = containerWidth < 600;

  // Font family resolver
  const font = (weight: '500' | '600' | '700' | '800') => {
    if (Platform.OS === 'web') {
      return {
        fontFamily: '"Bricolage Grotesque", system-ui, -apple-system, sans-serif',
        fontWeight: weight as any,
      };
    }
    if (!fontsLoaded) return { fontWeight: weight as any };
    switch (weight) {
      case '500':
        return { fontFamily: 'BricolageGrotesque_500Medium' };
      case '600':
        return { fontFamily: 'BricolageGrotesque_600SemiBold' };
      case '700':
        return { fontFamily: 'BricolageGrotesque_700Bold' };
      case '800':
        return { fontFamily: 'BricolageGrotesque_800ExtraBold' };
      default:
        return { fontFamily: 'BricolageGrotesque_500Medium' };
    }
  };

  // Color threshold helper for class attendance
  const getAttendanceBg = (p: number) => {
    if (p >= 95) return FIXED_PALETTE.mint;
    if (p >= 90) return FIXED_PALETTE.sky;
    if (p >= 87) return FIXED_PALETTE.sun;
    return FIXED_PALETTE.coral;
  };

  const openRoute = (path: string) => {
    router.push(`/admin/${path}` as any);
  };

  // Loading indicator for overall initial load
  const isInitialLoading = students.isLoading && staff.isLoading && accounts.isLoading;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: palette.canvas }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      onLayout={handleLayout}
    >
      <View style={styles.shell}>
        {/* ── Banner Section ── */}
        <View
          style={[
            styles.banner,
            isMobile && { minHeight: 210, padding: 24 },
          ]}
        >
          {/* Banner Art / School Photo in right 58% */}
          <View
            style={[
              styles.artContainer,
              isMobile && { width: '100%', opacity: 0.4 },
            ]}
            pointerEvents="none"
          >
            {SCHOOL_PHOTO ? (
              <Image source={{ uri: SCHOOL_PHOTO }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <Svg
                style={StyleSheet.absoluteFill}
                viewBox="0 0 720 300"
                preserveAspectRatio="xMaxYMax slice"
                aria-hidden={true}
              >
                <Defs>
                  <SvgLinearGradient id="sk" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#8E9BFF" />
                    <Stop offset="1" stopColor="#D4D9FF" />
                  </SvgLinearGradient>
                </Defs>
                <Rect width="720" height="300" fill="url(#sk)" />
                <G fill="#fff" opacity={0.9}>
                  <Ellipse cx="140" cy="78" rx="46" ry="13" />
                  <Ellipse cx="170" cy="66" rx="30" ry="14" />
                  <Ellipse cx="400" cy="46" rx="38" ry="10" />
                  <Ellipse cx="422" cy="37" rx="24" ry="11" />
                </G>
                <Rect y="250" width="720" height="50" fill="#5BE0B3" />
                <G transform="translate(200 0)">
                  <Circle cx="410" cy="86" r="62" fill="#FFC93C" opacity={0.3} />
                  <Circle cx="410" cy="86" r="42" fill="#FFC93C" />
                  <Path d="M238 250h44l34 50H204z" fill="#EEF0FF" />
                  <Rect x="100" y="178" width="70" height="72" fill="#fff" />
                  <Rect x="350" y="178" width="70" height="72" fill="#fff" />
                  <Rect x="94" y="170" width="82" height="10" rx="5" fill="#FF6B57" />
                  <Rect x="344" y="170" width="82" height="10" rx="5" fill="#FF6B57" />
                  <Rect x="150" y="140" width="220" height="110" fill="#fff" />
                  <Rect x="144" y="130" width="232" height="12" rx="6" fill="#FF6B57" />
                  <Rect x="224" y="88" width="72" height="50" fill="#fff" />
                  <Path d="M214 90 260 50l46 40z" fill="#FF6B57" />
                  <Circle cx="260" cy="110" r="15" fill="#FFC93C" stroke="#111936" strokeWidth={3} />
                  <Path
                    d="M260 110v-8M260 110l6 4"
                    stroke="#111936"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    fill="none"
                  />
                  <Path d="M260 50V26" stroke="#111936" strokeWidth={3} />
                  <Path d="M260 26h30l-8 8 8 8h-30z" fill="#fff" />
                  <Path d="M240 250v-34a20 20 0 0 1 40 0v34z" fill="#111936" />
                  <G fill="#8E9BFF">
                    <Rect x="166" y="156" width="22" height="28" rx="3" />
                    <Rect x="198" y="156" width="22" height="28" rx="3" />
                    <Rect x="300" y="156" width="22" height="28" rx="3" />
                    <Rect x="332" y="156" width="22" height="28" rx="3" />
                    <Rect x="166" y="204" width="22" height="28" rx="3" />
                    <Rect x="198" y="204" width="22" height="28" rx="3" />
                    <Rect x="300" y="204" width="22" height="28" rx="3" />
                    <Rect x="332" y="204" width="22" height="28" rx="3" />
                    <Rect x="114" y="198" width="18" height="26" rx="3" />
                    <Rect x="138" y="198" width="18" height="26" rx="3" />
                    <Rect x="364" y="198" width="18" height="26" rx="3" />
                    <Rect x="388" y="198" width="18" height="26" rx="3" />
                  </G>
                  <Rect x="52" y="226" width="8" height="28" fill="#1c2a5e" />
                  <Circle cx="56" cy="208" r="28" fill="#2FBF8F" />
                  <Circle cx="76" cy="224" r="18" fill="#5BE0B3" />
                  <Rect x="462" y="226" width="8" height="28" fill="#1c2a5e" />
                  <Circle cx="466" cy="208" r="28" fill="#2FBF8F" />
                  <Circle cx="446" cy="224" r="18" fill="#5BE0B3" />
                </G>
              </Svg>
            )}

            {/* Horizontal gradient overlay to smoothly fade into banner background */}
            <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none">
              <Defs>
                <SvgLinearGradient id="bannerFade" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor="#111936" stopOpacity="1" />
                  <Stop offset="0.42" stopColor="#111936" stopOpacity="0" />
                </SvgLinearGradient>
              </Defs>
              <Rect x="0" y="0" width="100" height="100" fill="url(#bannerFade)" />
            </Svg>
          </View>

          {/* Banner Text Left */}
          <View style={[styles.bannerText, isMobile && { maxWidth: '100%' }]}>
            <Text style={[styles.schoolName, font('800'), isMobile && { fontSize: 32 }]}>
              Arihant Public School
            </Text>
            <View style={styles.chipsRow}>
              {classRangeText ? (
                <View style={[styles.chip, { backgroundColor: FIXED_PALETTE.sky }]}>
                  <Text style={[styles.chipText, font('700')]}>{classRangeText}</Text>
                </View>
              ) : null}
              {activeAcademicYear ? (
                <View style={[styles.chip, { backgroundColor: FIXED_PALETTE.sun }]}>
                  <Text style={[styles.chipText, font('700')]}>{`Academic year ${activeAcademicYear}`}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* ── Header Row ── */}
        <View style={styles.header}>
          <View style={{ flex: 1, minWidth: 240 }}>
            <Text style={[styles.greeting, font('700'), { color: palette.text }, isMobile && { fontSize: 28 }]}>
              {greetingText}
            </Text>
            <Text style={[styles.headerSub, font('500'), { color: palette.muted }]}>
              {headerSubtitle}
            </Text>
          </View>

          <View style={styles.headerTools}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Switch theme"
              onPress={toggleTheme}
              style={[
                styles.iconBtn,
                {
                  backgroundColor: palette.panel,
                  borderColor: palette.line,
                },
              ]}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={palette.text} strokeWidth={2}>
                <Path d={themeMode === 'dark' ? SVG_ICONS.sun : SVG_ICONS.moon} />
              </Svg>
            </Pressable>

            <View style={[styles.iconBtn, styles.avatarBtn]}>
              <Text style={[styles.avatarText, font('800')]}>
                {(user?.name || user?.loginId || 'A').charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Bento Grid ── */}
        <View style={styles.bento}>
          {/* Top Row: Attendance Board (Span 8) + Side Cards (Span 4) */}
          <View style={[styles.topRow, isDesktop ? { flexDirection: 'row' } : { flexDirection: 'column' }]}>
            {/* Board Card: Attendance by class today */}
            <View
              style={[
                styles.card,
                styles.boardCard,
                {
                  backgroundColor: palette.panel,
                  borderColor: palette.line,
                  flex: isDesktop ? 8 : undefined,
                  width: isDesktop ? undefined : '100%',
                },
                isMobile && { padding: 20 },
              ]}
            >
              <Text style={[styles.cardTitle, font('700'), { color: palette.text }]}>
                Attendance by class today
              </Text>
              <Text style={[styles.cardHint, font('500'), { color: palette.muted }]}>
                Each tile is one class in Section A.
              </Text>

              {classesList.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, font('500'), { color: palette.muted }]}>
                    No classes registered yet.
                  </Text>
                </View>
              ) : (
                <View style={styles.tilesContainer}>
                  {classesList.map((item, idx) => {
                    const anim = animValues[idx] || new Animated.Value(1);
                    return (
                      <Animated.View
                        key={item.id}
                        style={[
                          styles.tile,
                          {
                            backgroundColor: getAttendanceBg(item.pct),
                            opacity: anim,
                            transform: [{ scale: anim }],
                          },
                        ]}
                      >
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.tileNumber,
                            font('800'),
                            item.displayLabel.length > 2 && styles.tileTextSmall,
                          ]}
                        >
                          {item.displayLabel}
                        </Text>
                        <Text style={[styles.tilePct, font('700')]}>{item.pct}%</Text>
                      </Animated.View>
                    );
                  })}
                </View>
              )}

              {/* Legend Key */}
              <View style={styles.legendKey}>
                <View style={styles.keyItem}>
                  <View style={[styles.keyDot, { backgroundColor: FIXED_PALETTE.mint }]} />
                  <Text style={[styles.keyText, font('500'), { color: palette.muted }]}>
                    95% or more
                  </Text>
                </View>
                <View style={styles.keyItem}>
                  <View style={[styles.keyDot, { backgroundColor: FIXED_PALETTE.sky }]} />
                  <Text style={[styles.keyText, font('500'), { color: palette.muted }]}>
                    90 to 94%
                  </Text>
                </View>
                <View style={styles.keyItem}>
                  <View style={[styles.keyDot, { backgroundColor: FIXED_PALETTE.sun }]} />
                  <Text style={[styles.keyText, font('500'), { color: palette.muted }]}>
                    87 to 89%
                  </Text>
                </View>
                <View style={styles.keyItem}>
                  <View style={[styles.keyDot, { backgroundColor: FIXED_PALETTE.coral }]} />
                  <Text style={[styles.keyText, font('500'), { color: palette.muted }]}>
                    Below 87%
                  </Text>
                </View>
              </View>
            </View>

            {/* Side Column: Fees Card & Staff Card */}
            <View
              style={[
                styles.sideColumn,
                { flex: isDesktop ? 4 : undefined, width: isDesktop ? undefined : '100%' },
                isMid && { flexDirection: 'row', gap: 18 },
              ]}
            >
              {/* Fees Card (Solid Sun Yellow) */}
              <View
                style={[
                  styles.card,
                  styles.solidCard,
                  { backgroundColor: FIXED_PALETTE.sun },
                  isMid && { flex: 1 },
                ]}
              >
                <Text style={[styles.cardTitle, font('700'), { color: FIXED_PALETTE.ink }]}>
                  {`Fees collected in ${currentMonthName}`}
                </Text>
                <Text
                  style={[
                    styles.bigNumber,
                    font('800'),
                    { color: FIXED_PALETTE.ink },
                    isMobile && { fontSize: 48 },
                  ]}
                >
                  {collectedStr}
                </Text>
                <View style={styles.track}>
                  <View style={[styles.trackFill, { width: `${receivedPct}%` }]} />
                </View>
                <View style={styles.twoColRow}>
                  <Text style={[styles.twoColText, font('600'), { color: FIXED_PALETTE.ink }]}>
                    {`${receivedPct}% received`}
                  </Text>
                  <Text style={[styles.twoColText, font('600'), { color: FIXED_PALETTE.ink }]}>
                    {`${dueStr} still due`}
                  </Text>
                </View>
              </View>

              {/* Staff In Card (Solid Mint Green) */}
              <View
                style={[
                  styles.card,
                  styles.solidCard,
                  { backgroundColor: FIXED_PALETTE.mint },
                  isMid && { flex: 1 },
                ]}
              >
                <Text style={[styles.cardTitle, font('700'), { color: FIXED_PALETTE.ink }]}>
                  {`${presentStaffCount} of ${totalStaffCount} staff are in`}
                </Text>
                <View style={styles.avatarStack}>
                  {staffInitialsList.map((initials, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.stackAvatar,
                        { marginLeft: idx === 0 ? 0 : -9, borderColor: FIXED_PALETTE.mint },
                      ]}
                    >
                      <Text style={[styles.stackAvatarText, font('700')]}>{initials}</Text>
                    </View>
                  ))}
                  {remainingStaffCount > 0 ? (
                    <View
                      style={[
                        styles.stackAvatar,
                        { marginLeft: -9, borderColor: FIXED_PALETTE.mint },
                      ]}
                    >
                      <Text style={[styles.stackAvatarText, font('700')]}>
                        {`+${remainingStaffCount}`}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.cardHint, font('500'), { color: 'rgba(17,25,54,0.72)', margin: 0 }]}>
                  {`${notInStaffCount} staff not in today.`}
                </Text>
              </View>
            </View>
          </View>

          {/* Bottom Row: Today's School Day, Notices, Do Something */}
          <View
            style={[
              styles.bottomRow,
              isDesktop && { flexDirection: 'row' },
              isMid && { flexDirection: 'row', flexWrap: 'wrap' },
              isMobile && { flexDirection: 'column' },
            ]}
          >
            {/* Card 1: Today's school day */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: palette.panel,
                  borderColor: palette.line,
                  flex: isDesktop ? 1 : undefined,
                  width: isMid ? '48.5%' : isMobile ? '100%' : undefined,
                },
              ]}
            >
              <Text style={[styles.cardTitle, font('700'), { color: palette.text }]}>
                Today's school day
              </Text>
              <Text style={[styles.cardHint, font('500'), { color: palette.muted }]}>
                Bell schedule with real class sessions.
              </Text>

              {todaySchedule.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, font('500'), { color: palette.muted }]}>
                    No schedule set yet
                  </Text>
                </View>
              ) : (
                <View style={styles.timeline}>
                  {todaySchedule.map((item, idx) => {
                    const isLast = idx === todaySchedule.length - 1;
                    return (
                      <View key={item.id || idx} style={[styles.tlItem, isLast && { paddingBottom: 0 }]}>
                        {/* Dot indicator */}
                        {item.status === 'done' ? (
                          <View
                            style={[
                              styles.tlDot,
                              { backgroundColor: FIXED_PALETTE.mint, borderColor: FIXED_PALETTE.mint },
                            ]}
                          />
                        ) : item.status === 'now' ? (
                          <View style={styles.nowDotWrapper}>
                            <View style={styles.nowDotHalo} />
                            <View
                              style={[
                                styles.tlDot,
                                { backgroundColor: FIXED_PALETTE.coral, borderColor: FIXED_PALETTE.coral },
                              ]}
                            />
                          </View>
                        ) : (
                          <View
                            style={[
                              styles.tlDot,
                              { backgroundColor: palette.panel, borderColor: palette.line },
                            ]}
                          />
                        )}

                        <Text style={[styles.tlTitle, font('700'), { color: palette.text }]}>
                          {item.title}
                        </Text>
                        <Text style={[styles.tlTime, font('500'), { color: palette.muted }]}>
                          {item.time}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Card 2: Notices (Solid Sky Blue) */}
            <View
              style={[
                styles.card,
                styles.solidCard,
                {
                  backgroundColor: FIXED_PALETTE.sky,
                  flex: isDesktop ? 1 : undefined,
                  width: isMid ? '48.5%' : isMobile ? '100%' : undefined,
                },
              ]}
            >
              <Text style={[styles.cardTitle, font('700'), { color: FIXED_PALETTE.ink }]}>
                Notices
              </Text>
              <Text style={[styles.cardHint, font('500'), { color: 'rgba(17,25,54,0.72)' }]}>
                What students and staff can see now.
              </Text>

              {realNotices.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, font('500'), { color: 'rgba(17,25,54,0.72)' }]}>
                    No notices yet
                  </Text>
                </View>
              ) : (
                <View style={styles.noticeList}>
                  {realNotices.map((n) => (
                    <View key={n.id} style={styles.noticeItem}>
                      <Text style={[styles.noticeTitle, font('700'), { color: FIXED_PALETTE.ink }]}>
                        {n.title}
                      </Text>
                      <Text style={[styles.noticeAudience, font('500'), { color: 'rgba(17,25,54,0.75)' }]}>
                        {n.audience}
                      </Text>
                      <View style={styles.pillBadge}>
                        <Text style={[styles.pillText, font('600')]}>{n.pill}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Card 3: Do Something */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: palette.panel,
                  borderColor: palette.line,
                  flex: isDesktop ? 1 : undefined,
                  width: isMid ? '100%' : isMobile ? '100%' : undefined,
                },
              ]}
            >
              <Text style={[styles.cardTitle, font('700'), { color: palette.text }]}>
                Do something
              </Text>
              <Text style={[styles.cardHint, font('500'), { color: palette.muted }]}>
                Jump straight to a task.
              </Text>

              <View style={styles.actionsGrid}>
                {QUICK_ACTIONS.map((action) => (
                  <Pressable
                    key={action.path}
                    accessibilityRole="link"
                    onPress={() => openRoute(action.path)}
                    style={({ pressed }) => [
                      styles.actionCard,
                      { backgroundColor: action.color },
                      pressed && { transform: [{ translateY: -3 }] },
                    ]}
                  >
                    <Svg
                      width={26}
                      height={26}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={FIXED_PALETTE.ink}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <Path d={(SVG_ICONS as any)[action.icon]} />
                    </Svg>
                    <Text style={[styles.actionLabel, font('700'), { color: FIXED_PALETTE.ink }]}>
                      {action.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  shell: {
    maxWidth: 1440,
    width: '100%',
    alignSelf: 'center',
    padding: 20,
    gap: 18,
  },

  // ── Banner ──────────────────────────────────────────────────
  banner: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 250,
    padding: 36,
    borderRadius: 34,
    backgroundColor: FIXED_PALETTE.ink,
    justifyContent: 'center',
  },
  artContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '58%',
    overflow: 'hidden',
  },
  bannerText: {
    position: 'relative',
    zIndex: 2,
    maxWidth: '46%',
  },
  schoolName: {
    color: '#ffffff',
    fontSize: 46,
    lineHeight: 48,
    letterSpacing: -0.8,
    marginBottom: 18,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 99,
  },
  chipText: {
    color: FIXED_PALETTE.ink,
    fontSize: 13,
  },

  // ── Header ──────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: 16,
    marginVertical: 6,
  },
  greeting: {
    fontSize: 38,
    lineHeight: 42,
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  headerSub: {
    fontSize: 15,
  },
  headerTools: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBtn: {
    backgroundColor: FIXED_PALETTE.coral,
    borderWidth: 0,
  },
  avatarText: {
    fontSize: 16,
    color: FIXED_PALETTE.ink,
  },

  // ── Bento Layout ────────────────────────────────────────────
  bento: {
    gap: 18,
  },
  topRow: {
    gap: 18,
  },
  bottomRow: {
    gap: 18,
  },
  sideColumn: {
    gap: 18,
  },

  // ── Card Styles ─────────────────────────────────────────────
  card: {
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
  },
  boardCard: {
    borderRadius: 34,
    padding: 28,
  },
  solidCard: {
    borderWidth: 0,
  },
  cardTitle: {
    fontSize: 19,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  cardHint: {
    fontSize: 14,
    marginBottom: 18,
  },

  // ── Tiles (Attendance) ──────────────────────────────────────
  tilesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    width: 92,
    aspectRatio: 1 / 1.02,
    borderRadius: 18,
    padding: 12,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  tileNumber: {
    fontSize: 32,
    lineHeight: 34,
    letterSpacing: -1,
    color: FIXED_PALETTE.ink,
  },
  tileTextSmall: {
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  tilePct: {
    fontSize: 14,
    lineHeight: 18,
    color: FIXED_PALETTE.ink,
  },
  legendKey: {
    flexDirection: 'row',
    gap: 18,
    flexWrap: 'wrap',
    marginTop: 20,
  },
  keyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  keyDot: {
    width: 12,
    height: 12,
    borderRadius: 4,
  },
  keyText: {
    fontSize: 14,
  },

  // ── Side Solid Cards ────────────────────────────────────────
  bigNumber: {
    fontSize: 58,
    lineHeight: 60,
    letterSpacing: -1.5,
    marginVertical: 12,
  },
  track: {
    height: 12,
    borderRadius: 99,
    backgroundColor: 'rgba(17,25,54,0.16)',
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    backgroundColor: FIXED_PALETTE.ink,
    borderRadius: 99,
  },
  twoColRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  twoColText: {
    fontSize: 14,
  },
  avatarStack: {
    flexDirection: 'row',
    marginVertical: 14,
  },
  stackAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: FIXED_PALETTE.ink,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackAvatarText: {
    fontSize: 12,
    color: '#ffffff',
  },

  // ── Timeline ────────────────────────────────────────────────
  timeline: {
    paddingLeft: 18,
    borderLeftWidth: 2,
    borderLeftColor: THEME_COLORS.light.line,
    marginTop: 6,
  },
  tlItem: {
    position: 'relative',
    paddingLeft: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tlDot: {
    position: 'absolute',
    left: -25,
    top: 5,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  nowDotWrapper: {
    position: 'absolute',
    left: -25,
    top: 5,
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nowDotHalo: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,107,87,0.28)',
  },
  tlTitle: {
    fontSize: 14,
  },
  tlTime: {
    fontSize: 13,
  },

  // ── Notices List ────────────────────────────────────────────
  noticeList: {
    gap: 12,
  },
  noticeItem: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  noticeTitle: {
    fontSize: 15,
  },
  noticeAudience: {
    fontSize: 13,
    marginTop: 2,
  },
  pillBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 2,
    paddingHorizontal: 11,
    borderRadius: 99,
    backgroundColor: FIXED_PALETTE.ink,
  },
  pillText: {
    color: '#ffffff',
    fontSize: 12,
  },

  // ── Quick Actions ───────────────────────────────────────────
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '48%',
    borderRadius: 22,
    padding: 16,
    minHeight: 104,
    justifyContent: 'space-between',
  },
  actionLabel: {
    fontSize: 14,
    marginTop: 14,
  },

  // ── Empty state ─────────────────────────────────────────────
  emptyContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
});
