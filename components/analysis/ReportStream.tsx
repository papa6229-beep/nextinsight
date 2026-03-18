'use client'

import { useEffect, useRef } from 'react'

interface Props {
  text: string
  isStreaming: boolean
}

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-zinc-100">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="bg-zinc-800 text-emerald-300 px-1.5 py-0.5 rounded text-[0.78em] font-mono">
          {part.slice(1, -1)}
        </code>
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
  let emptyCount = 0

  const flushList = () => {
    if (!listBuffer) return
    const key = `list-${listKey++}`
    if (listBuffer.type === 'ul') {
      elements.push(
        <ul key={key} className="my-3 space-y-2.5 pl-0.5">
          {listBuffer.items.map((item, j) => (
            <li key={j} className="flex gap-3 text-sm text-zinc-300 leading-relaxed">
              <span className="text-blue-400/70 mt-[3px] shrink-0 select-none text-[9px]">▸</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )
    } else {
      elements.push(
        <ol key={key} className="my-3 space-y-2.5">
          {listBuffer.items.map((item, j) => (
            <li key={j} className="flex gap-3 text-sm text-zinc-300 leading-relaxed">
              <span className="text-blue-400 font-mono text-xs mt-0.5 shrink-0 select-none min-w-[18px]">
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
      emptyCount = 0
      const isFirst = elements.length === 0
      elements.push(
        <div key={i} className={`${isFirst ? 'mt-0' : 'mt-8'} mb-3`}>
          <h2 className="text-[13px] font-semibold text-blue-300 tracking-wide leading-snug">
            {renderInline(line.slice(3))}
          </h2>
          <div className="mt-2 h-px bg-gradient-to-r from-blue-700/50 via-zinc-700/30 to-transparent" />
        </div>
      )
    } else if (line.startsWith('### ')) {
      flushList()
      emptyCount = 0
      elements.push(
        <h3 key={i} className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mt-5 mb-2 flex items-center gap-2">
          <span className="h-px w-3 bg-zinc-600 inline-block shrink-0" />
          {renderInline(line.slice(4))}
        </h3>
      )
    } else if (line === '---') {
      flushList()
      emptyCount = 0
      elements.push(<div key={i} className="my-5 h-px bg-zinc-800/80" />)
    } else if (line.startsWith('- ')) {
      emptyCount = 0
      if (!listBuffer || listBuffer.type !== 'ul') {
        flushList()
        listBuffer = { type: 'ul', items: [] }
      }
      listBuffer.items.push(renderInline(line.slice(2)))
    } else if (/^\d+\.\s/.test(line)) {
      emptyCount = 0
      const content = line.replace(/^\d+\.\s/, '')
      if (!listBuffer || listBuffer.type !== 'ol') {
        flushList()
        listBuffer = { type: 'ol', items: [] }
      }
      listBuffer.items.push(renderInline(content))
    } else if (line.trim() === '') {
      flushList()
      emptyCount++
      // 빈 줄 한 번만 시각적 여백으로 처리
      if (emptyCount === 1) {
        elements.push(<div key={`gap-${i}`} className="h-2" />)
      }
    } else {
      flushList()
      emptyCount = 0
      elements.push(
        <p key={i} className="text-sm text-zinc-300 leading-[1.85] my-0.5">
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
