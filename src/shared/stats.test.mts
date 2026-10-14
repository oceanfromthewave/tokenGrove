// 실행: npm test
import assert from 'node:assert/strict'
import {INITIAL_PET} from './growth.ts'
import {EMPTY_STATS, avgDaily, cumulativeXp, dateKey, etaDays, recordGain, xpToNextStage} from './stats.ts'

const day = (y: number, m: number, d: number): Date => new Date(y, m - 1, d, 12)

// 날짜 키는 로컬 날짜 기준
assert.equal(dateKey(day(2026, 3, 5)), '2026-03-05')
assert.equal(dateKey(new Date(2026, 0, 1, 0, 0, 1)), '2026-01-01')

// 기록: 같은 날은 합산, 총합 누적, 원본 불변, 0/음수/NaN은 무시
const a = recordGain(EMPTY_STATS, 10, '2026-01-01')
const b = recordGain(a, 5, '2026-01-01')
assert.deepEqual(b, {totalXp: 15, daily: {'2026-01-01': 15}})
assert.deepEqual(EMPTY_STATS, {totalXp: 0, daily: {}})
for (const bad of [0, -3, NaN]) assert.equal(recordGain(b, bad, '2026-01-02'), b)

// 오래된 날짜는 60일까지만 보관
let s = EMPTY_STATS
for (let i = 0; i < 70; i++) s = recordGain(s, 1, dateKey(new Date(2026, 0, 1 + i)))
assert.equal(Object.keys(s.daily).length, 60)
assert.equal(s.totalXp, 70) // 총합은 줄지 않는다

// 하루 평균: 최근 7일, 쉬는 날은 0, 월 경계도 처리
const w = {totalXp: 0, daily: {'2026-02-28': 70, '2026-03-01': 70}}
assert.equal(avgDaily(w, day(2026, 3, 1)), 20) // (70+70)/7
assert.equal(avgDaily(w, day(2026, 3, 20)), 0) // 한참 지나면 0

// 누적 경험치와 다음 단계까지
assert.equal(cumulativeXp(1), 0)
assert.equal(cumulativeXp(2), 100)
assert.equal(cumulativeXp(3), 250)
assert.equal(xpToNextStage(INITIAL_PET), 100) // 씨앗 -> 싹(Lv2)
assert.equal(xpToNextStage({...INITIAL_PET, level: 2, xp: 30}), 120) // 싹 -> 새싹(Lv3): 150 - 30
assert.equal(xpToNextStage({...INITIAL_PET, level: 10, xp: 0}), null) // 마지막 단계

// 예상 일수: 100xp 남고 하루 평균 20xp -> 5일, 사용량 없으면 null
const u = {totalXp: 0, daily: {'2026-03-01': 140}}
assert.equal(etaDays(INITIAL_PET, u, day(2026, 3, 1)), 5)
assert.equal(etaDays(INITIAL_PET, EMPTY_STATS, day(2026, 3, 1)), null)

console.log('stats: all checks passed')
