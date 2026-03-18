import type { ParsedData } from '@/types/marketing'

// 원 단위를 한국어 단위로 변환 (서버측 계산 — Claude에게 맡기지 않음)
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

export function buildVerifiedSummary(data: ParsedData, dateRange: { start: string; end: string }): string {
  const lines: string[] = []
  const { sales, googleAds, partnership, traffic } = data

  // ── 1. 매출·회원 집계 ──────────────────────────────────────────────
  if (sales.length > 0) {
    let totalRevenue = 0, totalOrders = 0, totalNewMembers = 0
    let maxRev = { date: '', value: -Infinity }
    let minRev = { date: '', value: Infinity }
    let maxMem = { date: '', value: -Infinity }
    let minMem = { date: '', value: Infinity }

    for (const r of sales) {
      totalRevenue += r.일별_매출액
      totalOrders += r.주문_건수
      totalNewMembers += r.신규_회원_가입수
      if (r.일별_매출액 > maxRev.value) maxRev = { date: r.날짜, value: r.일별_매출액 }
      if (r.일별_매출액 < minRev.value) minRev = { date: r.날짜, value: r.일별_매출액 }
      if (r.신규_회원_가입수 > maxMem.value) maxMem = { date: r.날짜, value: r.신규_회원_가입수 }
      if (r.신규_회원_가입수 < minMem.value) minMem = { date: r.날짜, value: r.신규_회원_가입수 }
    }
    const dailyAvg = Math.round(totalRevenue / sales.length)

    lines.push(`[검증된 매출·회원 집계 — ${dateRange.start} ~ ${dateRange.end}, ${sales.length}일]`)
    lines.push(`총 매출: ${formatKRW(totalRevenue)} (원본 정수: ${totalRevenue})`)
    lines.push(`일 평균 매출: ${formatKRW(dailyAvg)} (원본 정수: ${dailyAvg})`)
    lines.push(`최고 매출일: ${maxRev.date}, ${formatKRW(maxRev.value)} (원본: ${maxRev.value})`)
    lines.push(`최저 매출일: ${minRev.date}, ${formatKRW(minRev.value)} (원본: ${minRev.value})`)
    lines.push(`총 주문 건수: ${totalOrders.toLocaleString()}건`)
    lines.push(`총 신규 회원: ${totalNewMembers.toLocaleString()}명`)
    lines.push(`신규회원 최다일: ${maxMem.date}, ${maxMem.value.toLocaleString()}명`)
    lines.push(`신규회원 최소일: ${minMem.date}, ${minMem.value.toLocaleString()}명`)
  }

  // ── 2. 구글 애즈 집계 ─────────────────────────────────────────────
  if (googleAds?.length) {
    let totalSpend = 0, totalConv = 0, roasSum = 0, roasCount = 0
    let minROAS = Infinity, maxROAS = -Infinity
    const campaigns = new Set<string>()
    for (const r of googleAds) {
      totalSpend += r.광고비_지출
      totalConv += r.전환수 ?? 0
      campaigns.add(r.캠페인명)
      if (r.ROAS != null) {
        roasSum += r.ROAS; roasCount++
        if (r.ROAS < minROAS) minROAS = r.ROAS
        if (r.ROAS > maxROAS) maxROAS = r.ROAS
      }
    }
    lines.push(`\n[검증된 구글 애즈 집계]`)
    lines.push(`총 광고비: ${formatKRW(totalSpend)} (원본: ${totalSpend})`)
    lines.push(`총 전환 수: ${totalConv.toLocaleString()}건`)
    lines.push(`캠페인 목록: ${Array.from(campaigns).join(', ')}`)
    if (roasCount > 0) {
      const avgROAS = Math.round(roasSum / roasCount)
      lines.push(`ROAS 범위: ${minROAS} ~ ${maxROAS} (평균 ${avgROAS})`)
      lines.push(`주의: ROAS는 광고비 대비 매출 비율일 뿐, 순이익/흑자 여부를 의미하지 않습니다`)
    }
  }

  // ── 3. 파트너십 집계 + 이상치 ─────────────────────────────────────
  if (partnership?.length) {
    let totalClicks = 0, totalSignup = 0, totalPurchase = 0, totalPartnerRev = 0, totalReward = 0
    const anomalies: string[] = []
    for (const r of partnership) {
      totalClicks += r.유입_클릭수
      totalSignup += r.회원가입_전환수
      totalPurchase += r.구매_전환수
      if (r.파트너_발생매출) totalPartnerRev += r.파트너_발생매출
      if (r.지급_보상액) totalReward += r.지급_보상액
      // 이상치: 랜딩 도달 > 클릭 (논리적으로 불가)
      if (r.랜딩페이지_도달수 != null && r.랜딩페이지_도달수 > r.유입_클릭수) {
        anomalies.push(
          `  - ${r.날짜} [${r.파트너명}] 클릭 ${r.유입_클릭수.toLocaleString()} < 랜딩 ${r.랜딩페이지_도달수.toLocaleString()} (차이 +${(r.랜딩페이지_도달수 - r.유입_클릭수).toLocaleString()})`
        )
      }
    }
    lines.push(`\n[검증된 파트너십 집계]`)
    lines.push(`총 유입 클릭: ${totalClicks.toLocaleString()}회`)
    lines.push(`총 회원가입 전환: ${totalSignup.toLocaleString()}명`)
    lines.push(`총 구매 전환: ${totalPurchase.toLocaleString()}건`)
    if (totalPartnerRev > 0) lines.push(`총 파트너 발생 매출: ${formatKRW(totalPartnerRev)} (원본: ${totalPartnerRev})`)
    if (totalReward > 0) lines.push(`총 지급 보상액: ${formatKRW(totalReward)} (원본: ${totalReward})`)
    if (anomalies.length > 0) {
      lines.push(`⚠️ 트래킹 이상치 감지 (${anomalies.length}건) — 클릭 수보다 랜딩 도달 수가 큰 논리 오류:`)
      lines.push(...anomalies)
      lines.push(`  → 이 파트너의 성과 수치는 트래킹 오류 가능성이 있으므로, 강한 성과 판정을 내리지 마세요`)
    }
  }

  // ── 4. 트래픽 품질 검증 ───────────────────────────────────────────
  if (traffic?.length) {
    let totalSessions = 0, totalDomestic = 0, totalOverseas = 0
    const mismatch: string[] = []
    for (const r of traffic) {
      totalSessions += r.전체_세션수
      totalDomestic += r.국내_세션수
      totalOverseas += r.해외_세션수
      const sum = r.국내_세션수 + r.해외_세션수
      const diff = Math.abs(sum - r.전체_세션수)
      if (diff > 10) {
        mismatch.push(
          `  - ${r.날짜}: 전체 ${r.전체_세션수.toLocaleString()} ≠ 국내 ${r.국내_세션수.toLocaleString()} + 해외 ${r.해외_세션수.toLocaleString()} = ${sum.toLocaleString()} (차이 ${diff.toLocaleString()})`
        )
      }
    }
    lines.push(`\n[검증된 트래픽 집계]`)
    lines.push(`기간 전체 세션 합계: ${totalSessions.toLocaleString()}`)
    lines.push(`기간 국내 세션 합계: ${totalDomestic.toLocaleString()}`)
    lines.push(`기간 해외 세션 합계: ${totalOverseas.toLocaleString()}`)
    if (mismatch.length > 0) {
      lines.push(`⚠️ 트래픽 집계 불일치 감지 (${mismatch.length}일) — 국내+해외 ≠ 전체:`)
      lines.push(...mismatch)
      lines.push(`  → 비율 계산 시 이 불일치를 반드시 언급하고, 전체 세션 기준으로 비율을 제시하세요`)
    } else {
      lines.push(`트래픽 집계 일치: 모든 날짜에서 국내+해외 = 전체 (오차 10 이내)`)
    }
  }

  return lines.join('\n')
}
