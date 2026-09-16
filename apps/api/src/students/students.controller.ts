import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreateStudentSchema, UpdateStudentSchema, PendingRegistrationSchema } from '@erp/contracts';

@ApiTags('students')
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all students with optional class/section filter' })
  findAll(
    @Query('class') className?: string,
    @Query('section') section?: string,
    @Query('search') search?: string,
  ) {
    return this.studentsService.findAll({ class: className, section, search });
  }

  @Get('classes')
  @ApiOperation({ summary: 'Get list of all classes and sections' })
  getClasses() {
    return this.studentsService.getClasses();
  }

  @Get('registrations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pending admission registrations' })
  getRegistrations() {
    return this.studentsService.getPendingRegistrations();
  }

  @Post('register-admission')
  @ApiOperation({ summary: 'Public portal for student admission application' })
  submitAdmission(@Body() body: any) {
    const validated = PendingRegistrationSchema.parse(body);
    return this.studentsService.submitPendingRegistration(validated);
  }

  @Put('registrations/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update pending admission registration status' })
  updateRegistrationStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.studentsService.updateRegistrationStatus(id, status);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get student details by ID or studentId' })
  findOne(@Param('id') id: string) {
    return this.studentsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new student' })
  create(@Body() body: any) {
    const validated = CreateStudentSchema.parse(body);
    return this.studentsService.create(validated);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update student details' })
  update(@Param('id') id: string, @Body() body: any) {
    const validated = UpdateStudentSchema.parse(body);
    return this.studentsService.update(id, validated);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete student' })
  remove(@Param('id') id: string) {
    return this.studentsService.remove(id);
  }
}
