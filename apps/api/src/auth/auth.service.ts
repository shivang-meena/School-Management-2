import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { LoginInput } from '@erp/contracts';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async login(dto: LoginInput) {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ loginId: dto.userId }, { email: dto.userId }] },
      include: { student: true, employee: true },
    });
    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException('Invalid credentials or inactive account');
    if (user.lockedUntil && user.lockedUntil > new Date()) throw new UnauthorizedException('Account temporarily locked');
    if (dto.role && user.role !== dto.role) throw new UnauthorizedException(`Account is not registered as ${dto.role}`);
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      const attempts = user.loginAttempts + 1;
      await this.prisma.user.update({ where: { id: user.id }, data: { loginAttempts: attempts, lockedUntil: attempts >= 5 ? new Date(Date.now() + 15 * 60_000) : null } });
      throw new UnauthorizedException('Invalid credentials');
    }
    await this.prisma.user.update({ where: { id: user.id }, data: { loginAttempts: 0, lockedUntil: null, mustChangePassword: false } });
    const jti = randomUUID();
    const accessToken = this.jwt.sign({ sub: user.id, role: user.role, version: user.sessionVersion, jti });
    await this.prisma.session.create({ data: { userId: user.id, tokenHash: this.hash(jti), expiresAt: new Date(Date.now() + 8 * 60 * 60_000) } });
    return { accessToken, user: this.profile(user) };
  }

  async getProfile(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, include: { student: true, employee: true } });
    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException('Account unavailable');
    return this.profile(user);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    if (newPassword.length < 8) throw new BadRequestException('New password must have at least 8 characters');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== 'ADMIN') throw new ForbiddenException('Only an administrator can change this password');
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) throw new UnauthorizedException('Current password is incorrect');
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(newPassword, 12), mustChangePassword: false, sessionVersion: { increment: 1 } } }),
      this.prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    return { message: 'Password changed. Please sign in again.' };
  }

  async logout(userId: string, jti?: string) {
    if (jti) await this.prisma.session.updateMany({ where: { userId, tokenHash: this.hash(jti), revokedAt: null }, data: { revokedAt: new Date() } });
    return { message: 'Signed out' };
  }

  private hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
  private profile(user: any) {
    return { id: user.id, loginId: user.loginId, email: user.email, name: user.name, role: user.role, studentId: user.student?.studentId, employeeId: user.employee?.employeeId, mustChangePassword: user.mustChangePassword };
  }
}
