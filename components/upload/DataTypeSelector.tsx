'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

const DATA_TYPES = [
  { id: 'sales', label: '매출·회원 현황', description: '일별 매출, 주문, 신규회원', required: true },
  { id: 'googleAds', label: '구글 애즈', description: 'GDN, 검색, 쇼핑 캠페인', required: false },
  { id: 'partnership', label: '파트너십 광고', description: '제휴 마케터 유입·전환', required: false },
  { id: 'traffic', label: '웹 트래픽', description: '국내/해외 세션, 방문자', required: false },
]

interface Props {
  selected: string[]
  onChange: (selected: string[]) => void
}

export function DataTypeSelector({ selected, onChange }: Props) {
  const toggle = (id: string) => {
    if (id === 'sales') return // 필수
    onChange(
      selected.includes(id)
        ? selected.filter(s => s !== id)
        : [...selected, id]
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {DATA_TYPES.map(dt => (
        <div
          key={dt.id}
          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer
            ${selected.includes(dt.id) ? 'border-blue-500 bg-blue-900/20' : 'border-zinc-700'}`}
          onClick={() => toggle(dt.id)}
        >
          <Checkbox
            id={dt.id}
            checked={selected.includes(dt.id)}
            disabled={dt.required}
            className="mt-0.5"
          />
          <div>
            <Label htmlFor={dt.id} className="text-zinc-200 cursor-pointer">
              {dt.label}
              {dt.required && <span className="text-red-400 ml-1 text-xs">필수</span>}
            </Label>
            <p className="text-zinc-500 text-xs">{dt.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
