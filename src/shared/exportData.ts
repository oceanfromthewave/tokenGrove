import {EMPTY_SAVE, parseSave, type SaveData} from './save.ts'

// 다른 PC로 옮길 데이터 파일. 이 PC에서만 의미 있는 것(로그 읽은 위치, 처리한 기록 키, 창 위치, 건너뛴 업데이트)은 뺀다.
export const MAX_IMPORT_BYTES = 2_000_000 // 이보다 큰 파일은 거부한다

export function buildExport(save: SaveData): string {
    const {pet, collection, stats, settings, onboarded} = save
    return JSON.stringify({app: 'token-grove', exportedAt: new Date().toISOString(), pet, collection, stats, settings, onboarded}, null, 2)
}

// 불러온 파일 내용을 검증한다. 올바른 저장 형식이 아니면 null.
export function parseImport(text: string): SaveData | null {
    if (typeof text !== 'string' || text.length > MAX_IMPORT_BYTES) return null
    const data = parseSave(text)
    return data === EMPTY_SAVE ? null : data
}
