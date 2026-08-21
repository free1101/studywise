'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'

interface ReviewQuizProps {
  questions: Array<{ question: string; answer: string }>
}

export function ReviewQuiz({ questions }: ReviewQuizProps) {
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [showAnswers, setShowAnswers] = useState<Record<number, boolean>>({})
  const [submitted, setSubmitted] = useState<Record<number, boolean>>({})

  const handleSubmit = (index: number) => {
    setSubmitted(prev => ({ ...prev, [index]: true }))
  }

  const toggleAnswer = (index: number) => {
    setShowAnswers(prev => ({ ...prev, [index]: !prev[index] }))
  }

  return (
    <Card className="p-4">
      <h3 className="mb-3 font-medium">复习题</h3>
      <div className="space-y-4">
        {questions.map((q, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="shrink-0">
                {index + 1}
              </Badge>
              <p className="text-sm font-medium">{q.question}</p>
            </div>

            {!submitted[index] ? (
              <div className="space-y-2 pl-8">
                <Textarea
                  value={answers[index] || ''}
                  onChange={(e) =>
                    setAnswers(prev => ({ ...prev, [index]: e.target.value }))
                  }
                  placeholder="写下你的答案..."
                  className="min-h-[60px] resize-none text-sm"
                />
                <Button
                  size="sm"
                  onClick={() => handleSubmit(index)}
                  disabled={!answers[index]?.trim()}
                >
                  确认答案
                </Button>
              </div>
            ) : (
              <div className="space-y-2 pl-8">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-muted-foreground">你的答案：</span>
                </div>
                <p className="text-sm pl-6">{answers[index]}</p>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleAnswer(index)}
                  className="flex items-center gap-1"
                >
                  {showAnswers[index] ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      隐藏标准答案
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      查看标准答案
                    </>
                  )}
                </Button>

                {showAnswers[index] && (
                  <div className="rounded bg-muted p-3 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span className="font-medium">标准答案</span>
                    </div>
                    <p>{q.answer}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}
