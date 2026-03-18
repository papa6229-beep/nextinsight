import { NextRequest, NextResponse } from 'next/server'
import { parseSales, parseGoogleAds, parsePartnership, parseTraffic, parseEventCoupon, validateFileSize } from '@/lib/excel-parser'
import { getDateRange } from '@/lib/data-transformer'
import type { ParsedData, FileType, ApiError } from '@/types/marketing'

// 파일명에서 파일 타입 추론
function detectFileType(filename: string): FileType | null {
  const lower = filename.toLowerCase()
  if (lower.includes('sales') || lower.includes('매출')) return 'sales'
  if (lower.includes('google') || lower.includes('ads') || lower.includes('구글')) return 'googleAds'
  if (lower.includes('partner') || lower.includes('파트너')) return 'partnership'
  if (lower.includes('traffic') || lower.includes('트래픽')) return 'traffic'
  if (lower.includes('event') || lower.includes('이벤트') || lower.includes('쿠폰') || lower.includes('coupon')) return 'eventCoupon'
  return null
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const files = formData.getAll('files') as File[]

    if (!files.length) {
      return NextResponse.json<ApiError>(
        { error: '업로드된 파일이 없습니다', code: 'NO_SALES_FILE' },
        { status: 400 }
      )
    }

    const parsed: Partial<ParsedData> = {}

    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (ext !== 'xlsx' && ext !== 'csv') {
        return NextResponse.json<ApiError>(
          { error: `지원하지 않는 파일 형식: ${file.name} (.xlsx 또는 .csv만 가능)`, code: 'INVALID_FILE_TYPE' },
          { status: 400 }
        )
      }

      const buffer = await file.arrayBuffer()

      try {
        validateFileSize(buffer)
      } catch {
        return NextResponse.json<ApiError>(
          { error: `파일 크기 초과: ${file.name} (최대 5MB)`, code: 'FILE_TOO_LARGE' },
          { status: 400 }
        )
      }

      // formData의 fileType 필드 또는 파일명으로 타입 추론
      const fileTypeHint = formData.get(`fileType_${file.name}`) as FileType | null
      const fileType = fileTypeHint ?? detectFileType(file.name)

      if (!fileType) {
        return NextResponse.json<ApiError>(
          { error: `파일 유형을 인식할 수 없습니다: ${file.name}`, code: 'PARSE_ERROR' },
          { status: 400 }
        )
      }

      try {
        if (fileType === 'sales') parsed.sales = parseSales(buffer)
        else if (fileType === 'googleAds') parsed.googleAds = parseGoogleAds(buffer)
        else if (fileType === 'partnership') parsed.partnership = parsePartnership(buffer)
        else if (fileType === 'traffic') parsed.traffic = parseTraffic(buffer)
        else if (fileType === 'eventCoupon') parsed.eventCoupon = parseEventCoupon(buffer)
      } catch (e: unknown) {
        const err = e as Error & { code?: string }
        return NextResponse.json<ApiError>(
          { error: err.message, code: (err.code as ApiError['code']) ?? 'PARSE_ERROR' },
          { status: 422 }
        )
      }
    }

    if (!parsed.sales) {
      return NextResponse.json<ApiError>(
        { error: '매출·회원 데이터(sales) 파일이 필요합니다', code: 'NO_SALES_FILE' },
        { status: 400 }
      )
    }

    const data = parsed as ParsedData
    const dateRange = getDateRange(data)
    const uploadedFiles = Object.keys(parsed) as FileType[]

    // rowCounts: eventCoupon은 master/daily 각각 따로 집계
    const rowCounts: Record<string, number> = {}
    for (const k of uploadedFiles) {
      if (k === 'eventCoupon') continue
      rowCounts[k] = (data[k] as unknown[])?.length ?? 0
    }

    const eventCouponCounts = parsed.eventCoupon
      ? { master: parsed.eventCoupon.master.length, daily: parsed.eventCoupon.daily.length }
      : undefined

    return NextResponse.json({
      data,
      summary: {
        dateRange,
        rowCounts,
        ...(eventCouponCounts ? { eventCouponCounts } : {}),
        uploadedFiles,
      },
    })
  } catch (e: unknown) {
    console.error('/api/upload error:', e)
    return NextResponse.json<ApiError>(
      { error: '서버 내부 오류', code: 'PARSE_ERROR' },
      { status: 500 }
    )
  }
}
