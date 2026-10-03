import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AdminNav, getPortalLinks, PortalRole } from './AdminNav';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { colors, radius, shadow } from '../theme';

export function PortalLayout({ role }: { role: PortalRole }) {
  const { width } = useWindowDimensions();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const { isDark, toggleTheme, colors: themeColors } = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const desktop = width >= 1000;
  const page = segments[segments.length - 1];
  const title = getPortalLinks(role, user).find(link => link.href.endsWith(`/${page}`))?.label || 'Workspace';
  const name = user?.name || user?.loginId || 'School member';

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[s.safe, { backgroundColor: themeColors.canvas }]}>
      <View style={s.layout}>
        {desktop ? (
          <View style={[s.sidebar, { borderRightColor: themeColors.line }]}>
            <AdminNav role={role} />
          </View>
        ) : null}

        <View style={[s.main, { backgroundColor: themeColors.canvas }]}>
          {/* Top Header Bar */}
          <View
            style={[
              s.header,
              !desktop && s.mobileHeader,
              {
                backgroundColor: themeColors.header,
                borderBottomColor: themeColors.headerBorder,
              },
            ]}
          >
            {!desktop ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open navigation"
                accessibilityState={{ expanded: menuOpen }}
                style={[
                  s.menuButton,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(17,25,54,0.06)',
                    borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(17,25,54,0.10)',
                  },
                ]}
                onPress={() => setMenuOpen(true)}
              >
                <Ionicons name="menu-outline" size={22} color={themeColors.text} />
              </Pressable>
            ) : null}

            <View style={s.heading}>
              <Text style={[s.breadcrumb, { color: themeColors.sky }]}>ARIHANT PUBLIC SCHOOL</Text>
              <Text numberOfLines={1} style={[s.title, { color: themeColors.text }]}>{title}</Text>
            </View>

            {width >= 720 ? (
              <Text style={[s.date, { color: themeColors.muted }]}>
                {new Date().toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            ) : null}

            {/* Global Theme Toggle Button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              onPress={toggleTheme}
              style={[
                s.themeButton,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(17,25,54,0.06)',
                  borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(17,25,54,0.12)',
                },
              ]}
            >
              <Ionicons
                name={isDark ? 'sunny-outline' : 'moon-outline'}
                size={18}
                color={isDark ? '#FFC93C' : themeColors.text}
              />
            </Pressable>

            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Open notice board"
              onPress={() => router.navigate(`/${role}/notices` as any)}
              style={[
                s.noticeButton,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(17,25,54,0.05)',
                  borderColor: isDark ? 'rgba(255,255,255,0.10)' : themeColors.line,
                },
              ]}
            >
              <Ionicons name="notifications-outline" size={18} color={themeColors.sky} />
              {width >= 600 ? <Text style={[s.noticeText, { color: themeColors.text }]}>Notices</Text> : null}
            </Pressable>

            <View
              accessibilityLabel={`${name}, ${role === 'admin' ? 'Administrator' : role}`}
              style={s.avatar}
            >
              <Text style={s.initial}>{name.charAt(0).toUpperCase()}</Text>
            </View>
          </View>

          <View style={[s.workspace, { backgroundColor: themeColors.canvas }]}>
            <Slot />
          </View>
        </View>
      </View>

      {/* Mobile Drawer */}
      <Modal
        visible={!desktop && menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <View style={s.overlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close navigation"
            style={StyleSheet.absoluteFill}
            onPress={() => setMenuOpen(false)}
          />
          <SafeAreaView
            style={[
              s.drawer,
              {
                width: Math.min(280, width - 40),
                backgroundColor: themeColors.sidebar,
                borderRightColor: themeColors.line,
              },
            ]}
          >
            <AdminNav
              role={role}
              onNavigate={() => setMenuOpen(false)}
              onClose={() => setMenuOpen(false)}
            />
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
  },
  layout: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 256,
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  workspace: {
    flex: 1,
    minHeight: 0,
  },

  // ── Top Header ──────────────────────────────────────────────
  header: {
    minHeight: 72,
    borderBottomWidth: 1,
    paddingHorizontal: 28,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    ...shadow.sm,
  },
  mobileHeader: {
    paddingHorizontal: 16,
    gap: 12,
    minHeight: 64,
  },
  heading: {
    flex: 1,
    minWidth: 0,
  },
  breadcrumb: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: -0.2,
  },
  date: {
    fontSize: 12,
    fontWeight: '500',
  },

  // ── Theme Button ────────────────────────────────────────────
  themeButton: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Notice Button ───────────────────────────────────────────
  noticeButton: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  noticeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ── User Avatar ─────────────────────────────────────────────
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.paleBlue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.glowBorderSm,
  },
  initial: {
    color: colors.blueLight,
    fontSize: 15,
    fontWeight: '800',
  },

  // ── Mobile Menu ─────────────────────────────────────────────
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Overlay / Drawer ────────────────────────────────────────
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(4,8,18,0.70)',
  },
  drawer: {
    height: '100%',
    backgroundColor: 'rgba(8,12,20,0.98)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.08)',
  },
});
