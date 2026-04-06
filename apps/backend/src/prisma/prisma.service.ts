import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    const connectionString = process.env['DATABASE_URL'];
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL environment variable is required. See apps/backend/.env.example',
      );
    }
    const { Pool } = pg;
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
