import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { EmployeeAttendanceStatus, Role, StudentAttendanceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}
  private today() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
  private date(value: string) { if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException('Use YYYY-MM-DD date'); return new Date(`${value}T00:00:00.000Z`); }

  async markStudents(dto: any, actor: any) {
    const date = this.date(dto.date); if (dto.date > this.today()) throw new BadRequestException('Future attendance is not allowed'); const current = dto.date === this.today();
    if (actor.role === Role.EMPLOYEE) {
      if (!current) throw new ForbiddenException('Employees cannot correct past attendance');
      const employee = await this.prisma.employee.findUnique({ where: { id: actor.employeeDbId } });
      if (!employee?.canMarkStudentAttendance) throw new ForbiddenException('Student attendance permission is off');
      const assignment = await this.prisma.classTeacherAssignment.findFirst({ where: { employeeId: actor.employeeDbId, sectionId: dto.sectionId, effectiveFrom: { lte: date }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }] } });
      if (!assignment) throw new ForbiddenException('No active class-teacher assignment for this section');
    }
    const closedDay = await this.prisma.schoolCalendar.findFirst({ where: { date, dayType: { in: ['HOLIDAY', 'WEEKLY_OFF'] } } });
    if (closedDay) throw new BadRequestException(`${closedDay.dayType}: attendance is disabled`);
    return this.prisma.$transaction(async (tx) => {
      const output = [];
      for (const row of dto.records) {
        if (!Object.values(StudentAttendanceStatus).includes(row.status)) throw new BadRequestException('Invalid student attendance status');
        const enrollment = await tx.studentEnrollment.findFirst({ where: { studentId: row.id, sectionId: dto.sectionId, effectiveFrom: { lte: date }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }] } });
        if (!enrollment) throw new ForbiddenException('A submitted student is outside the selected enrollment scope');
        const existing = await tx.studentAttendance.findUnique({ where: { studentId_date: { studentId: row.id, date } } });
        const record = await tx.studentAttendance.upsert({ where: { studentId_date: { studentId: row.id, date } }, update: { status: row.status, remarks: row.remarks || null }, create: { studentId: row.id, enrollmentId: enrollment.id, date, status: row.status, remarks: row.remarks || null } });
        await tx.attendanceChange.create({ data: { studentAttendanceId: record.id, actorId: actor.id, previousStatus: existing?.status, newStatus: row.status, reason: !current ? dto.reason : undefined } }); output.push(record);
      }
      return output;
    });
  }

  async markEmployees(dto: any, actor: any) {
    const date = this.date(dto.date); if (dto.date > this.today()) throw new BadRequestException('Future attendance is not allowed'); if (actor.role === Role.EMPLOYEE && dto.date !== this.today()) throw new ForbiddenException('Employees cannot correct past attendance');
    const permission = actor.role === Role.EMPLOYEE ? await this.prisma.employeeAttendancePermission.findUnique({ where: { employeeId: actor.employeeDbId }, include: { targets: true } }) : null;
    if (actor.role === Role.EMPLOYEE && !permission?.active) throw new ForbiddenException('Employee attendance permission is off');
    return this.prisma.$transaction(async (tx) => {
      const output = [];
      for (const row of dto.records) {
        if (actor.employeeDbId === row.id) throw new ForbiddenException('You cannot mark your own attendance');
        if (actor.role === Role.EMPLOYEE && !permission!.allOtherEmployees && !permission!.targets.some((t) => t.employeeId === row.id)) throw new ForbiddenException('Employee is outside your attendance scope');
        if (!Object.values(EmployeeAttendanceStatus).includes(row.status)) throw new BadRequestException('Invalid employee attendance status');
        const employee = await tx.employee.findUnique({ where: { id: row.id } }); if (!employee || employee.joiningDate > date || (employee.leavingDate && employee.leavingDate < date)) throw new BadRequestException('Employee is not active on this date');
        const existing = await tx.employeeAttendance.findUnique({ where: { employeeId_date: { employeeId: row.id, date } } });
        const record = await tx.employeeAttendance.upsert({ where: { employeeId_date: { employeeId: row.id, date } }, update: { status: row.status, remarks: row.remarks || null }, create: { employeeId: row.id, date, status: row.status, remarks: row.remarks || null } });
        await tx.attendanceChange.create({ data: { employeeAttendanceId: record.id, actorId: actor.id, previousStatus: existing?.status, newStatus: row.status, reason: dto.date !== this.today() ? dto.reason : undefined } }); output.push(record);
      }
      return output;
    });
  }

  async studentHistory(studentId: string, actor: any) { if (actor.role === Role.STUDENT && actor.studentId !== studentId) throw new ForbiddenException('Own attendance only'); const student = await this.prisma.student.findUnique({ where: { studentId } }); if (!student) return null; const records = await this.prisma.studentAttendance.findMany({ where: { studentId: student.id }, orderBy: { date: 'desc' } }); const marked = records.length, attended = records.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length; return { marked, attended, absent: records.filter((r) => r.status === 'ABSENT').length, leave: records.filter((r) => r.status === 'LEAVE').length, percentage: marked ? Math.round(attended / marked * 10000) / 100 : null, records }; }
  employeeHistory(employeeId: string, actor: any) { if (actor.role === Role.EMPLOYEE && actor.employeeId !== employeeId) throw new ForbiddenException('Own attendance only'); return this.prisma.employeeAttendance.findMany({ where: { employee: { employeeId } }, orderBy: { date: 'desc' } }); }
}
