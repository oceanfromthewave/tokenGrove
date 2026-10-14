// 실행: npm test
import assert from 'node:assert/strict'
import {chatterLines, pickChatter} from './chatter.ts'
import {INITIAL_PET, STAGES} from './growth.ts'

const ctx = (o = {}) => ({pet: INITIAL_PET, todayXp: 0, streak: 0, hour: 14, ...o})

// 모든 단계에서 말이 있다 (빈 문자열/undefined 없음)
for (const s of STAGES) {
    const lines = chatterLines(ctx({pet: {...INITIAL_PET, level: s.minLevel}}))
    assert.ok(lines.length >= 2 && lines.every((l) => typeof l === 'string' && l.length > 0), s.id)
}

// 오늘 사용량: 있으면 XP를 알려주고, 없으면 조용하다는 말
assert.ok(chatterLines(ctx({todayXp: 12.34})).some((l) => l.includes('12.3 XP')))
assert.ok(chatterLines(ctx({todayXp: 0})).some((l) => l.includes('조용')))

// 연속 사용일은 2일부터, 시간대 인사는 해당 시간에만
assert.ok(!chatterLines(ctx({streak: 1})).some((l) => l.includes('연속')))
assert.ok(chatterLines(ctx({streak: 5})).some((l) => l.includes('5일 연속')))
assert.ok(chatterLines(ctx({hour: 23})).some((l) => l.includes('늦었어요')))
assert.ok(chatterLines(ctx({hour: 3})).some((l) => l.includes('늦었어요')))
assert.ok(chatterLines(ctx({hour: 8})).some((l) => l.includes('아침')))
assert.ok(!chatterLines(ctx({hour: 14})).some((l) => l.includes('늦었어요') || l.includes('아침')))

// 고르기: rand 경계값(0, 1에 가까움, 범위를 벗어난 1)에서도 안전
const c = ctx({todayXp: 1, streak: 3})
const lines = chatterLines(c)
assert.equal(pickChatter(c, () => 0), lines[0])
assert.equal(pickChatter(c, () => 0.999999), lines[lines.length - 1])
assert.equal(pickChatter(c, () => 1), lines[lines.length - 1])

console.log('chatter: all checks passed')
