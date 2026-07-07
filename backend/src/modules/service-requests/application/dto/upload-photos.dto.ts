import { IsArray, ArrayMaxSize, ArrayNotEmpty, IsString, MaxLength, Matches } from 'class-validator';

// Aceita apenas URLs http(s) ou data-URIs de imagem (png/jpg/webp) em base64.
// O limite de comprimento serve de teto de tamanho para data-URIs (~2 MB).
const SAFE_PHOTO_URL = /^(https?:\/\/|data:image\/(png|jpe?g|webp);base64,)/i;

export class UploadPhotosDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(2_800_000, { each: true })
  @Matches(SAFE_PHOTO_URL, { each: true, message: 'URL de foto inválida' })
  urls: string[];
}
