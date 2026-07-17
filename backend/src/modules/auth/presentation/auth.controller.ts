import {
  Controller,
  Post,
  Get,
  Query,
  Header,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { LoginUseCase } from '../application/use-cases/login.use-case';
import { RegisterClientUseCase } from '../application/use-cases/register-client.use-case';
import { RefreshTokenUseCase } from '../application/use-cases/refresh-token.use-case';
import { ForgotPasswordUseCase } from '../application/use-cases/forgot-password.use-case';
import { ResetPasswordUseCase } from '../application/use-cases/reset-password.use-case';
import { EmailVerificationUseCase } from '../application/use-cases/email-verification.use-case';
import { LoginDto } from '../application/dto/login.dto';
import { RegisterDto } from '../application/dto/register.dto';
import { RefreshTokenDto } from '../application/dto/refresh-token.dto';
import { ForgotPasswordDto, ResetPasswordDto } from '../application/dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthenticatedUser } from '../infrastructure/jwt.strategy';
import { RedisService } from '@shared/infrastructure/cache/redis.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly registerClientUseCase: RegisterClientUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly emailVerificationUseCase: EmailVerificationUseCase,
    private readonly redis: RedisService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  register(@Body() dto: RegisterDto) {
    return this.registerClientUseCase.execute(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  login(@Body() dto: LoginDto) {
    return this.loginUseCase.execute(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.refreshTokenUseCase.execute(dto.refreshToken);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.forgotPasswordUseCase.execute(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.resetPasswordUseCase.execute(dto.token, dto.newPassword);
  }

  /** Link clicado no email de confirmação → devolve uma página simples. */
  @Get('verify-email')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async verifyEmail(@Query('token') token: string) {
    const ok = await this.emailVerificationUseCase.verify(token);
    const title = ok ? 'Email confirmado ✅' : 'Ligação inválida ou expirada';
    const msg = ok
      ? 'Obrigado! O teu email foi confirmado. Já podes voltar à aplicação ResolvaAgora.'
      : 'Não foi possível confirmar este email. O link pode ter expirado ou já ter sido usado.';
    return `<!doctype html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <title>ResolvaAgora</title></head>
      <body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:40px 16px;text-align:center;color:#161616">
        <div style="max-width:420px;margin:auto;background:#fff;border-radius:16px;padding:32px 24px;box-shadow:0 4px 20px rgba(0,0,0,.06)">
          <div style="font-size:26px;font-weight:900">Resolva<span style="color:#F5B301">Agora</span></div>
          <h2 style="margin:20px 0 8px">${title}</h2>
          <p style="color:#555;font-size:15px;line-height:1.5">${msg}</p>
        </div>
      </body></html>`;
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async resendVerification(@CurrentUser() user: AuthenticatedUser) {
    await this.emailVerificationUseCase.resend(user.id);
    return { sent: true };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user: AuthenticatedUser) {
    await this.redis.del(`refresh:${user.id}`);
  }
}
