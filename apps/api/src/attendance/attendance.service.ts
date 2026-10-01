import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}
  private readonly entryStatuses = ['PRESENT', 'ABSENT', 'LATE'];
  private today() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
  private date(value: string) { if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException('Use YYYY-MM-DD date'); return new Date(`${value}T00:00:00.000Z`); }

  async studentRoster(sectionId: string, dateValue: string, actor: any) {
    const date = this.date(dateValue);
    if (actor.role === Role.EMPLOYEE) {
      const employee = await this.prisma.employee.findUnique({ where: { id: actor.employeeDbId }, select: { canMarkStudentAttendance: true } });
      if (!employee?.canMarkStudentAttendance) {
        const isClassTeacher = await this.prisma.classTeacherAssignment.findFirst({
          where: {
            employeeId: actor.employeeDbId,
            sectionId,
            effectiveFrom: { lte: date },
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
          },
        });
        if (!isClassTeacher) throw new ForbiddenException('Student attendance permission is off. You can only view attendance for your assigned class.');
      }
    }
    const section = await this.prisma.section.findUnique({ where: { id: sectionId }, include: { schoolClass: true } });
    if (!section) throw new BadRequestException('Selected section not found');
    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: { sectionId, effectiveFrom: { lte: date }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }] },
      include: { student: { select: { id: true, studentId: true, name: true, status: true } } },
      orderBy: [{ rollNumber: 'asc' }, { student: { name: 'asc' } }],
    });
    const attendance = await this.prisma.studentAttendance.findMany({ where: { date, studentId: { in: enrollments.map((item) => item.studentId) } }, select: { studentId: true, status: true } });
    const byStudent = new Map(attendance.map((item) => [item.studentId, item.status]));
    return { section: { id: section.id, name: section.name, className: section.schoolClass.name }, date: dateValue, students: enrollments.filter((item) => item.student.status === 'ACTIVE').map((item) => ({ id: item.student.id, studentId: item.student.studentId, name: item.student.name, rollNumber: item.rollNumber, status: byStudent.get(item.studentId) || 'NONE' })) };
  }

  async employeeRoster(dateValue: string, actor: any) {
    const date = this.date(dateValue);
    if (actor.role === Role.EMPLOYEE) {
      const employee = await this.prisma.employee.findUnique({ where: { id: actor.employeeDbId }, select: { canMarkEmployeeAttendance: true } });
      if (!employee?.canMarkEmployeeAttendance) throw new ForbiddenException('Employee attendance permission is off');
    }
    const employees = await this.prisma.employee.findMany({ where: { status: 'ACTIVE', joiningDate: { lte: date }, OR: [{ leavingDate: null }, { leavingDate: { gte: date } }] }, select: { id: true, employeeId: true, name: true, designation: true }, orderBy: { employeeId: 'asc' } });
    const attendance = await this.prisma.employeeAttendance.findMany({ where: { date, employeeId: { in: employees.map((item) => item.id) } }, select: { employeeId: true, status: true } });
    const byEmployee = new Map(attendance.map((item) => [item.employeeId, item.status]));
    return { date: dateValue, employees: employees.map((item) => ({ ...item, status: byEmployee.get(item.id) || 'NONE' })) };
  }

  async markStudents(dto: any, actor: any) {
    const date = this.date(dto.date); if (dto.date > this.today()) throw new BadRequestException('Future attendance is not allowed'); const current = dto.date === this.today();
    if (actor.role === Role.EMPLOYEE) {
      if (!current) throw new ForbiddenException('Employees cannot correct past attendance');
      const employee = await this.prisma.employee.findUnique({ where: { id: actor.employeeDbId }, select: { canMarkStudentAttendance: true } });
      if (!employee?.canMarkStudentAttendance) {
        const isClassTeacher = await this.prisma.classTeacherAssignment.findFirst({
          where: {
            employeeId: actor.employeeDbId,
            sectionId: dto.sectionId,
            effectiveFrom: { lte: date },
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
          },
        });
        if (!isClassTeacher) throw new ForbiddenException('Student attendance permission is off. You can only mark attendance for your assigned class.');
      }
    }
    const closedDay = await this.prisma.schoolCalendar.findFirst({ where: { date, dayType: { in: ['HOLIDAY', 'WEEKLY_OFF'] } } });
    if (closedDay) throw new BadRequestException(`${closedDay.dayType}: attendance is disabled`);
    return this.prisma.$transaction(async (tx) => {
      const output = [];
      for (const row of dto.records) {
        if (!this.entryStatuses.includes(row.status)) continue;
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
    const employeePermission = actor.role === Role.EMPLOYEE ? await this.prisma.employee.findUnique({ where: { id: actor.employeeDbId }, select: { canMarkEmployeeAttendance: true } }) : null;
    if (actor.role === Role.EMPLOYEE && !employeePermission?.canMarkEmployeeAttendance) throw new ForbiddenException('Employee attendance permission is off');
    return this.prisma.$transaction(async (tx) => {
      const output = [];
      for (const row of dto.records) {
        if (actor.employeeDbId === row.id) throw new ForbiddenException('You cannot mark your own attendance');
        if (!this.entryStatuses.includes(row.status)) continue;
        const employee = await tx.employee.findUnique({ where: { id: row.id } }); if (!employee || employee.joiningDate > date || (employee.leavingDate && employee.leavingDate < date)) throw new BadRequestException('Employee is not active on this date');
        const existing = await tx.employeeAttendance.findUnique({ where: { employeeId_date: { employeeId: row.id, date } } });
        const record = await tx.employeeAttendance.upsert({ where: { employeeId_date: { employeeId: row.id, date } }, update: { status: row.status, remarks: row.remarks || null }, create: { employeeId: row.id, date, status: row.status, remarks: row.remarks || null } });
        await tx.attendanceChange.create({ data: { employeeAttendanceId: record.id, actorId: actor.id, previousStatus: existing?.status, newStatus: row.status, reason: dto.date !== this.today() ? dto.reason : undefined } }); output.push(record);
      }
      return output;
    });
  }

  async studentHistory(studentId: string, actor: any) {
    if (actor.role === Role.STUDENT && actor.studentId !== studentId) throw new ForbiddenException('Own attendance only');
    const student = await this.prisma.student.findUnique({ where: { studentId }, include: { enrollments: { where: { status: 'CURRENT' }, include: { academicYear: true, section: { include: { schoolClass: true } } }, orderBy: { effectiveFrom: 'desc' }, take: 1 } } });
    if (!student) return null;
    const enrollment = student.enrollments[0];
    const academicYear = enrollment?.academicYear || null;
    const records = await this.prisma.studentAttendance.findMany({ where: { studentId: student.id, date: academicYear ? { gte: academicYear.startDate, lte: academicYear.endDate } : undefined }, orderBy: { date: 'asc' } });
    const present = records.filter((r) => r.status === 'PRESENT').length;
    const late = records.filter((r) => r.status === 'LATE').length;
    const absent = records.filter((r) => r.status === 'ABSENT').length;
    const halfDay = records.filter((r) => r.status === 'HALF_DAY').length;
    const leave = records.filter((r) => r.status === 'LEAVE').length;
    const marked = records.length;
    const attendedUnits = present + late + halfDay * 0.5;
    return { student: { studentId: student.studentId, name: student.name, rollNumber: enrollment?.rollNumber }, rollNumber: enrollment?.rollNumber, academicYear, section: enrollment?.section ? { name: enrollment.section.name, className: enrollment.section.schoolClass.name } : null, summary: { marked, present, late, absent, halfDay, leave, attendedUnits, percentage: marked ? Math.round(attendedUnits / marked * 10000) / 100 : null }, marked, attended: attendedUnits, absent, late, halfDay, leave, percentage: marked ? Math.round(attendedUnits / marked * 10000) / 100 : null, records };
  }
  async employeeHistory(employeeId: string, actor: any) {
    if (actor.role === Role.EMPLOYEE && actor.employeeId !== employeeId) throw new ForbiddenException('Own attendance only');
    const [employee, academicYear] = await Promise.all([
      this.prisma.employee.findUnique({ where: { employeeId }, select: { id: true, employeeId: true, name: true, designation: true } }),
      this.prisma.academicYear.findFirst({ where: { isCurrent: true } }),
    ]);
    if (!employee) return null;
    const records = await this.prisma.employeeAttendance.findMany({ where: { employeeId: employee.id, date: academicYear ? { gte: academicYear.startDate, lte: academicYear.endDate } : undefined }, orderBy: { date: 'asc' } });
    const present = records.filter((r) => r.status === 'PRESENT').length;
    const late = records.filter((r) => r.status === 'LATE').length;
    const absent = records.filter((r) => r.status === 'ABSENT').length;
    const halfDay = records.filter((r) => r.status === 'HALF_DAY').length;
    const leave = records.filter((r) => ['PAID_LEAVE', 'UNPAID_LEAVE'].includes(r.status)).length;
    const marked = records.length;
    const attendedUnits = present + late + halfDay * 0.5;
    return { employee, academicYear, summary: { marked, present, late, absent, halfDay, leave, attendedUnits, percentage: marked ? Math.round(attendedUnits / marked * 10000) / 100 : null }, marked, attended: attendedUnits, absent, late, halfDay, leave, percentage: marked ? Math.round(attendedUnits / marked * 10000) / 100 : null, records };
  }
}
