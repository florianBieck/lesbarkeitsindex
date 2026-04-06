import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { AuthService } from './auth.service.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers)) {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          for (const v of value) {
            headers.append(key, v);
          }
        } else {
          headers.set(key, String(value));
        }
      }
    }

    const session = await this.authService.auth.api.getSession({ headers });

    if (!session) {
      throw new UnauthorizedException();
    }

    (request as FastifyRequest & { user: unknown; session: unknown }).user = session.user;
    (request as FastifyRequest & { session: unknown }).session = session.session;

    return true;
  }
}
