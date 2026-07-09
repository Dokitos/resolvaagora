import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3000);
  const prefix = config.get('API_PREFIX', 'api/v1');

  const isDev = config.get('NODE_ENV', 'development') !== 'production';
  // Configured origins: FRONTEND_URL, ADMIN_URL and an optional comma-separated
  // CORS_ORIGINS list. Empty/undefined entries are filtered out.
  const allowedOrigins = [
    config.get('FRONTEND_URL', 'http://localhost:3000'),
    config.get('ADMIN_URL', 'http://localhost:3000'),
    ...String(config.get('CORS_ORIGINS', '')).split(',').map((s) => s.trim()),
  ].filter(Boolean);

  // Security
  app.use(helmet());
  app.enableCors({
    origin: (origin, callback) => {
      // Allow server-to-server requests (no Origin header, e.g. the mobile app),
      // configured origins, any Vercel deployment (*.vercel.app cobre o alias de
      // produção e URLs de preview), e todo o domínio resolvaagora.pt (apex, www
      // e subdomínios como admin.).
      // In development, also allow any localhost port.
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        /^https:\/\/([a-z0-9-]+\.)*vercel\.app$/i.test(origin) ||
        /^https:\/\/([a-z0-9-]+\.)*resolvaagora\.pt$/i.test(origin) ||
        (isDev && /^http:\/\/localhost(:\d+)?$/.test(origin))
      ) {
        callback(null, true);
      } else {
        // Clean rejection: no CORS headers so the browser blocks it, instead of
        // throwing (which the exception filter would turn into a 500).
        callback(null, false);
      }
    },
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix(prefix);

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Bind explícito a 0.0.0.0 para funcionar em contentores/PaaS (Railway).
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 API a correr na porta ${port} (prefixo /${prefix})`);
}

bootstrap();
