import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExamsService } from './exams.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreateExamSchema, EnterMarksSchema } from '@erp/contracts';

@ApiTags('exams')
@Controller('exams')
@UseGuards(JwtAuthGuard)
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all exams' })
  findAll(
    @Query('class') className?: string,
    @Query('section') section?: string,
  ) {
    return this.examsService.findAll({ class: className, section });
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get exam details and marks' })
  findOne(@Param('id') id: string) {
    return this.examsService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new exam' })
  create(@Body() body: any) {
    const validated = CreateExamSchema.parse(body);
    return this.examsService.create(validated);
  }

  @Post('marks')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enter or update marks for students in an exam' })
  enterMarks(@Body() body: any) {
    const validated = EnterMarksSchema.parse(body);
    return this.examsService.enterMarks(validated);
  }

  @Get('student/:studentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get student academic report card' })
  getStudentReport(@Param('studentId') studentId: string) {
    return this.examsService.getStudentReport(studentId);
  }
}
