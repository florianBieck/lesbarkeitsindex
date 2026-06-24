import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { AuthService } from './auth.service.js';
import { toWebHeaders } from './web-headers.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const headers = toWebHeaders(request.headers);

    const session = await this.authService.auth.api.getSession({ headers });

    if (!session) {
      throw new UnauthorizedException();
    }

    return true;
  }
}
