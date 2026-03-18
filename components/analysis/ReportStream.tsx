'use client'

import { useEffect, useRef } from 'react'

interface Props {
  text: string
  isStreaming: boolean
}

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-zinc-100">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return <span key={i}>{part}</span>
  })
}

type ListBuffer = { type: 'ul' | 'ol'; items: React.ReactNode[] } | null

export function ReportStream({ text, isStreaming }: Props) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [text])

  if (!text && !isStreaming) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-3 text-zinc-500">
        <div className="text-3xl">📊</div>
        <p className="text-sm">데이터를 업로드하면 AI 분석이 시작됩니다</p>
      </div>
    )
  }

  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let listBuffer: ListBuffer = null
  let listKey = 0

  const flushList = () => {
    if (!listBuffer) return
    const key = `list-${listKey++}`
    if (listBuffer.type === 'ul') {
      elements.push(
        <ul key={key} className="my-2 space-y-1.5">
          {listBuffer.items.map((item, j) => (
            <li key={j} className="flex gap-2.5 text-sm text-zinc-300 leading-relaxed">
              <span className="text-blue-400 mt-0.5 shrink-0 select-none">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )
    } else {
      elements.push(
        <ol key={key} className="my-2 space-y-1.5">
          {listBuffer.items.map((item, j) => (
            <li key={j} className="flex gap-2.5 text-sm text-zinc-300 leading-relaxed">
              <span className="text-blue-400 font-mono text-xs mt-0.5 shrink-0 select-none w-4">
                {j + 1}.
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      )
    }
    listBuffer = null
  }

  lines.forEach((line, i) => {
    if (line.startsWith('## ')) {
      flushList()
      elements.push(
        <div key={i} className="mt-7 mb-3 first:mt-0">
          <h2 className="text-sm font-semibold text-blue-300 flex items-center gap-2">
            {renderInline(line.slice(3))}
          </h2>
          <div className="mt-2 border-b border-zinc-700/60" />
        </div>
      )
    } else if (line.startsWith('### ')) {
      flushList()
      elements.push(
        <h3 key={i} className="text-sm font-semibold text-zinc-200 mt-4 mb-1.5 flex items-center gap-1.5">
          <span className="w-1 h-3 bg-zinc-500 rounded-full inline-block shrink-0" />
          {renderInline(line.slice(4))}
        </h3>
      )
    } else if (line.startsWith('- ')) {
      if (!listBuffer || listBuffer.type !== 'ul') {
        flushList()
        listBuffer = { type: 'ul', items: [] }
      }
      listBuffer.items.push(renderInline(line.slice(2)))
    } else if (/^\d+\.\s/.test(line)) {
      const content = line.replace(/^\d+\.\s/, '')
      if (!listBuffer || listBuffer.type !== 'ol') {
        flushList()
        listBuffer = { type: 'ol', items: [] }
      }
      listBuffer.items.push(renderInline(content))
    } else if (line.trim() === '') {
      flushList()
    } else {
      flushList()
      elements.push(
        <p key={i} className="text-sm text-zinc-300 leading-[1.75] my-1">
          {renderInline(line)}
        </p>
      )
    }
  })

  flushList()

  return (
    <div className="max-w-none">
      {elements}
      {isStreaming && (
        <span className="inline-flex items-center gap-1 ml-1 mt-2">
          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </span>
      )}
      <div ref={endRef} />
    </div>
  )
}
