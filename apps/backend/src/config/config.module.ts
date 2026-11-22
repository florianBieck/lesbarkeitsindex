import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AppConfigController } from './config.controller.js';
import { DefaultConfigModule } from './default-config.module.js';

@Module({
  imports: [AuthModule, DefaultConfigModule],
  controllers: [AppConfigController],
})
export class AppConfigModule {}
