// 실행: npm test
import assert from 'node:assert/strict'
import {fallbackPos, fitsInAny} from './windowPos.ts'

const main = {x: 0, y: 0, width: 1920, height: 1040}
const second = {x: 1920, y: 0, width: 1280, height: 1000}
const win = {width: 160, height: 268}

// 완전히 들어가면 true, 걸치거나 밖이면 false
assert.equal(fitsInAny({x: 100, y: 100, ...win}, [main]), true)
assert.equal(fitsInAny({x: 1800, y: 100, ...win}, [main]), false) // 오른쪽으로 삐져나감
assert.equal(fitsInAny({x: 100, y: 900, ...win}, [main]), false) // 아래로 삐져나감
assert.equal(fitsInAny({x: -10, y: 0, ...win}, [main]), false)
// 두 번째 모니터에 있다가 그 모니터가 사라진 경우
assert.equal(fitsInAny({x: 2200, y: 100, ...win}, [main, second]), true)
assert.equal(fitsInAny({x: 2200, y: 100, ...win}, [main]), false)
assert.equal(fitsInAny({x: 0, y: 0, ...win}, []), false)

// 돌아갈 자리: 주 모니터 오른쪽 아래, 작은 화면에서도 화면 밖으로 안 나간다
assert.deepEqual(fallbackPos(win, main), {x: 1744, y: 756})
assert.deepEqual(fallbackPos(win, {x: 0, y: 0, width: 100, height: 100}), {x: 0, y: 0})
assert.equal(fitsInAny({...fallbackPos(win, main), ...win}, [main]), true)

console.log('windowPos: all checks passed')
