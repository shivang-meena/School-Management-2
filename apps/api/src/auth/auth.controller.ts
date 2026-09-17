import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { LoginSchema } from '@erp/contracts';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('login') @HttpCode(200) login(@Body() body: unknown) { return this.auth.login(LoginSchema.parse(body)); }
  @Get('profile') @UseGuards(JwtAuthGuard) profile(@Req() req: any) { return this.auth.getProfile(req.user.id); }
  @Post('change-password') @UseGuards(JwtAuthGuard) change(@Req() req: any, @Body() body: any) { return this.auth.changePassword(req.user.id, body.currentPassword, body.newPassword); }
  @Post('logout') @UseGuards(JwtAuthGuard) @HttpCode(200) logout(@Req() req: any) { return this.auth.logout(req.user.id, req.user.jti); }
}
