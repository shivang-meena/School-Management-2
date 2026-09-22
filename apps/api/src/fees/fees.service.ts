import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common'; import { createHmac, randomUUID } from 'crypto'; import { PaymentMethod, Role, TransactionStatus, TransactionType } from '@prisma/client'; import { PrismaService } from '../prisma/prisma.service';
@Injectable() export class FeesService {
  constructor(private readonly prisma: PrismaService) {}
  async mySummary(actor: any) { const account = await this.prisma.studentFeeAccount.findFirst({ where: { student: { studentId: actor.studentId } }, orderBy: { createdAt: 'desc' } }); if (!account) throw new NotFoundException('Fee account not found'); return this.summary(account.id, actor); }
  async summary(feeAccountId: string, actor: any) { const account = await this.prisma.studentFeeAccount.findUnique({ where: { id: feeAccountId }, include: { student: true, academicYear: true, adjustments: true, transactions: true } }); if (!account) throw new NotFoundException('Fee account not found'); if (actor.role === Role.STUDENT && actor.studentId !== account.student.studentId) throw new ForbiddenException('Own fee account only'); const adjustments = account.adjustments.reduce((s, a) => s + Number(a.amount), 0), paid = account.transactions.filter((t) => t.status === TransactionStatus.SUCCESS).reduce((s, t) => s + Number(t.amount), 0), reversed = account.transactions.filter((t) => t.status === TransactionStatus.REVERSED).reduce((s, t) => s + Number(t.amount), 0), assessed = Number(account.assessedFee) + adjustments, netPaid = paid - reversed; return { ...account, assessed, netPaid, outstanding: Math.max(assessed - netPaid, 0), creditBalance: Math.max(netPaid - assessed, 0) }; }
  structures() { return this.prisma.classFeeStructure.findMany({ include: { schoolClass: true, academicYear: true }, orderBy: { createdAt: 'desc' } }); }
  accounts() { return this.prisma.studentFeeAccount.findMany({ include: { student: { include: { enrollments: { where: { status: 'CURRENT' }, orderBy: { effectiveFrom: 'desc' }, take: 1, include: { section: { include: { schoolClass: true } } } } } }, academicYear: true, transactions: { orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }] }, adjustments: true, feeStructure: true }, orderBy: { createdAt: 'desc' } }); }
  async upsertStructure(body: any) {
    const classId = typeof body?.classId === 'string' ? body.classId.trim() : '';
    const academicYearId = typeof body?.academicYearId === 'string' ? body.academicYearId.trim() : '';
    const rawFee = body?.totalFee;
    const totalFee = typeof rawFee === 'number' ? rawFee : typeof rawFee === 'string' && rawFee.trim() ? Number(rawFee) : NaN;
    const updateExistingStudents = body?.updateExistingStudents === true;
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuid.test(classId) || !uuid.test(academicYearId) || !Number.isFinite(totalFee) || totalFee < 0) throw new BadRequestException('Valid class, academic year and non-negative fee are required');
    let schoolClass: { id: string } | null;
    let academicYear: { id: string } | null;
    try {
      [schoolClass, academicYear] = await Promise.all([
        this.prisma.schoolClass.findUnique({ where: { id: classId }, select: { id: true } }),
        this.prisma.academicYear.findUnique({ where: { id: academicYearId }, select: { id: true } }),
      ]);
    } catch {
      throw new InternalServerErrorException('Class fee data could not be checked. Please try again.');
    }
    if (!schoolClass) throw new NotFoundException('Selected class was not found');
    if (!academicYear) throw new NotFoundException('Selected academic year was not found');
    try {
      return await this.prisma.$transaction(async (tx) => {
        const structure = await tx.classFeeStructure.upsert({
          where: { classId_academicYearId: { classId, academicYearId } },
          create: { totalFee, schoolClass: { connect: { id: classId } }, academicYear: { connect: { id: academicYearId } } },
          update: { totalFee, active: true },
        });
        if (updateExistingStudents) {
          await tx.studentFeeAccount.updateMany({ where: { feeStructureId: structure.id, academicYearId }, data: { assessedFee: totalFee, reviewRequired: false } });
        }
        return structure;
      });
    } catch {
      throw new InternalServerErrorException('Class fee could not be saved. Please try again.');
    }
  }
  async manualPayment(body: any, actorId: string) { await this.summary(body.feeAccountId, { role: Role.ADMIN }); if (!(body.amount > 0)) throw new BadRequestException('Payment amount must be positive'); if (body.date > new Date().toISOString().slice(0, 10)) throw new BadRequestException('Future payment date is not allowed'); return this.prisma.$transaction(async (tx) => { const seq = await tx.idSequence.upsert({ where: { key: 'RECEIPT' }, create: { key: 'RECEIPT', nextValue: 2 }, update: { nextValue: { increment: 1 } } }); const status = body.method === PaymentMethod.CHEQUE ? TransactionStatus.PENDING : TransactionStatus.SUCCESS; const payment = await tx.feeTransaction.create({ data: { feeAccountId: body.feeAccountId, receiptNo: `APS-RCP-${String(seq.nextValue - 1).padStart(7, '0')}`, amount: body.amount, paymentDate: new Date(body.date), method: body.method, status, reference: body.reference, remarks: body.remarks, idempotencyKey: body.idempotencyKey, recordedById: actorId } }); if (status === TransactionStatus.SUCCESS) await tx.accountTransaction.create({ data: { type: TransactionType.INCOME, title: `Fee receipt ${payment.receiptNo}`, amount: body.amount, transactionDate: new Date(body.date), sourceType: 'FEE_PAYMENT', sourceReference: `FEE:${payment.id}`, feeTransactionId: payment.id, recordedById: actorId } }); return payment; }); }
  async createOnlineOrder(feeAccountId: string, amount: number, actor: any) { const summary = await this.summary(feeAccountId, actor); if (!(amount > 0) || amount > summary.outstanding) throw new BadRequestException('Invalid amount'); const key = process.env.RAZORPAY_KEY_ID, secret = process.env.RAZORPAY_KEY_SECRET; if (!key || !secret) throw new BadRequestException('Razorpay test credentials are not configured'); const localOrderId = `APS-${randomUUID()}`; const response = await fetch('https://api.razorpay.com/v1/orders', { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: Math.round(amount * 100), currency: 'INR', receipt: localOrderId }) }); if (!response.ok) throw new BadRequestException('Payment gateway order creation failed'); const gateway: any = await response.json(); const order = await this.prisma.paymentOrder.create({ data: { localOrderId, gatewayOrderId: gateway.id, feeAccountId, expectedAmount: amount } }); return { orderId: order.id, gatewayOrderId: gateway.id, amount, currency: 'INR', keyId: key };
  }
  async verifyOnline(body: any, actor: any) { const order = await this.prisma.paymentOrder.findUnique({ where: { id: body.orderId }, include: { feeAccount: { include: { student: true } }, transactions: true } }); if (!order) throw new NotFoundException('Payment order not found'); if (actor.role === Role.STUDENT && actor.studentId !== order.feeAccount.student.studentId) throw new ForbiddenException('Own fee account only'); if (order.transactions.some((t) => t.status === TransactionStatus.SUCCESS)) return { status: 'SUCCESS', alreadyProcessed: true }; const secret = process.env.RAZORPAY_KEY_SECRET; if (!secret) throw new BadRequestException('Gateway secret is missing'); const signature = createHmac('sha256', secret).update(`${order.gatewayOrderId}|${body.razorpayPaymentId}`).digest('hex'); if (signature !== body.razorpaySignature) throw new ForbiddenException('Invalid payment signature'); return this.creditOnline(order, body.razorpayPaymentId, actor.id); }
  private creditOnline(order: any, gatewayPaymentId: string, actorId: string) { return this.prisma.$transaction(async (tx) => { const seq = await tx.idSequence.upsert({ where: { key: 'RECEIPT' }, create: { key: 'RECEIPT', nextValue: 2 }, update: { nextValue: { increment: 1 } } }); const payment = await tx.feeTransaction.create({ data: { feeAccountId: order.feeAccountId, paymentOrderId: order.id, receiptNo: `APS-RCP-${String(seq.nextValue - 1).padStart(7, '0')}`, gatewayPaymentId, amount: order.expectedAmount, paymentDate: new Date(), method: PaymentMethod.ONLINE, status: TransactionStatus.SUCCESS, recordedById: actorId } }); await tx.paymentOrder.update({ where: { id: order.id }, data: { status: TransactionStatus.SUCCESS, verifiedAt: new Date() } }); await tx.accountTransaction.create({ data: { type: TransactionType.INCOME, title: `Online fee ${payment.receiptNo}`, amount: payment.amount, transactionDate: new Date(), sourceType: 'FEE_PAYMENT', sourceReference: `FEE:${payment.id}`, feeTransactionId: payment.id, recordedById: actorId } }); return payment; }); }
}
