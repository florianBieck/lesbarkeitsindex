import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import {
  InvalidDefaultConfigError,
  readDefaultConfig,
  type DefaultConfig,
} from './default-config.js';

/** Umgebungsvariable mit dem Pfad der `config.json`; ohne sie gelten die eingebauten Standardwerte. */
const CONFIG_FILE_ENV = 'CONFIG_FILE';

/** Kennung in der Fehlerantwort, an der das Frontend die fehlerhafte Konfiguration erkennt. */
const CONFIG_INVALID_CODE = 'CONFIG_INVALID';

const CONFIG_INVALID_MESSAGE =
  'Die Konfiguration ist fehlerhaft, bitte wenden Sie sich an die Betreuung';

/**
 * Die Standardkonfiguration für `GET /api/config` und `POST /api/calculate`
 * (ADR 0008). Liest die Datei bei jeder Anfrage; eine fehlerhafte Datei wird mit
 * dem betroffenen Feld geloggt und als 500 mit {@link CONFIG_INVALID_CODE} beantwortet.
 */
@Injectable()
export class DefaultConfigService {
  private readonly logger = new Logger(DefaultConfigService.name);

  async read(): Promise<DefaultConfig> {
    try {
      return await readDefaultConfig(process.env[CONFIG_FILE_ENV]);
    } catch (error) {
      if (!(error instanceof InvalidDefaultConfigError)) {
        throw error;
      }
      this.logger.error(error.message);
      throw new InternalServerErrorException({
        statusCode: 500,
        error: CONFIG_INVALID_CODE,
        message: CONFIG_INVALID_MESSAGE,
      });
    }
  }
}
