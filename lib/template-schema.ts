/**
 * template-schema.ts
 * 다운로드 템플릿 5종의 중앙 스키마 정의
 *
 * 이 파일은 아래의 기준 문서로 사용됩니다:
 *   - 다운로드용 XLSX 헤더 생성
 *   - 가이드/정의서 페이지 렌더링
 *   - (다음 단계) 업로드 파서 확장 기준
 *   - (다음 단계) 업로드 검증 로직 기준
 */

export interface ColumnDef {
  name: string               // 실제 컬럼명 (엑셀 헤더와 동일)
  type: string               // 입력 형식
  required: boolean | 'recommended'  // true=필수 / false=선택 / 'recommended'=선택 권장
  description: string        // 항목 의미
  missing: string            // 결측 시 처리
  derivable?: string         // 역산 가능 여부 및 공식
  noDerive?: boolean         // 역산 금지 항목
  warning?: string           // 품질 경고 조건
}

export interface SheetDef {
  sheetName: string
  columns: ColumnDef[]
}

export interface TemplateDef {
  id: string
  filename: string           // 다운로드 파일명
  label: string              // 사이트 내 표시명
  fileKeyword: string        // 업로드 자동인식 키워드 (향후 파서 연동)
  isRequired: boolean        // 분석 필수 여부
  description: string        // 파일 용도 설명
  sheets: SheetDef[]
}

// ─────────────────────────────────────────────────────────
// 1. 기본매출 템플릿
// ─────────────────────────────────────────────────────────
const salesTemplate: TemplateDef = {
  id: 'sales',
  filename: '기본매출_템플릿.xlsx',
  label: '기본매출',
  fileKeyword: 'sales',
  isRequired: true,
  description: '일별 매출·주문·회원 현황. 분석의 핵심 기준 데이터입니다.',
  sheets: [
    {
      sheetName: '매출데이터',
      columns: [
        { name: '날짜', type: 'YYYY-MM-DD', required: true, description: '해당 일자의 매출 및 주문 집계 기준일. 하루 단위 1행.', missing: '해당 행 분석 제외' },
        { name: '일별_매출액', type: '숫자 (원)', required: true, description: '해당 일자 총 매출액. 취소/환불 반영 전 기준이면 그 기준을 내부적으로 통일.', missing: '매출 분석 불가 — 해당 행 제외 또는 업로드 오류 처리' },
        { name: '주문_건수', type: '숫자', required: true, description: '해당 일자 총 주문 건수', missing: '전환 관련 보조 해석 제한' },
        { name: '신규_회원_가입수', type: '숫자', required: true, description: '해당 일자 신규 가입 완료 회원 수', missing: '신규 유입 분석 제한' },
        { name: '누적_회원수', type: '숫자', required: false, description: '해당 일자 기준 누적 회원 수', missing: '회원 기반 규모 추이 분석 제외. 핵심 분석은 계속 가능.' },
        { name: '구매_전환율', type: '숫자 (%)', required: false, description: '방문 대비 구매 전환율. 퍼센트 기호 없이 숫자만 입력 (예: 3.2)', missing: '트래픽 데이터 있으면 역산 검토, 없으면 미표시' },
        { name: '평균_객단가', type: '숫자 (원)', required: false, description: '주문 1건당 평균 매출액', missing: '일별_매출액·주문_건수 있으면 역산 가능', derivable: '일별_매출액 ÷ 주문_건수' },
        { name: '반품_취소_건수', type: '숫자', required: false, description: '해당 일자 반품/취소 건수', missing: '반품 영향 분석 제외' },
        { name: '반품_취소_금액', type: '숫자 (원)', required: false, description: '해당 일자 반품/취소 금액', missing: '순매출 보정 분석 제한' },
        { name: '실매출액', type: '숫자 (원)', required: false, description: '취소/환불 반영 후 실제 인식 매출', missing: '없으면 일별_매출액 중심 분석. 순매출 분석 제한.', noDerive: true },
        { name: '쿠폰_사용_주문수', type: '숫자', required: false, description: '쿠폰 적용 주문 수', missing: '쿠폰 기여 분석 제한' },
        { name: '쿠폰_사용_금액', type: '숫자 (원)', required: false, description: '쿠폰 할인 총액 또는 쿠폰 관련 금액', missing: '쿠폰 비용/효율 분석 제한' },
        { name: '신규_구매자수', type: '숫자', required: false, description: '해당 일자 첫 구매 고객 수', missing: '신규/기존 구매 분해 분석 제한' },
        { name: '기존_구매자수', type: '숫자', required: false, description: '해당 일자 기존 구매 고객 수', missing: '신규/기존 구매 분해 분석 제한' },
        { name: '상품_판매_수량', type: '숫자', required: false, description: '실제 판매된 상품 수량 합계', missing: '수량 기반 객단가/구매패턴 분석 제외' },
        { name: '비고', type: '텍스트', required: false, description: '해당 날짜 특이사항 자유 메모', missing: '분석에 영향 없음' },
      ],
    },
  ],
}

