declare module '@opencode-ai/sdk' {
  export function createOpencodeClient(config?: any): any;
  export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
  }
  export interface Session {
    id: string;
    messages: Message[];
    sendMessage(content: string): Promise<Message>;
  }
}
