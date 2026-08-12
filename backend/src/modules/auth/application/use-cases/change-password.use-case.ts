import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';

@Injectable()
export class ChangePasswordUseCase {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Altera a palavra-passe de um utilizador autenticado, exigindo confirmação
   * da palavra-passe atual (defesa contra alteração por sessão sequestrada).
   *
   * NOTA: a palavra-passe atual incorreta devolve 400 (BadRequest), não 401.
   * O interceptor do Dio nas apps móveis (`api_client.dart`) trata QUALQUER
   * 401 como token de acesso expirado e despoleta um refresh+retry
   * silencioso do pedido original — um 401 aqui faria esse fluxo repetir a
   * mesma palavra-passe errada indefinidamente (mascarando o erro real atrás
   * de um eventual 429 do throttle, ou pior, forçando logout). 401 fica
   * reservado para quando a sessão deixou mesmo de ser válida.
   */
  async execute(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Sessão inválida.');
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw new BadRequestException('Palavra-passe atual incorreta.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    return { message: 'Palavra-passe alterada com sucesso.' };
  }
}
