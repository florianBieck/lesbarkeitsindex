import { All, Controller, Req, Res } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { fromNodeHeaders } from 'better-auth/node';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @All('*')
  async handleAuth(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    const url = new URL(req.url, `http://${req.hostname}`);
    const headers = fromNodeHeaders(req.headers);

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
