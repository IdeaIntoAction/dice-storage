import { ConsumeMessage } from 'amqplib';

export interface IDiceRequest {
  id: string;
  userId: string;
  nickname: string;
  number: number;
  status: boolean;
}

export type MessageHandlerCallback = (msgContent: ConsumeMessage | null) => Promise<boolean>;
