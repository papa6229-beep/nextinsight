'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileDropzone } from '@/components/upload/FileDropzone'
import { saveSession, clearSession } from '@/lib/session-storage'
import type { FileType } from '@/types/marketing'

interface FileWithType { file: File; type: FileType }

export default function HomePage() {
  const router = useRouter()
  const [files, setFiles] = useState<FileWithType[]>([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = files.length > 0 && files.some(f => f.type === 'sales') && !loading

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    clearSession()

    const formData = new FormData()
    for (const { file, type } of files) {
      formData.append('files', file)
      formData.append(`fileType_${file.name}`, type)
    }

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? '업로드 실패')
        return
      }

      saveSession(json.data, json.summary)
      router.push('/analysis')
    } catch {
      setError('네트워크 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-2xl text-zinc-100">📊 마케팅 데이터 분석</CardTitle>
          <p className="text-zinc-400">쇼핑몰 매출·광고 데이터를 업로드하면 AI가 원인을 분석합니다</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <FileDropzone onFilesSelected={setFiles} disabled={loading} />

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-zinc-400 text-sm block mb-1">분석 시작일</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 rounded px-3 py-2"
              />
            </div>
            <div className="flex-1">
              <label className="text-zinc-400 text-sm block mb-1">분석 종료일</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 rounded px-3 py-2"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex-1 bg-blue-600 hover:bg-blue-500"
            >
              {loading ? '분석 준비 중...' : '분석 시작'}
            </Button>
            <Button variant="outline" onClick={() => router.push('/guide')} className="border-zinc-700">
              데이터 준비 가이드
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
