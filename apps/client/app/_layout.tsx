import React from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/hooks/useAuth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#F4F1EA' },
            }}
          >
            <Stack.Screen name="index" options={{ title: 'Arihant Public School ERP' }} />
            <Stack.Screen name="(auth)/login" options={{ title: 'Login' }} />
            <Stack.Screen name="(admin)/dashboard" options={{ title: 'Admin Dashboard' }} />
            <Stack.Screen name="(admin)/students" options={{ title: 'Students' }} />
            <Stack.Screen name="(admin)/staff" options={{ title: 'Employees' }} />
            <Stack.Screen name="(admin)/attendance" options={{ title: 'Attendance' }} />
            <Stack.Screen name="(admin)/fees" options={{ title: 'Fee Management' }} />
            <Stack.Screen name="(admin)/exams" options={{ title: 'Exams' }} />
            <Stack.Screen name="(admin)/notices" options={{ title: 'Notice Board' }} />
            <Stack.Screen name="(admin)/accounts" options={{ title: 'Accounts' }} />
            <Stack.Screen name="(admin)/academics" options={{ title: 'Academic Structure' }} />
            <Stack.Screen name="(admin)/salary" options={{ title: 'Salary' }} />
            <Stack.Screen name="(admin)/timetable" options={{ title: 'Timetable' }} />
            <Stack.Screen name="(student)/dashboard" options={{ title: 'Student Portal' }} />
            <Stack.Screen name="(student)/calendar" options={{ title: 'Academic Calendar' }} />
            <Stack.Screen name="(staff)/dashboard" options={{ title: 'Staff Portal' }} />
            <Stack.Screen name="(staff)/calendar" options={{ title: 'Academic Calendar' }} />
          </Stack>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
