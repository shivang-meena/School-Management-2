import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { Role, TimetableEntryType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class TimetableService {
  constructor(private readonly prisma: PrismaService) {}
  private today() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
  async create(body: any) {
    const start = new Date(`1970-01-01T${body.startTime}:00Z`);
    const end = new Date(`1970-01-01T${body.endTime}:00Z`);
    if (end <= start) throw new BadRequestException('End time must be after start time');

    const from = new Date(body.effectiveFrom);
    const to = body.effectiveTo ? new Date(body.effectiveTo) : new Date('9999-12-31');
    if (to < from) throw new BadRequestException('Invalid effective date range');

    if (body.entryType === TimetableEntryType.LECTURE) {
      if (!body.employeeId || !body.subjectId) throw new BadRequestException('Lecture requires teacher and subject');

      const assignment = await this.prisma.teacherAssignment.findFirst({
        where: {
          employeeId: body.employeeId,
          academicYearId: body.academicYearId,
          sectionId: body.sectionId,
          subjectId: body.subjectId,
          effectiveFrom: { lte: to },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: from } }],
        },
      });
      if (!assignment) throw new ForbiddenException('Teacher is not assigned to this subject and section for the selected academic year');
    }

    const conflicts = await this.prisma.lectureTimetableEntry.count({ where: { academicYearId: body.academicYearId, dayOfWeek: Number(body.dayOfWeek), effectiveFrom: { lte: to }, AND: [{ OR: [{ effectiveTo: null }, { effectiveTo: { gte: from } }] }, { startTime: { lt: end } }, { endTime: { gt: start } }, { OR: [{ sectionId: body.sectionId }, ...(body.employeeId ? [{ employeeId: body.employeeId }] : [])] }] } });
    if (conflicts) throw new ConflictException('Section or teacher timetable overlap');
    return this.prisma.lectureTimetableEntry.create({ data: { ...body, dayOfWeek: Number(body.dayOfWeek), periodNumber: Number(body.periodNumber), startTime: start, endTime: end, effectiveFrom: from, effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : null } });
  }

  async list(query: any, actor: any) {
    if (actor.role === Role.EMPLOYEE) query.employeeId = actor.employeeDbId;
    if (actor.role === Role.STUDENT) {
      const student = await this.prisma.student.findUnique({ where: { studentId: actor.studentId }, include: { enrollments: { where: { status: 'CURRENT' }, orderBy: { effectiveFrom: 'desc' }, take: 1, include: { section: { include: { schoolClass: true } }, academicYear: true } } } });
      const enrollment = student?.enrollments[0];
      if (!enrollment) throw new ForbiddenException('No current enrollment');
      return this.autoGenerateStudentDay(enrollment);
    }
    if (!query.sectionId && !query.employeeId && actor.role !== Role.ADMIN) throw new ForbiddenException('No timetable scope');
    const activeOn = actor.role === Role.ADMIN ? undefined : new Date(`${this.today()}T00:00:00.000Z`);
    const entries = await this.prisma.lectureTimetableEntry.findMany({ where: { academicYearId: query.academicYearId || undefined, sectionId: query.sectionId || undefined, employeeId: query.employeeId || undefined, effectiveFrom: activeOn ? { lte: activeOn } : undefined, ...(activeOn ? { OR: [{ effectiveTo: null }, { effectiveTo: { gte: activeOn } }] } : {}) }, include: { section: { include: { schoolClass: true } }, subject: true, employee: true }, orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }] });
    return entries;
  }

  private async autoGenerateStudentDay(enrollment: any) {
    const activeOn = new Date(`${this.today()}T00:00:00.000Z`);
    const [subjects, assignments] = await Promise.all([
      this.prisma.subject.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.teacherAssignment.findMany({
        where: {
          academicYearId: enrollment.academicYearId,
          sectionId: enrollment.sectionId,
          effectiveFrom: { lte: activeOn },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: activeOn } }],
        },
        include: { employee: { select: { id: true, employeeId: true, name: true } } },
        orderBy: { effectiveFrom: 'desc' },
      }),
    ]);

    const teacherBySubject = new Map<string, any>();
    assignments.forEach((assignment) => {
      if (!teacherBySubject.has(assignment.subjectId)) teacherBySubject.set(assignment.subjectId, assignment.employee);
    });
    const slots = [
      ['08:00', '08:45'], ['08:45', '09:30'], ['09:45', '10:30'], ['10:30', '11:15'],
      ['11:15', '12:00'], ['12:30', '13:15'], ['13:15', '14:00'], ['14:00', '14:45'],
      ['14:45', '15:30'], ['15:30', '16:15'], ['16:15', '17:00'], ['17:00', '17:45'],
    ];
    const periods = subjects.map((subject, index) => {
      const slot = slots[index] || [`${String(18 + Math.floor((index - slots.length) / 2)).padStart(2, '0')}:${index % 2 ? '45' : '00'}`, `${String(18 + Math.floor((index - slots.length + 1) / 2)).padStart(2, '0')}:${index % 2 ? '30' : '45'}`];
      const teacher = teacherBySubject.get(subject.id);
      return {
        periodNumber: index + 1,
        startTime: slot[0],
        endTime: slot[1],
        subject: { id: subject.id, code: subject.code, name: subject.name },
        teacher: teacher ? { id: teacher.id, employeeId: teacher.employeeId, name: teacher.name } : null,
        status: teacher ? 'SCHEDULED' : 'CLASS_WORK',
      };
    });
    return {
      mode: 'AUTO_GENERATED',
      date: this.today(),
      dayName: new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long' }).format(new Date()),
      className: enrollment.section.schoolClass.name,
      sectionName: enrollment.section.name,
      academicYear: enrollment.academicYear.name,
      periods,
    };
  }
}
