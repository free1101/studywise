'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { AnnotationPopup } from './AnnotationPopup'
import type { Annotation } from '@/lib/schema'

interface ContentViewerProps {
  html: string
  onAnnotationCreate: (annotation: {
    quote: string
    quoteOffset: number
    quoteLength: number
    type: 'note' | 'question'
    body: string
  }) => void
  annotations?: Annotation[]
  selectedAnnotationId?: string | null
  onSelectMark?: (id: string) => void
}

export function ContentViewer({
  html,
  onAnnotationCreate,
  annotations = [],
  selectedAnnotationId = null,
  onSelectMark,
}: ContentViewerProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [selectedText, setSelectedText] = useState<{
    text: string
    offset: number
    length: number
  } | null>(null)
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null)

  // 计算选中文本在 content 根节点中的全局偏移量
  const computeTextOffset = useCallback((
    root: HTMLElement,
    startContainer: Node,
    startOffset: number,
  ): number => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    let accumulated = 0
    let node: Node | null = walker.nextNode()

    while (node) {
      // 找到包含选中起点的文本节点
      if (node === startContainer || node.contains(startContainer)) {
        if (node === startContainer) {
          return accumulated + startOffset
        }
        // startContainer 在 node 内部更深层：继续遍历直到精确到达
        const innerWalker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT)
        let inner: Node | null = innerWalker.nextNode()
        while (inner) {
          if (inner === startContainer) {
            return accumulated + startOffset
          }
          accumulated += (inner.textContent || '').length
          inner = innerWalker.nextNode()
        }
        return accumulated + startOffset
      }
      accumulated += (node.textContent || '').length
      node = walker.nextNode()
    }

    return accumulated
  }, [])

  // 处理文本选中
  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) return

    const text = selection.toString().trim()
    if (!text || text.length < 2) return

    // 获取选中位置
    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    const contentRect = contentRef.current?.getBoundingClientRect()
    const root = contentRef.current

    if (contentRect && root) {
      const offset = computeTextOffset(root, range.startContainer, range.startOffset)

      setSelectedText({
        text,
        offset,
        length: text.length,
      })

      // 弹窗宽度 w-80 = 320px，以选中文字中心为锚点（translateX(-50%)）。
      // 当选中文字靠左/靠右时，直接以中心点定位会让弹窗超出视口被遮挡，
      // 因此将锚点 x clamp 到容器边界内，保证弹窗始终完整可见。
      const POPUP_HALF_WIDTH = 160 // 320 / 2
      const rawX = rect.left + rect.width / 2 - contentRect.left
      const clampedX = Math.min(
        Math.max(rawX, POPUP_HALF_WIDTH),
        Math.max(POPUP_HALF_WIDTH, contentRect.width - POPUP_HALF_WIDTH),
      )

      setPopupPosition({
        x: clampedX,
        y: rect.top - contentRect.top,
      })
    }
  }, [computeTextOffset])

  // 点击外部关闭弹窗
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-annotation-popup]') && !target.closest('[data-content-viewer]')) {
        setSelectedText(null)
        setPopupPosition(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ---- 批注高亮 ----
  // 清除已应用的高亮标记，恢复为纯文本（DOM 直接操作，不影响 React 渲染）
  const clearHighlights = useCallback((root: HTMLElement) => {
    root.querySelectorAll('mark[data-annotation-id]').forEach((mark) => {
      const parent = mark.parentNode
      if (parent) {
        while (mark.firstChild) parent.insertBefore(mark.firstChild, mark)
        parent.removeChild(mark)
      }
    })
  }, [])

  // 按全局偏移在文本节点上包裹 <mark>。逐个批注独立、从头 walk，
  // 因为包裹 mark 不改变文本字符位置（字符总数不变），故每批注可正确对位。
  const applyAnnotation = useCallback((root: HTMLElement, ann: Annotation) => {
    const offset = ann.quoteOffset
    const length = ann.quoteLength

    // 收集所有文本节点及其全局起始偏移
    const nodes: { node: Node; start: number; len: number }[] = []
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    let accumulated = 0
    let node: Node | null = walker.nextNode()
    while (node) {
      const len = (node.textContent || '').length
      nodes.push({ node, start: accumulated, len })
      accumulated += len
      node = walker.nextNode()
    }

    // 定位目标区间：优先 quoteOffset/quoteLength
    let targetStart = -1
    let targetEnd = -1
    if (typeof offset === 'number' && typeof length === 'number' && offset >= 0 && length > 0) {
      targetStart = offset
      targetEnd = offset + length
    } else {
      // 兜底：按 quote 文本匹配
      const quote = ann.quote
      if (quote) {
        const idx = root.textContent?.indexOf(quote) ?? -1
        if (idx >= 0) {
          targetStart = idx
          targetEnd = idx + quote.length
        }
      }
    }
    if (targetStart < 0 || targetEnd <= targetStart) return

    const markClass =
      ann.type === 'question'
        ? 'bg-yellow-200/70 text-inherit rounded-sm px-0.5'
        : 'bg-emerald-200/70 text-inherit rounded-sm px-0.5'

    // 对每个相交的文本节点包裹对应片段
    for (const { node: tnode, start: ns, len: nlen } of nodes) {
      const segStart = Math.max(targetStart, ns)
      const segEnd = Math.min(targetEnd, ns + nlen)
      if (segStart >= segEnd) continue

      const relStart = segStart - ns
      const relEnd = segEnd - ns
      const text = tnode.textContent || ''
      const mark = document.createElement('mark')
      mark.setAttribute('data-annotation-id', ann.id)
      mark.setAttribute('data-annotation-type', ann.type || 'note')
      mark.className = markClass
      const frag = document.createDocumentFragment()
      if (relStart > 0) frag.appendChild(document.createTextNode(text.slice(0, relStart)))
      mark.appendChild(document.createTextNode(text.slice(relStart, relEnd)))
      frag.appendChild(mark)
      if (relEnd < text.length) frag.appendChild(document.createTextNode(text.slice(relEnd)))
      tnode.parentNode?.replaceChild(frag, tnode)
    }
  }, [])

  // html / annotations / selectedAnnotationId 变化时重新应用高亮
  useEffect(() => {
    const root = contentRef.current
    if (!root) return

    // 兜底：若浏览器原生 selection 落在内容区内，先清除。
    // 高亮重应用（clearHighlights / applyAnnotation）会替换文本节点，selection
    // 引用的节点脱离文档后 Chrome 会自动滚动（可能跳到顶部），破坏阅读位置。
    const sel = window.getSelection()
    if (sel && !sel.isCollapsed) {
      const anchor = sel.anchorNode
      if (anchor && root.contains(anchor)) sel.removeAllRanges()
    }

    clearHighlights(root)
    annotations.forEach((ann) => applyAnnotation(root, ann))

    // 设置选中态高亮（data-selected 属性 + 选中态描边）
    root.querySelectorAll('mark[data-annotation-id]').forEach((mark) => {
      const aid = mark.getAttribute('data-annotation-id')
      if (aid && aid === selectedAnnotationId) {
        mark.setAttribute('data-selected', 'true')
        mark.classList.add('ring-2', 'ring-primary', 'ring-offset-1')
      } else {
        mark.removeAttribute('data-selected')
        mark.classList.remove('ring-2', 'ring-primary', 'ring-offset-1')
      }
    })
  }, [html, annotations, selectedAnnotationId, applyAnnotation, clearHighlights])

  // 处理批注保存
  const handleAnnotationSave = useCallback((type: 'note' | 'question', body: string) => {
    if (!selectedText) return

    onAnnotationCreate({
      quote: selectedText.text,
      quoteOffset: selectedText.offset,
      quoteLength: selectedText.length,
      type,
      body,
    })

    setSelectedText(null)
    setPopupPosition(null)
    // 关键：清除浏览器原生 selection。否则提交后高亮重应用会 replaceChild 掉
    // 用户选中区域的文本节点，selection 引用的节点脱离文档，Chrome 会自动滚动到
    // selection 计算位置（失效 → 顶部），导致讲解页回滚到最上面。
    window.getSelection()?.removeAllRanges()
  }, [selectedText, onAnnotationCreate])

  // 点击讲解内容中的高亮标记，联动右侧批注选中（事件委托）
  const handleMarkClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSelectMark) return
    const target = e.target as HTMLElement
    const mark = target.closest('mark[data-annotation-id]') as HTMLElement | null
    if (mark) {
      const id = mark.getAttribute('data-annotation-id')
      if (id) onSelectMark(id)
    }
  }, [onSelectMark])

  // 关闭弹窗
  const handlePopupClose = useCallback(() => {
    setSelectedText(null)
    setPopupPosition(null)
  }, [])

  return (
    <div className="relative" data-content-viewer>
      <div
        ref={contentRef}
        className="prose-content max-w-none select-text"
        onMouseUp={handleMouseUp}
        onClick={handleMarkClick}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {/* 批注弹窗 */}
      {selectedText && popupPosition && (
        <div data-annotation-popup>
          <AnnotationPopup
            selectedText={selectedText.text}
            position={popupPosition}
            onSave={handleAnnotationSave}
            onClose={handlePopupClose}
          />
        </div>
      )}
    </div>
  )
}
