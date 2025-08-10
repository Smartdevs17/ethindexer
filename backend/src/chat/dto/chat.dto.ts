export interface ChatMessageDto {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequestDto {
  message: string;
  conversationHistory?: ChatMessageDto[];
}

export interface ChatResponseDto {
  message: string;
  isQueryReady: boolean;
  suggestedQuery?: string;
  needsMoreInfo?: string[];
  confidence: number;
  suggestions?: string[];
  conversationContext?: {
    totalMessages: number;
    lastUserMessage: string;
  };
}

export interface ChatApiResponseDto {
  success: boolean;
  response?: ChatResponseDto;
  error?: string;
  timestamp: Date;
}

export interface ExecuteQueryResponseDto {
  success: boolean;
  jobId: string;
  message: string;
  config?: any;
  timestamp: Date;
}