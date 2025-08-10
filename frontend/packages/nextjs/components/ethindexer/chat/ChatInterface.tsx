import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, CheckCircle, AlertCircle, Loader2, Sparkles } from "lucide-react";

export interface Message {
  id: string;
  type: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: {
    query?: string;
    jobId?: string;
    config?: any;
    isQueryReady?: boolean;
    confidence?: number;
    suggestions?: string[];
    suggestedQuery?: string;
  };
}

interface ChatInterfaceProps {
  onExecuteQuery: (query: string) => Promise<any>;
  isProcessing?: boolean;
  systemStatus?: string;
  className?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onExecuteQuery,
  isProcessing = false,
  systemStatus,
  className,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Add a new message to the chat
  const addMessage = (message: Omit<Message, "id" | "timestamp">) => {
    const newMessage: Message = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
    return newMessage;
  };

  // Update conversation history for context
  const updateConversationHistory = (userMessage: string, assistantMessage: string) => {
    setConversationHistory((prev) =>
      [
        ...prev,
        { role: "user", content: userMessage },
        { role: "assistant", content: assistantMessage },
      ].slice(-10) // Keep last 10 exchanges for context
    );
  };

  // Send message to chat backend
  const sendChatMessage = async (message: string) => {
    try {
      const response = await fetch(`${apiUrl}/chat/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          conversationHistory,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Chat request failed");
      }

      return result.response;
    } catch (error) {
      console.error("❌ Chat backend error:", error);
      throw error;
    }
  };

  // Handle user input
  const handleUserMessage = async (content: string) => {
    if (!content.trim()) return;

    // Add user message immediately
    addMessage({
      type: "user",
      content,
    });

    setInputValue("");
    setIsTyping(true);

    try {
      // Send to chat backend
      const chatResponse = await sendChatMessage(content);

      // Add assistant response message
      addMessage({
        type: "assistant",
        content: chatResponse.message,
        metadata: {
          isQueryReady: chatResponse.isQueryReady,
          confidence: chatResponse.confidence,
          query: chatResponse.suggestedQuery,
          suggestions: chatResponse.suggestions || [],
        },
      });

      // Update conversation history
      updateConversationHistory(content, chatResponse.message);

      // If the query is ready to execute, proceed with job creation
      if (chatResponse.isQueryReady && chatResponse.suggestedQuery) {
        try {
          // Small delay for better UX
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const result = await onExecuteQuery(chatResponse.suggestedQuery);

          // Handle different response structures
          let jobId = null;
          let config = null;

          if (result && result.result && result.result.jobId) {
            jobId = result.result.jobId;
            config = result.result.config;
          } else if (result && result.jobId) {
            jobId = result.jobId;
            config = result.config;
          }

          if (jobId) {
            addMessage({
              type: "system",
              content: `✅ Successfully created indexing job! Job ID: ${jobId}\n\nYou can view your API in the "My APIs" section.`,
              metadata: {
                jobId: jobId,
                config: config,
              },
            });
          } else {
            addMessage({
              type: "system",
              content: "✅ Job created successfully!\n\nYou can view your API in the \"My APIs\" section.",
              metadata: { config: result },
            });
          }
          
          // Add a follow-up message with navigation suggestion
          setTimeout(() => {
            addMessage({
              type: "assistant",
              content: "Your indexing job is now running! You can:\n\n• Go to \"My APIs\" to see your created API\n• Check the \"Data\" page to see live blockchain data\n• Create more APIs by continuing our conversation",
              metadata: {
                suggestions: ["Go to My APIs", "View Live Data", "Create Another API"]
              }
            });
          }, 1000);
        } catch (error) {
          console.error("❌ onExecuteQuery failed:", error);
          addMessage({
            type: "system",
            content: `❌ Failed to create job: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          });
        }
      }
    } catch (error) {
      console.error("❌ Chat error:", error);

      addMessage({
        type: "assistant",
        content: "I'm having trouble processing your request. Please try again or contact support if the issue persists.",
        metadata: {
          isQueryReady: false,
          confidence: 0,
        },
      });
    } finally {
      setIsTyping(false);
    }
  };

  // Handle direct query execution
  const handleDirectQuery = async (query: string) => {
    try {
      addMessage({
        type: "user",
        content: query,
      });

      addMessage({
        type: "system",
        content: `Creating indexing job for: ${query}`,
      });

      const result = await onExecuteQuery(query);
      const jobId = result?.jobId || result?.result?.jobId;

      if (jobId) {
        addMessage({
          type: "system",
          content: `✅ Indexing job created successfully! Job ID: ${jobId}`,
          metadata: {
            jobId: jobId,
            config: result.config || result.result?.config,
          },
        });
      } else {
        addMessage({
          type: "system",
          content: "✅ Indexing job created successfully!",
          metadata: { config: result },
        });
      }
    } catch (error) {
      console.error("❌ Direct query execution failed:", error);
      addMessage({
        type: "system",
        content: `❌ Failed to create indexing job: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    }
  };

  // Handle suggestion clicks
  const handleSuggestionClick = (suggestion: string) => {
    // Check if it's a navigation suggestion
    if (suggestion === "Go to My APIs") {
      window.location.href = "/app/apis";
    } else if (suggestion === "View Live Data") {
      window.location.href = "/app/data";
    } else if (suggestion === "Create Another API") {
      // Clear the conversation and start fresh
      setMessages([]);
      setConversationHistory([]);
    } else {
      // Regular suggestion - fill the input
      setInputValue(suggestion);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleUserMessage(inputValue);
  };

  // Handle keyboard shortcuts
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleUserMessage(inputValue);
    }
    // Allow Shift+Enter for new lines
  };

  const quickActions = [
    {
      title: "Track Popular Tokens",
      description: "USDC, WETH, DAI transfers",
      query: "Index transfers for popular tokens like USDC and WETH"
    },
    {
      title: "Monitor My Wallet", 
      description: "All transactions to/from your wallet",
      query: "Track all transactions involving my wallet address"
    },
    {
      title: "Large Transactions",
      description: "High-value transfers across all tokens", 
      query: "Index transactions above $100,000 in value"
    },
    {
      title: "DeFi Activity",
      description: "DEX swaps, lending, liquidity",
      query: "Track DeFi protocol interactions and token swaps"
    }
  ];

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-800 ${className || ''}`}>
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              AI Assistant
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Describe what blockchain data you want to track
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-6 space-y-4">
          {/* Welcome Message */}
          {messages.length === 0 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Welcome to EthIndexer AI
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  I can help you create custom APIs for blockchain data. Just tell me what you want to track!
                </p>
              </div>

              {/* Quick Actions */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Quick Actions:
                </p>
                <div className="grid gap-3">
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => handleDirectQuery(action.query)}
                      disabled={isProcessing || isTyping}
                      className="text-left p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            {action.title}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {action.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Chat Messages */}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  message.type === "user"
                    ? "bg-blue-600 text-white"
                    : message.type === "system"
                    ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                }`}
              >
                <div className="flex items-start space-x-2">
                  {message.type === "user" ? (
                    <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  ) : message.type === "system" ? (
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  ) : (
                    <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    {message.metadata?.jobId && (
                      <p className="text-xs opacity-75 mt-1">
                        Job ID: {message.metadata.jobId}
                      </p>
                    )}

                  </div>
                </div>
                
                {/* Suggestion Chips */}
                {message.metadata?.suggestions && message.metadata.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {message.metadata.suggestions.map((suggestion, index) => {
                      const isNavigation = suggestion.startsWith("Go to") || suggestion.startsWith("View") || suggestion === "Create Another API";
                      return (
                        <button
                          key={index}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors border ${
                            isNavigation
                              ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50 border-green-200 dark:border-green-800"
                              : "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 border-blue-200 dark:border-blue-800"
                          }`}
                        >
                          {isNavigation && "🔗 "}
                          {suggestion}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Execute Query Button */}
                {message.metadata?.isQueryReady && message.metadata?.suggestedQuery && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-3">
                      <p className="text-xs text-blue-800 dark:text-blue-300 font-medium mb-1">
                        Ready to execute:
                      </p>
                      <p className="text-sm text-blue-900 dark:text-blue-200">
                        {message.metadata.suggestedQuery}
                      </p>
                    </div>
                    <button
                      onClick={() => handleUserMessage(`Execute: ${message.metadata?.suggestedQuery || ''}`)}
                      disabled={isProcessing || isTyping}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                    >
                      <Sparkles className="h-4 w-4 inline mr-2" />
                      Execute Query
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-3 max-w-xs">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    AI is analyzing your request...
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 p-6 border-t border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <div className="flex-1 relative">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Describe what blockchain data you want to track..."
              disabled={isProcessing || isTyping}
              rows={3}
              className="w-full px-4 py-3 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={!inputValue.trim() || isProcessing || isTyping}
            className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};