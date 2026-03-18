import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import { buildAnalysisPrompt, SYSTEM_PROMPT } from '@/lib/prompt-builder'
import type { ParsedData, ApiError } from '@/types/marketing'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { data: ParsedData; dateRange: { start: string; end: string } }

    if (!body.data?.sales) {
      return Response.json(
        { error: '분석 데이터가 없습니다', code: 'NO_SALES_FILE' as const } as ApiError,
        { status: 400 }
      )
    }

    const prompt = buildAnalysisPrompt(body.data, body.dateRange)

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await client.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 4096,
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: prompt }],
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
        } catch (e) {
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
    console.error('/api/analyze error:', e)
    return Response.json(
      { error: 'Anthropic API 오류', code: 'ANTHROPIC_ERROR' } as ApiError,
      { status: 500 }
    )
  }
}
