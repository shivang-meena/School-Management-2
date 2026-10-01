import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common'; import { createHmac, randomUUID } from 'crypto'; import { ActorType, PaymentMethod, Role, TransactionStatus, TransactionType } from '@prisma/client'; import { PrismaService } from '../prisma/prisma.service';
@Injectable() export class FeesService {
  constructor(private readonly prisma: PrismaService) {}
  async mySummary(actor: any) { const account = await this.prisma.studentFeeAccount.findFirst({ where: { student: { studentId: actor.studentId } }, orderBy: { createdAt: 'desc' } }); if (!account) throw new NotFoundException('Fee account not found'); return this.summary(account.id, actor); }
  async summary(feeAccountId: string, actor: any) { const account = await this.prisma.studentFeeAccount.findUnique({ where: { id: feeAccountId }, include: { student: { include: { enrollments: { where: { status: 'CURRENT' }, orderBy: { effectiveFrom: 'desc' }, take: 1, include: { section: { include: { schoolClass: true } } } } } }, feeStructure: { include: { schoolClass: true } }, academicYear: true, adjustments: true, transactions: { orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }] } } }); if (!account) throw new NotFoundException('Fee account not found'); if (actor.role === Role.STUDENT && actor.studentId !== account.student.studentId) throw new ForbiddenException('Own fee account only'); const adjustments = account.adjustments.reduce((s, a) => s + Number(a.amount), 0), paid = account.transactions.filter((t) => t.status === TransactionStatus.SUCCESS).reduce((s, t) => s + Number(t.amount), 0), reversed = account.transactions.filter((t) => t.status === TransactionStatus.REVERSED && t.reversalOfId).reduce((s, t) => s + Number(t.amount), 0), assessed = Number(account.assessedFee) + adjustments, netPaid = Math.max(paid - reversed, 0); const enrollment = (account.student as any)?.enrollments?.[0]; const className = enrollment?.section?.schoolClass?.name || (account.feeStructure as any)?.schoolClass?.name || ''; const sectionName = enrollment?.section?.name || ''; const rollNumber = enrollment?.rollNumber || ''; return { ...account, className, sectionName, rollNumber, assessed, netPaid, outstanding: Math.max(assessed - netPaid, 0), creditBalance: Math.max(netPaid - assessed, 0) }; }
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
  async createOnlineOrder(feeAccountId: string, amount: number, actor: any) { await this.summary(feeAccountId, actor); if (!(amount > 0) || !Number.isFinite(amount)) throw new BadRequestException('Invalid amount'); const key = process.env.RAZORPAY_KEY_ID, secret = process.env.RAZORPAY_KEY_SECRET; if (!key || !secret) throw new BadRequestException('Razorpay test credentials are not configured'); const localOrderId = `APS-${randomUUID()}`; const apiBaseUrl = (process.env.RAZORPAY_API_BASE_URL || 'https://api.razorpay.com/v1').replace(/\/+$/, ''); const response = await fetch(`${apiBaseUrl}/orders`, { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: Math.round(amount * 100), currency: 'INR', receipt: localOrderId }) }); if (!response.ok) throw new BadRequestException('Payment gateway order creation failed'); const gateway: any = await response.json(); const order = await this.prisma.paymentOrder.create({ data: { localOrderId, gatewayOrderId: gateway.id, feeAccountId, expectedAmount: amount } }); return { orderId: order.id, gatewayOrderId: gateway.id, amount, currency: 'INR', keyId: key };
  }
  async verifyOnline(body: any, actor: any) { const order = await this.prisma.paymentOrder.findUnique({ where: { id: body.orderId }, include: { feeAccount: { include: { student: true } }, transactions: true } }); if (!order) throw new NotFoundException('Payment order not found'); if (actor.role === Role.STUDENT && actor.studentId !== order.feeAccount.student.studentId) throw new ForbiddenException('Own fee account only'); if (order.transactions.some((t) => t.status === TransactionStatus.SUCCESS)) return { status: 'SUCCESS', alreadyProcessed: true }; const secret = process.env.RAZORPAY_KEY_SECRET; if (!secret) throw new BadRequestException('Gateway secret is missing'); const signature = createHmac('sha256', secret).update(`${order.gatewayOrderId}|${body.razorpayPaymentId}`).digest('hex'); if (signature !== body.razorpaySignature) throw new ForbiddenException('Invalid payment signature'); return this.creditOnline(order, body.razorpayPaymentId, actor.id); }
  async updateStudentFee(feeAccountId: string, body: any) {
    const rawAmount = body?.amount;
    const amount = typeof rawAmount === 'number' ? rawAmount : typeof rawAmount === 'string' && rawAmount.trim() ? Number(rawAmount) : NaN;
    if (!Number.isFinite(amount) || amount < 0) {
      throw new BadRequestException('A valid non-negative fee amount is required');
    }
    const account = await this.prisma.studentFeeAccount.findUnique({ where: { id: feeAccountId } });
    if (!account) throw new NotFoundException('Student fee account not found');
    return this.prisma.studentFeeAccount.update({
      where: { id: feeAccountId },
      data: { assessedFee: amount, reviewRequired: false },
      include: {
        student: { include: { enrollments: { where: { status: 'CURRENT' }, orderBy: { effectiveFrom: 'desc' }, take: 1, include: { section: { include: { schoolClass: true } } } } } },
        academicYear: true,
        transactions: { orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }] },
        adjustments: true,
        feeStructure: true,
      },
    });
  }
  async reverseTransaction(id: string, body: any, actorId: string) {
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
    if (!reason) throw new BadRequestException('Reason for reversal is required');
    const tx = await this.prisma.feeTransaction.findUnique({
      where: { id },
      include: { ledgerEntry: true },
    });
    if (!tx) throw new NotFoundException('Fee transaction not found');
    if (tx.status === TransactionStatus.REVERSED) throw new BadRequestException('Transaction is already reversed');
    if (tx.status !== TransactionStatus.SUCCESS) throw new BadRequestException(`Only successful transactions can be reversed (current: ${tx.status})`);

    return this.prisma.$transaction(async (prismaTx) => {
      const todayIso = new Date().toISOString().slice(0, 10);
      const updatedRemarks = tx.remarks
        ? `${tx.remarks} | [REVERSED on ${todayIso}: ${reason}]`
        : `[REVERSED on ${todayIso}: ${reason}]`;

      const updated = await prismaTx.feeTransaction.update({
        where: { id },
        data: {
          status: TransactionStatus.REVERSED,
          remarks: updatedRemarks,
        },
      });

      if (tx.ledgerEntry) {
        await prismaTx.accountTransaction.update({
          where: { id: tx.ledgerEntry.id },
          data: {
            reversedAt: new Date(),
            description: tx.ledgerEntry.description
              ? `${tx.ledgerEntry.description} | [REVERSED: ${reason}]`
              : `[REVERSED: ${reason}]`,
          },
        });
      }

      await prismaTx.auditEvent.create({
        data: {
          actorType: ActorType.USER,
          actorId,
          action: 'FEE_TRANSACTION_REVERSED',
          entityType: 'FeeTransaction',
          entityId: id,
          before: {
            status: tx.status,
            amount: Number(tx.amount),
            remarks: tx.remarks,
          },
          after: {
            status: TransactionStatus.REVERSED,
            amount: Number(tx.amount),
            remarks: updatedRemarks,
          },
          reason,
        },
      });

      return updated;
    });
  }
  async updateTransaction(id: string, body: any, actorId: string) {
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
    if (!reason) throw new BadRequestException('Reason for correction is required');
    const tx = await this.prisma.feeTransaction.findUnique({
      where: { id },
      include: { ledgerEntry: true },
    });
    if (!tx) throw new NotFoundException('Fee transaction not found');
    if (tx.status !== TransactionStatus.SUCCESS) throw new BadRequestException(`Only successful transactions can be edited (current: ${tx.status})`);

    const rawAmount = body?.amount;
    const newAmount = rawAmount !== undefined && rawAmount !== null && rawAmount !== '' ? Number(rawAmount) : Number(tx.amount);
    if (!Number.isFinite(newAmount) || newAmount <= 0) {
      throw new BadRequestException('Payment amount must be greater than 0');
    }

    let paymentDate = tx.paymentDate;
    if (body?.paymentDate) {
      const parsedDate = new Date(body.paymentDate);
      if (Number.isNaN(parsedDate.getTime())) throw new BadRequestException('Valid payment date is required');
      if (body.paymentDate > new Date().toISOString().slice(0, 10)) throw new BadRequestException('Future payment date is not allowed');
      paymentDate = parsedDate;
    }

    const method = body?.method ? (body.method as PaymentMethod) : tx.method;
    const reference = body?.reference !== undefined ? (body.reference ? String(body.reference).trim() : null) : tx.reference;
    const todayIso = new Date().toISOString().slice(0, 10);
    const correctionNote = `[EDITED on ${todayIso}: ${reason}]`;
    const updatedRemarks = body?.remarks !== undefined
      ? (body.remarks ? `${String(body.remarks).trim()} | ${correctionNote}` : correctionNote)
      : (tx.remarks ? `${tx.remarks} | ${correctionNote}` : correctionNote);

    return this.prisma.$transaction(async (prismaTx) => {
      const updated = await prismaTx.feeTransaction.update({
        where: { id },
        data: {
          amount: newAmount,
          paymentDate,
          method,
          reference,
          remarks: updatedRemarks,
        },
      });

      if (tx.ledgerEntry) {
        await prismaTx.accountTransaction.update({
          where: { id: tx.ledgerEntry.id },
          data: {
            amount: newAmount,
            transactionDate: paymentDate,
            title: `Fee receipt ${tx.receiptNo}`,
            description: tx.ledgerEntry.description
              ? `${tx.ledgerEntry.description} | ${correctionNote}`
              : correctionNote,
          },
        });
      }

      await prismaTx.auditEvent.create({
        data: {
          actorType: ActorType.USER,
          actorId,
          action: 'FEE_TRANSACTION_UPDATED',
          entityType: 'FeeTransaction',
          entityId: id,
          before: {
            amount: Number(tx.amount),
            paymentDate: tx.paymentDate,
            method: tx.method,
            reference: tx.reference,
            remarks: tx.remarks,
          },
          after: {
            amount: newAmount,
            paymentDate,
            method,
            reference,
            remarks: updatedRemarks,
          },
          reason,
        },
      });

      return updated;
    });
  }
  private creditOnline(order: any, gatewayPaymentId: string, actorId: string) { return this.prisma.$transaction(async (tx) => { const seq = await tx.idSequence.upsert({ where: { key: 'RECEIPT' }, create: { key: 'RECEIPT', nextValue: 2 }, update: { nextValue: { increment: 1 } } }); const payment = await tx.feeTransaction.create({ data: { feeAccountId: order.feeAccountId, paymentOrderId: order.id, receiptNo: `APS-RCP-${String(seq.nextValue - 1).padStart(7, '0')}`, gatewayPaymentId, amount: order.expectedAmount, paymentDate: new Date(), method: PaymentMethod.ONLINE, status: TransactionStatus.SUCCESS, recordedById: actorId } }); await tx.paymentOrder.update({ where: { id: order.id }, data: { status: TransactionStatus.SUCCESS, verifiedAt: new Date() } }); await tx.accountTransaction.create({ data: { type: TransactionType.INCOME, title: `Online fee ${payment.receiptNo}`, amount: payment.amount, transactionDate: new Date(), sourceType: 'FEE_PAYMENT', sourceReference: `FEE:${payment.id}`, feeTransactionId: payment.id, recordedById: actorId } }); return payment; }); }
}
