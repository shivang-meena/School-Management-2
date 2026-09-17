import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CreateStudentSchema, PendingRegistrationSchema, UpdateStudentSchema } from '@erp/contracts';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; import { Roles } from '../auth/roles.decorator'; import { RolesGuard } from '../auth/roles.guard'; import { StudentsService } from './students.service';

@Controller('students') export class StudentsController {
  constructor(private readonly service: StudentsService) {}
  @Get() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN, Role.EMPLOYEE) list(@Query() q: any) { return this.service.findAll(q); }
  @Get('registrations') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN) registrations() { return this.service.getPendingRegistrations(); }
  @Post('register-admission') register(@Body() body: unknown) { return this.service.submitPendingRegistration(PendingRegistrationSchema.parse(body)); }
  @Patch('registrations/:id/reject') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN) reject(@Param('id') id: string, @Body('reason') reason: string) { return this.service.rejectRegistration(id, reason); }
  @Get(':id') @UseGuards(JwtAuthGuard) one(@Param('id') id: string, @Req() req: any) { return this.service.findOne(id, req.user); }
  @Post() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN) create(@Body() body: unknown, @Req() req: any) { return this.service.create(CreateStudentSchema.parse(body), req.user.id); }
  @Patch(':id') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN) update(@Param('id') id: string, @Body() body: unknown, @Req() req: any) { return this.service.update(id, UpdateStudentSchema.parse(body), req.user.id); }
  @Post(':id/reset-password') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN) resetPassword(@Param('id') id: string, @Body('password') password: string, @Req() req: any) { return this.service.resetPassword(id, password, req.user.id); }
  @Post(':id/deactivate') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN) deactivate(@Param('id') id: string, @Body('reason') reason: string, @Req() req: any) { return this.service.deactivate(id, req.user.id, reason); }
}
