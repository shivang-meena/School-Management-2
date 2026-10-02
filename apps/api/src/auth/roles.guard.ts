import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EmployeeSubRole, Role } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<(Role | EmployeeSubRole)[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('You do not have permission to access this resource');
    }
    const matchesRole = requiredRoles.includes(user.role);
    const matchesSubRole = user.subRole && requiredRoles.includes(user.subRole);
    if (!matchesRole && !matchesSubRole) {
      throw new ForbiddenException('You do not have permission to access this resource');
    }
    return true;
  }
}
