# 마케팅 데이터 분석 웹사이트 설계 문서

**날짜:** 2026-03-18
**상태:** 승인됨
**프로젝트:** 쇼핑몰 매출·광고 데이터 AI 분석 플랫폼

---

## 1. 프로젝트 개요

쇼핑몰 운영자가 일별 매출·광고 데이터를 엑셀로 업로드하면, 차트로 시각화하고 Claude AI가 마케팅 원인·결과를 자동 분석해주는 내부용 웹 애플리케이션.

### 배경
- 2025-02-27 ~ 2025-03-16 기간 회원수·매출 급증 후 2025-03-17 급락
- GDN, 파트너십 광고, 구글 애즈 등 복수 광고 채널 운영 중
- 해외 트래픽 급증 (국내 전용 서비스임에도)
- 파트너십 광고 유입은 높으나 구매전환율 낮음

### 목표
- 광고 채널별 기여도 정량 분석
- 이상 급등/급락 구간 자동 감지 및 원인 특정
- 후속 질문이 가능한 대화형 AI 분석

---

## 2. 기술 스택

| 항목 | 선택 |
|---|---|
| 프레임워크 | Next.js 15 App Router |
| UI 컴포넌트 | shadcn/ui + Tailwind CSS |
| 차트 | Recharts (ComposedChart for dual-axis) |
| 엑셀 파싱 | xlsx (SheetJS) |
| AI | Anthropic SDK (claude-sonnet-4-6) |
| 배포 | Vercel |
| 인증 | 없음 (Vercel Password Protection 권장, Pro 이상) |

---

## 3. 페이지 구성

### 3.1 홈 페이지 `/`
- 파일 드래그&드롭 업로드 (다중 파일 동시, 최대 4개)
- 데이터 유형 선택 체크박스
  - 필수: 매출·회원 파일 1개 이상
  - 선택: 구글 애즈 / 파트너십 / 트래픽 (업로드된 파일만 분석에 포함)
- 분석 기간 입력 (시작일 ~ 종료일)
- 업로드 시작 시 기존 sessionStorage 데이터 즉시 삭제

### 3.2 분석 결과 페이지 `/analysis`
- **진입 가드:** sessionStorage에 유효한 데이터 없으면 즉시 `/`로 리다이렉트
- **stale 데이터 가드:** 업로드 후 1시간 경과 시 `/`로 리다이렉트 (timestamp 기반)
- 좌측: 차트 4개 탭
  - 매출 추이: `LineChart` (x=날짜, y=매출액)
  - 회원 가입: `BarChart` (x=날짜, y=신규가입수)
  - 광고 성과: `ComposedChart` (y1=광고비 Bar, y2=ROAS Line, 이중 YAxis)
  - 트래픽: `BarChart` stacked (x=날짜, y=국내/해외 세션 누적)
- 우측: AI 분석 리포트 스트리밍
- 하단: 채팅 인터페이스

### 3.3 가이드 페이지 `/guide`
- 각 파일별 필수 컬럼 및 입력 예시 설명
- 샘플 엑셀 파일 다운로드 (정적 파일 `/public/samples/` 에 배치)
  - 4개 파일: sales_sample.xlsx, google_ads_sample.xlsx, partnership_sample.xlsx, traffic_sample.xlsx
  - 각 파일: 헤더 행 + 30일치 합성 더미 데이터

---

## 4. 라우트 간 데이터 흐름 (세션 전략)

```
1. POST /api/upload → 파싱된 JSON 반환
2. 클라이언트: sessionStorage에 저장
   - try/catch 필수: QuotaExceededError 시 사용자에게 "데이터가 너무 큽니다" 에러 표시
   - 저장 형식: { data: ParsedData, timestamp: ISO8601, rowCounts: {...} }
3. router.push('/analysis')
4. /analysis 마운트 시:
   - sessionStorage 없으면 → '/' 리다이렉트
   - timestamp 기준 1시간 초과 → '/' 리다이렉트
   - 정상이면 → 차트 렌더링 + /api/analyze 자동 호출
5. /api/analyze, /api/chat 호출 시 요청 body에 데이터 포함
```

**sessionStorage 크기 관리:**
- 파싱 시 최대 10,000행으로 제한 (초과 시 날짜 범위 내 최신 데이터 우선)
- 저장 전 JSON.stringify 후 byte 크기 측정, 4MB 초과 시 수치 컬럼만 유지 (string 컬럼 제거)

---

## 5. 데이터 스키마

### 날짜 형식 지원
- YYYY-MM-DD, YYYY/MM/DD, MM/DD/YYYY
- 한국어 로케일 (2025년 2월 27일) 파싱 지원
- 내부 처리: ISO 8601 (YYYY-MM-DD)

### 5.1 매출·회원 현황 (sales.xlsx) — **필수**

