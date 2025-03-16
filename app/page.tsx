'use client';

import { useState } from 'react';

export default function Home() {
  const [message, setMessage] = useState('');
  const [responses, setResponses] = useState<Array<{type: 'user' | 'agent', content: string}>>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!message.trim()) return;

    setLoading(true);
    setResponses(prev => [...prev, { type: 'user', content: message }]);

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          agentId: 'default-agent', // You can make this dynamic
          toolCalls: [
            {
              type: "function",
              function: {
                name: "get_current_weather",
                description: "Get the current weather",
                parameters: {
                  type: "object",
                  properties: {
                    location: {
                      type: "string",
                      description: "The location to get weather for"
                    }
                  },
                  required: ["location"]
                }
              }
            }
          ]
        })
      });

      const data = await response.json();
      setResponses(prev => [...prev, { type: 'agent', content: data.response }]);
    } catch (error) {
      console.error('Error:', error);
      setResponses(prev => [...prev, { type: 'agent', content: 'Sorry, there was an error processing your request.' }]);
    }

    setLoading(false);
    setMessage('');
  };

  return (
    <main className="min-h-screen p-8 max-w-2xl mx-auto">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold mb-8">Chat with AI Agent</h1>
        
        <div className="border rounded-lg p-4 min-h-[400px] mb-4 space-y-4">
          {responses.map((response, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg ${
                response.type === 'user' ? 'bg-blue-100 ml-auto' : 'bg-gray-100'
              } max-w-[80%] ${response.type === 'user' ? 'ml-auto' : ''}`}
            >
              {response.content}
            </div>
          ))}
          {loading && <div className="text-gray-500">Loading...</div>}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your message..."
            className="flex-1 p-2 border rounded"
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            Send
          </button>
        </div>
      </div>
    </main>
  );
} 