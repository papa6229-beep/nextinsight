# Marketing Analytics Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 쇼핑몰 매출·광고 일별 데이터를 엑셀로 업로드하면 Recharts로 시각화하고 Claude AI가 마케팅 원인·결과를 분석해주는 Next.js 15 웹 애플리케이션 구축

**Architecture:** 클라이언트가 엑셀 파일을 `/api/upload`로 전송하면 서버에서 파싱 후 JSON을 반환한다. 클라이언트는 sessionStorage에 저장(1시간 TTL)하고 `/analysis`로 이동해 차트를 렌더링하고 `/api/analyze`로 Claude SSE 스트리밍 분석을 받는다. 후속 질문은 `/api/chat`으로 처리하며 대화 히스토리와 원본 데이터 요약을 매 요청마다 포함한다.

**Tech Stack:** Next.js 15 App Router, shadcn/ui, Tailwind CSS, Recharts, xlsx (SheetJS), Anthropic SDK (claude-sonnet-4-6), Vercel

---

## File Map

```
새로 생성:
app/page.tsx                          홈 페이지 (업로드 UI)
app/analysis/page.tsx                 분석 결과 페이지
app/guide/page.tsx                    데이터 준비 가이드
app/layout.tsx                        루트 레이아웃 (다크모드)
app/api/upload/route.ts               엑셀 파싱 API
app/api/analyze/route.ts              Claude 초기 분석 SSE
app/api/chat/route.ts                 Claude 채팅 SSE

components/upload/FileDropzone.tsx    드래그&드롭 업로드
components/upload/DataTypeSelector.tsx 파일 유형 선택 체크박스
components/charts/SalesChart.tsx      매출 LineChart
components/charts/MemberChart.tsx     회원 BarChart
components/charts/AdChart.tsx         광고 ComposedChart (dual-axis)
components/charts/TrafficChart.tsx    트래픽 stacked BarChart
components/analysis/ReportStream.tsx  AI 리포트 스트리밍 렌더러
components/analysis/ChatInterface.tsx 채팅 UI

lib/excel-parser.ts                   xlsx 파싱 + 유효성 검사 (pure)
lib/data-transformer.ts               차트용 데이터 변환 (pure)
lib/session-storage.ts                TTL + QuotaError 처리
lib/prompt-builder.ts                 Claude 프롬프트 생성 (pure)
lib/context-compressor.ts             채팅 컨텍스트 압축 (pure)

types/marketing.ts                    전체 타입 정의

public/samples/sales_sample.xlsx      (스크립트로 생성)
public/samples/google_ads_sample.xlsx
public/samples/partnership_sample.xlsx
public/samples/traffic_sample.xlsx

vercel.json                           maxDuration 설정
scripts/generate-samples.ts           샘플 엑셀 생성 스크립트
```

---

## Task 1: 프로젝트 스캐폴딩

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`
- Create: `app/layout.tsx`, `app/globals.css`

- [ ] **Step 1: Next.js 15 프로젝트 생성**

```bash
cd D:/next
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*" \
  --no-turbopack
```

Expected: 프로젝트 파일 생성됨 (`app/`, `public/`, `package.json` 등)

- [ ] **Step 2: 필수 의존성 설치**

```bash
npm install xlsx @anthropic-ai/sdk recharts
npm install -D @types/node
```

Expected: `node_modules/xlsx`, `node_modules/@anthropic-ai/sdk`, `node_modules/recharts` 설치됨

- [ ] **Step 3: shadcn/ui 초기화**

```bash
npx shadcn@latest init
```

프롬프트 응답:
- Style: Default
- Base color: Zinc
- CSS variables: Yes

- [ ] **Step 4: 필요한 shadcn 컴포넌트 설치**

```bash
npx shadcn@latest add button card tabs badge toast separator skeleton input label checkbox
```

Expected: `components/ui/` 에 컴포넌트들 생성됨

- [ ] **Step 5: app/layout.tsx 다크모드 설정**

`app/layout.tsx` 를 열어 `<html>` 태그에 `className="dark"` 추가:

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '마케팅 데이터 분석',
  description: '쇼핑몰 매출·광고 데이터 AI 분석',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="dark">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

- [ ] **Step 6: vercel.json 생성**

```json
{
  "functions": {
    "app/api/analyze/route.ts": { "maxDuration": 120 },
    "app/api/chat/route.ts": { "maxDuration": 120 }
  }
}
```

- [ ] **Step 7: 개발 서버 시작 확인**

```bash
npm run dev
```

Expected: `http://localhost:3000` 에서 Next.js 기본 페이지 뜸. 오류 없음.

- [ ] **Step 8: 커밋**

```bash
git add -A
git commit -m "feat: scaffold Next.js 15 project with shadcn/ui and dependencies"
```

---

## Task 2: 타입 정의

**Files:**
- Create: `types/marketing.ts`

- [ ] **Step 1: 타입 파일 작성**

`types/marketing.ts`:

```typescript
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
```

- [ ] **Step 2: 커밋**

```bash
git add types/marketing.ts
git commit -m "feat: add marketing data type definitions"
```

---

## Task 3: Excel 파서 라이브러리

**Files:**
- Create: `lib/excel-parser.ts`
- Test: 수동 확인 (순수 함수이므로 Node REPL 또는 테스트 파일로 검증)

- [ ] **Step 1: excel-parser.ts 작성**

`lib/excel-parser.ts`:

```typescript
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
```

- [ ] **Step 2: 커밋**

```bash
git add lib/excel-parser.ts
git commit -m "feat: add Excel parser with date normalization and validation"
```

---

## Task 4: 데이터 변환기 & 컨텍스트 압축기

**Files:**
- Create: `lib/data-transformer.ts`
- Create: `lib/context-compressor.ts`

- [ ] **Step 1: data-transformer.ts 작성**

`lib/data-transformer.ts`:

```typescript
import type { ParsedData, SalesRow, GoogleAdsRow, TrafficRow } from '@/types/marketing'

// 매출 차트용: [{ date, revenue }]
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
```

