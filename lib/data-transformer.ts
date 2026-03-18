import type { ParsedData, SalesRow, GoogleAdsRow, TrafficRow } from '@/types/marketing'

// 매출 차트용: [{ date, revenue, orders, newMembers }]
export function toSalesChartData(sales: SalesRow[]) {
  return sales.map(r => ({
    date: r.날짜,
    revenue: r.일별_매출액,
    orders: r.주문_건수,
    newMembers: r.신규_회원_가입수,
  }))
}

// 광고 차트용 (날짜별 합산): [{ date, adSpend, roas }]
export function toAdChartData(ads: GoogleAdsRow[]) {
  const byDate = new Map<string, { adSpend: number; roasSum: number; count: number }>()
  for (const r of ads) {
    const existing = byDate.get(r.날짜) ?? { adSpend: 0, roasSum: 0, count: 0 }
    existing.adSpend += r.광고비_지출
    if (r.ROAS) { existing.roasSum += r.ROAS; existing.count++ }
    byDate.set(r.날짜, existing)
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      adSpend: v.adSpend,
      roas: v.count > 0 ? parseFloat((v.roasSum / v.count).toFixed(2)) : undefined,
    }))
}

// 트래픽 차트용: [{ date, domestic, overseas }]
export function toTrafficChartData(traffic: TrafficRow[]) {
  return traffic.map(r => ({
    date: r.날짜,
    domestic: r.국내_세션수,
    overseas: r.해외_세션수,
  }))
}

// 날짜 범위 추출
export function getDateRange(data: ParsedData): { start: string; end: string } {
  const allDates = [
    ...data.sales.map(r => r.날짜),
    ...(data.googleAds ?? []).map(r => r.날짜),
    ...(data.partnership ?? []).map(r => r.날짜),
    ...(data.traffic ?? []).map(r => r.날짜),
  ].sort()
  return { start: allDates[0] ?? '', end: allDates[allDates.length - 1] ?? '' }
}
