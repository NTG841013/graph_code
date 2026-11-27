'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ExplanationRenderer } from './explanation-renderer';

interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: unknown;
  status: 'running' | 'done';
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolCalls: ToolCall[];
  status?: 'thinking' | 'done' | 'error';
}

interface AskPanelProps {
  analysisId: string;
  selectedFile?: string;
  selectedFolder?: string;
  onFileSelect: (path: string) => void;
}

export function AskPanel({ analysisId, selectedFile, selectedFolder, onFileSelect }: AskPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/agent/chat?analysisId=${analysisId}`);
        if (response.ok) {
          const data = await response.json();
          setMessages(data);
        }
      } catch (e) {
        console.error("Failed to fetch chat history:", e);
      }
    };
    fetchMessages();
  }, [analysisId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      toolCalls: [],
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    // Prepare assistant message
    const assistantMessage: Message = {
      role: 'assistant',
      content: '',
      toolCalls: [],
      status: 'thinking',
    };
    setMessages([...newMessages, assistantMessage]);

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId,
          messages: newMessages.map(m => ({
            role: m.role,
            content: m.role === 'user' && m === userMessage 
              ? `[Context: selected ${selectedFile ? `file ${selectedFile}` : selectedFolder ? `folder ${selectedFolder}` : 'nothing'}]\n\n${m.content}`
              : m.content
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // SSE events are separated by double newlines
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const eventBlock of events) {
          const lines = eventBlock.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            
            try {
              const data = JSON.parse(trimmed.substring(6));
              handleAgentEvent(data);
            } catch (e) {
              console.error("Failed to parse SSE data:", trimmed, e);
            }
          }
        }
      }
      
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'assistant') {
          return [...prev.slice(0, -1), { ...last, status: 'done' }];
        }
        return prev;
      });

    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'assistant') {
          return [...prev.slice(0, -1), { ...last, status: 'error', content: `Error: ${errorMsg}` }];
        }
        return prev;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAgentEvent = (event: { 
    event: string; 
    run_id?: string; 
    name?: string; 
    data?: { 
      chunk?: any; 
      input?: Record<string, unknown>; 
      output?: any; 
    } 
  }) => {
    const extractText = (content: any): string => {
      // Handle serialized LangChain objects where content is in kwargs
      const actualContent = content?.kwargs?.content !== undefined ? content.kwargs.content : content;
      
      if (typeof actualContent === 'string') return actualContent;
      if (Array.isArray(actualContent)) {
        return actualContent.map(block => {
          if (typeof block === 'string') return block;
          if (block && typeof block === 'object' && 'text' in block && typeof block.text === 'string') {
            return block.text;
          }
          return '';
        }).join('');
      }
      return '';
    };

    setMessages(prev => {
      const last = prev[prev.length - 1];
      if (!last || last.role !== 'assistant') return prev;

      const newToolCalls = [...last.toolCalls];
      let newContent = last.content;
      let newStatus = last.status;

      if (event.event === 'on_chat_model_stream') {
        const chunk = event.data?.chunk;
        newContent += extractText(chunk);
      } else if (event.event === 'on_chat_model_end') {
        // Fallback for non-streaming model calls or to ensure we have the full content
        const output = event.data?.output;
        const text = extractText(output);
        if (text && !newContent.includes(text)) {
          if (newContent.length < text.length) {
            newContent = text;
          }
        }
      } else if (event.event === 'error') {
        const errorMsg = typeof event.data === 'string' ? event.data : (event.data as any)?.error || 'Unknown agent error';
        newStatus = 'error';
        newContent = `Error: ${errorMsg}`;
      } else if (event.event === 'on_tool_start') {
        // Avoid duplicate tool call entries for the same run
        if (event.run_id && newToolCalls.some(tc => tc.id === event.run_id)) {
          return prev;
        }

        newToolCalls.push({
          id: event.run_id || Math.random().toString(),
          name: event.name || 'tool',
          input: event.data?.input || {},
          status: 'running',
        });
      } else if (event.event === 'on_tool_end') {
        const idx = newToolCalls.findIndex(tc => tc.id === event.run_id);
        if (idx !== -1) {
          newToolCalls[idx] = { ...newToolCalls[idx], output: event.data?.output, status: 'done' };
        }
      }

      return [...prev.slice(0, -1), { ...last, content: newContent, toolCalls: newToolCalls, status: newStatus }];
    });
  };

  return (
    <div className="flex flex-col h-full bg-background font-mono">
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <div className="max-w-[300px] w-full space-y-8">
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
                  Assistant
                </p>
                <h3 className="text-[13px] font-medium leading-relaxed text-foreground px-4">
                  Ask anything about the repository architecture and dependencies.
                </h3>
              </div>
              
              <div className="space-y-3">
                <p className="text-[9px] font-bold text-muted/40 uppercase tracking-[0.2em]">Suggested</p>
                <div className="space-y-2">
                  {[
                    "Where is authentication handled?",
                    "What are the main entry points?",
                    "List all routes in the app folder"
                  ].map((query, i) => (
                    <div key={i} className="px-3 py-2.5 rounded border border-border/50 bg-surface/30 text-[10px] text-muted uppercase tracking-wider">
                      &quot;{query}&quot;
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} className={`space-y-3 ${msg.role === 'user' ? 'opacity-80' : ''}`}>
            <div className="flex items-center gap-2">
              <span className={`text-[9px] font-bold uppercase tracking-widest ${msg.role === 'user' ? 'text-muted' : 'text-accent'}`}>
                {msg.role === 'user' ? 'You' : 'Agent'}
              </span>
            </div>
            
            {msg.toolCalls.length > 0 && (
              <div className="space-y-1">
                {msg.toolCalls.map(tc => (
                  <div key={tc.id} className="text-[10px] bg-surface border border-border px-2 py-1.5 rounded-sm flex items-center justify-between group">
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-muted/60 uppercase text-[8px] font-bold">Tool</span>
                      <span className="font-bold text-foreground/80">{tc.name}</span>
                      <span className="text-muted/60 truncate">
                        {tc.name === 'search_files' ? `Searching "${tc.input.query}"` :
                         tc.name === 'get_neighbors' ? `Edges for ${tc.input.file_path}` :
                         tc.name === 'list_by_role' ? `Listing ${tc.input.role}s` :
                         tc.name === 'transitive_walk' ? `${tc.input.direction === 'up' ? 'Dependents' : 'Dependencies'} of ${tc.input.file_path}` :
                         JSON.stringify(tc.input)}
                      </span>
                    </div>
                    {tc.status === 'running' ? (
                      <span className="w-2 h-2 bg-accent rounded-full animate-pulse shrink-0" />
                    ) : (
                      <span className="text-green-500/60 text-[8px]">✓</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {msg.content && (
              <ExplanationRenderer text={msg.content} onPathClick={onFileSelect} />
            )}

            {msg.status === 'thinking' && !msg.content && (
              <div className="flex items-center gap-2 text-[10px] text-muted italic">
                <span className="w-3 h-3 border border-t-accent rounded-full animate-spin" />
                Thinking...
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-border bg-surface/30">
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type a question..."
            disabled={loading}
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-[11px] focus:outline-none focus:border-accent resize-none min-h-[60px] custom-scrollbar disabled:opacity-50"
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as unknown as React.FormEvent);
              }
            }}
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-2">
            <span className="text-[8px] text-muted/40 uppercase tracking-tighter">Enter to send</span>
            <button 
              type="submit" 
              disabled={loading || !input.trim()}
              className="bg-accent text-white px-2 py-1 rounded-sm text-[10px] font-bold hover:opacity-90 disabled:opacity-30 disabled:grayscale transition-all"
            >
              ASK
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
