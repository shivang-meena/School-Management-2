import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNoticeInput } from '@erp/contracts';

@Injectable()
export class NoticesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userRole?: string, studentClass?: string) {
    const all = await this.prisma.notice.findMany({
      where: { published: true },
      orderBy: { date: 'desc' },
    });

    if (!userRole || userRole === 'ADMIN') {
      return all;
    }

    return all.filter((n) => {
      if (n.audience === 'All Users') return true;
      if (n.audience === 'Staff' && userRole === 'STAFF') return true;
      if (n.audience === 'All Students' && userRole === 'STUDENT') return true;
      if (n.audience === 'Specific Class' && userRole === 'STUDENT' && studentClass && n.specificClass === studentClass) {
        return true;
      }
      return false;
    });
  }

  async create(dto: CreateNoticeInput) {
    return this.prisma.notice.create({
      data: {
        title: dto.title,
        message: dto.message,
        audience: dto.audience,
        specificClass: dto.specificClass || null,
        published: dto.published ?? true,
        date: dto.date || new Date().toISOString().split('T')[0],
      },
    });
  }

  async remove(id: string) {
    return this.prisma.notice.delete({ where: { id } });
  }
}
