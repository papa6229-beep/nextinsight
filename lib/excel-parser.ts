import * as XLSX from 'xlsx'
import type { ParsedData, SalesRow, GoogleAdsRow, PartnershipRow, TrafficRow, FileType } from '@/types/marketing'

const MAX_ROWS = 10_000
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

// 다양한 날짜 형식을 YYYY-MM-DD로 정규화
export function normalizeDate(raw: unknown): string {
  if (typeof raw === 'number') {
    // Excel 시리얼 날짜
    const date = XLSX.SSF.parse_date_code(raw)
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
  }
  const str = String(raw).trim()
  // YYYY-MM-DD 또는 YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`
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
      return {
        날짜: normalizeDate(r['날짜']),
        일별_매출액: requiredNumber(r['일별_매출액'], '일별_매출액'),
        주문_건수: requiredNumber(r['주문_건수'], '주문_건수'),
        신규_회원_가입수: requiredNumber(r['신규_회원_가입수'], '신규_회원_가입수'),
        누적_회원수: toNumber(r['누적_회원수']),
        구매_전환율: toNumber(r['구매_전환율']),
        평균_객단가: toNumber(r['평균_객단가']),
        반품_취소_건수: toNumber(r['반품_취소_건수']),
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
      return {
        날짜: normalizeDate(r['날짜']),
        캠페인명: String(r['캠페인명']),
        노출수,
        클릭수,
        광고비_지출: requiredNumber(r['광고비_지출'], '광고비_지출'),
        전환수: toNumber(r['전환수']),
        CPA: toNumber(r['CPA']),
        ROAS: toNumber(r['ROAS']),
        유입_국가: r['유입_국가'] ? String(r['유입_국가']) : undefined,
        CTR: 노출수 > 0 ? parseFloat(((클릭수 / 노출수) * 100).toFixed(2)) : 0,
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
        유입_클릭수: requiredNumber(r['유입_클릭수'], '유입_클릭수'),
        랜딩페이지_도달수: toNumber(r['랜딩페이지_도달수']),
        회원가입_전환수: requiredNumber(r['회원가입_전환수'], '회원가입_전환수'),
        구매_전환수: requiredNumber(r['구매_전환수'], '구매_전환수'),
        파트너_발생매출: toNumber(r['파트너_발생매출']),
        지급_보상액: toNumber(r['지급_보상액']),
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
      }
    } catch (e) {
      throw Object.assign(new Error(`${i + 2}행 파싱 오류: ${(e as Error).message}`), { code: 'PARSE_ERROR' })
    }
  })
}

export const PARSERS: Record<FileType, (b: ArrayBuffer) => unknown[]> = {
  sales: parseSales,
  googleAds: parseGoogleAds,
  partnership: parsePartnership,
  traffic: parseTraffic,
}
