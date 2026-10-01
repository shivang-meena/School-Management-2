import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ResultEntryStatus, Role } from '@prisma/client';
import { CreateExamInput, CreateExamTimetableInput, EnterMarksInput } from '@erp/contracts';
import { PrismaService } from '../prisma/prisma.service';

function dateOnly(value: string) { return new Date(`${value}T00:00:00.000Z`); }
function timeOnly(value?: string) { return value ? new Date(`1970-01-01T${value}:00Z`) : null; }
function normalizedTime(value: string) {
  const [hoursText, minutesText = '0'] = String(value || '').trim().split(':');
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
function timeMinutes(value: string) { const [hours, minutes] = normalizedTime(value).split(':').map(Number); return hours * 60 + minutes; }
function normalizedEndTime(startTime: string, endTime: string) {
  const normalizedStart = normalizedTime(startTime);
  const normalizedEnd = normalizedTime(endTime);
  const endHour = Number(normalizedEnd.slice(0, 2));
  if (timeMinutes(normalizedEnd) <= timeMinutes(normalizedStart) && endHour < 12) return `${String(endHour + 12).padStart(2, '0')}:${normalizedEnd.slice(3, 5)}`;
  return normalizedEnd;
}
function dateKey(value: any) { return new Date(value).toISOString().slice(0, 10); }

@Injectable()
export class ExamsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateExamInput) {
    if (dto.passMarks > dto.maximumMarks) throw new BadRequestException('Pass marks cannot exceed maximum marks');
    return this.prisma.assessment.create({ data: { ...dto, date: new Date(dto.date), startTime: dto.startTime ? timeOnly(dto.startTime) : null } });
  }

  async createTimetable(dto: CreateExamTimetableInput) {
    const startDate = dateOnly(dto.startDate);
    const endDate = dateOnly(dto.endDate);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) throw new BadRequestException('Timetable start date must be before or equal to the end date');
    const section = await this.prisma.section.findUnique({ where: { id: dto.sectionId }, select: { id: true, classId: true } });
    if (!section || section.classId !== dto.classId) throw new BadRequestException('Selected section does not belong to the selected class');
    const classSubjects = await this.prisma.classSubject.findMany({
      where: {
        classId: dto.classId,
        isActive: true,
      },
      select: { subjectId: true },
    });
    const assignments = await this.prisma.teacherAssignment.findMany({
      where: {
        academicYearId: dto.academicYearId,
        sectionId: dto.sectionId,
        effectiveFrom: { lte: endDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: startDate } }],
      },
      select: { subjectId: true },
    });
    const requiredSubjectIds = Array.from(new Set([
      ...classSubjects.map((cs) => cs.subjectId),
      ...assignments.map((assignment) => assignment.subjectId),
    ]));
    if (!requiredSubjectIds.length) throw new BadRequestException('No subjects are assigned to the selected class or section for this academic year');
    const scheduledSubjectIds = new Set<string>();
    const entries = dto.entries.map((entry) => {
      const entryDate = dateOnly(entry.date);
      if (Number.isNaN(entryDate.getTime()) || entryDate < startDate || entryDate > endDate) throw new BadRequestException('Every timetable date must be inside the selected duration');
      if (entry.isHoliday) {
        if (entry.subjectId || entry.startTime || entry.endTime) throw new BadRequestException('A holiday entry cannot have a subject or exam time');
      } else {
        if (!entry.subjectId || !entry.startTime || !entry.endTime) throw new BadRequestException('Subject, start time and end time are required for an exam entry');
        const effectiveStartTime = normalizedTime(entry.startTime);
        const effectiveEndTime = normalizedEndTime(effectiveStartTime, entry.endTime);
        if (timeMinutes(effectiveEndTime) <= timeMinutes(effectiveStartTime)) throw new BadRequestException('Exam end time must be after the start time');
        if (entry.passMarks != null && entry.maximumMarks != null && entry.passMarks > entry.maximumMarks) throw new BadRequestException('Pass marks cannot exceed maximum marks');
        if (!requiredSubjectIds.includes(entry.subjectId)) throw new BadRequestException('Every exam subject must be assigned to the selected section');
        if (scheduledSubjectIds.has(entry.subjectId)) throw new BadRequestException('A subject can be scheduled only once in one timetable');
        scheduledSubjectIds.add(entry.subjectId);
        const overlapping = dto.entries.some((other) => other !== entry && !other.isHoliday && other.date === entry.date && !!other.startTime && !!other.endTime && timeMinutes(normalizedTime(other.startTime!)) < timeMinutes(effectiveEndTime) && timeMinutes(normalizedEndTime(other.startTime!, other.endTime!)) > timeMinutes(effectiveStartTime));
        if (overlapping) throw new BadRequestException('Two papers for the same section cannot overlap on the same date');
        entry = { ...entry, startTime: effectiveStartTime, endTime: effectiveEndTime };
      }
      return { subjectId: entry.isHoliday ? null : entry.subjectId, date: entryDate, startTime: entry.isHoliday ? null : timeOnly(entry.startTime), endTime: entry.isHoliday ? null : timeOnly(entry.endTime), isHoliday: entry.isHoliday, holidayTitle: entry.isHoliday ? entry.holidayTitle || 'Holiday' : null, maximumMarks: entry.isHoliday ? null : entry.maximumMarks, passMarks: entry.isHoliday ? null : entry.passMarks };
    });
    const missingSubjects = requiredSubjectIds.filter((subjectId) => !scheduledSubjectIds.has(subjectId));
    if (missingSubjects.length) throw new BadRequestException('Add every subject assigned to the selected section before saving the timetable');
    return this.prisma.examTimetable.create({ data: { academicYearId: dto.academicYearId, classId: dto.classId, sectionId: dto.sectionId, type: dto.type, title: dto.title, startDate, endDate, entries: { create: entries } }, include: { academicYear: true, schoolClass: true, section: true, entries: { include: { subject: true }, orderBy: [{ date: 'asc' }, { startTime: 'asc' }] } } });
  }

  async listTimetables(query: any, actor: any) {
    const where: any = { academicYearId: query.academicYearId || undefined, classId: query.classId || undefined, sectionId: query.sectionId || undefined };
    if (actor.role === Role.STUDENT) {
      const student = await this.prisma.student.findUnique({ where: { studentId: actor.studentId }, include: { enrollments: { where: { status: 'CURRENT' }, orderBy: { effectiveFrom: 'desc' }, take: 1 } } });
      const enrollment = student?.enrollments[0];
      if (!enrollment) throw new ForbiddenException('No current enrollment');
      where.academicYearId = enrollment.academicYearId;
      where.classId = undefined;
      where.sectionId = enrollment.sectionId;
    }
    return this.prisma.examTimetable.findMany({ where, include: { academicYear: true, schoolClass: true, section: true, entries: { include: { subject: true }, orderBy: [{ date: 'asc' }, { startTime: 'asc' }] } }, orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }] });
  }

  async deleteTimetable(id: string) {
    const timetable = await this.prisma.examTimetable.findUnique({ where: { id } });
    if (!timetable) throw new NotFoundException('Exam timetable not found');
    await this.prisma.examTimetable.delete({ where: { id } });
    return { message: 'Exam timetable deleted successfully', id };
  }

  async enterMarks(dto: EnterMarksInput) {
    const assessment = await this.prisma.assessment.findUnique({ where: { id: dto.assessmentId } });
    if (!assessment) throw new NotFoundException('Assessment not found');
    if (assessment.published) throw new BadRequestException('Unpublish with reason before editing');
    return this.prisma.$transaction(dto.results.map((row) => {
      if (!row.absent && row.marks == null) throw new BadRequestException('Marks or absent status is required');
      if (row.marks != null && row.marks > Number(assessment.maximumMarks)) throw new BadRequestException('Marks exceed maximum');
      return this.prisma.examResult.upsert({ where: { assessmentId_studentId: { assessmentId: dto.assessmentId, studentId: row.studentId } }, update: { entryStatus: row.absent ? ResultEntryStatus.ABSENT : ResultEntryStatus.MARKS_ENTERED, marks: row.absent ? null : row.marks, remarks: row.remarks }, create: { assessmentId: dto.assessmentId, studentId: row.studentId, entryStatus: row.absent ? ResultEntryStatus.ABSENT : ResultEntryStatus.MARKS_ENTERED, marks: row.absent ? null : row.marks, remarks: row.remarks } });
    }));
  }

  async publish(id: string) {
    const assessment = await this.prisma.assessment.findUnique({ where: { id }, include: { results: true, section: { include: { enrollments: { where: { status: 'CURRENT' } } } }, gradingScheme: true } });
    if (!assessment) throw new NotFoundException('Assessment not found');
    if (assessment.results.length !== assessment.section.enrollments.length || assessment.results.some((r) => r.entryStatus === ResultEntryStatus.NOT_ENTERED)) throw new BadRequestException('All eligible student results must be resolved');
    return this.prisma.assessment.update({ where: { id }, data: { published: true, publishedAt: new Date(), gradingSnapshot: assessment.gradingScheme?.bands || {} } });
  }

  async list(actor: any, query: any) {
    const where: any = { academicYearId: query.academicYearId || undefined };
    if (actor.role !== Role.ADMIN) where.published = true;
    if (actor.role === Role.STUDENT) where.results = { some: { student: { studentId: actor.studentId } } };
    if (actor.role === Role.EMPLOYEE) { const assignments = await this.prisma.teacherAssignment.findMany({ where: { employeeId: actor.employeeDbId }, select: { sectionId: true } }); where.sectionId = { in: assignments.map((a) => a.sectionId) }; }
    return this.prisma.assessment.findMany({ where, include: { subject: true, section: { include: { schoolClass: true } }, results: actor.role === Role.STUDENT ? { where: { student: { studentId: actor.studentId } } } : true }, orderBy: { date: 'desc' } });
  }

  async listStudentResults(actor: any) {
    if (actor.role !== Role.STUDENT) throw new ForbiddenException('Student results are available only for student accounts');
    const student = await this.prisma.student.findUnique({
      where: { studentId: actor.studentId },
      include: {
        enrollments: {
          where: { status: 'CURRENT' },
          orderBy: { effectiveFrom: 'desc' },
          take: 1,
          include: {
            academicYear: true,
            section: { include: { schoolClass: true } },
          },
        },
      },
    });
    const enrollment = student?.enrollments[0];
    if (!student || !enrollment) throw new ForbiddenException('No current enrollment');
    const [timetables, assessments] = await Promise.all([
      this.prisma.examTimetable.findMany({ where: { academicYearId: enrollment.academicYearId, sectionId: enrollment.sectionId }, include: { entries: { include: { subject: true }, orderBy: [{ date: 'asc' }, { startTime: 'asc' }] } }, orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }] }),
      this.prisma.assessment.findMany({ where: { academicYearId: enrollment.academicYearId, sectionId: enrollment.sectionId }, include: { subject: true, results: { where: { studentId: student.id }, take: 1 } }, orderBy: { date: 'desc' } }),
    ]);
    return timetables.flatMap((timetable) => {
      const papers = timetable.entries.filter((entry) => !entry.isHoliday && entry.subjectId);
      if (!papers.length) return [];
      const subjects = papers.map((paper) => {
        const assessment = assessments.find((item) => item.subjectId === paper.subjectId && dateKey(item.date) === dateKey(paper.date));
        const result = assessment?.results[0];
        const complete = result?.entryStatus === ResultEntryStatus.MARKS_ENTERED || result?.entryStatus === ResultEntryStatus.ABSENT;
        const maximumMarks = Number(paper.maximumMarks ?? assessment?.maximumMarks ?? 0);
        return { subjectId: paper.subjectId, subject: paper.subject, date: paper.date, marks: result?.entryStatus === ResultEntryStatus.ABSENT ? null : result?.marks, maximumMarks, entryStatus: result?.entryStatus || ResultEntryStatus.NOT_ENTERED, remarks: result?.remarks || null, complete };
      });
      if (subjects.some((subject) => !subject.complete)) return [];
      const maximumMarks = subjects.reduce((sum, subject) => sum + subject.maximumMarks, 0);
      const totalMarks = subjects.reduce((sum, subject) => sum + Number(subject.marks || 0), 0);
      const percentage = maximumMarks > 0 ? Number(((totalMarks / maximumMarks) * 100).toFixed(2)) : 0;
      return [{
        id: timetable.id,
        timetableId: timetable.id,
        title: timetable.title,
        type: timetable.type,
        startDate: timetable.startDate,
        endDate: timetable.endDate,
        status: 'RESULT_AVAILABLE',
        totalMarks,
        maximumMarks,
        percentage,
        student: {
          name: student.name,
          studentId: student.studentId,
          rollNumber: enrollment.rollNumber,
          className: enrollment.section?.schoolClass?.name,
          sectionName: enrollment.section?.name,
          academicYear: enrollment.academicYear?.name,
        },
        subjects,
        message: 'Total marks: ' + totalMarks + '/' + maximumMarks + ' · Percentage: ' + percentage + '% · ' + subjects.map((subject) => (subject.subject?.name || 'Subject') + ': ' + (subject.entryStatus === ResultEntryStatus.ABSENT ? 'Absent' : subject.marks)).join(' · ')
      }];
    });
  }
}
