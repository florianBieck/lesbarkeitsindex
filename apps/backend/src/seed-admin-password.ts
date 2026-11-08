/**
 * Öffentlich im Repo, daher nur außerhalb von Produktion: Dev, CI und die
 * Playwright-Specs melden sich damit an.
 */
const DEV_SEED_ADMIN_PASSWORD = '#Test1234';

/**
 * Better-Auths Standard-Mindestlänge. createUser im Admin-Plugin prüft sie
 * nicht, die Registrierung schon.
 */
const MIN_PASSWORD_LENGTH = 8;

/** Passwort der Seed-Admins (`seedData` in `main.ts`). */
export function readSeedAdminPassword(env: NodeJS.ProcessEnv): string {
  const password = env['SEED_ADMIN_PASSWORD'];
  if (password) {
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(
        `SEED_ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
      );
    }
    return password;
  }
  if (env['NODE_ENV'] !== 'production') {
    return DEV_SEED_ADMIN_PASSWORD;
  }
  throw new Error(
    'SEED_ADMIN_PASSWORD environment variable is required in production. It sets the password of the seeded admin accounts.',
  );
}
