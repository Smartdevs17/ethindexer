import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { WelcomeMessage } from './WelcomeMessage';

export interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    query?: string;
    jobId?: string;
    config?: any;
    isQueryReady?: boolean;
    confidence?: number;
  };
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatInterfaceProps {
  onExecuteQuery: (query: string) => Promise<any>;
  isProcessing?: boolean;
  systemStatus?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onExecuteQuery,
  isProcessing = false,
  systemStatus
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Add a new message to the chat
  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  };

  // Update conversation history
  const updateConversationHistory = (userMessage: string, assistantMessage: string) => {
    setConversationHistory(prev => [
      ...prev,
      { role: 'user' as const, content: userMessage },
      { role: 'assistant' as const, content: assistantMessage }
    ].slice(-10)); // Keep last 10 exchanges for context
  };

  // Send message to chat backend
  const sendChatMessage = async (message: string) => {
    try {
      const response = await fetch(`${apiUrl}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message, 
          conversationHistory 
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Chat request failed');
      }

      return result.response;
    } catch (error) {
      console.error('❌ Chat backend error:', error);
      throw error;
    }
  };

  // Handle user input with backend integration
  const handleUserMessage = async (content: string) => {
    // Add user message immediately
    addMessage({
      type: 'user',
      content
    });

    // Show typing indicator
    setIsTyping(true);

    try {
      // Send to chat backend
      const chatResponse = await sendChatMessage(content);
      console.log('🤖 Chat backend response:', chatResponse);

      // ADD THIS DEBUG BLOCK:
      console.log('🔍 Debug check:');
      console.log('  - isQueryReady:', chatResponse.isQueryReady);
      console.log('  - suggestedQuery:', chatResponse.suggestedQuery);
      console.log('  - confidence:', chatResponse.confidence);

      // Add assistant response
      const assistantMessage = addMessage({
        type: 'assistant',
        content: chatResponse.message,
        metadata: {
          isQueryReady: chatResponse.isQueryReady,
          confidence: chatResponse.confidence,
          query: chatResponse.suggestedQuery
        }
      });

      // Update conversation history
      updateConversationHistory(content, chatResponse.message);

      // If the query is ready to execute, proceed with job creation
      if (chatResponse.isQueryReady && chatResponse.suggestedQuery) {
        console.log('✅ EXECUTING QUERY - conditions met!');
        console.log('  - chatResponse.isQueryReady =', chatResponse.isQueryReady);
        console.log('  - chatResponse.suggestedQuery =', chatResponse.suggestedQuery);
        try {
          // Small delay for better UX
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          console.log('🚀 About to call onExecuteQuery with:', chatResponse.suggestedQuery);
          const result = await onExecuteQuery(chatResponse.suggestedQuery);
          console.log('📊 onExecuteQuery returned:', result);

          // Handle different response structures from your orchestrator
          let jobId = null;
          let config = null;

          if (result && result.result && result.result.jobId) {
            // Nested structure: { success: true, result: { jobId: "...", config: {...} } }
            jobId = result.result.jobId;
            config = result.result.config;
          } else if (result && result.jobId) {
            // Direct structure: { jobId: "...", config: {...} }
            jobId = result.jobId;
            config = result.config;
          }

          if (jobId) {
            // Add success message
            addMessage({
              type: 'system',
              content: `✅ Successfully created indexing job! Job ID: ${jobId}`,
              metadata: {
                jobId: jobId,
                config: config
              }
            });
          } else {
            console.warn('⚠️ No jobId found in orchestrator result:', result);
            addMessage({
              type: 'system',
              content: `✅ Job created successfully! Check the Jobs panel for updates.`
            });
          }
        } catch (execError) {
          console.error('❌ onExecuteQuery failed:', execError);
          addMessage({
            type: 'system',
            content: `❌ Error creating job: ${execError instanceof Error ? execError.message : 'Unknown error'}`
          });
        }
      } else {
        console.log('❌ NOT executing query:');
        console.log('  - isQueryReady:', chatResponse.isQueryReady);
        console.log('  - suggestedQuery exists:', !!chatResponse.suggestedQuery);
      }

    } catch (chatError) {
      console.error('❌ Chat error:', chatError);
      
      // Fallback to simple local analysis if backend fails
      const fallbackResponse = await fallbackAnalysis(content);
      
      addMessage({
        type: 'assistant',
        content: fallbackResponse.message,
        metadata: {
          isQueryReady: fallbackResponse.isQueryReady,
          confidence: 0.3,
          query: fallbackResponse.isQueryReady ? content : undefined
        }
      });

      // If fallback thinks it's ready, try to execute
      if (fallbackResponse.isQueryReady) {
        try {
          const result = await onExecuteQuery(content);
          let jobId = result.result?.jobId || result.jobId;
          
          if (jobId) {
            addMessage({
              type: 'system',
              content: `✅ Successfully created indexing job! Job ID: ${jobId}`,
              metadata: { jobId }
            });
          } else {
            addMessage({
              type: 'system',
              content: `✅ Job created successfully! Check the Jobs panel for updates.`
            });
          }
        } catch (execError) {
          addMessage({
            type: 'system',
            content: `❌ Error creating job: ${execError instanceof Error ? execError.message : 'Unknown error'}`
          });
        }
      }
    } finally {
      setIsTyping(false);
    }
  };

  // Fallback analysis when backend is unavailable (same as your working backend logic)
  const fallbackAnalysis = async (input: string): Promise<{ message: string; isQueryReady: boolean }> => {
    const lowerInput = input.toLowerCase();
    
    // Check for common patterns
    const hasToken = /usdc|usdt|weth|ethereum|0x[a-f0-9]{40}/i.test(input);
    const hasAction = /index|track|monitor|get|find/i.test(input);
    const hasBlockInfo = /block|from|to|latest|\d+/i.test(input);
    
    if (hasToken && hasAction) {
      return {
        isQueryReady: true,
        message: `Perfect! I'll index ${hasToken ? 'that token' : 'those'} transfers for you. Creating the indexing job now...`
      };
    }
    
    // Provide guidance
    if (!hasToken) {
      return {
        isQueryReady: false,
        message: "Which token would you like to track? For example:\n\n• USDC transfers\n• USDT transfers\n• WETH transfers\n• Or provide a contract address (0x...)"
      };
    }
    
    if (!hasAction) {
      return {
        isQueryReady: false,
        message: "What would you like me to do with this token? For example:\n\n• Index all transfers\n• Track transfers for a specific address\n• Monitor transfers above a certain value"
      };
    }
    
    return {
      isQueryReady: false,
      message: "Would you like to specify a block range? For example:\n\n• From the latest 1000 blocks\n• From block 18000000 to latest\n• Just say 'latest' for ongoing monitoring"
    };
  };

  // Handle quick action buttons
  const handleQuickAction = (action: string) => {
    handleUserMessage(action);
  };

  // Clear chat and reset conversation
  const clearChat = () => {
    setMessages([]);
    setConversationHistory([]);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-xl shadow-lg">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">🤖</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              EthIndexer AI Assistant
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {systemStatus || 'Ready to help you index blockchain data'}
            </p>
          </div>
        </div>
        
        {/* Clear Chat Button */}
        <button
          onClick={clearChat}
          disabled={messages.length === 0}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-3 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Clear Chat
        </button>
      </div>

      {/* Messages Container */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
      >
        {messages.length === 0 ? (
          <WelcomeMessage onQuickAction={handleQuickAction} />
        ) : (
          messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))
        )}
        
        {/* Typing indicator with backend status */}
        {isTyping && (
          <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
            <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <span className="text-sm">🤖</span>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-2">
              <div className="flex items-center space-x-1">
                <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">
                  AI is analyzing your request
                </span>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <ChatInput 
          onSendMessage={handleUserMessage}
          disabled={isProcessing || isTyping}
          placeholder={
            conversationHistory.length === 0 
              ? "Ask me to index blockchain data..." 
              : "Continue the conversation..."
          }
        />
      </div>
    </div>
  );
};