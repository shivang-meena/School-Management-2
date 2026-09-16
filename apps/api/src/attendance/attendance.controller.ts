import { Controller, Get, Post, Body, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { MarkAttendanceSchema } from '@erp/contracts';

@ApiTags('attendance')
@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post(':targetType')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark attendance for students or staff' })
  mark(
    @Param('targetType') targetType: 'STUDENT' | 'STAFF',
    @Body() body: any,
  ) {
    const validated = MarkAttendanceSchema.parse(body);
    return this.attendanceService.markAttendance(targetType.toUpperCase() as any, validated);
  }

  @Get(':targetType/date')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get attendance records by date' })
  getByDate(
    @Param('targetType') targetType: 'STUDENT' | 'STAFF',
    @Query('date') date: string,
  ) {
    return this.attendanceService.getAttendanceByDate(targetType.toUpperCase() as any, date);
  }

  @Get(':targetType/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get individual attendance history and percentage' })
  getIndividual(
    @Param('targetType') targetType: 'STUDENT' | 'STAFF',
    @Param('id') id: string,
  ) {
    return this.attendanceService.getIndividualAttendance(targetType.toUpperCase() as any, id);
  }
}
