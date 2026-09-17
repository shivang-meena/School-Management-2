import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is required');
    super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), ignoreExpiration: false, secretOrKey: secret });
  }
  async validate(payload: any) {
    const [user, session] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: payload.sub }, include: { student: true, employee: true } }),
      this.prisma.session.findUnique({ where: { tokenHash: createHash('sha256').update(payload.jti || '').digest('hex') } }),
    ]);
    if (!user || user.status !== 'ACTIVE' || user.sessionVersion !== payload.version || !session || session.revokedAt || session.expiresAt <= new Date()) throw new UnauthorizedException('Session is no longer valid');
    return { id: user.id, loginId: user.loginId, role: user.role, mustChangePassword: user.mustChangePassword, studentId: user.student?.studentId, employeeId: user.employee?.employeeId, employeeDbId: user.employee?.id, jti: payload.jti };
  }
}
