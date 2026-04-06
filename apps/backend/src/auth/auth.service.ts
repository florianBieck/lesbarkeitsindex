import { Injectable } from '@nestjs/common';
import { betterAuth } from 'better-auth';
import { admin } from 'better-auth/plugins';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AuthService {
  public readonly auth;

  constructor(prisma: PrismaService) {
    if (!process.env['BETTER_AUTH_SECRET']) {
      throw new Error(
        'BETTER_AUTH_SECRET environment variable is required. See apps/backend/.env.example',
      );
    }
    if (!process.env['BETTER_AUTH_URL']) {
      throw new Error(
        'BETTER_AUTH_URL environment variable is required. See apps/backend/.env.example',
      );
    }

    this.auth = betterAuth({
      trustedOrigins: [
        'http://localhost:3001',
        'http://lix.localhost',
        'https://lix.localhost',
        'https://lix.florianbieck.com',
      ],
      database: prismaAdapter(prisma, {
        provider: 'postgresql',
      }),
      emailAndPassword: {
        enabled: true,
      },
      plugins: [admin()],
    });
  }
}