// ─────────────────────────────────────────────────────────
// 2. 구글 애즈 템플릿
// ─────────────────────────────────────────────────────────
const googleAdsTemplate: TemplateDef = {
  id: 'googleAds',
  filename: '구글애즈_템플릿.xlsx',
  label: '구글 애즈',
  fileKeyword: 'google_ads',
  isRequired: false,
  description: '구글 애즈 캠페인별 일별 광고 성과. 캠페인·그룹·소재 단위까지 입력 가능.',
  sheets: [
    {
      sheetName: '구글애즈데이터',
      columns: [
        { name: '날짜', type: 'YYYY-MM-DD', required: true, description: '광고 성과 집계일', missing: '해당 행 제외' },
        { name: '광고매체', type: '텍스트', required: 'recommended', description: '광고 집행 매체명. 예: Google Ads', missing: '매체 비교 분석 제외' },
        { name: '광고유형', type: '텍스트', required: 'recommended', description: '광고 유형. 예: 검색, 디스플레이(GDN), 쇼핑, 동영상', missing: '유형별 성과 비교 제한' },
        { name: '캠페인명', type: '텍스트', required: true, description: '광고 플랫폼 내 캠페인 단위 이름', missing: '업로드 오류 또는 해당 행 제외' },
        { name: '광고그룹명', type: '텍스트', required: false, description: '캠페인 하위 광고 그룹명', missing: '그룹 단위 원인 분석 제외' },
        { name: '소재명', type: '텍스트', required: false, description: '광고 문안/배너/영상 등 개별 소재명', missing: '소재 성과 비교 제외' },
        { name: '노출수', type: '숫자', required: true, description: '광고 노출 횟수', missing: 'CTR 분석 제한' },
        { name: '클릭수', type: '숫자', required: true, description: '광고 클릭 수', missing: 'CPC/CTR/전환율 해석 제한' },
        { name: '광고비_지출', type: '숫자 (원)', required: true, description: '실제 집행 광고비', missing: 'ROAS/CPA/효율 분석 불가' },
        { name: '전환수', type: '숫자', required: false, description: '광고 플랫폼 기준 전환 수 (전환기준 컬럼과 연동)', missing: '전환 효율 분석 제한' },
        { name: '광고귀속_매출', type: '숫자 (원)', required: false, description: '광고에 귀속된 매출 (플랫폼 보고 기준)', missing: 'ROAS 직접 계산 제한 — 입력된 ROAS만 참고', noDerive: true },
        { name: 'CPC', type: '숫자 (원)', required: false, description: '클릭당 비용', missing: '광고비/클릭수 있으면 역산 가능', derivable: '광고비_지출 ÷ 클릭수' },
        { name: 'CPA', type: '숫자 (원)', required: false, description: '전환당 비용', missing: '광고비/전환수 있으면 역산 가능', derivable: '광고비_지출 ÷ 전환수' },
        { name: 'CTR', type: '숫자 (%)', required: false, description: '클릭률. 퍼센트 기호 없이 숫자만 입력', missing: '노출수/클릭수 있으면 역산 가능', derivable: '클릭수 ÷ 노출수 × 100' },
        { name: 'ROAS', type: '숫자 (배수 또는 %)', required: false, description: '광고비 대비 귀속 매출 비율. 순이익·흑자 여부와 다름.', missing: '광고귀속_매출과 광고비 있으면 역산 가능', derivable: '광고귀속_매출 ÷ 광고비_지출' },
        { name: '전환기준', type: '텍스트', required: 'recommended', description: '구매, 회원가입, 장바구니 등 어떤 행동을 전환으로 보는지 명시', missing: '전환수 해석 가능하나 비교 해석 약화', noDerive: true },
        { name: '성과귀속기준', type: '텍스트', required: 'recommended', description: '1일 클릭, 7일 클릭, 1일 조회 등 성과 귀속 윈도우', missing: '캠페인 간 엄밀 비교 제한', noDerive: true },
        { name: '디바이스', type: '텍스트', required: false, description: '모바일, PC, 태블릿 등', missing: '디바이스 분석 제외' },
        { name: '유입_국가', type: '텍스트', required: false, description: '국가 단위 광고 성과. 예: KR, US', missing: '국가별 성과 분석 제외' },
        { name: '신규전환수', type: '숫자', required: false, description: '신규 고객 전환 수', missing: '신규/기존 전환 분해 분석 제외' },
        { name: '기존전환수', type: '숫자', required: false, description: '기존 고객 전환 수', missing: '신규/기존 전환 분해 분석 제외' },
        { name: '비고', type: '텍스트', required: false, description: '특이사항 메모', missing: '분석에 영향 없음' },
      ],
    },
  ],
}

