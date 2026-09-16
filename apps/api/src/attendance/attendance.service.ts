import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MarkAttendanceInput } from '@erp/contracts';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async markAttendance(targetType: 'STUDENT' | 'STAFF', dto: MarkAttendanceInput) {
    const results = [];
    for (const record of dto.records) {
      const saved = await this.prisma.attendanceRecord.upsert({
        where: {
          date_targetType_referenceId: {
            date: dto.date,
            targetType,
            referenceId: record.id,
          },
        },
        update: {
          status: record.status,
          remarks: record.remarks || null,
        },
        create: {
          date: dto.date,
          targetType,
          referenceId: record.id,
          status: record.status,
          remarks: record.remarks || null,
        },
      });
      results.push(saved);
    }
    return results;
  }

  async getAttendanceByDate(targetType: 'STUDENT' | 'STAFF', date: string) {
    return this.prisma.attendanceRecord.findMany({
      where: {
        targetType,
        date,
      },
    });
  }

  async getIndividualAttendance(targetType: 'STUDENT' | 'STAFF', referenceId: string) {
    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        targetType,
        referenceId,
      },
      orderBy: { date: 'desc' },
    });

    const total = records.length;
    const present = records.filter(r => r.status === 'present' || r.status === 'late').length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 100;

    return {
      referenceId,
      targetType,
      total,
      present,
      absent: total - present,
      percentage,
      records,
    };
  }
}
