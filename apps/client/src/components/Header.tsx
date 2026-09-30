import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { colors, radius, shadow } from '../theme';

export const Header: React.FC<{ title?: string }> = ({ title }) => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();

  return (
    <View style={s.header}>
      {/* Brand */}
      <TouchableOpacity style={s.brand} onPress={() => router.push('/')} activeOpacity={0.8}>
        <View style={s.logoBadge}>
          <Ionicons name="school" size={20} color="#ffffff" />
        </View>
        <View style={{ flexShrink: 1 }}>
          <Text style={s.brandName}>Arihant Public School</Text>
          <Text style={s.brandCaption}>{title || 'INTEGRATED ERP SYSTEM'}</Text>
        </View>
      </TouchableOpacity>

      {/* Actions */}
      <View style={s.actions}>
        {user && width > 600 ? (
          <View style={s.userPill}>
            <View style={s.onlineDot} />
            <Text style={s.userText}>{user.name || user.loginId}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          accessibilityRole="button"
          style={s.signBtn}
          onPress={() => {
            if (user) logout();
            router.replace('/(auth)/login');
          }}
          activeOpacity={0.75}
        >
          <Ionicons
            name={user ? 'log-out-outline' : 'log-in-outline'}
            size={16}
            color={colors.blueLight}
            style={{ marginRight: 6 }}
          />
          <Text style={s.signBtnText}>{user ? 'Sign out' : 'Sign in'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  header: {
    backgroundColor: 'rgba(8,12,20,0.95)',
    paddingHorizontal: 24,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    ...shadow.sm,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
  },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
  },
  brandName: {
    color: '#f0f6ff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  brandCaption: {
    color: colors.blueLight,
    fontSize: 9,
    letterSpacing: 1.6,
    fontWeight: '700',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.paleBlue,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.glowBorderSm,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  userText: {
    color: colors.blueLight,
    fontSize: 12,
    fontWeight: '700',
  },
  signBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  signBtnText: {
    color: colors.blueLight,
    fontSize: 13,
    fontWeight: '700',
  },
});
