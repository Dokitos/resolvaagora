import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * Confere a assinatura binária (magic bytes) contra o mimetype declarado.
 * O Content-Type do multipart é escolhido pelo cliente e não é confiável
 * sozinho — isto impede que um ficheiro renomeado/malicioso (ex.: um HTML
 * disfarçado de .jpg) passe pela allowlist só porque mentiu o Content-Type.
 */
export function matchesDeclaredType(buffer: Buffer, mimetype: string): boolean {
  if (buffer.length < 12) return false;
  switch (mimetype) {
    case 'image/jpeg':
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case 'image/png':
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
      );
    case 'image/gif':
      return buffer.toString('ascii', 0, 6) === 'GIF87a' || buffer.toString('ascii', 0, 6) === 'GIF89a';
    case 'image/webp':
      return buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
    default:
      return false;
  }
}

/**
 * Armazenamento de imagens no Cloudflare R2 (compatível com S3). Em modo stub
 * (chaves placeholder) recusa uploads com uma mensagem clara — o código fica
 * pronto e ativa-se assim que as chaves reais entram nas variáveis de ambiente.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly publicUrl: string;
  private readonly stub: boolean;

  constructor(private readonly config: ConfigService) {
    const endpoint = config.get<string>('STORAGE_ENDPOINT') ?? '';
    const accessKeyId = config.get<string>('STORAGE_ACCESS_KEY') ?? '';
    const secretAccessKey = config.get<string>('STORAGE_SECRET_KEY') ?? '';
    this.bucket = config.get<string>('STORAGE_BUCKET') ?? '';
    this.publicUrl = (config.get<string>('STORAGE_PUBLIC_URL') ?? '').replace(/\/+$/, '');

    const missing = [endpoint, accessKeyId, secretAccessKey, this.bucket, this.publicUrl].some(
      (v) => !v || v.includes('placeholder'),
    );
    this.stub = missing;

    if (this.stub) {
      this.client = null;
      this.logger.warn('Storage (R2) em modo STUB — uploads desativados até configurar as chaves');
    } else {
      this.client = new S3Client({
        region: 'auto',
        endpoint,
        credentials: { accessKeyId, secretAccessKey },
        forcePathStyle: true,
      });
    }
  }

  /** True quando o R2 está configurado com chaves reais. */
  get configured(): boolean {
    return !this.stub;
  }

  /**
   * Envia um ficheiro de imagem e devolve o URL público.
   * @param prefix pasta lógica (ex.: 'technicians', 'plans', 'banners').
   */
  async uploadImage(
    file: { buffer: Buffer; mimetype: string; size: number },
    prefix: string,
  ): Promise<string> {
    if (!this.client) {
      throw new BadRequestException('Armazenamento de imagens ainda não está configurado.');
    }
    if (!ALLOWED.includes(file.mimetype)) {
      throw new BadRequestException('Formato inválido. Usa JPG, PNG, WEBP ou GIF.');
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException('Imagem demasiado grande (máx. 8 MB).');
    }
    if (!matchesDeclaredType(file.buffer, file.mimetype)) {
      throw new BadRequestException('O conteúdo do ficheiro não corresponde ao formato declarado.');
    }

    const ext = file.mimetype.split('/')[1].replace('jpeg', 'jpg');
    const key = `${prefix}/${randomUUID()}.${ext}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    return `${this.publicUrl}/${key}`;
  }
}
