import { Controller, Get } from '@nestjs/common';
import { DefaultConfigService } from './default-config.service.js';

@Controller('config')
export class AppConfigController {
  constructor(private readonly defaultConfig: DefaultConfigService) {}

  /** Die Standardkonfiguration aus der `config.json` (ADR 0008), samt der optionalen Links. */
  @Get()
  getConfig() {
    return this.defaultConfig.read();
  }
}
