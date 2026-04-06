import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AppConfigController } from './config.controller.js';

@Module({
  imports: [AuthModule],
  controllers: [AppConfigController],
})
export class AppConfigModule {}
