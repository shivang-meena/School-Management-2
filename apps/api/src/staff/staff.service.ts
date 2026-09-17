import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ActorType, EmployeeStatus, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { CreateStaffInput, UpdateStaffInput } from '@erp/contracts';
import { PrismaService } from '../prisma/prisma.service';

@Injectable() export class StaffService {
  constructor(private readonly prisma: PrismaService) {}
  findAll(query: any = {}) { return this.prisma.employee.findMany({ where: { status: query.status || undefined, subRole: query.subRole || undefined, OR: query.search ? [{ name: { contains: query.search, mode: 'insensitive' } }, { employeeId: { contains: query.search, mode: 'insensitive' } }] : undefined }, include: { primarySubject: { select: { name: true, code: true } }, teachingAssignments: { include: { subject: { select: { name: true, code: true } } }, orderBy: { effectiveFrom: 'desc' }, take: 1 }, salaryRevisions: { orderBy: { effectiveDate: 'desc' }, take: 1 } }, take: Math.min(Number(query.limit) || 50, 100), skip: Number(query.offset) || 0, orderBy: { employeeId: 'asc' } }); }
  async findOne(id: string, actor: any) {
    const employee = await this.prisma.employee.findFirst({ where: { OR: [{ id }, { employeeId: id }, { legacyStaffId: id }] }, include: { salaryRevisions: { orderBy: { effectiveDate: 'desc' } }, teachingAssignments: { include: { section: { include: { schoolClass: true } }, subject: true } }, classTeacherAssignments: { include: { section: { include: { schoolClass: true } } } }, monthlySalaries: { include: { payments: true }, orderBy: [{ year: 'desc' }, { month: 'desc' }] } } });
    if (!employee) throw new NotFoundException('Employee not found');
    if (actor.role === Role.EMPLOYEE && actor.employeeId !== employee.employeeId) throw new ForbiddenException('You can only view your own employee record');
    return employee;
  }
  async create(dto: CreateStaffInput, actorId: string) {
      const temporaryPassword = dto.password || 'Arihant@2026';
    return this.prisma.$transaction(async (tx) => {
      const seq = await tx.idSequence.upsert({ where: { key: 'EMPLOYEE' }, create: { key: 'EMPLOYEE', nextValue: 2 }, update: { nextValue: { increment: 1 } } });
      const employeeId = `EMP${String(seq.nextValue - 1).padStart(6, '0')}`;
      const user = await tx.user.create({ data: { loginId: employeeId, name: dto.name, email: dto.email || null, passwordHash: await bcrypt.hash(temporaryPassword, 12), role: Role.EMPLOYEE, mustChangePassword: false } });
      if (dto.subRole === 'TEACHER' && !dto.primarySubjectId) throw new BadRequestException('Teacher subject is required');
      if (dto.primarySubjectId && !await tx.subject.findUnique({ where: { id: dto.primarySubjectId } })) throw new BadRequestException('Selected subject not found');
      const employee = await tx.employee.create({ data: { employeeId, userId: user.id, name: dto.name, mobile: dto.mobile || null, email: dto.email || null, address: dto.address, subRole: dto.subRole, designation: dto.designation, primarySubjectId: dto.subRole === 'TEACHER' ? dto.primarySubjectId : null, joiningDate: new Date(dto.joiningDate), canMarkStudentAttendance: dto.canMarkStudentAttendance, canMarkEmployeeAttendance: dto.canMarkEmployeeAttendance } });
      await tx.salaryRevision.create({ data: { employeeId: employee.id, amount: dto.baseSalary, effectiveDate: new Date(dto.joiningDate), reason: 'Initial salary', changedById: actorId } });
      await tx.auditEvent.create({ data: { actorType: ActorType.USER, actorId, action: 'EMPLOYEE_CREATED', entityType: 'Employee', entityId: employee.id, after: { employeeId, subRole: employee.subRole } } });
      return { employee, temporaryCredentials: { loginId: employeeId, password: temporaryPassword } };
    });
  }
  async setPassword(id: string, password: string, actorId: string) {
    if (!password || password.length < 8) throw new BadRequestException('Password must have at least 8 characters');
    const employee = await this.prisma.employee.findFirst({ where: { OR: [{ id }, { employeeId: id }] } }); if (!employee) throw new NotFoundException('Employee not found');
    await this.prisma.$transaction([this.prisma.user.update({ where: { id: employee.userId }, data: { passwordHash: await bcrypt.hash(password, 12), mustChangePassword: false, loginAttempts: 0, lockedUntil: null, sessionVersion: { increment: 1 } } }), this.prisma.session.updateMany({ where: { userId: employee.userId, revokedAt: null }, data: { revokedAt: new Date() } }), this.prisma.auditEvent.create({ data: { actorType: ActorType.USER, actorId, action: 'EMPLOYEE_PASSWORD_RESET', entityType: 'Employee', entityId: employee.id } })]);
    return { message: 'Password updated', loginId: employee.employeeId };
  }
  async update(id: string, dto: UpdateStaffInput, actorId: string) {
    const employee = await this.prisma.employee.findFirst({ where: { OR: [{ id }, { employeeId: id }] } }); if (!employee) throw new NotFoundException('Employee not found');
    const updated = await this.prisma.employee.update({ where: { id: employee.id }, data: { ...dto, joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : undefined, email: dto.email || undefined } });
    await this.prisma.auditEvent.create({ data: { actorType: ActorType.USER, actorId, action: 'EMPLOYEE_UPDATED', entityType: 'Employee', entityId: employee.id, before: employee, after: updated } }); return updated;
  }
  async addSalaryRevision(id: string, body: any, actorId: string) { const employee = await this.prisma.employee.findFirst({ where: { OR: [{ id }, { employeeId: id }] } }); if (!employee) throw new NotFoundException('Employee not found'); if (!(body.amount > 0) || !body.reason) throw new BadRequestException('Positive amount and reason required'); return this.prisma.salaryRevision.create({ data: { employeeId: employee.id, amount: body.amount, effectiveDate: new Date(body.effectiveDate), reason: body.reason, changedById: actorId } }); }
  async deactivate(id: string, actorId: string, reason: string) { if (!reason) throw new BadRequestException('Reason required'); const employee = await this.prisma.employee.findFirst({ where: { OR: [{ id }, { employeeId: id }] } }); if (!employee) throw new NotFoundException('Employee not found'); const activeAssignments = await this.prisma.classTeacherAssignment.count({ where: { employeeId: employee.id, OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }] } }); if (activeAssignments) throw new BadRequestException('Resolve active class-teacher assignments first'); await this.prisma.$transaction([this.prisma.employee.update({ where: { id: employee.id }, data: { status: EmployeeStatus.INACTIVE, leavingDate: new Date() } }), this.prisma.user.update({ where: { id: employee.userId }, data: { status: 'INACTIVE', sessionVersion: { increment: 1 } } }), this.prisma.session.updateMany({ where: { userId: employee.userId, revokedAt: null }, data: { revokedAt: new Date() } }), this.prisma.auditEvent.create({ data: { actorType: ActorType.USER, actorId, action: 'EMPLOYEE_DEACTIVATED', entityType: 'Employee', entityId: employee.id, reason } })]); return { message: 'Employee deactivated; history retained' }; }
}
