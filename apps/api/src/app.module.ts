import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { StudentsModule } from './students/students.module';
import { StaffModule } from './staff/staff.module';
import { AttendanceModule } from './attendance/attendance.module';
import { FeesModule } from './fees/fees.module';
import { ExamsModule } from './exams/exams.module';
import { NoticesModule } from './notices/notices.module';
import { AccountsModule } from './accounts/accounts.module';
import { AcademicsModule } from './academics/academics.module';
import { SalaryModule } from './salary/salary.module';
import { TimetableModule } from './timetable/timetable.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    StudentsModule,
    StaffModule,
    AttendanceModule,
    FeesModule,
    ExamsModule,
    NoticesModule,
    AccountsModule,
    AcademicsModule,
    SalaryModule,
    TimetableModule,
  ],
})
export class AppModule {}
