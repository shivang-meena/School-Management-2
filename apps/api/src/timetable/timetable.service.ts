import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { Role, TimetableEntryType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

@Injectable()
export class TimetableService {
  constructor(private readonly prisma: PrismaService) {}

  private today() {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  private formatTime(val: any): string {
    const text = String(val || '');
    return text.includes('T') ? text.slice(11, 16) : text.slice(0, 5);
  }

  private normalizeTime(val: any): string {
    const clean = String(val || '').trim();
    if (!clean) return '';
    const parts = clean.split(':');
    const h = Number(parts[0]);
    const m = parts[1] != null && parts[1] !== '' ? Number(parts[1]) : 0;
    if (!Number.isFinite(h) || !Number.isFinite(m)) return clean;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  private timeMinutes(val: any): number {
    const norm = this.normalizeTime(val);
    const [h, m] = norm.split(':').map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
    return h * 60 + m;
  }

  async create(body: any) {
    const normStart = this.normalizeTime(body.startTime);
    const normEnd = this.normalizeTime(body.endTime);
    const start = new Date(`1970-01-01T${normStart}:00Z`);
    const end = new Date(`1970-01-01T${normEnd}:00Z`);
    if (this.timeMinutes(normEnd) <= this.timeMinutes(normStart)) throw new BadRequestException('End time must be after start time');

    const from = new Date(body.effectiveFrom || this.today());
    const to = body.effectiveTo ? new Date(body.effectiveTo) : new Date('9999-12-31');
    if (to < from) throw new BadRequestException('Invalid effective date range');

    if (body.entryType === TimetableEntryType.LECTURE) {
      if (!body.subjectId) throw new BadRequestException('Lecture requires a subject');
    }

    const day = Number(body.dayOfWeek);
    const conflicts = await this.prisma.lectureTimetableEntry.findFirst({
      where: {
        academicYearId: body.academicYearId,
        dayOfWeek: day,
        effectiveFrom: { lte: to },
        AND: [
          { OR: [{ effectiveTo: null }, { effectiveTo: { gte: from } }] },
          { startTime: { lt: end } },
          { endTime: { gt: start } },
          { OR: [{ sectionId: body.sectionId }, ...(body.employeeId ? [{ employeeId: body.employeeId }] : [])] },
        ],
      },
      include: {
        employee: true,
        section: { include: { schoolClass: true } },
      },
    });

    if (conflicts) {
      if (body.employeeId && conflicts.employeeId === body.employeeId) {
        throw new ConflictException(
          `Teacher ${conflicts.employee?.name || 'Selected teacher'} already has a class in ${conflicts.section?.schoolClass?.name} - Section ${conflicts.section?.name} at this time slot`
        );
      }
      throw new ConflictException('Section already has a lecture or break during this time slot');
    }

    return this.prisma.lectureTimetableEntry.create({
      data: {
        academicYearId: body.academicYearId,
        sectionId: body.sectionId,
        employeeId: body.entryType === TimetableEntryType.LECTURE ? body.employeeId || null : null,
        subjectId: body.entryType === TimetableEntryType.LECTURE ? body.subjectId : null,
        entryType: body.entryType || TimetableEntryType.LECTURE,
        dayOfWeek: day,
        periodNumber: Number(body.periodNumber),
        startTime: start,
        endTime: end,
        effectiveFrom: from,
        effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : null,
      },
    });
  }

  async saveSectionSchedule(body: any) {
    const { academicYearId, sectionId, applyDays, effectiveFrom, periods } = body;
    if (!academicYearId || !sectionId) {
      throw new BadRequestException('Academic year and section are required');
    }
    if (!Array.isArray(applyDays) || applyDays.length === 0) {
      throw new BadRequestException('At least one day must be selected to apply the timetable');
    }
    if (!Array.isArray(periods) || periods.length === 0) {
      throw new BadRequestException('At least one period or break must be added');
    }

    const fromDate = new Date(effectiveFrom || this.today());

    // Normalize and sort periods by start time in minutes
    const sortedPeriods = periods.map((p: any) => ({
      ...p,
      startTime: this.normalizeTime(p.startTime),
      endTime: this.normalizeTime(p.endTime),
    })).sort((a: any, b: any) =>
      this.timeMinutes(a.startTime) - this.timeMinutes(b.startTime)
    );

    for (let i = 0; i < sortedPeriods.length; i++) {
      const p = sortedPeriods[i];
      const startMin = this.timeMinutes(p.startTime);
      const endMin = this.timeMinutes(p.endTime);
      if (!p.startTime || !p.endTime || isNaN(startMin) || isNaN(endMin)) {
        throw new BadRequestException(`Period #${i + 1} must have valid start and end time`);
      }
      if (endMin <= startMin) {
        throw new BadRequestException(`Period #${i + 1} end time (${p.endTime}) must be after start time (${p.startTime})`);
      }
      if (p.entryType === TimetableEntryType.LECTURE && !p.subjectId) {
        throw new BadRequestException(`Period #${i + 1} requires a subject`);
      }
      if (i > 0) {
        const prev = sortedPeriods[i - 1];
        if (startMin < this.timeMinutes(prev.endTime)) {
          throw new BadRequestException(
            `Time overlap in schedule: period from ${p.startTime} starts before previous period ends at ${prev.endTime}`
          );
        }
      }
    }

    // Check teacher conflicts across other sections in the school
    for (const day of applyDays) {
      for (const p of sortedPeriods) {
        if (p.entryType === TimetableEntryType.LECTURE && p.employeeId) {
          const pStart = new Date(`1970-01-01T${p.startTime}:00Z`);
          const pEnd = new Date(`1970-01-01T${p.endTime}:00Z`);

          const conflict = await this.prisma.lectureTimetableEntry.findFirst({
            where: {
              academicYearId,
              dayOfWeek: Number(day),
              employeeId: p.employeeId,
              sectionId: { not: sectionId },
              startTime: { lt: pEnd },
              endTime: { gt: pStart },
            },
            include: {
              employee: true,
              section: { include: { schoolClass: true } },
            },
          });

          if (conflict) {
            const dayName = DAY_NAMES[Number(day)] || `Day ${day}`;
            throw new ConflictException(
              `Teacher "${conflict.employee?.name || 'Selected teacher'}" already has a class in Class ${conflict.section?.schoolClass?.name} - Section ${conflict.section?.name} on ${dayName} at ${this.formatTime(conflict.startTime)}–${this.formatTime(conflict.endTime)}`
            );
          }
        }
      }
    }

    // Execute in transaction: Delete existing for these days and section, then insert new sorted entries
    await this.prisma.$transaction(async (tx) => {
      await tx.lectureTimetableEntry.deleteMany({
        where: {
          academicYearId,
          sectionId,
          dayOfWeek: { in: applyDays.map((d: any) => Number(d)) },
        },
      });

      const recordsToInsert: any[] = [];
      for (const day of applyDays) {
        let periodNumber = 1;
        for (const p of sortedPeriods) {
          recordsToInsert.push({
            academicYearId,
            sectionId,
            dayOfWeek: Number(day),
            periodNumber: periodNumber++,
            entryType: p.entryType || TimetableEntryType.LECTURE,
            subjectId: p.entryType === TimetableEntryType.LECTURE ? p.subjectId : null,
            employeeId: p.entryType === TimetableEntryType.LECTURE ? p.employeeId || null : null,
            startTime: new Date(`1970-01-01T${p.startTime}:00Z`),
            endTime: new Date(`1970-01-01T${p.endTime}:00Z`),
            effectiveFrom: fromDate,
            effectiveTo: null,
          });
        }
      }

      await tx.lectureTimetableEntry.createMany({
        data: recordsToInsert,
      });
    });

    return {
      success: true,
      periodsCount: sortedPeriods.length,
      daysCount: applyDays.length,
      message: 'Timetable saved successfully',
    };
  }

  async remove(id: string) {
    return this.prisma.lectureTimetableEntry.delete({ where: { id } });
  }

  async list(query: any, actor: any) {
    if (actor.role === Role.EMPLOYEE) {
      if (!query.sectionId) {
        query.employeeId = actor.employeeDbId;
      }
    }

    if (actor.role === Role.STUDENT) {
      const student = await this.prisma.student.findUnique({
        where: { studentId: actor.studentId },
        include: {
          enrollments: {
            where: { status: 'CURRENT' },
            orderBy: { effectiveFrom: 'desc' },
            take: 1,
            include: {
              section: { include: { schoolClass: true } },
              academicYear: true,
            },
          },
        },
      });
      const enrollment = student?.enrollments[0];
      if (!enrollment) throw new ForbiddenException('No current enrollment');

      return this.getStudentSchedule(enrollment, query);
    }

    if (!query.sectionId && !query.employeeId && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('No timetable scope');
    }

    const activeOn = actor.role === Role.ADMIN ? undefined : new Date(`${this.today()}T00:00:00.000Z`);
    const entries = await this.prisma.lectureTimetableEntry.findMany({
      where: {
        academicYearId: query.academicYearId || undefined,
        sectionId: query.sectionId || undefined,
        employeeId: query.employeeId || undefined,
        dayOfWeek: query.dayOfWeek ? Number(query.dayOfWeek) : undefined,
        effectiveFrom: activeOn ? { lte: activeOn } : undefined,
        ...(activeOn ? { OR: [{ effectiveTo: null }, { effectiveTo: { gte: activeOn } }] } : {}),
      },
      include: {
        section: { include: { schoolClass: true } },
        subject: true,
        employee: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    return entries;
  }

  private async getStudentSchedule(enrollment: any, query: any) {
    const dateStr = query.date || this.today();
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d));
    const rawDay = dateObj.getUTCDay(); // 0: Sun, 1: Mon, ... 6: Sat
    const defaultDayOfWeek = rawDay === 0 ? 7 : rawDay;
    const targetDayOfWeek = query.dayOfWeek ? Number(query.dayOfWeek) : defaultDayOfWeek;
    const dayName = DAY_NAMES[targetDayOfWeek] || 'Today';

    const activeOn = new Date(`${dateStr}T00:00:00.000Z`);

    // Check School Calendar for Holiday on this date
    const calendarEntry = await this.prisma.schoolCalendar.findFirst({
      where: {
        academicYearId: enrollment.academicYearId,
        date: new Date(`${dateStr}T00:00:00.000Z`),
      },
    });

    const isWeeklyOff = targetDayOfWeek === 7 || calendarEntry?.dayType === 'WEEKLY_OFF';
    const isHoliday = isWeeklyOff || calendarEntry?.dayType === 'HOLIDAY';
    const holidayTitle = calendarEntry?.title || (targetDayOfWeek === 7 ? 'Sunday / Weekly Off' : (isHoliday ? 'Holiday' : null));

    let entries = await this.prisma.lectureTimetableEntry.findMany({
      where: {
        academicYearId: enrollment.academicYearId,
        sectionId: enrollment.sectionId,
        dayOfWeek: targetDayOfWeek,
        effectiveFrom: { lte: activeOn },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: activeOn } }],
      },
      include: {
        subject: true,
        employee: { select: { id: true, employeeId: true, name: true } },
      },
      orderBy: [{ startTime: 'asc' }],
    });

    // If no entries for this specific day (e.g. Wednesday), but Monday (day 1) has entries and query was for today, fallback to general weekday schedule
    if (entries.length === 0 && targetDayOfWeek >= 1 && targetDayOfWeek <= 6 && !query.dayOfWeek) {
      entries = await this.prisma.lectureTimetableEntry.findMany({
        where: {
          academicYearId: enrollment.academicYearId,
          sectionId: enrollment.sectionId,
          dayOfWeek: 1,
          effectiveFrom: { lte: activeOn },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: activeOn } }],
        },
        include: {
          subject: true,
          employee: { select: { id: true, employeeId: true, name: true } },
        },
        orderBy: [{ startTime: 'asc' }],
      });
    }

    let lectureCounter = 1;
    const periods = entries.map((entry) => {
      const isBreak = entry.entryType === TimetableEntryType.BREAK;
      const periodNo = isBreak ? 'Break' : String(lectureCounter++);
      return {
        id: entry.id,
        periodNumber: periodNo,
        entryType: entry.entryType,
        startTime: this.formatTime(entry.startTime),
        endTime: this.formatTime(entry.endTime),
        subject: entry.subject
          ? { id: entry.subject.id, code: entry.subject.code, name: entry.subject.name }
          : { name: 'Recess / Break' },
        teacher: entry.employee
          ? { id: entry.employee.id, employeeId: entry.employee.employeeId, name: entry.employee.name }
          : null,
        status: isBreak ? 'BREAK' : (entry.employee ? 'SCHEDULED' : 'CLASS_WORK'),
      };
    });

    return {
      mode: 'SCHEDULED',
      date: dateStr,
      dayName,
      dayOfWeek: targetDayOfWeek,
      className: enrollment.section.schoolClass.name,
      sectionName: enrollment.section.name,
      academicYear: enrollment.academicYear.name,
      isHoliday,
      holidayTitle,
      periods,
    };
  }
}
