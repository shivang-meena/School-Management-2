import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'; import { ActorType, TransactionType } from '@prisma/client'; import { CreateTransactionInput } from '@erp/contracts'; import { PrismaService } from '../prisma/prisma.service'; @Injectable() export class AccountsService { constructor(private readonly prisma: PrismaService) {} list(query: any) { return this.prisma.accountTransaction.findMany({ where: { type: query.type || undefined, transactionDate: { gte: query.from ? new Date(query.from) : undefined, lte: query.to ? new Date(query.to) : undefined } }, orderBy: { transactionDate: 'desc' }, take: Math.min(Number(query.limit) || 100, 200) }); } create(dto: CreateTransactionInput, actorId: string) { return this.prisma.accountTransaction.create({ data: { type: dto.type, title: dto.title, amount: dto.amount, transactionDate: new Date(dto.date), description: dto.description, sourceType: 'MANUAL', sourceReference: `MANUAL:${dto.idempotencyKey}`, recordedById: actorId } }); } async summary(query: any) { const rows = await this.list(query); const income = rows.filter((r) => r.type === 'INCOME' && !r.reversedAt).reduce((s, r) => s + Number(r.amount), 0), expense = rows.filter((r) => r.type === 'EXPENSE' && !r.reversedAt).reduce((s, r) => s + Number(r.amount), 0); return { income, expense, balance: income - expense, transactions: rows }; }
  async reverse(id: string, body: any, actorId: string) {
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
    if (!reason) throw new BadRequestException('Reason for reversal is required');
    const tx = await this.prisma.accountTransaction.findUnique({ where: { id } });
    if (!tx) throw new NotFoundException('Account transaction not found');
    if (tx.reversedAt) throw new BadRequestException('Transaction is already reversed / cancelled');
    if (tx.feeTransactionId) {
      throw new BadRequestException('This transaction was created from a student fee receipt. Please reverse it from the Student Fees section.');
    }
    if (tx.salaryPaymentId) {
      throw new BadRequestException('This transaction was created from an employee salary payment. Please reverse it from the Salary section.');
    }
    return this.prisma.$transaction(async (prismaTx) => {
      const todayIso = new Date().toISOString().slice(0, 10);
      const updatedDesc = tx.description ? `${tx.description} | [REVERSED on ${todayIso}: ${reason}]` : `[REVERSED on ${todayIso}: ${reason}]`;
      const updated = await prismaTx.accountTransaction.update({
        where: { id },
        data: { reversedAt: new Date(), description: updatedDesc },
      });
      await prismaTx.auditEvent.create({
        data: {
          actorType: ActorType.USER,
          actorId,
          action: 'ACCOUNT_TRANSACTION_REVERSED',
          entityType: 'AccountTransaction',
          entityId: id,
          before: { title: tx.title, type: tx.type, amount: Number(tx.amount), transactionDate: tx.transactionDate, description: tx.description, reversedAt: tx.reversedAt },
          after: { title: tx.title, type: tx.type, amount: Number(tx.amount), transactionDate: tx.transactionDate, description: updatedDesc, reversedAt: updated.reversedAt },
          reason,
        },
      });
      return updated;
    });
  }
  async update(id: string, body: any, actorId: string) {
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
    if (!reason) throw new BadRequestException('Reason for correction is required');
    const tx = await this.prisma.accountTransaction.findUnique({ where: { id } });
    if (!tx) throw new NotFoundException('Account transaction not found');
    if (tx.reversedAt) throw new BadRequestException('Cannot edit a reversed / cancelled transaction');
    if (tx.feeTransactionId) {
      throw new BadRequestException('This transaction was created from a student fee receipt. Please edit it from the Student Fees section.');
    }
    if (tx.salaryPaymentId) {
      throw new BadRequestException('This transaction was created from an employee salary payment. Please edit it from the Salary section.');
    }
    const rawAmount = body?.amount;
    const newAmount = rawAmount !== undefined && rawAmount !== null && rawAmount !== '' ? Number(rawAmount) : Number(tx.amount);
    if (!Number.isFinite(newAmount) || newAmount <= 0) {
      throw new BadRequestException('Valid positive amount is required');
    }
    const title = typeof body?.title === 'string' && body.title.trim() ? body.title.trim() : tx.title;
    const type = body?.type && (body.type === TransactionType.INCOME || body.type === TransactionType.EXPENSE) ? body.type : tx.type;
    let transactionDate = tx.transactionDate;
    if (body?.date || body?.transactionDate) {
      const dateVal = body.date || body.transactionDate;
      const parsed = new Date(dateVal);
      if (Number.isNaN(parsed.getTime())) throw new BadRequestException('Valid transaction date is required');
      transactionDate = parsed;
    }
    const todayIso = new Date().toISOString().slice(0, 10);
    const correctionNote = `[EDITED on ${todayIso}: ${reason}]`;
    const baseDesc = body?.description !== undefined ? String(body.description || '').trim() : (tx.description || '');
    const updatedDesc = baseDesc ? `${baseDesc} | ${correctionNote}` : correctionNote;
    return this.prisma.$transaction(async (prismaTx) => {
      const updated = await prismaTx.accountTransaction.update({
        where: { id },
        data: { title, type, amount: newAmount, transactionDate, description: updatedDesc },
      });
      await prismaTx.auditEvent.create({
        data: {
          actorType: ActorType.USER,
          actorId,
          action: 'ACCOUNT_TRANSACTION_UPDATED',
          entityType: 'AccountTransaction',
          entityId: id,
          before: { title: tx.title, type: tx.type, amount: Number(tx.amount), transactionDate: tx.transactionDate, description: tx.description },
          after: { title, type, amount: newAmount, transactionDate, description: updatedDesc },
          reason,
        },
      });
      return updated;
    });
  }
}
