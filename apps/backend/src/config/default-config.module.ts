import { Module } from '@nestjs/common';
import { DefaultConfigService } from './default-config.service.js';

@Module({
  providers: [DefaultConfigService],
  exports: [DefaultConfigService],
})
export class DefaultConfigModule {}
