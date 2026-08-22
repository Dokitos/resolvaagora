import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/infrastructure/jwt.strategy';
import { MessagesService } from '../application/messages.service';

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body: string;
}

/**
 * Conversas entre cliente e técnico, sempre no contexto de um pedido.
 *
 * As rotas são partilhadas pelos três papéis; quem pode ler e quem pode
 * escrever é decidido no serviço, a partir de quem participa no pedido — o
 * admin lê para moderar, mas não escreve.
 */
@Controller()
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get('service-requests/:id/messages')
  list(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.messages.list(id, user.id, user.role === 'ADMIN');
  }

  @Post('service-requests/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  send(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messages.send(id, user.id, dto.body);
  }

  @Patch('service-requests/:id/messages/read')
  @HttpCode(HttpStatus.OK)
  markRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.messages.markRead(id, user.id);
  }

  @Get('technician/conversations')
  technicianConversations(@CurrentUser() user: AuthenticatedUser) {
    return this.messages.conversations(user.id, 'TECHNICIAN');
  }

  @Get('client/conversations')
  clientConversations(@CurrentUser() user: AuthenticatedUser) {
    return this.messages.conversations(user.id, 'CLIENT');
  }
}
