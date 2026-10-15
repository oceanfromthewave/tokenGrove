export interface Box {
    x: number
    y: number
    width: number
    height: number
}

// 창(box)이 하나 이상의 모니터 작업 영역 안에 완전히 들어가는가
export const fitsInAny = (box: Box, areas: Box[]): boolean =>
    areas.some((a) => box.x >= a.x && box.y >= a.y && box.x + box.width <= a.x + a.width && box.y + box.height <= a.y + a.height)

// 창이 화면 밖으로 나갔을 때 돌아갈 자리: 주 모니터 작업 영역의 오른쪽 아래(여백 16)
export const fallbackPos = (size: { width: number; height: number }, primary: Box): { x: number; y: number } => ({
    x: Math.max(primary.x, primary.x + primary.width - size.width - 16),
    y: Math.max(primary.y, primary.y + primary.height - size.height - 16)
})
