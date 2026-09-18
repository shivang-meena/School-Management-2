import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
async function main() {
  const passwordHash = await bcrypt.hash('Arihant@2026', 12);
  await prisma.user.upsert({ where: { loginId: 'admin' }, update: { mustChangePassword: false }, create: { loginId: 'admin', name: 'School Administrator', email: 'admin@arihantpublicschool.edu', passwordHash, role: Role.ADMIN, mustChangePassword: false } });
  const year = await prisma.academicYear.upsert({ where: { name: '2026-27' }, update: { isCurrent: true }, create: { name: '2026-27', startDate: new Date('2026-04-01'), endDate: new Date('2027-03-31'), isCurrent: true } });
  for (let grade = 1; grade <= 12; grade += 1) {
    const schoolClass = await prisma.schoolClass.upsert({ where: { name: `Class ${grade}` }, update: {}, create: { name: `Class ${grade}`, sortOrder: grade } });
    await prisma.section.upsert({ where: { classId_name: { classId: schoolClass.id, name: 'A' } }, update: {}, create: { classId: schoolClass.id, name: 'A', capacity: 40 } });
    await prisma.classFeeStructure.upsert({ where: { classId_academicYearId: { classId: schoolClass.id, academicYearId: year.id } }, update: {}, create: { classId: schoolClass.id, academicYearId: year.id, totalFee: 48000 + grade * 1000 } });
  }
  for (const subject of [{ code: 'ENG', name: 'English' }, { code: 'HIN', name: 'Hindi' }, { code: 'MAT', name: 'Mathematics' }, { code: 'SCI', name: 'Science' }, { code: 'SST', name: 'Social Studies' }, { code: 'CSE', name: 'Computer Science' }]) await prisma.subject.upsert({ where: { code: subject.code }, update: {}, create: subject });
  for (const key of ['STUDENT', 'EMPLOYEE', 'RECEIPT']) await prisma.idSequence.upsert({ where: { key }, update: {}, create: { key, nextValue: 1 } });
}
main().finally(() => prisma.$disconnect());