// ─────────────────────────────────────────────────────────
// 3. 파트너십 템플릿
// ─────────────────────────────────────────────────────────
const partnershipTemplate: TemplateDef = {
  id: 'partnership',
  filename: '파트너십_템플릿.xlsx',
  label: '파트너십 광고',
  fileKeyword: 'partnership',
  isRequired: false,
  description: '파트너사별 일별 유입·전환·정산 현황. 향후 파트너 기여도·정산 분석 확장 기준.',
  sheets: [
    {
      sheetName: '파트너십데이터',
      columns: [
        { name: '날짜', type: 'YYYY-MM-DD', required: true, description: '파트너 성과 집계일', missing: '해당 행 제외' },
        { name: '파트너명', type: '텍스트', required: true, description: '파트너사 또는 채널 식별명', missing: '업로드 오류 또는 해당 행 제외' },
        { name: '캠페인명', type: '텍스트', required: false, description: '파트너 내 캠페인 단위 이름', missing: '캠페인 단위 분석 제외' },
        { name: '유입_클릭수', type: '숫자', required: true, description: '파트너 링크를 통한 실제 클릭 수', missing: '유입 성과 분석 불가', warning: '이 값이 랜딩페이지_도달수보다 작으면 트래킹 이상치로 경고' },
        { name: '랜딩페이지_도달수', type: '숫자', required: false, description: '파트너 링크를 통해 실제 랜딩페이지에 도달한 수', missing: '랜딩 도달률 분석 제외', warning: '유입_클릭수보다 크면 트래킹 오류 의심 — 해당 파트너 성과 강한 판정 유보' },
        { name: '회원가입_전환수', type: '숫자', required: true, description: '파트너 유입을 통한 회원가입 완료 수', missing: '회원 유치 기여 분석 제한' },
        { name: '구매_전환수', type: '숫자', required: true, description: '파트너 유입을 통한 구매 전환 수. 정산 전 원시 전환 수치.', missing: '구매 기여 분석 제한', warning: '확정전환수 없으면 이 값은 원시 전환으로만 해석 — 정산 기준 아님' },
        { name: '파트너_발생매출', type: '숫자 (원)', required: false, description: '파트너 유입에 귀속된 매출 (플랫폼 귀속 기준)', missing: '파트너 ROAS 분석 제한' },
        { name: '지급_보상액', type: '숫자 (원)', required: false, description: '파트너에게 지급 또는 예정인 보상/수수료 금액', missing: '파트너 비용 분석 제한', noDerive: true },
        { name: '보상방식', type: '텍스트', required: 'recommended', description: 'CPS(판매기여), CPA(전환기여), CPC(클릭), 정액 등', missing: '정산형 해석 제한', noDerive: true },
        { name: '보상기준', type: '텍스트', required: 'recommended', description: '전환 인정 기준. 예: 최종클릭, 30일 쿠키, 첫 구매만', missing: '파트너 간 성과 비교 약화', noDerive: true },
        { name: '확정전환수', type: '숫자', required: false, description: '취소·중복·정책 제외 후 정산 인정된 최종 전환 수', missing: '구매_전환수는 원시 전환으로만 해석 — 확정 효율 분석 제한', noDerive: true },
        { name: '취소_차감_건수', type: '숫자', required: false, description: '정산 기간 내 취소·환불로 차감된 전환 건수', missing: '파트너 효율 과대평가 가능성 있음', warning: '없으면 파트너 효율 과대평가될 수 있음을 리포트에 명시' },
        { name: '신규회원_기여수', type: '숫자', required: false, description: '파트너 유입을 통해 신규 가입한 회원 수', missing: '신규 유치 기여 분석 제외' },
        { name: '랜딩페이지_URL', type: '텍스트', required: false, description: '파트너 전용 랜딩페이지 주소 (참고용)', missing: '분석에 영향 없음' },
        { name: '비고', type: '텍스트', required: false, description: '특이사항 메모', missing: '분석에 영향 없음' },
      ],
    },
  ],
}

