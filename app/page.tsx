'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { ResizablePanel } from '@/components/layout/ResizablePanel'
import { StatusBar } from '@/components/layout/StatusBar'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { ContentViewer } from '@/components/content/ContentViewer'
import { AnnotationDetail } from '@/components/annotation/AnnotationDetail'
import type { AnnotationDetailHandle } from '@/components/annotation/AnnotationDetail'
import { SummaryPanel } from '@/components/summary/SummaryPanel'
import { ExportDialog } from '@/components/export/ExportDialog'
import { useAnnotations } from '@/hooks/useAnnotations'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import type { AIProvider } from '@/lib/ai/providers'
import type { Annotation } from '@/lib/schema'

// localStorage 持久化键
const SESSION_ID_KEY = 'studywise-session-id'
const CONTENT_HTML_KEY = 'studywise-content-html'
const CONTENT_ID_KEY = 'studywise-content-id'
const AI_PROVIDER_KEY = 'studywise-ai-provider'

function readLocalStorage(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeLocalStorage(key: string, value: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // 忽略存储失败（隐私模式等）
  }
}

function initSessionId(): string {
  const stored = readLocalStorage(SESSION_ID_KEY)
  if (stored) return stored
  const id = uuidv4()
  writeLocalStorage(SESSION_ID_KEY, id)
  return id
}

function initAiProvider(): AIProvider {
  const stored = readLocalStorage(AI_PROVIDER_KEY)
  if (stored === 'openai' || stored === 'volcengine' || stored === 'claude') return stored
  return 'volcengine'
}

