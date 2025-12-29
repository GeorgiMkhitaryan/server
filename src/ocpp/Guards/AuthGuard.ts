import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common'

@Injectable()
export class AuthGuard implements CanActivate {
    canActivate(ctx: ExecutionContext): boolean {
      console.log(ctx);
      
    // const req = ctx.switchToHttp().getRequest()
    // if (!req.user) throw new ForbiddenException()
    return true
  }
}
