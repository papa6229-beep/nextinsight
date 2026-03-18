import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const FILE_GUIDES = [
  {
    name: '매출·회원 (sales.xlsx) — 필수',
    file: 'sales_sample.xlsx',
    columns: [
      { name: '날짜', type: 'YYYY-MM-DD', required: true, example: '2025-01-01' },
      { name: '일별_매출액', type: '숫자 (원)', required: true, example: '12500000' },
      { name: '주문_건수', type: '숫자', required: true, example: '340' },
      { name: '신규_회원_가입수', type: '숫자', required: true, example: '85' },
      { name: '누적_회원수', type: '숫자', required: false, example: '15820' },
      { name: '구매_전환율', type: '숫자 (%)', required: false, example: '3.2' },
      { name: '평균_객단가', type: '숫자 (원)', required: false, example: '36700' },
      { name: '반품_취소_건수', type: '숫자', required: false, example: '12' },
    ],
  },
  {
    name: '구글 애즈 (google_ads.xlsx) — 선택',
    file: 'google_ads_sample.xlsx',
    columns: [
      { name: '날짜', type: 'YYYY-MM-DD', required: true, example: '2025-01-01' },
      { name: '캠페인명', type: '텍스트', required: true, example: 'GDN_브랜드' },
      { name: '노출수', type: '숫자', required: true, example: '250000' },
      { name: '클릭수', type: '숫자', required: true, example: '3200' },
      { name: '광고비_지출', type: '숫자 (원)', required: true, example: '2500000' },
      { name: '전환수', type: '숫자', required: false, example: '85' },
      { name: 'CPA', type: '숫자 (원)', required: false, example: '29400' },
      { name: 'ROAS', type: '숫자 (배수)', required: false, example: '5.2' },
    ],
  },
  {
    name: '파트너십 광고 (partnership.xlsx) — 선택',
    file: 'partnership_sample.xlsx',
    columns: [
      { name: '날짜', type: 'YYYY-MM-DD', required: true, example: '2025-01-01' },
      { name: '파트너명', type: '텍스트', required: true, example: '파트너A' },
      { name: '유입_클릭수', type: '숫자', required: true, example: '1200' },
      { name: '회원가입_전환수', type: '숫자', required: true, example: '45' },
      { name: '구매_전환수', type: '숫자', required: true, example: '12' },
      { name: '파트너_발생매출', type: '숫자 (원)', required: false, example: '450000' },
      { name: '지급_보상액', type: '숫자 (원)', required: false, example: '45000' },
    ],
  },
  {
    name: '웹 트래픽 (traffic.xlsx) — 선택',
    file: 'traffic_sample.xlsx',
    columns: [
      { name: '날짜', type: 'YYYY-MM-DD', required: true, example: '2025-01-01' },
      { name: '전체_세션수', type: '숫자', required: true, example: '15000' },
      { name: '국내_세션수', type: '숫자', required: true, example: '12000' },
      { name: '해외_세션수', type: '숫자', required: true, example: '3000' },
      { name: '신규_방문자수', type: '숫자', required: false, example: '8500' },
      { name: '이탈률', type: '숫자 (%)', required: false, example: '42.5' },
    ],
  },
]

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-100">데이터 준비 가이드</h1>
          <Link href="/"><Button variant="outline" className="border-zinc-700">← 홈으로</Button></Link>
        </div>

        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 text-blue-200 text-sm">
          <strong>📌 준비 팁:</strong> 엑셀 파일명에 sales, google_ads, partnership, traffic 키워드를 포함하면
          업로드 시 자동으로 파일 유형이 인식됩니다.
        </div>

        {FILE_GUIDES.map(guide => (
          <Card key={guide.name} className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-zinc-200 text-base">{guide.name}</CardTitle>
                <a href={`/samples/${guide.file}`} download>
                  <Button size="sm" variant="outline" className="border-zinc-700 text-xs">
                    샘플 다운로드
                  </Button>
                </a>
              </div>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-700">
                    <th className="text-left py-2 text-zinc-400 font-medium">컬럼명</th>
                    <th className="text-left py-2 text-zinc-400 font-medium">형식</th>
                    <th className="text-left py-2 text-zinc-400 font-medium">예시</th>
                    <th className="text-center py-2 text-zinc-400 font-medium">필수</th>
                  </tr>
                </thead>
                <tbody>
                  {guide.columns.map(col => (
                    <tr key={col.name} className="border-b border-zinc-800">
                      <td className="py-2 text-zinc-200 font-mono text-xs">{col.name}</td>
                      <td className="py-2 text-zinc-400 text-xs">{col.type}</td>
                      <td className="py-2 text-zinc-500 text-xs">{col.example}</td>
                      <td className="py-2 text-center">
                        {col.required
                          ? <span className="text-red-400 text-xs">필수</span>
                          : <span className="text-zinc-600 text-xs">선택</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
