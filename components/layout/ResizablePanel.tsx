'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

interface ResizablePanelProps {
  children: React.ReactNode
  defaultWidth: number
  minWidth?: number
  maxWidth?: number
  handleSide?: 'left' | 'right'
  collapsed?: boolean
  collapsedWidth?: number
  onWidthChange?: (width: number) => void
}

export function ResizablePanel({
  children,
  defaultWidth,
  minWidth = 200,
  maxWidth = 600,
  handleSide = 'right',
  collapsed = false,
  collapsedWidth = 48,
  onWidthChange,
}: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth)
  const [isDragging, setIsDragging] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  useEffect(() => {
    if (!isDragging || collapsed) return

    const handleMouseMove = (e: MouseEvent) => {
      if (panelRef.current) {
        const rect = panelRef.current.getBoundingClientRect()
        const rawWidth =
          handleSide === 'left' ? rect.right - e.clientX : e.clientX - rect.left
        const clampedWidth = Math.min(Math.max(rawWidth, minWidth), maxWidth)
        setWidth(clampedWidth)
        onWidthChange?.(clampedWidth)
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, collapsed, handleSide, minWidth, maxWidth, onWidthChange])

  const effectiveWidth = collapsed ? collapsedWidth : width

  return (
    <div ref={panelRef} className="relative flex shrink-0" style={{ width: effectiveWidth }}>
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
      <div
        className={`absolute ${
          handleSide === 'left' ? 'left-0' : 'right-0'
        } top-0 h-full w-1 cursor-col-resize transition-colors hover:bg-primary/50 ${
          isDragging ? 'bg-primary/50' : 'bg-transparent'
        } ${collapsed ? 'hidden' : ''}`}
        onMouseDown={handleMouseDown}
      />
    </div>
  )
}
