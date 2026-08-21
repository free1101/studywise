'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, Download, FileText, CheckCircle } from 'lucide-react'

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contentHtml: string
  annotations: Array<{
    quote: string
    body: string
    type: string
    aiReply?: string | null
  }>
  summary?: string | null
  reviewQuestions?: Array<{ question: string; answer: string }>
}

export function ExportDialog({
  open,
  onOpenChange,
  contentHtml,
  annotations,
  summary,
  reviewQuestions = [],
}: ExportDialogProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [isDone, setIsDone] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentHtml, annotations, summary, reviewQuestions }),
      })

      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `studywise-export-${Date.now()}.html`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setIsDone(true)
      setTimeout(() => {
        setIsDone(false)
        onOpenChange(false)
      }, 1500)
    } catch (error) {
      console.error('Export error:', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            导出学习笔记
          </DialogTitle>
          <DialogDescription>
            将学习内容和批注导出为独立的 HTML 文件，可在任何浏览器中打开。
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            <p className="mb-2">
              <strong>导出内容包含：</strong>
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>学习内容</li>
              <li>{annotations.length} 条笔记/问题</li>
              <li>AI 回复</li>
              {summary ? <li>学习总结</li> : null}
              {reviewQuestions.length > 0 ? (
                <li>{reviewQuestions.length} 道复习题</li>
              ) : null}
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleExport} disabled={isExporting || isDone}>
            {isDone ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                导出成功
              </>
            ) : isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                导出中...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                导出 HTML
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
