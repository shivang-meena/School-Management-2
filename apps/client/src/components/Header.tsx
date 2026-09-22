import React from 'react';
import { Image, View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../theme';

export const Header: React.FC<{ title?: string }> = ({ title }) => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  return <View style={s.header}>
    <View style={s.brand}><Image source={require('../../assets/icon.png')} style={s.brandLogo} resizeMode="contain" /><View style={{ flexShrink: 1 }}><Text style={s.name}>SHIVORA TECHNOLOGIES</Text><Text style={s.caption}>{title || 'TECHNOLOGY FOR BETTER WORKFLOWS'}</Text></View></View>
    <View style={s.actions}>{user && width > 600 ? <Text style={s.user}>{user.name || user.loginId}</Text> : null}<TouchableOpacity accessibilityRole="button" style={s.button} onPress={() => { if (user) logout(); router.replace('/(auth)/login'); }}><Text style={s.buttonText}>{user ? 'Sign out' : 'Sign in  →'}</Text></TouchableOpacity></View>
  </View>;
};
const s = StyleSheet.create({
  header: { backgroundColor: '#fff', paddingHorizontal: 24, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', borderBottomWidth: 1, borderBottomColor: colors.border },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 }, brandLogo: { width: 90, height: 52, borderRadius: 10, backgroundColor: '#fff' }, name: { color: colors.ink, fontSize: 16, fontWeight: '700' }, caption: { color: colors.muted, fontSize: 8, letterSpacing: 1.3, marginTop: 5 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 18 }, user: { color: colors.muted, fontSize: 12 }, button: { backgroundColor: colors.paleBlue, minHeight: 42, paddingHorizontal: 18, borderRadius: 9, justifyContent: 'center' }, buttonText: { color: colors.blue, fontSize: 12, fontWeight: '700' },
});