// ─────────────────────────────────────────────────────────
// 4. 트래픽 템플릿
// ─────────────────────────────────────────────────────────
const trafficTemplate: TemplateDef = {
  id: 'traffic',
  filename: '트래픽_템플릿.xlsx',
  label: '웹 트래픽',
  fileKeyword: 'traffic',
  isRequired: false,
  description: '일별 웹 트래픽·채널·퍼널 현황. 트래픽 품질과 채널 기여 분석 기준.',
  sheets: [
    {
      sheetName: '트래픽데이터',
      columns: [
        { name: '날짜', type: 'YYYY-MM-DD', required: true, description: '트래픽 집계 기준일', missing: '해당 행 제외' },
        { name: '전체_세션수', type: '숫자', required: true, description: '해당 일자 전체 세션 수. 비율 계산의 분모로 사용.', missing: '트래픽 분석 불가', warning: '국내+해외 세션 합계와 불일치하면 집계 기준 이상 경고' },
        { name: '국내_세션수', type: '숫자', required: true, description: '국내(KR) 세션 수', missing: '국내/해외 비율 분석 제한', warning: '국내+해외 ≠ 전체이면 불일치 경고 표시' },
        { name: '해외_세션수', type: '숫자', required: true, description: '해외 세션 수', missing: '해외 유입 분석 제한', warning: '국내+해외 ≠ 전체이면 불일치 경고 표시' },
        { name: '신규_방문자수', type: '숫자', required: false, description: '해당 일자 첫 방문자 수', missing: '신규/재방문 비율 분석 제외' },
        { name: '재방문자수', type: '숫자', required: false, description: '해당 일자 재방문자 수', missing: '신규/재방문 비율 분석 제외' },
        { name: '평균_세션_시간', type: '숫자 (초)', required: false, description: '평균 세션 체류 시간. 단위: 초', missing: '체류 품질 분석 제외' },
        { name: '이탈률', type: '숫자 (%)', required: false, description: '첫 페이지에서 바로 나간 비율. 퍼센트 기호 없이 숫자만 입력', missing: '이탈 품질 분석 제외' },
        { name: '페이지뷰', type: '숫자', required: false, description: '해당 일자 총 페이지 조회 수', missing: '방문 깊이 분석 제외' },
        { name: '광고유입_세션수', type: '숫자', required: false, description: '광고(유료) 채널을 통한 유입 세션 수', missing: '채널 기여 분석 불가', warning: '광고/자연/직접 유입이 모두 없으면 채널 분석 전면 제한' },
        { name: '자연유입_세션수', type: '숫자', required: false, description: '검색엔진 등 자연 검색을 통한 유입 세션 수', missing: '채널 기여 분석 제한' },
        { name: '직접유입_세션수', type: '숫자', required: false, description: 'URL 직접 입력, 북마크 등 직접 유입 세션 수', missing: '채널 기여 분석 제한' },
        { name: '모바일_세션수', type: '숫자', required: false, description: '모바일 디바이스 세션 수', missing: '디바이스 분석 제외' },
        { name: 'PC_세션수', type: '숫자', required: false, description: 'PC 디바이스 세션 수', missing: '디바이스 분석 제외' },
        { name: '대표_랜딩페이지', type: '텍스트', required: false, description: '해당 일자 가장 많은 유입이 발생한 랜딩페이지 URL 또는 경로', missing: '랜딩 분석 제외', noDerive: true },
        { name: '장바구니_진입수', type: '숫자', required: false, description: '장바구니에 진입한 세션 수', missing: '퍼널 분석 불가', warning: '장바구니/결제진입 없으면 퍼널 전환 분석 불가' },
        { name: '결제진입수', type: '숫자', required: false, description: '결제 화면에 진입한 세션 수', missing: '퍼널 분석 불가' },
        { name: '비고', type: '텍스트', required: false, description: '특이사항 메모', missing: '분석에 영향 없음' },
      ],
    },
  ],
}

