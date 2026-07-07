import { Injectable, ConflictException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { RedisService } from '@shared/infrastructure/cache/redis.service';
import { RegisterDto } from '../dto/register.dto';
import { AuthTokens } from './login.use-case';

@Injectable()
export class RegisterClientUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  async execute(dto: RegisterDto): Promise<AuthTokens> {
    const settings = await this.prisma.appSetting.findUnique({ where: { id: 'app' } });
    if (settings && !settings.registrationEnabled) {
      throw new ForbiddenException('O registo de novas contas está temporariamente desativado.');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        role: 'CLIENT',
        client: {
          create: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            phone: dto.phone,
          },
        },
      },
      include: { client: true },
    });

    // Link a referral if the new client signed up with someone's code.
    if (dto.referralCode && user.client) {
      const code = dto.referralCode.trim().toUpperCase();
      const referrer = await this.prisma.client.findUnique({ where: { referralCode: code } });
      if (referrer && referrer.id !== user.client.id) {
        await this.prisma.referral
          .create({
            data: {
              referrerClientId: referrer.id,
              referredClientId: user.client.id,
              code,
              status: 'PENDING',
            },
          })
          .catch(() => undefined);
      }
    }

    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
    });

    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    await this.redis.set(`refresh:${user.id}`, refreshToken, 7 * 24 * 60 * 60);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }
}
