import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common'; import { Role } from '@prisma/client'; import { JwtAuthGuard } from '../auth/jwt-auth.guard'; import { Roles } from '../auth/roles.decorator'; import { RolesGuard } from '../auth/roles.guard'; import { SalaryService } from './salary.service';
@Controller('salary') @UseGuards(JwtAuthGuard, RolesGuard) export class SalaryController { constructor(private readonly service: SalaryService) {}
  @Post('generate') @Roles(Role.ADMIN) generate(@Body() b: any) { return this.service.generate(b.employeeId, Number(b.month), Number(b.year)); }
  @Post(':id/finalize') @Roles(Role.ADMIN) finalize(@Param('id') id: string) { return this.service.finalize(id); }
  @Post(':id/payments') @Roles(Role.ADMIN) pay(@Param('id') id: string, @Body() b: any, @Req() req: any) { return this.service.pay(id, b, req.user.id); }
  @Get() @Roles(Role.ADMIN, Role.EMPLOYEE) history(@Query('employeeId') id: string, @Req() req: any) { return this.service.history(id, req.user); }
}
