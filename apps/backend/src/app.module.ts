import { resolve } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { RSidecarModule } from './r-sidecar/r-sidecar.module.js';
import { AppConfigModule } from './config/config.module.js';
import { CalculateModule } from './calculate/calculate.module.js';
import { ResultsModule } from './results/results.module.js';
import { HealthController } from './health.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolve(__dirname, '..', '..', '..', '.env'),
    }),
    PrismaModule,
    AuthModule,
    RSidecarModule,
    AppConfigModule,
    CalculateModule,
    ResultsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
