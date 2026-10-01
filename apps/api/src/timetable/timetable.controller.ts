import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { TimetableService } from './timetable.service';

@Controller('timetable')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TimetableController {
  constructor(private readonly service: TimetableService) {}

  @Post('section-schedule')
  @Roles(Role.ADMIN)
  saveSectionSchedule(@Body() body: any) {
    return this.service.saveSectionSchedule(body);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() b: any) {
    return this.service.create(b);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Get()
  @Roles(Role.ADMIN, Role.EMPLOYEE, Role.STUDENT)
  list(@Query() q: any, @Req() req: any) {
    return this.service.list(q, req.user);
  }
}
