import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TEMPLATES } from '@/lib/template-schema'

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-100">데이터 준비 가이드</h1>
          <Link href="/"><Button variant="outline" className="border-zinc-700 text-zinc-300">← 홈으로</Button></Link>
        </div>

        {/* 안내 배너 */}
        <div className="bg-blue-900/20 border border-blue-700/50 rounded-xl p-4 space-y-2">
          <p className="text-blue-200 text-sm font-medium">📌 파일 준비 핵심 원칙</p>
          <ul className="text-blue-300/80 text-sm space-y-1">
            <li>• 파일명에 <code className="bg-blue-900/40 px-1 rounded text-xs">sales</code>, <code className="bg-blue-900/40 px-1 rounded text-xs">google_ads</code>, <code className="bg-blue-900/40 px-1 rounded text-xs">partnership</code>, <code className="bg-blue-900/40 px-1 rounded text-xs">traffic</code>, <code className="bg-blue-900/40 px-1 rounded text-xs">이벤트</code> 키워드를 포함하면 업로드 시 자동 인식됩니다</li>
            <li>• 기본매출 파일은 필수입니다. 나머지 4종은 있는 것만 올려도 됩니다</li>
            <li>• 날짜는 <code className="bg-blue-900/40 px-1 rounded text-xs">YYYY-MM-DD</code> 형식, 금액은 쉼표 없이 숫자만 입력하세요</li>
            <li>• 모르는 값은 0이 아닌 <strong>빈칸</strong>으로 두세요 (0과 빈칸은 다르게 처리됩니다)</li>
          </ul>
        </div>

        {/* 이벤트·쿠폰 2시트 안내 */}
        <div className="bg-amber-900/15 border border-amber-700/40 rounded-xl p-4 space-y-2">
          <p className="text-amber-200 text-sm font-medium">📋 이벤트·쿠폰 파일 — 2시트 구조 안내</p>
          <ul className="text-amber-300/80 text-sm space-y-1.5">
            <li>• 이벤트·쿠폰 파일은 <strong className="text-amber-200">2시트 구조</strong>입니다 — 시트1(이벤트_마스터) + 시트2(이벤트_일별성과)</li>
            <li>• 시트1(이벤트_마스터)는 이벤트 <strong className="text-amber-200">정의용</strong> 시트이므로 날짜 컬럼이 없는 것이 <strong className="text-amber-200">정상</strong>입니다</li>
            <li>• 날짜 기반 분석은 <strong className="text-amber-200">시트2(이벤트_일별성과)</strong> 기준으로만 진행됩니다</li>
            <li>• 업로드 시 파일 성격은 반드시 <strong className="text-amber-200">이벤트·쿠폰</strong>으로 선택하세요 — 다른 타입으로 선택하면 오류가 발생합니다</li>
          </ul>
        </div>

        {/* 항목 정의서 안내 */}
        <div className="bg-zinc-800/50 border border-zinc-700/40 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-zinc-200 text-sm font-medium">📋 항목 정의서 — 각 컬럼의 의미·입력 기준·결측 처리 안내</p>
            <p className="text-zinc-500 text-xs mt-1">어떤 값을 어떻게 입력해야 하는지, 빠진 값이 어떻게 처리되는지 확인할 수 있습니다</p>
          </div>
          <Link href="/definitions">
            <Button variant="outline" className="border-zinc-600 text-zinc-300 hover:bg-zinc-700 shrink-0 ml-4">
              항목 정의서 보기 →
            </Button>
          </Link>
        </div>

        {/* 템플릿 목록 */}
        {TEMPLATES.map(template => (
          <Card key={template.id} className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-zinc-100 text-base">{template.label}</CardTitle>
                    {template.isRequired
                      ? <span className="text-[10px] bg-red-900/40 text-red-300 border border-red-800/50 px-1.5 py-0.5 rounded">필수</span>
                      : <span className="text-[10px] bg-zinc-800 text-zinc-500 border border-zinc-700 px-1.5 py-0.5 rounded">선택</span>
                    }
                    {template.sheets.length > 1 && (
                      <span className="text-[10px] bg-blue-900/30 text-blue-400 border border-blue-800/40 px-1.5 py-0.5 rounded">{template.sheets.length}시트</span>
                    )}
                  </div>
                  <p className="text-zinc-500 text-xs mt-1">{template.description}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link href={`/definitions#${template.id}`}>
                    <Button size="sm" variant="ghost" className="text-zinc-500 hover:text-zinc-300 text-xs h-8 px-3">
                      입력 기준
                    </Button>
                  </Link>
                  <a href={`/samples/${template.filename}`} download>
                    <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300 text-xs h-8">
                      템플릿 다운로드
                    </Button>
                  </a>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              {template.id === 'eventCoupon' && (
                <div className="bg-amber-900/15 border border-amber-700/30 rounded-lg px-3 py-2 text-xs text-amber-300/80 space-y-0.5">
                  <p><span className="text-amber-200 font-medium">시트1 이벤트_마스터</span> — 이벤트 정의 정보. 날짜 컬럼 없음이 정상.</p>
                  <p><span className="text-amber-200 font-medium">시트2 이벤트_일별성과</span> — 날짜별 성과 데이터. 분석 기준 시트.</p>
                </div>
              )}
              {template.sheets.map(sheet => (
                <div key={sheet.sheetName}>
                  {template.sheets.length > 1 && (
                    <p className="text-xs text-zinc-500 mb-2 font-medium">시트: <span className="text-zinc-400">{sheet.sheetName}</span></p>
                  )}
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left py-1.5 text-zinc-500 font-medium text-xs w-1/3">컬럼명</th>
                        <th className="text-left py-1.5 text-zinc-500 font-medium text-xs w-1/4">형식</th>
                        <th className="text-center py-1.5 text-zinc-500 font-medium text-xs w-16">구분</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sheet.columns.map(col => (
                        <tr key={col.name} className="border-b border-zinc-800/50">
                          <td className="py-1.5 text-zinc-200 font-mono text-xs">{col.name}</td>
                          <td className="py-1.5 text-zinc-500 text-xs">{col.type}</td>
                          <td className="py-1.5 text-center text-xs">
                            {col.required === true && <span className="text-red-400">필수</span>}
                            {col.required === 'recommended' && <span className="text-amber-500">권장</span>}
                            {col.required === false && <span className="text-zinc-600">선택</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        <p className="text-zinc-600 text-xs text-center pb-4">
          각 컬럼의 상세 정의와 결측 처리 기준은{' '}
          <Link href="/definitions" className="text-zinc-400 underline">항목 정의서</Link>에서 확인하세요
        </p>
      </div>
    </div>
  )
}
