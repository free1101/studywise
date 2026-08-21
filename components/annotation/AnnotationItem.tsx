'use client'

import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MessageCircle, StickyNote, Trash2, Loader2, Copy, ChevronDown, ChevronUp, Send } from 'lucide-react'
import type { Annotation } from '@/lib/schema'
import type { AIProvider } from '@/lib/ai/providers'

interface AnnotationItemProps {
  annotation: Annotation
  isSelected: boolean
  contentHtml?: string
  provider?: AIProvider
  onClick: () => void
  onDelete: () => void
  onUpdateReply: (reply: string) => void
}

export function AnnotationItem({
  annotation,
  isSelected,
  contentHtml,
  provider,
  onClick,
  onDelete,
  onUpdateReply,
}: AnnotationItemProps) {
  const [isLoadingReply, setIsLoadingReply] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isReplyCollapsed, setIsReplyCollapsed] = useState(false)
  const autoReplyRef = useRef(false)

  // 追加提问（Q10）：多轮问答历史 + 输入 + 折叠态
  const [followups, setFollowups] = useState<{ question: string; answer: string }[]>([])
  const [followupInput, setFollowupInput] = useState('')
  const [isLoadingFollowup, setIsLoadingFollowup] = useState(false)
  const [isFollowupsCollapsed, setIsFollowupsCollapsed] = useState(true)
  const [followupError, setFollowupError] = useState<string | null>(null)

  const fetchAiReply = async () => {
    if (annotation.aiReply || isLoadingReply) return

    if (!annotation.body || !annotation.type || !annotation.quote) {
      setError('批注数据不完整')
      return
    }

    setIsLoadingReply(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: annotation.body,
          type: annotation.type,
          quote: annotation.quote,
          annotationId: annotation.id,
          contentHtml: contentHtml || '',
          provider,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to get AI reply')
      }

      const data = await response.json()
      onUpdateReply(data.reply)
    } catch (err) {
      console.error('AI reply error:', err)
      setError(err instanceof Error ? err.message : '获取回复失败')
    } finally {
      setIsLoadingReply(false)
    }
  }

  useEffect(() => {
    if (!autoReplyRef.current && !annotation.aiReply && annotation.body && annotation.type && annotation.quote) {
      autoReplyRef.current = true
      fetchAiReply()
    }
  }, [annotation]) // eslint-disable-line react-hooks/exhaustive-deps

  // 追加提问（Q10）：调用 AI 获取追加回答，成功后自动折叠只保留第一条回答
  const sendFollowup = async () => {
    const question = followupInput.trim()
    if (!question || isLoadingFollowup) return

    setIsLoadingFollowup(true)
    setFollowupError(null)

    try {
      // 多轮上下文：优先带最近一次追问的回答，否则带已有 aiReply；后端未接 previousReply 时仅忽略该字段
      const lastContext = followups.length > 0 ? followups[followups.length - 1].answer : annotation.aiReply

      const response = await fetch('/api/ai/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: question,
          type: annotation.type,
          quote: annotation.quote,
          annotationId: annotation.id,
          contentHtml: contentHtml || '',
          provider,
          previousReply: lastContext ?? '',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to get AI reply')
      }

      const data = await response.json()
      setFollowups((prev) => [...prev, { question, answer: data.reply ?? '' }])
      setFollowupInput('')
      // 收到回答后自动折叠，只显示第一条 AI 回答
      setIsFollowupsCollapsed(true)
    } catch (err) {
      console.error('Followup reply error:', err)
      setFollowupError(err instanceof Error ? err.message : '获取回复失败')
    } finally {
      setIsLoadingFollowup(false)
    }
  }

  const handleFollowupKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      sendFollowup()
    }
  }

  const copyQuote = () => {
    if (annotation.quote) {
      navigator.clipboard.writeText(annotation.quote)
    }
  }

  const isQuestion = annotation.type === 'question'

  return (
    <Card
      className={`cursor-pointer p-3 transition-colors hover:bg-muted/50 border-l-4 ${
        isQuestion ? 'border-l-yellow-400' : 'border-l-emerald-400'
      } ${isSelected ? 'border-primary ring-1 ring-primary bg-muted/30' : ''}`}
      onClick={onClick}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <Badge
          className={`shrink-0 gap-1 ${
            isQuestion
              ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
          }`}
        >
          {isQuestion ? (
            <MessageCircle className="h-3 w-3 text-yellow-600" />
          ) : (
            <StickyNote className="h-3 w-3 text-emerald-600" />
          )}
          {isQuestion ? '问题' : '笔记'}
        </Badge>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => { e.stopPropagation(); copyQuote() }}
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete() }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {annotation.quote && (
        <div className="mb-2 rounded bg-muted/50 p-2 text-xs text-muted-foreground">
          &ldquo;{annotation.quote}&rdquo;
        </div>
      )}

      <p className="text-sm">{annotation.body || '（无内容）'}</p>

      {error && (
        <div className="mt-2 rounded bg-destructive/10 p-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {annotation.aiReply && (
        <div className="mt-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs justify-between px-2"
            onClick={(e) => { e.stopPropagation(); setIsReplyCollapsed(!isReplyCollapsed) }}
          >
            <span className="font-medium text-primary">AI 回复</span>
            {isReplyCollapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </Button>
          {!isReplyCollapsed && (
            <div className="rounded border-l-2 border-primary/50 bg-primary/5 p-2 mt-1">
              <p className="text-sm text-muted-foreground">{annotation.aiReply}</p>

              {/* 追加提问入口（Q10） */}
              <div className="mt-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
                <Input
                  value={followupInput}
                  onChange={(e) => setFollowupInput(e.target.value)}
                  onKeyDown={handleFollowupKeyDown}
                  placeholder="继续提问..."
                  disabled={isLoadingFollowup}
                  className="h-8 flex-1 text-xs"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 shrink-0"
                  onClick={sendFollowup}
                  disabled={!followupInput.trim() || isLoadingFollowup}
                >
                  {isLoadingFollowup ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Send className="h-3 w-3" />
                  )}
                </Button>
              </div>

              {followupError && (
                <div className="mt-2 rounded bg-destructive/10 p-2 text-xs text-destructive">
                  {followupError}
                </div>
              )}

              {isLoadingFollowup && (
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>AI 正在思考...</span>
                </div>
              )}

              {/* 追加问答历史（默认折叠，可展开查看） */}
              {followups.length > 0 && (
                <div className="mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs justify-between px-2"
                    onClick={(e) => { e.stopPropagation(); setIsFollowupsCollapsed(!isFollowupsCollapsed) }}
                  >
                    <span className="text-muted-foreground">追加问答（{followups.length}）</span>
                    {isFollowupsCollapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                  </Button>
                  {!isFollowupsCollapsed && (
                    <div className="mt-1 space-y-2">
                      {followups.map((f, i) => (
                        <div key={i} className="rounded bg-background/60 p-2 text-xs">
                          <p className="font-medium text-foreground">问：{f.question}</p>
                          <p className="mt-1 text-muted-foreground">答：{f.answer}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {isLoadingReply && (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>AI 正在思考...</span>
        </div>
      )}
    </Card>
  )
}
