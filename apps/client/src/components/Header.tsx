import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';

export const Header: React.FC<{ title?: string }> = ({ title }) => {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.header}>
      <View style={styles.left}>
        <Text style={styles.logoIcon}>🎓</Text>
        <View>
          <Text style={styles.brandTitle}>Arihant Public School</Text>
          {title ? <Text style={styles.subTitle}>{title}</Text> : null}
        </View>
      </View>

      <View style={styles.right}>
        {user ? (
          <View style={styles.userContainer}>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user.name || user.loginId}</Text>
              <Text style={[styles.roleBadge, user.role === 'ADMIN' ? styles.adminBadge : styles.otherBadge]}>
                {user.role}
              </Text>
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.loginBtnText}>Sign In</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#071A2F',
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#12385A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoIcon: {
    fontSize: 28,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  subTitle: {
    fontSize: 12,
    color: '#9FC7DA',
    fontWeight: '500',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  userInfo: {
    alignItems: 'flex-end',
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  roleBadge: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  adminBadge: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
  },
  otherBadge: {
    backgroundColor: '#e0e7ff',
    color: '#3730a3',
  },
  logoutBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  logoutText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  loginBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  loginBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
});
