import { Injectable, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { RedisService } from '@shared/infrastructure/cache/redis.service';

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Valida o código de recuperação (vinculado ao email que o pediu), define a
   * nova palavra-passe, consome o código e revoga a sessão ativa (refresh
   * token) para forçar novo login.
   */
  async execute(rawEmail: string, code: string, newPassword: string): Promise<{ message: string }> {
    const email = (rawEmail ?? '').toLowerCase().trim();
    const key = `pwreset:${email}:${(code ?? '').trim()}`;
    const userId = await this.redis.get(key);
    if (!userId) {
      throw new BadRequestException('Código inválido ou expirado.');
    }

    // Confirma que o código pertence mesmo à conta do email indicado (defesa
    // em profundidade, além da chave já incluir o email).
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.email.toLowerCase() !== email) {
      throw new BadRequestException('Código inválido ou expirado.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    await this.redis.del(key);
    await this.redis.del(`refresh:${userId}`); // termina sessões antigas

    return { message: 'Palavra-passe redefinida. Já podes iniciar sessão.' };
  }
}
