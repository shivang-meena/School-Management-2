import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EmployeeSubRole, Role, TransactionStatus, TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SalaryService {
  constructor(private readonly prisma: PrismaService) {}

  private async calculateMonthlySalary(employeeId: string, month: number, year: number) {
    const periodEnd = new Date(Date.UTC(year, month, 0));
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { salaryRevisions: { where: { effectiveDate: { lte: periodEnd } }, orderBy: { effectiveDate: 'desc' } } }
    });
    if (!employee || !employee.salaryRevisions[0]) throw new NotFoundException('Employee or salary revision not found');

    const now = new Date();
    const isCurrentMonth = year === now.getUTCFullYear() && month === now.getUTCMonth() + 1;
    const start = new Date(Date.UTC(year, month - 1, 1));
    const attendanceEnd = isCurrentMonth ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) : periodEnd;
    const attendance = await this.prisma.employeeAttendance.findMany({ where: { employeeId, date: { gte: start, lte: attendanceEnd } } });
    const statuses = attendance.reduce((summary: Record<string, number>, row) => { summary[row.status] = (summary[row.status] || 0) + 1; return summary; }, {});
    let deductionUnits = 0;
    for (const row of attendance) {
      if (row.status === 'ABSENT' || row.status === 'UNPAID_LEAVE') deductionUnits += 1;
      else if (row.status === 'HALF_DAY') deductionUnits += 0.5;
    }
    const grossAmount = Number(employee.salaryRevisions[0].amount);
    const deductionAmount = Math.min(grossAmount, grossAmount / 30 * deductionUnits);
    const netPayable = Math.max(0, grossAmount - deductionAmount);
    const snapshot = { salaryBasisDays: 30, attendanceRecords: attendance.length, statuses, deductionUnits, periodComplete: !isCurrentMonth, revisionId: employee.salaryRevisions[0].id };

    return this.prisma.monthlySalary.upsert({
      where: { employeeId_month_year: { employeeId, month, year } },
      create: { employeeId, month, year, grossAmount, deductionUnits, deductionAmount, netPayable, snapshot },
      update: { grossAmount, deductionUnits, deductionAmount, netPayable, snapshot },
      include: { payments: { orderBy: [{ paidDate: 'desc' }, { createdAt: 'desc' }] } }
    });
  }

  private async ensureSalaryHistory(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId }, include: { salaryRevisions: { orderBy: { effectiveDate: 'asc' } } } });
    if (!employee || !employee.salaryRevisions.length) throw new NotFoundException('Employee or salary revision not found');
    const now = new Date();
    const currentPeriod = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const firstRevision = employee.salaryRevisions[0].effectiveDate;
    let cursor = new Date(Date.UTC(firstRevision.getUTCFullYear(), firstRevision.getUTCMonth(), 1));
    const salaries = [];
    while (cursor <= currentPeriod) {
      salaries.push(await this.calculateMonthlySalary(employeeId, cursor.getUTCMonth() + 1, cursor.getUTCFullYear()));
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    }
    return salaries.reverse();
  }

  async accounts(subRole?: string) {
    const role = Object.values(EmployeeSubRole).includes(subRole as EmployeeSubRole) ? subRole as EmployeeSubRole : undefined;
    const employees = await this.prisma.employee.findMany({
      where: { status: 'ACTIVE', subRole: role },
      include: {
        salaryRevisions: { orderBy: { effectiveDate: 'desc' } },
        monthlySalaries: { include: { payments: { orderBy: [{ paidDate: 'desc' }, { createdAt: 'desc' }] } }, orderBy: [{ year: 'desc' }, { month: 'desc' }] }
      },
      orderBy: { employeeId: 'asc' }
    });
    return Promise.all(employees.map(async (employee) => {
      const calculatedSalaries = await this.ensureSalaryHistory(employee.id);
      const calculatedIds = new Set(calculatedSalaries.map((salary) => salary.id));
      const monthlySalaries = [...calculatedSalaries, ...employee.monthlySalaries.filter((salary) => !calculatedIds.has(salary.id))];
      return { ...employee, monthlySalaries };
    }));
  }

  async pay(id: string, body: any, actorId: string) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('Payment must be positive');
    if (!body.paidDate || Number.isNaN(new Date(body.paidDate).getTime())) throw new BadRequestException('Valid payment date is required');
    return this.prisma.$transaction(async (tx) => {
      const salary = await tx.monthlySalary.findUnique({ where: { id }, include: { payments: { where: { status: TransactionStatus.SUCCESS } } } });
      if (!salary) throw new NotFoundException('Monthly salary not found');
      const paid = salary.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
      const balance = Number(salary.netPayable) - paid;
      const payment = await tx.salaryPayment.create({ data: { monthlySalaryId: id, amount, paidDate: new Date(body.paidDate), method: body.method, reference: body.reference, remarks: body.remarks, recordedById: actorId } });
      await tx.accountTransaction.create({ data: { type: TransactionType.EXPENSE, title: 'Salary payment ' + salary.month + '/' + salary.year, amount, transactionDate: new Date(body.paidDate), sourceType: 'SALARY_PAYMENT', sourceReference: 'SALARY:' + payment.id, salaryPaymentId: payment.id, recordedById: actorId } });
      return { payment, pendingBalance: balance - amount };
    });
  }

  async history(employeeId: string, actor: any) {
    if (actor.role === Role.EMPLOYEE && actor.employeeDbId !== employeeId) throw new ForbiddenException('Own salary only');
    await this.ensureSalaryHistory(employeeId);
    return this.prisma.monthlySalary.findMany({ where: { employeeId }, include: { payments: { orderBy: [{ paidDate: 'desc' }, { createdAt: 'desc' }] } }, orderBy: [{ year: 'desc' }, { month: 'desc' }] });
  }
}
