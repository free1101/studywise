'use client'

import { cn } from '@/lib/utils'
import type { ChatMessage as ChatMessageType } from '@/lib/schema'

interface ChatMessageProps {
  message: ChatMessageType
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-3 py-2 text-sm',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        )}
      >
        <div className="whitespace-pre-wrap break-words">{message.content}</div>
        <div className={cn(
          'mt-1 text-xs opacity-60',
          isUser ? 'text-right' : 'text-left'
        )}>
          {message.createdAt.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  )
}
