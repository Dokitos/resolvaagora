import { Global, Module } from '@nestjs/common';
import { PrismaService } from './database/prisma.service';
import { RedisService } from './cache/redis.service';
import { RabbitMQService } from './messaging/rabbitmq.service';

@Global()
@Module({
  providers: [PrismaService, RedisService, RabbitMQService],
  exports: [PrismaService, RedisService, RabbitMQService],
})
export class SharedInfrastructureModule {}
