import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EmployeeSubRole, Role, TransactionStatus, TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SalaryService {
  constructor(private readonly prisma: PrismaService) {}

  private async calculateMonthlySalary(employeeId: string, month: number, year: number) {
    const periodEnd = new Date(Date.UTC(year, month, 0));
    const start = new Date(Date.UTC(year, month - 1, 1));
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { salaryRevisions: { where: { effectiveDate: { lte: periodEnd } }, orderBy: { effectiveDate: 'desc' } } }
    });
    if (!employee || !employee.salaryRevisions[0]) throw new NotFoundException('Employee or salary revision not found');

    const now = new Date();
    const isCurrentMonth = year === now.getUTCFullYear() && month === now.getUTCMonth() + 1;
    const attendanceEnd = isCurrentMonth ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) : periodEnd;

    // Check employee joining date for mid-month pro-ration
    const joining = employee.joiningDate ? new Date(employee.joiningDate) : null;
    let joinedMidMonth = false;
    let daysWorkedInJoiningMonth = 30;
    const baseSalary = Number(employee.salaryRevisions[0].amount);
    let grossAmount = baseSalary;

    if (joining) {
      const joiningUtc = new Date(Date.UTC(joining.getUTCFullYear(), joining.getUTCMonth(), joining.getUTCDate()));
      if (joiningUtc > periodEnd) {
        grossAmount = 0;
        daysWorkedInJoiningMonth = 0;
      } else if (joiningUtc >= start && joiningUtc <= periodEnd) {
        joinedMidMonth = true;
        const totalDaysInMonth = periodEnd.getUTCDate();
        daysWorkedInJoiningMonth = Math.max(1, totalDaysInMonth - joiningUtc.getUTCDate() + 1);
        const dayRate = baseSalary / 30;
        grossAmount = Math.round((dayRate * Math.min(30, daysWorkedInJoiningMonth)) * 100) / 100;
      }
    }

    const attendanceStart = (joining && joining > start) ? joining : start;
    const attendance = await this.prisma.employeeAttendance.findMany({
      where: { employeeId, date: { gte: attendanceStart, lte: attendanceEnd } }
    });
    const statuses = attendance.reduce((summary: Record<string, number>, row) => { summary[row.status] = (summary[row.status] || 0) + 1; return summary; }, {});
    let deductionUnits = 0;
    let lateCount = 0;
    for (const row of attendance) {
      if (row.status === 'ABSENT' || row.status === 'UNPAID_LEAVE') deductionUnits += 1;
      else if (row.status === 'HALF_DAY') deductionUnits += 0.5;
      else if (row.status === 'LATE') lateCount += 1;
    }

    const dayRate = baseSalary / 30;
    const absenceDeduction = Math.round((dayRate * deductionUnits) * 100) / 100;
    const lateDeduction = lateCount * 100; // Flat Rs. 100 per late mark as per school rule
    const totalDeduction = Math.min(grossAmount, Math.round((absenceDeduction + lateDeduction) * 100) / 100);
    const netPayable = Math.max(0, grossAmount - totalDeduction);
    const snapshot = {
      salaryBasisDays: 30,
      joinedMidMonth,
      joiningDate: joining?.toISOString(),
      daysWorkedInJoiningMonth: joinedMidMonth ? daysWorkedInJoiningMonth : undefined,
      fullMonthlyGross: baseSalary,
      attendanceRecords: attendance.length,
      statuses,
      deductionUnits,
      absenceDeduction,
      lateCount,
      lateDeduction,
      totalDeduction,
      periodComplete: !isCurrentMonth,
      revisionId: employee.salaryRevisions[0].id
    };

    return this.prisma.monthlySalary.upsert({
      where: { employeeId_month_year: { employeeId, month, year } },
      create: { employeeId, month, year, grossAmount, deductionUnits, deductionAmount: totalDeduction, netPayable, snapshot },
      update: { grossAmount, deductionUnits, deductionAmount: totalDeduction, netPayable, snapshot },
      include: { payments: { orderBy: [{ paidDate: 'desc' }, { createdAt: 'desc' }] } }
    });
  }

  private async ensureSalaryHistory(employeeId: string, targetYear?: number, targetMonth?: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { salaryRevisions: { orderBy: { effectiveDate: 'asc' } } }
    });
    if (!employee || !employee.salaryRevisions.length) return [];

    const now = new Date();
    const finalYear = targetYear || now.getUTCFullYear();
    const finalMonth = targetMonth || (now.getUTCMonth() + 1);
    const targetPeriod = new Date(Date.UTC(finalYear, finalMonth - 1, 1));

    const firstRevision = employee.salaryRevisions[0].effectiveDate;
    let cursor = new Date(Date.UTC(firstRevision.getUTCFullYear(), firstRevision.getUTCMonth(), 1));
    if (cursor > targetPeriod) {
      cursor = new Date(targetPeriod);
    }

    const calculatedSalaries = [];
    while (cursor <= targetPeriod) {
      const m = cursor.getUTCMonth() + 1;
      const y = cursor.getUTCFullYear();
      const calc = await this.calculateMonthlySalary(employeeId, m, y);
      calculatedSalaries.push(calc);
      cursor = new Date(Date.UTC(y, m, 1));
    }

    const MONTH_LABELS = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    let runningBalance = 0; // > 0: Dues Pending, < 0: Advance Credit
    const enriched = [];
    const pastMonthsLedger: any[] = [];

    for (const salary of calculatedSalaries) {
      const gross = Number(salary.grossAmount);
      const deduction = Number(salary.deductionAmount);
      const currentMonthNet = Math.max(0, gross - deduction);
      const prevBal = runningBalance;
      const effectiveTotalPayable = Math.max(0, currentMonthNet + prevBal);
      const successfulPayments = (salary.payments || []).filter((p: any) => p.status === TransactionStatus.SUCCESS);
      const paidAmount = successfulPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
      const closingBalance = (prevBal + currentMonthNet) - paidAmount;
      runningBalance = closingBalance;

      let status = 'UNPAID';
      if (effectiveTotalPayable === 0 && paidAmount === 0 && prevBal < 0) {
        status = 'ADVANCE_COVERED';
      } else if (paidAmount >= effectiveTotalPayable && effectiveTotalPayable > 0) {
        status = paidAmount > effectiveTotalPayable ? 'OVERPAID' : 'PAID';
      } else if (paidAmount > 0 && paidAmount < effectiveTotalPayable) {
        status = 'PARTIAL';
      } else if (effectiveTotalPayable === 0 && paidAmount === 0) {
        status = 'PAID';
      }

      // Detailed previous months breakdown
      const previousDuesBreakdown = pastMonthsLedger
        .filter((pm) => pm.closingBalance !== 0)
        .map((pm) => ({
          month: pm.month,
          year: pm.year,
          monthLabel: `${MONTH_LABELS[pm.month - 1]} ${pm.year}`,
          grossAmount: pm.grossAmount,
          netPayable: pm.currentMonthNet,
          paidAmount: pm.paidAmount,
          balance: pm.closingBalance,
          isDue: pm.closingBalance > 0,
          isAdvance: pm.closingBalance < 0,
          note: (pm.snapshot as any)?.joinedMidMonth
            ? `Joined on ${new Date((pm.snapshot as any).joiningDate).toLocaleDateString('en-IN')} (${(pm.snapshot as any).daysWorkedInJoiningMonth} days worked)`
            : undefined,
        }));

      const enrichedItem = {
        ...salary,
        grossAmount: gross,
        deductionAmount: deduction,
        currentMonthNet,
        previousBalance: prevBal,
        effectiveTotalPayable,
        paidAmount,
        remainingDue: Math.max(0, closingBalance),
        advanceCredit: Math.max(0, -closingBalance),
        closingBalance,
        status,
        previousDuesBreakdown,
      };

      enriched.push(enrichedItem);
      pastMonthsLedger.push(enrichedItem);
    }

    return enriched;
  }

  async accounts(subRole?: string, targetMonth?: number, targetYear?: number) {
    const now = new Date();
    const selYear = targetYear || now.getUTCFullYear();
    const selMonth = targetMonth || (now.getUTCMonth() + 1);

    const role = Object.values(EmployeeSubRole).includes(subRole as EmployeeSubRole) ? subRole as EmployeeSubRole : undefined;
    const employees = await this.prisma.employee.findMany({
      where: { status: 'ACTIVE', subRole: role },
      include: {
        salaryRevisions: { orderBy: { effectiveDate: 'desc' } },
      },
      orderBy: { employeeId: 'asc' }
    });

    return Promise.all(employees.map(async (employee) => {
      const allSalaries = await this.ensureSalaryHistory(employee.id, selYear, selMonth);
      const selectedSalary = allSalaries.find((s) => s.month === selMonth && s.year === selYear) || allSalaries[allSalaries.length - 1] || null;

      const currentSalary = Number(employee.salaryRevisions?.[0]?.amount || 0);
      const monthlySalariesDesc = [...allSalaries].reverse();

      return {
        ...employee,
        currentSalary,
        selectedSalary,
        currentGross: selectedSalary ? selectedSalary.grossAmount : currentSalary,
        currentDeduction: selectedSalary ? selectedSalary.deductionAmount : 0,
        currentMonthNet: selectedSalary ? selectedSalary.currentMonthNet : currentSalary,
        previousBalance: selectedSalary ? selectedSalary.previousBalance : 0,
        previousDuesBreakdown: selectedSalary ? selectedSalary.previousDuesBreakdown || [] : [],
        effectivePayable: selectedSalary ? selectedSalary.effectiveTotalPayable : currentSalary,
        paidAmount: selectedSalary ? selectedSalary.paidAmount : 0,
        remainingDue: selectedSalary ? selectedSalary.remainingDue : currentSalary,
        advanceCredit: selectedSalary ? selectedSalary.advanceCredit : 0,
        attendanceStatuses: (selectedSalary?.snapshot as any)?.statuses || {},
        salaryStatus: selectedSalary ? selectedSalary.status : 'UNPAID',
        monthlySalaries: monthlySalariesDesc,
      };
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
      const payment = await tx.salaryPayment.create({
        data: {
          monthlySalaryId: id,
          amount,
          paidDate: new Date(body.paidDate),
          method: body.method || 'CASH',
          reference: body.reference || null,
          remarks: body.remarks || null,
          recordedById: actorId
        }
      });
      await tx.accountTransaction.create({
        data: {
          type: TransactionType.EXPENSE,
          title: 'Salary payment ' + salary.month + '/' + salary.year,
          amount,
          transactionDate: new Date(body.paidDate),
          sourceType: 'SALARY_PAYMENT',
          sourceReference: 'SALARY:' + payment.id,
          salaryPaymentId: payment.id,
          recordedById: actorId
        }
      });
      return { payment, pendingBalance: balance - amount };
    });
  }

  async history(employeeId: string, actor: any) {
    if (actor.role === Role.EMPLOYEE && actor.employeeDbId !== employeeId) throw new ForbiddenException('Own salary only');
    const salaries = await this.ensureSalaryHistory(employeeId);
    return [...salaries].reverse();
  }
}
