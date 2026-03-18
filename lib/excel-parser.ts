import * as XLSX from 'xlsx'
import type {
  ParsedData, SalesRow, GoogleAdsRow, PartnershipRow, TrafficRow,
  EventMasterRow, EventDailyRow, EventCouponData, FileType
} from '@/types/marketing'

const MAX_ROWS = 10_000
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

// 다양한 날짜 형식을 YYYY-MM-DD로 정규화
export function normalizeDate(raw: unknown): string {
  // JS Date 객체 (cellDates: true 또는 xlsx 버전에 따라 반환될 수 있음)
  if (raw instanceof Date) {
    const y = raw.getFullYear()
    const m = String(raw.getMonth() + 1).padStart(2, '0')
    const d = String(raw.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // Excel 시리얼 날짜 (숫자)
  if (typeof raw === 'number') {
    const date = XLSX.SSF.parse_date_code(raw)
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
  }

  const str = String(raw).trim()

  // YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD (구분자: -, /, .)
  // 시간 부분 있어도 앞 날짜만 추출 (예: 2025-01-01 00:00:00)
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`
  }

  // YYYYMMDD (구분자 없음)
  const compactMatch = str.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (compactMatch) {
    return `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`
  }

  // MM/DD/YYYY
  const usMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (usMatch) {
    return `${usMatch[3]}-${usMatch[1].padStart(2, '0')}-${usMatch[2].padStart(2, '0')}`
  }

  // 한국어: 2025년 2월 27일
  const krMatch = str.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/)
  if (krMatch) {
    return `${krMatch[1]}-${krMatch[2].padStart(2, '0')}-${krMatch[3].padStart(2, '0')}`
  }

  throw new Error(`날짜 파싱 실패: ${str}`)
}

function toNumber(v: unknown): number | undefined {
  if (v === null || v === undefined || v === '') return undefined
  const n = Number(v)
  return isNaN(n) ? undefined : n
}

function requiredNumber(v: unknown, col: string): number {
  const n = toNumber(v)
  if (n === undefined) throw new Error(`필수 숫자 컬럼 누락 또는 오류: ${col}`)
  return n
}

function toOptionalString(v: unknown): string | undefined {
  if (v === null || v === undefined || v === '') return undefined
  return String(v)
}

export function validateFileSize(buffer: ArrayBuffer): void {
  if (buffer.byteLength > MAX_FILE_SIZE) {
    throw Object.assign(new Error('파일 크기가 5MB를 초과합니다'), { code: 'FILE_TOO_LARGE' })
  }
}

export function parseSales(buffer: ArrayBuffer): SalesRow[] {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

  if (!rows.length) throw Object.assign(new Error('데이터가 없습니다'), { code: 'PARSE_ERROR' })

  const required = ['날짜', '일별_매출액', '주문_건수', '신규_회원_가입수']
  for (const col of required) {
    if (!(col in rows[0])) {
      throw Object.assign(new Error(`필수 컬럼 누락: ${col}`), { code: 'MISSING_REQUIRED_COLUMN' })
    }
  }

  return rows.slice(0, MAX_ROWS).map((r, i) => {
    try {
      const 주문건수 = requiredNumber(r['주문_건수'], '주문_건수')
      const 일별매출 = requiredNumber(r['일별_매출액'], '일별_매출액')
      // 평균_객단가: 데이터에 있으면 그대로, 없으면 주문건수가 0 아닌 경우에만 역산
      const 평균객단가_raw = toNumber(r['평균_객단가'])
      const 평균객단가 = 평균객단가_raw !== undefined
        ? 평균객단가_raw
        : (주문건수 > 0 ? parseFloat((일별매출 / 주문건수).toFixed(0)) : undefined)

      return {
        날짜: normalizeDate(r['날짜']),
        일별_매출액: 일별매출,
        주문_건수: 주문건수,
        신규_회원_가입수: requiredNumber(r['신규_회원_가입수'], '신규_회원_가입수'),
        누적_회원수: toNumber(r['누적_회원수']),
        구매_전환율: toNumber(r['구매_전환율']),
        평균_객단가: 평균객단가,
        반품_취소_건수: toNumber(r['반품_취소_건수']),
        반품_취소_금액: toNumber(r['반품_취소_금액']),
        실매출액: toNumber(r['실매출액']),
        쿠폰_사용_주문수: toNumber(r['쿠폰_사용_주문수']),
        쿠폰_사용_금액: toNumber(r['쿠폰_사용_금액']),
        신규_구매자수: toNumber(r['신규_구매자수']),
        기존_구매자수: toNumber(r['기존_구매자수']),
        상품_판매_수량: toNumber(r['상품_판매_수량']),
        비고: toOptionalString(r['비고']),
      }
    } catch (e) {
      throw Object.assign(new Error(`${i + 2}행 파싱 오류: ${(e as Error).message}`), { code: 'PARSE_ERROR' })
    }
  })
}

export function parseGoogleAds(buffer: ArrayBuffer): GoogleAdsRow[] {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

  if (!rows.length) throw Object.assign(new Error('데이터가 없습니다'), { code: 'PARSE_ERROR' })

  const required = ['날짜', '캠페인명', '노출수', '클릭수', '광고비_지출']
  for (const col of required) {
    if (!(col in rows[0])) {
      throw Object.assign(new Error(`필수 컬럼 누락: ${col}`), { code: 'MISSING_REQUIRED_COLUMN' })
    }
  }

  return rows.slice(0, MAX_ROWS).map((r, i) => {
    try {
      const 노출수 = requiredNumber(r['노출수'], '노출수')
      const 클릭수 = requiredNumber(r['클릭수'], '클릭수')
      const 광고비 = requiredNumber(r['광고비_지출'], '광고비_지출')
      const 전환수 = toNumber(r['전환수'])
      const 광고귀속매출 = toNumber(r['광고귀속_매출'])

      // CTR: 항상 역산 (클릭/노출 × 100)
      const CTR = 노출수 > 0 ? parseFloat(((클릭수 / 노출수) * 100).toFixed(2)) : 0

      // CPC: 데이터에 있으면 그대로, 없으면 클릭수 > 0인 경우 역산
      const CPC_raw = toNumber(r['CPC'])
      const CPC = CPC_raw !== undefined
        ? CPC_raw
        : (클릭수 > 0 ? parseFloat((광고비 / 클릭수).toFixed(0)) : undefined)

      // CPA: 데이터에 있으면 그대로, 없으면 전환수 > 0인 경우 역산
      const CPA_raw = toNumber(r['CPA'])
      const CPA = CPA_raw !== undefined
        ? CPA_raw
        : (전환수 !== undefined && 전환수 > 0 ? parseFloat((광고비 / 전환수).toFixed(0)) : undefined)

      // ROAS: 데이터에 있으면 그대로, 없으면 광고귀속매출과 광고비 모두 있는 경우 역산
      const ROAS_raw = toNumber(r['ROAS'])
      const ROAS = ROAS_raw !== undefined
        ? ROAS_raw
        : (광고귀속매출 !== undefined && 광고비 > 0
            ? parseFloat((광고귀속매출 / 광고비).toFixed(2))
            : undefined)

      return {
        날짜: normalizeDate(r['날짜']),
        광고매체: toOptionalString(r['광고매체']),
        광고유형: toOptionalString(r['광고유형']),
        캠페인명: String(r['캠페인명']),
        광고그룹명: toOptionalString(r['광고그룹명']),
        소재명: toOptionalString(r['소재명']),
        노출수,
        클릭수,
        광고비_지출: 광고비,
        전환수,
        광고귀속_매출: 광고귀속매출,
        CPC,
        CPA,
        CTR,
        ROAS,
        전환기준: toOptionalString(r['전환기준']),
        성과귀속기준: toOptionalString(r['성과귀속기준']),
        디바이스: toOptionalString(r['디바이스']),
        유입_국가: toOptionalString(r['유입_국가']),
        신규전환수: toNumber(r['신규전환수']),
        기존전환수: toNumber(r['기존전환수']),
        비고: toOptionalString(r['비고']),
      }
    } catch (e) {
      throw Object.assign(new Error(`${i + 2}행 파싱 오류: ${(e as Error).message}`), { code: 'PARSE_ERROR' })
    }
  })
}

export function parsePartnership(buffer: ArrayBuffer): PartnershipRow[] {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

  if (!rows.length) throw Object.assign(new Error('데이터가 없습니다'), { code: 'PARSE_ERROR' })

  const required = ['날짜', '파트너명', '유입_클릭수', '회원가입_전환수', '구매_전환수']
  for (const col of required) {
    if (!(col in rows[0])) {
      throw Object.assign(new Error(`필수 컬럼 누락: ${col}`), { code: 'MISSING_REQUIRED_COLUMN' })
    }
  }

  return rows.slice(0, MAX_ROWS).map((r, i) => {
    try {
      return {
        날짜: normalizeDate(r['날짜']),
        파트너명: String(r['파트너명']),
        캠페인명: toOptionalString(r['캠페인명']),
        유입_클릭수: requiredNumber(r['유입_클릭수'], '유입_클릭수'),
        랜딩페이지_도달수: toNumber(r['랜딩페이지_도달수']),
        회원가입_전환수: requiredNumber(r['회원가입_전환수'], '회원가입_전환수'),
        구매_전환수: requiredNumber(r['구매_전환수'], '구매_전환수'),
        파트너_발생매출: toNumber(r['파트너_발생매출']),
        지급_보상액: toNumber(r['지급_보상액']),
        보상방식: toOptionalString(r['보상방식']),
        보상기준: toOptionalString(r['보상기준']),
        확정전환수: toNumber(r['확정전환수']),
        취소_차감_건수: toNumber(r['취소_차감_건수']),
        신규회원_기여수: toNumber(r['신규회원_기여수']),
        랜딩페이지_URL: toOptionalString(r['랜딩페이지_URL']),
        비고: toOptionalString(r['비고']),
      }
    } catch (e) {
      throw Object.assign(new Error(`${i + 2}행 파싱 오류: ${(e as Error).message}`), { code: 'PARSE_ERROR' })
    }
  })
}

export function parseTraffic(buffer: ArrayBuffer): TrafficRow[] {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

  if (!rows.length) throw Object.assign(new Error('데이터가 없습니다'), { code: 'PARSE_ERROR' })

  const required = ['날짜', '전체_세션수', '국내_세션수', '해외_세션수']
  for (const col of required) {
    if (!(col in rows[0])) {
      throw Object.assign(new Error(`필수 컬럼 누락: ${col}`), { code: 'MISSING_REQUIRED_COLUMN' })
    }
  }

  return rows.slice(0, MAX_ROWS).map((r, i) => {
    try {
      return {
        날짜: normalizeDate(r['날짜']),
        전체_세션수: requiredNumber(r['전체_세션수'], '전체_세션수'),
        국내_세션수: requiredNumber(r['국내_세션수'], '국내_세션수'),
        해외_세션수: requiredNumber(r['해외_세션수'], '해외_세션수'),
        신규_방문자수: toNumber(r['신규_방문자수']),
        재방문자수: toNumber(r['재방문자수']),
        평균_세션_시간: toNumber(r['평균_세션_시간']),
        이탈률: toNumber(r['이탈률']),
        페이지뷰: toNumber(r['페이지뷰']),
        광고유입_세션수: toNumber(r['광고유입_세션수']),
        자연유입_세션수: toNumber(r['자연유입_세션수']),
        직접유입_세션수: toNumber(r['직접유입_세션수']),
        모바일_세션수: toNumber(r['모바일_세션수']),
        PC_세션수: toNumber(r['PC_세션수']),
        대표_랜딩페이지: toOptionalString(r['대표_랜딩페이지']),
        장바구니_진입수: toNumber(r['장바구니_진입수']),
        결제진입수: toNumber(r['결제진입수']),
        비고: toOptionalString(r['비고']),
      }
    } catch (e) {
      throw Object.assign(new Error(`${i + 2}행 파싱 오류: ${(e as Error).message}`), { code: 'PARSE_ERROR' })
    }
  })
}

// 이벤트·쿠폰: 2시트(이벤트_마스터 + 이벤트_일별성과) 파싱
export function parseEventCoupon(buffer: ArrayBuffer): EventCouponData {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false })

  // 시트명으로 탐색 (대소문자 무관, 공백 허용)
  function findSheet(keywords: string[]): XLSX.WorkSheet | null {
    for (const name of wb.SheetNames) {
      const lower = name.replace(/\s/g, '').toLowerCase()
      if (keywords.some(kw => lower.includes(kw))) return wb.Sheets[name]
    }
    return null
  }

  // 이벤트_마스터 시트
  const masterSheet = findSheet(['마스터', 'master', 'eventmaster'])
  if (!masterSheet) {
    throw Object.assign(
      new Error('이벤트_마스터 시트를 찾을 수 없습니다 (시트명에 "마스터" 또는 "master" 포함 필요)'),
      { code: 'PARSE_ERROR' }
    )
  }
  const masterRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(masterSheet, { defval: '' })

  const masterRequired = ['이벤트ID', '이벤트명', '시작일', '종료일']
  if (masterRows.length > 0) {
    for (const col of masterRequired) {
      if (!(col in masterRows[0])) {
        throw Object.assign(new Error(`이벤트_마스터 필수 컬럼 누락: ${col}`), { code: 'MISSING_REQUIRED_COLUMN' })
      }
    }
  }

  const master: EventMasterRow[] = masterRows.slice(0, MAX_ROWS).map((r, i) => {
    try {
      return {
        이벤트ID: String(r['이벤트ID']),
        이벤트명: String(r['이벤트명']),
        이벤트유형: toOptionalString(r['이벤트유형']),
        시작일: normalizeDate(r['시작일']),
        종료일: normalizeDate(r['종료일']),
        적용채널: toOptionalString(r['적용채널']),
        대상회원: toOptionalString(r['대상회원']),
        혜택내용: toOptionalString(r['혜택내용']),
        최소주문금액: toNumber(r['최소주문금액']),
        쿠폰코드: toOptionalString(r['쿠폰코드']),
        중복사용가능여부: toOptionalString(r['중복사용가능여부']),
        비용부담주체: toOptionalString(r['비용부담주체']),
        비고: toOptionalString(r['비고']),
      }
    } catch (e) {
      throw Object.assign(new Error(`이벤트_마스터 ${i + 2}행 파싱 오류: ${(e as Error).message}`), { code: 'PARSE_ERROR' })
    }
  })

  // 이벤트_일별성과 시트
  const dailySheet = findSheet(['일별성과', '일별', 'daily', 'eventdaily'])
  if (!dailySheet) {
    throw Object.assign(
      new Error('이벤트_일별성과 시트를 찾을 수 없습니다 (시트명에 "일별성과" 또는 "daily" 포함 필요)'),
      { code: 'PARSE_ERROR' }
    )
  }
  const dailyRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(dailySheet, { defval: '' })

  const dailyRequired = ['날짜', '이벤트ID', '이벤트명']
  if (dailyRows.length > 0) {
    for (const col of dailyRequired) {
      if (!(col in dailyRows[0])) {
        throw Object.assign(new Error(`이벤트_일별성과 필수 컬럼 누락: ${col}`), { code: 'MISSING_REQUIRED_COLUMN' })
      }
    }
  }

  const daily: EventDailyRow[] = dailyRows.slice(0, MAX_ROWS).map((r, i) => {
    try {
      return {
        날짜: normalizeDate(r['날짜']),
        이벤트ID: String(r['이벤트ID']),
        이벤트명: toOptionalString(r['이벤트명']),
        발급수: toNumber(r['발급수']),
        다운로드수: toNumber(r['다운로드수']),
        사용수: toNumber(r['사용수']),
        사용주문수: toNumber(r['사용주문수']),
        이벤트_적용매출: toNumber(r['이벤트_적용매출']),
        할인금액: toNumber(r['할인금액']),
        순매출기여: toNumber(r['순매출기여']),
        신규회원사용수: toNumber(r['신규회원사용수']),
        기존회원사용수: toNumber(r['기존회원사용수']),
        취소환불_차감금액: toNumber(r['취소환불_차감금액']),
      }
    } catch (e) {
      throw Object.assign(new Error(`이벤트_일별성과 ${i + 2}행 파싱 오류: ${(e as Error).message}`), { code: 'PARSE_ERROR' })
    }
  })

  return { master, daily }
}

export const PARSERS: Omit<Record<FileType, (b: ArrayBuffer) => unknown>, 'eventCoupon'> & {
  eventCoupon: (b: ArrayBuffer) => EventCouponData
} = {
  sales: parseSales,
  googleAds: parseGoogleAds,
  partnership: parsePartnership,
  traffic: parseTraffic,
  eventCoupon: parseEventCoupon,
}
