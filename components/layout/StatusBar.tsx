'use client'

import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import type { AIProvider } from '@/lib/ai/providers'

interface StatusBarProps {
  phase: 'discussing' | 'learning' | 'summarizing'
  aiProvider: AIProvider
  onProviderChange: (provider: AIProvider) => void
  onExport?: () => void
  onSummarize?: () => void
}

export function StatusBar({ phase, aiProvider, onProviderChange, onExport, onSummarize }: StatusBarProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const mountedRef = useRef(false)

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      setMounted(true)
    }
  }, [])

  const phaseLabels = {
    discussing: '讨论中',
    learning: '学习中',
    summarizing: '总结中',
  }

  const phaseColors = {
    discussing: 'bg-blue-500',
    learning: 'bg-green-500',
    summarizing: 'bg-purple-500',
  }

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-between border-t bg-background px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${phaseColors[phase]}`} />
            <span className="text-sm text-muted-foreground">阶段: {phaseLabels[phase]}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-[140px] h-8" />
          <div className="w-8 h-8" />
        </div>
      </div>
    )
  }

  const ThemeIcon = theme === 'light' ? <Sun className="h-4 w-4" /> :
    theme === 'dark' ? <Moon className="h-4 w-4" /> :
    <Monitor className="h-4 w-4" />

  return (
    <div className="flex items-center justify-between border-t bg-background px-4 py-2">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${phaseColors[phase]}`} />
          <span className="text-sm text-muted-foreground">阶段: {phaseLabels[phase]}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Select value={aiProvider} onValueChange={(v) => onProviderChange(v as AIProvider)}>
          <SelectTrigger className="w-[140px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="volcengine">火山引擎</SelectItem>
            <SelectItem value="openai">OpenAI</SelectItem>
          </SelectContent>
        </Select>

        {phase === 'learning' && onSummarize && (
          <Button variant="outline" size="sm" onClick={onSummarize}>
            总结
          </Button>
        )}

        <Button variant="outline" size="sm" onClick={onExport}>
          导出 HTML
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={cycleTheme}
          title={`当前主题: ${theme === 'light' ? '浅色' : theme === 'dark' ? '深色' : '跟随系统'}`}
        >
          {ThemeIcon}
        </Button>
      </div>
    </div>
  )
}
