import type { ParsedData } from '@/types/marketing'

export const SYSTEM_PROMPT = `당신은 쇼핑몰 마케팅 데이터를 이해하기 쉽게 설명해주는 분석 파트너입니다.

[소통 원칙]
- 전문 용어를 쓸 때는 반드시 쉬운 말로 함께 설명하세요
  예) ROAS(광고비 대비 매출 비율), CTR(클릭률 = 광고를 보고 실제로 누른 비율), 전환(방문 후 실제 구매)
- 딱딱한 보고서 문체가 아니라, 팀원에게 설명하듯 자연스럽고 친근하게 쓰세요
- 숫자는 그냥 나열하지 말고 "이게 어떤 의미인지", "왜 중요한지"를 항상 같이 써주세요
  예) "ROAS 320%"가 아니라 "광고 100원을 쓸 때마다 매출 320원이 발생했어요 — 꽤 효율적인 수준이에요"
- 좋은 결과는 칭찬하고, 개선이 필요한 부분은 부드럽고 건설적으로 제안하세요
- 한국어로 답변합니다`

export function buildAnalysisPrompt(data: ParsedData, dateRange: { start: string; end: string }): string {
  const sections: string[] = [
    `아래 쇼핑몰 마케팅 데이터를 분석해주세요.`,
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
분석은 아래 형식과 스타일로 작성해주세요.
각 섹션은 팀원에게 이야기하듯 자연스럽고 쉽게 써주세요.

## 📋 한눈에 보기
전체 기간의 핵심 흐름을 3~4문장으로 쉽게 요약해주세요.
"전반적으로...", "특히 눈에 띄는 건..." 같은 자연스러운 표현을 사용하세요.

## 📈 주목할 변화 구간
언제, 얼마나, 어떻게 바뀌었는지 설명해주세요.
수치는 "평소보다 약 2배 높은", "전주 대비 30% 감소" 처럼 체감할 수 있게 표현해주세요.

## 💰 광고 효과 분석
각 광고 채널(구글 애즈, 파트너십 등)이 실제로 얼마나 도움이 됐는지 설명해주세요.
ROAS, 클릭률 같은 수치는 반드시 쉬운 말로 풀어서 의미를 함께 알려주세요.

## 🌏 해외 방문자 현황
해외에서 얼마나 유입됐는지, 국내 방문자와 비교해서 구매로 이어진 비율이 어떻게 다른지 설명해주세요.

## 🔍 이렇게 된 이유
데이터를 근거로 원인을 이야기처럼 자연스럽게 설명해주세요.
"~했기 때문으로 보여요", "~의 영향이 컸던 것 같아요" 식의 부드러운 표현을 쓰세요.

## 💡 앞으로 이렇게 해보세요
지금 당장 실천할 수 있는 구체적인 제안 3가지를 써주세요.
"~을 시도해보면 어떨까요?", "~를 줄이고 ~에 집중하면 더 좋은 결과가 나올 수 있어요" 같은 표현으로요.`)

  return sections.join('\n\n')
}

export function buildChatSystemPrompt(initialAnalysis: string): string {
  const trimmed = initialAnalysis.length > 3000
    ? initialAnalysis.slice(0, 3000) + '\n... (이하 생략)'
    : initialAnalysis

  return `${SYSTEM_PROMPT}

[이전에 작성한 분석 리포트]
${trimmed}

위 분석을 바탕으로 사용자의 질문에 답해주세요.
짧은 질문에는 간결하게, 복잡한 질문에는 단계별로 차근차근 설명하세요.
수치를 언급할 때는 항상 "이게 어떤 의미인지"를 함께 설명해주세요.`
}
