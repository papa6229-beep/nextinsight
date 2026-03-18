'use client'

import { useEffect, useRef } from 'react'

interface Props {
  text: string
  isStreaming: boolean
}

export function ReportStream({ text, isStreaming }: Props) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [text])

  if (!text && !isStreaming) {
    return (
      <div className="flex items-center justify-center h-32 text-zinc-500">
        데이터를 업로드하면 AI 분석이 시작됩니다
      </div>
    )
  }

  return (
    <div className="prose prose-invert prose-sm max-w-none">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('## ')) {
          return <h2 key={i} className="text-blue-400 font-semibold mt-4 mb-2 text-base">{line.slice(3)}</h2>
        }
        if (line.startsWith('### ')) {
          return <h3 key={i} className="text-zinc-300 font-medium mt-3 mb-1 text-sm">{line.slice(4)}</h3>
        }
        if (line.startsWith('- ')) {
          return <li key={i} className="text-zinc-300 text-sm ml-4 list-disc">{line.slice(2)}</li>
        }
        if (line.trim() === '') return <br key={i} />
        return <p key={i} className="text-zinc-300 text-sm leading-relaxed">{line}</p>
      })}
      {isStreaming && <span className="inline-block w-2 h-4 bg-blue-400 ml-1 animate-pulse" />}
      <div ref={endRef} />
    </div>
  )
}
