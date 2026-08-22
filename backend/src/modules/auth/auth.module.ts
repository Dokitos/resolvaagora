import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './presentation/auth.controller';
import { JwtStrategy } from './infrastructure/jwt.strategy';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { SocialLoginUseCase } from './application/use-cases/social-login.use-case';
import { DeleteAccountUseCase } from './application/use-cases/delete-account.use-case';
import { PaymentsModule } from '../payments/payments.module';
import { RegisterClientUseCase } from './application/use-cases/register-client.use-case';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token.use-case';
import { ForgotPasswordUseCase } from './application/use-cases/forgot-password.use-case';
import { ResetPasswordUseCase } from './application/use-cases/reset-password.use-case';
import { EmailVerificationUseCase } from './application/use-cases/email-verification.use-case';
import { ChangePasswordUseCase } from './application/use-cases/change-password.use-case';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    PassportModule,
    NotificationsModule,
    PaymentsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '15m'), algorithm: 'HS256' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    LoginUseCase,
    SocialLoginUseCase,
    DeleteAccountUseCase,
    RegisterClientUseCase,
    RefreshTokenUseCase,
    ForgotPasswordUseCase,
    ResetPasswordUseCase,
    EmailVerificationUseCase,
    ChangePasswordUseCase,
  ],
  exports: [JwtModule, PassportModule],
})
export class AuthModule {}
