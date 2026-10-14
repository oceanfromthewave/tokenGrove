import {STAGES, stageOf, xpToNextLevel, type PetState} from './growth.ts'

// 실제 사용량(로그)으로 얻은 경험치 통계. 테스트 버튼으로 얻은 경험치는 넣지 않는다.
export interface Stats {
    totalXp: number // 지금까지 로그에서 얻은 경험치 합계
    daily: Record<string, number> // 'YYYY-MM-DD' -> 그날 얻은 경험치 (최근 KEEP_DAYS일만 보관)
}

export const EMPTY_STATS: Stats = {totalXp: 0, daily: {}}

const KEEP_DAYS = 60
const AVG_DAYS = 7

// 로컬 시간 기준 날짜 키. (UTC로 자르면 한국 시간 자정과 하루가 어긋난다)
export const dateKey = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// 경험치를 기록한다. 원본은 바꾸지 않고, 오래된 날짜는 버린다.
export function recordGain(stats: Stats, xp: number, today: string): Stats {
    if (!(xp > 0)) return stats
    const daily = {...stats.daily, [today]: (stats.daily[today] ?? 0) + xp}
    const keys = Object.keys(daily).sort()
    for (const k of keys.slice(0, Math.max(0, keys.length - KEEP_DAYS))) delete daily[k]
    return {totalXp: stats.totalXp + xp, daily}
}

// 최근 AVG_DAYS일(오늘 포함)의 하루 평균. 쉬는 날도 0으로 센다.
export function avgDaily(stats: Stats, now: Date): number {
    let sum = 0
    for (let i = 0; i < AVG_DAYS; i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
        sum += stats.daily[dateKey(d)] ?? 0
    }
    return sum / AVG_DAYS
}

// 레벨 level에 막 도달했을 때까지의 누적 경험치. (Lv1 = 0, Lv2 = 100, Lv3 = 250, ...)
export const cumulativeXp = (level: number): number => {
    let sum = 0
    for (let l = 1; l < level; l++) sum += xpToNextLevel(l)
    return sum
}

// 다음 성장 단계까지 남은 경험치. 마지막 단계이면 null.
export function xpToNextStage(pet: PetState): number | null {
    const next = STAGES.find((s) => s.minLevel > stageOf(pet.level).minLevel)
    return next ? cumulativeXp(next.minLevel) - cumulativeXp(pet.level) - pet.xp : null
}

// 다음 단계까지 예상 일수. 최근 사용량이 없거나 마지막 단계면 null.
export function etaDays(pet: PetState, stats: Stats, now: Date): number | null {
    const remain = xpToNextStage(pet)
    const avg = avgDaily(stats, now)
    return remain === null || avg <= 0 ? null : Math.ceil(remain / avg)
}