// ─────────────────────────────────────────────────────────
// 5. 이벤트·쿠폰 템플릿
// ─────────────────────────────────────────────────────────
const eventCouponTemplate: TemplateDef = {
  id: 'eventCoupon',
  filename: '이벤트쿠폰_템플릿.xlsx',
  label: '이벤트·쿠폰',
  fileKeyword: 'event',
  isRequired: false,
  description: '이벤트/쿠폰 정의(마스터)와 일별 성과를 2개 시트로 관리. 향후 이벤트 효율·중첩 분석의 기준.',
  sheets: [
    {
      sheetName: '이벤트_마스터',
      columns: [
        { name: '이벤트ID', type: '텍스트 (고유값)', required: true, description: '이벤트 고유 식별자. 일별성과 시트와 연결하는 핵심 키. 중복 불가.', missing: '이벤트 연결 분석 전면 불가', warning: 'ID가 누락되거나 일별성과 시트와 불일치하면 연결 분석 불가' },
        { name: '이벤트명', type: '텍스트', required: true, description: '이벤트 이름 (사용자 표시용)', missing: '이벤트 식별 불가' },
        { name: '이벤트유형', type: '텍스트', required: 'recommended', description: '쿠폰, 감사제, 회원전용 할인, 기간한정 프로모션, 무료배송 등', missing: '유형별 효율 비교 제한' },
        { name: '시작일', type: 'YYYY-MM-DD', required: true, description: '이벤트 시작일', missing: '기간 분석 불가' },
        { name: '종료일', type: 'YYYY-MM-DD', required: true, description: '이벤트 종료일', missing: '기간 분석 불가' },
        { name: '적용채널', type: '텍스트', required: 'recommended', description: '이벤트 적용 채널. 예: 전체, 앱전용, 구글애즈, 파트너A', missing: '채널 기여 중첩 분석 제한' },
        { name: '대상회원', type: '텍스트', required: 'recommended', description: '전체, 신규, 기존, VIP, 특정등급 등', missing: '회원 유형별 반응 분석 제한', noDerive: true },
        { name: '혜택내용', type: '텍스트', required: false, description: '할인율, 금액, 무료배송 등 혜택 내용 설명', missing: '분석에 영향 없음' },
        { name: '최소주문금액', type: '숫자 (원)', required: false, description: '쿠폰/혜택 적용을 위한 최소 주문 금액. 0이면 제한 없음.', missing: '분석에 영향 없음' },
        { name: '쿠폰코드', type: '텍스트', required: false, description: '발급 쿠폰 코드 (해당하는 경우)', missing: '분석에 영향 없음' },
        { name: '중복사용가능여부', type: '텍스트 (Y/N)', required: false, description: '다른 쿠폰/이벤트와 중복 사용 가능 여부. Y 또는 N 입력.', missing: '중첩 효과 분석 제한' },
        { name: '비용부담주체', type: '텍스트', required: false, description: '쿠폰 비용 부담 주체. 예: 자사, 파트너, 구글, 공동', missing: '비용 귀속 분석 제한', noDerive: true },
        { name: '비고', type: '텍스트', required: false, description: '특이사항 메모', missing: '분석에 영향 없음' },
      ],
    },
    {
      sheetName: '이벤트_일별성과',
      columns: [
        { name: '날짜', type: 'YYYY-MM-DD', required: true, description: '이벤트 성과 집계 기준일', missing: '해당 행 제외' },
        { name: '이벤트ID', type: '텍스트', required: true, description: '마스터 시트의 이벤트ID와 동일하게 입력. 연결 키.', missing: '이벤트 마스터 연결 불가 — 이벤트 분석 제한', warning: '마스터 시트의 이벤트ID와 불일치하면 연결 분석 불가' },
        { name: '이벤트명', type: '텍스트', required: false, description: '마스터 이벤트명과 동일하게 입력 (참고용)', missing: '분석에 영향 없음' },
        { name: '발급수', type: '숫자', required: false, description: '해당 일자 쿠폰 또는 이벤트 발급 수', missing: '발급 기반 분석 제한' },
        { name: '다운로드수', type: '숫자', required: false, description: '쿠폰 다운로드 수 (해당하는 경우)', missing: '다운로드 전환율 분석 제한' },
        { name: '사용수', type: '숫자', required: false, description: '실제 쿠폰/혜택 사용 횟수', missing: '사용률 분석 제한' },
        { name: '사용주문수', type: '숫자', required: false, description: '이벤트/쿠폰이 적용된 주문 건수', missing: '주문 기여 분석 제한' },
        { name: '이벤트_적용매출', type: '숫자 (원)', required: false, description: '이벤트/쿠폰이 적용된 주문의 총 매출', missing: '이벤트 매출 기여 분석 제한' },
        { name: '할인금액', type: '숫자 (원)', required: false, description: '이벤트/쿠폰으로 할인된 총 금액', missing: '비용 관점 효율 분석 제한', warning: '없으면 이벤트 비용 효율 분석 불가' },
        { name: '순매출기여', type: '숫자 (원)', required: false, description: '할인 비용 차감 후 실질 매출 기여액', missing: '실질 기여 해석 제한', noDerive: true },
        { name: '신규회원사용수', type: '숫자', required: false, description: '신규 회원의 이벤트/쿠폰 사용 수', missing: '회원 유형별 반응 분석 제외' },
        { name: '기존회원사용수', type: '숫자', required: false, description: '기존 회원의 이벤트/쿠폰 사용 수', missing: '회원 유형별 반응 분석 제외' },
        { name: '취소환불_차감금액', type: '숫자 (원)', required: false, description: '취소/환불로 인해 차감된 이벤트 귀속 금액', missing: '이벤트 효율 과대평가 가능성 있음', warning: '없으면 이벤트 효율 과대평가될 수 있음을 리포트에 명시' },
      ],
    },
  ],
}

