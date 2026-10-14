// 정원 사진 저장 때 화면(renderer)이 보내는 캡처 영역. 외부에서 온 값이므로 항상 검증하고 정수로 만든다.
export interface Rect {
    x: number
    y: number
    width: number
    height: number
}

const MAX = 10_000 // 화면 크기로는 터무니없이 큰 값은 거부한다

const num = (v: unknown, min: number): number | null =>
    typeof v === 'number' && Number.isFinite(v) && v >= min && v <= MAX ? Math.round(v) : null

export function parseRect(v: unknown): Rect | null {
    if (typeof v !== 'object' || v === null) return null
    const r = v as Record<string, unknown>
    const x = num(Object.hasOwn(r, 'x') ? r.x : undefined, 0)
    const y = num(Object.hasOwn(r, 'y') ? r.y : undefined, 0)
    const width = num(Object.hasOwn(r, 'width') ? r.width : undefined, 1)
    const height = num(Object.hasOwn(r, 'height') ? r.height : undefined, 1)
    return x === null || y === null || width === null || height === null ? null : {x, y, width, height}
}
