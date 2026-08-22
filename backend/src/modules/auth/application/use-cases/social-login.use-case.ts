import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SocialProvider } from '@prisma/client';
import * as admin from 'firebase-admin';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { RedisService } from '@shared/infrastructure/cache/redis.service';
import { AuthTokens } from './login.use-case';

/**
 * Entrada com Apple ou Google.
 *
 * O cliente autentica-se no Firebase Auth e envia o ID token resultante; aqui
 * verifica-se esse token e emite-se a sessão normal da plataforma. Passar pelo
 * Firebase evita ter de gerir as chaves da Apple e os clientes OAuth do Google
 * à mão, e reaproveita o `firebase-admin` que já está configurado para as push.
 *
 * A sessão devolvida é exatamente a mesma do login com password: o resto da
 * aplicação não precisa de saber como o utilizador entrou.
 */
@Injectable()
export class SocialLoginUseCase {
  private readonly logger = new Logger(SocialLoginUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  async execute(idToken: string, fallbackName?: string): Promise<AuthTokens> {
    if (admin.apps.length === 0) {
      // Sem credenciais Firebase no servidor não há forma de validar o token,
      // e aceitá-lo às cegas seria aceitar qualquer identidade.
      throw new ServiceUnavailableException('Login social indisponível.');
    }

    let decoded: admin.auth.DecodedIdToken;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch (err) {
      this.logger.warn(`ID token social inválido: ${err}`);
      throw new UnauthorizedException('Não foi possível validar a sessão.');
    }

    const provider = this.providerFrom(decoded);
    const email = decoded.email?.toLowerCase() ?? null;

    const existing = await this.prisma.socialAccount.findUnique({
      where: { provider_providerUserId: { provider, providerUserId: decoded.uid } },
      include: { user: true },
    });

    if (existing) {
      if (existing.user.status !== 'ACTIVE') {
        throw new UnauthorizedException('Conta suspensa.');
      }
      return this.issue(existing.user);
    }

    // Já existe conta com este email? Liga-se em vez de criar uma segunda.
    // Só é seguro porque o Firebase só devolve `email_verified` depois de o
    // fornecedor ter confirmado o endereço.
    if (email && decoded.email_verified) {
      const byEmail = await this.prisma.user.findUnique({ where: { email } });
      if (byEmail) {
        if (byEmail.status !== 'ACTIVE') {
          throw new UnauthorizedException('Conta suspensa.');
        }
        await this.prisma.socialAccount.create({
          data: { userId: byEmail.id, provider, providerUserId: decoded.uid, email },
        });
        return this.issue(byEmail);
      }
    }

    return this.issue(await this.createClient(decoded, provider, email, fallbackName));
  }

  /**
   * Cria o utilizador e o perfil de cliente.
   *
   * O login social é só para clientes: as contas de técnico são criadas pela
   * administração, com dados que a Apple e a Google não têm (NIF, distritos de
   * cobertura, especialidades).
   */
  private async createClient(
    decoded: admin.auth.DecodedIdToken,
    provider: SocialProvider,
    email: string | null,
    fallbackName?: string,
  ) {
    // A Apple só envia o nome no primeiro início de sessão; se não vier, o
    // cliente manda o que recolheu, e em último caso fica um marcador que o
    // utilizador corrige no perfil.
    const rawName = decoded.name ?? fallbackName ?? '';
    const [firstName, ...rest] = rawName.trim().split(/\s+/).filter(Boolean);

    // Sem email (possível na Apple com "esconder o meu email" nalguns casos)
    // gera-se um endereço interno estável, para não partir a coluna única.
    const finalEmail = email ?? `${decoded.uid}@social.resolvaagora.pt`;

    return this.prisma.user.create({
      data: {
        email: finalEmail,
        passwordHash: null,
        role: 'CLIENT',
        // O fornecedor já verificou o email; pedir outra verificação seria
        // mandar o utilizador confirmar o que a Apple ou a Google confirmaram.
        emailVerified: decoded.email_verified ?? false,
        socialAccounts: {
          create: { provider, providerUserId: decoded.uid, email },
        },
        client: {
          create: {
            firstName: firstName ?? 'Cliente',
            lastName: rest.join(' '),
            phone: decoded.phone_number ?? '',
          },
        },
      },
    });
  }

  private providerFrom(decoded: admin.auth.DecodedIdToken): SocialProvider {
    const signInProvider = decoded.firebase?.sign_in_provider ?? '';
    if (signInProvider.startsWith('apple')) return 'APPLE';
    if (signInProvider.startsWith('google')) return 'GOOGLE';
    throw new UnauthorizedException(`Fornecedor não suportado: ${signInProvider}`);
  }

  private async issue(user: { id: string; email: string; role: string }): Promise<AuthTokens> {
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
