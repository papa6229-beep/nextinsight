// 날짜는 항상 ISO 8601 문자열 "YYYY-MM-DD"

// ─── 매출·회원 ─────────────────────────────────────────────────────────────
export interface SalesRow {
  날짜: string
  일별_매출액: number      // 필수
  주문_건수: number        // 필수
  신규_회원_가입수: number  // 필수
  누적_회원수?: number
  구매_전환율?: number     // 단위: % (예: 3.2)
  평균_객단가?: number     // 역산 가능: 일별_매출액 / 주문_건수
  반품_취소_건수?: number
  반품_취소_금액?: number
  실매출액?: number        // 역산 금지 — 실측값만
  쿠폰_사용_주문수?: number
  쿠폰_사용_금액?: number
  신규_구매자수?: number
  기존_구매자수?: number
  상품_판매_수량?: number
  비고?: string
}

// ─── 구글 애즈 ──────────────────────────────────────────────────────────────
export interface GoogleAdsRow {
  날짜: string
  광고매체?: string
  광고유형?: string
  캠페인명: string          // 필수
  광고그룹명?: string
  소재명?: string
  노출수: number            // 필수
  클릭수: number            // 필수
  광고비_지출: number       // 필수
  전환수?: number
  광고귀속_매출?: number    // 역산 금지(플랫폼 귀속값) — 있으면 ROAS 역산에 사용
  CPC?: number             // 역산 가능: 광고비_지출 / 클릭수
  CPA?: number             // 역산 가능: 광고비_지출 / 전환수
  CTR?: number             // 역산: 클릭수 / 노출수 × 100 (파서에서 자동 계산)
  ROAS?: number            // 역산 가능: 광고귀속_매출 / 광고비_지출
  전환기준?: string         // 역산 금지
  성과귀속기준?: string     // 역산 금지
  디바이스?: string
  유입_국가?: string
  신규전환수?: number
  기존전환수?: number
  비고?: string
}

// ─── 파트너십 ───────────────────────────────────────────────────────────────
export interface PartnershipRow {
  날짜: string
  파트너명: string          // 필수
  캠페인명?: string
  유입_클릭수: number       // 필수
  랜딩페이지_도달수?: number
  회원가입_전환수: number   // 필수
  구매_전환수: number       // 필수 (원시 전환 — 확정전환수 없으면 이 기준)
  파트너_발생매출?: number
  지급_보상액?: number
  보상방식?: string         // 역산 금지
  보상기준?: string         // 역산 금지
  확정전환수?: number       // 역산 금지 — 정산 인정 최종값
  취소_차감_건수?: number
  신규회원_기여수?: number
  랜딩페이지_URL?: string
  비고?: string
}

// ─── 트래픽 ─────────────────────────────────────────────────────────────────
export interface TrafficRow {
  날짜: string
  전체_세션수: number       // 필수 — 비율 분모 기준
  국내_세션수: number       // 필수
  해외_세션수: number       // 필수
  신규_방문자수?: number
  재방문자수?: number
  평균_세션_시간?: number   // 단위: 초
  이탈률?: number           // 단위: % (예: 42.5)
  페이지뷰?: number
  광고유입_세션수?: number
  자연유입_세션수?: number
  직접유입_세션수?: number
  모바일_세션수?: number
  PC_세션수?: number
  대표_랜딩페이지?: string  // 역산 금지
  장바구니_진입수?: number
  결제진입수?: number
  비고?: string
}

// ─── 이벤트·쿠폰 (2시트) ────────────────────────────────────────────────────

// 시트 1: 이벤트_마스터 — 이벤트 정의·기본 정보
export interface EventMasterRow {
  이벤트ID: string          // 필수 — 일별성과 시트와 연결 키, 고유값
  이벤트명: string          // 필수
  이벤트유형?: string       // 쿠폰, 감사제, 기간한정 할인 등
  시작일: string            // 필수 YYYY-MM-DD
  종료일: string            // 필수 YYYY-MM-DD
  적용채널?: string
  대상회원?: string         // 역산 금지
  혜택내용?: string
  최소주문금액?: number
  쿠폰코드?: string
  중복사용가능여부?: string  // Y / N
  비용부담주체?: string      // 역산 금지
  비고?: string
}

// 시트 2: 이벤트_일별성과 — 날짜별 이벤트 성과
export interface EventDailyRow {
  날짜: string              // 필수
  이벤트ID: string          // 필수 — 마스터와 연결 키
  이벤트명?: string
  발급수?: number
  다운로드수?: number
  사용수?: number
  사용주문수?: number
  이벤트_적용매출?: number
  할인금액?: number
  순매출기여?: number       // 역산 금지
  신규회원사용수?: number
  기존회원사용수?: number
  취소환불_차감금액?: number
}

export interface EventCouponData {
  master: EventMasterRow[]
  daily: EventDailyRow[]
}

// ─── 공통 ────────────────────────────────────────────────────────────────────
export interface ParsedData {
  sales: SalesRow[]
  googleAds?: GoogleAdsRow[]
  partnership?: PartnershipRow[]
  traffic?: TrafficRow[]
  eventCoupon?: EventCouponData
}

export interface DataSummary {
  dateRange: { start: string; end: string }
  rowCounts: Partial<Record<'sales' | 'googleAds' | 'partnership' | 'traffic', number>>
  eventCouponCounts?: { master: number; daily: number }
  uploadedFiles: FileType[]
}

export interface UploadResponse {
  data: ParsedData
  summary: DataSummary
}

export interface SessionData {
  data: ParsedData
  summary: DataSummary
  timestamp: string
}

export type FileType = 'sales' | 'googleAds' | 'partnership' | 'traffic' | 'eventCoupon'

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
