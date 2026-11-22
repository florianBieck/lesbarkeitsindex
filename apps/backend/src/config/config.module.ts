import { Module } from '@nestjs/common';
import { AppConfigController } from './config.controller.js';
import { DefaultConfigModule } from './default-config.module.js';

@Module({
  imports: [DefaultConfigModule],
  controllers: [AppConfigController],
})
export class AppConfigModule {}
