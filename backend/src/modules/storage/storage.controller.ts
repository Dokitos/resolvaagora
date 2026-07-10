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
import { Roles } from '../auth/presentation/decorators/roles.decorator';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { StorageService } from './storage.service';

/** Upload genérico de imagens para o admin (plano, banners, etc.). */
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Post('uploads')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Nenhum ficheiro enviado.');
    const url = await this.storage.uploadImage(file, 'uploads');
    return { url };
  }
}
