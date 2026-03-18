'use client'

import { useCallback, useState } from 'react'
import { FileType } from '@/types/marketing'

interface FileWithType {
  file: File
  type: FileType
}

interface Props {
  onFilesSelected: (files: FileWithType[]) => void
  disabled?: boolean
}

const FILE_TYPE_LABELS: Record<FileType, string> = {
  sales: '매출·회원',
  googleAds: '구글 애즈',
  partnership: '파트너십',
  traffic: '트래픽',
  eventCoupon: '이벤트·쿠폰',
}

export function FileDropzone({ onFilesSelected, disabled }: Props) {
  const [dragOver, setDragOver] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<FileWithType[]>([])

  const handleFiles = useCallback((files: File[]) => {
    const xlsx = files.filter(f => {
      const ext = f.name.split('.').pop()?.toLowerCase()
      return ext === 'xlsx' || ext === 'csv'
    })
    if (!xlsx.length) return

    const withTypes: FileWithType[] = xlsx.map(file => {
      const lower = file.name.toLowerCase()
      let type: FileType = 'sales'
      if (lower.includes('google') || lower.includes('ads') || lower.includes('구글')) type = 'googleAds'
      else if (lower.includes('partner') || lower.includes('파트너')) type = 'partnership'
      else if (lower.includes('traffic') || lower.includes('트래픽')) type = 'traffic'
      else if (lower.includes('event') || lower.includes('이벤트') || lower.includes('쿠폰') || lower.includes('coupon')) type = 'eventCoupon'
      return { file, type }
    })
    setSelectedFiles(withTypes)
    onFilesSelected(withTypes)
  }, [onFilesSelected])

  const updateType = (index: number, type: FileType) => {
    const updated = selectedFiles.map((f, i) => i === index ? { ...f, type } : f)
    setSelectedFiles(updated)
    onFilesSelected(updated)
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault()
          setDragOver(false)
          handleFiles(Array.from(e.dataTransfer.files))
        }}
        onClick={() => !disabled && document.getElementById('file-input')?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${dragOver ? 'border-blue-400 bg-blue-900/20' : 'border-zinc-600 hover:border-zinc-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <p className="text-2xl mb-2">📁</p>
        <p className="text-zinc-300">파일을 드래그하거나 클릭해서 업로드</p>
        <p className="text-zinc-500 text-sm mt-1">.xlsx / .csv 지원 · 최대 4개 · 개당 5MB</p>
        <input
          id="file-input"
          type="file"
          multiple
          accept=".xlsx,.csv"
          className="hidden"
          onChange={e => handleFiles(Array.from(e.target.files ?? []))}
        />
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          {selectedFiles.map((fw, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center gap-3 bg-zinc-800 rounded-lg px-3 py-2">
                <span className="text-zinc-300 flex-1 truncate text-sm">{fw.file.name}</span>
                <select
                  value={fw.type}
                  onChange={e => updateType(i, e.target.value as FileType)}
                  className="bg-zinc-700 text-zinc-200 text-sm rounded px-2 py-1 border border-zinc-600"
                >
                  {(Object.keys(FILE_TYPE_LABELS) as FileType[]).map(t => (
                    <option key={t} value={t}>{FILE_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>
              {fw.type === 'eventCoupon' && (
                <div className="flex items-start gap-2 bg-blue-900/20 border border-blue-700/40 rounded-lg px-3 py-2 text-xs text-blue-300">
                  <span className="shrink-0 font-medium text-blue-200">📋 2시트 구조 감지</span>
                  <span className="text-blue-300/80">이벤트_마스터(정의) + 이벤트_일별성과(성과) 시트로 파싱됩니다. 마스터 시트에 날짜가 없는 것은 정상입니다.</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
