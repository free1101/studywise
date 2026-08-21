import { useState, useRef, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { ChatMessage as ChatMessageType } from '@/lib/schema'
import type { AIProvider } from '@/lib/ai/providers'

interface UseChatOptions {
  onContentGenerated?: (html: string) => void
  provider?: AIProvider
}

interface UseChatReturn {
  messages: ChatMessageType[]
  input: string
  isLoading: boolean
  setInput: (v: string) => void
  sendMessage: () => Promise<void>
  handleKeyDown: (e: React.KeyboardEvent) => void
  scrollRef: React.RefObject<HTMLDivElement | null>
}

// 返回内容中 HTML 开始标记的位置（index）。若未检测到返回 -1。
// 一旦检测到 HTML 开始标记，后续收到的文本都属于 HTML 部分。
function findHtmlStartIndex(content: string): number {
  // 1. ```html 标记
  const m1 = content.indexOf('```html')
  if (m1 >= 0) return m1

  // 2. ``` 后紧跟 HTML 标签（可能带换行/空格）
  const m2 = content.match(/```\s*\n\s*<(?:div|section|article|main|body|html)\b/i)
  if (m2 && m2.index !== undefined) return m2.index

  // 3. 裸 <html> 开头（无代码块包裹）
  const m3 = content.match(/<html[\s\S]/i)
  if (m3 && m3.index !== undefined) return m3.index

  // 4. 大段以 HTML 标签开头（div/section/h1/p 等，无代码块包裹）
  const m4 = content.match(/<(\/?)(div|section|article|main|body|html|h[1-6]|p|ul|ol|li|table|blockquote)\b/i)
  if (m4 && m4.index !== undefined) {
    // 只有内容足够长才判定为 HTML，避免把引导语中的零星标签误判
    const idx = m4.index
    const before = content.slice(0, idx)
    const after = content.slice(idx)
    // 前面应没有明显文本内容（或只有简短引导语），后面是结构化的 HTML
    if (after.length > 40 && !/```/.test(before)) {
      return idx
    }
  }

  return -1
}

// 判断字符串是否以 HTML 结构标签开头
function looksLikeHtml(s: string): boolean {
  return /<(?:div|section|article|main|body|html|h[1-6]|p|ul|ol|table|span)\b/i.test(s)
}

// 截断到最后一个 HTML 闭合标签（容忍流式输出在标签中途被切断 / 结尾围栏缺失）。
// 返回能完整解析到最后一个 </xxx> 的前缀，避免把模型可能附带的残余文本误入 HTML。
function truncateToLastTag(s: string): string {
  const closes = Array.from(s.matchAll(/<\/[a-zA-Z][\w:-]*\s*>/g))
  if (closes.length === 0) {
    const lastOpen = s.lastIndexOf('>')
    return lastOpen > 0 ? s.slice(0, lastOpen + 1) : s
  }
  const last = closes[closes.length - 1]
  const end = (last.index ?? 0) + last[0].length
  return s.slice(0, end)
}

// 判断是否为足够长的 HTML 结构（用于无围栏/bare 分支的兜底，避免误判引导语中的零星标签）
function isSubstantialHtml(s: string): boolean {
  return looksLikeHtml(s) && s.length > 40
}

function extractHtml(content: string): string | null {
  // 1. 成对 ``` 围栏（带 html 标签或不带标签），允许围栏后紧跟换行/内容首行就是标签，
  //    允许结尾 ``` 前有换行或内容，允许围栏后有额外解释文本。
  const fenced = content.match(/```(?:html)?\s*\n?\s*(<[\s\S]*?)\n?\s*```/i)
  if (fenced && looksLikeHtml(fenced[1])) {
    return fenced[1].trim()
  }

  // 2. 完整 <html>...</html> 文档（可被引导语/围栏包裹）
  const doc = content.match(/<html[\s\S]*?<\/html>/i)
  if (doc) return doc[0]

  // 3. 只有开头围栏、缺结尾围栏（流式输出常被截断）：取围栏后到最后一个 HTML 闭合标签
  const openFence = content.match(/```(?:html)?\s*\n?\s*(<[\s\S]*)$/i)
  if (openFence) {
    const html = truncateToLastTag(openFence[1])
    if (isSubstantialHtml(html)) return html.trim()
  }

  // 4. 大段以 HTML 结构标签开头（含 h1-p/ul/ol/table 等常见根标签）的内容（无围栏包裹）。
  //    放宽根标签白名单以覆盖模型输出以 <h1>/<p>/<ul> 等直接开头的情况；
  //    并截断到最后一个闭合标签，规避原实现非贪婪匹配在嵌套结构处提前截断的问题。
  const bare = content.match(/<(\/?)(?:div|section|article|main|body|html|h[1-6]|p|ul|ol|li|table|blockquote|strong|em)\b[\s\S]*$/i)
  if (bare) {
    const html = truncateToLastTag(bare[0])
    if (isSubstantialHtml(html)) return html.trim()
  }

  return null
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const { onContentGenerated, provider } = options
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const updateLastAssistant = useCallback((content: string) => {
    setMessages(prev => {
      const updated = [...prev]
      const lastMsg = updated[updated.length - 1]
      if (lastMsg && lastMsg.role === 'assistant') {
        lastMsg.content = content
      }
      return [...updated]
    })
  }, [])

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessageType = {
      id: uuidv4(),
      role: 'user',
      content: input.trim(),
      createdAt: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          provider,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to get response')
      }

      const assistantMessage: ChatMessageType = {
        id: uuidv4(),
        role: 'assistant',
        content: '',
        createdAt: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''
      let introText = '' // 引导语（HTML 开始之前的文本）
      let htmlStarted = false

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          fullContent += chunk

          if (!htmlStarted) {
            const htmlIndex = findHtmlStartIndex(fullContent)
            if (htmlIndex >= 0) {
              // 进入 HTML 阶段：切出引导语，并保留引导语显示，不再整条替换
              htmlStarted = true
              introText = fullContent.slice(0, htmlIndex).trim()
              const display = introText
                ? `${introText}\n\n[正在生成学习内容...]`
                : '[正在生成学习内容...]'
              updateLastAssistant(display)
            } else {
              // 引导语阶段，正常流式显示
              updateLastAssistant(fullContent)
            }
          } else {
            // HTML 阶段：保持引导语 + 提示不变，不随流式刷新（避免覆盖引导语）
            const display = introText
              ? `${introText}\n\n[正在生成学习内容...]`
              : '[正在生成学习内容...]'
            updateLastAssistant(display)
          }
        }
      }

      const htmlContent = extractHtml(fullContent)

      if (htmlContent) {
        // 只要检测到 HTML，就绝不能让它出现在对话气泡里
        if (onContentGenerated) {
          onContentGenerated(htmlContent)
        }
        // 保留引导语 + 友好提示，替换掉 HTML 原文
        const finalIntro = introText || fullContent.slice(0, fullContent.indexOf(htmlContent)).trim()
        updateLastAssistant(
          finalIntro
            ? `${finalIntro}\n\n学习内容已生成！请在中间区域查看和批注。`
            : '学习内容已生成！请在中间区域查看和批注。'
        )
      } else if (fullContent) {
        updateLastAssistant(fullContent)
      }
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: ChatMessageType = {
        id: uuidv4(),
        role: 'assistant',
        content: '抱歉，发生错误了。请检查 API Key 配置是否正确。',
        createdAt: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, messages, onContentGenerated, provider, updateLastAssistant])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }, [sendMessage])

  return {
    messages,
    input,
    isLoading,
    setInput,
    sendMessage,
    handleKeyDown,
    scrollRef,
  }
}
