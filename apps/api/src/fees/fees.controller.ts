import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common'; import { Role } from '@prisma/client'; import { RecordPaymentSchema } from '@erp/contracts'; import { JwtAuthGuard } from '../auth/jwt-auth.guard'; import { Roles } from '../auth/roles.decorator'; import { RolesGuard } from '../auth/roles.guard'; import { FeesService } from './fees.service';
@Controller('fees') @UseGuards(JwtAuthGuard, RolesGuard) export class FeesController { constructor(private readonly service: FeesService) {}
  @Get('structures') @Roles(Role.ADMIN) structures() { return this.service.structures(); }
  @Get('accounts') @Roles(Role.ADMIN) accounts() { return this.service.accounts(); }
  @Get('me') @Roles(Role.STUDENT) me(@Req() req: any) { return this.service.mySummary(req.user); }
  @Post('structures') @Roles(Role.ADMIN) structure(@Body() b: any) { return this.service.upsertStructure(b); }
  @Get('accounts/:id') @Roles(Role.ADMIN, Role.STUDENT) summary(@Param('id') id: string, @Req() req: any) { return this.service.summary(id, req.user); }
  @Post('manual-payments') @Roles(Role.ADMIN) manual(@Body() b: unknown, @Req() req: any) { return this.service.manualPayment(RecordPaymentSchema.parse(b), req.user.id); }
  @Post('online/orders') @Roles(Role.STUDENT) order(@Body() b: any, @Req() req: any) { return this.service.createOnlineOrder(b.feeAccountId, Number(b.amount), req.user); }
  @Post('online/verify') @Roles(Role.STUDENT) verify(@Body() b: any, @Req() req: any) { return this.service.verifyOnline(b, req.user); }
}
