import React from 'react';
import { useAuth } from '../../src/hooks/useAuth';
import { EmployeeAttendanceScreen } from '../../src/components/EmployeeAttendanceScreen';

export default function Screen() {
  const { user } = useAuth();
  return <EmployeeAttendanceScreen employeeId={user?.employeeId} />;
}
