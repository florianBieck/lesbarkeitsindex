import { Module } from '@nestjs/common';
import { ThrottlerModule, seconds } from '@nestjs/throttler';
import { CalculateController } from './calculate.controller.js';
import { CalculateService } from './calculate.service.js';
import { DefaultConfigModule } from '../config/default-config.module.js';
import { RSidecarModule } from '../r-sidecar/r-sidecar.module.js';

/**
 * Obergrenze für `POST /api/calculate` (ADR 0008): 60 Anfragen pro Minute und
 * IP-Adresse. Der Endpunkt ist öffentlich, und jeder Aufruf beschäftigt den R-Dienst.
 * Gezählt wird im Arbeitsspeicher des Backends; ein Neustart setzt die Zähler zurück.
 */
const CALCULATE_RATE_LIMIT = { ttl: seconds(60), limit: 60 };

@Module({
  imports: [RSidecarModule, DefaultConfigModule, ThrottlerModule.forRoot([CALCULATE_RATE_LIMIT])],
  controllers: [CalculateController],
  providers: [CalculateService],
})
export class CalculateModule {}
