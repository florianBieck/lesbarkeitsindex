import { Module } from '@nestjs/common';
import { CalculateController } from './calculate.controller.js';
import { CalculateService } from './calculate.service.js';
import { RSidecarModule } from '../r-sidecar/r-sidecar.module.js';

@Module({
  imports: [RSidecarModule],
  controllers: [CalculateController],
  providers: [CalculateService],
})
export class CalculateModule {}
