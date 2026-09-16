import { PrismaClient, Role, PaymentMethod, TransactionType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Clear existing data
  await prisma.feePayment.deleteMany();
  await prisma.examResult.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.notice.deleteMany();
  await prisma.accountTransaction.deleteMany();
  await prisma.pendingRegistration.deleteMany();
  await prisma.student.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.user.deleteMany();
  await prisma.classRoom.deleteMany();
  await prisma.subject.deleteMany();

  // 2. Hash default passwords
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const staffPasswordHash = await bcrypt.hash('staff123', 10);
  const studentPasswordHash = await bcrypt.hash('student123', 10);

  // 3. Admin User
  await prisma.user.create({
    data: {
      userId: 'admin',
      name: 'Dr. Rajesh Kumar',
      email: 'admin@greenwood.edu.in',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  // 4. Classes
  const classesData = [
    { name: 'Class 6', sections: ['A', 'B'], totalFee: 42000 },
    { name: 'Class 7', sections: ['A', 'B'], totalFee: 45000 },
    { name: 'Class 8', sections: ['A', 'B'], totalFee: 48000 },
    { name: 'Class 9', sections: ['A', 'B'], totalFee: 52000 },
    { name: 'Class 10', sections: ['A', 'B'], totalFee: 56000 },
  ];
  for (const c of classesData) {
    await prisma.classRoom.create({ data: c });
  }

  // 5. Subjects
  const subjects = ['English', 'Mathematics', 'Science', 'Social Studies', 'Hindi', 'Computer Science', 'Physical Education'];
  for (const s of subjects) {
    await prisma.subject.create({ data: { name: s } });
  }

  // 6. Staff
  const staffMembers = [
    { staffId: 'ST001', name: 'Mrs. Priya Sharma', designation: 'Senior Teacher', joiningDate: '2019-07-15', baseSalary: 45000, mobile: '9876543210', email: 'priya.sharma@greenwood.edu.in', address: '45 Rose Garden, Delhi', assignedClass: 'Class 8', assignedSection: 'A', assignedSubject: 'Mathematics' },
    { staffId: 'ST002', name: 'Mr. Amit Verma', designation: 'Teacher', joiningDate: '2020-06-01', baseSalary: 38000, mobile: '9876543211', email: 'amit.verma@greenwood.edu.in', address: '12 Park Street, Delhi', assignedClass: 'Class 7', assignedSection: 'B', assignedSubject: 'Science' },
    { staffId: 'ST003', name: 'Mrs. Sunita Rao', designation: 'Senior Teacher', joiningDate: '2018-01-10', baseSalary: 50000, mobile: '9876543212', email: 'sunita.rao@greenwood.edu.in', address: '78 Lake View, Delhi', assignedClass: 'Class 10', assignedSection: 'A', assignedSubject: 'English' },
    { staffId: 'ST004', name: 'Mr. Deepak Singh', designation: 'Teacher', joiningDate: '2021-08-20', baseSalary: 36000, mobile: '9876543213', email: 'deepak.singh@greenwood.edu.in', address: '33 Hill Road, Delhi', assignedClass: 'Class 9', assignedSection: 'B', assignedSubject: 'Social Studies' },
    { staffId: 'ST005', name: 'Mrs. Kavita Nair', designation: 'Teacher', joiningDate: '2020-03-15', baseSalary: 40000, mobile: '9876543214', email: 'kavita.nair@greenwood.edu.in', address: '90 Green Valley, Delhi', assignedClass: 'Class 6', assignedSection: 'A', assignedSubject: 'Computer Science' },
    { staffId: 'ST006', name: 'Mr. Rakesh Gupta', designation: 'Accountant', joiningDate: '2017-04-01', baseSalary: 42000, mobile: '9876543215', email: 'rakesh.gupta@greenwood.edu.in', address: '55 Market Lane, Delhi', assignedClass: null, assignedSection: null, assignedSubject: null },
    { staffId: 'ST007', name: 'Mrs. Anjali Desai', designation: 'Teacher', joiningDate: '2022-06-10', baseSalary: 35000, mobile: '9876543216', email: 'anjali.desai@greenwood.edu.in', address: '21 River Side, Delhi', assignedClass: 'Class 7', assignedSection: 'A', assignedSubject: 'Hindi' },
  ];

  for (const s of staffMembers) {
    const user = await prisma.user.create({
      data: {
        userId: s.staffId,
        name: s.name,
        email: s.email,
        passwordHash: staffPasswordHash,
        role: Role.STAFF,
      },
    });
    await prisma.staff.create({
      data: {
        ...s,
        userId: user.id,
      },
    });
  }

  // 7. Students
  const students = [
    { studentId: 'STU001', name: 'Aarav Patel', dob: '2011-05-14', gender: 'Male', mobile: '9988776601', email: 'aarav.patel@email.com', address: '101 Sunrise Apartments, Delhi', previousSchool: 'Little Stars Primary', class: 'Class 8', section: 'A', rollNo: 1, parentName: 'Mr. Harish Patel', parentMobile: '9988776600', totalFee: 48000, paidAmount: 30000 },
    { studentId: 'STU002', name: 'Diya Sharma', dob: '2010-08-22', gender: 'Female', mobile: '9988776602', email: 'diya.sharma@email.com', address: '202 Garden View, Delhi', previousSchool: 'Sunrise School', class: 'Class 8', section: 'A', rollNo: 2, parentName: 'Mrs. Meena Sharma', parentMobile: '9988776603', totalFee: 48000, paidAmount: 48000 },
    { studentId: 'STU003', name: 'Arjun Reddy', dob: '2011-03-10', gender: 'Male', mobile: '9988776604', email: 'arjun.reddy@email.com', address: '303 Hill Top, Delhi', previousSchool: 'Delhi Public School', class: 'Class 7', section: 'B', rollNo: 3, parentName: 'Mr. Suresh Reddy', parentMobile: '9988776605', totalFee: 45000, paidAmount: 15000 },
    { studentId: 'STU004', name: 'Ananya Iyer', dob: '2010-11-30', gender: 'Female', mobile: '9988776606', email: 'ananya.iyer@email.com', address: '404 Lake Side, Delhi', previousSchool: "St. Mary's School", class: 'Class 9', section: 'B', rollNo: 4, parentName: 'Mr. Krishnan Iyer', parentMobile: '9988776607', totalFee: 52000, paidAmount: 0 },
    { studentId: 'STU005', name: 'Vivaan Gupta', dob: '2011-07-18', gender: 'Male', mobile: '9988776608', email: 'vivaan.gupta@email.com', address: '505 Green Park, Delhi', previousSchool: 'Bal Bharati', class: 'Class 6', section: 'A', rollNo: 5, parentName: 'Mr. Nikhil Gupta', parentMobile: '9988776609', totalFee: 42000, paidAmount: 42000 },
    { studentId: 'STU006', name: 'Saanvi Joshi', dob: '2011-01-25', gender: 'Female', mobile: '9988776610', email: 'saanvi.joshi@email.com', address: '606 Rose Garden, Delhi', previousSchool: 'DAV School', class: 'Class 10', section: 'A', rollNo: 6, parentName: 'Mrs. Pooja Joshi', parentMobile: '9988776611', totalFee: 56000, paidAmount: 28000 },
    { studentId: 'STU007', name: 'Reyansh Agarwal', dob: '2010-09-12', gender: 'Male', mobile: '9988776612', email: 'reyansh.agarwal@email.com', address: '707 City Center, Delhi', previousSchool: 'Modern School', class: 'Class 7', section: 'A', rollNo: 7, parentName: 'Mr. Vivek Agarwal', parentMobile: '9988776613', totalFee: 45000, paidAmount: 45000 },
    { studentId: 'STU008', name: 'Ishika Mehta', dob: '2011-04-05', gender: 'Female', mobile: '9988776614', email: 'ishika.mehta@email.com', address: '808 Silver Line, Delhi', previousSchool: 'Ryan International', class: 'Class 9', section: 'B', rollNo: 8, parentName: 'Mr. Sanjay Mehta', parentMobile: '9988776615', totalFee: 52000, paidAmount: 10000 },
  ];

  for (const stu of students) {
    const user = await prisma.user.create({
      data: {
        userId: stu.studentId,
        name: stu.name,
        email: stu.email,
        passwordHash: studentPasswordHash,
        role: Role.STUDENT,
      },
    });
    await prisma.student.create({
      data: {
        ...stu,
        userId: user.id,
      },
    });
  }

  // 8. Fee payments
  const payments = [
    { receiptNo: 'RCP001', studentId: 'STU001', amount: 30000, date: '2025-04-10', method: PaymentMethod.Bank },
    { receiptNo: 'RCP002', studentId: 'STU002', amount: 48000, date: '2025-04-05', method: PaymentMethod.Online },
    { receiptNo: 'RCP003', studentId: 'STU003', amount: 15000, date: '2025-05-15', method: PaymentMethod.Cash },
    { receiptNo: 'RCP004', studentId: 'STU005', amount: 42000, date: '2025-04-01', method: PaymentMethod.Online },
    { receiptNo: 'RCP005', studentId: 'STU006', amount: 28000, date: '2025-06-01', method: PaymentMethod.Cash },
    { receiptNo: 'RCP006', studentId: 'STU007', amount: 45000, date: '2025-04-12', method: PaymentMethod.Bank },
    { receiptNo: 'RCP007', studentId: 'STU008', amount: 10000, date: '2025-07-10', method: PaymentMethod.Online },
  ];
  for (const p of payments) {
    await prisma.feePayment.create({ data: p });
  }

  // 9. Notices
  const notices = [
    { title: 'Annual Sports Day 2025', message: 'The Annual Sports Day will be held on 28th September 2025 at the school playground. All students must participate.', date: '2025-09-12', audience: 'All Students', published: true },
    { title: 'Parent-Teacher Meeting', message: 'PTM is scheduled for Saturday, 20th September 2025 from 9:00 AM to 12:00 PM. Parents are requested to attend.', date: '2025-09-11', audience: 'All Users', published: true },
    { title: 'Staff Meeting', message: 'Monthly staff meeting on 18th September 2025 at 3:30 PM in the conference hall. Attendance is mandatory.', date: '2025-09-10', audience: 'Staff', published: true },
    { title: 'Class 10 Pre-Board Exam', message: 'Pre-Board exams for Class 10 will commence from 1st October 2025. Exam timetable will be shared soon.', date: '2025-09-14', audience: 'Specific Class', specificClass: 'Class 10', published: true },
    { title: 'School Holiday Notice', message: 'School will remain closed on 2nd October 2025 on account of Gandhi Jayanti.', date: '2025-09-13', audience: 'All Users', published: true },
  ];
  for (const n of notices) {
    await prisma.notice.create({ data: n });
  }

  // 10. Exams & Results
  const ex1 = await prisma.exam.create({
    data: {
      name: 'Mid-Term Exam 2025',
      class: 'Class 8',
      section: 'A',
      subject: 'Mathematics',
      date: '2025-08-15',
      totalMarks: 100,
      published: true,
      results: {
        create: [
          { studentId: 'STU001', obtained: 85 },
          { studentId: 'STU002', obtained: 92 },
        ],
      },
    },
  });

  const ex2 = await prisma.exam.create({
    data: {
      name: 'Mid-Term Exam 2025',
      class: 'Class 8',
      section: 'A',
      subject: 'English',
      date: '2025-08-16',
      totalMarks: 100,
      published: true,
      results: {
        create: [
          { studentId: 'STU001', obtained: 78 },
          { studentId: 'STU002', obtained: 88 },
        ],
      },
    },
  });

  // 11. Account Transactions
  const transactions = [
    { type: TransactionType.EXPENSE, title: 'Electricity Bill', date: '2025-09-01', amount: 15000, description: 'Monthly electricity bill for August' },
    { type: TransactionType.EXPENSE, title: 'Laboratory Equipment', date: '2025-08-20', amount: 25000, description: 'New science lab equipment' },
    { type: TransactionType.EXPENSE, title: 'Stationery Purchase', date: '2025-08-15', amount: 8000, description: 'Office and exam stationery' },
    { type: TransactionType.INCOME, title: 'Donation', date: '2025-08-10', amount: 50000, description: 'Donation from alumni association' },
  ];
  for (const t of transactions) {
    await prisma.accountTransaction.create({ data: t });
  }

  // 12. Pending Registrations
  const pending = [
    { name: 'Kabir Malhotra', dob: '2012-06-01', gender: 'Male', mobile: '9988776620', email: 'kabir.m@email.com', address: '12 New Colony, Delhi', previousSchool: 'Happy Hours School', applyingClass: 'Class 6', parentName: 'Mr. Rohit Malhotra', parentMobile: '9988776621', status: 'Pending', submittedDate: '2025-09-10' },
    { name: 'Myra Khanna', dob: '2011-02-15', gender: 'Female', mobile: '9988776622', email: 'myra.k@email.com', address: '34 Palm Residency, Delhi', previousSchool: 'GD Goenka', applyingClass: 'Class 7', parentName: 'Mrs. Sneha Khanna', parentMobile: '9988776623', status: 'Verified', submittedDate: '2025-09-05' },
  ];
  for (const reg of pending) {
    await prisma.pendingRegistration.create({ data: reg });
  }

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
