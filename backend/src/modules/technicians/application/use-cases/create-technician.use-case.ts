import { Injectable, ConflictException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { EmailService } from '../../../notifications/infrastructure/email.service';
import { CreateTechnicianDto } from '../dto/create-technician.dto';

@Injectable()
export class CreateTechnicianUseCase {
  private readonly logger = new Logger(CreateTechnicianUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async execute(dto: CreateTechnicianDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
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
              create: dto.coverageDistricts.map((d) => ({ district: d })),
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

    // Envia as credenciais por email (não bloqueia a criação em caso de falha).
    try {
      if (this.email.configured) {
        await this.email.send(
          user.email,
          'As tuas credenciais — ResolvaAgora',
          this.email.technicianWelcomeEmail(dto.firstName, user.email, dto.password),
        );
      }
    } catch (e) {
      this.logger.error(`Falha ao enviar credenciais ao técnico ${user.email}: ${e}`);
    }

    return user;
  }
}
