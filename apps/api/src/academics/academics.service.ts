import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'; import { EnrollmentStatus } from '@prisma/client'; import { PrismaService } from '../prisma/prisma.service';
@Injectable() export class AcademicsService {
  constructor(private readonly prisma: PrismaService) {}
  overview() { return Promise.all([
    this.prisma.academicYear.findMany({ orderBy: { startDate: 'desc' } }),
    this.prisma.schoolClass.findMany({ include: { sections: true }, orderBy: { sortOrder: 'asc' } }),
    this.prisma.subject.findMany({ orderBy: { name: 'asc' } }),
    this.prisma.teacherAssignment.findMany({ include: { employee: { select: { id: true, employeeId: true, name: true, designation: true, subRole: true } }, section: { include: { schoolClass: true } }, subject: true, academicYear: true }, orderBy: { effectiveFrom: 'desc' } }),
    this.prisma.classTeacherAssignment.findMany({ include: { employee: { select: { id: true, employeeId: true, name: true, designation: true, subRole: true } }, section: { include: { schoolClass: true } }, academicYear: true }, orderBy: { effectiveFrom: 'desc' } }),
    this.prisma.parentSubject.findMany({ orderBy: { name: 'asc' } }),
    this.prisma.classSubject.findMany({ include: { subject: true, parentSubject: true } }),
  ]).then(([academicYears, classes, subjects, teacherAssignments, classTeacherAssignments, parentSubjects, classSubjects]) => ({ academicYears, classes, subjects, teacherAssignments, classTeacherAssignments, parentSubjects, classSubjects })); }
  async createYear(body: any) { if (new Date(body.startDate) >= new Date(body.endDate)) throw new BadRequestException('End date must be after start date'); return this.prisma.$transaction(async (tx) => { if (body.isCurrent) await tx.academicYear.updateMany({ data: { isCurrent: false } }); return tx.academicYear.create({ data: { name: body.name, startDate: new Date(body.startDate), endDate: new Date(body.endDate), isCurrent: !!body.isCurrent } }); }); }
  async setCurrent(id: string) { return this.prisma.$transaction(async (tx) => { const year = await tx.academicYear.findUnique({ where: { id } }); if (!year) throw new NotFoundException('Academic year not found'); await tx.academicYear.updateMany({ data: { isCurrent: false } }); return tx.academicYear.update({ where: { id }, data: { isCurrent: true } }); }); }
  createClass(body: any) { return this.prisma.schoolClass.create({ data: { name: body.name, sortOrder: Number(body.sortOrder) } }); }
  createSection(body: any) { return this.prisma.section.create({ data: { classId: body.classId, name: body.name, capacity: body.capacity ? Number(body.capacity) : null } }); }
  createSubject(body: any) { return this.prisma.subject.create({ data: { code: body.code, name: body.name } }); }
  upsertCalendar(body: any) { return this.prisma.schoolCalendar.upsert({ where: { academicYearId_date: { academicYearId: body.academicYearId, date: new Date(body.date) } }, update: { dayType: body.dayType, title: body.title }, create: { academicYearId: body.academicYearId, date: new Date(body.date), dayType: body.dayType, title: body.title } }); }
  updateCalendar(id: string, body: any) { return this.prisma.schoolCalendar.update({ where: { id }, data: { date: new Date(body.date), dayType: body.dayType, title: body.title } }); }
  deleteCalendar(id: string) { return this.prisma.schoolCalendar.delete({ where: { id } }); }
  async calendar(yearId?: string) {
    const selectedYearId = yearId || (await this.prisma.academicYear.findFirst({ where: { isCurrent: true }, select: { id: true } }))?.id;
    if (!selectedYearId) return [];
    return this.prisma.schoolCalendar.findMany({ where: { academicYearId: selectedYearId }, orderBy: { date: 'asc' } });
  }
  async assignTeacher(body: any, classTeacher = false) {
    const from = new Date(body.effectiveFrom), to = body.effectiveTo ? new Date(body.effectiveTo) : null;
    if (to && to < from) throw new BadRequestException('Invalid effective date range');
    if (classTeacher) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: body.employeeId },
        select: { subRole: true, status: true, name: true },
      });
      if (!employee || employee.subRole !== 'TEACHER') {
        throw new BadRequestException('Only teachers can be assigned as class teachers');
      }

      const teacherOverlap = await this.prisma.classTeacherAssignment.findFirst({
        where: {
          employeeId: body.employeeId,
          academicYearId: body.academicYearId,
          effectiveFrom: { lte: to || new Date('9999-12-31') },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: from } }],
        },
        include: {
          section: { include: { schoolClass: true } },
        },
      });
      if (teacherOverlap) {
        const clsName = teacherOverlap.section?.schoolClass?.name || 'Class';
        const secName = teacherOverlap.section?.name || 'Section';
        throw new ConflictException(`This teacher is already assigned as Class Teacher to ${clsName} - Section ${secName}. A teacher can only be assigned to one class.`);
      }

      const sectionOverlap = await this.prisma.classTeacherAssignment.findFirst({
        where: {
          sectionId: body.sectionId,
          academicYearId: body.academicYearId,
          effectiveFrom: { lte: to || new Date('9999-12-31') },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: from } }],
        },
        include: {
          employee: { select: { name: true, employeeId: true } },
        },
      });
      if (sectionOverlap) {
        const existingName = sectionOverlap.employee?.name || 'Another teacher';
        throw new ConflictException(`This section already has an assigned class teacher (${existingName}). Remove the existing class teacher first.`);
      }

      return this.prisma.classTeacherAssignment.create({
        data: {
          employeeId: body.employeeId,
          academicYearId: body.academicYearId,
          sectionId: body.sectionId,
          effectiveFrom: from,
          effectiveTo: to,
        },
      });
    }
    const employee = await this.prisma.employee.findUnique({
      where: { id: body.employeeId },
      select: { subRole: true },
    });
    if (!employee || employee.subRole !== 'TEACHER') {
      throw new BadRequestException('Only teachers can receive subject assignments');
    }
    const existingSubjectAssignment = await this.prisma.teacherAssignment.findFirst({
      where: {
        academicYearId: body.academicYearId,
        sectionId: body.sectionId,
        subjectId: body.subjectId,
      },
    });
    if (existingSubjectAssignment) {
      throw new ConflictException('This subject is already assigned to a teacher. Remove the existing assignment first, then assign a new teacher.');
    }
    return this.prisma.teacherAssignment.create({
      data: {
        employeeId: body.employeeId,
        academicYearId: body.academicYearId,
        sectionId: body.sectionId,
        subjectId: body.subjectId,
        effectiveFrom: from,
        effectiveTo: to,
      },
    });
  }
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
  isSeniorSecondary(schoolClass: { name: string; sortOrder?: number | null }): boolean {
    if (schoolClass.sortOrder != null) {
      if (schoolClass.sortOrder >= 11) return true;
      if (schoolClass.sortOrder >= 1 && schoolClass.sortOrder <= 10) return false;
    }
    const normalized = schoolClass.name.trim().toLowerCase();
    return /\b(11|12|11th|12th|xi|xii)\b/i.test(normalized);
  }

  getParentSubjects(includeInactive = false) {
    return this.prisma.parentSubject.findMany({
      where: includeInactive ? undefined : { isActive: true },
      include: {
        _count: {
          select: { classSubjects: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createParentSubject(body: any) {
    const name = String(body.name || '').trim();
    const code = String(body.code || '').trim().toUpperCase();
    if (!name) throw new BadRequestException('Stream / Parent Subject name is required');
    if (!code) throw new BadRequestException('Stream code is required');
    const existing = await this.prisma.parentSubject.findUnique({ where: { code } });
    if (existing) throw new ConflictException(`Stream code "${code}" already exists`);
    return this.prisma.parentSubject.create({
      data: {
        name,
        code,
        description: body.description ? String(body.description).trim() : null,
        isActive: body.isActive !== undefined ? !!body.isActive : true,
      },
    });
  }

  async updateParentSubject(id: string, body: any) {
    const parent = await this.prisma.parentSubject.findUnique({ where: { id } });
    if (!parent) throw new NotFoundException('Parent subject / stream not found');
    const data: any = {};
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) throw new BadRequestException('Stream name cannot be empty');
      data.name = name;
    }
    if (body.code !== undefined) {
      const code = String(body.code).trim().toUpperCase();
      if (!code) throw new BadRequestException('Stream code cannot be empty');
      if (code !== parent.code) {
        const existing = await this.prisma.parentSubject.findUnique({ where: { code } });
        if (existing) throw new ConflictException(`Stream code "${code}" already exists`);
      }
      data.code = code;
    }
    if (body.description !== undefined) {
      data.description = body.description ? String(body.description).trim() : null;
    }
    if (body.isActive !== undefined) {
      data.isActive = !!body.isActive;
    }
    return this.prisma.parentSubject.update({
      where: { id },
      data,
    });
  }

  async deleteParentSubject(id: string) {
    const parent = await this.prisma.parentSubject.findUnique({ where: { id } });
    if (!parent) throw new NotFoundException('Parent subject / stream not found');
    const linkedCount = await this.prisma.classSubject.count({ where: { parentSubjectId: id } });
    if (linkedCount > 0) {
      throw new BadRequestException('Cannot delete parent subject / stream because it is linked to active class subject assignments. Please remove those subjects or deactivate the stream.');
    }
    await this.prisma.parentSubject.delete({ where: { id } });
    return { message: 'Parent subject / stream deleted successfully' };
  }

  async getClassSubjects(classId: string) {
    const schoolClass = await this.prisma.schoolClass.findUnique({
      where: { id: classId },
      include: { sections: true },
    });
    if (!schoolClass) throw new NotFoundException('Class not found');
    const isSeniorSecondary = this.isSeniorSecondary(schoolClass);

    const classSubjects = await this.prisma.classSubject.findMany({
      where: { classId },
      include: {
        subject: true,
        parentSubject: true,
      },
      orderBy: [
        { parentSubject: { name: 'asc' } },
        { subject: { name: 'asc' } },
      ],
    });

    if (!isSeniorSecondary) {
      return {
        schoolClass,
        isSeniorSecondary: false,
        subjects: classSubjects.map((cs) => ({
          id: cs.id,
          classId: cs.classId,
          subjectId: cs.subjectId,
          subject: cs.subject,
          isOptional: cs.isOptional,
          isActive: cs.isActive,
          createdAt: cs.createdAt,
        })),
      };
    }

    const activeParents = await this.prisma.parentSubject.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    const mappedParentIds = new Set(classSubjects.map((cs) => cs.parentSubjectId).filter(Boolean) as string[]);
    const extraParents = mappedParentIds.size > 0 ? await this.prisma.parentSubject.findMany({
      where: {
        id: { in: Array.from(mappedParentIds) },
        isActive: false,
      },
    }) : [];

    const allRelevantParentsMap = new Map<string, any>();
    for (const p of [...activeParents, ...extraParents]) {
      allRelevantParentsMap.set(p.id, p);
    }

    const streams = Array.from(allRelevantParentsMap.values()).map((parent) => {
      const streamSubjects = classSubjects.filter((cs) => cs.parentSubjectId === parent.id);
      return {
        parentSubject: parent,
        subjects: streamSubjects.map((cs) => ({
          id: cs.id,
          classId: cs.classId,
          subjectId: cs.subjectId,
          parentSubjectId: cs.parentSubjectId,
          subject: cs.subject,
          isOptional: cs.isOptional,
          isActive: cs.isActive,
          createdAt: cs.createdAt,
        })),
      };
    });

    return {
      schoolClass,
      isSeniorSecondary: true,
      streams,
      subjects: classSubjects,
    };
  }

  async assignClassSubject(classId: string, body: any) {
    const schoolClass = await this.prisma.schoolClass.findUnique({ where: { id: classId } });
    if (!schoolClass) throw new NotFoundException('Class not found');

    let subjectId = String(body.subjectId || '').trim();
    const name = String(body.name || '').trim();
    let code = String(body.code || '').trim().toUpperCase();

    if (!subjectId && name) {
      if (!code) {
        const baseCode = name.replace(/[^A-Za-z0-9]/g, '').slice(0, 5).toUpperCase() || 'SUB';
        let candidate = baseCode;
        let counter = 1;
        while (await this.prisma.subject.findUnique({ where: { code: candidate } })) {
          candidate = `${baseCode.slice(0, 4)}${counter++}`;
        }
        code = candidate;
      }
      let subjectRecord = await this.prisma.subject.findFirst({
        where: { OR: [{ name: { equals: name, mode: 'insensitive' } }, { code }] },
      });
      if (!subjectRecord) {
        subjectRecord = await this.prisma.subject.create({
          data: { name, code },
        });
      }
      subjectId = subjectRecord.id;
    }

    if (!subjectId) throw new BadRequestException('Subject name or ID is required');

    const subject = await this.prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) throw new NotFoundException('Subject not found');

    const isSenior = this.isSeniorSecondary(schoolClass);

    let parentSubjectId: string | null = null;
    if (isSenior) {
      if (!body.parentSubjectId) {
        throw new BadRequestException('Parent Subject / Stream is mandatory for Class 11 and Class 12');
      }
      parentSubjectId = String(body.parentSubjectId).trim();
      const parent = await this.prisma.parentSubject.findUnique({ where: { id: parentSubjectId } });
      if (!parent) throw new NotFoundException('Parent Subject / Stream not found');

      const existing = await this.prisma.classSubject.findFirst({
        where: { classId, subjectId, parentSubjectId },
      });
      if (existing) {
        throw new ConflictException(`Subject "${subject.name}" is already assigned to ${schoolClass.name} under ${parent.name}`);
      }
    } else {
      if (body.parentSubjectId) {
        throw new BadRequestException('Classes 1 to 10 cannot have a parent subject or stream');
      }
      const existing = await this.prisma.classSubject.findFirst({
        where: { classId, subjectId, parentSubjectId: null },
      });
      if (existing) {
        throw new ConflictException(`Subject "${subject.name}" is already assigned to ${schoolClass.name}`);
      }
    }

    return this.prisma.classSubject.create({
      data: {
        classId,
        subjectId,
        parentSubjectId,
        isOptional: !!body.isOptional,
      },
      include: {
        subject: true,
        parentSubject: true,
      },
    });
  }

  async removeClassSubject(classId: string, subjectId: string, parentSubjectId?: string) {
    const schoolClass = await this.prisma.schoolClass.findUnique({
      where: { id: classId },
      include: { sections: true },
    });
    if (!schoolClass) throw new NotFoundException('Class not found');

    const isSenior = this.isSeniorSecondary(schoolClass);
    let target = null;
    if (isSenior && parentSubjectId) {
      target = await this.prisma.classSubject.findFirst({
        where: { classId, subjectId, parentSubjectId },
      });
    } else if (parentSubjectId) {
      target = await this.prisma.classSubject.findFirst({
        where: { classId, subjectId, parentSubjectId },
      });
    } else {
      target = await this.prisma.classSubject.findFirst({
        where: { classId, subjectId },
      });
    }
    if (!target) throw new NotFoundException('Class subject mapping not found');

    const sectionIds = schoolClass.sections.map((s) => s.id);
    const assessmentCount = await this.prisma.assessment.count({
      where: {
        subjectId,
        sectionId: { in: sectionIds },
      },
    });
    if (assessmentCount > 0) {
      throw new BadRequestException('Cannot remove subject: assessments or exam results are already recorded for this subject in this class.');
    }

    await this.prisma.classSubject.delete({ where: { id: target.id } });
    return { message: 'Subject removed from class successfully' };
  }

  async deleteClassSubjectById(id: string) {
    const mapping = await this.prisma.classSubject.findUnique({
      where: { id },
      include: { schoolClass: { include: { sections: true } } },
    });
    if (!mapping) throw new NotFoundException('Class subject mapping not found');

    const sectionIds = mapping.schoolClass.sections.map((s) => s.id);
    const assessmentCount = await this.prisma.assessment.count({
      where: {
        subjectId: mapping.subjectId,
        sectionId: { in: sectionIds },
      },
    });
    if (assessmentCount > 0) {
      throw new BadRequestException('Cannot remove subject: assessments or exam results are already recorded for this subject in this class.');
    }

    await this.prisma.classSubject.delete({ where: { id } });
    return { message: 'Subject removed from class successfully' };
  }

  async updateClassSubject(id: string, body: any) {
    const existing = await this.prisma.classSubject.findUnique({
      where: { id },
      include: { subject: true },
    });
    if (!existing) throw new NotFoundException('Class subject mapping not found');

    const data: any = {};
    if (typeof body.isOptional === 'boolean') data.isOptional = body.isOptional;
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive;

    const newName = body.name ? String(body.name).trim() : undefined;
    const newCode = body.code ? String(body.code).trim().toUpperCase() : undefined;
    if (newName || newCode) {
      await this.prisma.subject.update({
        where: { id: existing.subjectId },
        data: {
          ...(newName ? { name: newName } : {}),
          ...(newCode ? { code: newCode } : {}),
        },
      });
    }

    return this.prisma.classSubject.update({
      where: { id },
      data,
      include: {
        subject: true,
        parentSubject: true,
      },
    });
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
        await tx.classSubject.deleteMany({ where: { classId: id } });
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
        await tx.classSubject.deleteMany({ where: { subjectId: id } });
        await tx.teacherAssignment.deleteMany({ where: { subjectId: id } });
        await tx.lectureTimetableEntry.deleteMany({ where: { subjectId: id } });
        await tx.assessment.deleteMany({ where: { id: { in: assessments.map((item) => item.id) } } });
        await tx.subject.delete({ where: { id } });
      } else if (type === 'parent-subjects' || type === 'parent_subjects') {
        if (!await tx.parentSubject.findUnique({ where: { id } })) throw new NotFoundException('Parent subject / stream not found');
        const linkedCount = await tx.classSubject.count({ where: { parentSubjectId: id } });
        if (linkedCount > 0) throw new BadRequestException('Cannot delete parent subject / stream because it is linked to active class subject assignments. Please remove those subjects or deactivate the stream.');
        await tx.parentSubject.delete({ where: { id } });
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
