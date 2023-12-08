import {
  connect, Connection, Channel, ConsumeMessage,
} from 'amqplib';
import { setTimeout } from 'timers/promises';
import { logger } from '../../util/logger';

export class RabbitConnect {
  exchange: string;

  queue: string;

  protected uri: string;

  private _connection!: Connection;

  public _channel!: Channel;

  private _countToConnect: number = 0;

  constructor(nameExchange?: string, rabbitmqUri?: string) {
    this.uri = rabbitmqUri || 'amqp://user:password@localhost:5672';
    this.exchange = nameExchange || 'postgres_exchange';
    this.queue = `${this.exchange}_queue`;
  }

  async connect(): Promise<this> {
    try {
      this._connection = await connect(this.uri);
      this._connection.on('error', this.errorHandler);
      this._connection.on('close', this.errorHandler);

      logger.info('RabbitMQ Connected', {
        url: this.uri,
        exchange: this.exchange,
        queue: this.queue,
      });

      this._channel = await this._connection.createChannel();
      this._channel.on('error', this.errorHandler);

      await this._channel.assertExchange(this.exchange, 'fanout', { durable: false });
      await this._channel.assertQueue(this.queue, { durable: false, maxPriority: 10 });
      await this._channel.bindQueue(this.queue, this.exchange, '');
      await this._channel.prefetch(1);

      return this;
    } catch (error) {
      logger.error('Rabbit connect error: ', error);
      throw new Error(`Rabbit connect error ${JSON.stringify(error)}`);
    }
  }

  get channel() {
    return this._channel;
  }

  async disconnect(): Promise<void> {
    try {
      await this._channel.close();
      await this._connection.close();
    } catch (error) {
      logger.error(`RabbitMQ disconnecting error: ${error}`);
    }
  }

  private errorHandler = async (err: Error) => {
    logger.error('Error RabbitMQ', err);
    if (this._countToConnect > 10) {
      await this.disconnect();
      logger.error(`Error RabbitMQ failed to reconnect after ${this._countToConnect} attempts`, err);
      process.exit(1);
    }

    await this.disconnect();
    this._countToConnect += 1;

    logger.info(`RabbitMQ start reconnecting: ${this._countToConnect}`);
    await setTimeout(1000, async () => {
      await this.connect();
      this._countToConnect = 0;
      logger.info(`RabbitMQ finish reconnecting: ${this._countToConnect}`);
    });
  };

  public ack(message: ConsumeMessage): void {
    this._channel.ack(message);
  }

  public nack(message: ConsumeMessage): void {
    this._channel.nack(message);
  }
}
