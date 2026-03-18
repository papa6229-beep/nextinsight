'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import type { ChatMessage, ParsedData } from '@/types/marketing'
import { trimMessages } from '@/lib/context-compressor'

interface Props {
  data: ParsedData
  initialAnalysis: string
  disabled?: boolean
}

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}

function AssistantMessage({ content, isPending }: { content: string; isPending?: boolean }) {
  if (isPending && !content) {
    return (
      <span className="inline-flex items-center gap-1 px-1 py-0.5">
        <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </span>
    )
  }

  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let ulItems: React.ReactNode[] = []
  let olItems: React.ReactNode[] = []
  let listKey = 0

  const flushUl = () => {
    if (!ulItems.length) return
    elements.push(
      <ul key={`ul-${listKey++}`} className="my-1.5 space-y-1">
        {ulItems.map((item, j) => (
          <li key={j} className="flex gap-2 leading-relaxed">
            <span className="text-blue-300 mt-0.5 shrink-0 select-none">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    )
    ulItems = []
  }

  const flushOl = () => {
    if (!olItems.length) return
    elements.push(
      <ol key={`ol-${listKey++}`} className="my-1.5 space-y-1">
        {olItems.map((item, j) => (
          <li key={j} className="flex gap-2 leading-relaxed">
            <span className="text-blue-300 shrink-0 select-none">{j + 1}.</span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    )
    olItems = []
  }

  lines.forEach((line, i) => {
    if (line.startsWith('## ')) {
      flushUl(); flushOl()
      elements.push(
        <p key={i} className="font-semibold text-zinc-100 mt-3 mb-1 first:mt-0">
          {renderInline(line.slice(3))}
        </p>
      )
    } else if (line.startsWith('### ')) {
      flushUl(); flushOl()
      elements.push(
        <p key={i} className="font-medium text-zinc-200 mt-2 mb-0.5">
          {renderInline(line.slice(4))}
        </p>
      )
    } else if (line.startsWith('- ')) {
      flushOl()
      ulItems.push(renderInline(line.slice(2)))
    } else if (/^\d+\.\s/.test(line)) {
      flushUl()
      olItems.push(renderInline(line.replace(/^\d+\.\s/, '')))
    } else if (line.trim() === '') {
      flushUl(); flushOl()
    } else {
      flushUl(); flushOl()
      elements.push(
        <p key={i} className="leading-relaxed my-0.5">
          {renderInline(line)}
        </p>
      )
    }
  })

  flushUl(); flushOl()

  return <div className="text-sm space-y-0.5">{elements}</div>
}

const SUGGESTED_QUESTIONS = [
  '광고 효율이 가장 좋았던 날은 언제인가요?',
  '해외 방문자가 구매로 이어지지 않는 이유가 뭔가요?',
  '매출이 급락한 주요 원인을 다시 정리해주세요',
]

export function ChatInterface({ data, initialAnalysis, disabled }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isResponding, setIsResponding] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || isResponding || disabled) return

    const userMessage: ChatMessage = { role: 'user', content }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsResponding(true)

    const assistantMessage: ChatMessage = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, assistantMessage])

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 120_000)

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: trimMessages(newMessages),
          data,
          initialAnalysis,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6)
          if (raw === '[DONE]') break
          try {
            const parsed = JSON.parse(raw)
            if (parsed.text) {
              fullText += parsed.text
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', content: fullText }
                return updated
              })
            }
          } catch { /* ignore */ }
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: '죄송해요, 응답 중에 오류가 발생했어요. 다시 시도해주세요.' }
        return updated
      })
    } finally {
      setIsResponding(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-zinc-500 text-xs text-center">
              {disabled ? 'AI 분석이 완료되면 질문할 수 있어요' : '분석 결과에 대해 궁금한 점을 물어보세요'}
            </p>
            {!disabled && (
              <div className="space-y-1.5">
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    className="w-full text-left text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 rounded-lg px-3 py-2 transition-colors leading-relaxed"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs">✦</span>
              </div>
            )}
            <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-tr-sm'
                : 'bg-zinc-800/80 text-zinc-200 border border-zinc-700/40 rounded-tl-sm'
            }`}>
              {msg.role === 'user'
                ? msg.content
                : <AssistantMessage
                    content={msg.content}
                    isPending={isResponding && i === messages.length - 1}
                  />
              }
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-zinc-800">
        <div className="flex gap-2 items-end bg-zinc-800/50 border border-zinc-700/60 rounded-xl px-3 py-2 focus-within:border-zinc-500 transition-colors">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder={disabled ? '분석 완료 후 질문 가능해요' : '궁금한 점을 물어보세요...'}
            disabled={isResponding || disabled}
            className="flex-1 bg-transparent text-zinc-200 text-sm placeholder:text-zinc-600 disabled:opacity-40 outline-none py-0.5"
          />
          <Button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isResponding || disabled}
            size="sm"
            className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-30 rounded-lg shrink-0"
          >
            {isResponding ? (
              <span className="flex gap-0.5 items-center">
                <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
                <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
              </span>
            ) : '전송'}
          </Button>
        </div>
        <p className="text-zinc-600 text-[10px] text-center mt-1.5">Enter로 전송 · 분석 데이터를 기반으로 답변해요</p>
      </div>
    </div>
  )
}
