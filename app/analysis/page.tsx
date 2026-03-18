'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { SalesChart } from '@/components/charts/SalesChart'
import { MemberChart } from '@/components/charts/MemberChart'
import { AdChart } from '@/components/charts/AdChart'
import { TrafficChart } from '@/components/charts/TrafficChart'
import { ReportStream } from '@/components/analysis/ReportStream'
import { ChatInterface } from '@/components/analysis/ChatInterface'
import { loadSession } from '@/lib/session-storage'
import type { ParsedData, DataSummary } from '@/types/marketing'

export default function AnalysisPage() {
  const router = useRouter()
  const [data, setData] = useState<ParsedData | null>(null)
  const [summary, setSummary] = useState<DataSummary | null>(null)
  const [report, setReport] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisDone, setAnalysisDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasStarted = useRef(false)

  useEffect(() => {
    const session = loadSession()
    if (!session) {
      router.replace('/')
      return
    }
    setData(session.data)
    setSummary(session.summary)
  }, [router])

  useEffect(() => {
    if (!data || hasStarted.current) return
    hasStarted.current = true
    runAnalysis(data, summary!)
  }, [data, summary])

  const runAnalysis = async (d: ParsedData, s: DataSummary) => {
    setIsAnalyzing(true)
    setError(null)

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 120_000)

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: d, dateRange: s.dateRange }),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (!res.ok) {
        const json = await res.json()
        setError(json.error ?? '분석 실패')
        return
      }

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
            if (parsed.error) { setError('분석 중 오류가 발생했습니다'); return }
            if (parsed.text) {
              fullText += parsed.text
              setReport(fullText)
            }
          } catch { /* ignore */ }
        }
      }
      setAnalysisDone(true)
    } catch {
      setError('네트워크 오류 또는 타임아웃')
    } finally {
      setIsAnalyzing(false)
    }
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400">데이터 로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-100">마케팅 분석 결과</h1>
            {summary && (
              <p className="text-zinc-500 text-sm">
                {summary.dateRange.start} ~ {summary.dateRange.end} ·{' '}
                {summary.uploadedFiles.join(', ')} 데이터
              </p>
            )}
          </div>
          <Button variant="outline" onClick={() => router.push('/')} className="border-zinc-700 text-sm">
            ← 새 분석
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 차트 영역 */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-zinc-200 text-base">데이터 시각화</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="sales">
                <TabsList className="bg-zinc-800 mb-4">
                  <TabsTrigger value="sales">매출</TabsTrigger>
                  <TabsTrigger value="members">회원</TabsTrigger>
                  {data.googleAds && <TabsTrigger value="ads">광고</TabsTrigger>}
                  {data.traffic && <TabsTrigger value="traffic">트래픽</TabsTrigger>}
                </TabsList>
                <TabsContent value="sales"><SalesChart data={data.sales} /></TabsContent>
                <TabsContent value="members"><MemberChart data={data.sales} /></TabsContent>
                {data.googleAds && <TabsContent value="ads"><AdChart data={data.googleAds} /></TabsContent>}
                {data.traffic && <TabsContent value="traffic"><TrafficChart data={data.traffic} /></TabsContent>}
              </Tabs>
            </CardContent>
          </Card>

          {/* AI 리포트 */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-zinc-200 text-base flex items-center gap-2">
                🤖 AI 분석 리포트
                {isAnalyzing && <span className="text-xs text-blue-400 font-normal">분석 중...</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-[560px] overflow-y-auto">
              {error ? (
                <div className="text-red-400 text-sm">{error}</div>
              ) : !report && isAnalyzing ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full bg-zinc-800" />
                  <Skeleton className="h-4 w-3/4 bg-zinc-800" />
                  <Skeleton className="h-4 w-5/6 bg-zinc-800" />
                </div>
              ) : (
                <ReportStream text={report} isStreaming={isAnalyzing} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* 채팅 */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-zinc-200 text-base">💬 추가 질문</CardTitle>
          </CardHeader>
          <CardContent className="h-72 flex flex-col p-0">
            <ChatInterface data={data} initialAnalysis={report} disabled={!analysisDone} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
