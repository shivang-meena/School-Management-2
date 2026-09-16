import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FeesService } from './fees.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { RecordPaymentSchema } from '@erp/contracts';

@ApiTags('fees')
@Controller('fees')
@UseGuards(JwtAuthGuard)
export class FeesController {
  constructor(private readonly feesService: FeesService) {}

  @Get('overview')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get overall fee collection metrics' })
  getOverview() {
    return this.feesService.getFeeOverview();
  }

  @Get('payments')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all fee payment receipts' })
  getAllPayments() {
    return this.feesService.getAllPayments();
  }

  @Post('pay')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Record a student fee payment' })
  recordPayment(@Body() body: any) {
    const validated = RecordPaymentSchema.parse(body);
    return this.feesService.recordPayment(validated);
  }

  @Get('student/:studentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get fee ledger and receipts for a student' })
  getStudentFees(@Param('studentId') studentId: string) {
    return this.feesService.getStudentFeeSummary(studentId);
  }
}
