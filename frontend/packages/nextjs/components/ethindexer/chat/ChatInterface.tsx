import React, { useState, useRef, useEffect } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { WelcomeMessage } from "./WelcomeMessage";

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
  };
}

interface ConversationMessage {
  role: "user" | "assistant";
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
  systemStatus,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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

  // Update conversation history
  const updateConversationHistory = (userMessage: string, assistantMessage: string) => {
    setConversationHistory((prev) =>
      [
        ...prev,
        { role: "user" as const, content: userMessage },
        { role: "assistant" as const, content: assistantMessage },
      ].slice(-10)
    ); // Keep last 10 exchanges for context
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

  // Handle user input with backend integration
  const handleUserMessage = async (content: string) => {
    // Add user message immediately
    addMessage({
      type: "user",
      content,
    });

    // Show typing indicator
    setIsTyping(true);

    try {
      // Send to chat backend
      const chatResponse = await sendChatMessage(content);
      console.log("🤖 Chat backend response:", chatResponse);

      // Debug logging
      console.log("🔍 Debug check:");
      console.log("  - isQueryReady:", chatResponse.isQueryReady);
      console.log("  - suggestedQuery:", chatResponse.suggestedQuery);
      console.log("  - confidence:", chatResponse.confidence);

      // Add assistant response message
      addMessage({
        type: "assistant",
        content: chatResponse.message,
        metadata: {
          isQueryReady: chatResponse.isQueryReady,
          confidence: chatResponse.confidence,
          query: chatResponse.suggestedQuery,
        },
      });

      // Update conversation history
      updateConversationHistory(content, chatResponse.message);

      // If the query is ready to execute, proceed with job creation
      if (chatResponse.isQueryReady && chatResponse.suggestedQuery) {
        console.log("✅ EXECUTING QUERY - conditions met!");
        console.log("  - chatResponse.isQueryReady =", chatResponse.isQueryReady);
        console.log("  - chatResponse.suggestedQuery =", chatResponse.suggestedQuery);
        try {
          // Small delay for better UX
          await new Promise((resolve) => setTimeout(resolve, 1000));

          console.log("🚀 About to call onExecuteQuery with:", chatResponse.suggestedQuery);
          const result = await onExecuteQuery(chatResponse.suggestedQuery);
          console.log("📊 onExecuteQuery returned:", result);

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
              type: "system",
              content: `✅ Successfully created indexing job! Job ID: ${jobId}`,
              metadata: {
                jobId: jobId,
                config: config,
              },
            });
          } else {
            console.warn("⚠️ No jobId found in orchestrator result:", result);
            addMessage({
              type: "system",
              content: "✅ Job created successfully!",
              metadata: { config: result },
            });
          }
        } catch (error) {
          console.error("❌ onExecuteQuery failed:", error);
          addMessage({
            type: "system",
            content: `❌ Failed to create job: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          });
        }
      } else {
        console.log("❌ NOT executing query:");
        console.log("  - isQueryReady:", chatResponse.isQueryReady);
        console.log("  - suggestedQuery exists:", !!chatResponse.suggestedQuery);
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

  // Handle direct query execution (for welcome message buttons)
  const handleDirectQuery = async (query: string) => {
    try {
      // Add user message for the query
      addMessage({
        type: "user",
        content: query,
      });

      // Add system message explaining what we're doing
      const tokenMatch = query.match(/(USDC|USDT|WETH|DAI|LINK)/i);
      const tokens = tokenMatch ? tokenMatch.length : 0;

      addMessage({
        type: "system",
        content: `I'll help you index ${tokens > 1 ? "those" : "that token"} transfers for you. Creating the indexing job now...`,
      });

      // Execute the query
      const result = await onExecuteQuery(query);

      // Handle the result
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

  // Get contextual help based on conversation
  const getContextualHelp = () => {
    if (messages.length === 0) {
      return "Which token would you like to track? For example:\n\n• USDC transfers\n• USDT transfers\n• WETH transfers\n• Or provide a contract address (0x...)";
    }

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.content.toLowerCase().includes("token")) {
      return "What would you like me to do with this token? For example:\n\n• Index all transfers\n• Track transfers for a specific address\n• Monitor transfers above a certain value";
    }

    if (lastMessage.content.toLowerCase().includes("transfer")) {
      return "Would you like to specify a block range? For example:\n\n• From the latest 1000 blocks\n• From block 18000000 to latest\n• Just say 'latest' for ongoing monitoring";
    }

    return "Would you like to specify a block range? For example:\n\n• From the latest 1000 blocks\n• From block 18000000 to latest\n• Just say 'latest' for ongoing monitoring";
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">EthIndexer AI Assistant</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Ready to help you index blockchain data</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
        >
          {/* Welcome Message */}
          {messages.length === 0 && (
            <WelcomeMessage onQuickAction={handleDirectQuery} />
          )}

          {/* Chat Messages */}
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-2 max-w-xs">
                <div className="flex items-center space-x-1">
                  <span className="text-sm text-gray-600 dark:text-gray-300">AI is analyzing your request</span>
                  <div className="flex space-x-1">
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0">
        <ChatInput
          onSendMessage={handleUserMessage}
          disabled={isProcessing || isTyping}
          placeholder={
            messages.length === 0
              ? "Ask me to index blockchain data..."
              : getContextualHelp()
          }
        />
      </div>
    </div>
  );
};