import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { SharedInfrastructureModule } from './shared/infrastructure/shared-infrastructure.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TechniciansModule } from './modules/technicians/technicians.module';
import { ServiceRequestsModule } from './modules/service-requests/service-requests.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { DistributionModule } from './modules/distribution/distribution.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SlaModule } from './modules/sla/sla.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { AdminModule } from './modules/admin/admin.module';
import { SupportModule } from './modules/support/support.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { SettingsModule } from './modules/settings/settings.module';
import { StorageModule } from './modules/storage/storage.module';
import { BannersModule } from './modules/banners/banners.module';
import { OtpModule } from './modules/otp/otp.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    SharedInfrastructureModule,
    StorageModule,
    AuthModule,
    UsersModule,
    TechniciansModule,
    ServiceRequestsModule,
    QuotesModule,
    DistributionModule,
    PaymentsModule,
    NotificationsModule,
    SlaModule,
    SubscriptionsModule,
    AdminModule,
    SupportModule,
    PromotionsModule,
    SettingsModule,
    BannersModule,
    OtpModule,
  ],
  providers: [
    // Rate-limiting global (protege todos os endpoints; rotas sensíveis apertam com @Throttle)
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
