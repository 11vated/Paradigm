declare module '@opencode-ai/sdk' {
  export interface OpencodeConfig {
    apiKey?: string;
    baseUrl?: string;
    timeout?: number;
  }
  
  export function createOpencodeClient(config?: OpencodeConfig): OpencodeClient;
  
  export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
  }
  
  export interface OpencodeClient {
    createSession(): Session;
  }
  
  export interface Session {
    id: string;
    messages: Message[];
    sendMessage(content: string): Promise<Message>;
  }
}
