'use client';

import { useState } from 'react';
import { SoundWaveAnimation } from './sound-wave-animation';
import { AIAssistantInput } from './ai-assistant-input';

export function AIAssistantChat() {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  const handleSubmit = () => {
    if (!inputValue.trim()) return;
    
    // Add user message (UI only - no API call)
    setMessages([...messages, { role: 'user', content: inputValue }]);
    setInputValue('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header Section */}
      <div className="py-8 px-6 text-center">
        <SoundWaveAnimation />
        <h2 className="text-xl font-semibold mt-4 mb-2">
          Hi,
        </h2>
        <h2 className="text-xl font-semibold mb-2">
          Welcome back! How can I help?
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          I'm here to help you tackle your tasks.
          <br />
          Choose from the prompts below or just
          <br />
          tell me what you need!
        </p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {/* Empty state - no messages yet */}
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground ml-8'
                    : 'bg-muted mr-8'
                }`}
              >
                <p className="text-sm">{message.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input Area */}
      <AIAssistantInput
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
