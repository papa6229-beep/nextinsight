import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import { buildChatSystemPrompt } from '@/lib/prompt-builder'
import { trimMessages, compressDataForChat } from '@/lib/context-compressor'
import type { ChatMessage, ParsedData, ApiError } from '@/types/marketing'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      messages: ChatMessage[]
      data: ParsedData
      initialAnalysis: string
    }

    const trimmedMessages = trimMessages(body.messages)
    const compressedData = compressDataForChat(body.data)
    const systemPrompt = buildChatSystemPrompt(body.initialAnalysis)

    // 데이터 요약을 첫 번째 시스템 메시지로 추가
    const dataContext = `[분석 데이터 요약]\n${JSON.stringify(compressedData, null, 0)}`
    const messagesWithContext: ChatMessage[] = [
      { role: 'user', content: dataContext },
      { role: 'assistant', content: '데이터를 확인했습니다. 질문해주세요.' },
      ...trimmedMessages,
    ]

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await client.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 8192,
            system: systemPrompt,
            messages: messagesWithContext.map(m => ({
              role: m.role,
              content: m.content,
            })),
          })

          for await (const chunk of response) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              const data = `data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`
              controller.enqueue(encoder.encode(data))
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch {
          const errData = `data: ${JSON.stringify({ error: 'STREAM_INTERRUPTED' })}\n\n`
          controller.enqueue(encoder.encode(errData))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (e: unknown) {
    console.error('/api/chat error:', e)
    return Response.json(
      { error: 'Anthropic API 오류', code: 'ANTHROPIC_ERROR' } as ApiError,
      { status: 500 }
    )
  }
}
