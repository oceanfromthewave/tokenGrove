// 실행: npm test
import assert from 'node:assert/strict'
import {ACHIEVEMENTS, achieved} from './achievements.ts'
import {INITIAL_PET, SPECIES} from './growth.ts'
import {EMPTY_STATS} from './stats.ts'

const done = (species: (typeof SPECIES)[number]['id']) => ({species, completedAt: 'T'})

// id 중복 없음
assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, ACHIEVEMENTS.length)

// 아무것도 없으면 달성 0
assert.equal(achieved(INITIAL_PET, [], EMPTY_STATS).size, 0)

// 완성 수집: 같은 종 여러 번은 1종으로 센다
const same = achieved(INITIAL_PET, [done('daisy'), done('daisy'), done('daisy'), done('daisy'), done('daisy')], EMPTY_STATS)
assert.ok(same.has('first') && same.has('tree') && !same.has('five'))
const five = achieved(INITIAL_PET, SPECIES.slice(0, 5).map((s) => done(s.id)), EMPTY_STATS)
assert.ok(five.has('five') && !five.has('all'))
assert.ok(achieved(INITIAL_PET, SPECIES.map((s) => done(s.id)), EMPTY_STATS).has('all'))

// 누적 XP / 연속 사용 경계값
const s = (totalXp: number, bestStreak: number) => ({totalXp, daily: {}, bestStreak})
assert.ok(!achieved(INITIAL_PET, [], s(999, 2)).has('xp1k') && !achieved(INITIAL_PET, [], s(999, 2)).has('streak3'))
const mid = achieved(INITIAL_PET, [], s(1000, 3))
assert.ok(mid.has('xp1k') && mid.has('streak3') && !mid.has('xp10k') && !mid.has('streak7'))
const top = achieved(INITIAL_PET, [], s(100000, 30))
assert.ok(top.has('xp100k') && top.has('streak30'))

// 현재 키우는 식물이 레벨 10이면 큰 나무 달성
assert.ok(achieved({...INITIAL_PET, level: 10}, [], EMPTY_STATS).has('tree'))

console.log('achievements: all checks passed')