// ─────────────────────────────────────────────────────────
// 전체 템플릿 목록 (순서 고정)
// ─────────────────────────────────────────────────────────
export const TEMPLATES: TemplateDef[] = [
  salesTemplate,
  googleAdsTemplate,
  partnershipTemplate,
  trafficTemplate,
  eventCouponTemplate,
]

// ─────────────────────────────────────────────────────────
// 역산 가능 지표 목록 (정의서 섹션 C용)
// ─────────────────────────────────────────────────────────
export const DERIVABLE_METRICS = [
  { metric: '평균_객단가',  formula: '일별_매출액 ÷ 주문_건수',          condition: '두 값이 모두 존재하고 주문_건수 > 0' },
  { metric: 'CTR',         formula: '클릭수 ÷ 노출수 × 100',            condition: '두 값이 모두 존재하고 노출수 > 0' },
  { metric: 'CPC',         formula: '광고비_지출 ÷ 클릭수',             condition: '두 값이 모두 존재하고 클릭수 > 0' },
  { metric: 'CPA',         formula: '광고비_지출 ÷ 전환수',             condition: '두 값이 모두 존재하고 전환수 > 0' },
  { metric: 'ROAS',        formula: '광고귀속_매출 ÷ 광고비_지출',       condition: '두 값이 모두 존재하고 광고비_지출 > 0' },
]

// ─────────────────────────────────────────────────────────
// 역산 금지 지표 목록 (정의서 섹션 D용)
// ─────────────────────────────────────────────────────────
export const NO_DERIVE_METRICS = [
  { metric: '실매출액',        reason: '취소/환불 처리 기준이 내부 정책에 따라 다름' },
  { metric: '순매출기여',      reason: '이벤트 귀속 기준이 복잡하여 임의 추정 금지' },
  { metric: '확정전환수',      reason: '정산 기준은 파트너와의 합의값 — 시스템 추정 불가' },
  { metric: '성과귀속기준',    reason: '광고 플랫폼 설정값 — 외부에서 추정 불가' },
  { metric: '보상기준',        reason: '파트너 계약 조건 — 시스템 임의 해석 금지' },
  { metric: '대상회원',        reason: '이벤트 설계 의도값 — 외부에서 추정 불가' },
]
