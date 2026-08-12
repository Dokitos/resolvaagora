import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService, matchesDeclaredType } from './storage.service';

function fakeConfig(overrides: Record<string, string> = {}): ConfigService {
  const values: Record<string, string> = {
    STORAGE_ENDPOINT: 'https://example.r2.cloudflarestorage.com',
    STORAGE_ACCESS_KEY: 'access-key',
    STORAGE_SECRET_KEY: 'secret-key',
    STORAGE_BUCKET: 'resolvaagora-files',
    STORAGE_PUBLIC_URL: 'https://files.example.com',
    ...overrides,
  };
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

describe('matchesDeclaredType', () => {
  it('accepts a real JPEG signature declared as image/jpeg', () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(matchesDeclaredType(buf, 'image/jpeg')).toBe(true);
  });

  it('accepts a real PNG signature declared as image/png', () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    expect(matchesDeclaredType(buf, 'image/png')).toBe(true);
  });

  it('accepts a real GIF89a signature declared as image/gif', () => {
    const buf = Buffer.from('GIF89a______', 'ascii');
    expect(matchesDeclaredType(buf, 'image/gif')).toBe(true);
  });

  it('accepts a real WEBP (RIFF....WEBP) signature declared as image/webp', () => {
    const buf = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBP')]);
    expect(matchesDeclaredType(buf, 'image/webp')).toBe(true);
  });

  it('rejects an HTML/script payload disguised as image/jpeg', () => {
    const buf = Buffer.from('<script>alert(1)</script>__', 'ascii');
    expect(matchesDeclaredType(buf, 'image/jpeg')).toBe(false);
  });

  it('rejects a PNG file relabeled as image/gif (mismatched signature)', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    expect(matchesDeclaredType(png, 'image/gif')).toBe(false);
  });

  it('rejects a buffer shorter than any known signature', () => {
    expect(matchesDeclaredType(Buffer.from([0xff, 0xd8]), 'image/jpeg')).toBe(false);
  });

  it('rejects an unsupported declared mimetype even with a valid-looking buffer', () => {
    const buf = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'ascii');
    expect(matchesDeclaredType(buf, 'image/svg+xml')).toBe(false);
  });
});

describe('StorageService.uploadImage', () => {
  it('throws when storage is not configured (stub mode)', async () => {
    const service = new StorageService(fakeConfig({ STORAGE_ENDPOINT: '' }));
    await expect(
      service.uploadImage(
        { buffer: Buffer.from([0xff, 0xd8, 0xff]), mimetype: 'image/jpeg', size: 3 },
        'technicians',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a disallowed mimetype', async () => {
    const service = new StorageService(fakeConfig());
    await expect(
      service.uploadImage(
        { buffer: Buffer.from('x'.repeat(20)), mimetype: 'image/svg+xml', size: 20 },
        'banners',
      ),
    ).rejects.toThrow('Formato inválido');
  });

  it('rejects an oversized file', async () => {
    const service = new StorageService(fakeConfig());
    const big = Buffer.alloc(9 * 1024 * 1024);
    await expect(
      service.uploadImage({ buffer: big, mimetype: 'image/jpeg', size: big.length }, 'banners'),
    ).rejects.toThrow('demasiado grande');
  });

  it('rejects a file whose content does not match its declared mimetype', async () => {
    const service = new StorageService(fakeConfig());
    const fakeJpeg = Buffer.from('<html><body>not really a jpeg</body></html>');
    await expect(
      service.uploadImage(
        { buffer: fakeJpeg, mimetype: 'image/jpeg', size: fakeJpeg.length },
        'banners',
      ),
    ).rejects.toThrow('não corresponde ao formato declarado');
  });
});
