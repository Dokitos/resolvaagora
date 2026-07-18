import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { StorageService } from './storage.service';

/**
 * Upload genérico de imagens para qualquer utilizador autenticado (ex.: fotos
 * do problema tiradas pelo cliente na marcação). Devolve o URL público (R2).
 */
@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Nenhum ficheiro enviado.');
    if (!this.storage.configured) {
      throw new BadRequestException('Armazenamento de imagens ainda não está configurado.');
    }
    const url = await this.storage.uploadImage(
      { buffer: file.buffer, mimetype: file.mimetype, size: file.size },
      'service-photos',
    );
    return { url };
  }
}
