import { SetMetadata } from '@nestjs/common';
import { EmployeeSubRole, Role } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: (Role | EmployeeSubRole)[]) => SetMetadata(ROLES_KEY, roles);
