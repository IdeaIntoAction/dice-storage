export interface IDiceRequest {
  id: string;
  nickname: string;
}

export type MessageHandlerCallback = (msgContent: IDiceRequest) => Promise<true>;
