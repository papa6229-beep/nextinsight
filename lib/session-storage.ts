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
