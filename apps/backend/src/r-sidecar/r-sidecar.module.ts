import { Module } from '@nestjs/common';
import { RSidecarService } from './r-sidecar.service.js';

@Module({
  providers: [RSidecarService],
  exports: [RSidecarService],
})
export class RSidecarModule {}
