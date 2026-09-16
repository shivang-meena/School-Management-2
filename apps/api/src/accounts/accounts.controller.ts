import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreateTransactionSchema } from '@erp/contracts';

@ApiTags('accounts')
@Controller('accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get overall school finance overview' })
  getOverview() {
    return this.accountsService.getOverview();
  }

  @Post()
  @ApiOperation({ summary: 'Create income or expense entry' })
  create(@Body() body: any) {
    const validated = CreateTransactionSchema.parse(body);
    return this.accountsService.createTransaction(validated);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a transaction' })
  remove(@Param('id') id: string) {
    return this.accountsService.removeTransaction(id);
  }
}
