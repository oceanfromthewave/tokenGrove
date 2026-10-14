// 실행: npm test
import assert from 'node:assert/strict'
import {parseRect} from './exportRect.ts'

// 정상 값은 정수로 반올림해서 돌려준다
assert.deepEqual(parseRect({x: 0, y: 0.4, width: 460.6, height: 300}), {x: 0, y: 0, width: 461, height: 300})

// 잘못된 형식/값은 모두 거부
for (const bad of [null, undefined, 'x', 5, [], {},
    {x: 0, y: 0, width: 0, height: 10}, // 폭 0
    {x: 0, y: 0, width: 10, height: -1},
    {x: -1, y: 0, width: 10, height: 10},
    {x: NaN, y: 0, width: 10, height: 10},
    {x: Infinity, y: 0, width: 10, height: 10},
    {x: '0', y: 0, width: 10, height: 10},
    {x: 0, y: 0, width: 10},
    {x: 0, y: 0, width: 99999, height: 10}]) {
    assert.equal(parseRect(bad), null, JSON.stringify(bad))
}

// 상속된 속성은 인정하지 않는다
assert.equal(parseRect(Object.create({x: 0, y: 0, width: 10, height: 10})), null)

console.log('exportRect: all checks passed')
