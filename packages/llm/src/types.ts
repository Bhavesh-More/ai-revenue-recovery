export type ChatRole = "system" | "user" | "assistant" | "tool";

export interface ChatMessage {
  role: ChatRole;
  content: string;
  name?: string;
}

export interface ChatResponseFormat {
  type: "json_object";
}

export interface ChatUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ChatChoice {
  index: number;
  finishReason: string;
  message: ChatMessage;
}

export interface ChatResponse {
  id: string;
  model: string;
  created: number;
  choices: ChatChoice[];
  usage: ChatUsage;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  response_format?: ChatResponseFormat;
  temperature?: number;
  max_tokens?: number;
}

export interface OllamaClientConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs?: number;
}
