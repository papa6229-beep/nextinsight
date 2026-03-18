import type { ParsedData, SalesRow, GoogleAdsRow, PartnershipRow, TrafficRow, EventCouponData } from '@/types/marketing'

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
type FormattedSalesRow = Omit<SalesRow,
  '일별_매출액' | '평균_객단가' | '반품_취소_금액' | '실매출액' | '쿠폰_사용_금액'
> & {
  일별_매출액: string
  평균_객단가?: string
  반품_취소_금액?: string
  실매출액?: string
  쿠폰_사용_금액?: string
}

type FormattedGoogleAdsRow = Omit<GoogleAdsRow,
  '광고비_지출' | 'CPA' | 'CPC' | '광고귀속_매출'
> & {
  광고비_지출: string
  CPA?: string
  CPC?: string
  광고귀속_매출?: string
}

type FormattedPartnershipRow = Omit<PartnershipRow,
  '파트너_발생매출' | '지급_보상액'
> & {
  파트너_발생매출?: string
  지급_보상액?: string
}

type FormattedEventDailyRow = {
  날짜: string
  이벤트ID: string
  이벤트명?: string
  발급수?: number
  다운로드수?: number
  사용수?: number
  사용주문수?: number
  이벤트_적용매출?: string
  할인금액?: string
  순매출기여?: string
  신규회원사용수?: number
  기존회원사용수?: number
  취소환불_차감금액?: string
}

export function formatDataForPrompt(data: ParsedData): {
  sales: FormattedSalesRow[]
  googleAds?: FormattedGoogleAdsRow[]
  partnership?: FormattedPartnershipRow[]
  traffic?: TrafficRow[]
  eventCoupon?: { master: EventCouponData['master']; daily: FormattedEventDailyRow[] }
} {
  return {
    sales: data.sales.map(r => ({
      ...r,
      일별_매출액: formatKRW(r.일별_매출액),
      평균_객단가: r.평균_객단가 != null ? formatKRW(r.평균_객단가) : undefined,
      반품_취소_금액: r.반품_취소_금액 != null ? formatKRW(r.반품_취소_금액) : undefined,
      실매출액: r.실매출액 != null ? formatKRW(r.실매출액) : undefined,
      쿠폰_사용_금액: r.쿠폰_사용_금액 != null ? formatKRW(r.쿠폰_사용_금액) : undefined,
    })),
    googleAds: data.googleAds?.map(r => ({
      ...r,
      광고비_지출: formatKRW(r.광고비_지출),
      CPA: r.CPA != null ? formatKRW(r.CPA) : undefined,
      CPC: r.CPC != null ? formatKRW(r.CPC) : undefined,
      광고귀속_매출: r.광고귀속_매출 != null ? formatKRW(r.광고귀속_매출) : undefined,
    })),
    partnership: data.partnership?.map(r => ({
      ...r,
      파트너_발생매출: r.파트너_발생매출 != null ? formatKRW(r.파트너_발생매출) : undefined,
      지급_보상액: r.지급_보상액 != null ? formatKRW(r.지급_보상액) : undefined,
    })),
    traffic: data.traffic,
    eventCoupon: data.eventCoupon
      ? {
          master: data.eventCoupon.master,
          daily: data.eventCoupon.daily.map(r => ({
            ...r,
            이벤트_적용매출: r.이벤트_적용매출 != null ? formatKRW(r.이벤트_적용매출) : undefined,
            할인금액: r.할인금액 != null ? formatKRW(r.할인금액) : undefined,
            순매출기여: r.순매출기여 != null ? formatKRW(r.순매출기여) : undefined,
            취소환불_차감금액: r.취소환불_차감금액 != null ? formatKRW(r.취소환불_차감금액) : undefined,
          })),
        }
      : undefined,
  }
}

