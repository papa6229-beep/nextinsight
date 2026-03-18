import type { ParsedData, SalesRow, GoogleAdsRow, PartnershipRow, TrafficRow } from '@/types/marketing'

// ── 금액 포맷 (서버 계산, Claude에게 숫자 연산 절대 위임 안 함) ──────────
export function formatKRW(n: number): string {
  if (n >= 100_000_000) {
    const eok = Math.floor(n / 100_000_000)
    const man = Math.floor((n % 100_000_000) / 10_000)
    return man > 0
      ? `${eok.toLocaleString()}억 ${man.toLocaleString()}만 원`
      : `${eok.toLocaleString()}억 원`
  }
  if (n >= 10_000) {
    const man = Math.floor(n / 10_000)
    const rest = n % 10_000
    return rest > 0
      ? `${man.toLocaleString()}만 ${rest.toLocaleString()}원`
      : `${man.toLocaleString()}만 원`
  }
  return `${n.toLocaleString()}원`
}

// ── Claude에게 보낼 데이터에서 금액 필드를 사전 한국어 문자열로 변환 ──────
// 목적: Claude가 raw 숫자를 보고 자체 단위 변환·계산하는 것을 원천 차단
type FormattedSalesRow  = Omit<SalesRow,  '일별_매출액' | '평균_객단가'> & { 일별_매출액: string; 평균_객단가?: string }
type FormattedGoogleAdsRow = Omit<GoogleAdsRow, '광고비_지출' | 'CPA'> & { 광고비_지출: string; CPA?: string }
type FormattedPartnershipRow = Omit<PartnershipRow, '파트너_발생매출' | '지급_보상액'> & { 파트너_발생매출?: string; 지급_보상액?: string }

export function formatDataForPrompt(data: ParsedData): {
  sales: FormattedSalesRow[]
  googleAds?: FormattedGoogleAdsRow[]
  partnership?: FormattedPartnershipRow[]
  traffic?: TrafficRow[]
} {
  return {
    sales: data.sales.map(r => ({
      ...r,
      일별_매출액: formatKRW(r.일별_매출액),
      평균_객단가: r.평균_객단가 != null ? formatKRW(r.평균_객단가) : undefined,
    })),
    googleAds: data.googleAds?.map(r => ({
      ...r,
      광고비_지출: formatKRW(r.광고비_지출),
      CPA: r.CPA != null ? formatKRW(r.CPA) : undefined,
    })),
    partnership: data.partnership?.map(r => ({
      ...r,
      파트너_발생매출: r.파트너_발생매출 != null ? formatKRW(r.파트너_발생매출) : undefined,
      지급_보상액: r.지급_보상액 != null ? formatKRW(r.지급_보상액) : undefined,
    })),
    traffic: data.traffic,
  }
}

