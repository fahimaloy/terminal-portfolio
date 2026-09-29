// src/types/chat.ts
/* Chat domain types. These were three independent local `Message` declarations
 * (Homepage.tsx, home/HeroChat.tsx, home/ChatStream.tsx) that happened to agree;
 * agreement is not a guarantee, and the chat surface had already drifted once
 * when one copy picked up a field the others did not. One definition, three
 * importers. */

export type MessageRole = 'user' | 'model';

export interface Message {
  role: MessageRole;
  text: string;
  responseType?: string;
  responseData?: unknown;
  /** Epoch ms the message was appended — drives the per-message clock. */
  ts?: number;
  /** A failed request. Renders as an error card with a retry, not an answer. */
  isError?: boolean;
}
