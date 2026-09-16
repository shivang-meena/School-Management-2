import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { CreateStudentInput, UpdateStudentInput, PendingRegistrationInput } from '@erp/contracts';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query?: { class?: string; section?: string; search?: string }) {
    const where: any = {};
    if (query?.class) where.class = query.class;
    if (query?.section) where.section = query.section;
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { studentId: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.student.findMany({
      where,
      include: {
        feePayments: true,
        examResults: { include: { exam: true } },
      },
      orderBy: { rollNo: 'asc' },
    });
  }

  async findOne(id: string) {
    const student = await this.prisma.student.findFirst({
      where: {
        OR: [{ id }, { studentId: id }],
      },
      include: {
        feePayments: true,
        examResults: { include: { exam: true } },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }
    return student;
  }

  async create(dto: CreateStudentInput) {
    const existing = await this.prisma.student.findFirst({
      where: {
        OR: [{ studentId: dto.studentId }, { email: dto.email }],
      },
    });
    if (existing) {
      throw new ConflictException('Student ID or Email already exists');
    }

    const defaultPassword = dto.password || 'student123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        userId: dto.studentId,
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: Role.STUDENT,
      },
    });

    return this.prisma.student.create({
      data: {
        studentId: dto.studentId,
        name: dto.name,
        dob: dto.dob,
        gender: dto.gender,
        mobile: dto.mobile,
        email: dto.email,
        address: dto.address,
        previousSchool: dto.previousSchool || null,
        class: dto.class,
        section: dto.section,
        rollNo: dto.rollNo,
        parentName: dto.parentName,
        parentMobile: dto.parentMobile,
        userId: user.id,
      },
    });
  }

  async update(id: string, dto: UpdateStudentInput) {
    const student = await this.findOne(id);
    return this.prisma.student.update({
      where: { id: student.id },
      data: dto as any,
    });
  }

  async remove(id: string) {
    const student = await this.findOne(id);
    if (student.userId) {
      await this.prisma.user.delete({ where: { id: student.userId } });
    }
    return this.prisma.student.delete({ where: { id: student.id } });
  }

  async submitPendingRegistration(dto: PendingRegistrationInput) {
    return this.prisma.pendingRegistration.create({
      data: {
        ...dto,
        status: 'Pending',
        submittedDate: new Date().toISOString().split('T')[0],
      },
    });
  }

  async getPendingRegistrations() {
    return this.prisma.pendingRegistration.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateRegistrationStatus(id: string, status: string) {
    return this.prisma.pendingRegistration.update({
      where: { id },
      data: { status },
    });
  }

  async getClasses() {
    return this.prisma.classRoom.findMany();
  }
}
