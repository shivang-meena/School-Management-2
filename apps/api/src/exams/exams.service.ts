import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExamInput, EnterMarksInput } from '@erp/contracts';

@Injectable()
export class ExamsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query?: { class?: string; section?: string }) {
    const where: any = {};
    if (query?.class) where.class = query.class;
    if (query?.section) where.section = query.section;

    return this.prisma.exam.findMany({
      where,
      include: {
        results: {
          include: {
            student: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: {
        results: {
          include: {
            student: true,
          },
        },
      },
    });
    if (!exam) {
      throw new NotFoundException('Exam not found');
    }
    return exam;
  }

  async create(dto: CreateExamInput) {
    return this.prisma.exam.create({
      data: dto,
    });
  }

  async enterMarks(dto: EnterMarksInput) {
    const exam = await this.findOne(dto.examId);
    const updatedResults = [];

    for (const item of dto.marks) {
      const res = await this.prisma.examResult.upsert({
        where: {
          examId_studentId: {
            examId: dto.examId,
            studentId: item.studentId,
          },
        },
        update: {
          obtained: item.obtained,
        },
        create: {
          examId: dto.examId,
          studentId: item.studentId,
          obtained: item.obtained,
        },
      });
      updatedResults.push(res);
    }
    return updatedResults;
  }

  async getStudentReport(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { studentId },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const results = await this.prisma.examResult.findMany({
      where: { studentId },
      include: { exam: true },
    });

    const formatted = results.map((r) => {
      const pct = Math.round((r.obtained / r.exam.totalMarks) * 100);
      let grade = 'F';
      if (pct >= 90) grade = 'A+';
      else if (pct >= 80) grade = 'A';
      else if (pct >= 70) grade = 'B+';
      else if (pct >= 60) grade = 'B';
      else if (pct >= 50) grade = 'C';
      else if (pct >= 40) grade = 'D';

      return {
        examName: r.exam.name,
        subject: r.exam.subject,
        date: r.exam.date,
        totalMarks: r.exam.totalMarks,
        obtained: r.obtained,
        percentage: pct,
        grade,
        status: pct >= 33 ? 'Pass' : 'Fail',
      };
    });

    return {
      student,
      results: formatted,
    };
  }
}
