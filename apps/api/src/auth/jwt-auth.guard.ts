import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) { return super.canActivate(context); }
  handleRequest<TUser = any>(err: any, user: TUser, info: any, context: ExecutionContext): TUser {
    return super.handleRequest(err, user, info, context) as TUser;
  }
}
