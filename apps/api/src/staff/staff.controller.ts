import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreateStaffSchema, UpdateStaffSchema } from '@erp/contracts';

@ApiTags('staff')
@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all staff members' })
  findAll(
    @Query('designation') designation?: string,
    @Query('search') search?: string,
  ) {
    return this.staffService.findAll({ designation, search });
  }

  @Get('salary-calc')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Calculate monthly salary breakdown for a staff member' })
  calcSalary(
    @Query('staffId') staffId: string,
    @Query('workingDays') workingDays: string,
    @Query('absentDays') absentDays: string,
    @Query('adjustment') adjustment?: string,
  ) {
    return this.staffService.calculateSalary(
      staffId,
      Number(workingDays || 30),
      Number(absentDays || 0),
      Number(adjustment || 0),
    );
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get staff details by ID' })
  findOne(@Param('id') id: string) {
    return this.staffService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new staff member' })
  create(@Body() body: any) {
    const validated = CreateStaffSchema.parse(body);
    return this.staffService.create(validated);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update staff member' })
  update(@Param('id') id: string, @Body() body: any) {
    const validated = UpdateStaffSchema.parse(body);
    return this.staffService.update(id, validated);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete staff member' })
  remove(@Param('id') id: string) {
    return this.staffService.remove(id);
  }
}