| 컬럼명 | 타입 | 단위 | 필수 |
|---|---|---|---|
| 날짜 | date | - | ✓ |
| 일별_매출액 | number | 원 | ✓ |
| 주문_건수 | number | 건 | ✓ |
| 신규_회원_가입수 | number | 명 | ✓ |
| 누적_회원수 | number | 명 | |
| 구매_전환율 | number | % | |
| 평균_객단가 | number | 원 | |
| 반품_취소_건수 | number | 건 | |

### 5.2 구글 애즈 (google_ads.xlsx) — 선택

| 컬럼명 | 타입 | 단위 | 필수 |
|---|---|---|---|
| 날짜 | date | - | ✓ |
| 캠페인명 | string | - | ✓ |
| 노출수 | number | 회 | ✓ |
| 클릭수 | number | 회 | ✓ |
| 광고비_지출 | number | 원 | ✓ |
| 전환수 | number | 건 | |
| CPA | number | 원 | |
| ROAS | number | 배수 | |
| 유입_국가 | string | 국가코드 | |

*CTR은 서버에서 클릭수/노출수로 계산 (파일에서 읽지 않음)*

### 5.3 파트너십 광고 (partnership.xlsx) — 선택

| 컬럼명 | 타입 | 단위 | 필수 |
|---|---|---|---|
| 날짜 | date | - | ✓ |
| 파트너명 | string | - | ✓ |
| 유입_클릭수 | number | 회 | ✓ |
| 랜딩페이지_도달수 | number | 회 | |
| 회원가입_전환수 | number | 명 | ✓ |
| 구매_전환수 | number | 건 | ✓ |
| 파트너_발생매출 | number | 원 | |
| 지급_보상액 | number | 원 | |

*`파트너_발생매출` 컬럼명으로 sales.xlsx의 `일별_매출액`과 명확히 구분*

### 5.4 웹 트래픽 (traffic.xlsx) — 선택

| 컬럼명 | 타입 | 단위 | 필수 |
|---|---|---|---|
| 날짜 | date | - | ✓ |
| 전체_세션수 | number | 회 | ✓ |
| 국내_세션수 | number | 회 | ✓ |
| 해외_세션수 | number | 회 | ✓ |
| 신규_방문자수 | number | 명 | |
| 재방문자수 | number | 명 | |
| 평균_세션_시간 | number | 초 | |
| 이탈률 | number | % | |
| 페이지뷰 | number | 회 | |

---

## 6. API 라우트 명세

### POST `/api/upload`

**요청:** `multipart/form-data`, 파일 최대 4개 (개당 5MB, 총합 20MB)
**허용 확장자:** `.xlsx`, `.csv`

**유효성 검사:**
1. 파일 확장자 확인
2. 파일 크기 확인
3. 필수 컬럼 존재 여부 확인
4. 날짜 컬럼 파싱 가능 여부
5. sales 파일 최소 1개 필수

**성공 응답 (200):**
```json
{
  "data": {
    "sales": [{ "날짜": "2025-01-01", "일별_매출액": 12500000, "주문_건수": 340, ... }],
    "googleAds": [...],
    "partnership": [...],
    "traffic": [...]
  },
  "summary": {
    "dateRange": { "start": "2025-01-01", "end": "2025-03-17" },
    "rowCounts": { "sales": 76, "googleAds": 152 },
    "uploadedFiles": ["sales", "googleAds"]
  }
}
```

**에러 응답:**
```json
{ "error": "설명 문자열", "code": "INVALID_FILE_TYPE" | "FILE_TOO_LARGE" | "MISSING_REQUIRED_COLUMN" | "PARSE_ERROR" | "NO_SALES_FILE" }
```
- 400: 파일 유형 오류, 파일 크기 초과, 필수 파일 누락
- 422: 파싱 실패, 필수 컬럼 누락
- 500: 서버 내부 오류

---

### POST `/api/analyze`

**요청:**
```json
{
  "data": { "sales": [...], "googleAds": [...], "partnership": [...], "traffic": [...] },
  "dateRange": { "start": "2025-01-01", "end": "2025-03-17" }
}
```

**Vercel Function 설정:** `maxDuration: 120` (vercel.json에 명시)

**성공 응답 (200):** `text/event-stream` (SSE)
```
data: {"text": "## 핵심 요약\n"}
data: {"text": "..."}
data: [DONE]
```

**에러:**
- 스트림 전: `{ "error": "string", "code": "ANTHROPIC_ERROR" | "DATA_TOO_LARGE" }` (400/500)
- 스트림 중 오류: `data: {"error": "STREAM_INTERRUPTED"}` 후 스트림 종료

**클라이언트:** `AbortController` timeout 120초 설정

---

### POST `/api/chat`

