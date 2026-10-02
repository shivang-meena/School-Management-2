import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { EmployeeSubRole, Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SalaryService } from './salary.service';

@Controller('salary')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalaryController {
  constructor(private readonly service: SalaryService) {}

  @Get('accounts')
  @Roles(Role.ADMIN, EmployeeSubRole.ACCOUNTANT)
  accounts(@Query('subRole') subRole?: string, @Query('month') month?: string, @Query('year') year?: string) {
    const m = month ? parseInt(month, 10) : undefined;
    const y = year ? parseInt(year, 10) : undefined;
    return this.service.accounts(subRole, m, y);
  }

  @Post(':id/payments')
  @Roles(Role.ADMIN, EmployeeSubRole.ACCOUNTANT)
  pay(@Param('id') id: string, @Body() b: any, @Req() req: any) {
    return this.service.pay(id, b, req.user.id);
  }

  @Get('my-salary')
  @Roles(Role.EMPLOYEE)
  mySalary(@Req() req: any) {
    return this.service.mySalary(req.user);
  }

  @Get()
  @Roles(Role.ADMIN, Role.EMPLOYEE)
  history(@Query('employeeId') id: string, @Req() req: any) {
    return this.service.history(id, req.user);
  }
}
