import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'; import { EnrollmentStatus } from '@prisma/client'; import { PrismaService } from '../prisma/prisma.service';
@Injectable() export class AcademicsService {
  constructor(private readonly prisma: PrismaService) {}
  overview() { return Promise.all([
    this.prisma.academicYear.findMany({ orderBy: { startDate: 'desc' } }),
    this.prisma.schoolClass.findMany({ include: { sections: true }, orderBy: { sortOrder: 'asc' } }),
    this.prisma.subject.findMany({ orderBy: { name: 'asc' } }),
    this.prisma.teacherAssignment.findMany({ include: { employee: { select: { id: true, employeeId: true, name: true, designation: true, subRole: true } }, section: { include: { schoolClass: true } }, subject: true, academicYear: true }, orderBy: { effectiveFrom: 'desc' } }),
    this.prisma.classTeacherAssignment.findMany({ include: { employee: { select: { id: true, employeeId: true, name: true, designation: true, subRole: true } }, section: { include: { schoolClass: true } }, academicYear: true }, orderBy: { effectiveFrom: 'desc' } }),
  ]).then(([academicYears, classes, subjects, teacherAssignments, classTeacherAssignments]) => ({ academicYears, classes, subjects, teacherAssignments, classTeacherAssignments })); }
  async createYear(body: any) { if (new Date(body.startDate) >= new Date(body.endDate)) throw new BadRequestException('End date must be after start date'); return this.prisma.$transaction(async (tx) => { if (body.isCurrent) await tx.academicYear.updateMany({ data: { isCurrent: false } }); return tx.academicYear.create({ data: { name: body.name, startDate: new Date(body.startDate), endDate: new Date(body.endDate), isCurrent: !!body.isCurrent } }); }); }
  async setCurrent(id: string) { return this.prisma.$transaction(async (tx) => { const year = await tx.academicYear.findUnique({ where: { id } }); if (!year) throw new NotFoundException('Academic year not found'); await tx.academicYear.updateMany({ data: { isCurrent: false } }); return tx.academicYear.update({ where: { id }, data: { isCurrent: true } }); }); }
  createClass(body: any) { return this.prisma.schoolClass.create({ data: { name: body.name, sortOrder: Number(body.sortOrder) } }); }
  createSection(body: any) { return this.prisma.section.create({ data: { classId: body.classId, name: body.name, capacity: body.capacity ? Number(body.capacity) : null } }); }
  createSubject(body: any) { return this.prisma.subject.create({ data: { code: body.code, name: body.name } }); }
  upsertCalendar(body: any) { return this.prisma.schoolCalendar.upsert({ where: { academicYearId_date: { academicYearId: body.academicYearId, date: new Date(body.date) } }, update: { dayType: body.dayType, title: body.title }, create: { academicYearId: body.academicYearId, date: new Date(body.date), dayType: body.dayType, title: body.title } }); }
  calendar(yearId: string) { return this.prisma.schoolCalendar.findMany({ where: { academicYearId: yearId }, orderBy: { date: 'asc' } }); }
  async assignTeacher(body: any, classTeacher = false) { const from = new Date(body.effectiveFrom), to = body.effectiveTo ? new Date(body.effectiveTo) : null; if (to && to < from) throw new BadRequestException('Invalid effective date range'); if (classTeacher) { const overlap = await this.prisma.classTeacherAssignment.count({ where: { sectionId: body.sectionId, academicYearId: body.academicYearId, effectiveFrom: { lte: to || new Date('9999-12-31') }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: from } }] } }); if (overlap) throw new ConflictException('Section already has a class teacher for overlapping dates'); return this.prisma.classTeacherAssignment.create({ data: { employeeId: body.employeeId, academicYearId: body.academicYearId, sectionId: body.sectionId, effectiveFrom: from, effectiveTo: to } }); } const employee = await this.prisma.employee.findUnique({ where: { id: body.employeeId }, select: { subRole: true, primarySubjectId: true, primarySubject: { select: { name: true } }, teachingAssignments: { select: { subject: { select: { name: true } } }, orderBy: { effectiveFrom: 'desc' }, take: 1 } } }); if (!employee || employee.subRole !== 'TEACHER') throw new BadRequestException('Only teachers can receive subject assignments'); const linkedSubjectName = employee.primarySubject?.name || employee.teachingAssignments[0]?.subject?.name; if (employee.primarySubjectId !== body.subjectId) throw new ConflictException(`This teacher teach only ${linkedSubjectName || 'the selected teacher subject'}`); const existingSubjectAssignment = await this.prisma.teacherAssignment.findFirst({ where: { academicYearId: body.academicYearId, sectionId: body.sectionId, subjectId: body.subjectId } }); if (existingSubjectAssignment) throw new ConflictException('This subject is already assigned to a teacher. Remove the existing assignment first, then assign a new teacher.'); return this.prisma.teacherAssignment.create({ data: { employeeId: body.employeeId, academicYearId: body.academicYearId, sectionId: body.sectionId, subjectId: body.subjectId, effectiveFrom: from, effectiveTo: to } }); }
  async deleteAssignment(id: string, classTeacher = false) {
    if (classTeacher) {
      const assignment = await this.prisma.classTeacherAssignment.findUnique({ where: { id } });
      if (!assignment) throw new NotFoundException('Class-teacher assignment not found');
      await this.prisma.classTeacherAssignment.delete({ where: { id } });
    } else {
      const assignment = await this.prisma.teacherAssignment.findUnique({ where: { id } });
      if (!assignment) throw new NotFoundException('Teacher assignment not found');
      await this.prisma.teacherAssignment.delete({ where: { id } });
    }
    return { message: 'Assignment deleted' };
  }
  async deleteRecord(type: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      if (type === 'classes') {
        const schoolClass = await tx.schoolClass.findUnique({ where: { id }, include: { sections: true, feeStructures: { include: { feeAccounts: true } } } });
        if (!schoolClass) throw new NotFoundException('Class not found');
        const sectionIds = schoolClass.sections.map((section) => section.id);
        if (await tx.studentEnrollment.count({ where: { sectionId: { in: sectionIds } } })) throw new BadRequestException('Class has student enrollment/history and cannot be deleted');
        if (schoolClass.feeStructures.some((structure) => structure.feeAccounts.length)) throw new BadRequestException('Class has student fee accounts and cannot be deleted');
        const assessments = await tx.assessment.findMany({ where: { sectionId: { in: sectionIds } }, select: { id: true } });
        if (await tx.examResult.count({ where: { assessmentId: { in: assessments.map((item) => item.id) } } })) throw new BadRequestException('Class has exam results and cannot be deleted');
        await tx.noticeAudience.deleteMany({ where: { sectionId: { in: sectionIds } } });
        await tx.teacherAssignment.deleteMany({ where: { sectionId: { in: sectionIds } } });
        await tx.classTeacherAssignment.deleteMany({ where: { sectionId: { in: sectionIds } } });
        await tx.lectureTimetableEntry.deleteMany({ where: { sectionId: { in: sectionIds } } });
        await tx.assessment.deleteMany({ where: { id: { in: assessments.map((item) => item.id) } } });
        await tx.classFeeStructure.deleteMany({ where: { classId: id } });
        await tx.section.deleteMany({ where: { id: { in: sectionIds } } });
        await tx.schoolClass.delete({ where: { id } });
      } else if (type === 'sections') {
        if (!await tx.section.findUnique({ where: { id } })) throw new NotFoundException('Section not found');
        if (await tx.studentEnrollment.count({ where: { sectionId: id } })) throw new BadRequestException('Section has student enrollment/history and cannot be deleted');
        const assessments = await tx.assessment.findMany({ where: { sectionId: id }, select: { id: true } });
        if (await tx.examResult.count({ where: { assessmentId: { in: assessments.map((item) => item.id) } } })) throw new BadRequestException('Section has exam results and cannot be deleted');
        await tx.noticeAudience.deleteMany({ where: { sectionId: id } });
        await tx.teacherAssignment.deleteMany({ where: { sectionId: id } });
        await tx.classTeacherAssignment.deleteMany({ where: { sectionId: id } });
        await tx.lectureTimetableEntry.deleteMany({ where: { sectionId: id } });
        await tx.assessment.deleteMany({ where: { id: { in: assessments.map((item) => item.id) } } });
        await tx.section.delete({ where: { id } });
      } else if (type === 'subjects') {
        if (!await tx.subject.findUnique({ where: { id } })) throw new NotFoundException('Subject not found');
        const assessments = await tx.assessment.findMany({ where: { subjectId: id }, select: { id: true } });
        if (await tx.examResult.count({ where: { assessmentId: { in: assessments.map((item) => item.id) } } })) throw new BadRequestException('Subject has exam results and cannot be deleted');
        await tx.teacherAssignment.deleteMany({ where: { subjectId: id } });
        await tx.lectureTimetableEntry.deleteMany({ where: { subjectId: id } });
        await tx.assessment.deleteMany({ where: { id: { in: assessments.map((item) => item.id) } } });
        await tx.subject.delete({ where: { id } });
      } else if (type === 'years') {
        if (!await tx.academicYear.findUnique({ where: { id } })) throw new NotFoundException('Academic year not found');
        if (await tx.studentEnrollment.count({ where: { academicYearId: id } })) throw new BadRequestException('Academic year has student enrollment/history and cannot be deleted');
        if (await tx.studentFeeAccount.count({ where: { academicYearId: id } })) throw new BadRequestException('Academic year has fee accounts and cannot be deleted');
        const assessments = await tx.assessment.findMany({ where: { academicYearId: id }, select: { id: true } });
        if (await tx.examResult.count({ where: { assessmentId: { in: assessments.map((item) => item.id) } } })) throw new BadRequestException('Academic year has exam results and cannot be deleted');
        await tx.teacherAssignment.deleteMany({ where: { academicYearId: id } });
        await tx.classTeacherAssignment.deleteMany({ where: { academicYearId: id } });
        await tx.lectureTimetableEntry.deleteMany({ where: { academicYearId: id } });
        await tx.schoolCalendar.deleteMany({ where: { academicYearId: id } });
        await tx.assessment.deleteMany({ where: { id: { in: assessments.map((item) => item.id) } } });
        await tx.classFeeStructure.deleteMany({ where: { academicYearId: id } });
        await tx.academicYear.delete({ where: { id } });
      } else throw new BadRequestException('Unsupported academic record type');
      return { message: 'Academic record and removable related configuration deleted' };
    });
  }
  async transfer(studentId: string, body: any) { return this.prisma.$transaction(async (tx) => { const current = await tx.studentEnrollment.findFirst({ where: { studentId, status: EnrollmentStatus.CURRENT } }); if (!current) throw new NotFoundException('Active enrollment not found'); const date = new Date(body.effectiveFrom); if (date <= current.effectiveFrom) throw new BadRequestException('Transfer date must be after current enrollment start'); await tx.studentEnrollment.update({ where: { id: current.id }, data: { status: EnrollmentStatus.CLOSED, effectiveTo: new Date(date.getTime() - 86400000) } }); return tx.studentEnrollment.create({ data: { studentId, academicYearId: body.academicYearId, sectionId: body.sectionId, rollNumber: Number(body.rollNumber), effectiveFrom: date } }); }); }
}
