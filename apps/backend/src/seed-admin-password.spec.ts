import { describe, test, expect } from 'vite-plus/test';
import { readSeedAdminPassword } from './seed-admin-password.js';

describe('readSeedAdminPassword', () => {
  test('nimmt SEED_ADMIN_PASSWORD, wenn es gesetzt ist', () => {
    expect(
      readSeedAdminPassword({ NODE_ENV: 'production', SEED_ADMIN_PASSWORD: 'geheim-und-lang' }),
    ).toBe('geheim-und-lang');
  });

  test('bricht in Produktion ab, wenn SEED_ADMIN_PASSWORD fehlt', () => {
    expect(() => readSeedAdminPassword({ NODE_ENV: 'production' })).toThrow(/SEED_ADMIN_PASSWORD/);
  });

  test('bricht in Produktion ab, wenn SEED_ADMIN_PASSWORD leer ist', () => {
    expect(() =>
      readSeedAdminPassword({ NODE_ENV: 'production', SEED_ADMIN_PASSWORD: '' }),
    ).toThrow(/SEED_ADMIN_PASSWORD/);
  });

  // createUser im Admin-Plugin prüft die Länge nicht, anders als die Registrierung.
  test('bricht ab, wenn SEED_ADMIN_PASSWORD kürzer als 8 Zeichen ist', () => {
    expect(() =>
      readSeedAdminPassword({ NODE_ENV: 'production', SEED_ADMIN_PASSWORD: '1234567' }),
    ).toThrow(/at least 8 characters/);
    expect(readSeedAdminPassword({ NODE_ENV: 'production', SEED_ADMIN_PASSWORD: '12345678' })).toBe(
      '12345678',
    );
  });

  // Dev, CI und die Playwright-Specs melden sich mit diesem Passwort an.
  test('fällt außerhalb von Produktion auf #Test1234 zurück', () => {
    expect(readSeedAdminPassword({ NODE_ENV: 'development' })).toBe('#Test1234');
    expect(readSeedAdminPassword({})).toBe('#Test1234');
  });
});
