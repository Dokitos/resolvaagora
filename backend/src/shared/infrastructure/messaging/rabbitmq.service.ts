import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqplib from 'amqplib';

export interface RabbitMQMessage<T = unknown> {
  event: string;
  data: T;
  timestamp: string;
  correlationId?: string;
}

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqplib.ChannelModel;
  private channel: amqplib.Channel;
  private readyResolve: () => void;
  private ready: Promise<void> = new Promise((res) => { this.readyResolve = res; });

  readonly exchanges = {
    serviceRequests: 'service-requests',
    quotes: 'quotes',
    notifications: 'notifications',
    sla: 'sla',
    payments: 'payments',
  };

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.channel?.close();
    await this.connection?.close();
  }

  private async connect() {
    try {
      const url = this.config.get<string>('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672');
      const connectWithTimeout = Promise.race([
        amqplib.connect(url),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('RabbitMQ connection timeout')), 5000),
        ),
      ]);
      this.connection = await connectWithTimeout;
      this.channel = await this.connection.createChannel();

      await this.setupExchanges();
      this.readyResolve();
      this.logger.log('RabbitMQ connected');

      this.connection.on('error', (err) => {
        this.logger.error('RabbitMQ connection error', err);
      });
    } catch (err) {
      this.logger.error('Failed to connect to RabbitMQ — retrying in 5s', err);
      this.readyResolve(); // unblock consumers so app can start
      setTimeout(() => this.connect(), 5000);
    }
  }

  private async setupExchanges() {
    for (const exchange of Object.values(this.exchanges)) {
      const type = exchange === 'notifications' ? 'fanout' : 'topic';
      await this.channel.assertExchange(exchange, type, { durable: true });
    }
  }

  async publish<T>(exchange: string, routingKey: string, data: T): Promise<void> {
    await this.ready;
    if (!this.channel) {
      this.logger.warn(`RabbitMQ not connected — skipping publish ${exchange}:${routingKey}`);
      return;
    }
    const message: RabbitMQMessage<T> = {
      event: routingKey,
      data,
      timestamp: new Date().toISOString(),
    };

    const buffer = Buffer.from(JSON.stringify(message));
    const sent = this.channel.publish(exchange, routingKey, buffer, {
      persistent: true,
      contentType: 'application/json',
    });

    if (!sent) {
      this.logger.warn(`Message not sent to ${exchange}:${routingKey}`);
    }
  }

  async subscribe(
    exchange: string,
    queue: string,
    routingKey: string,
    handler: (msg: RabbitMQMessage) => Promise<void>,
  ): Promise<void> {
    await this.ready;
    if (!this.channel) {
      this.logger.warn(`RabbitMQ not connected — skipping subscribe ${queue}`);
      return;
    }
    await this.channel.assertQueue(queue, { durable: true });
    await this.channel.bindQueue(queue, exchange, routingKey);
    await this.channel.prefetch(1);

    this.channel.consume(queue, async (msg) => {
      if (!msg) return;
      try {
        const payload: RabbitMQMessage = JSON.parse(msg.content.toString());
        await handler(payload);
        this.channel.ack(msg);
      } catch (err) {
        this.logger.error(`Error processing message from ${queue}`, err);
        this.channel.nack(msg, false, false);
      }
    });

    this.logger.log(`Subscribed to ${exchange} -> ${queue} [${routingKey}]`);
  }
}
