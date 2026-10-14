// 실행: npm test
import assert from 'node:assert/strict'
import {MOON_COLORS, MOON_SIZE, moonRows} from './decor.ts'

// 초승달: 크기가 맞고, 색 표에 없는 글자가 없다
const moon = moonRows()
assert.ok(moon.length === MOON_SIZE && moon.every((r) => r.length === MOON_SIZE))
for (const ch of moon.join('')) assert.ok(ch === '.' || ch in MOON_COLORS, `moon: ${ch}`)

// 달 모양: 칠해진 칸이 적당히 있고(꽉 찬 원이 아님), 가운데 줄은 왼쪽이 채워지고 오른쪽 끝은 비어 있다(초승달)
const filled = (s: string): number => [...s].filter((ch) => ch !== '.').length
const total = filled(moon.join(''))
assert.ok(total > 20 && total < (MOON_SIZE * MOON_SIZE) / 2, `칠해진 칸 ${total}`)
const mid = moon[MOON_SIZE / 2]
assert.notEqual(mid[1], '.', '왼쪽은 채워져 있다')
assert.equal(mid[MOON_SIZE - 1], '.', '오른쪽 끝은 비어 있다')
assert.ok(filled(mid) <= 5, '가운데 줄은 얇다')

// 위아래가 대체로 대칭이 아니어도 좋지만 두 가지 색(안쪽/가장자리)이 모두 쓰인다
assert.ok(moon.join('').includes('m') && moon.join('').includes('n'))

console.log('moon: all checks passed')
