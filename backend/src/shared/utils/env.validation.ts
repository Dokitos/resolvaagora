const PLACEHOLDER_VALUES = new Set([
  'your-super-secret-jwt-key-change-in-production',
  'your-super-secret-refresh-key-change-in-production',
]);

/**
 * Falha o arranque com uma mensagem clara em vez de deixar o processo subir
 * "com sucesso" sem os segredos essenciais (auth/DB) configurados — sem isto,
 * uma env var em falta só se manifesta mais tarde como um 500 obscuro no
 * primeiro pedido autenticado.
 */
export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const required = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
  const missing = required.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(`Variáveis de ambiente obrigatórias em falta: ${missing.join(', ')}`);
  }

  if (config.NODE_ENV === 'production') {
    const stillPlaceholder = required.filter((key) => PLACEHOLDER_VALUES.has(String(config[key])));
    if (stillPlaceholder.length > 0) {
      throw new Error(
        `Em produção, estas variáveis não podem ficar com o valor de exemplo do .env.example: ${stillPlaceholder.join(', ')}`,
      );
    }
  }

  return config;
}
