import { validateEnv } from './env.validation';

function baseConfig(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    JWT_SECRET: 'a-real-strong-secret',
    JWT_REFRESH_SECRET: 'another-real-strong-secret',
    ...overrides,
  };
}

describe('validateEnv', () => {
  it('passes through a valid development config unchanged', () => {
    const config = baseConfig();
    expect(validateEnv(config)).toBe(config);
  });

  it.each(['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'])(
    'throws when %s is missing',
    (key) => {
      const config = baseConfig({ [key]: undefined });
      expect(() => validateEnv(config)).toThrow(/em falta/i);
    },
  );

  it('lists every missing key in a single error when more than one is absent', () => {
    const config = baseConfig({ JWT_SECRET: undefined, JWT_REFRESH_SECRET: undefined });
    expect(() => validateEnv(config)).toThrow(/JWT_SECRET.*JWT_REFRESH_SECRET/);
  });

  it('allows the .env.example placeholder secrets in development', () => {
    const config = baseConfig({
      JWT_SECRET: 'your-super-secret-jwt-key-change-in-production',
      JWT_REFRESH_SECRET: 'your-super-secret-refresh-key-change-in-production',
    });
    expect(() => validateEnv(config)).not.toThrow();
  });

  it('rejects the .env.example placeholder secret in production', () => {
    const config = baseConfig({
      NODE_ENV: 'production',
      JWT_SECRET: 'your-super-secret-jwt-key-change-in-production',
    });
    expect(() => validateEnv(config)).toThrow(/valor de exemplo/i);
  });

  it('accepts real, non-placeholder secrets in production', () => {
    const config = baseConfig({ NODE_ENV: 'production' });
    expect(() => validateEnv(config)).not.toThrow();
  });
});
