/* ============================================
   SCHOOL ERP — Shared JavaScript
   Contains: Dummy data seed, localStorage helpers,
   auth functions, UI helpers, and utilities.
   ============================================ */

/* ---------- SCHOOL IMAGES (from Pexels) ---------- */
const SCHOOL_IMAGES = {
  campus: "https://images.pexels.com/photos/35314982/pexels-photo-35314982.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  building: "https://images.pexels.com/photos/12444974/pexels-photo-12444974.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  classroom: "https://images.pexels.com/photos/9159042/pexels-photo-9159042.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  students: "https://images.pexels.com/photos/5905554/pexels-photo-5905554.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  teacher: "https://images.pexels.com/photos/7156144/pexels-photo-7156144.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  library: "https://images.pexels.com/photos/35758750/pexels-photo-35758750.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  exam: "https://images.pexels.com/photos/31155018/pexels-photo-31155018.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  collaboration: "https://images.pexels.com/photos/34526416/pexels-photo-34526416.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
};

/* ---------- DUMMY DATA SEED ---------- */
const SEED_DATA = {
  /* School info */
  school: {
    name: "Greenwood International School",
    address: "123 Education Lane, Knowledge Park, New Delhi - 110001",
    phone: "+91 98765 43210",
    email: "info@greenwood.edu.in",
    estd: 1998,
  },

  /* Admin credentials */
  admin: { userId: "admin", password: "admin123", name: "Dr. Rajesh Kumar", role: "admin" },

  /* Classes & sections */
  classes: [
    { id: "c1", name: "Class 6", sections: ["A", "B"] },
    { id: "c2", name: "Class 7", sections: ["A", "B"] },
    { id: "c3", name: "Class 8", sections: ["A", "B"] },
    { id: "c4", name: "Class 9", sections: ["A", "B"] },
    { id: "c5", name: "Class 10", sections: ["A", "B"] },
  ],

  /* Subjects */
  subjects: ["English", "Mathematics", "Science", "Social Studies", "Hindi", "Computer Science", "Physical Education"],

  /* Staff / Teachers */
  staff: [
    { staffId: "ST001", password: "staff123", name: "Mrs. Priya Sharma", designation: "Senior Teacher", joiningDate: "2019-07-15", baseSalary: 45000, mobile: "9876543210", email: "priya.sharma@greenwood.edu.in", address: "45 Rose Garden, Delhi", assignedClass: "Class 8", assignedSection: "A", assignedSubject: "Mathematics", status: "approved", attendance: [], salaryHistory: [] },
    { staffId: "ST002", password: "staff123", name: "Mr. Amit Verma", designation: "Teacher", joiningDate: "2020-06-01", baseSalary: 38000, mobile: "9876543211", email: "amit.verma@greenwood.edu.in", address: "12 Park Street, Delhi", assignedClass: "Class 7", assignedSection: "B", assignedSubject: "Science", status: "approved", attendance: [], salaryHistory: [] },
    { staffId: "ST003", password: "staff123", name: "Mrs. Sunita Rao", designation: "Senior Teacher", joiningDate: "2018-01-10", baseSalary: 50000, mobile: "9876543212", email: "sunita.rao@greenwood.edu.in", address: "78 Lake View, Delhi", assignedClass: "Class 10", assignedSection: "A", assignedSubject: "English", status: "approved", attendance: [], salaryHistory: [] },
    { staffId: "ST004", password: "staff123", name: "Mr. Deepak Singh", designation: "Teacher", joiningDate: "2021-08-20", baseSalary: 36000, mobile: "9876543213", email: "deepak.singh@greenwood.edu.in", address: "33 Hill Road, Delhi", assignedClass: "Class 9", assignedSection: "B", assignedSubject: "Social Studies", status: "approved", attendance: [], salaryHistory: [] },
    { staffId: "ST005", password: "staff123", name: "Mrs. Kavita Nair", designation: "Teacher", joiningDate: "2020-03-15", baseSalary: 40000, mobile: "9876543214", email: "kavita.nair@greenwood.edu.in", address: "90 Green Valley, Delhi", assignedClass: "Class 6", assignedSection: "A", assignedSubject: "Computer Science", status: "approved", attendance: [], salaryHistory: [] },
    { staffId: "ST006", password: "staff123", name: "Mr. Rakesh Gupta", designation: "Accountant", joiningDate: "2017-04-01", baseSalary: 42000, mobile: "9876543215", email: "rakesh.gupta@greenwood.edu.in", address: "55 Market Lane, Delhi", assignedClass: "", assignedSection: "", assignedSubject: "", status: "approved", attendance: [], salaryHistory: [] },
    { staffId: "ST007", password: "staff123", name: "Mrs. Anjali Desai", designation: "Teacher", joiningDate: "2022-06-10", baseSalary: 35000, mobile: "9876543216", email: "anjali.desai@greenwood.edu.in", address: "21 River Side, Delhi", assignedClass: "Class 7", assignedSection: "A", assignedSubject: "Hindi", status: "approved", attendance: [], salaryHistory: [] },
  ],

  /* Students */
  students: [
    { studentId: "STU001", password: "student123", name: "Aarav Patel", dob: "2011-05-14", gender: "Male", mobile: "9988776601", email: "aarav.patel@email.com", address: "101 Sunrise Apartments, Delhi", previousSchool: "Little Stars Primary", applyingClass: "Class 6", parentName: "Mr. Harish Patel", parentMobile: "9988776600", class: "Class 8", section: "A", rollNo: 1, status: "approved", attendance: [], fees: { totalFee: 48000, paidAmount: 30000, payments: [{ receiptNo: "RCP001", date: "2025-04-10", amount: 30000, method: "Bank", status: "Paid" }] }, results: [] },
    { studentId: "STU002", password: "student123", name: "Diya Sharma", dob: "2010-08-22", gender: "Female", mobile: "9988776602", email: "diya.sharma@email.com", address: "202 Garden View, Delhi", previousSchool: "Sunrise School", applyingClass: "Class 7", parentName: "Mrs. Meena Sharma", parentMobile: "9988776603", class: "Class 8", section: "A", rollNo: 2, status: "approved", attendance: [], fees: { totalFee: 48000, paidAmount: 48000, payments: [{ receiptNo: "RCP002", date: "2025-04-05", amount: 48000, method: "Online", status: "Paid" }] }, results: [] },
    { studentId: "STU003", password: "student123", name: "Arjun Reddy", dob: "2011-03-10", gender: "Male", mobile: "9988776604", email: "arjun.reddy@email.com", address: "303 Hill Top, Delhi", previousSchool: "Delhi Public School", applyingClass: "Class 6", parentName: "Mr. Suresh Reddy", parentMobile: "9988776605", class: "Class 7", section: "B", rollNo: 3, status: "approved", attendance: [], fees: { totalFee: 45000, paidAmount: 15000, payments: [{ receiptNo: "RCP003", date: "2025-05-15", amount: 15000, method: "Cash", status: "Partial" }] }, results: [] },
    { studentId: "STU004", password: "student123", name: "Ananya Iyer", dob: "2010-11-30", gender: "Female", mobile: "9988776606", email: "ananya.iyer@email.com", address: "404 Lake Side, Delhi", previousSchool: "St. Mary's School", applyingClass: "Class 8", parentName: "Mr. Krishnan Iyer", parentMobile: "9988776607", class: "Class 9", section: "B", rollNo: 4, status: "approved", attendance: [], fees: { totalFee: 52000, paidAmount: 0, payments: [] }, results: [] },
    { studentId: "STU005", password: "student123", name: "Vivaan Gupta", dob: "2011-07-18", gender: "Male", mobile: "9988776608", email: "vivaan.gupta@email.com", address: "505 Green Park, Delhi", previousSchool: "Bal Bharati", applyingClass: "Class 7", parentName: "Mr. Nikhil Gupta", parentMobile: "9988776609", class: "Class 6", section: "A", rollNo: 5, status: "approved", attendance: [], fees: { totalFee: 42000, paidAmount: 42000, payments: [{ receiptNo: "RCP004", date: "2025-04-01", amount: 42000, method: "Online", status: "Paid" }] }, results: [] },
    { studentId: "STU006", password: "student123", name: "Saanvi Joshi", dob: "2011-01-25", gender: "Female", mobile: "9988776610", email: "saanvi.joshi@email.com", address: "606 Rose Garden, Delhi", previousSchool: "DAV School", applyingClass: "Class 6", parentName: "Mrs. Pooja Joshi", parentMobile: "9988776611", class: "Class 10", section: "A", rollNo: 6, status: "approved", attendance: [], fees: { totalFee: 56000, paidAmount: 28000, payments: [{ receiptNo: "RCP005", date: "2025-06-01", amount: 28000, method: "Cash", status: "Partial" }] }, results: [] },
    { studentId: "STU007", password: "student123", name: "Reyansh Agarwal", dob: "2010-09-12", gender: "Male", mobile: "9988776612", email: "reyansh.agarwal@email.com", address: "707 City Center, Delhi", previousSchool: "Modern School", applyingClass: "Class 9", parentName: "Mr. Vivek Agarwal", parentMobile: "9988776613", class: "Class 7", section: "A", rollNo: 7, status: "approved", attendance: [], fees: { totalFee: 45000, paidAmount: 45000, payments: [{ receiptNo: "RCP006", date: "2025-04-12", amount: 45000, method: "Bank", status: "Paid" }] }, results: [] },
    { studentId: "STU008", password: "student123", name: "Ishika Mehta", dob: "2011-04-05", gender: "Female", mobile: "9988776614", email: "ishika.mehta@email.com", address: "808 Silver Line, Delhi", previousSchool: "Ryan International", applyingClass: "Class 8", parentName: "Mr. Sanjay Mehta", parentMobile: "9988776615", class: "Class 9", section: "B", rollNo: 8, status: "approved", attendance: [], fees: { totalFee: 52000, paidAmount: 10000, payments: [{ receiptNo: "RCP007", date: "2025-07-10", amount: 10000, method: "Online", status: "Partial" }] }, results: [] },
  ],

  /* Pending student registrations */
  pendingRegistrations: [
    { id: "REG001", name: "Kabir Malhotra", dob: "2012-06-01", gender: "Male", mobile: "9988776620", email: "kabir.m@email.com", address: "12 New Colony, Delhi", previousSchool: "Happy Hours School", applyingClass: "Class 6", parentName: "Mr. Rohit Malhotra", parentMobile: "9988776621", status: "Pending", submittedDate: "2025-09-10" },
    { id: "REG002", name: "Myra Khanna", dob: "2011-02-15", gender: "Female", mobile: "9988776622", email: "myra.k@email.com", address: "34 Palm Residency, Delhi", previousSchool: "GD Goenka", applyingClass: "Class 7", parentName: "Mrs. Sneha Khanna", parentMobile: "9988776623", status: "Verified", submittedDate: "2025-09-05" },
  ],

  /* Notices */
  notices: [
    { id: "N001", title: "Annual Sports Day 2025", message: "The Annual Sports Day will be held on 28th September 2025 at the school playground. All students must participate.", date: "2025-09-12", audience: "All Students", published: true },
    { id: "N002", title: "Parent-Teacher Meeting", message: "PTM is scheduled for Saturday, 20th September 2025 from 9:00 AM to 12:00 PM. Parents are requested to attend.", date: "2025-09-11", audience: "All Users", published: true },
    { id: "N003", title: "Staff Meeting", message: "Monthly staff meeting on 18th September 2025 at 3:30 PM in the conference hall. Attendance is mandatory.", date: "2025-09-10", audience: "Staff", published: true },
    { id: "N004", title: "Class 10 Pre-Board Exam", message: "Pre-Board exams for Class 10 will commence from 1st October 2025. Exam timetable will be shared soon.", date: "2025-09-14", audience: "Specific Class", specificClass: "Class 10", published: true },
    { id: "N005", title: "School Holiday Notice", message: "School will remain closed on 2nd October 2025 on account of Gandhi Jayanti.", date: "2025-09-13", audience: "All Users", published: true },
  ],

  /* Curriculum: subjects with teachers per class+section */
  curriculum: [
    { class: "Class 8", section: "A", subjects: [
      { name: "English", teacher: "Mrs. Sunita Rao", syllabus: "syllabus-english-class8.pdf" },
      { name: "Mathematics", teacher: "Mrs. Priya Sharma", syllabus: "syllabus-math-class8.pdf" },
      { name: "Science", teacher: "Mr. Amit Verma", syllabus: "syllabus-science-class8.pdf" },
    ]},
    { class: "Class 8", section: "B", subjects: [
      { name: "English", teacher: "Mrs. Sunita Rao", syllabus: "syllabus-english-class8.pdf" },
      { name: "Mathematics", teacher: "Mrs. Priya Sharma", syllabus: "syllabus-math-class8.pdf" },
    ]},
    { class: "Class 10", section: "A", subjects: [
      { name: "English", teacher: "Mrs. Sunita Rao", syllabus: "syllabus-english-class10.pdf" },
      { name: "Mathematics", teacher: "Mrs. Priya Sharma", syllabus: "syllabus-math-class10.pdf" },
    ]},
    { class: "Class 7", section: "B", subjects: [
      { name: "Science", teacher: "Mr. Amit Verma", syllabus: "syllabus-science-class7.pdf" },
    ]},
  ],

  /* Timetable / daily lectures */
  timetable: [
    { class: "Class 8", section: "A", subject: "Mathematics", teacher: "Mrs. Priya Sharma", date: "2025-09-16", startTime: "09:00", endTime: "09:45" },
    { class: "Class 8", section: "A", subject: "English", teacher: "Mrs. Sunita Rao", date: "2025-09-16", startTime: "09:45", endTime: "10:30" },
    { class: "Class 8", section: "A", subject: "Science", teacher: "Mr. Amit Verma", date: "2025-09-16", startTime: "11:00", endTime: "11:45" },
    { class: "Class 10", section: "A", subject: "English", teacher: "Mrs. Sunita Rao", date: "2025-09-16", startTime: "09:00", endTime: "09:45" },
    { class: "Class 7", section: "B", subject: "Science", teacher: "Mr. Amit Verma", date: "2025-09-16", startTime: "10:30", endTime: "11:15" },
  ],

  /* Fee structure per class */
  feeStructure: [
    { class: "Class 6", totalFee: 42000 },
    { class: "Class 7", totalFee: 45000 },
    { class: "Class 8", totalFee: 48000 },
    { class: "Class 9", totalFee: 52000 },
    { class: "Class 10", totalFee: 56000 },
  ],

  /* Exams */
  exams: [
    { id: "EX001", name: "Mid-Term Exam 2025", class: "Class 8", section: "A", subject: "Mathematics", date: "2025-08-15", totalMarks: 100, published: true, marks: [
      { studentId: "STU001", obtained: 85 },
      { studentId: "STU002", obtained: 92 },
    ]},
    { id: "EX002", name: "Mid-Term Exam 2025", class: "Class 8", section: "A", subject: "English", date: "2025-08-16", totalMarks: 100, published: true, marks: [
      { studentId: "STU001", obtained: 78 },
      { studentId: "STU002", obtained: 88 },
    ]},
    { id: "EX003", name: "Mid-Term Exam 2025", class: "Class 10", section: "A", subject: "English", date: "2025-08-17", totalMarks: 100, published: true, marks: [
      { studentId: "STU006", obtained: 95 },
    ]},
  ],

  /* General accounts - expenses & income */
  accounts: {
    expenses: [
      { id: "E001", title: "Electricity Bill", date: "2025-09-01", amount: 15000, description: "Monthly electricity bill for August" },
      { id: "E002", title: "Laboratory Equipment", date: "2025-08-20", amount: 25000, description: "New science lab equipment" },
      { id: "E003", title: "Stationery Purchase", date: "2025-08-15", amount: 8000, description: "Office and exam stationery" },
    ],
    otherIncome: [
      { id: "OI001", title: "Donation", date: "2025-08-10", amount: 50000, description: "Donation from alumni association" },
    ],
  },
};

