import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionInput, TransactionTypeEnum } from '@erp/contracts';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    // 1. Fee collections
    const feePayments = await this.prisma.feePayment.findMany();
    const totalFeesCollected = feePayments.reduce((sum, p) => sum + p.amount, 0);

    // 2. Staff salaries
    const staff = await this.prisma.staff.findMany();
    const totalMonthlySalary = staff.reduce((sum, s) => sum + s.baseSalary, 0);

    // 3. Transactions
    const transactions = await this.prisma.accountTransaction.findMany({
      orderBy: { date: 'desc' },
    });

    const expenses = transactions.filter((t) => t.type === 'EXPENSE');
    const otherIncomes = transactions.filter((t) => t.type === 'INCOME');

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalOtherIncome = otherIncomes.reduce((sum, i) => sum + i.amount, 0);

    const grandTotalIncome = totalFeesCollected + totalOtherIncome;
    const grandTotalExpense = totalMonthlySalary + totalExpenses;
    const netBalance = grandTotalIncome - grandTotalExpense;

    return {
      totalFeesCollected,
      totalMonthlySalary,
      totalOtherIncome,
      totalExpenses,
      grandTotalIncome,
      grandTotalExpense,
      netBalance,
      recentTransactions: transactions,
    };
  }

  async createTransaction(dto: CreateTransactionInput) {
    return this.prisma.accountTransaction.create({
      data: {
        type: dto.type as any,
        title: dto.title,
        amount: dto.amount,
        date: dto.date,
        description: dto.description || null,
      },
    });
  }

  async removeTransaction(id: string) {
    return this.prisma.accountTransaction.delete({ where: { id } });
  }
}
