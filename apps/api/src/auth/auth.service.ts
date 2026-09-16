import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { LoginInput } from '@erp/contracts';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginInput) {
    // Find user by userId or email
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { userId: dto.userId },
          { email: dto.userId },
        ],
      },
      include: {
        student: true,
        staff: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (dto.role && user.role !== dto.role) {
      throw new UnauthorizedException(`Account is not registered as ${dto.role}`);
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      userId: user.userId,
      role: user.role,
      name: user.name,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        userId: user.userId,
        email: user.email,
        name: user.name,
        role: user.role,
        studentId: user.student?.studentId,
        staffId: user.staff?.staffId,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        student: true,
        staff: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      userId: user.userId,
      email: user.email,
      name: user.name,
      role: user.role,
      student: user.student,
      staff: user.staff,
    };
  }
}