**요청:**
```json
{
  "messages": [
    { "role": "user", "content": "파트너십 광고 기여도만 분석해줘" }
  ],
  "data": { "sales": [...], ... },
  "initialAnalysis": "## 핵심 요약\n..."
}
```

**컨텍스트 크기 관리 전략:**
- `messages[]`: 최근 10턴만 유지 (초과 시 오래된 것 삭제)
- `data`: 원본 행 데이터 대신 일별 집계 요약본으로 압축 (평균, 합계, 최대값)
- `initialAnalysis`: 최대 3,000자로 잘라서 전달

**성공 응답 (200):** `/api/analyze`와 동일한 SSE 포맷
**Vercel Function 설정:** `maxDuration: 120`
**클라이언트:** `AbortController` timeout 120초 설정

---

## 7. UI 상태 정의

| 화면 | 상태 | 표시 |
|---|---|---|
| 업로드 | 기본 | 드롭존 활성, 분석 버튼 비활성 |
| 업로드 | 파일 선택됨 | 파일 목록 + 버튼 활성 |
| 업로드 | 업로드 중 | 버튼 스피너, 드롭존 비활성 |
| 업로드 | 오류 | 빨간 에러 메시지 인라인 |
| 분석 | 차트 로딩 | 스켈레톤 카드 4개 |
| 분석 | 차트 완료 | Recharts 렌더링 |
| 분석 | AI 분석 중 | 스트리밍 텍스트 + 커서 깜빡임 |
| 분석 | AI 완료 | 전체 리포트 + 채팅 입력 활성화 |
| 분석 | 채팅 응답 중 | 입력창 비활성 + 스피너 |
| 분석 | 세션 만료 | "세션이 만료되었습니다" 토스트 + `/` 리다이렉트 |

---

## 8. Claude 프롬프트 설계

### 시스템 프롬프트
```
당신은 이커머스 마케팅 데이터 분석 전문가입니다.
데이터를 기반으로 인과관계를 도출하고 구체적인 수치를 근거로 제시합니다.
추측이 아닌 데이터 증거에 기반한 분석만 합니다. 한국어로 응답합니다.
```

### 초기 분석 유저 프롬프트
```
다음 쇼핑몰 마케팅 데이터를 분석해주세요.
[분석 기간] {start} ~ {end}
[매출·회원 데이터] {sales JSON}
[구글 애즈 데이터] {googleAds JSON, 없으면 생략}
[파트너십 광고 데이터] {partnership JSON, 없으면 생략}
[트래픽 데이터] {traffic JSON, 없으면 생략}

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
## 실행 권고사항
```

---

## 9. vercel.json 설정

```json
{
  "functions": {
    "app/api/analyze/route.ts": { "maxDuration": 120 },
    "app/api/chat/route.ts": { "maxDuration": 120 }
  }
}
```

---

## 10. 환경 변수

```env
ANTHROPIC_API_KEY=sk-ant-...
```
Vercel 대시보드 환경변수로 관리. 코드 하드코딩 금지.

---

## 11. 디렉토리 구조

```
/
├── app/
│   ├── page.tsx
│   ├── analysis/page.tsx
│   ├── guide/page.tsx
│   └── api/
│       ├── upload/route.ts
│       ├── analyze/route.ts
│       └── chat/route.ts
├── components/
│   ├── upload/
│   │   ├── FileDropzone.tsx
│   │   └── DataTypeSelector.tsx
│   ├── charts/
│   │   ├── SalesChart.tsx
│   │   ├── MemberChart.tsx
│   │   ├── AdChart.tsx           # ComposedChart dual-axis
│   │   └── TrafficChart.tsx      # BarChart stacked
│   ├── analysis/
│   │   ├── ReportStream.tsx
│   │   └── ChatInterface.tsx
│   └── ui/
├── lib/
│   ├── excel-parser.ts
│   ├── data-transformer.ts
│   ├── prompt-builder.ts
│   ├── context-compressor.ts     # 채팅 컨텍스트 압축
│   └── session-storage.ts        # TTL + QuotaError 처리
├── public/samples/
│   ├── sales_sample.xlsx
│   ├── google_ads_sample.xlsx
│   ├── partnership_sample.xlsx
│   └── traffic_sample.xlsx
├── types/marketing.ts
└── vercel.json
```

---

## 12. 비기능 요구사항

- 파일 크기: 개당 최대 5MB, 총합 20MB
- 최대 행 수: 파일당 10,000행 (초과 시 최신 데이터 우선)
- 날짜 형식: YYYY-MM-DD, YYYY/MM/DD, MM/DD/YYYY, 한국어 로케일 지원
- AI 응답: 스트리밍 첫 토큰 3초 내
- 스트리밍 타임아웃: 120초 (서버 maxDuration + 클라이언트 AbortController)
- sessionStorage TTL: 1시간
- 차트: 반응형 (모바일/태블릿)
- 다크모드 기본 적용
