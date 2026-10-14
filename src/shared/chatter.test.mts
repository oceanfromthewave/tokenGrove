// 실행: npm test
import assert from 'node:assert/strict'
import {chatterLines, pickChatter} from './chatter.ts'
import {INITIAL_PET, SPECIES, STAGES} from './growth.ts'

const ctx = (o = {}) => ({pet: INITIAL_PET, todayXp: 0, streak: 0, hour: 14, ...o})

// 모든 단계에서 말이 충분히 있고 비어 있지 않다. 같은 말이 겹치지도 않는다.
for (const s of STAGES) {
    const lines = chatterLines(ctx({pet: {...INITIAL_PET, level: s.minLevel}}))
    assert.ok(lines.length >= 5 && lines.every((l) => typeof l === 'string' && l.length > 0), s.id)
    assert.equal(new Set(lines).size, lines.length, `${s.id}: 중복된 말`)
}

// 종 비밀: 꽃이 피기 전(레벨 6 이하)에는 종을 알 수 있는 말을 하지 않는다. 꽃이 핀 뒤에는 종 이야기를 한다.
for (const sp of SPECIES) {
    for (let level = 1; level <= 6; level++) {
        const lines = chatterLines(ctx({pet: {level, xp: 0, species: sp.id}}))
        assert.ok(!lines.some((l) => l.includes(sp.name)), `${sp.id} Lv${level}에서 종 이름이 드러남`)
    }
    const bloom = chatterLines(ctx({pet: {level: 7, xp: 0, species: sp.id}}))
    const seed = chatterLines(ctx({pet: {level: 7, xp: 0, species: INITIAL_PET.species === sp.id ? 'rose' : INITIAL_PET.species}}))
    assert.notDeepEqual(bloom, seed, `${sp.id}: 종별 말이 있어야 함`)
}

// 오늘 사용량: 없음 / 보통 / 많음
assert.ok(chatterLines(ctx({todayXp: 0})).some((l) => l.includes('오늘은 아직 조용')))
assert.ok(chatterLines(ctx({todayXp: 12.34})).some((l) => l.includes('12.3 XP')))
assert.ok(chatterLines(ctx({todayXp: 150})).some((l) => l.includes('150.0 XP나')))
assert.ok(!chatterLines(ctx({todayXp: 150})).some((l) => l.includes('오늘은 아직 조용')))

// 연속 사용일: 2일부터, 7일, 30일에 따라 다르다
assert.ok(!chatterLines(ctx({streak: 1})).some((l) => l.includes('연속')))
assert.ok(chatterLines(ctx({streak: 5})).some((l) => l.includes('5일 연속')))
assert.ok(chatterLines(ctx({streak: 9})).some((l) => l.includes('일주일')))
assert.ok(chatterLines(ctx({streak: 31})).some((l) => l.includes('한 달')))

// 시간대 인사: 해당 시간에만
assert.ok(chatterLines(ctx({hour: 23})).some((l) => l.includes('늦었어요')))
assert.ok(chatterLines(ctx({hour: 3})).some((l) => l.includes('늦었어요')))
assert.ok(chatterLines(ctx({hour: 8})).some((l) => l.includes('아침')))
assert.ok(chatterLines(ctx({hour: 12})).some((l) => l.includes('점심')))
assert.ok(chatterLines(ctx({hour: 19})).some((l) => l.includes('노을')))
assert.ok(!chatterLines(ctx({hour: 15})).some((l) => ['늦었어요', '아침', '점심', '노을'].some((w) => l.includes(w))))

// 요일: 주어졌을 때만, 화/수/목은 말이 없다
assert.ok(chatterLines(ctx({weekday: 1})).some((l) => l.includes('한 주')))
assert.ok(chatterLines(ctx({weekday: 6})).some((l) => l.includes('주말')))
assert.deepEqual(chatterLines(ctx({weekday: 3})), chatterLines(ctx()))

// 고르기: rand 경계값(0, 1에 가까움, 범위를 벗어난 1)에서도 안전
const c = ctx({todayXp: 1, streak: 3})
const lines = chatterLines(c)
assert.equal(pickChatter(c, () => 0), lines[0])
assert.equal(pickChatter(c, () => 0.999999), lines[lines.length - 1])
assert.equal(pickChatter(c, () => 1), lines[lines.length - 1])

console.log('chatter: all checks passed')
