import { Module } from '@nestjs/common';
import { join } from 'node:path';
import { RSidecarModule } from './r-sidecar/r-sidecar.module.js';
import { AppConfigModule } from './config/config.module.js';
import { CalculateModule } from './calculate/calculate.module.js';
import { HealthController } from './health.controller.js';
import { spaImports } from './spa/spa-imports.js';

/** The frontend's `vite build` output: the same depth from `src/` and `dist/`, in Docker and in a checkout. */
const SPA_ROOT = join(__dirname, '..', '..', 'frontend', 'dist');

@Module({
  imports: [RSidecarModule, AppConfigModule, CalculateModule, ...spaImports(SPA_ROOT)],
  controllers: [HealthController],
})
export class AppModule {}
