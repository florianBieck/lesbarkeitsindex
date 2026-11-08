import { All, Controller, Req, Res } from '@nestjs/common';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @All('*path')
  async handleAuth(@Req() req: ExpressRequest, @Res() res: ExpressResponse) {
    const url = new URL(req.url, `http://${req.hostname}`);
    const headers = fromNodeHeaders(req.headers);

    // Nests globaler JSON-Parser hat den Body schon gelesen; Better-Auth bekommt ihn neu serialisiert.
    const webRequest = new Request(url.toString(), {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    const response = await this.authService.auth.handler(webRequest);

    res.status(response.status);

    response.headers.forEach((value, key) => {
      if (key !== 'set-cookie') {
        res.setHeader(key, value);
      }
    });

    // Express' res.header()/res.set() ersetzen den Header: ein Aufruf je Cookie behielte nur
    // das letzte, und nach dem Abmelden bliebe das Session-Cookie im Browser.
    const cookies = response.headers.getSetCookie();
    if (cookies.length > 0) {
      res.setHeader('set-cookie', cookies);
    }

    res.send(await response.text());
  }
}
