import type { ParsedData, ChatMessage } from '@/types/marketing'

const MAX_CHAT_TURNS = 10
const MAX_INITIAL_ANALYSIS_CHARS = 3000
const MAX_STORAGE_BYTES = 4 * 1024 * 1024 // 4MB

// 채팅 히스토리를 최근 N턴으로 자름
export function trimMessages(messages: ChatMessage[]): ChatMessage[] {
  if (messages.length <= MAX_CHAT_TURNS) return messages
  return messages.slice(messages.length - MAX_CHAT_TURNS)
}

// 초기 분석 결과를 3000자로 자름
export function trimInitialAnalysis(text: string): string {
  if (text.length <= MAX_INITIAL_ANALYSIS_CHARS) return text
  return text.slice(0, MAX_INITIAL_ANALYSIS_CHARS) + '\n... (이하 생략)'
}

// 원본 row 데이터를 일별 집계 요약으로 압축 (Claude 컨텍스트 절약)
export function compressDataForChat(data: ParsedData): ParsedData {
  // 이미 작으면 그대로
  const raw = JSON.stringify(data)
  if (raw.length < 50_000) return data

  // 구글 애즈: 날짜별 합산만 남김
  const compressedGoogleAds = data.googleAds
    ? Array.from(
        data.googleAds.reduce((map, r) => {
          const key = r.날짜
          const existing = map.get(key) ?? {
            날짜: key, 캠페인명: '합산', 노출수: 0, 클릭수: 0, 광고비_지출: 0
          }
          existing.노출수 += r.노출수
          existing.클릭수 += r.클릭수
          existing.광고비_지출 += r.광고비_지출
          map.set(key, existing)
          return map
        }, new Map()).values()
      )
    : undefined

  return { ...data, googleAds: compressedGoogleAds }
}

// sessionStorage 저장 전 크기 검사 및 최적화
export function prepareForStorage(data: ParsedData): ParsedData {
  const size = new TextEncoder().encode(JSON.stringify(data)).length
  if (size <= MAX_STORAGE_BYTES) return data

  // 숫자 컬럼만 남기고 문자열 컬럼 제거
  return {
    ...data,
    googleAds: data.googleAds?.map(r => ({
      날짜: r.날짜, 캠페인명: r.캠페인명, 노출수: r.노출수,
      클릭수: r.클릭수, 광고비_지출: r.광고비_지출,
      전환수: r.전환수, ROAS: r.ROAS, CTR: r.CTR,
    })),
    partnership: data.partnership?.map(r => ({
      날짜: r.날짜, 파트너명: r.파트너명, 유입_클릭수: r.유입_클릭수,
      회원가입_전환수: r.회원가입_전환수, 구매_전환수: r.구매_전환수,
      파트너_발생매출: r.파트너_발생매출,
    })),
  }
}
