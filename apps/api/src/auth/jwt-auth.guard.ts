import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) { return super.canActivate(context); }
  handleRequest<TUser = any>(err: any, user: TUser, info: any, context: ExecutionContext): TUser {
    const authenticated = super.handleRequest(err, user, info, context) as any;
    const path = context.switchToHttp().getRequest().route?.path || '';
    if (authenticated.mustChangePassword && !['/api/auth/change-password', '/api/auth/profile', '/api/auth/logout'].some((allowed) => path.endsWith(allowed.replace('/api', '')))) {
      throw new ForbiddenException('PASSWORD_CHANGE_REQUIRED');
    }
    return authenticated;
  }
}
