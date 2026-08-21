'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { MessageCircle, StickyNote, X } from 'lucide-react'

interface AnnotationPopupProps {
  selectedText: string
  position: { x: number; y: number }
  onSave: (type: 'note' | 'question', body: string) => void
  onClose: () => void
}

export function AnnotationPopup({ selectedText, position, onSave, onClose }: AnnotationPopupProps) {
  const [body, setBody] = useState('')
  const [type, setType] = useState<'note' | 'question'>('question')

  const handleSave = () => {
    if (!body.trim()) return
    onSave(type, body.trim())
    setBody('')
  }

  // 回车保存（非 Shift、非输入法组合状态时），Shift+Enter 保持换行
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleSave()
    }
  }

  // 根据视口高度判断弹窗应在选中文字上方还是下方弹出
  const estimateHeight = 300
  const isNearBottom =
    typeof window !== 'undefined' &&
    position.y + 10 + estimateHeight > window.innerHeight

  // 弹窗宽度（w-80 = 20rem = 320px），用于水平定位 clamp
  const POPUP_WIDTH = 320
  const HORIZONTAL_MARGIN = 8

  // 弹窗通过 translateX(-50%) 相对选中位置居中。选中文字靠左/靠右时，
  // 居中会让弹窗溢出视口被遮挡。这里把弹窗左边缘 clamp 到视口内，
  // 再反推一个"视觉居中等效"的 left 值，保证居中布局不变且不溢出。
  const effectiveLeft = (() => {
    if (typeof window === 'undefined') return position.x
    const desiredLeftEdge = position.x - POPUP_WIDTH / 2
    const minLeft = HORIZONTAL_MARGIN
    const maxLeft = Math.max(minLeft, window.innerWidth - POPUP_WIDTH - HORIZONTAL_MARGIN)
    const clampedLeftEdge = Math.min(Math.max(desiredLeftEdge, minLeft), maxLeft)
    return clampedLeftEdge + POPUP_WIDTH / 2
  })()

  return (
    <div
      className="absolute z-50 w-80 max-h-[70vh] overflow-y-auto rounded-lg border bg-background p-3 shadow-lg"
      style={{
        left: `${effectiveLeft}px`,
        top: isNearBottom ? `${position.y - 10}px` : `${position.y + 10}px`,
        transform: isNearBottom ? 'translate(-50%, -100%)' : 'translateX(-50%)',
      }}
    >
      {/* 选中的文字 */}
      <div className="mb-3 rounded bg-muted p-2 text-sm text-muted-foreground">
        &ldquo;{selectedText}&rdquo;
      </div>

      {/* 类型选择 */}
      <div className="mb-3 flex gap-2">
        <Button
          variant={type === 'question' ? 'default' : 'outline'}
          size="sm"
          className="flex-1"
          onClick={() => setType('question')}
        >
          <MessageCircle className="mr-1 h-3 w-3" />
          问题
        </Button>
        <Button
          variant={type === 'note' ? 'default' : 'outline'}
          size="sm"
          className="flex-1"
          onClick={() => setType('note')}
        >
          <StickyNote className="mr-1 h-3 w-3" />
          笔记
        </Button>
      </div>

      {/* 输入框 */}
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={type === 'question' ? '你想问什么？' : '记下你的想法...'}
        className="min-h-[80px] resize-none text-sm"
        autoFocus
      />

      {/* 按钮 */}
      <div className="mt-2 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
        <Button size="sm" onClick={handleSave} disabled={!body.trim()}>
          保存
        </Button>
      </div>
    </div>
  )
}
