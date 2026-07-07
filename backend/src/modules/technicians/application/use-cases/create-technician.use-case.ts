import { Injectable, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { CreateTechnicianDto } from '../dto/create-technician.dto';

@Injectable()
export class CreateTechnicianUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(dto: CreateTechnicianDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    return this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        role: 'TECHNICIAN',
        technician: {
          create: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            phone: dto.phone,
            nif: dto.nif,
            dailyServiceLimit: dto.dailyServiceLimit ?? 8,
            specialties: {
              create: dto.specialties.map((s) => ({ specialty: s })),
            },
            coverageDistricts: {
              create: dto.districts.map((d) => ({ district: d })),
            },
          },
        },
      },
      include: {
        technician: {
          include: { specialties: true, coverageDistricts: true },
        },
      },
    });
  }
}
