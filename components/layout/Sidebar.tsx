'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'

interface SidebarProps {
  children: React.ReactNode
  title: string
  defaultOpen?: boolean
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

export function Sidebar({
  children,
  title,
  defaultOpen = true,
  isOpen: controlledIsOpen,
  onOpenChange,
}: SidebarProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen)
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen

  const toggleOpen = () => {
    const newOpen = !isOpen
    setInternalIsOpen(newOpen)
    onOpenChange?.(newOpen)
  }

  return (
    <div className="flex flex-col border-r bg-muted/30 h-full w-full">
      <div className="flex items-center justify-between border-b px-3 py-2 shrink-0">
        {isOpen && <h3 className="text-sm font-medium truncate">{title}</h3>}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={toggleOpen}
        >
          {isOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
        </Button>
      </div>
      {/* 始终渲染 children，折叠时仅用 CSS 隐藏，避免卸载导致 useChat 等内部状态丢失 */}
      <div className={isOpen ? 'flex-1 overflow-y-auto overflow-x-hidden' : 'hidden'}>
        {children}
      </div>
    </div>
  )
}