// ── 사전 검증 집계 (Claude에게 전달되는 신뢰 기준 수치) ──────────────────
export function buildVerifiedSummary(data: ParsedData, dateRange: { start: string; end: string }): string {
  const lines: string[] = []
  const { sales, googleAds, partnership, traffic } = data

  // 1. 매출·회원
  if (sales.length > 0) {
    let totalRevenue = 0, totalOrders = 0, totalNewMembers = 0
    let maxRev = { date: '', value: -Infinity }
    let minRev = { date: '', value: Infinity }
    let maxMem = { date: '', value: -Infinity }
    let minMem = { date: '', value: Infinity }

    for (const r of sales) {
      totalRevenue += r.일별_매출액
      totalOrders  += r.주문_건수
      totalNewMembers += r.신규_회원_가입수
      if (r.일별_매출액 > maxRev.value) maxRev = { date: r.날짜, value: r.일별_매출액 }
      if (r.일별_매출액 < minRev.value) minRev = { date: r.날짜, value: r.일별_매출액 }
      if (r.신규_회원_가입수 > maxMem.value) maxMem = { date: r.날짜, value: r.신규_회원_가입수 }
      if (r.신규_회원_가입수 < minMem.value) minMem = { date: r.날짜, value: r.신규_회원_가입수 }
    }
    const dailyAvg = Math.round(totalRevenue / sales.length)

    lines.push(`[검증된 매출·회원 집계 — ${dateRange.start} ~ ${dateRange.end}, ${sales.length}일]`)
    lines.push(`총 매출: ${formatKRW(totalRevenue)}`)
    lines.push(`일 평균 매출: ${formatKRW(dailyAvg)}`)
    lines.push(`최고 매출일: ${maxRev.date} / ${formatKRW(maxRev.value)}`)
    lines.push(`최저 매출일: ${minRev.date} / ${formatKRW(minRev.value)}`)
    lines.push(`총 주문 건수: ${totalOrders.toLocaleString()}건`)
    lines.push(`총 신규 회원: ${totalNewMembers.toLocaleString()}명`)
    lines.push(`신규회원 최다일: ${maxMem.date} / ${maxMem.value.toLocaleString()}명`)
    lines.push(`신규회원 최소일: ${minMem.date} / ${minMem.value.toLocaleString()}명`)
  }

  // 2. 구글 애즈 — 캠페인별로 분리 집계 (Claude가 합산 오류 내는 것 방지)
  if (googleAds?.length) {
    const byCampaign = new Map<string, { spend: number; conv: number; rows: number; roasSum: number; roasCount: number }>()
    for (const r of googleAds) {
      const c = byCampaign.get(r.캠페인명) ?? { spend: 0, conv: 0, rows: 0, roasSum: 0, roasCount: 0 }
      c.spend += r.광고비_지출
      c.conv  += r.전환수 ?? 0
      c.rows  += 1
      if (r.ROAS != null) { c.roasSum += r.ROAS; c.roasCount++ }
      byCampaign.set(r.캠페인명, c)
    }

    let grandSpend = 0, grandConv = 0
    lines.push(`\n[검증된 구글 애즈 집계 — 캠페인별]`)
    for (const [name, c] of byCampaign) {
      grandSpend += c.spend
      grandConv  += c.conv
      const avgROAS = c.roasCount > 0 ? Math.round(c.roasSum / c.roasCount) : null
      lines.push(`캠페인 "${name}": 광고비 ${formatKRW(c.spend)} / 전환 ${c.conv.toLocaleString()}건${avgROAS != null ? ` / 평균ROAS ${avgROAS}` : ''}`)
    }
    lines.push(`전체 합계: 광고비 ${formatKRW(grandSpend)} / 전환 ${grandConv.toLocaleString()}건`)
    lines.push(`※ ROAS는 광고비 대비 매출비율 — 순이익·흑자 여부와 다릅니다`)
  }

  // 3. 파트너십 집계 + 이상치
  if (partnership?.length) {
    let totalClicks = 0, totalSignup = 0, totalPurchase = 0
    let totalPartnerRev = 0, totalReward = 0
    const anomalies: string[] = []

    for (const r of partnership) {
      totalClicks   += r.유입_클릭수
      totalSignup   += r.회원가입_전환수
      totalPurchase += r.구매_전환수
      if (r.파트너_발생매출 != null) totalPartnerRev += r.파트너_발생매출
      if (r.지급_보상액    != null) totalReward      += r.지급_보상액
      if (r.랜딩페이지_도달수 != null && r.랜딩페이지_도달수 > r.유입_클릭수) {
        anomalies.push(
          `  - ${r.날짜} [${r.파트너명}] 클릭 ${r.유입_클릭수.toLocaleString()} < 랜딩 ${r.랜딩페이지_도달수.toLocaleString()} (역전 +${(r.랜딩페이지_도달수 - r.유입_클릭수).toLocaleString()})`
        )
      }
    }

    lines.push(`\n[검증된 파트너십 집계]`)
    lines.push(`총 유입 클릭: ${totalClicks.toLocaleString()}회`)
    lines.push(`총 회원가입 전환: ${totalSignup.toLocaleString()}명`)
    lines.push(`총 구매 전환: ${totalPurchase.toLocaleString()}건`)
    if (totalPartnerRev > 0) lines.push(`총 파트너 발생 매출: ${formatKRW(totalPartnerRev)}`)
    if (totalReward > 0)     lines.push(`총 지급 보상액: ${formatKRW(totalReward)}`)
    if (anomalies.length > 0) {
      lines.push(`⚠️ 트래킹 이상치 ${anomalies.length}건 — 클릭 < 랜딩 역전 (트래킹 오류 의심):`)
      lines.push(...anomalies)
      lines.push(`  → 이 파트너 수치는 강한 성과 판정을 유보하세요`)
    }
  }

  // 4. 트래픽 품질
  if (traffic?.length) {
    let totalAll = 0, totalDom = 0, totalOver = 0
    const mismatch: string[] = []

    for (const r of traffic) {
      totalAll  += r.전체_세션수
      totalDom  += r.국내_세션수
      totalOver += r.해외_세션수
      const diff = Math.abs((r.국내_세션수 + r.해외_세션수) - r.전체_세션수)
      if (diff > 10) {
        const sum = r.국내_세션수 + r.해외_세션수
        mismatch.push(`  - ${r.날짜}: 전체 ${r.전체_세션수.toLocaleString()} ≠ 국내${r.국내_세션수.toLocaleString()}+해외${r.해외_세션수.toLocaleString()}=${sum.toLocaleString()} (차이 ${diff.toLocaleString()})`)
      }
    }

    lines.push(`\n[검증된 트래픽 집계]`)
    lines.push(`전체 세션 합계: ${totalAll.toLocaleString()}`)
    lines.push(`국내 세션 합계: ${totalDom.toLocaleString()} (전체 대비 ${Math.round(totalDom / totalAll * 100)}%)`)
    lines.push(`해외 세션 합계: ${totalOver.toLocaleString()} (전체 대비 ${Math.round(totalOver / totalAll * 100)}%)`)
    if (mismatch.length > 0) {
      lines.push(`⚠️ 집계 불일치 ${mismatch.length}일 — 국내+해외 ≠ 전체:`)
      lines.push(...mismatch)
      lines.push(`  → 비율 계산은 전체 세션 기준으로만 제시하고, 불일치 사실을 리포트에 명시하세요`)
    } else {
      lines.push(`집계 일치: 모든 날짜에서 국내+해외 = 전체 (오차 10 이내)`)
    }
  }

  return lines.join('\n')
}
