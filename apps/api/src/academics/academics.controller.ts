import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'; import { Role } from '@prisma/client'; import { JwtAuthGuard } from '../auth/jwt-auth.guard'; import { Roles } from '../auth/roles.decorator'; import { RolesGuard } from '../auth/roles.guard'; import { AcademicsService } from './academics.service';
@Controller('academics') @UseGuards(JwtAuthGuard, RolesGuard) export class AcademicsController {
  constructor(private readonly service: AcademicsService) {}
  @Get() @Roles(Role.ADMIN, Role.EMPLOYEE, Role.STUDENT) overview() { return this.service.overview(); }
  @Post('years') @Roles(Role.ADMIN) year(@Body() b: any) { return this.service.createYear(b); }
  @Patch('years/:id/current') @Roles(Role.ADMIN) current(@Param('id') id: string) { return this.service.setCurrent(id); }
  @Post('classes') @Roles(Role.ADMIN) schoolClass(@Body() b: any) { return this.service.createClass(b); }
  @Post('sections') @Roles(Role.ADMIN) section(@Body() b: any) { return this.service.createSection(b); }
  @Post('subjects') @Roles(Role.ADMIN) subject(@Body() b: any) { return this.service.createSubject(b); }
  @Get('calendar') @Roles(Role.ADMIN, Role.EMPLOYEE, Role.STUDENT) calendar(@Query('academicYearId') id: string) { return this.service.calendar(id); }
  @Post('calendar') @Roles(Role.ADMIN) calendarEntry(@Body() b: any) { return this.service.upsertCalendar(b); }
  @Post('teacher-assignments') @Roles(Role.ADMIN) teacher(@Body() b: any) { return this.service.assignTeacher(b); }
  @Delete('teacher-assignments/:id') @Roles(Role.ADMIN) deleteTeacher(@Param('id') id: string) { return this.service.deleteAssignment(id); }
  @Post('class-teacher-assignments') @Roles(Role.ADMIN) classTeacher(@Body() b: any) { return this.service.assignTeacher(b, true); }
  @Delete('class-teacher-assignments/:id') @Roles(Role.ADMIN) deleteClassTeacher(@Param('id') id: string) { return this.service.deleteAssignment(id, true); }
  @Delete(':type/:id') @Roles(Role.ADMIN) deleteRecord(@Param('type') type: string, @Param('id') id: string) { return this.service.deleteRecord(type, id); }
  @Post('enrollments/:studentId/transfer') @Roles(Role.ADMIN) transfer(@Param('studentId') id: string, @Body() b: any) { return this.service.transfer(id, b); }
}
