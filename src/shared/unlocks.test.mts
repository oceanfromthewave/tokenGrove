// 실행: npm test
import assert from 'node:assert/strict'
import {UNLOCKS, nextUnlock, unlockedItems} from './unlocks.ts'

// 필요 횟수는 오름차순이고 id가 겹치지 않는다
assert.deepEqual(UNLOCKS.map((u) => u.need), [...UNLOCKS.map((u) => u.need)].sort((a, b) => a - b))
assert.equal(new Set(UNLOCKS.map((u) => u.id)).size, UNLOCKS.length)

// 해금: 경계값
assert.deepEqual(unlockedItems(0), [])
assert.deepEqual(unlockedItems(1).map((u) => u.id), ['birdhouse'])
assert.deepEqual(unlockedItems(2).map((u) => u.id), ['birdhouse'])
assert.deepEqual(unlockedItems(3).map((u) => u.id), ['birdhouse', 'lantern'])
assert.equal(unlockedItems(8).length, UNLOCKS.length)
assert.equal(unlockedItems(99).length, UNLOCKS.length)
assert.deepEqual(unlockedItems(-5), [])

// 다음 소품과 남은 횟수
assert.deepEqual(nextUnlock(0), {item: UNLOCKS[0], remaining: 1})
assert.deepEqual(nextUnlock(1), {item: UNLOCKS[1], remaining: 2})
assert.deepEqual(nextUnlock(2), {item: UNLOCKS[1], remaining: 1})
assert.equal(nextUnlock(8), null)
assert.equal(nextUnlock(100), null)

console.log('unlocks: all checks passed')
