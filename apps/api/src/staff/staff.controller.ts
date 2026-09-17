import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common'; import { Role } from '@prisma/client'; import { CreateStaffSchema, UpdateStaffSchema } from '@erp/contracts'; import { JwtAuthGuard } from '../auth/jwt-auth.guard'; import { Roles } from '../auth/roles.decorator'; import { RolesGuard } from '../auth/roles.guard'; import { StaffService } from './staff.service';
@Controller('employees') @UseGuards(JwtAuthGuard, RolesGuard) export class StaffController {
  constructor(private readonly service: StaffService) {}
  @Get() @Roles(Role.ADMIN) list(@Query() q: any) { return this.service.findAll(q); }
  @Get(':id') @Roles(Role.ADMIN, Role.EMPLOYEE) one(@Param('id') id: string, @Req() req: any) { return this.service.findOne(id, req.user); }
  @Post() @Roles(Role.ADMIN) create(@Body() b: unknown, @Req() req: any) { return this.service.create(CreateStaffSchema.parse(b), req.user.id); }
  @Patch(':id') @Roles(Role.ADMIN) update(@Param('id') id: string, @Body() b: unknown, @Req() req: any) { return this.service.update(id, UpdateStaffSchema.parse(b), req.user.id); }
  @Post(':id/salary-revisions') @Roles(Role.ADMIN) revision(@Param('id') id: string, @Body() b: any, @Req() req: any) { return this.service.addSalaryRevision(id, b, req.user.id); }
  @Post(':id/deactivate') @Roles(Role.ADMIN) deactivate(@Param('id') id: string, @Body('reason') reason: string, @Req() req: any) { return this.service.deactivate(id, req.user.id, reason); }
  @Post(':id/password') @Roles(Role.ADMIN) password(@Param('id') id: string, @Body('password') password: string, @Req() req: any) { return this.service.setPassword(id, password, req.user.id); }
}
