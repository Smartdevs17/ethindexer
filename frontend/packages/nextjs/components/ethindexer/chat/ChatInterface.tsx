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
  };
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

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

  // Handle user input
  const handleUserMessage = async (content: string) => {
    // Add user message
    addMessage({
      type: 'user',
      content
    });

    // Show typing indicator
    setIsTyping(true);

    try {
      // Simulate AI thinking time for better UX
      await new Promise(resolve => setTimeout(resolve, 800));

      // Check if this looks like a ready-to-execute query
      const isQuery = await analyzeUserInput(content);
      
      if (isQuery.isReadyToExecute) {
        // Add assistant confirmation message
        addMessage({
          type: 'assistant',
          content: isQuery.response,
          metadata: {
            query: content,
            isQueryReady: true
          }
        });

        // Execute the query
        try {
          const result = await onExecuteQuery(content);
          console.log('📊 Full result from onExecuteQuery:', result);
          
          // FIXED: Handle the nested response structure from your backend
          // Backend returns: { success: true, result: { jobId: "...", status: "...", config: {...} } }
          const jobData = result.result || result; // Handle both nested and direct structures
          const jobId = jobData.jobId;
          const config = jobData.config;
          
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
            console.warn('⚠️ No jobId found in result:', result);
            addMessage({
              type: 'system',
              content: `✅ Job created successfully! Check the Jobs panel for updates.`
            });
          }
        } catch (error) {
          console.error('❌ Job creation error:', error);
          addMessage({
            type: 'system',
            content: `❌ Error creating job: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      } else {
        // Add assistant guidance message
        addMessage({
          type: 'assistant',
          content: isQuery.response
        });
      }
    } catch (error) {
      console.error('❌ Chat analysis error:', error);
      addMessage({
        type: 'assistant',
        content: "I apologize, but I'm having trouble understanding your request. Could you please rephrase it?"
      });
    } finally {
      setIsTyping(false);
    }
  };

  // Analyze user input to determine if it's ready to execute or needs more info
  const analyzeUserInput = async (input: string): Promise<{ isReadyToExecute: boolean; response: string }> => {
    const lowerInput = input.toLowerCase();
    
    // Check for common patterns that indicate a complete query
    const hasToken = /usdc|usdt|weth|ethereum|0x[a-f0-9]{40}/i.test(input);
    const hasAction = /index|track|monitor|get|find/i.test(input);
    const hasBlockInfo = /block|from|to|latest|\d+/i.test(input);
    
    // Simple heuristics for demo - in production, you could call your AI service
    if (hasToken && hasAction) {
      return {
        isReadyToExecute: true,
        response: `Perfect! I'll index ${hasToken ? 'that token' : 'those'} transfers for you. Creating the indexing job now...`
      };
    }
    
    // Provide guidance based on what's missing
    if (!hasToken) {
      return {
        isReadyToExecute: false,
        response: "I'd be happy to help you index blockchain data! Which token would you like to track? For example:\n\n• USDC transfers\n• USDT transfers\n• WETH transfers\n• Or provide a specific contract address (0x...)"
      };
    }
    
    if (!hasAction) {
      return {
        isReadyToExecute: false,
        response: "Got it! What would you like me to do with this token? For example:\n\n• Index all transfers\n• Track transfers for a specific address\n• Monitor transfers above a certain value"
      };
    }
    
    return {
      isReadyToExecute: false,
      response: "I can help with that! Would you like to specify a block range? For example:\n\n• From the latest 1000 blocks\n• From block 18000000 to latest\n• Just say 'latest' for ongoing monitoring"
    };
  };

  // Handle quick action buttons
  const handleQuickAction = (action: string) => {
    handleUserMessage(action);
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
          onClick={() => setMessages([])}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-3 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
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
        
        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
            <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <span className="text-sm">🤖</span>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
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
          placeholder="Ask me to index blockchain data..."
        />
      </div>
    </div>
  );
};