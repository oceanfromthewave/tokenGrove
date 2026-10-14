// 실행: npm test
import assert from 'node:assert/strict'
import {petEvent} from './events.ts'
import {INITIAL_PET} from './growth.ts'

const at = (level: number, xp = 0, species = INITIAL_PET.species) => ({level, xp, species})

// 같은 레벨: 0.1 이상 늘면 xp, 그보다 작거나 그대로면 효과 없음
assert.equal(petEvent(at(3, 10), at(3, 10.5)), 'xp')
assert.equal(petEvent(at(3, 10), at(3, 10.1)), 'xp')
assert.equal(petEvent(at(3, 10), at(3, 10.05)), null)
assert.equal(petEvent(at(3, 10), at(3, 10)), null)

// 레벨이 오르면 단계가 바뀌는지에 따라 stage / level (단계 경계: Lv2 싹, Lv3 새싹, Lv5 무성한 잎은 각각 새 단계)
assert.equal(petEvent(at(1), at(2)), 'stage') // 씨앗 -> 싹
assert.equal(petEvent(at(4), at(5)), 'stage')
assert.equal(petEvent(at(10), at(10, 5)), 'xp')
assert.equal(petEvent(at(10), at(11)), 'level') // 큰 나무 단계 안에서 레벨만 오름
assert.equal(petEvent(at(1), at(4)), 'stage') // 한 번에 여러 레벨

// 완성: 레벨이 내려가거나 종이 바뀌면 새 씨앗
assert.equal(petEvent(at(11, 50), at(1, 0)), 'newSeed')
assert.equal(petEvent(at(11, 50, 'tulip'), at(1, 0, 'tulip')), 'newSeed') // 같은 종이 다시 나와도
assert.equal(petEvent(at(2, 0, 'daisy'), at(2, 0, 'rose')), 'newSeed')

console.log('events: all checks passed')
