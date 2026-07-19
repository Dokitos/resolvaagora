import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { Roles } from '../auth/presentation/decorators/roles.decorator';
import { EmailInboxService } from './email-inbox.service';

type Folder = 'inbox' | 'sent' | 'trash';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class EmailController {
  constructor(private readonly emails: EmailInboxService) {}

  @Get('emails')
  list(@Query('folder') folder: Folder = 'inbox', @Query('page') page = '1') {
    return this.emails.list(folder, Number(page) || 1);
  }

  @Get('emails/:id')
  get(@Param('id') id: string) {
    return this.emails.get(id);
  }

  @Patch('emails/:id')
  update(
    @Param('id') id: string,
    @Body() patch: { isRead?: boolean; isStarred?: boolean; folder?: Folder },
  ) {
    return this.emails.update(id, patch);
  }

  @Post('emails/send')
  send(@Body() body: { to: string; subject: string; html: string }) {
    return this.emails.send(body.to, body.subject, body.html);
  }

  @Get('email-templates')
  templates() {
    return this.emails.listTemplates();
  }

  @Post('email-templates')
  createTemplate(@Body() body: any) {
    return this.emails.createTemplate(body);
  }

  @Patch('email-templates/:id')
  updateTemplate(@Param('id') id: string, @Body() body: any) {
    return this.emails.updateTemplate(id, body);
  }

  @Delete('email-templates/:id')
  deleteTemplate(@Param('id') id: string) {
    return this.emails.deleteTemplate(id);
  }
}
