'use client'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChatMessage } from './ChatMessage'
import { Send, Loader2 } from 'lucide-react'
import { useChat } from '@/hooks/useChat'
import type { AIProvider } from '@/lib/ai/providers'

interface ChatPanelProps {
  onContentGenerated?: (html: string) => void
  provider?: AIProvider
}

export function ChatPanel({ onContentGenerated, provider }: ChatPanelProps) {
  const {
    messages,
    input,
    isLoading,
    setInput,
    sendMessage,
    handleKeyDown,
    scrollRef,
  } = useChat({ onContentGenerated, provider })

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="space-y-4 p-3">
          {messages.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">
              <p className="mb-2">你好！我是你的学习助手。</p>
              <p>告诉我你想学习什么，我来帮你制定学习计划。</p>
            </div>
          )}
          {messages.map(message => (
            <ChatMessage key={message.id} message={message} />
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>思考中...</span>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t p-3">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (Enter 发送)"
            className="min-h-[60px] resize-none"
            disabled={isLoading}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-[60px] w-[60px] shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
