import { All, Controller, Req, Res } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service.js';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @All('*')
  async handleAuth(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    const url = new URL(req.url, `http://${req.hostname}`);
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
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

    const webRequest = new Request(url.toString(), {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    const response = await this.authService.auth.handler(webRequest);

    reply.status(response.status);

    response.headers.forEach((value, key) => {
      reply.header(key, value);
    });

    const body = await response.text();
    reply.send(body);
  }
}
