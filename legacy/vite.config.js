import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        adminLogin: resolve(__dirname, "admin-login.html"),
        userLogin: resolve(__dirname, "user-login.html"),
        studentRegistration: resolve(__dirname, "student-registration.html"),
        adminDashboard: resolve(__dirname, "admin-dashboard.html"),
        students: resolve(__dirname, "students.html"),
        staff: resolve(__dirname, "staff.html"),
        notices: resolve(__dirname, "notices.html"),
        curriculum: resolve(__dirname, "curriculum.html"),
        studentAttendance: resolve(__dirname, "student-attendance.html"),
        staffAttendance: resolve(__dirname, "staff-attendance.html"),
        staffSalary: resolve(__dirname, "staff-salary.html"),
        fees: resolve(__dirname, "fees.html"),
        accounts: resolve(__dirname, "accounts.html"),
        exams: resolve(__dirname, "exams.html"),
        studentDashboard: resolve(__dirname, "student-dashboard.html"),
      },
    },
  },
});
