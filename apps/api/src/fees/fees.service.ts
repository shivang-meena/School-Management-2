import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecordPaymentInput, PaymentMethodEnum } from '@erp/contracts';

@Injectable()
export class FeesService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllPayments() {
    return this.prisma.feePayment.findMany({
      include: {
        student: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFeeOverview() {
    const students = await this.prisma.student.findMany();
    const payments = await this.prisma.feePayment.findMany();

    const totalExpected = students.reduce((sum, s) => sum + s.totalFee, 0);
    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalPending = totalExpected - totalCollected;

    return {
      totalExpected,
      totalCollected,
      totalPending,
      totalStudents: students.length,
      paidInFull: students.filter((s) => s.paidAmount >= s.totalFee).length,
      partialPaid: students.filter((s) => s.paidAmount > 0 && s.paidAmount < s.totalFee).length,
      unpaid: students.filter((s) => s.paidAmount === 0).length,
    };
  }

  async recordPayment(dto: RecordPaymentInput) {
    const student = await this.prisma.student.findUnique({
      where: { studentId: dto.studentId },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Generate unique receipt number
    const count = await this.prisma.feePayment.count();
    const receiptNo = `RCP${String(count + 1).padStart(3, '0')}`;

    const payment = await this.prisma.feePayment.create({
      data: {
        receiptNo,
        studentId: dto.studentId,
        amount: dto.amount,
        date: dto.date || new Date().toISOString().split('T')[0],
        method: dto.method as any,
        remarks: dto.remarks || null,
      },
    });

    // Update student's paidAmount
    const newPaidAmount = student.paidAmount + dto.amount;
    await this.prisma.student.update({
      where: { studentId: dto.studentId },
      data: { paidAmount: newPaidAmount },
    });

    return payment;
  }

  async getStudentFeeSummary(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { studentId },
      include: { feePayments: { orderBy: { date: 'desc' } } },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const pending = student.totalFee - student.paidAmount;
    let status = 'Unpaid';
    if (pending <= 0) status = 'Paid';
    else if (student.paidAmount > 0) status = 'Partial';

    return {
      studentId: student.studentId,
      name: student.name,
      class: student.class,
      section: student.section,
      totalFee: student.totalFee,
      paidAmount: student.paidAmount,
      pendingFee: Math.max(0, pending),
      status,
      payments: student.feePayments,
    };
  }
}
