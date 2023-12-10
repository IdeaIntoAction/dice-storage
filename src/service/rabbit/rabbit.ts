import { ConsumeMessage } from 'amqplib';
import { RabbitConnect } from './connect';
import { MessageHandlerCallback } from './interface';
import { logger } from '../../util/logger';

export class RabbitService {
  private static instance: RabbitService;

  private connection: RabbitConnect;

  private readonly LOG_ALIAS: string = 'RabbitConsumeService';

  private customMessageHandler?: MessageHandlerCallback;

  private constructor(nameExchange?: string) {
    this.connection = new RabbitConnect(nameExchange);
  }

  static async getInstance(nameExchange?: string): Promise<RabbitService> {
    if (!this.instance) {
      this.instance = new RabbitService(nameExchange);
      await this.instance.connection.connect();
    }
    return this.instance;
  }

  public setCustomMessageHandler(handler: MessageHandlerCallback) {
    this.customMessageHandler = handler;
  }

  async init(): Promise<void> {
    try {
      const { channel, queue } = this.connection;

      channel.consume(queue, async (msg: ConsumeMessage | null) => {
        try {
          if (this.customMessageHandler) {
            this.customMessageHandler(msg);
          } else {
            logger.error(`${this.LOG_ALIAS} Message handler is not defined`);
          }
        } catch (error) {
          logger.error(`${this.LOG_ALIAS} Error callback`, error);
        }
      }, { noAck: false });
    } catch (error) {
      logger.error(`${this.LOG_ALIAS} Error init consume`, error);
      throw error;
    }
  }

  ack(msg: ConsumeMessage): void {
    this.connection.ack(msg);
  }

  confirmWritingToDB(msg: ConsumeMessage): void {
    try {
      this.connection.channel.sendToQueue(msg?.properties.replyTo, Buffer.from(JSON.stringify({ status: true })), {
        correlationId: msg?.properties.correlationId,
      });
    } catch (error) {
      logger.error(`${this.LOG_ALIAS} Error confirming writing to DB`, error);
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.connection.disconnect();
    } catch (error) {
      logger.error(`${this.LOG_ALIAS} Error disconnecting`, error);
    }
  }
}
