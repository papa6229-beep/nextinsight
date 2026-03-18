import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { TEMPLATES, DERIVABLE_METRICS, NO_DERIVE_METRICS } from '@/lib/template-schema'

// 구분 배지
function Badge({ required }: { required: boolean | 'recommended' }) {
  if (required === true)
    return <span className="inline-block text-[10px] bg-red-900/30 text-red-300 border border-red-800/40 px-1.5 py-0.5 rounded">필수</span>
  if (required === 'recommended')
    return <span className="inline-block text-[10px] bg-amber-900/30 text-amber-400 border border-amber-800/40 px-1.5 py-0.5 rounded">선택 권장</span>
  return <span className="inline-block text-[10px] bg-zinc-800 text-zinc-500 border border-zinc-700/50 px-1.5 py-0.5 rounded">선택</span>
}

export default function DefinitionsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-10">

        {/* 헤더 */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-100">마케팅 분석 엑셀 항목 정의서</h1>
            <p className="text-zinc-500 text-sm mt-1">템플릿 입력 기준 및 결측 처리 정의서 — 파서·검증·분석 로직의 기준 문서</p>
          </div>
          <Link href="/guide">
            <Button variant="outline" className="border-zinc-700 text-zinc-300 shrink-0">← 가이드로</Button>
          </Link>
        </div>

        {/* 서두 */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
          <h2 className="text-zinc-100 font-semibold text-sm">📌 이 문서의 목적</h2>
          <ul className="text-zinc-400 text-sm space-y-1.5">
            <li>• 동일 항목을 서로 다른 기준으로 입력하면 분석 결과가 왜곡됩니다. 이 정의서는 입력 기준을 통일하기 위한 문서입니다.</li>
            <li>• 수집하지 못한 값은 빈칸으로 둘 수 있으나, 일부 분석은 제한됩니다. 어떤 분석이 제한되는지 이 문서에 명시합니다.</li>
            <li>• 숫자를 억지로 추정 입력하지 마세요. <strong className="text-zinc-200">확실한 값만 입력</strong>하는 것이 원칙입니다.</li>
            <li>• 이 문서는 향후 업로드 검증, 파서 확장, 분석 가능/불가능 판정 기준으로도 사용됩니다.</li>
          </ul>
        </section>

        {/* 공통 입력 원칙 */}
        <section className="space-y-3">
          <h2 className="text-zinc-100 font-semibold">공통 입력 원칙</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {[
                  ['날짜 형식', 'YYYY-MM-DD 형식 사용 (예: 2025-03-15)'],
                  ['금액 입력', '쉼표 없는 숫자 또는 일반 엑셀 숫자 형식 사용 (예: 3200000)'],
                  ['비율 컬럼', '퍼센트 기호 없이 숫자만 입력 (예: 3.2 → 3.2%). 퍼센트 셀 서식 불가.'],
                  ['알 수 없는 값', '임의 추정 입력 금지. 확실하지 않으면 빈칸으로 두세요.'],
                  ['0과 빈칸', '0은 실제 값이 0일 때만 사용. 모르거나 없으면 반드시 빈칸. 빈칸을 0으로 간주하면 분석이 왜곡됩니다.'],
                  ['행 단위', '한 행 = 하루/한 캠페인/한 파트너/한 이벤트 기준. 합계행, 메모행, 병합셀, 중간 제목 행 삽입 금지.'],
                  ['헤더 행', '첫 행은 컬럼명 그대로 유지. 수정·삭제·순서 변경 금지.'],
                ].map(([label, value]) => (
                  <tr key={label} className="border-b border-zinc-800 last:border-0">
                    <td className="py-2.5 px-4 text-zinc-400 text-xs font-medium w-32 shrink-0">{label}</td>
                    <td className="py-2.5 px-4 text-zinc-300 text-xs">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 템플릿별 항목 정의 */}
        {TEMPLATES.map(template => (
          <section key={template.id} id={template.id} className="space-y-4">
            <div className="flex items-center gap-3 pt-2">
              <h2 className="text-zinc-100 font-semibold text-lg">{template.label} 항목 정의</h2>
              <span className="text-zinc-600 text-sm font-mono">{template.filename}</span>
            </div>
            <p className="text-zinc-500 text-sm">{template.description}</p>

            {template.sheets.map(sheet => (
              <div key={sheet.sheetName} className="space-y-2">
                {template.sheets.length > 1 && (
                  <p className="text-xs text-zinc-400 font-medium">시트: <span className="text-blue-400">{sheet.sheetName}</span></p>
                )}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-700 bg-zinc-800/50">
                        <th className="text-left py-2 px-4 text-zinc-400 font-medium text-xs w-40">컬럼명</th>
                        <th className="text-left py-2 px-4 text-zinc-400 font-medium text-xs w-20">형식</th>
                        <th className="text-center py-2 px-3 text-zinc-400 font-medium text-xs w-20">구분</th>
                        <th className="text-left py-2 px-4 text-zinc-400 font-medium text-xs">의미 및 입력 기준</th>
                        <th className="text-left py-2 px-4 text-zinc-400 font-medium text-xs w-52">결측 시 처리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sheet.columns.map(col => (
                        <tr key={col.name} className="border-b border-zinc-800/60 last:border-0 hover:bg-zinc-800/20">
                          <td className="py-2.5 px-4 font-mono text-xs text-zinc-200 align-top">{col.name}</td>
                          <td className="py-2.5 px-4 text-xs text-zinc-500 align-top">{col.type}</td>
                          <td className="py-2.5 px-3 text-center align-top"><Badge required={col.required} /></td>
                          <td className="py-2.5 px-4 text-xs text-zinc-400 align-top leading-relaxed">
                            {col.description}
                            {col.derivable && (
                              <span className="block mt-1 text-blue-400/80">↳ 역산 가능: {col.derivable}</span>
                            )}
                            {col.noDerive && (
                              <span className="block mt-1 text-amber-500/70">↳ 역산 금지 — 실측값만 입력</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 align-top">
                            <span className="text-xs text-zinc-500 leading-relaxed">{col.missing}</span>
                            {col.warning && (
                              <span className="block mt-1 text-xs text-orange-400/80">⚠ {col.warning}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </section>
        ))}

        {/* 결측값 처리 원칙 */}
        <section className="space-y-4 pt-2">
          <h2 className="text-zinc-100 font-semibold text-lg">결측값 처리 원칙</h2>

          <div className="grid gap-4">
            {/* A. 필수값 누락 */}
            <div className="bg-zinc-900 border border-red-900/30 rounded-xl p-4 space-y-2">
              <p className="text-red-300 text-sm font-medium">A. 필수값 누락</p>
              <p className="text-zinc-400 text-sm">날짜, 핵심 식별값(캠페인명·파트너명·이벤트ID), 핵심 금액/성과값이 없으면:</p>
              <ul className="text-zinc-500 text-sm space-y-1">
                <li>• 해당 행 분석 제외 — 나머지 행은 계속 처리</li>
                <li>• 파일 전체를 막는 경우: 필수 컬럼 헤더 자체가 없는 경우 (업로드 오류 처리)</li>
              </ul>
            </div>

            {/* B. 선택값 누락 */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
              <p className="text-zinc-200 text-sm font-medium">B. 선택값 누락</p>
              <ul className="text-zinc-400 text-sm space-y-1">
                <li>• 해당 컬럼을 사용하는 분석만 생략</li>
                <li>• 나머지 분석은 계속 수행</li>
                <li>• 리포트에 "해당 데이터 없음 — ○○ 분석 제한"으로 명시</li>
              </ul>
            </div>

            {/* C. 역산 가능 */}
            <div className="bg-zinc-900 border border-blue-900/30 rounded-xl p-4 space-y-3">
              <p className="text-blue-300 text-sm font-medium">C. 역산 가능한 값 — 입력하지 않아도 계산됩니다</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-700">
                    <th className="text-left py-1.5 text-zinc-500 font-medium text-xs w-1/4">지표</th>
                    <th className="text-left py-1.5 text-zinc-500 font-medium text-xs w-1/2">계산식</th>
                    <th className="text-left py-1.5 text-zinc-500 font-medium text-xs">적용 조건</th>
                  </tr>
                </thead>
                <tbody>
                  {DERIVABLE_METRICS.map(m => (
                    <tr key={m.metric} className="border-b border-zinc-800/50 last:border-0">
                      <td className="py-2 text-zinc-300 font-mono text-xs">{m.metric}</td>
                      <td className="py-2 text-blue-400/80 text-xs">{m.formula}</td>
                      <td className="py-2 text-zinc-500 text-xs">{m.condition}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-zinc-600 text-xs">원천값이 없거나 분모가 0이면 역산하지 않습니다.</p>
            </div>

            {/* D. 역산 금지 */}
            <div className="bg-zinc-900 border border-amber-900/30 rounded-xl p-4 space-y-3">
              <p className="text-amber-400 text-sm font-medium">D. 역산 금지 항목 — 반드시 실측값 입력, 시스템 추정 불가</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-700">
                    <th className="text-left py-1.5 text-zinc-500 font-medium text-xs w-1/3">항목</th>
                    <th className="text-left py-1.5 text-zinc-500 font-medium text-xs">역산 금지 이유</th>
                  </tr>
                </thead>
                <tbody>
                  {NO_DERIVE_METRICS.map(m => (
                    <tr key={m.metric} className="border-b border-zinc-800/50 last:border-0">
                      <td className="py-2 text-zinc-300 font-mono text-xs">{m.metric}</td>
                      <td className="py-2 text-zinc-500 text-xs">{m.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* E. 0과 빈칸 */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
              <p className="text-zinc-200 text-sm font-medium">E. 0과 빈칸의 차이</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-800/40 rounded-lg p-3 space-y-1">
                  <p className="text-zinc-300 text-xs font-medium">0 입력</p>
                  <p className="text-zinc-500 text-xs">실제 값이 0일 때만 사용<br/>예: 전환수가 진짜 0건인 날</p>
                </div>
                <div className="bg-zinc-800/40 rounded-lg p-3 space-y-1">
                  <p className="text-zinc-300 text-xs font-medium">빈칸 처리</p>
                  <p className="text-zinc-500 text-xs">수집하지 못했거나 알 수 없을 때<br/>빈칸을 0으로 간주하면 왜곡 발생</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 분석 제한 안내 */}
        <section className="space-y-4 pt-2">
          <h2 className="text-zinc-100 font-semibold text-lg">입력 누락 시 분석 제한 안내</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700 bg-zinc-800/50">
                  <th className="text-left py-2.5 px-4 text-zinc-400 font-medium text-xs">상황</th>
                  <th className="text-left py-2.5 px-4 text-zinc-400 font-medium text-xs">시스템 처리 방식</th>
                  <th className="text-left py-2.5 px-4 text-zinc-400 font-medium text-xs">분석 영향</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['전환수 없음', '해당 컬럼 기반 분석 생략', 'CPA·전환 효율 분석 제한'],
                  ['광고귀속_매출 없음', 'ROAS 직접 계산 불가', '입력된 ROAS 컬럼만 참고'],
                  ['전체세션과 국내/해외 불일치', '불일치 경고 표시 후 참고치 처리', '국가/세션 비율 해석 제한'],
                  ['이벤트ID 없음 (일별성과)', '마스터 연결 불가', '이벤트 중첩·기여 분석 불가'],
                  ['보상기준 없음', '정산형 해석 약화', '파트너 효율 제한 해석'],
                  ['클릭수 < 랜딩도달수', '트래킹 이상치 경고', '해당 파트너 성과 강한 판정 유보'],
                  ['취소환불_차감금액 없음', '원시 성과 기준으로만 분석', '이벤트·파트너 효율 과대평가 가능성 경고'],
                  ['광고유입/자연유입/직접유입 모두 없음', '채널 분석 섹션 생략', '채널 기여 분석 전면 불가'],
                  ['장바구니/결제진입 없음', '퍼널 분석 생략', '방문→구매 퍼널 단계 분석 불가'],
                  ['실매출액 없음', '일별_매출액 기준으로 분석', '순매출 관점 분석 제한'],
                ].map(([situation, handling, impact]) => (
                  <tr key={situation} className="border-b border-zinc-800/60 last:border-0">
                    <td className="py-2.5 px-4 text-zinc-300 text-xs align-top">{situation}</td>
                    <td className="py-2.5 px-4 text-zinc-500 text-xs align-top">{handling}</td>
                    <td className="py-2.5 px-4 text-zinc-400 text-xs align-top">{impact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="text-zinc-700 text-xs text-center pb-6">
          이 정의서는 템플릿과 함께 한 세트로 관리됩니다 —{' '}
          <Link href="/guide" className="text-zinc-500 underline">가이드 페이지</Link>에서 템플릿을 다운로드하세요
        </p>
      </div>
    </div>
  )
}
