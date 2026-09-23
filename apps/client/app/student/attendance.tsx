import React from 'react';
import { useAuth } from '../../src/hooks/useAuth';
import { StudentAttendanceScreen } from '../../src/components/StudentAttendanceScreen';

export default function Screen() {
  const { user } = useAuth();
  return <StudentAttendanceScreen studentId={user?.studentId} />;
}
