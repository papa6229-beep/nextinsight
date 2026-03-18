/**
 * generate-templates.ts
 * 다운로드용 실무형 엑셀 템플릿 5종 생성 스크립트
 *
 * 실행: npx tsx scripts/generate-templates.ts
 *
 * 생성 규칙:
 * - 헤더 행만 포함 (샘플 데이터 없음)
 * - 수식, 드롭다운, 병합셀, 색상 없음
 * - 시트명은 template-schema.ts 정의와 동일
 * - 컬럼 순서는 template-schema.ts 정의와 동일
 */

import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'
import { TEMPLATES } from '../lib/template-schema'

const outDir = path.join(process.cwd(), 'public/samples')
fs.mkdirSync(outDir, { recursive: true })

for (const template of TEMPLATES) {
  const wb = XLSX.utils.book_new()

  for (const sheet of template.sheets) {
    // 헤더 이름 배열만 추출
    const headers = sheet.columns.map(c => c.name)

    // 헤더 행을 담은 워크시트 생성 (데이터 없음)
    const ws = XLSX.utils.aoa_to_sheet([headers])

    // 컬럼 너비 자동 설정 (헤더 길이 기준)
    ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length * 2, 12) }))

    XLSX.utils.book_append_sheet(wb, ws, sheet.sheetName)
  }

  const filePath = path.join(outDir, template.filename)
  XLSX.writeFile(wb, filePath)
  console.log(`✓ ${template.filename} (시트: ${template.sheets.map(s => s.sheetName).join(', ')})`)
}

console.log(`\n완료: ${TEMPLATES.length}개 템플릿 → ${outDir}`)
