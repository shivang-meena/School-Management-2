import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ActorType, EnrollmentStatus, RegistrationStatus, Role, StudentStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { CreateStudentInput, PendingRegistrationInput, UpdateStudentInput } from '@erp/contracts';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: any = {}) {
    return this.prisma.student.findMany({
      where: { status: query.status || undefined, OR: query.search ? [{ name: { contains: query.search, mode: 'insensitive' } }, { studentId: { contains: query.search, mode: 'insensitive' } }] : undefined,
        enrollments: query.sectionId ? { some: { sectionId: query.sectionId, status: EnrollmentStatus.CURRENT } } : undefined },
      include: { enrollments: { include: { section: { include: { schoolClass: true } }, academicYear: true }, orderBy: { effectiveFrom: 'desc' } } },
      orderBy: { studentId: 'asc' }, take: Math.min(Number(query.limit) || 50, 100), skip: Number(query.offset) || 0,
    });
  }

  async findOne(id: string, actor: any) {
    const student = await this.prisma.student.findFirst({ where: { OR: [{ id }, { studentId: id }] }, include: { user: { select: { loginId: true, email: true, mustChangePassword: true } }, enrollments: { include: { section: { include: { schoolClass: true } }, academicYear: true }, orderBy: { effectiveFrom: 'desc' } }, feeAccounts: { include: { transactions: true, adjustments: true } }, results: { include: { assessment: true } } } });
    if (!student) throw new NotFoundException('Student not found');
    if (actor.role === Role.STUDENT && actor.studentId !== student.studentId) throw new ForbiddenException('You can only view your own record');
    if (actor.role === Role.EMPLOYEE) {
      const sectionIds = student.enrollments.filter((e) => e.status === EnrollmentStatus.CURRENT).map((e) => e.sectionId);
      const assigned = await this.prisma.teacherAssignment.count({ where: { employeeId: actor.employeeDbId, sectionId: { in: sectionIds } } });
      if (!assigned) throw new ForbiddenException('Student is outside your assigned sections');
      return { id: student.id, studentId: student.studentId, name: student.name, status: student.status, enrollments: student.enrollments, results: student.results.filter((r) => r.assessment.published) };
    }
    return student;
  }

  async create(dto: CreateStudentInput, actorId: string) {
    const temporaryPassword = dto.password || 'Arihant@2026';
    return this.prisma.$transaction(async (tx) => {
      const sequence = await tx.idSequence.upsert({ where: { key: 'STUDENT' }, create: { key: 'STUDENT', nextValue: 2 }, update: { nextValue: { increment: 1 } } });
      const studentId = `STU${String(sequence.nextValue - 1).padStart(6, '0')}`;
      const duplicateRoll = await tx.studentEnrollment.count({ where: { academicYearId: dto.academicYearId, sectionId: dto.sectionId, rollNumber: dto.rollNumber, status: EnrollmentStatus.CURRENT } });
      if (duplicateRoll) throw new ConflictException('Roll number is already active in this section and year');
      const user = await tx.user.create({ data: { loginId: studentId, name: dto.name, email: dto.email || null, passwordHash: await bcrypt.hash(temporaryPassword, 12), role: Role.STUDENT, mustChangePassword: false } });
      const student = await tx.student.create({ data: { studentId, userId: user.id, name: dto.name, dob: new Date(dto.dob), gender: dto.gender, mobile: dto.mobile || null, email: dto.email || null, address: dto.address, guardianName: dto.guardianName, guardianContact: dto.guardianContact, admissionDate: new Date(dto.admissionDate) } });
      const enrollment = await tx.studentEnrollment.create({ data: { studentId: student.id, academicYearId: dto.academicYearId, sectionId: dto.sectionId, rollNumber: dto.rollNumber, effectiveFrom: new Date(dto.admissionDate) } });
      const section = await tx.section.findUnique({ where: { id: dto.sectionId } });
      const structure = section ? await tx.classFeeStructure.findUnique({ where: { classId_academicYearId: { classId: section.classId, academicYearId: dto.academicYearId } } }) : null;
      if (!structure) throw new BadRequestException('Active class fee structure is required before enrollment');
      await tx.studentFeeAccount.create({ data: { studentId: student.id, academicYearId: dto.academicYearId, feeStructureId: structure.id, assessedFee: structure.totalFee } });
      await tx.auditEvent.create({ data: { actorType: ActorType.USER, actorId, action: 'STUDENT_CREATED', entityType: 'Student', entityId: student.id, after: { studentId, enrollmentId: enrollment.id } } });
      return { student, temporaryCredentials: { loginId: studentId, password: temporaryPassword } };
    });
  }

  async update(id: string, dto: UpdateStudentInput, actorId: string) {
    const previous = await this.prisma.student.findFirst({ where: { OR: [{ id }, { studentId: id }] } });
    if (!previous) throw new NotFoundException('Student not found');
    const { academicYearId, sectionId, rollNumber, ...profile } = dto;
    const student = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.student.update({ where: { id: previous.id }, data: { ...profile, dob: profile.dob ? new Date(profile.dob) : undefined, admissionDate: profile.admissionDate ? new Date(profile.admissionDate) : undefined, mobile: profile.mobile === '' ? null : profile.mobile, email: profile.email === '' ? null : profile.email } });
      await tx.user.update({ where: { id: previous.userId }, data: { name: profile.name, email: profile.email === '' ? null : profile.email } });
      if (academicYearId || sectionId || rollNumber) {
        const enrollment = await tx.studentEnrollment.findFirst({ where: { studentId: previous.id, status: EnrollmentStatus.CURRENT }, orderBy: { effectiveFrom: 'desc' } });
        if (!enrollment) throw new NotFoundException('Current enrollment not found');
        const nextYearId = academicYearId || enrollment.academicYearId, nextSectionId = sectionId || enrollment.sectionId, nextRoll = rollNumber || enrollment.rollNumber;
        const duplicate = await tx.studentEnrollment.count({ where: { id: { not: enrollment.id }, academicYearId: nextYearId, sectionId: nextSectionId, rollNumber: nextRoll, status: EnrollmentStatus.CURRENT } });
        if (duplicate) throw new ConflictException('Roll number is already active in this section and year');
        await tx.studentEnrollment.update({ where: { id: enrollment.id }, data: { academicYearId: nextYearId, sectionId: nextSectionId, rollNumber: nextRoll } });
      }
      return updated;
    });
    await this.audit(actorId, 'STUDENT_UPDATED', student.id, previous, student); return student;
  }

  async resetPassword(id: string, password: string, actorId: string) {
    const student = await this.prisma.student.findFirst({ where: { OR: [{ id }, { studentId: id }] } }); if (!student) throw new NotFoundException('Student not found');
    if (!password || password.length < 8) throw new BadRequestException('Password must have at least 8 characters');
    await this.prisma.$transaction([this.prisma.user.update({ where: { id: student.userId }, data: { passwordHash: await bcrypt.hash(password, 12), mustChangePassword: false, loginAttempts: 0, lockedUntil: null, sessionVersion: { increment: 1 } } }), this.prisma.session.updateMany({ where: { userId: student.userId, revokedAt: null }, data: { revokedAt: new Date() } }), this.prisma.auditEvent.create({ data: { actorType: ActorType.USER, actorId, action: 'STUDENT_PASSWORD_RESET', entityType: 'Student', entityId: student.id } })]);
    return { message: 'Password updated', loginId: student.studentId };
  }

  async deactivate(id: string, actorId: string, reason: string) {
    if (!reason) throw new BadRequestException('Reason is required');
    const student = await this.prisma.student.findFirst({ where: { OR: [{ id }, { studentId: id }] } });
    if (!student) throw new NotFoundException('Student not found');
    await this.prisma.$transaction([
      this.prisma.student.update({ where: { id: student.id }, data: { status: StudentStatus.INACTIVE } }),
      this.prisma.user.update({ where: { id: student.userId }, data: { status: 'INACTIVE', sessionVersion: { increment: 1 } } }),
      this.prisma.session.updateMany({ where: { userId: student.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
      this.prisma.auditEvent.create({ data: { actorType: ActorType.USER, actorId, action: 'STUDENT_DEACTIVATED', entityType: 'Student', entityId: student.id, reason } }),
    ]);
    return { message: 'Student deactivated; history retained' };
  }

  submitPendingRegistration(dto: PendingRegistrationInput) { return this.prisma.pendingRegistration.create({ data: { ...dto, email: dto.email || null, mobile: dto.mobile || null, dob: new Date(dto.dob) } }); }
  getPendingRegistrations() { return this.prisma.pendingRegistration.findMany({ orderBy: { submittedAt: 'desc' } }); }
  async rejectRegistration(id: string, reason: string) { if (!reason) throw new BadRequestException('Rejection reason required'); return this.prisma.pendingRegistration.update({ where: { id }, data: { status: RegistrationStatus.REJECTED, rejectionReason: reason, reviewedAt: new Date() } }); }

  private audit(actorId: string, action: string, entityId: string, before: any, after: any) { return this.prisma.auditEvent.create({ data: { actorType: ActorType.USER, actorId, action, entityType: 'Student', entityId, before, after } }); }
}
