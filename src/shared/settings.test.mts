// 실행: npm test
import assert from 'node:assert/strict'
import {DEFAULT_SETTINGS, SPEED_MULTIPLIER, mergeSettings, parseSettings} from './settings.ts'

// 기본값, 없는/이상한 입력은 기본값
assert.deepEqual(parseSettings(undefined), DEFAULT_SETTINGS)
assert.deepEqual(parseSettings(null), DEFAULT_SETTINGS)
assert.deepEqual(parseSettings('x'), DEFAULT_SETTINGS)
assert.deepEqual(parseSettings([1, 2]), DEFAULT_SETTINGS)

// 올바른 항목만 반영하고 나머지는 유지
assert.deepEqual(parseSettings({codex: false, speed: 'fast'}), {...DEFAULT_SETTINGS, codex: false, speed: 'fast'})
assert.deepEqual(parseSettings({claude: 'no', speed: 'turbo', notifications: 1}), DEFAULT_SETTINGS)

// 부분 변경(IPC 패치): 현재 값을 유지하고, 모르는 키는 무시, 원본은 바뀌지 않는다
const cur = {...DEFAULT_SETTINGS, speed: 'slow' as const}
const next = mergeSettings(cur, {notifications: false, evil: true, __proto__: {claude: false}})
assert.deepEqual(next, {...cur, notifications: false})
assert.deepEqual(cur, {...DEFAULT_SETTINGS, speed: 'slow'})
assert.equal('evil' in next, false)

// 속도 배율: 보통은 1, 느리게는 느리고 빠르게는 빠르다
assert.equal(SPEED_MULTIPLIER.normal, 1)
assert.ok(SPEED_MULTIPLIER.slow < 1 && SPEED_MULTIPLIER.fast > 1)

console.log('settings: all checks passed')
