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
  const initialSubjects = [
    { code: 'ENG', name: 'English' },
    { code: 'HIN', name: 'Hindi' },
    { code: 'MAT', name: 'Mathematics' },
    { code: 'SCI', name: 'Science' },
    { code: 'SST', name: 'Social Studies' },
    { code: 'CSE', name: 'Computer Science' },
    { code: 'EVS', name: 'Environmental Studies' },
    { code: 'DRW', name: 'Drawing' },
    { code: 'PHY', name: 'Physics' },
    { code: 'CHE', name: 'Chemistry' },
    { code: 'BIO', name: 'Biology' },
    { code: 'ACC', name: 'Accountancy' },
    { code: 'BST', name: 'Business Studies' },
    { code: 'ECO', name: 'Economics' },
    { code: 'HIS', name: 'History' },
    { code: 'GEO', name: 'Geography' },
    { code: 'POL', name: 'Political Science' },
    { code: 'PHE', name: 'Physical Education' },
    { code: 'IP', name: 'Informatics Practices' },
  ];
  for (const subject of initialSubjects) {
    await prisma.subject.upsert({ where: { code: subject.code }, update: {}, create: subject });
  }

  const initialParentSubjects = [
    { code: 'STR_PCM', name: 'PCM (Physics, Chemistry, Mathematics)', description: 'Science stream with Mathematics' },
    { code: 'STR_PCB', name: 'PCB (Physics, Chemistry, Biology)', description: 'Medical Science stream' },
    { code: 'STR_PCMB', name: 'PCMB (Medical + Non-Medical)', description: 'Combined Medical and Engineering stream' },
    { code: 'STR_COMM', name: 'Commerce', description: 'Commerce without Core Mathematics' },
    { code: 'STR_COMM_MATH', name: 'Commerce with Mathematics', description: 'Commerce with Core Mathematics' },
    { code: 'STR_ARTS', name: 'Arts / Humanities', description: 'Humanities and Social Sciences' },
    { code: 'STR_VOC', name: 'Vocational Studies', description: 'Vocational and Skill-based Studies' },
  ];
  for (const parent of initialParentSubjects) {
    await prisma.parentSubject.upsert({ where: { code: parent.code }, update: {}, create: parent });
  }

  for (const key of ['STUDENT', 'EMPLOYEE', 'RECEIPT']) await prisma.idSequence.upsert({ where: { key }, update: {}, create: { key, nextValue: 1 } });
}
main().finally(() => prisma.$disconnect());
