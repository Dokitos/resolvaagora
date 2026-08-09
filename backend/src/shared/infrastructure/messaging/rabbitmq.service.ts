import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqplib from 'amqplib';

export interface RabbitMQMessage<T = unknown> {
  event: string;
  data: T;
  timestamp: string;
  correlationId?: string;
}

interface SubscriptionRegistration {
  exchange: string;
  queue: string;
  routingKey: string;
  handler: (msg: RabbitMQMessage) => Promise<void>;
}

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection?: amqplib.ChannelModel;
  // Canal dedicado só para publish() — cada subscribe() tem o SEU PRÓPRIO
  // canal (ver subscribeOnChannel), para que um erro numa fila de consumo
  // nunca feche o canal partilhado de publicação nem o de outro consumidor.
  private channel?: amqplib.Channel;
  private readyResolve: () => void;
  private ready: Promise<void> = new Promise((res) => { this.readyResolve = res; });

  // Todas as subscrições pedidas por outros módulos (via subscribe()) ficam
  // registadas aqui, para serem "replay"-adas sempre que a ligação reconecta
  // — onModuleInit() de cada consumidor só corre uma vez no arranque; sem
  // isto, uma reconexão depois de uma queda deixava os consumidores
  // permanentemente sem subscrição nenhuma (mesmo com a ligação recuperada).
  private readonly registrations: SubscriptionRegistration[] = [];

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
      await this.replaySubscriptions();
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

  /** Refaz todas as subscrições já pedidas por outros módulos (arranque e cada reconexão). */
  private async replaySubscriptions(): Promise<void> {
    for (const reg of this.registrations) {
      await this.subscribeOnChannel(reg);
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

  /**
   * Regista a subscrição (para sobreviver a reconexões) e liga-a já uma vez.
   * Cada chamada corre de forma independente num canal próprio — ver
   * subscribeOnChannel — por isso é seguro chamar isto em paralelo para
   * várias filas sem que uma falha numa arraste as outras.
   */
  async subscribe(
    exchange: string,
    queue: string,
    routingKey: string,
    handler: (msg: RabbitMQMessage) => Promise<void>,
  ): Promise<void> {
    const reg: SubscriptionRegistration = { exchange, queue, routingKey, handler };
    this.registrations.push(reg);
    await this.ready;
    if (!this.connection) {
      this.logger.warn(`RabbitMQ not connected — skipping subscribe ${queue} (será tentado após reconectar)`);
      return;
    }
    await this.subscribeOnChannel(reg);
  }

  /**
   * Faz a ligação real da subscrição, num canal DEDICADO a esta fila (nunca
   * o canal partilhado de publish, nem o de outra fila) — se algo correr mal
   * só este canal fecha; as restantes subscrições não são afetadas.
   *
   * IMPORTANTE: todas as filas de produção/dev já existem, declaradas sem
   * `x-dead-letter-exchange`. O AMQP não permite alterar os argumentos de
   * uma fila durável já declarada — uma tentativa de reassert com um
   * argumento novo é recusada com PRECONDITION_FAILED, e (confirmado em
   * testes locais) isso não fecha só o canal, fecha a LIGAÇÃO inteira,
   * disparando reconexão → nova tentativa → mesmo erro, num ciclo sem fim
   * que deixa a app permanentemente sem consumidores. Por isso a fila
   * principal é sempre declarada sem argumentos extra. A infraestrutura de
   * dead-letter (exchange + fila `.dlq`) fica criada e pronta a usar, mas só
   * fica realmente ligada a uma fila se essa fila for recriada de raiz numa
   * limpeza de infraestrutura feita manualmente (fora do código da app).
   */
  private async subscribeOnChannel(reg: SubscriptionRegistration): Promise<void> {
    const { exchange, queue, routingKey, handler } = reg;
    if (!this.connection) {
      this.logger.warn(`RabbitMQ sem ligação — subscrição de ${queue} adiada para a próxima reconexão`);
      return;
    }

    let channel: amqplib.Channel;
    try {
      channel = await this.connection.createChannel();
    } catch (err) {
      this.logger.error(`Não foi possível criar canal para ${queue}`, err);
      return;
    }

    const dlxExchange = `${exchange}.dlx`;
    const dlq = `${queue}.dlq`;
    const dlxApplied = false;

    try {
      // Infraestrutura de dead-letter: criada para existir e ficar pronta,
      // mas não é passada como argumento da fila principal (ver nota acima).
      await channel.assertExchange(dlxExchange, 'fanout', { durable: true });
      await channel.assertQueue(dlq, { durable: true });
      await channel.bindQueue(dlq, dlxExchange, '');
      await channel.assertQueue(queue, { durable: true });
    } catch (err) {
      this.logger.error(`Falha ao declarar fila ${queue} — adiado para a próxima reconexão`, err);
      return;
    }

    try {
      await channel.bindQueue(queue, exchange, routingKey);
      await channel.prefetch(1);

      channel.consume(queue, async (msg) => {
        if (!msg) return;
        try {
          const payload: RabbitMQMessage = JSON.parse(msg.content.toString());
          await handler(payload);
          channel.ack(msg);
        } catch (err) {
          this.logger.error(
            dlxApplied
              ? `Error processing message from ${queue} — dead-lettering to ${dlq}`
              : `Error processing message from ${queue} — DLQ not active on this pre-existing queue, message dropped`,
            err,
          );
          channel.nack(msg, false, false);
        }
      });

      this.logger.log(
        `Subscribed to ${exchange} -> ${queue} [${routingKey}] (DLQ: ${dlxApplied ? dlq : 'not applied — pre-existing queue'})`,
      );
    } catch (err) {
      this.logger.error(`Falha ao vincular/consumir ${queue} — adiado para a próxima reconexão`, err);
    }
  }
}