- [ ] **Step 2: context-compressor.ts 작성**

`lib/context-compressor.ts`:

```typescript
import type { ParsedData, ChatMessage } from '@/types/marketing'

const MAX_CHAT_TURNS = 10
const MAX_INITIAL_ANALYSIS_CHARS = 3000
const MAX_STORAGE_BYTES = 4 * 1024 * 1024 // 4MB

// 채팅 히스토리를 최근 N턴으로 자름
export function trimMessages(messages: ChatMessage[]): ChatMessage[] {
  if (messages.length <= MAX_CHAT_TURNS) return messages
  return messages.slice(messages.length - MAX_CHAT_TURNS)
}

// 초기 분석 결과를 3000자로 자름
export function trimInitialAnalysis(text: string): string {
  if (text.length <= MAX_INITIAL_ANALYSIS_CHARS) return text
  return text.slice(0, MAX_INITIAL_ANALYSIS_CHARS) + '\n... (이하 생략)'
}

// 원본 row 데이터를 일별 집계 요약으로 압축 (Claude 컨텍스트 절약)
export function compressDataForChat(data: ParsedData): ParsedData {
  // 이미 작으면 그대로
  const raw = JSON.stringify(data)
  if (raw.length < 50_000) return data

  // 구글 애즈: 날짜별 합산만 남김
  const compressedGoogleAds = data.googleAds
    ? Array.from(
        data.googleAds.reduce((map, r) => {
          const key = r.날짜
          const existing = map.get(key) ?? {
            날짜: key, 캠페인명: '합산', 노출수: 0, 클릭수: 0, 광고비_지출: 0
          }
          existing.노출수 += r.노출수
          existing.클릭수 += r.클릭수
          existing.광고비_지출 += r.광고비_지출
          map.set(key, existing)
          return map
        }, new Map()).values()
      )
    : undefined

  return { ...data, googleAds: compressedGoogleAds }
}

// sessionStorage 저장 전 크기 검사 및 최적화
export function prepareForStorage(data: ParsedData): ParsedData {
  const size = new TextEncoder().encode(JSON.stringify(data)).length
  if (size <= MAX_STORAGE_BYTES) return data

  // 숫자 컬럼만 남기고 문자열 컬럼 제거
  return {
    ...data,
    googleAds: data.googleAds?.map(r => ({
      날짜: r.날짜, 캠페인명: r.캠페인명, 노출수: r.노출수,
      클릭수: r.클릭수, 광고비_지출: r.광고비_지출,
      전환수: r.전환수, ROAS: r.ROAS, CTR: r.CTR,
    })),
    partnership: data.partnership?.map(r => ({
      날짜: r.날짜, 파트너명: r.파트너명, 유입_클릭수: r.유입_클릭수,
      회원가입_전환수: r.회원가입_전환수, 구매_전환수: r.구매_전환수,
      파트너_발생매출: r.파트너_발생매출,
    })),
  }
}
```

- [ ] **Step 3: 커밋**

```bash
git add lib/data-transformer.ts lib/context-compressor.ts
git commit -m "feat: add data transformer and context compressor utilities"
```

---

## Task 5: Session Storage 헬퍼

**Files:**
- Create: `lib/session-storage.ts`

- [ ] **Step 1: session-storage.ts 작성**

`lib/session-storage.ts`:

```typescript
import type { SessionData, ParsedData } from '@/types/marketing'
import { prepareForStorage } from './context-compressor'

const SESSION_KEY = 'analysisData'
const TTL_MS = 60 * 60 * 1000 // 1시간

export function saveSession(data: ParsedData, summary: SessionData['summary']): void {
  const optimized = prepareForStorage(data)
  const payload: SessionData = {
    data: optimized,
    summary,
    timestamp: new Date().toISOString(),
  }
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload))
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      throw new Error('데이터가 너무 커서 저장할 수 없습니다. 데이터 행 수를 줄여주세요.')
    }
    throw e
  }
}

export function loadSession(): SessionData | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session: SessionData = JSON.parse(raw)
    // TTL 검사
    const age = Date.now() - new Date(session.timestamp).getTime()
    if (age > TTL_MS) {
      sessionStorage.removeItem(SESSION_KEY)
      return null
    }
    return session
  } catch {
    return null
  }
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY)
}
```

- [ ] **Step 2: 커밋**

```bash
git add lib/session-storage.ts
git commit -m "feat: add sessionStorage helper with TTL and QuotaError handling"
```

---

## Task 6: 프롬프트 빌더

**Files:**
- Create: `lib/prompt-builder.ts`

- [ ] **Step 1: prompt-builder.ts 작성**

`lib/prompt-builder.ts`:

```typescript
import type { ParsedData } from '@/types/marketing'

export const SYSTEM_PROMPT = `당신은 이커머스 마케팅 데이터 분석 전문가입니다.
데이터를 기반으로 인과관계를 도출하고 구체적인 수치를 근거로 제시합니다.
추측이 아닌 데이터 증거에 기반한 분석만 합니다. 한국어로 응답합니다.`

export function buildAnalysisPrompt(data: ParsedData, dateRange: { start: string; end: string }): string {
  const sections: string[] = [
    `다음 쇼핑몰 마케팅 데이터를 분석해주세요.`,
    `[분석 기간] ${dateRange.start} ~ ${dateRange.end}`,
    `[매출·회원 데이터]\n${JSON.stringify(data.sales, null, 0)}`,
  ]

  if (data.googleAds?.length) {
    sections.push(`[구글 애즈 데이터]\n${JSON.stringify(data.googleAds, null, 0)}`)
  }
  if (data.partnership?.length) {
    sections.push(`[파트너십 광고 데이터]\n${JSON.stringify(data.partnership, null, 0)}`)
  }
  if (data.traffic?.length) {
    sections.push(`[트래픽 데이터]\n${JSON.stringify(data.traffic, null, 0)}`)
  }

  sections.push(`
