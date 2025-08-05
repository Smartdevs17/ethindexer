import React from 'react';
import { Message } from './ChatInterface';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.type === 'user';
  const isSystem = message.type === 'system';

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageIcon = () => {
    switch (message.type) {
      case 'user':
        return '👤';
      case 'assistant':
        return '🤖';
      case 'system':
        return '⚙️';
      default:
        return '💬';
    }
  };

  const getMessageBgColor = () => {
    if (isUser) {
      return 'bg-blue-600 text-white';
    }
    if (isSystem) {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-700';
    }
    return 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100';
  };

  const renderMessageContent = () => {
    // If it's a multiline message (contains \n), split into paragraphs
    const lines = message.content.split('\n');
    
    if (lines.length === 1) {
      return <p>{message.content}</p>;
    }

    return (
      <div className="space-y-2">
        {lines.map((line, index) => (
          <p key={index} className={line.startsWith('•') ? 'ml-2' : ''}>
            {line}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start space-x-2 max-w-[80%]`}>
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? 'ml-2' : 'mr-2'
        } ${
          isUser 
            ? 'bg-blue-600' 
            : isSystem 
              ? 'bg-yellow-500' 
              : 'bg-gray-300 dark:bg-gray-600'
        }`}>
          <span className="text-sm">
            {getMessageIcon()}
          </span>
        </div>

        {/* Message Content */}
        <div className="flex flex-col">
          <div className={`rounded-lg px-4 py-2 ${getMessageBgColor()}`}>
            <div className="text-sm">
              {renderMessageContent()}
            </div>
            
            {/* Show metadata for query-ready messages */}
            {message.metadata?.isQueryReady && (
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                <div className="text-xs opacity-75">
                  Ready to execute: <code className="bg-black/10 px-1 rounded">{message.metadata.query}</code>
                </div>
              </div>
            )}

            {/* Show job info for system messages */}
            {message.metadata?.jobId && (
              <div className="mt-2 pt-2 border-t border-yellow-300 dark:border-yellow-700">
                <div className="text-xs opacity-75">
                  Job ID: <code className="bg-black/10 px-1 rounded">{message.metadata.jobId}</code>
                </div>
              </div>
            )}
          </div>
          
          {/* Timestamp */}
          <div className={`text-xs text-gray-500 dark:text-gray-400 mt-1 ${
            isUser ? 'text-right' : 'text-left'
          }`}>
            {formatTime(message.timestamp)}
          </div>
        </div>
      </div>
    </div>
  );
};