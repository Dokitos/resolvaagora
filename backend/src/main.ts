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
  const allowedOrigins = [
    config.get('FRONTEND_URL', 'http://localhost:3000'),
    config.get('ADMIN_URL', 'http://localhost:3000'),
  ];

  // Security
  app.use(helmet());
  app.enableCors({
    origin: (origin, callback) => {
      // Allow server-to-server requests (no origin) and configured origins.
      // In development, also allow any localhost port.
      if (!origin || allowedOrigins.includes(origin) || (isDev && /^http:\/\/localhost(:\d+)?$/.test(origin))) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
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
