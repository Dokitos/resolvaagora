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
  private connection?: amqplib.ChannelModel;
  private channel?: amqplib.Channel;
  private readyResolve: () => void;
  private ready: Promise<void> = new Promise((res) => { this.readyResolve = res; });

  // Buffer em memória para mensagens que não puderam ser publicadas porque o
  // canal ainda não está ligado. Esvaziado assim que a ligação é restabelecida.
  // NOTA: isto NÃO é um outbox persistente — se o processo reiniciar antes de
  // reconectar, estas mensagens perdem-se. Para garantias fortes de entrega
  // (sobreviver a restarts) seria preciso um padrão outbox real (tabela na BD
  // + job que publica), o que fica fora do âmbito desta correção pontual.
  private readonly pendingMessages: Array<{ exchange: string; routingKey: string; data: unknown }> = [];
  private readonly maxPendingMessages = 1000;

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
      const connection = await connectWithTimeout;
      this.connection = connection;
      this.channel = await connection.createChannel();

      await this.setupExchanges();
      this.readyResolve();
      this.logger.log('RabbitMQ connected');

      connection.on('error', (err) => {
        this.logger.error('RabbitMQ connection error', err);
      });

      // A ligação amqplib emite 'close' tanto num fecho limpo (onModuleDestroy)
      // como numa queda de rede. Distinguimos pelo facto de onModuleDestroy
      // limpar as referências antes de fechar — se ainda apontam para esta
      // ligação, foi uma queda inesperada e reconectamos.
      connection.on('close', () => {
        if (this.connection !== connection) return; // fecho intencional já tratado noutro lado
        this.logger.error('RabbitMQ connection closed unexpectedly — reconnecting in 5s');
        this.channel = undefined;
        this.connection = undefined;
        this.ready = new Promise((res) => { this.readyResolve = res; });
        setTimeout(() => this.connect(), 5000);
      });

      await this.flushPendingMessages();
    } catch (err) {
      this.logger.error('Failed to connect to RabbitMQ — retrying in 5s', err);
      this.readyResolve(); // unblock consumers so app can start
      setTimeout(() => this.connect(), 5000);
    }
  }

  private async setupExchanges() {
    for (const exchange of Object.values(this.exchanges)) {
      const type = exchange === 'notifications' ? 'fanout' : 'topic';
      await this.channel!.assertExchange(exchange, type, { durable: true });
    }
  }

  /** Reenvia mensagens acumuladas em `pendingMessages` assim que o canal volta a ficar disponível. */
  private async flushPendingMessages(): Promise<void> {
    if (this.pendingMessages.length === 0) return;
    const toFlush = this.pendingMessages.splice(0, this.pendingMessages.length);
    this.logger.warn(`RabbitMQ reconectado — reenviando ${toFlush.length} mensagem(ns) pendente(s)`);
    for (const msg of toFlush) {
      await this.publish(msg.exchange, msg.routingKey, msg.data);
    }
  }

  async publish<T>(exchange: string, routingKey: string, data: T): Promise<void> {
    await this.ready;
    if (!this.channel) {
      // Canal indisponível: em vez de descartar a mensagem silenciosamente,
      // guarda-se num buffer em memória (ver nota no topo da classe) para
      // ser reenviada quando a ligação for restabelecida (flushPendingMessages).
      if (this.pendingMessages.length >= this.maxPendingMessages) {
        this.logger.error(
          `RabbitMQ not connected and pending buffer is full (${this.maxPendingMessages}) — dropping message ${exchange}:${routingKey}`,
        );
        return;
      }
      this.logger.error(
        `RabbitMQ not connected — buffering message in memory for retry-on-reconnect ${exchange}:${routingKey}`,
      );
      this.pendingMessages.push({ exchange, routingKey, data });
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
    const channel = this.channel;

    // Dead-letter exchange/fila: mensagens rejeitadas com nack(requeue=false)
    // (erro no handler) deixam de desaparecer para sempre — o broker
    // encaminha-as automaticamente para `${queue}.dlq`, onde ficam visíveis
    // e podem ser inspecionadas/reprocessadas manualmente em vez de se perderem.
    const dlxExchange = `${exchange}.dlx`;
    const dlq = `${queue}.dlq`;
    await channel.assertExchange(dlxExchange, 'fanout', { durable: true });
    await channel.assertQueue(dlq, { durable: true });
    await channel.bindQueue(dlq, dlxExchange, '');

    await channel.assertQueue(queue, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': dlxExchange,
      },
    });
    await channel.bindQueue(queue, exchange, routingKey);
    await channel.prefetch(1);

    channel.consume(queue, async (msg) => {
      if (!msg) return;
      try {
        const payload: RabbitMQMessage = JSON.parse(msg.content.toString());
        await handler(payload);
        channel.ack(msg);
      } catch (err) {
        this.logger.error(`Error processing message from ${queue} — dead-lettering to ${dlq}`, err);
        channel.nack(msg, false, false);
      }
    });

    this.logger.log(`Subscribed to ${exchange} -> ${queue} [${routingKey}] (DLQ: ${dlq})`);
  }
}
