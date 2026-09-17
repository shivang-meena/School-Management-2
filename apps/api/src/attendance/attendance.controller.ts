import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client'; import { MarkAttendanceSchema } from '@erp/contracts'; import { JwtAuthGuard } from '../auth/jwt-auth.guard'; import { Roles } from '../auth/roles.decorator'; import { RolesGuard } from '../auth/roles.guard'; import { AttendanceService } from './attendance.service';
@Controller('attendance') @UseGuards(JwtAuthGuard, RolesGuard) export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}
  @Post('students') @Roles(Role.ADMIN, Role.EMPLOYEE) students(@Body() b: unknown, @Req() req: any) { return this.service.markStudents(MarkAttendanceSchema.parse(b), req.user); }
  @Post('employees') @Roles(Role.ADMIN, Role.EMPLOYEE) employees(@Body() b: unknown, @Req() req: any) { return this.service.markEmployees(MarkAttendanceSchema.parse(b), req.user); }
  @Get('students/:studentId') @Roles(Role.ADMIN, Role.EMPLOYEE, Role.STUDENT) studentHistory(@Param('studentId') id: string, @Req() req: any) { return this.service.studentHistory(id, req.user); }
  @Get('employees/:employeeId') @Roles(Role.ADMIN, Role.EMPLOYEE) employeeHistory(@Param('employeeId') id: string, @Req() req: any) { return this.service.employeeHistory(id, req.user); }
}
