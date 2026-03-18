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

export function ChatInterface({ data, initialAnalysis, disabled }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isResponding, setIsResponding] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || isResponding || disabled) return

    const userMessage: ChatMessage = { role: 'user', content: input.trim() }
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
        updated[updated.length - 1] = { role: 'assistant', content: '응답 중 오류가 발생했습니다.' }
        return updated
      })
    } finally {
      setIsResponding(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-3 p-3 min-h-0">
        {messages.length === 0 && (
          <p className="text-zinc-500 text-sm text-center py-4">
            분석 결과에 대해 추가 질문을 해보세요
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
              msg.role === 'user'
                ? 'bg-blue-700 text-white'
                : 'bg-zinc-800 text-zinc-200'
            }`}>
              {msg.content || (isResponding && i === messages.length - 1
                ? <span className="inline-block w-2 h-3 bg-zinc-400 animate-pulse" />
                : '')}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex gap-2 p-3 border-t border-zinc-800">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder={disabled ? 'AI 분석 완료 후 질문 가능합니다' : '추가 질문을 입력하세요...'}
          disabled={isResponding || disabled}
          className="flex-1 bg-zinc-800 border border-zinc-700 text-zinc-200 rounded px-3 py-2 text-sm disabled:opacity-50"
        />
        <Button
          onClick={sendMessage}
          disabled={!input.trim() || isResponding || disabled}
          size="sm"
          className="bg-blue-600 hover:bg-blue-500"
        >
          {isResponding ? '...' : '전송'}
        </Button>
      </div>
    </div>
  )
}