/* ---------- LOCALSTORAGE KEYS ---------- */
const LS_KEYS = {
  DATA: "erp_data",
  SESSION: "erp_session",
};

/* ---------- DATA MANAGER ---------- */
const DataManager = {
  /* Initialize: seed dummy data if not already in localStorage */
  init() {
    if (!localStorage.getItem(LS_KEYS.DATA)) {
      this.saveData(JSON.parse(JSON.stringify(SEED_DATA)));
    }
  },

  /* Get all data from localStorage */
  getData() {
    const raw = localStorage.getItem(LS_KEYS.DATA);
    return raw ? JSON.parse(raw) : null;
  },

  /* Save all data to localStorage */
  saveData(data) {
    localStorage.setItem(LS_KEYS.DATA, JSON.stringify(data));
  },

  /* Reset to seed data */
  reset() {
    localStorage.setItem(LS_KEYS.DATA, JSON.stringify(JSON.parse(JSON.stringify(SEED_DATA))));
  },

  /* Update a specific section of data */
  update(key, value) {
    const data = this.getData();
    data[key] = value;
    this.saveData(data);
  },
};

/* ---------- AUTH MANAGER ---------- */
const Auth = {
  /* Set current session */
  setSession(user) {
    localStorage.setItem(LS_KEYS.SESSION, JSON.stringify(user));
  },

  /* Get current session */
  getSession() {
    const raw = localStorage.getItem(LS_KEYS.SESSION);
    return raw ? JSON.parse(raw) : null;
  },

  /* Clear session (logout) */
  logout() {
    localStorage.removeItem(LS_KEYS.SESSION);
    window.location.href = "index.html";
  },

  /* Check if user is logged in, else redirect */
  requireLogin() {
    const session = this.getSession();
    if (!session) {
      window.location.href = "index.html";
      return null;
    }
    return session;
  },

  /* Check if user is admin, else redirect */
  requireAdmin() {
    const session = this.requireLogin();
    if (!session) return null;
    if (session.role !== "admin") {
      alert("Access denied. Admin only.");
      this.logout();
      return null;
    }
    return session;
  },

  /* Check if user is staff, else redirect */
  requireStaff() {
    const session = this.requireLogin();
    if (!session) return null;
    if (session.role !== "staff") {
      alert("Access denied. Staff only.");
      this.logout();
      return null;
    }
    return session;
  },

  /* Check if user is student, else redirect */
  requireStudent() {
    const session = this.requireLogin();
    if (!session) return null;
    if (session.role !== "student") {
      alert("Access denied. Student only.");
      this.logout();
      return null;
    }
    return session;
  },
};

