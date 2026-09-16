import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { CreateStaffInput, UpdateStaffInput } from '@erp/contracts';

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query?: { designation?: string; search?: string }) {
    const where: any = {};
    if (query?.designation) where.designation = query.designation;
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { staffId: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.staff.findMany({
      where,
      orderBy: { staffId: 'asc' },
    });
  }

  async findOne(id: string) {
    const staff = await this.prisma.staff.findFirst({
      where: {
        OR: [{ id }, { staffId: id }],
      },
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }
    return staff;
  }

  async create(dto: CreateStaffInput) {
    const existing = await this.prisma.staff.findFirst({
      where: {
        OR: [{ staffId: dto.staffId }, { email: dto.email }],
      },
    });
    if (existing) {
      throw new ConflictException('Staff ID or Email already exists');
    }

    const defaultPassword = dto.password || 'staff123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        userId: dto.staffId,
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: Role.STAFF,
      },
    });

    return this.prisma.staff.create({
      data: {
        staffId: dto.staffId,
        name: dto.name,
        designation: dto.designation,
        joiningDate: dto.joiningDate,
        baseSalary: dto.baseSalary,
        mobile: dto.mobile,
        email: dto.email,
        address: dto.address,
        assignedClass: dto.assignedClass || null,
        assignedSection: dto.assignedSection || null,
        assignedSubject: dto.assignedSubject || null,
        userId: user.id,
      },
    });
  }

  async update(id: string, dto: UpdateStaffInput) {
    const staff = await this.findOne(id);
    return this.prisma.staff.update({
      where: { id: staff.id },
      data: dto as any,
    });
  }

  async remove(id: string) {
    const staff = await this.findOne(id);
    if (staff.userId) {
      await this.prisma.user.delete({ where: { id: staff.userId } });
    }
    return this.prisma.staff.delete({ where: { id: staff.id } });
  }

  async calculateSalary(staffId: string, workingDays: number, absentDays: number, bonusDeduction: number = 0) {
    const staff = await this.findOne(staffId);
    const perDaySalary = staff.baseSalary / (workingDays || 30);
    const absentDeduction = absentDays * perDaySalary;
    const finalSalary = staff.baseSalary - absentDeduction + Number(bonusDeduction);

    return {
      staffId: staff.staffId,
      name: staff.name,
      baseSalary: staff.baseSalary,
      workingDays,
      absentDays,
      presentDays: workingDays - absentDays,
      perDaySalary: Math.round(perDaySalary),
      absentDeduction: Math.round(absentDeduction),
      adjustment: bonusDeduction,
      finalSalary: Math.round(finalSalary),
    };
  }
}
