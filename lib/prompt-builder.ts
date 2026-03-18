import type { ParsedData } from '@/types/marketing'

export const SYSTEM_PROMPT = `당신은 이커머스 마케팅 데이터 분석 전문가입니다.
데이터를 기반으로 인과관계를 도출하고 구체적인 수치를 근거로 제시합니다.
추측이 아닌 데이터 증거에 기반한 분석만 합니다. 한국어로 응답합니다.`

export function buildAnalysisPrompt(data: ParsedData, dateRange: { start: string; end: string }): string {
  const sections: string[] = [
    `다음 쇼핑몰 마케팅 데이터를 분석해주세요.`,
    `[분석 기간] ${dateRange.start} ~ ${dateRange.end}`,
    `[매출·회원 데이터]\n${JSON.stringify(data.sales, null, 0)}`,
  ]

  if (data.googleAds?.length) {
    sections.push(`[구글 애즈 데이터]\n${JSON.stringify(data.googleAds, null, 0)}`)
  }
  if (data.partnership?.length) {
    sections.push(`[파트너십 광고 데이터]\n${JSON.stringify(data.partnership, null, 0)}`)
  }
  if (data.traffic?.length) {
    sections.push(`[트래픽 데이터]\n${JSON.stringify(data.traffic, null, 0)}`)
  }

  sections.push(`
분석 항목:
1. 이상 급등/급락 구간 자동 감지 (평균 대비 2배 이상 변동)
2. 광고 채널별 일별 기여도 분석
3. 해외 트래픽과 국내 구매전환 상관관계
4. 급등 구간 주요 원인 특정 (수치 근거 포함)
5. 급락 시점 전후 변화 원인 분석
6. 실행 가능한 향후 제안 3가지

출력 형식:
## 핵심 요약
## 이상 구간 감지
## 광고 채널별 기여도 분석
## 해외 트래픽 영향 분석
## 원인 특정 및 근거
## 급락 이후 분석
## 실행 권고사항`)

  return sections.join('\n\n')
}

export function buildChatSystemPrompt(initialAnalysis: string): string {
  const trimmed = initialAnalysis.length > 3000
    ? initialAnalysis.slice(0, 3000) + '\n... (이하 생략)'
    : initialAnalysis

  return `${SYSTEM_PROMPT}

[이전 분석 결과 요약]
${trimmed}

위 분석 결과를 바탕으로 사용자의 후속 질문에 답변해주세요.
데이터 수치를 근거로 구체적으로 답변하세요.`
}
