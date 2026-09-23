import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdminNav, getPortalLinks, PortalRole } from './AdminNav';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../theme';

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

  return <SafeAreaView edges={['top', 'bottom']} style={s.safe}>
    <View style={s.layout}>
      {desktop ? <View style={s.sidebar}><AdminNav role={role}/></View> : null}
      <View style={s.main}>
        <View style={[s.header, !desktop && s.mobileHeader]}>
          {!desktop ? <Pressable accessibilityRole="button" accessibilityLabel="Open navigation" accessibilityState={{ expanded: menuOpen }} style={s.menuButton} onPress={() => setMenuOpen(true)}><Text style={s.menuIcon}>☰</Text></Pressable> : null}
          <View style={s.heading}><Text style={s.breadcrumb}>SHIVORA TECHNOLOGIES</Text><Text numberOfLines={1} style={s.title}>{title}</Text></View>
          {width >= 720 ? <Text style={s.date}>{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</Text> : null}
          <Pressable accessibilityRole="link" accessibilityLabel="Open notice board" onPress={() => router.navigate(`/${role}/notices` as any)} style={s.noticeButton}><Text style={s.noticeIcon}>◇</Text>{width >= 600 ? <Text style={s.noticeText}>Notices</Text> : null}</Pressable>
          <View accessibilityLabel={`${name}, ${role === 'admin' ? 'Administrator' : role}`} style={s.avatar}><Text style={s.initial}>{name.charAt(0).toUpperCase()}</Text></View>
        </View>
        <View style={s.workspace}><Slot/></View>
      </View>
    </View>
    <Modal visible={!desktop && menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
      <View style={s.overlay}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close navigation" style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)}/>
        <SafeAreaView style={[s.drawer, { width: Math.min(280, width - 40) }]}><AdminNav role={role} onNavigate={() => setMenuOpen(false)} onClose={() => setMenuOpen(false)}/></SafeAreaView>
      </View>
    </Modal>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy }, layout: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 248 }, main: { flex: 1, minWidth: 0, backgroundColor: colors.background },
  workspace: { flex: 1, minHeight: 0 }, header: { minHeight: 84, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 28, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 18 },
  mobileHeader: { paddingHorizontal: 16, gap: 12, minHeight: 72 }, heading: { flex: 1, minWidth: 0 }, breadcrumb: { color: colors.muted, fontSize: 9, fontWeight: '700', letterSpacing: 1.5 }, title: { color: colors.ink, fontSize: 18, fontWeight: '700', marginTop: 5 },
  date: { color: colors.muted, fontSize: 12 }, noticeButton: { flexDirection: 'row', gap: 6, alignItems: 'center', minHeight: 42, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border }, noticeIcon: { fontSize: 22, color: colors.blue }, noticeText: { color: colors.ink, fontSize: 12, fontWeight: '600' },
  avatar: { width: 39, height: 39, borderRadius: 13, backgroundColor: colors.paleBlue, alignItems: 'center', justifyContent: 'center' }, initial: { color: colors.blue, fontSize: 15, fontWeight: '700' },
  menuButton: { width: 40, height: 42, borderRadius: 10, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }, menuIcon: { fontSize: 20, color: colors.ink }, overlay: { flex: 1, backgroundColor: 'rgba(12, 24, 44, 0.48)' }, drawer: { height: '100%', backgroundColor: colors.navy },
});
