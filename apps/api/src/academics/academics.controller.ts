import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'; import { Role } from '@prisma/client'; import { JwtAuthGuard } from '../auth/jwt-auth.guard'; import { Roles } from '../auth/roles.decorator'; import { RolesGuard } from '../auth/roles.guard'; import { AcademicsService } from './academics.service';
@Controller('academics') @UseGuards(JwtAuthGuard, RolesGuard) export class AcademicsController {
  constructor(private readonly service: AcademicsService) {}
  @Get() @Roles(Role.ADMIN, Role.EMPLOYEE, Role.STUDENT) overview() { return this.service.overview(); }
  @Post('years') @Roles(Role.ADMIN) year(@Body() b: any) { return this.service.createYear(b); }
  @Patch('years/:id/current') @Roles(Role.ADMIN) current(@Param('id') id: string) { return this.service.setCurrent(id); }
  @Post('classes') @Roles(Role.ADMIN) schoolClass(@Body() b: any) { return this.service.createClass(b); }
  @Post('sections') @Roles(Role.ADMIN) section(@Body() b: any) { return this.service.createSection(b); }
  @Post('subjects') @Roles(Role.ADMIN) subject(@Body() b: any) { return this.service.createSubject(b); }
  @Get('calendar') @Roles(Role.ADMIN, Role.EMPLOYEE, Role.STUDENT) calendar(@Query('academicYearId') id?: string) { return this.service.calendar(id); }
  @Post('calendar') @Roles(Role.ADMIN) calendarEntry(@Body() b: any) { return this.service.upsertCalendar(b); }
  @Patch('calendar/:id') @Roles(Role.ADMIN) updateCalendar(@Param('id') id: string, @Body() b: any) { return this.service.updateCalendar(id, b); }
  @Delete('calendar/:id') @Roles(Role.ADMIN) deleteCalendar(@Param('id') id: string) { return this.service.deleteCalendar(id); }
  @Post('teacher-assignments') @Roles(Role.ADMIN) teacher(@Body() b: any) { return this.service.assignTeacher(b); }
  @Delete('teacher-assignments/:id') @Roles(Role.ADMIN) deleteTeacher(@Param('id') id: string) { return this.service.deleteAssignment(id); }
  @Post('class-teacher-assignments') @Roles(Role.ADMIN) classTeacher(@Body() b: any) { return this.service.assignTeacher(b, true); }
  @Delete('class-teacher-assignments/:id') @Roles(Role.ADMIN) deleteClassTeacher(@Param('id') id: string) { return this.service.deleteAssignment(id, true); }
  @Get('parent-subjects') @Roles(Role.ADMIN, Role.EMPLOYEE, Role.STUDENT) parentSubjects(@Query('includeInactive') inc?: string) { return this.service.getParentSubjects(inc === 'true'); }
  @Post('parent-subjects') @Roles(Role.ADMIN) createParentSubject(@Body() b: any) { return this.service.createParentSubject(b); }
  @Patch('parent-subjects/:id') @Roles(Role.ADMIN) updateParentSubject(@Param('id') id: string, @Body() b: any) { return this.service.updateParentSubject(id, b); }
  @Delete('parent-subjects/:id') @Roles(Role.ADMIN) deleteParentSubject(@Param('id') id: string) { return this.service.deleteParentSubject(id); }

  @Get('classes/:classId/subjects') @Roles(Role.ADMIN, Role.EMPLOYEE, Role.STUDENT) classSubjects(@Param('classId') classId: string) { return this.service.getClassSubjects(classId); }
  @Post('classes/:classId/subjects') @Roles(Role.ADMIN) assignClassSubject(@Param('classId') classId: string, @Body() b: any) { return this.service.assignClassSubject(classId, b); }
  @Delete('classes/:classId/subjects/:subjectId') @Roles(Role.ADMIN) removeClassSubject(@Param('classId') classId: string, @Param('subjectId') subjectId: string, @Query('parentSubjectId') parentSubjectId?: string) { return this.service.removeClassSubject(classId, subjectId, parentSubjectId); }
  @Patch('class-subjects/:id') @Roles(Role.ADMIN) updateClassSubject(@Param('id') id: string, @Body() b: any) { return this.service.updateClassSubject(id, b); }
  @Delete('class-subjects/:id') @Roles(Role.ADMIN) deleteClassSubjectById(@Param('id') id: string) { return this.service.deleteClassSubjectById(id); }

  @Post('enrollments/:studentId/transfer') @Roles(Role.ADMIN) transfer(@Param('studentId') id: string, @Body() b: any) { return this.service.transfer(id, b); }
  @Delete(':type/:id') @Roles(Role.ADMIN) deleteRecord(@Param('type') type: string, @Param('id') id: string) { return this.service.deleteRecord(type, id); }
}

