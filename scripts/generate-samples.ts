import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateDates(days: number): string[] {
  const dates: string[] = []
  const start = new Date('2025-01-01')
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

const dates = generateDates(76) // 1/1 ~ 3/17
const outDir = path.join(process.cwd(), 'public/samples')
fs.mkdirSync(outDir, { recursive: true })

// sales
const salesData = dates.map(date => ({
  날짜: date,
  일별_매출액: randomInt(8000000, 15000000),
  주문_건수: randomInt(200, 400),
  신규_회원_가입수: randomInt(30, 80),
  누적_회원수: randomInt(10000, 20000),
  구매_전환율: parseFloat((Math.random() * 3 + 1.5).toFixed(1)),
  평균_객단가: randomInt(28000, 45000),
  반품_취소_건수: randomInt(5, 20),
}))
const salesWb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(salesWb, XLSX.utils.json_to_sheet(salesData), 'Sheet1')
XLSX.writeFile(salesWb, path.join(outDir, 'sales_sample.xlsx'))

// google_ads
const adsData = dates.flatMap(date => [
  { 날짜: date, 캠페인명: 'GDN_브랜드', 노출수: randomInt(100000, 300000), 클릭수: randomInt(1000, 4000), 광고비_지출: randomInt(1000000, 3000000), 전환수: randomInt(30, 100), ROAS: parseFloat((Math.random() * 3 + 3).toFixed(1)) },
  { 날짜: date, 캠페인명: '검색_키워드', 노출수: randomInt(50000, 150000), 클릭수: randomInt(500, 2000), 광고비_지출: randomInt(500000, 1500000), 전환수: randomInt(20, 60), ROAS: parseFloat((Math.random() * 2 + 4).toFixed(1)) },
])
const adsWb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(adsWb, XLSX.utils.json_to_sheet(adsData), 'Sheet1')
XLSX.writeFile(adsWb, path.join(outDir, 'google_ads_sample.xlsx'))

// partnership
const partnerData = dates.map(date => ({
  날짜: date, 파트너명: '파트너A', 유입_클릭수: randomInt(500, 3000), 랜딩페이지_도달수: randomInt(400, 2500), 회원가입_전환수: randomInt(10, 80), 구매_전환수: randomInt(2, 20), 파트너_발생매출: randomInt(100000, 800000), 지급_보상액: randomInt(10000, 80000),
}))
const partnerWb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(partnerWb, XLSX.utils.json_to_sheet(partnerData), 'Sheet1')
XLSX.writeFile(partnerWb, path.join(outDir, 'partnership_sample.xlsx'))

// traffic
const trafficData = dates.map(date => ({
  날짜: date, 전체_세션수: randomInt(10000, 25000), 국내_세션수: randomInt(8000, 18000), 해외_세션수: randomInt(1000, 8000), 신규_방문자수: randomInt(4000, 12000), 재방문자수: randomInt(3000, 10000), 평균_세션_시간: randomInt(90, 300), 이탈률: parseFloat((Math.random() * 20 + 35).toFixed(1)), 페이지뷰: randomInt(30000, 80000),
}))
const trafficWb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(trafficWb, XLSX.utils.json_to_sheet(trafficData), 'Sheet1')
XLSX.writeFile(trafficWb, path.join(outDir, 'traffic_sample.xlsx'))

console.log('샘플 파일 생성 완료:', outDir)
