import {STAGES, stageOf, xpToNextLevel, type PetState} from './growth.ts'

// 실제 사용량(로그)으로 얻은 경험치 통계. 테스트 버튼으로 얻은 경험치는 넣지 않는다.
export interface Stats {
    totalXp: number // 지금까지 로그에서 얻은 경험치 합계
    daily: Record<string, number> // 'YYYY-MM-DD' -> 그날 얻은 경험치 (최근 KEEP_DAYS일만 보관)
    bestStreak: number // 가장 길었던 연속 사용일 (daily는 60일만 보관하므로 따로 저장)
}

export const EMPTY_STATS: Stats = {totalXp: 0, daily: {}, bestStreak: 0}

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
    return {totalXp: stats.totalXp + xp, daily, bestStreak: Math.max(stats.bestStreak, streakEndingAt(daily, today))}
}

// key('YYYY-MM-DD')를 마지막 날로 하는 연속 사용일 수. 경험치를 얻은 날만 센다.
export function streakEndingAt(daily: Record<string, number>, key: string): number {
    const [y, m, d] = key.split('-').map(Number)
    let n = 0
    while ((daily[dateKey(new Date(y, m - 1, d - n))] ?? 0) > 0) n++
    return n
}

// 지금 이어지고 있는 연속 사용일. 오늘 아직 안 썼어도 어제까지 이어졌다면 끊긴 게 아니다.
export function currentStreak(stats: Stats, now: Date): number {
    const today = streakEndingAt(stats.daily, dateKey(now))
    if (today > 0) return today
    return streakEndingAt(stats.daily, dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)))
}

export type Weather = 'overcast' | 'cloudy' | 'sunny' | 'rainbow'

// 오늘 얻은 경험치를 최근 7일 평균과 비교해 정원 날씨를 정한다.
// 평균이 없으면(처음 쓰는 중) 오늘 썼는지 여부로만 나눈다.
export function weatherOf(todayXp: number, avg: number): Weather {
    if (!(todayXp > 0)) return 'overcast'
    if (avg <= 0) return 'sunny'
    const ratio = todayXp / avg
    return ratio >= 1.5 ? 'rainbow' : ratio >= 0.5 ? 'sunny' : 'cloudy'
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

// 최근 n일(오늘 포함)의 날짜별 경험치. 오래된 날부터 오늘 순서이고, 쉬는 날은 0이다.
export function recentDays(stats: Stats, now: Date, n: number): { key: string; xp: number }[] {
    return Array.from({length: n}, (_, i) => {
        const key = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (n - 1 - i)))
        return {key, xp: stats.daily[key] ?? 0}
    })
}

// 오늘 얻은 경험치가 목표를 처음 넘은 순간인가. (목표 0 = 끔)
export const crossedGoal = (before: number, after: number, goal: number): boolean => goal > 0 && before < goal && after >= goal