/* ---------- UI HELPERS ---------- */
const UI = {
  /* Show alert message in a container */
  showAlert(container, message, type = "success") {
    const alertDiv = document.createElement("div");
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `<span>${message}</span>`;
    container.prepend(alertDiv);
    setTimeout(() => {
      alertDiv.style.opacity = "0";
      setTimeout(() => alertDiv.remove(), 300);
    }, 4000);
  },

  /* Show toast notification */
  toast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `alert alert-${type}`;
    toast.style.cssText = "position:fixed;top:80px;right:20px;z-index:2000;min-width:250px;box-shadow:0 8px 20px rgba(0,0,0,0.12);";
    toast.innerHTML = `<span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.3s";
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  /* Open modal */
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add("active");
  },

  /* Close modal */
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove("active");
  },

  /* Format currency (INR) */
  formatCurrency(amount) {
    return "₹" + Number(amount).toLocaleString("en-IN");
  },

  /* Format date */
  formatDate(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  },

  /* Escape HTML to prevent XSS */
  escapeHtml(str) {
    if (str === null || str === undefined) return "";
    const div = document.createElement("div");
    div.textContent = String(str);
    return div.innerHTML;
  },
};

/* ---------- SIDEBAR & HEADER BUILDER ---------- */
const Layout = {
  /* Build the top header bar */
  renderHeader(session) {
    const name = session.name || session.userId;
    const roleTag = `<span class="role-tag ${session.role}">${session.role}</span>`;
    return `
      <header class="top-header">
        <div style="display:flex;align-items:center;gap:var(--sp-3)">
          ${session.role !== "admin" || true ? '<button class="sidebar-toggle" onclick="Layout.toggleSidebar()">&#9776;</button>' : '<button class="sidebar-toggle" onclick="Layout.toggleSidebar()">&#9776;</button>'}
          <div class="header-brand">
            <span class="logo-icon">🎓</span>
            <span class="brand-text">Greenwood ERP</span>
          </div>
        </div>
        <div class="header-right">
          <div class="user-badge">
            <span class="user-name">${UI.escapeHtml(name)}</span>
            ${roleTag}
          </div>
          <button class="btn-logout" onclick="Auth.logout()">Logout</button>
        </div>
      </header>
    `;
  },

  /* Admin sidebar navigation */
  adminSidebar(activePage) {
    const links = [
      { href: "admin-dashboard.html", icon: "📊", label: "Dashboard" },
      { href: "students.html", icon: "👨‍🎓", label: "Student Management" },
      { href: "staff.html", icon: "👩‍🏫", label: "Staff Management" },
      { href: "notices.html", icon: "📢", label: "Notice Board" },
      { href: "curriculum.html", icon: "📚", label: "Curriculum" },
      { href: "student-attendance.html", icon: "✅", label: "Student Attendance" },
      { href: "staff-salary.html", icon: "💰", label: "Staff Attendance & Salary" },
      { href: "fees.html", icon: "💳", label: "Fee Management" },
      { href: "accounts.html", icon: "🧾", label: "Accounts" },
      { href: "exams.html", icon: "📝", label: "Exam & Results" },
    ];
    return this._sidebar(links, activePage);
  },

  /* Staff sidebar navigation (limited) */
  staffSidebar(activePage) {
    const links = [
      { href: "staff-attendance.html", icon: "📋", label: "Attendance Dashboard" },
    ];
    return this._sidebar(links, activePage);
  },

  /* Student sidebar navigation (limited) */
  studentSidebar(activePage) {
    const links = [
      { href: "student-dashboard.html", icon: "🏠", label: "My Dashboard" },
    ];
    return this._sidebar(links, activePage);
  },

  /* Build sidebar HTML from link objects */
  _sidebar(links, activePage) {
    const navItems = links.map(l =>
      `<a href="${l.href}" class="${l.href === activePage ? "active" : ""}">
        <span class="nav-icon">${l.icon}</span>
        <span>${l.label}</span>
      </a>`
    ).join("");
    return `
      <div class="sidebar-backdrop" id="sidebarBackdrop" onclick="Layout.toggleSidebar()"></div>
      <aside class="sidebar" id="sidebar">
        <nav class="sidebar-nav">
          <div class="sidebar-section-label">Main Menu</div>
          ${navItems}
        </nav>
      </aside>
    `;
  },

  /* Toggle sidebar on mobile */
  toggleSidebar() {
    const sb = document.getElementById("sidebar");
    const bd = document.getElementById("sidebarBackdrop");
    if (sb) sb.classList.toggle("open");
    if (bd) bd.classList.toggle("active");
  },

  /* Build the full app shell (header + sidebar + content wrapper) */
  renderShell(session, sidebarHtml, activePage) {
    return this.renderHeader(session) + `<div class="app-shell">` + sidebarHtml + `<main class="main-content">`;
  },
};

/* ---------- DATA CALCULATION HELPERS ---------- */
const Calc = {
  /* Calculate attendance percentage for a student */
  studentAttendancePct(student) {
    if (!student.attendance || student.attendance.length === 0) return 0;
    const present = student.attendance.filter(a => a.status === "present" || a.status === "late").length;
    return Math.round((present / student.attendance.length) * 100);
  },

  /* Calculate pending fee for a student */
  studentPendingFee(student) {
    return (student.fees.totalFee || 0) - (student.fees.paidAmount || 0);
  },

  /* Calculate fee status */
  feeStatus(student) {
    const pending = this.studentPendingFee(student);
    if (pending <= 0) return { label: "Paid", class: "badge-paid" };
    if (student.fees.paidAmount > 0) return { label: "Partial", class: "badge-partial" };
    return { label: "Unpaid", class: "badge-unpaid" };
  },

  /* Calculate grade from percentage */
  gradeFromPct(pct) {
    if (pct >= 90) return "A+";
    if (pct >= 80) return "A";
    if (pct >= 70) return "B+";
    if (pct >= 60) return "B";
    if (pct >= 50) return "C";
    if (pct >= 40) return "D";
    return "F";
  },

  /* Determine pass/fail */
  passFail(pct, passingPct = 33) {
    return pct >= passingPct ? "Pass" : "Fail";
  },

  /* Calculate staff attendance percentage */
  staffAttendancePct(staff) {
    if (!staff.attendance || staff.attendance.length === 0) return 0;
    const present = staff.attendance.filter(a => a.status === "present" || a.status === "late").length;
    return Math.round((present / staff.attendance.length) * 100);
  },

  /* Calculate salary */
  calculateSalary(baseSalary, workingDays, presentDays, absentDays, adjustment = 0) {
    const perDaySalary = baseSalary / workingDays;
    const absentDeduction = absentDays * perDaySalary;
    const finalSalary = baseSalary - absentDeduction + Number(adjustment);
    return {
      perDaySalary: Math.round(perDaySalary),
      absentDeduction: Math.round(absentDeduction),
      finalSalary: Math.round(finalSalary),
    };
  },

  /* Generate next receipt number */
  nextReceiptNo() {
    const data = DataManager.getData();
    let max = 0;
    data.students.forEach(s => {
      s.fees.payments.forEach(p => {
        const num = parseInt(p.receiptNo.replace(/\D/g, ""));
        if (num > max) max = num;
      });
    });
    return "RCP" + String(max + 1).padStart(3, "0");
  },
};

/* ---------- NOTICE HELPER: filter notices by audience ---------- */
function getNoticesFor(audience, classInfo) {
  const data = DataManager.getData();
  return data.notices.filter(n => {
    if (!n.published) return false;
    if (n.audience === "All Users") return true;
    if (audience === "admin") return true;
    if (n.audience === "Staff" && audience === "staff") return true;
    if (n.audience === "All Students" && audience === "student") return true;
    if (n.audience === "Specific Class" && audience === "student" && classInfo && n.specificClass === classInfo) return true;
    return false;
  });
}

/* ---------- FORM VALIDATION HELPER ---------- */
function validateForm(fields) {
  for (const f of fields) {
    const el = document.getElementById(f.id);
    if (!el) continue;
    const val = el.value.trim();
    if (f.required && !val) {
      UI.toast(f.label + " is required", "error");
      el.focus();
      return false;
    }
    if (f.pattern && val && !f.pattern.test(val)) {
      UI.toast(f.label + " format is invalid", "error");
      el.focus();
      return false;
    }
  }
  return true;
}

/* ---------- INITIALIZE ON LOAD ---------- */
DataManager.init();
