// Chat message types
export interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  query?: string;
  jobId?: string;
  config?: any;
  isQueryReady?: boolean;
  confidence?: number;
  needsMoreInfo?: string[];
  suggestedQuery?: string;
}

// Conversation history for AI context
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Backend API types
export interface ChatResponse {
  message: string;
  isQueryReady: boolean;
  suggestedQuery?: string;
  needsMoreInfo?: string[];
  confidence: number;
}

export interface ChatRequest {
  message: string;
  conversationHistory?: ConversationMessage[];
}

export interface ChatApiResponse {
  success: boolean;
  response?: ChatResponse;
  error?: string;
  timestamp: Date;
}

// Component prop types
export interface ChatInterfaceProps {
  onExecuteQuery: (query: string) => Promise<any>;
  isProcessing?: boolean;
  systemStatus?: string;
}

export interface ChatMessageProps {
  message: Message;
}

export interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export interface WelcomeMessageProps {
  onQuickAction: (action: string) => void;
}

// Quick action types
export interface QuickAction {
  icon: string;
  title: string;
  description: string;
  action: string;
}

// Chat state types
export interface ChatState {
  messages: Message[];
  conversationHistory: ConversationMessage[];
  isTyping: boolean;
  isProcessing: boolean;
}

// Hook return type
export interface UseChatReturn {
  messages: Message[];
  isTyping: boolean;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => Message;
}

// Suggestion types
export interface ChatSuggestion {
  text: string;
  category?: 'token' | 'action' | 'range' | 'example';
}

export interface SuggestionsResponse {
  success: boolean;
  suggestions: string[];
  timestamp: Date;
}