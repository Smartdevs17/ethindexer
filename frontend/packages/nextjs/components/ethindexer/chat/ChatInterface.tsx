import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, CheckCircle, AlertCircle, Loader2, Sparkles, Database, Zap, Hash } from "lucide-react";

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
              content: `🎉 Perfect! I've created your blockchain data API. Your job is now running and will be ready shortly.`,
              metadata: {
                jobId: jobId,
                config: config,
              },
            });
          } else {
            addMessage({
              type: "system",
              content: `🎉 Great! I've created your blockchain data API. It's now processing your request.`,
              metadata: { config: result },
            });
          }
          
          // Add a follow-up message with navigation suggestion
          setTimeout(() => {
            addMessage({
              type: "assistant",
              content: `Your API is being generated! Here's what you can do next:\n\n• Check your APIs to see the endpoint\n• View live blockchain data\n• Create more APIs by asking me more questions`,
              metadata: {
                suggestions: ["View My APIs", "See Live Data", "Ask Another Question"]
              }
            });
          }, 1000);
        } catch (error) {
          console.error("❌ onExecuteQuery failed:", error);
          addMessage({
            type: "system",
            content: `❌ Sorry, I couldn't create your API right now. Please try again in a moment.`,
          });
        }
      }
    } catch (error) {
      console.error("❌ Chat error:", error);

      addMessage({
        type: "assistant",
        content: "I'm having trouble processing your request right now. Please try again or ask me something else!",
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
        content: `Creating your blockchain data API...`,
      });

      const result = await onExecuteQuery(query);
      const jobId = result?.jobId || result?.result?.jobId;

      if (jobId) {
        addMessage({
          type: "system",
          content: `🎉 Success! Your blockchain data API is now being created.`,
          metadata: {
            jobId: jobId,
            config: result.config || result.result?.config,
          },
        });
      } else {
        addMessage({
          type: "system",
          content: `🎉 Perfect! Your blockchain data API is now being created.`,
          metadata: { config: result },
        });
      }
    } catch (error) {
      console.error("❌ Direct query execution failed:", error);
      addMessage({
        type: "system",
        content: `❌ Sorry, I couldn't create your API right now. Please try again.`,
      });
    }
  };

  // Handle suggestion clicks
  const handleSuggestionClick = (suggestion: string) => {
    // Check if it's a navigation suggestion
    if (suggestion === "View My APIs") {
      window.location.href = "/app/apis";
    } else if (suggestion === "See Live Data") {
      window.location.href = "/app/data";
    } else if (suggestion === "Ask Another Question") {
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
      query: "Index transfers for popular tokens like USDC and WETH",
      icon: "🏆",
      color: "from-blue-500 to-blue-600"
    },
    {
      title: "Monitor My Wallet", 
      description: "All transactions to/from your wallet",
      query: "Track all transactions involving my wallet address",
      icon: "👛",
      color: "from-purple-500 to-purple-600"
    },
    {
      title: "Large Transactions",
      description: "High-value transfers across all tokens", 
      query: "Index transactions above $100,000 in value",
      icon: "💰",
      color: "from-green-500 to-green-600"
    },
    {
      title: "DeFi Activity",
      description: "DEX swaps, lending, liquidity",
      query: "Track DeFi protocol interactions and token swaps",
      icon: "🔄",
      color: "from-orange-500 to-orange-600"
    }
  ];

  return (
    <div className={`flex flex-col h-full bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 ${className || ''}`}>
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-2xl">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
            <Bot className="h-7 w-7 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Blockchain Data Assistant
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Ask me anything about blockchain data you want to track
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-6 space-y-6">
          {/* Welcome Message */}
          {messages.length === 0 && (
            <div className="space-y-8">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Hi! I'm your Blockchain Data Assistant
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
                  I can help you create custom APIs for any blockchain data you want to track. 
                  Just tell me what you're looking for in plain English!
                </p>
              </div>

              {/* Quick Actions */}
              <div className="space-y-4">
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300 text-center">
                  Try these examples:
                </p>
                <div className="grid gap-4 max-w-2xl mx-auto">
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => handleDirectQuery(action.query)}
                      disabled={isProcessing || isTyping}
                      className="text-left p-6 bg-white dark:bg-gray-800 rounded-2xl hover:shadow-lg transition-all transform hover:scale-105 border border-gray-200 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed group shadow-md"
                    >
                      <div className="flex items-start space-x-4">
                        <div className={`w-12 h-12 bg-gradient-to-r ${action.color} rounded-xl flex items-center justify-center flex-shrink-0 text-2xl`}>
                          {action.icon}
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 mb-2">
                            {action.title}
                          </h4>
                          <p className="text-gray-600 dark:text-gray-400">
                            {action.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tips */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 max-w-2xl mx-auto">
                <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-3 text-center">
                  💡 Pro Tips
                </h4>
                <div className="space-y-2 text-sm text-blue-800 dark:text-blue-400">
                  <p>• Be specific: "Show me USDC transfers above $10,000"</p>
                  <p>• Include time ranges: "from the last 1000 blocks"</p>
                  <p>• Mention specific addresses: "involving wallet 0x..."</p>
                  <p>• Ask naturally: "I want to track DeFi activity"</p>
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
                className={`max-w-[80%] rounded-2xl px-6 py-4 shadow-md ${
                  message.type === "user"
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                    : message.type === "system"
                    ? "bg-gradient-to-r from-green-500 to-green-600 text-white"
                    : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700"
                }`}
              >
                <div className="flex items-start space-x-3">
                  {message.type === "user" ? (
                    <User className="h-5 w-5 mt-1 flex-shrink-0" />
                  ) : message.type === "system" ? (
                    <CheckCircle className="h-5 w-5 mt-1 flex-shrink-0" />
                  ) : (
                    <Bot className="h-5 w-5 mt-1 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    {message.metadata?.jobId && (
                      <p className="text-xs opacity-75 mt-2 font-mono">
                        Job ID: {message.metadata.jobId}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Suggestion Chips */}
                {message.metadata?.suggestions && message.metadata.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {message.metadata.suggestions.map((suggestion, index) => {
                      const isNavigation = suggestion.startsWith("View") || suggestion.startsWith("See") || suggestion === "Ask Another Question";
                      return (
                        <button
                          key={index}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all transform hover:scale-105 border ${
                            isNavigation
                              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50 border-green-200 dark:border-green-800"
                              : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 border-blue-200 dark:border-blue-800"
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
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-4">
                      <p className="text-xs text-blue-800 dark:text-blue-300 font-semibold mb-2">
                        ✨ Ready to create your API:
                      </p>
                      <p className="text-sm text-blue-900 dark:text-blue-200">
                        {message.metadata.suggestedQuery}
                      </p>
                    </div>
                    <button
                      onClick={() => handleUserMessage(`Create this API: ${message.metadata?.suggestedQuery || ''}`)}
                      disabled={isProcessing || isTyping}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg text-sm font-semibold"
                    >
                      <Sparkles className="h-4 w-4 inline mr-2" />
                      Create My API
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-800 rounded-2xl px-6 py-4 max-w-xs shadow-md border border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-2xl">
        <form onSubmit={handleSubmit} className="flex space-x-4">
          <div className="flex-1 relative">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about blockchain data you want to track..."
              disabled={isProcessing || isTyping}
              rows={2}
              className="w-full px-6 py-4 text-base bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none shadow-sm"
            />
          </div>
          <button
            type="submit"
            disabled={!inputValue.trim() || isProcessing || isTyping}
            className="px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl hover:from-blue-700 hover:to-purple-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
};