분석 항목:
1. 이상 급등/급락 구간 자동 감지 (평균 대비 2배 이상 변동)
2. 광고 채널별 일별 기여도 분석
3. 해외 트래픽과 국내 구매전환 상관관계
4. 급등 구간 주요 원인 특정 (수치 근거 포함)
5. 급락 시점 전후 변화 원인 분석
6. 실행 가능한 향후 제안 3가지

출력 형식:
## 핵심 요약
## 이상 구간 감지
## 광고 채널별 기여도 분석
## 해외 트래픽 영향 분석
## 원인 특정 및 근거
## 급락 이후 분석
## 실행 권고사항`)

  return sections.join('\n\n')
}

export function buildChatSystemPrompt(initialAnalysis: string): string {
  const trimmed = initialAnalysis.length > 3000
    ? initialAnalysis.slice(0, 3000) + '\n... (이하 생략)'
    : initialAnalysis

  return `${SYSTEM_PROMPT}

[이전 분석 결과 요약]
${trimmed}

위 분석 결과를 바탕으로 사용자의 후속 질문에 답변해주세요.
데이터 수치를 근거로 구체적으로 답변하세요.`
}
```

- [ ] **Step 2: 커밋**

```bash
git add lib/prompt-builder.ts
git commit -m "feat: add Claude prompt builder for initial analysis and chat"
```

---

## Task 7: API Route — /api/upload

**Files:**
- Create: `app/api/upload/route.ts`

- [ ] **Step 1: route.ts 작성**

`app/api/upload/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { parseSales, parseGoogleAds, parsePartnership, parseTraffic, validateFileSize } from '@/lib/excel-parser'
import { getDateRange } from '@/lib/data-transformer'
import type { ParsedData, FileType, ApiError } from '@/types/marketing'

