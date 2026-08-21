'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AnnotationItem } from './AnnotationItem'
import type { Annotation } from '@/lib/schema'
import type { AIProvider } from '@/lib/ai/providers'

export interface AnnotationDetailHandle {
  scrollToAnnotation: (id: string) => void
}

interface AnnotationDetailProps {
  annotations: Annotation[]
  selectedAnnotation: Annotation | null
  contentHtml?: string
  provider?: AIProvider
  onSelectAnnotation: (annotation: Annotation) => void
  onDeleteAnnotation: (id: string) => void
  onUpdateReply: (id: string, aiReply: string) => void
  /** 右侧列表滚动时上报当前视口内命中的批注 id，供 page.tsx 反向联动中间内容 */
  onVisibleAnnotationChange?: (id: string | null) => void
  /** 右侧列表滚动结束后触发（scrollend），供 page.tsx 复位程序滚动标志 */
  onScrollEnd?: () => void
}

export const AnnotationDetail = forwardRef<AnnotationDetailHandle, AnnotationDetailProps>(
  function AnnotationDetail(
    {
      annotations,
      selectedAnnotation,
      contentHtml,
      provider,
      onSelectAnnotation,
      onDeleteAnnotation,
      onUpdateReply,
      onVisibleAnnotationChange,
      onScrollEnd,
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null)
    const visibleCallbackRef = useRef(onVisibleAnnotationChange)
    visibleCallbackRef.current = onVisibleAnnotationChange
    const scrollEndCallbackRef = useRef(onScrollEnd)
    scrollEndCallbackRef.current = onScrollEnd
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // 计算当前滚动视口顶部命中的批注项（用于反向联动），尾部防抖 120ms 节流
    const reportVisible = useCallback(() => {
      const container = containerRef.current
      if (!container) return
      const viewport = container.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]')
      if (!viewport) return
      const items = Array.from(
        container.querySelectorAll<HTMLElement>('[data-annotation-list-item-id]'),
      )
      if (items.length === 0) {
        visibleCallbackRef.current?.(null)
        return
      }
      const vpRect = viewport.getBoundingClientRect()
      const vpBottom = vpRect.top + viewport.clientHeight
      let active: string | null = null
      // 命中"视口内第一个可见批注项"，与 scrollToAnnotation 居中滚动目标一致，
      // 避免顶线判定与居中目标不一致造成反向联动抖动。
      for (const item of items) {
        const rect = item.getBoundingClientRect()
        if (rect.bottom <= vpRect.top) continue // 已完全滚过视口顶部
        if (rect.top >= vpBottom) break // 尚未进入视口
        active = item.dataset.annotationListItemId ?? null
        break
      }
      if (!active) active = items[0].dataset.annotationListItemId ?? null
      visibleCallbackRef.current?.(active)
    }, [])

    // 暴露给 page.tsx：滚动到指定批注项（中间内容联动右侧）
    useImperativeHandle(
      ref,
      () => ({
        scrollToAnnotation(id: string) {
          const container = containerRef.current
          if (!container) return
          const viewport = container.querySelector<HTMLElement>(
            '[data-slot="scroll-area-viewport"]',
          )
          const target = container.querySelector<HTMLElement>(
            `[data-annotation-list-item-id="${id}"]`,
          )
          if (!viewport || !target) return
          const vpRect = viewport.getBoundingClientRect()
          const targetRect = target.getBoundingClientRect()
          const delta =
            targetRect.top - vpRect.top - vpRect.height / 2 + targetRect.height / 2
          viewport.scrollBy({ top: delta, behavior: 'smooth' })
        },
      }),
      [],
    )

    // 监听右侧列表滚动：尾部防抖上报当前可见批注 id（反向联动中间），并监听 scrollend 复位程序滚动标志
    useEffect(() => {
      const container = containerRef.current
      const viewport = container?.querySelector<HTMLElement>(
        '[data-slot="scroll-area-viewport"]',
      )
      if (!viewport) return

      const scheduleReport = () => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = setTimeout(() => {
          reportVisible()
        }, 120)
      }
      const handleScrollEnd = () => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
        // 保证最后一次上报不被吞掉（scrollend 前若仍有未触发的防抖回调，立即触发一次）
        reportVisible()
        scrollEndCallbackRef.current?.()
      }

      viewport.addEventListener('scroll', scheduleReport, { passive: true })
      viewport.addEventListener('scrollend', handleScrollEnd, { passive: true })
      return () => {
        viewport.removeEventListener('scroll', scheduleReport)
        viewport.removeEventListener('scrollend', handleScrollEnd)
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      }
      // 注意：不在 mount 时主动 reportVisible，反向联动完全由右侧滚动事件驱动。
      // 否则 annotations.length 变化（如提交新批注）会导致 effect 重跑并立即上报，
      // 触发 page.tsx 反向 scrollIntoView，造成"提交批注后讲解页非预期滚动"。
    }, [reportVisible])

    return (
      <div ref={containerRef} className="flex h-full flex-col">
        <ScrollArea className="flex-1">
          <div className="space-y-3 p-3">
            {annotations.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <p>选中文字添加笔记或问题</p>
                <p className="mt-1">AI 会自动回复你的批注</p>
              </div>
            ) : (
              annotations.map(annotation => (
                <div key={annotation.id} data-annotation-list-item-id={annotation.id}>
                  <AnnotationItem
                    annotation={annotation}
                    isSelected={selectedAnnotation?.id === annotation.id}
                    contentHtml={contentHtml}
                    provider={provider}
                    onClick={() => onSelectAnnotation(annotation)}
                    onDelete={() => onDeleteAnnotation(annotation.id)}
                    onUpdateReply={(reply) => onUpdateReply(annotation.id, reply)}
                  />
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    )
  },
)