export default function Home() {
  const [aiProvider, setAiProvider] = useState<AIProvider>(initAiProvider)
  // SSR 与客户端首帧必须一致：初始值固定，localStorage 恢复放到 mount 后 useEffect 中，
  // 避免 hydration 时因 localStorage 有值而渲染不同 DOM 导致 Hydration mismatch。
  const [phase, setPhase] = useState<'discussing' | 'learning' | 'summarizing'>('discussing')
  const [contentHtml, setContentHtml] = useState<string>('')
  const [contentId, setContentId] = useState<string | null>(null)
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null)
  const [sessionId] = useState(initSessionId)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true)
  const [summaryData, setSummaryData] = useState<{
    summary: string
    reviewQuestions: Array<{ question: string; answer: string }>
  } | null>(null)

  // 打开导出弹窗时拉取最新的总结数据（用于导出 summary + 复习题）
  useEffect(() => {
    if (!showExportDialog || !sessionId) return
    let cancelled = false
    const loadSummaryForExport = async () => {
      try {
        const response = await fetch(`/api/summaries?sessionId=${sessionId}`)
        if (response.ok) {
          const data = await response.json()
          if (data && !cancelled) {
            setSummaryData(data)
          }
        }
      } catch {
        // 静默忽略拉取失败
      }
    }
    loadSummaryForExport()
    return () => {
      cancelled = true
    }
  }, [showExportDialog, sessionId])

  // 持久化 sessionId / contentHtml / aiProvider，刷新后恢复
  useEffect(() => {
    writeLocalStorage(SESSION_ID_KEY, sessionId)
  }, [sessionId])

  useEffect(() => {
    writeLocalStorage(CONTENT_HTML_KEY, contentHtml)
  }, [contentHtml])

  useEffect(() => {
    if (contentId) writeLocalStorage(CONTENT_ID_KEY, contentId)
  }, [contentId])

  useEffect(() => {
    writeLocalStorage(AI_PROVIDER_KEY, aiProvider)
  }, [aiProvider])

  // mount 后恢复 localStorage 中的 contentHtml / contentId / phase（仅执行一次）
  useEffect(() => {
    const storedHtml = readLocalStorage(CONTENT_HTML_KEY)
    if (storedHtml) {
      const storedContentId = readLocalStorage(CONTENT_ID_KEY)
      // 从外部系统(localStorage)恢复状态的合理性见上方第 60-61 行注释：
      // 为保证 SSR 与客户端首帧一致，localStorage 读取刻意放在 mount 后的 effect 中，
      // 避免 hydration 不一致，因此此处同步 setState 是有意的。
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (storedContentId) setContentId(storedContentId)
      setContentHtml(storedHtml)
      setPhase('learning')
    } else {
      // 无内容时清空可能残留的 contentId，避免批注落在错误内容上
      setContentId(null)
    }
  }, [])

  const {
    annotations,
    createAnnotation,
    updateAnnotationReply,
    deleteAnnotation,
  } = useAnnotations({ contentId })

  const handleContentGenerated = useCallback((html: string) => {
    // 预生成 contentId，立即设置以消除竞态窗口
    const tempId = uuidv4()

    // 同步更新 UI，让内容和 contentId 立即就绪
    setContentId(tempId)
    writeLocalStorage(CONTENT_ID_KEY, tempId)
    setContentHtml(html)
    setPhase('learning')
    setLeftSidebarOpen(false)

    // 后台保存到数据库
    fetch('/api/contents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: tempId, html, sessionId }),
    })
      .then(response => {
        if (!response.ok) throw new Error('Failed to save')
      })
      .catch(error => {
        console.error('Save content error:', error)
      })
  }, [sessionId])

  const handleAnnotationCreate = useCallback(async (annotation: {
    quote: string
    quoteOffset: number
    quoteLength: number
    type: 'note' | 'question'
    body: string
  }) => {
    const newAnnotation = await createAnnotation(annotation)
    if (newAnnotation) {
      setSelectedAnnotation(newAnnotation)
    }
  }, [createAnnotation])

  const handleExport = useCallback(() => {
    setShowExportDialog(true)
  }, [])

  const handleSummarize = useCallback(() => {
    setPhase('summarizing')
  }, [])

  const handleBackToLearning = useCallback(() => {
    setPhase('learning')
  }, [])

  // ---- Q8: 中间讲解页与右侧批注详情双向滚动同步 ----
  const middleRef = useRef<HTMLDivElement>(null)
  const annotationDetailRef = useRef<AnnotationDetailHandle>(null)

  // 防循环：程序化滚动（scrollIntoView / scrollBy）进行中标志。
  // 程序滚动期间对侧联动一律忽略，滚动结束（scrollend）或超时兜底后复位。
  // 与滚动时长彻底解耦，避免"居中滚动目标"与"视口顶线判定"不一致导致的抖动循环。
  const middleProgramScrollRef = useRef(false) // 中间容器正在程序滚动
  const rightProgramScrollRef = useRef(false) // 右侧列表正在程序滚动
  const middleScrollResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rightScrollResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 记录"点击中间 mark → 选中批注"后待定位的右侧批注 id。选中态变化会触发
  // 讲解页/批注列表重渲染（高亮重应用、选中样式），必须等 DOM 落定后（rAF）再滚动右侧，
  // 否则在旧 DOM 上计算 delta 会偏移，且重渲染瞬间的伪 scroll 事件会打断定位。
  const pendingRightScrollRafRef = useRef<number | null>(null)

  // 复位"中间程序滚动"标志：scrollend 触发 + 超时兜底（scrollend 可能不触发/不可用）
  const resetMiddleProgramScroll = useCallback(() => {
    middleProgramScrollRef.current = false
    if (middleScrollResetTimerRef.current) {
      clearTimeout(middleScrollResetTimerRef.current)
      middleScrollResetTimerRef.current = null
    }
  }, [])

  // 复位"右侧程序滚动"标志：scrollend 触发 + 超时兜底
  const resetRightProgramScroll = useCallback(() => {
    rightProgramScrollRef.current = false
    if (rightScrollResetTimerRef.current) {
      clearTimeout(rightScrollResetTimerRef.current)
      rightScrollResetTimerRef.current = null
    }
  }, [])

  // 程序滚动中间到指定 mark：置标志 → scrollIntoView → scrollend/超时复位
  const scrollMiddleToAnnotation = useCallback((id: string) => {
    const middleEl = middleRef.current
    if (!middleEl) return
    const mark = middleEl.querySelector<HTMLElement>(`mark[data-annotation-id="${id}"]`)
    if (!mark) return
    middleProgramScrollRef.current = true
    mark.scrollIntoView({ behavior: 'smooth', block: 'center' })
    if (middleScrollResetTimerRef.current) clearTimeout(middleScrollResetTimerRef.current)
    middleScrollResetTimerRef.current = setTimeout(resetMiddleProgramScroll, 300)
  }, [resetMiddleProgramScroll])

  // 程序滚动右侧列表到指定批注项：置标志 → scrollToAnnotation → scrollend/超时复位
  const scrollRightToAnnotation = useCallback((id: string) => {
    rightProgramScrollRef.current = true
    annotationDetailRef.current?.scrollToAnnotation(id)
    if (rightScrollResetTimerRef.current) clearTimeout(rightScrollResetTimerRef.current)
    rightScrollResetTimerRef.current = setTimeout(resetRightProgramScroll, 300)
  }, [resetRightProgramScroll])

  // 点击中间 mark 时，将右侧定位推迟到选中态重渲染落定后再执行。
  // 原因：setSelectedAnnotation 会触发讲解页高亮重应用与批注列表选中样式更新，
  // 若在重渲染前同步调用 scrollToAnnotation，会在旧 DOM 上计算偏移量导致定位不准，
  // 且重渲染瞬间可能产生伪 scroll 事件打断/覆盖定位。
  const scheduleRightScrollAfterRender = useCallback((id: string) => {
    if (pendingRightScrollRafRef.current != null) {
      cancelAnimationFrame(pendingRightScrollRafRef.current)
    }
    pendingRightScrollRafRef.current = requestAnimationFrame(() => {
      pendingRightScrollRafRef.current = null
      scrollRightToAnnotation(id)
    })
  }, [scrollRightToAnnotation])

  // 中间容器 scrollend → 复位"中间程序滚动"标志，恢复用户手动滚动联动
  useEffect(() => {
    const middleEl = middleRef.current
    if (!middleEl) return
    middleEl.addEventListener('scrollend', resetMiddleProgramScroll)
    return () => middleEl.removeEventListener('scrollend', resetMiddleProgramScroll)
  }, [resetMiddleProgramScroll])

  // 右侧列表 scrollend → 复位"右侧程序滚动"标志（由 AnnotationDetail 上报）
  const handleRightScrollEnd = useCallback(() => {
    resetRightProgramScroll()
  }, [resetRightProgramScroll])

  // 中间内容滚动 → 程序滚动中续期标志；否则找到当前视口内命中的批注联动右侧
  const handleMiddleScroll = useCallback(() => {
    if (middleProgramScrollRef.current) {
      // 程序滚动仍在进行：续期复位定时器。长距离平滑滚动可能超过固定超时，
      // 若标志提前复位，回显会被当成用户滚动触发反向联动，覆盖右侧定位。
      if (middleScrollResetTimerRef.current) clearTimeout(middleScrollResetTimerRef.current)
      middleScrollResetTimerRef.current = setTimeout(resetMiddleProgramScroll, 300)
      return
    }
    const middleEl = middleRef.current
    if (!middleEl) return
    const marks = Array.from(middleEl.querySelectorAll<HTMLElement>('mark[data-annotation-id]'))
    if (marks.length === 0) return
    // 命中"当前视口内第一个可见批注"：比"视口顶线 +60px"更贴合用户实际阅读位置，
    // 且与 scrollToAnnotation 的居中目标一致，避免回显误判造成抖动。
    const cRect = middleEl.getBoundingClientRect()
    const cTop = cRect.top
    const cBottom = cTop + middleEl.clientHeight
    let activeId: string | null = null
    for (const mark of marks) {
      const rect = mark.getBoundingClientRect()
      if (rect.bottom <= cTop) continue // 已完全滚过视口顶部
      if (rect.top >= cBottom) break // 尚未进入视口
      activeId = mark.dataset.annotationId ?? null
      break
    }
    if (!activeId) activeId = marks[0].dataset.annotationId ?? null
    if (!activeId) return
    scrollRightToAnnotation(activeId)
  }, [resetMiddleProgramScroll, scrollRightToAnnotation])

  // 右侧滚动上报当前可见批注 → 程序滚动中续期标志；否则反向联动中间内容
  const handleVisibleAnnotationChange = useCallback((id: string | null) => {
    if (rightProgramScrollRef.current) {
      // 程序滚动仍在进行：续期复位定时器，避免长距离平滑滚动提前复位标志
      if (rightScrollResetTimerRef.current) clearTimeout(rightScrollResetTimerRef.current)
      rightScrollResetTimerRef.current = setTimeout(resetRightProgramScroll, 300)
      return
    }
    if (!id) return
    scrollMiddleToAnnotation(id)
  }, [resetRightProgramScroll, scrollMiddleToAnnotation])

  // 选择右侧批注项（含点击中间 mark）：更新选中态 + 中间定位 + 右侧定位
  const handleSelectAnnotation = useCallback((annotation: Annotation) => {
    setSelectedAnnotation(annotation)
    // 中间定位（mark 存在才置程序滚动标志，避免无 mark 时误抑制后续手动滚动）
    const middleEl = middleRef.current
    const mark = middleEl?.querySelector<HTMLElement>(
      `mark[data-annotation-id="${annotation.id}"]`,
    )
    if (mark) {
      middleProgramScrollRef.current = true
      mark.scrollIntoView({ behavior: 'smooth', block: 'center' })
      if (middleScrollResetTimerRef.current) clearTimeout(middleScrollResetTimerRef.current)
      middleScrollResetTimerRef.current = setTimeout(resetMiddleProgramScroll, 300)
    }
    // 右侧定位
    scrollRightToAnnotation(annotation.id)
  }, [resetMiddleProgramScroll, scrollRightToAnnotation])

  // 点击中间内容高亮 mark → 选中对应批注并联动右侧定位。
  // 注意：点击的 mark 已在当前视口内（否则用户点不到），无需再滚动中间，
  // 避免 scrollIntoView 产生的 scroll 事件流干扰右侧定位。
  const handleSelectMark = useCallback((id: string) => {
    const annotation = annotations.find(a => a.id === id)
    if (annotation) {
      // 选中态变化会触发讲解页/批注列表重渲染，重渲染瞬间的 DOM 变更可能产生伪 scroll 事件，
      // 被反向联动误判为用户滚动，重入 scrollRightToAnnotation 覆盖右侧定位。
      // 故在重渲染窗口（约 300ms）内临时抑制双向联动，待选中态落定后再精确滚动右侧到目标。
      middleProgramScrollRef.current = true
      rightProgramScrollRef.current = true
      if (middleScrollResetTimerRef.current) clearTimeout(middleScrollResetTimerRef.current)
      middleScrollResetTimerRef.current = setTimeout(resetMiddleProgramScroll, 300)
      if (rightScrollResetTimerRef.current) clearTimeout(rightScrollResetTimerRef.current)
      rightScrollResetTimerRef.current = setTimeout(resetRightProgramScroll, 300)
      setSelectedAnnotation(annotation)
      scheduleRightScrollAfterRender(annotation.id)
    } else {
      // 未命中批注记录时，仅滚动定位中间 mark，不改变选中态
      scrollMiddleToAnnotation(id)
    }
  }, [
    annotations,
    resetMiddleProgramScroll,
    resetRightProgramScroll,
    scrollMiddleToAnnotation,
    scheduleRightScrollAfterRender,
  ])

  // 卸载时清理程序滚动复位定时器与待执行定位的 rAF
  useEffect(() => {
    return () => {
      if (middleScrollResetTimerRef.current) clearTimeout(middleScrollResetTimerRef.current)
      if (rightScrollResetTimerRef.current) clearTimeout(rightScrollResetTimerRef.current)
      if (pendingRightScrollRafRef.current != null) {
        cancelAnimationFrame(pendingRightScrollRafRef.current)
      }
    }
  }, [])

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧：AI Chat - 可拖拽调整宽度，折叠时收缩为窄条 */}
        <ResizablePanel
          defaultWidth={360}
          minWidth={48}
          maxWidth={500}
          collapsed={!leftSidebarOpen}
          collapsedWidth={48}
        >
          <Sidebar
            title="AI 助手"
            defaultOpen={true}
            isOpen={leftSidebarOpen}
            onOpenChange={setLeftSidebarOpen}
          >
            <ChatPanel
              onContentGenerated={handleContentGenerated}
              provider={aiProvider}
            />
          </Sidebar>
        </ResizablePanel>

        {/* 中间：学习内容 / 总结 */}
        <div
          ref={middleRef}
          onScroll={handleMiddleScroll}
          className="flex-1 overflow-auto bg-background min-w-0"
        >
          <div className="px-8 py-6">
            {phase === 'summarizing' ? (
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToLearning}
                  className="mb-4"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  返回学习
                </Button>
                <SummaryPanel
                  annotations={annotations}
                  sessionId={sessionId}
                  contentHtml={contentHtml}
                  provider={aiProvider}
                />
              </div>
            ) : contentHtml ? (
              <ContentViewer
                html={contentHtml}
                annotations={annotations}
                selectedAnnotationId={selectedAnnotation?.id ?? null}
                onAnnotationCreate={handleAnnotationCreate}
                onSelectMark={handleSelectMark}
              />
            ) : (
              <div className="text-center text-muted-foreground py-20">
                <h1 className="mb-4 text-3xl font-bold">StudyWise</h1>
                <p className="mb-2 text-lg">AI 驱动的学习批注助手</p>
                <p className="text-sm max-w-md mx-auto">
                  在左侧与 AI 对话，确定学习主题后生成内容。
                  <br />
                  然后选中文字添加笔记或问题，AI 会即时回复。
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：批注详情 - 可拖拽调整宽度，分隔线在左边缘 */}
        <ResizablePanel defaultWidth={320} minWidth={240} maxWidth={480} handleSide="left">
          <Sidebar title="批注详情" defaultOpen={true}>
            <AnnotationDetail
              ref={annotationDetailRef}
              annotations={annotations}
              selectedAnnotation={selectedAnnotation}
              contentHtml={contentHtml}
              provider={aiProvider}
              onSelectAnnotation={handleSelectAnnotation}
              onDeleteAnnotation={deleteAnnotation}
              onUpdateReply={updateAnnotationReply}
              onVisibleAnnotationChange={handleVisibleAnnotationChange}
              onScrollEnd={handleRightScrollEnd}
            />
          </Sidebar>
        </ResizablePanel>
      </div>

      <StatusBar
        phase={phase}
        aiProvider={aiProvider}
        onProviderChange={setAiProvider}
        onExport={handleExport}
        onSummarize={handleSummarize}
      />

      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        contentHtml={contentHtml}
        annotations={annotations.map(a => ({
          quote: a.quote || '',
          body: a.body || '',
          type: a.type || 'note',
          aiReply: a.aiReply,
        }))}
        summary={summaryData?.summary ?? null}
        reviewQuestions={summaryData?.reviewQuestions ?? []}
      />
    </div>
  )
}