// 파일명에서 파일 타입 추론
function detectFileType(filename: string): FileType | null {
  const lower = filename.toLowerCase()
  if (lower.includes('sales') || lower.includes('매출')) return 'sales'
  if (lower.includes('google') || lower.includes('ads') || lower.includes('구글')) return 'googleAds'
  if (lower.includes('partner') || lower.includes('파트너')) return 'partnership'
  if (lower.includes('traffic') || lower.includes('트래픽')) return 'traffic'
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

    return NextResponse.json({
      data,
      summary: {
        dateRange,
        rowCounts: Object.fromEntries(
          uploadedFiles.map(k => [k, (data[k] as unknown[])?.length ?? 0])
        ),
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
```

- [ ] **Step 2: 커밋**

```bash
git add app/api/upload/route.ts
git commit -m "feat: add /api/upload route with file type detection and validation"
```

---

## Task 8: API Route — /api/analyze

**Files:**
- Create: `app/api/analyze/route.ts`

- [ ] **Step 1: .env.local 생성 (로컬 개발용)**

```bash
echo "ANTHROPIC_API_KEY=sk-ant-여기에_실제_키_입력" > .env.local
```

`.gitignore`에 `.env.local` 포함 확인 (create-next-app이 기본으로 추가함).

- [ ] **Step 2: route.ts 작성**

`app/api/analyze/route.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import { buildAnalysisPrompt, SYSTEM_PROMPT } from '@/lib/prompt-builder'
import type { ParsedData, ApiError } from '@/types/marketing'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { data: ParsedData; dateRange: { start: string; end: string } }

    if (!body.data?.sales) {
      return Response.json<ApiError>(
        { error: '분석 데이터가 없습니다', code: 'NO_SALES_FILE' as const },
        { status: 400 }
      )
    }

    const prompt = buildAnalysisPrompt(body.data, body.dateRange)

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await client.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 4096,
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: prompt }],
          })

          for await (const chunk of response) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              const data = `data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`
              controller.enqueue(encoder.encode(data))
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (e) {
          const errData = `data: ${JSON.stringify({ error: 'STREAM_INTERRUPTED' })}\n\n`
          controller.enqueue(encoder.encode(errData))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (e: unknown) {
    console.error('/api/analyze error:', e)
    return Response.json<ApiError>(
      { error: 'Anthropic API 오류', code: 'ANTHROPIC_ERROR' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 3: 커밋**

```bash
git add app/api/analyze/route.ts
git commit -m "feat: add /api/analyze SSE streaming route with Claude"
```

---

## Task 9: API Route — /api/chat

**Files:**
- Create: `app/api/chat/route.ts`

- [ ] **Step 1: route.ts 작성**

`app/api/chat/route.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import { buildChatSystemPrompt } from '@/lib/prompt-builder'
import { trimMessages, compressDataForChat } from '@/lib/context-compressor'
import type { ChatMessage, ParsedData, ApiError } from '@/types/marketing'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      messages: ChatMessage[]
      data: ParsedData
      initialAnalysis: string
    }

    const trimmedMessages = trimMessages(body.messages)
    const compressedData = compressDataForChat(body.data)
    const systemPrompt = buildChatSystemPrompt(body.initialAnalysis)

    // 데이터 요약을 첫 번째 시스템 메시지로 추가
    const dataContext = `[분석 데이터 요약]\n${JSON.stringify(compressedData, null, 0)}`
    const messagesWithContext: ChatMessage[] = [
      { role: 'user', content: dataContext },
      { role: 'assistant', content: '데이터를 확인했습니다. 질문해주세요.' },
      ...trimmedMessages,
    ]

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await client.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 2048,
            system: systemPrompt,
            messages: messagesWithContext.map(m => ({
              role: m.role,
              content: m.content,
            })),
          })

          for await (const chunk of response) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              const data = `data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`
              controller.enqueue(encoder.encode(data))
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch {
          const errData = `data: ${JSON.stringify({ error: 'STREAM_INTERRUPTED' })}\n\n`
          controller.enqueue(encoder.encode(errData))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (e: unknown) {
    console.error('/api/chat error:', e)
    return Response.json<ApiError>(
      { error: 'Anthropic API 오류', code: 'ANTHROPIC_ERROR' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: 커밋**

```bash
git add app/api/chat/route.ts
git commit -m "feat: add /api/chat SSE streaming route with context compression"
```

---

## Task 10: 업로드 컴포넌트

**Files:**
- Create: `components/upload/FileDropzone.tsx`
- Create: `components/upload/DataTypeSelector.tsx`

- [ ] **Step 1: FileDropzone.tsx 작성**

`components/upload/FileDropzone.tsx`:

```tsx
'use client'

import { useCallback, useState } from 'react'
import { FileType } from '@/types/marketing'

interface FileWithType {
  file: File
  type: FileType
}

interface Props {
  onFilesSelected: (files: FileWithType[]) => void
  disabled?: boolean
}

const FILE_TYPE_LABELS: Record<FileType, string> = {
  sales: '매출·회원',
  googleAds: '구글 애즈',
  partnership: '파트너십',
  traffic: '트래픽',
}

export function FileDropzone({ onFilesSelected, disabled }: Props) {
  const [dragOver, setDragOver] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<FileWithType[]>([])

  const handleFiles = useCallback((files: File[]) => {
    const xlsx = files.filter(f => {
      const ext = f.name.split('.').pop()?.toLowerCase()
      return ext === 'xlsx' || ext === 'csv'
    })
    if (!xlsx.length) return

    const withTypes: FileWithType[] = xlsx.map(file => {
      const lower = file.name.toLowerCase()
      let type: FileType = 'sales'
      if (lower.includes('google') || lower.includes('ads') || lower.includes('구글')) type = 'googleAds'
      else if (lower.includes('partner') || lower.includes('파트너')) type = 'partnership'
      else if (lower.includes('traffic') || lower.includes('트래픽')) type = 'traffic'
      return { file, type }
    })
    setSelectedFiles(withTypes)
    onFilesSelected(withTypes)
  }, [onFilesSelected])

  const updateType = (index: number, type: FileType) => {
    const updated = selectedFiles.map((f, i) => i === index ? { ...f, type } : f)
    setSelectedFiles(updated)
    onFilesSelected(updated)
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault()
          setDragOver(false)
          handleFiles(Array.from(e.dataTransfer.files))
        }}
        onClick={() => !disabled && document.getElementById('file-input')?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${dragOver ? 'border-blue-400 bg-blue-900/20' : 'border-zinc-600 hover:border-zinc-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <p className="text-2xl mb-2">📁</p>
        <p className="text-zinc-300">파일을 드래그하거나 클릭해서 업로드</p>
        <p className="text-zinc-500 text-sm mt-1">.xlsx / .csv 지원 · 최대 4개 · 개당 5MB</p>
        <input
          id="file-input"
          type="file"
          multiple
          accept=".xlsx,.csv"
          className="hidden"
          onChange={e => handleFiles(Array.from(e.target.files ?? []))}
        />
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          {selectedFiles.map((fw, i) => (
            <div key={i} className="flex items-center gap-3 bg-zinc-800 rounded-lg px-3 py-2">
              <span className="text-zinc-300 flex-1 truncate text-sm">{fw.file.name}</span>
              <select
                value={fw.type}
                onChange={e => updateType(i, e.target.value as FileType)}
                className="bg-zinc-700 text-zinc-200 text-sm rounded px-2 py-1 border border-zinc-600"
              >
                {(Object.keys(FILE_TYPE_LABELS) as FileType[]).map(t => (
                  <option key={t} value={t}>{FILE_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: DataTypeSelector.tsx 작성**

`components/upload/DataTypeSelector.tsx`:

```tsx
'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

const DATA_TYPES = [
  { id: 'sales', label: '매출·회원 현황', description: '일별 매출, 주문, 신규회원', required: true },
  { id: 'googleAds', label: '구글 애즈', description: 'GDN, 검색, 쇼핑 캠페인', required: false },
  { id: 'partnership', label: '파트너십 광고', description: '제휴 마케터 유입·전환', required: false },
  { id: 'traffic', label: '웹 트래픽', description: '국내/해외 세션, 방문자', required: false },
]

interface Props {
  selected: string[]
  onChange: (selected: string[]) => void
}

export function DataTypeSelector({ selected, onChange }: Props) {
  const toggle = (id: string) => {
    if (id === 'sales') return // 필수
    onChange(
      selected.includes(id)
        ? selected.filter(s => s !== id)
        : [...selected, id]
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {DATA_TYPES.map(dt => (
        <div
          key={dt.id}
          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer
            ${selected.includes(dt.id) ? 'border-blue-500 bg-blue-900/20' : 'border-zinc-700'}`}
          onClick={() => toggle(dt.id)}
        >
          <Checkbox
            id={dt.id}
            checked={selected.includes(dt.id)}
            disabled={dt.required}
            className="mt-0.5"
          />
          <div>
            <Label htmlFor={dt.id} className="text-zinc-200 cursor-pointer">
              {dt.label}
              {dt.required && <span className="text-red-400 ml-1 text-xs">필수</span>}
            </Label>
            <p className="text-zinc-500 text-xs">{dt.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: 커밋**

```bash
git add components/upload/
git commit -m "feat: add FileDropzone and DataTypeSelector upload components"
```

---

## Task 11: 홈 페이지

**Files:**
- Create: `app/page.tsx`

- [ ] **Step 1: app/page.tsx 작성**

`app/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileDropzone } from '@/components/upload/FileDropzone'
import { saveSession } from '@/lib/session-storage'
import { clearSession } from '@/lib/session-storage'
import type { FileType } from '@/types/marketing'

interface FileWithType { file: File; type: FileType }

export default function HomePage() {
  const router = useRouter()
  const [files, setFiles] = useState<FileWithType[]>([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = files.length > 0 && files.some(f => f.type === 'sales') && !loading

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    clearSession()

    const formData = new FormData()
    for (const { file, type } of files) {
      formData.append('files', file)
      formData.append(`fileType_${file.name}`, type)
    }

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? '업로드 실패')
        return
      }

      saveSession(json.data, json.summary)
      router.push('/analysis')
    } catch {
      setError('네트워크 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-2xl text-zinc-100">📊 마케팅 데이터 분석</CardTitle>
          <p className="text-zinc-400">쇼핑몰 매출·광고 데이터를 업로드하면 AI가 원인을 분석합니다</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <FileDropzone onFilesSelected={setFiles} disabled={loading} />

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-zinc-400 text-sm block mb-1">분석 시작일</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 rounded px-3 py-2"
              />
            </div>
            <div className="flex-1">
              <label className="text-zinc-400 text-sm block mb-1">분석 종료일</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 rounded px-3 py-2"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex-1 bg-blue-600 hover:bg-blue-500"
            >
              {loading ? '분석 준비 중...' : '분석 시작'}
            </Button>
            <Button variant="outline" onClick={() => router.push('/guide')} className="border-zinc-700">
              데이터 준비 가이드
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
```

- [ ] **Step 2: 개발 서버에서 홈 페이지 확인**

```bash
npm run dev
```

`http://localhost:3000` 접속. 드롭존, 날짜 입력, 버튼 확인.

- [ ] **Step 3: 커밋**

```bash
git add app/page.tsx
git commit -m "feat: add home page with file upload UI"
```

---

## Task 12: 차트 컴포넌트 4개

**Files:**
- Create: `components/charts/SalesChart.tsx`
- Create: `components/charts/MemberChart.tsx`
- Create: `components/charts/AdChart.tsx`
- Create: `components/charts/TrafficChart.tsx`

- [ ] **Step 1: SalesChart.tsx**

`components/charts/SalesChart.tsx`:

```tsx
'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { SalesRow } from '@/types/marketing'
import { toSalesChartData } from '@/lib/data-transformer'

interface Props { data: SalesRow[] }

export function SalesChart({ data }: Props) {
  const chartData = toSalesChartData(data)
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
        <XAxis dataKey="date" stroke="#71717a" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
        <YAxis stroke="#71717a" tick={{ fontSize: 11 }} tickFormatter={v => `${(v/10000).toFixed(0)}만`} />
        <Tooltip
          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
          formatter={(v: number) => [`${v.toLocaleString()}원`, '매출']}
          labelFormatter={l => `날짜: ${l}`}
        />
        <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 2: MemberChart.tsx**

`components/charts/MemberChart.tsx`:

```tsx
'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { SalesRow } from '@/types/marketing'
import { toSalesChartData } from '@/lib/data-transformer'

interface Props { data: SalesRow[] }

export function MemberChart({ data }: Props) {
  const chartData = toSalesChartData(data)
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
        <XAxis dataKey="date" stroke="#71717a" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
        <YAxis stroke="#71717a" tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
          formatter={(v: number) => [`${v.toLocaleString()}명`, '신규가입']}
        />
        <Bar dataKey="newMembers" fill="#10b981" />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 3: AdChart.tsx (dual-axis ComposedChart)**

`components/charts/AdChart.tsx`:

```tsx
'use client'

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import type { GoogleAdsRow } from '@/types/marketing'
import { toAdChartData } from '@/lib/data-transformer'

interface Props { data: GoogleAdsRow[] }

export function AdChart({ data }: Props) {
  const chartData = toAdChartData(data)
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
        <XAxis dataKey="date" stroke="#71717a" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
        <YAxis yAxisId="left" stroke="#71717a" tick={{ fontSize: 11 }} tickFormatter={v => `${(v/10000).toFixed(0)}만`} />
        <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" tick={{ fontSize: 11 }} tickFormatter={v => `${v}x`} />
        <Tooltip
          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
          formatter={(v: number, name: string) =>
            name === 'adSpend' ? [`${v.toLocaleString()}원`, '광고비'] : [`${v}x`, 'ROAS']
          }
        />
        <Legend />
        <Bar yAxisId="left" dataKey="adSpend" fill="#6366f1" name="광고비" />
        <Line yAxisId="right" type="monotone" dataKey="roas" stroke="#f59e0b" strokeWidth={2} dot={false} name="ROAS" />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 4: TrafficChart.tsx (stacked BarChart)**

`components/charts/TrafficChart.tsx`:

```tsx
'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { TrafficRow } from '@/types/marketing'
import { toTrafficChartData } from '@/lib/data-transformer'

interface Props { data: TrafficRow[] }

export function TrafficChart({ data }: Props) {
  const chartData = toTrafficChartData(data)
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
        <XAxis dataKey="date" stroke="#71717a" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
        <YAxis stroke="#71717a" tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }} />
        <Legend />
        <Bar dataKey="domestic" stackId="a" fill="#3b82f6" name="국내" />
        <Bar dataKey="overseas" stackId="a" fill="#ef4444" name="해외" />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 5: 커밋**

```bash
git add components/charts/
git commit -m "feat: add 4 chart components (Sales, Member, Ad dual-axis, Traffic stacked)"
```

---

## Task 13: 분석 컴포넌트

**Files:**
- Create: `components/analysis/ReportStream.tsx`
- Create: `components/analysis/ChatInterface.tsx`

- [ ] **Step 1: ReportStream.tsx**

`components/analysis/ReportStream.tsx`:

```tsx
'use client'

import { useEffect, useRef } from 'react'

interface Props {
  text: string
  isStreaming: boolean
}

export function ReportStream({ text, isStreaming }: Props) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [text])

  if (!text && !isStreaming) {
    return (
      <div className="flex items-center justify-center h-32 text-zinc-500">
        데이터를 업로드하면 AI 분석이 시작됩니다
      </div>
    )
  }

  return (
    <div className="prose prose-invert prose-sm max-w-none">
      {/* 마크다운을 섹션별로 파싱해서 렌더링 */}
      {text.split('\n').map((line, i) => {
        if (line.startsWith('## ')) {
          return <h2 key={i} className="text-blue-400 font-semibold mt-4 mb-2 text-base">{line.slice(3)}</h2>
        }
        if (line.startsWith('### ')) {
          return <h3 key={i} className="text-zinc-300 font-medium mt-3 mb-1 text-sm">{line.slice(4)}</h3>
        }
        if (line.startsWith('- ')) {
          return <li key={i} className="text-zinc-300 text-sm ml-4 list-disc">{line.slice(2)}</li>
        }
        if (line.trim() === '') return <br key={i} />
        return <p key={i} className="text-zinc-300 text-sm leading-relaxed">{line}</p>
      })}
      {isStreaming && <span className="inline-block w-2 h-4 bg-blue-400 ml-1 animate-pulse" />}
      <div ref={endRef} />
    </div>
  )
}
```

- [ ] **Step 2: ChatInterface.tsx**

`components/analysis/ChatInterface.tsx`:

```tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import type { ChatMessage, ParsedData } from '@/types/marketing'
import { trimMessages } from '@/lib/context-compressor'

interface Props {
  data: ParsedData
  initialAnalysis: string
  disabled?: boolean
}

export function ChatInterface({ data, initialAnalysis, disabled }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isResponding, setIsResponding] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || isResponding || disabled) return

    const userMessage: ChatMessage = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsResponding(true)

    const assistantMessage: ChatMessage = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, assistantMessage])

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 120_000)

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: trimMessages(newMessages),
          data,
          initialAnalysis,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6)
          if (raw === '[DONE]') break
          try {
            const parsed = JSON.parse(raw)
            if (parsed.text) {
              fullText += parsed.text
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', content: fullText }
                return updated
              })
            }
          } catch { /* ignore */ }
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: '응답 중 오류가 발생했습니다.' }
        return updated
      })
    } finally {
      setIsResponding(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-3 p-3 min-h-0">
        {messages.length === 0 && (
          <p className="text-zinc-500 text-sm text-center py-4">
            분석 결과에 대해 추가 질문을 해보세요
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
              msg.role === 'user'
                ? 'bg-blue-700 text-white'
                : 'bg-zinc-800 text-zinc-200'
            }`}>
              {msg.content || (isResponding && i === messages.length - 1
                ? <span className="inline-block w-2 h-3 bg-zinc-400 animate-pulse" />
                : '')}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex gap-2 p-3 border-t border-zinc-800">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder={disabled ? 'AI 분석 완료 후 질문 가능합니다' : '추가 질문을 입력하세요...'}
          disabled={isResponding || disabled}
          className="flex-1 bg-zinc-800 border border-zinc-700 text-zinc-200 rounded px-3 py-2 text-sm disabled:opacity-50"
        />
        <Button
          onClick={sendMessage}
          disabled={!input.trim() || isResponding || disabled}
          size="sm"
          className="bg-blue-600 hover:bg-blue-500"
        >
          {isResponding ? '...' : '전송'}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 커밋**

```bash
git add components/analysis/
git commit -m "feat: add ReportStream and ChatInterface analysis components"
```

---

## Task 14: 분석 결과 페이지

**Files:**
- Create: `app/analysis/page.tsx`

- [ ] **Step 1: page.tsx 작성**

`app/analysis/page.tsx`:

```tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { SalesChart } from '@/components/charts/SalesChart'
import { MemberChart } from '@/components/charts/MemberChart'
import { AdChart } from '@/components/charts/AdChart'
import { TrafficChart } from '@/components/charts/TrafficChart'
import { ReportStream } from '@/components/analysis/ReportStream'
import { ChatInterface } from '@/components/analysis/ChatInterface'
import { loadSession } from '@/lib/session-storage'
import type { ParsedData, DataSummary } from '@/types/marketing'

export default function AnalysisPage() {
  const router = useRouter()
  const [data, setData] = useState<ParsedData | null>(null)
  const [summary, setSummary] = useState<DataSummary | null>(null)
  const [report, setReport] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisDone, setAnalysisDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasStarted = useRef(false)

  useEffect(() => {
    const session = loadSession()
    if (!session) {
      router.replace('/')
      return
    }
    setData(session.data)
    setSummary(session.summary)
  }, [router])

  useEffect(() => {
    if (!data || hasStarted.current) return
    hasStarted.current = true
    runAnalysis(data, summary!)
  }, [data, summary])

  const runAnalysis = async (d: ParsedData, s: DataSummary) => {
    setIsAnalyzing(true)
    setError(null)

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 120_000)

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: d, dateRange: s.dateRange }),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (!res.ok) {
        const json = await res.json()
        setError(json.error ?? '분석 실패')
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6)
          if (raw === '[DONE]') break
          try {
            const parsed = JSON.parse(raw)
            if (parsed.error) { setError('분석 중 오류가 발생했습니다'); return }
            if (parsed.text) {
              fullText += parsed.text
              setReport(fullText)
            }
          } catch { /* ignore */ }
        }
      }
      setAnalysisDone(true)
    } catch {
      setError('네트워크 오류 또는 타임아웃')
    } finally {
      setIsAnalyzing(false)
    }
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400">데이터 로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-100">마케팅 분석 결과</h1>
            {summary && (
              <p className="text-zinc-500 text-sm">
                {summary.dateRange.start} ~ {summary.dateRange.end} ·
                {summary.uploadedFiles.join(', ')} 데이터
              </p>
            )}
          </div>
          <Button variant="outline" onClick={() => router.push('/')} className="border-zinc-700 text-sm">
            ← 새 분석
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 차트 영역 */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-zinc-200 text-base">데이터 시각화</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="sales">
                <TabsList className="bg-zinc-800 mb-4">
                  <TabsTrigger value="sales">매출</TabsTrigger>
                  <TabsTrigger value="members">회원</TabsTrigger>
                  {data.googleAds && <TabsTrigger value="ads">광고</TabsTrigger>}
                  {data.traffic && <TabsTrigger value="traffic">트래픽</TabsTrigger>}
                </TabsList>
                <TabsContent value="sales"><SalesChart data={data.sales} /></TabsContent>
                <TabsContent value="members"><MemberChart data={data.sales} /></TabsContent>
                {data.googleAds && <TabsContent value="ads"><AdChart data={data.googleAds} /></TabsContent>}
                {data.traffic && <TabsContent value="traffic"><TrafficChart data={data.traffic} /></TabsContent>}
              </Tabs>
            </CardContent>
          </Card>

          {/* AI 리포트 */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-zinc-200 text-base flex items-center gap-2">
                🤖 AI 분석 리포트
                {isAnalyzing && <span className="text-xs text-blue-400 font-normal">분석 중...</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-96 overflow-y-auto">
              {error ? (
                <div className="text-red-400 text-sm">{error}</div>
              ) : !report && isAnalyzing ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full bg-zinc-800" />
                  <Skeleton className="h-4 w-3/4 bg-zinc-800" />
                  <Skeleton className="h-4 w-5/6 bg-zinc-800" />
                </div>
              ) : (
                <ReportStream text={report} isStreaming={isAnalyzing} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* 채팅 */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-zinc-200 text-base">💬 추가 질문</CardTitle>
          </CardHeader>
          <CardContent className="h-72 flex flex-col p-0">
            <ChatInterface data={data} initialAnalysis={report} disabled={!analysisDone} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add app/analysis/page.tsx
git commit -m "feat: add analysis page with charts, AI report streaming, and chat"
```

---

## Task 15: 가이드 페이지 + 샘플 파일 생성

**Files:**
- Create: `app/guide/page.tsx`
- Create: `scripts/generate-samples.ts`
- Create: `public/samples/*.xlsx` (스크립트 실행으로 생성)

- [ ] **Step 1: guide/page.tsx 작성**

`app/guide/page.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const FILE_GUIDES = [
  {
    name: '매출·회원 (sales.xlsx) — 필수',
    file: 'sales_sample.xlsx',
    columns: [
      { name: '날짜', type: 'YYYY-MM-DD', required: true, example: '2025-01-01' },
      { name: '일별_매출액', type: '숫자 (원)', required: true, example: '12500000' },
      { name: '주문_건수', type: '숫자', required: true, example: '340' },
      { name: '신규_회원_가입수', type: '숫자', required: true, example: '85' },
      { name: '누적_회원수', type: '숫자', required: false, example: '15820' },
      { name: '구매_전환율', type: '숫자 (%)', required: false, example: '3.2' },
      { name: '평균_객단가', type: '숫자 (원)', required: false, example: '36700' },
      { name: '반품_취소_건수', type: '숫자', required: false, example: '12' },
    ],
  },
  {
    name: '구글 애즈 (google_ads.xlsx) — 선택',
    file: 'google_ads_sample.xlsx',
    columns: [
      { name: '날짜', type: 'YYYY-MM-DD', required: true, example: '2025-01-01' },
      { name: '캠페인명', type: '텍스트', required: true, example: 'GDN_브랜드' },
      { name: '노출수', type: '숫자', required: true, example: '250000' },
      { name: '클릭수', type: '숫자', required: true, example: '3200' },
      { name: '광고비_지출', type: '숫자 (원)', required: true, example: '2500000' },
      { name: '전환수', type: '숫자', required: false, example: '85' },
      { name: 'CPA', type: '숫자 (원)', required: false, example: '29400' },
      { name: 'ROAS', type: '숫자 (배수)', required: false, example: '5.2' },
    ],
  },
  {
    name: '파트너십 광고 (partnership.xlsx) — 선택',
    file: 'partnership_sample.xlsx',
    columns: [
      { name: '날짜', type: 'YYYY-MM-DD', required: true, example: '2025-01-01' },
      { name: '파트너명', type: '텍스트', required: true, example: '파트너A' },
      { name: '유입_클릭수', type: '숫자', required: true, example: '1200' },
      { name: '회원가입_전환수', type: '숫자', required: true, example: '45' },
      { name: '구매_전환수', type: '숫자', required: true, example: '12' },
      { name: '파트너_발생매출', type: '숫자 (원)', required: false, example: '450000' },
      { name: '지급_보상액', type: '숫자 (원)', required: false, example: '45000' },
    ],
  },
  {
    name: '웹 트래픽 (traffic.xlsx) — 선택',
    file: 'traffic_sample.xlsx',
    columns: [
      { name: '날짜', type: 'YYYY-MM-DD', required: true, example: '2025-01-01' },
      { name: '전체_세션수', type: '숫자', required: true, example: '15000' },
      { name: '국내_세션수', type: '숫자', required: true, example: '12000' },
      { name: '해외_세션수', type: '숫자', required: true, example: '3000' },
      { name: '신규_방문자수', type: '숫자', required: false, example: '8500' },
      { name: '이탈률', type: '숫자 (%)', required: false, example: '42.5' },
    ],
  },
]

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-100">데이터 준비 가이드</h1>
          <Link href="/"><Button variant="outline" className="border-zinc-700">← 홈으로</Button></Link>
        </div>

        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 text-blue-200 text-sm">
          <strong>📌 준비 팁:</strong> 엑셀 파일명에 sales, google_ads, partnership, traffic 키워드를 포함하면
          업로드 시 자동으로 파일 유형이 인식됩니다.
        </div>

        {FILE_GUIDES.map(guide => (
          <Card key={guide.name} className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-zinc-200 text-base">{guide.name}</CardTitle>
                <a href={`/samples/${guide.file}`} download>
                  <Button size="sm" variant="outline" className="border-zinc-700 text-xs">
                    샘플 다운로드
                  </Button>
                </a>
              </div>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-700">
                    <th className="text-left py-2 text-zinc-400 font-medium">컬럼명</th>
                    <th className="text-left py-2 text-zinc-400 font-medium">형식</th>
                    <th className="text-left py-2 text-zinc-400 font-medium">예시</th>
                    <th className="text-center py-2 text-zinc-400 font-medium">필수</th>
                  </tr>
                </thead>
                <tbody>
                  {guide.columns.map(col => (
                    <tr key={col.name} className="border-b border-zinc-800">
                      <td className="py-2 text-zinc-200 font-mono text-xs">{col.name}</td>
                      <td className="py-2 text-zinc-400 text-xs">{col.type}</td>
                      <td className="py-2 text-zinc-500 text-xs">{col.example}</td>
                      <td className="py-2 text-center">
                        {col.required
                          ? <span className="text-red-400 text-xs">필수</span>
                          : <span className="text-zinc-600 text-xs">선택</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 샘플 파일 생성 스크립트 작성**

`scripts/generate-samples.ts`:

```typescript
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
XLSX.writeFile(XLSX.utils.book_append_sheet(XLSX.utils.book_new(), XLSX.utils.json_to_sheet(salesData), 'Sheet1'), path.join(outDir, 'sales_sample.xlsx'))

// google_ads
const adsData = dates.flatMap(date => [
  { 날짜: date, 캠페인명: 'GDN_브랜드', 노출수: randomInt(100000, 300000), 클릭수: randomInt(1000, 4000), 광고비_지출: randomInt(1000000, 3000000), 전환수: randomInt(30, 100), ROAS: parseFloat((Math.random() * 3 + 3).toFixed(1)) },
  { 날짜: date, 캠페인명: '검색_키워드', 노출수: randomInt(50000, 150000), 클릭수: randomInt(500, 2000), 광고비_지출: randomInt(500000, 1500000), 전환수: randomInt(20, 60), ROAS: parseFloat((Math.random() * 2 + 4).toFixed(1)) },
])
XLSX.writeFile(XLSX.utils.book_append_sheet(XLSX.utils.book_new(), XLSX.utils.json_to_sheet(adsData), 'Sheet1'), path.join(outDir, 'google_ads_sample.xlsx'))

// partnership
const partnerData = dates.map(date => ({
  날짜: date, 파트너명: '파트너A', 유입_클릭수: randomInt(500, 3000), 랜딩페이지_도달수: randomInt(400, 2500), 회원가입_전환수: randomInt(10, 80), 구매_전환수: randomInt(2, 20), 파트너_발생매출: randomInt(100000, 800000), 지급_보상액: randomInt(10000, 80000),
}))
XLSX.writeFile(XLSX.utils.book_append_sheet(XLSX.utils.book_new(), XLSX.utils.json_to_sheet(partnerData), 'Sheet1'), path.join(outDir, 'partnership_sample.xlsx'))

// traffic
const trafficData = dates.map(date => ({
  날짜: date, 전체_세션수: randomInt(10000, 25000), 국내_세션수: randomInt(8000, 18000), 해외_세션수: randomInt(1000, 8000), 신규_방문자수: randomInt(4000, 12000), 재방문자수: randomInt(3000, 10000), 평균_세션_시간: randomInt(90, 300), 이탈률: parseFloat((Math.random() * 20 + 35).toFixed(1)), 페이지뷰: randomInt(30000, 80000),
}))
XLSX.writeFile(XLSX.utils.book_append_sheet(XLSX.utils.book_new(), XLSX.utils.json_to_sheet(trafficData), 'Sheet1'), path.join(outDir, 'traffic_sample.xlsx'))

console.log('샘플 파일 생성 완료:', outDir)
```

- [ ] **Step 3: 샘플 파일 생성 실행**

```bash
npx ts-node --project tsconfig.json scripts/generate-samples.ts
```

Expected: `public/samples/` 에 4개 .xlsx 파일 생성됨.

- [ ] **Step 4: 커밋**

```bash
git add app/guide/page.tsx scripts/generate-samples.ts public/samples/
git commit -m "feat: add guide page, sample generator script, and sample xlsx files"
```

---

## Task 16: 최종 확인 및 Vercel 배포 준비

**Files:**
- Verify: `vercel.json`
- Verify: `.env.local` (로컬)

- [ ] **Step 1: 전체 빌드 확인**

```bash
npm run build
```

Expected: 오류 없이 빌드 완료. TypeScript 에러 없음.

- [ ] **Step 2: 로컬 E2E 확인**

```bash
npm run dev
```

1. `http://localhost:3000` → 업로드 페이지 확인
2. `public/samples/sales_sample.xlsx` 업로드 테스트
3. `/analysis` 이동 → 차트 렌더링 확인
4. AI 분석 스트리밍 시작 확인
5. 채팅 질문 테스트
6. `/guide` 페이지 확인, 샘플 파일 다운로드 확인

- [ ] **Step 3: next.config.ts 에 API body size 설정 추가**

`next.config.ts`에 업로드 크기 제한 설정:

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {}

export default nextConfig
```

그리고 `app/api/upload/route.ts` 상단에 Route Handler 크기 제한 설정 추가:

```typescript
export const config = {
  api: { bodyParser: false },
}
```

> **참고:** Vercel 무료 플랜 기본 요청 크기 제한은 4.5MB입니다. 파일이 이보다 크면 Vercel Pro 이상에서 `maxRequestBodySize` 설정이 필요합니다.

- [ ] **Step 4: Vercel 배포 (Vercel CLI 미설치 시 GitHub 연동 사용)**

방법 A — Vercel CLI:
```bash
npm i -g vercel
vercel
# 프롬프트: 프로젝트 연결, 환경변수 ANTHROPIC_API_KEY 입력
```

방법 B — GitHub 연동:
1. `git push origin main`
2. vercel.com → New Project → GitHub 레포 연결
3. Environment Variables에 `ANTHROPIC_API_KEY` 추가
4. Deploy

- [ ] **Step 5: 최종 커밋**

```bash
git add next.config.ts vercel.json
git commit -m "feat: finalize build config and deployment setup"
```

---

## 완료 체크리스트

- [ ] 홈 페이지: 파일 드롭존, 날짜 입력, 파일 유형 자동 감지
- [ ] 업로드 API: xlsx 파싱, 유효성 검사, 에러 코드 반환
- [ ] 분석 페이지: 4개 차트 탭 + AI 리포트 스트리밍
- [ ] 채팅: 후속 질문, 컨텍스트 압축, 120초 타임아웃
- [ ] 가이드 페이지: 컬럼 설명 + 샘플 다운로드
- [ ] sessionStorage TTL 1시간 + QuotaError 처리
- [ ] vercel.json maxDuration 120초
- [ ] ANTHROPIC_API_KEY 환경변수 (코드 노출 없음)
