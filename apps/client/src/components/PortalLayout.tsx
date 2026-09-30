import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AdminNav, getPortalLinks, PortalRole } from './AdminNav';
import { useAuth } from '../hooks/useAuth';
import { colors, radius, shadow } from '../theme';

export function PortalLayout({ role }: { role: PortalRole }) {
  const { width } = useWindowDimensions();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const desktop = width >= 1000;
  const page = segments[segments.length - 1];
  const title = getPortalLinks(role, user).find(link => link.href.endsWith(`/${page}`))?.label || 'Workspace';
  const name = user?.name || user?.loginId || 'School member';

  return (
    <SafeAreaView edges={['top', 'bottom']} style={s.safe}>
      <View style={s.layout}>
        {desktop ? (
          <View style={s.sidebar}>
            <AdminNav role={role} />
          </View>
        ) : null}

        <View style={s.main}>
          {/* Top Header Bar */}
          <View style={[s.header, !desktop && s.mobileHeader]}>
            {!desktop ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open navigation"
                accessibilityState={{ expanded: menuOpen }}
                style={s.menuButton}
                onPress={() => setMenuOpen(true)}
              >
                <Ionicons name="menu-outline" size={22} color={colors.ink} />
              </Pressable>
            ) : null}

            <View style={s.heading}>
              <Text style={s.breadcrumb}>ARIHANT PUBLIC SCHOOL</Text>
              <Text numberOfLines={1} style={s.title}>{title}</Text>
            </View>

            {width >= 720 ? (
              <Text style={s.date}>
                {new Date().toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Open notice board"
              onPress={() => router.navigate(`/${role}/notices` as any)}
              style={s.noticeButton}
            >
              <Ionicons name="notifications-outline" size={18} color={colors.blueLight} />
              {width >= 600 ? <Text style={s.noticeText}>Notices</Text> : null}
            </Pressable>

            <View
              accessibilityLabel={`${name}, ${role === 'admin' ? 'Administrator' : role}`}
              style={s.avatar}
            >
              <Text style={s.initial}>{name.charAt(0).toUpperCase()}</Text>
            </View>
          </View>

          <View style={s.workspace}>
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
          <SafeAreaView style={[s.drawer, { width: Math.min(280, width - 40) }]}>
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
    backgroundColor: colors.canvas,
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
    backgroundColor: colors.canvas,
  },
  workspace: {
    flex: 1,
    minHeight: 0,
  },

  // ── Top Header ──────────────────────────────────────────────
  header: {
    minHeight: 72,
    backgroundColor: 'rgba(8,12,20,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 28,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
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
    color: colors.blueLight,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  title: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: -0.2,
  },
  date: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '500',
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
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  noticeText: {
    color: colors.ink,
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
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
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
