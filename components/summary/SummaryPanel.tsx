'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, BookOpen, RotateCcw } from 'lucide-react'
import { ReviewQuiz } from './ReviewQuiz'
import type { Annotation } from '@/lib/schema'
import type { AIProvider } from '@/lib/ai/providers'

interface SummaryPanelProps {
  annotations: Annotation[]
  sessionId: string
  contentHtml?: string
  provider?: AIProvider
}

interface SummaryData {
  summary: string
  reviewQuestions: Array<{ question: string; answer: string }>
}

export function SummaryPanel({ annotations, sessionId, contentHtml, provider }: SummaryPanelProps) {
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // mount 时加载已有总结
  useEffect(() => {
    const loadSummary = async () => {
      try {
        const response = await fetch(`/api/summaries?sessionId=${sessionId}`)
        if (response.ok) {
          const data = await response.json()
          if (data) {
            setSummary(data)
          }
        }
      } catch {
        // 静默忽略加载错误
      }
    }

    loadSummary()
  }, [sessionId])

  const generateSummary = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          annotations: annotations.map(a => ({
            quote: a.quote || '',
            body: a.body || '',
            type: a.type || 'note',
            aiReply: a.aiReply || '',
          })),
          sessionId,
          contentHtml: contentHtml || '',
          provider,
        }),
      })

      if (!response.ok) throw new Error('Failed to generate summary')

      const data = await response.json()
      setSummary(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [annotations, sessionId, contentHtml, provider])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          学习总结
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={generateSummary}
          disabled={isLoading || annotations.length === 0}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              生成中...
            </>
          ) : summary ? (
            <>
              <RotateCcw className="mr-2 h-4 w-4" />
              重新生成
            </>
          ) : (
            '生成总结'
          )}
        </Button>
      </div>

      {error && (
        <Card className="p-4 text-destructive">
          {error}
        </Card>
      )}

      {annotations.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 font-medium">你的笔记和提问</h3>
          <div className="space-y-3">
            {annotations.map((a, i) => (
              <div key={a.id} className="text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-2 py-0.5 rounded bg-muted">
                    {a.type === 'question' ? '问题' : '笔记'}
                  </span>
                  <span className="text-xs text-muted-foreground">#{i + 1}</span>
                </div>
                {a.quote && (
                  <p className="text-xs text-muted-foreground italic mb-1">&ldquo;{a.quote}&rdquo;</p>
                )}
                <p>{a.body}</p>
                {a.aiReply && (
                  <p className="text-xs text-muted-foreground mt-1">AI: {a.aiReply}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {summary && (
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="mb-2 font-medium">学习总结</h3>
            <div className="whitespace-pre-wrap text-sm text-muted-foreground">
              {summary.summary}
            </div>
          </Card>

          {summary.reviewQuestions.length > 0 && (
            <ReviewQuiz questions={summary.reviewQuestions} />
          )}
        </div>
      )}

      {!summary && !isLoading && annotations.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          <p>先添加一些笔记或问题，然后生成总结</p>
        </Card>
      )}
    </div>
  )
}
