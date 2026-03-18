// 날짜는 항상 ISO 8601 문자열 "YYYY-MM-DD"
export interface SalesRow {
  날짜: string
  일별_매출액: number
  주문_건수: number
  신규_회원_가입수: number
  누적_회원수?: number
  구매_전환율?: number
  평균_객단가?: number
  반품_취소_건수?: number
}

export interface GoogleAdsRow {
  날짜: string
  캠페인명: string
  노출수: number
  클릭수: number
  광고비_지출: number
  전환수?: number
  CPA?: number
  ROAS?: number
  유입_국가?: string
  CTR?: number // 서버에서 계산: 클릭수/노출수
}

export interface PartnershipRow {
  날짜: string
  파트너명: string
  유입_클릭수: number
  랜딩페이지_도달수?: number
  회원가입_전환수: number
  구매_전환수: number
  파트너_발생매출?: number
  지급_보상액?: number
}

export interface TrafficRow {
  날짜: string
  전체_세션수: number
  국내_세션수: number
  해외_세션수: number
  신규_방문자수?: number
  재방문자수?: number
  평균_세션_시간?: number
  이탈률?: number
  페이지뷰?: number
}

export interface ParsedData {
  sales: SalesRow[]
  googleAds?: GoogleAdsRow[]
  partnership?: PartnershipRow[]
  traffic?: TrafficRow[]
}

export interface DataSummary {
  dateRange: { start: string; end: string }
  rowCounts: Partial<Record<keyof ParsedData, number>>
  uploadedFiles: (keyof ParsedData)[]
}

export interface UploadResponse {
  data: ParsedData
  summary: DataSummary
}

export interface SessionData {
  data: ParsedData
  summary: DataSummary
  timestamp: string // ISO 8601
}

export type FileType = 'sales' | 'googleAds' | 'partnership' | 'traffic'

export type UploadErrorCode =
  | 'INVALID_FILE_TYPE'
  | 'FILE_TOO_LARGE'
  | 'MISSING_REQUIRED_COLUMN'
  | 'PARSE_ERROR'
  | 'NO_SALES_FILE'
  | 'ANTHROPIC_ERROR'
  | 'DATA_TOO_LARGE'
  | 'STREAM_INTERRUPTED'

export interface ApiError {
  error: string
  code: UploadErrorCode
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}