// ── 사전 검증 집계 (Claude에게 전달되는 신뢰 기준 수치) ──────────────────
export function buildVerifiedSummary(data: ParsedData, dateRange: { start: string; end: string }): string {
  const lines: string[] = []
  const { sales, googleAds, partnership, traffic, eventCoupon } = data

  // 1. 매출·회원
  if (sales.length > 0) {
    let totalRevenue = 0, totalOrders = 0, totalNewMembers = 0
    let totalRefundCount = 0, totalRefundAmt = 0, hasRefundAmt = false
    let totalNetRevenue = 0, hasNetRevenue = false
    let totalCouponOrders = 0, totalCouponAmt = 0, hasCouponAmt = false
    let totalNewBuyers = 0, totalRepeatBuyers = 0, hasBuyerBreakdown = false
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
      if (r.반품_취소_건수 != null) totalRefundCount += r.반품_취소_건수
      if (r.반품_취소_금액 != null) { totalRefundAmt += r.반품_취소_금액; hasRefundAmt = true }
      if (r.실매출액 != null) { totalNetRevenue += r.실매출액; hasNetRevenue = true }
      if (r.쿠폰_사용_주문수 != null) totalCouponOrders += r.쿠폰_사용_주문수
      if (r.쿠폰_사용_금액 != null) { totalCouponAmt += r.쿠폰_사용_금액; hasCouponAmt = true }
      if (r.신규_구매자수 != null) { totalNewBuyers += r.신규_구매자수; hasBuyerBreakdown = true }
      if (r.기존_구매자수 != null) totalRepeatBuyers += r.기존_구매자수
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
    if (totalRefundCount > 0) lines.push(`총 반품·취소 건수: ${totalRefundCount.toLocaleString()}건`)
    if (hasRefundAmt) lines.push(`총 반품·취소 금액: ${formatKRW(totalRefundAmt)}`)
    if (hasNetRevenue) lines.push(`총 실매출액(공제후): ${formatKRW(totalNetRevenue)}`)
    if (totalCouponOrders > 0) lines.push(`쿠폰 사용 주문수: ${totalCouponOrders.toLocaleString()}건`)
    if (hasCouponAmt) lines.push(`쿠폰 사용 금액: ${formatKRW(totalCouponAmt)}`)
    if (hasBuyerBreakdown) {
      lines.push(`신규 구매자: ${totalNewBuyers.toLocaleString()}명 / 기존 구매자: ${totalRepeatBuyers.toLocaleString()}명`)
    }
  }

  // 2. 구글 애즈 — 캠페인별로 분리 집계 (Claude가 합산 오류 내는 것 방지)
  if (googleAds?.length) {
    const byCampaign = new Map<string, {
      spend: number; conv: number; newConv: number; repeatConv: number
      attrRev: number; hasAttrRev: boolean
      roasSum: number; roasCount: number; rows: number
    }>()
    for (const r of googleAds) {
      const c = byCampaign.get(r.캠페인명) ?? {
        spend: 0, conv: 0, newConv: 0, repeatConv: 0,
        attrRev: 0, hasAttrRev: false, roasSum: 0, roasCount: 0, rows: 0
      }
      c.spend += r.광고비_지출
      c.conv  += r.전환수 ?? 0
      c.newConv += r.신규전환수 ?? 0
      c.repeatConv += r.기존전환수 ?? 0
      if (r.광고귀속_매출 != null) { c.attrRev += r.광고귀속_매출; c.hasAttrRev = true }
      if (r.ROAS != null) { c.roasSum += r.ROAS; c.roasCount++ }
      c.rows++
      byCampaign.set(r.캠페인명, c)
    }

    let grandSpend = 0, grandConv = 0, grandAttrRev = 0, hasAnyAttrRev = false
    lines.push(`\n[검증된 구글 애즈 집계 — 캠페인별]`)
    for (const [name, c] of byCampaign) {
      grandSpend += c.spend
      grandConv  += c.conv
      if (c.hasAttrRev) { grandAttrRev += c.attrRev; hasAnyAttrRev = true }
      const avgROAS = c.roasCount > 0 ? Math.round(c.roasSum / c.roasCount) : null
      const roasCalc = c.hasAttrRev && c.spend > 0
        ? parseFloat((c.attrRev / c.spend).toFixed(2))
        : null
      const roasPart = avgROAS != null
        ? ` / 평균ROAS ${avgROAS}`
        : (roasCalc != null ? ` / 계산ROAS ${roasCalc}` : '')
      const attrPart = c.hasAttrRev ? ` / 광고귀속매출 ${formatKRW(c.attrRev)}` : ''
      const newRepeatPart = c.newConv > 0 || c.repeatConv > 0
        ? ` (신규전환 ${c.newConv.toLocaleString()}건 / 기존전환 ${c.repeatConv.toLocaleString()}건)` : ''
      lines.push(`캠페인 "${name}": 광고비 ${formatKRW(c.spend)} / 전환 ${c.conv.toLocaleString()}건${newRepeatPart}${attrPart}${roasPart}`)
    }
    const grandRoasCalc = hasAnyAttrRev && grandSpend > 0
      ? ` / 전체ROAS ${parseFloat((grandAttrRev / grandSpend).toFixed(2))}` : ''
    lines.push(`전체 합계: 광고비 ${formatKRW(grandSpend)} / 전환 ${grandConv.toLocaleString()}건${hasAnyAttrRev ? ` / 광고귀속매출 ${formatKRW(grandAttrRev)}` : ''}${grandRoasCalc}`)
    lines.push(`※ ROAS는 광고비 대비 매출비율 — 순이익·흑자 여부와 다릅니다`)
  }

  // 3. 파트너십 집계 + 이상치
  if (partnership?.length) {
    let totalClicks = 0, totalSignup = 0, totalPurchase = 0
    let totalConfirmed = 0, hasConfirmed = false
    let totalCancelled = 0, hasCancelled = false
    let totalNewMember = 0, hasNewMember = false
    let totalPartnerRev = 0, totalReward = 0
    const anomalies: string[] = []

    for (const r of partnership) {
      totalClicks   += r.유입_클릭수
      totalSignup   += r.회원가입_전환수
      totalPurchase += r.구매_전환수
      if (r.확정전환수 != null) { totalConfirmed += r.확정전환수; hasConfirmed = true }
      if (r.취소_차감_건수 != null) { totalCancelled += r.취소_차감_건수; hasCancelled = true }
      if (r.신규회원_기여수 != null) { totalNewMember += r.신규회원_기여수; hasNewMember = true }
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
    lines.push(`총 구매 전환(원시): ${totalPurchase.toLocaleString()}건`)
    if (hasConfirmed) lines.push(`총 확정 전환수(정산기준): ${totalConfirmed.toLocaleString()}건`)
    if (hasCancelled) lines.push(`총 취소·차감 건수: ${totalCancelled.toLocaleString()}건`)
    if (hasNewMember) lines.push(`신규회원 기여: ${totalNewMember.toLocaleString()}명`)
    if (totalPartnerRev > 0) lines.push(`총 파트너 발생 매출: ${formatKRW(totalPartnerRev)}`)
    if (totalReward > 0)     lines.push(`총 지급 보상액: ${formatKRW(totalReward)}`)
    if (anomalies.length > 0) {
      lines.push(`⚠️ 트래킹 이상치 ${anomalies.length}건 — 클릭 < 랜딩 역전 (트래킹 오류 의심):`)
      lines.push(...anomalies)
      lines.push(`  → 이 파트너 수치는 강한 성과 판정을 유보하세요`)
    }
  }

  // 4. 트래픽 품질 + 채널·디바이스 분해
  if (traffic?.length) {
    let totalAll = 0, totalDom = 0, totalOver = 0
    let totalPaid = 0, totalOrganic = 0, totalDirect = 0
    let totalMobile = 0, totalPC = 0
    let totalCart = 0, totalCheckout = 0
    let hasPaidChannel = false, hasDeviceBreakdown = false, hasFunnel = false
    const mismatch: string[] = []

    for (const r of traffic) {
      totalAll  += r.전체_세션수
      totalDom  += r.국내_세션수
      totalOver += r.해외_세션수
      if (r.광고유입_세션수 != null) { totalPaid += r.광고유입_세션수; hasPaidChannel = true }
      if (r.자연유입_세션수 != null) totalOrganic += r.자연유입_세션수
      if (r.직접유입_세션수 != null) totalDirect += r.직접유입_세션수
      if (r.모바일_세션수 != null) { totalMobile += r.모바일_세션수; hasDeviceBreakdown = true }
      if (r.PC_세션수 != null) totalPC += r.PC_세션수
      if (r.장바구니_진입수 != null) { totalCart += r.장바구니_진입수; hasFunnel = true }
      if (r.결제진입수 != null) totalCheckout += r.결제진입수
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
    if (hasPaidChannel) {
      lines.push(`유입 채널: 광고 ${totalPaid.toLocaleString()} / 자연 ${totalOrganic.toLocaleString()} / 직접 ${totalDirect.toLocaleString()}`)
    }
    if (hasDeviceBreakdown) {
      const mobileRatio = totalAll > 0 ? Math.round(totalMobile / totalAll * 100) : 0
      lines.push(`디바이스: 모바일 ${totalMobile.toLocaleString()}(${mobileRatio}%) / PC ${totalPC.toLocaleString()}(${100 - mobileRatio}%)`)
    }
    if (hasFunnel) {
      const cartRate = totalAll > 0 ? (totalCart / totalAll * 100).toFixed(1) : '—'
      const checkRate = totalCart > 0 ? (totalCheckout / totalCart * 100).toFixed(1) : '—'
      lines.push(`퍼널: 전체세션→장바구니 ${cartRate}% / 장바구니→결제진입 ${checkRate}%`)
    }
    if (mismatch.length > 0) {
      lines.push(`⚠️ 집계 불일치 ${mismatch.length}일 — 국내+해외 ≠ 전체:`)
      lines.push(...mismatch)
      lines.push(`  → 비율 계산은 전체 세션 기준으로만 제시하고, 불일치 사실을 리포트에 명시하세요`)
    } else {
      lines.push(`집계 일치: 모든 날짜에서 국내+해외 = 전체 (오차 10 이내)`)
    }
  }

  // 5. 이벤트·쿠폰 집계
  if (eventCoupon) {
    const { master, daily } = eventCoupon
    lines.push(`\n[검증된 이벤트·쿠폰 집계]`)
    lines.push(`이벤트 마스터: ${master.length}건 (이벤트ID: ${master.map(m => m.이벤트ID).join(', ')})`)

    if (daily.length > 0) {
      // 이벤트별 집계
      const byEvent = new Map<string, {
        name: string; totalIssued: number; totalUsed: number; totalUsedOrders: number
        totalAppRev: number; totalDiscount: number; totalNetContrib: number
        totalNewUse: number; totalRepeatUse: number; totalCancelAmt: number
        hasAppRev: boolean; hasDiscount: boolean; hasNetContrib: boolean; hasCancelAmt: boolean
      }>()
      for (const r of daily) {
        const e = byEvent.get(r.이벤트ID) ?? {
          name: r.이벤트명 ?? r.이벤트ID,
          totalIssued: 0, totalUsed: 0, totalUsedOrders: 0,
          totalAppRev: 0, totalDiscount: 0, totalNetContrib: 0,
          totalNewUse: 0, totalRepeatUse: 0, totalCancelAmt: 0,
          hasAppRev: false, hasDiscount: false, hasNetContrib: false, hasCancelAmt: false,
        }
        e.totalIssued += r.발급수 ?? 0
        e.totalUsed += r.사용수 ?? 0
        e.totalUsedOrders += r.사용주문수 ?? 0
        if (r.이벤트_적용매출 != null) { e.totalAppRev += r.이벤트_적용매출; e.hasAppRev = true }
        if (r.할인금액 != null) { e.totalDiscount += r.할인금액; e.hasDiscount = true }
        if (r.순매출기여 != null) { e.totalNetContrib += r.순매출기여; e.hasNetContrib = true }
        e.totalNewUse += r.신규회원사용수 ?? 0
        e.totalRepeatUse += r.기존회원사용수 ?? 0
        if (r.취소환불_차감금액 != null) { e.totalCancelAmt += r.취소환불_차감금액; e.hasCancelAmt = true }
        byEvent.set(r.이벤트ID, e)
      }

      for (const [id, e] of byEvent) {
        const parts = [`이벤트 [${id}] ${e.name}:`]
        if (e.totalIssued > 0) parts.push(`발급 ${e.totalIssued.toLocaleString()}건`)
        if (e.totalUsed > 0) parts.push(`사용 ${e.totalUsed.toLocaleString()}건`)
        if (e.hasAppRev) parts.push(`적용매출 ${formatKRW(e.totalAppRev)}`)
        if (e.hasDiscount) parts.push(`할인 ${formatKRW(e.totalDiscount)}`)
        if (e.hasNetContrib) parts.push(`순기여 ${formatKRW(e.totalNetContrib)}`)
        if (e.totalNewUse > 0 || e.totalRepeatUse > 0)
          parts.push(`신규사용 ${e.totalNewUse.toLocaleString()}건 / 기존사용 ${e.totalRepeatUse.toLocaleString()}건`)
        if (e.hasCancelAmt) parts.push(`취소차감 ${formatKRW(e.totalCancelAmt)}`)
        lines.push(`  ` + parts.join(' / '))
      }
      lines.push(`※ 순매출기여는 실측값 전용 — 역산 사용 금지`)
    }
  }

  return lines.join('\n')
}
