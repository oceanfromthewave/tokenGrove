// 실행: npm test
import assert from 'node:assert/strict'
import {INITIAL_PET} from './growth.ts'
import {OUTPUT_WEIGHT as W, TOKENS_PER_XP as U, applyUsage, tokensOf, xpOf, type UsageRecord} from './usage.ts'

const rec = (o: Partial<UsageRecord> = {}): UsageRecord => ({
    id: 'a', provider: 'p', occurredAt: '2026-01-01T00:00:00Z', source: 't', confidence: 'exact', totalTokens: 30 * U, ...o
})

// 토큰 계산: total 우선, 없으면 input+output, 이상한 값은 0 취급
assert.equal(tokensOf(rec({totalTokens: 500, inputTokens: 1})), 500)
assert.equal(tokensOf(rec({totalTokens: undefined, inputTokens: 300, outputTokens: 200})), 500)
assert.equal(tokensOf(rec({totalTokens: undefined})), 0)
assert.equal(tokensOf(rec({totalTokens: -1})), 0)
assert.equal(tokensOf(rec({totalTokens: NaN})), 0)

// 경험치: TOKENS_PER_XP 토큰=1xp, 소수는 보존, 추정값은 절반, 상한
assert.equal(xpOf(rec()), 30)
assert.equal(xpOf(rec({totalTokens: U / 2})), 0.5)
assert.equal(xpOf(rec({confidence: 'estimated'})), 15)
assert.equal(xpOf(rec({totalTokens: 1e15})), 100_000)

// 입력/출력을 알면 출력에 가중치, total만 있으면 그대로, 둘 다 있으면 입력/출력 우선
assert.equal(xpOf(rec({totalTokens: undefined, inputTokens: 10 * U, outputTokens: 2 * U})), 10 + 2 * W)
assert.equal(xpOf(rec({totalTokens: undefined, outputTokens: U})), W)
assert.equal(xpOf(rec({totalTokens: 99 * U, inputTokens: U, outputTokens: 0})), 1)
assert.equal(xpOf(rec({totalTokens: undefined, inputTokens: -1, outputTokens: NaN})), 0)

// 중복 방지: 한 배치 안 중복, 같은 배치 재처리(재시작/재읽기)
const batch = [rec({id: '1'}), rec({id: '1'}), rec({id: '2'})]
const first = applyUsage(INITIAL_PET, [], batch)
assert.equal(first.gainedXp, 60)
assert.equal(first.processed.length, 2)
const again = applyUsage(first.pet, first.processed, batch)
assert.equal(again.gainedXp, 0)
assert.deepEqual(again.pet, first.pet)

// 같은 id라도 provider가 다르면 별개 기록
assert.equal(applyUsage(INITIAL_PET, [], [rec({provider: 'x'}), rec({provider: 'y'})]).gainedXp, 60)
// provider/id 경계 혼동 방지 ('a'+'b:c' vs 'a:b'+'c')
assert.equal(applyUsage(INITIAL_PET, [], [rec({provider: 'a', id: 'b:c'}), rec({provider: 'a:b', id: 'c'})]).gainedXp, 60)

// 잘못된 기록은 건너뛰고 나머지는 처리
const mixed = applyUsage(INITIAL_PET, [], [rec({id: ''}), rec({provider: ''}), null as never, rec({id: 'ok'})])
assert.equal(mixed.gainedXp, 30)
assert.equal(mixed.processed.length, 1)

// 0xp 기록도 처리 완료로 표시, 레벨업까지 이어짐 (100xp = Lv2)
const big = applyUsage(INITIAL_PET, [], [rec({id: 'z', totalTokens: 100 * U})])
assert.deepEqual(big.pet, {...INITIAL_PET, level: 2, xp: 0})
assert.equal(applyUsage(INITIAL_PET, [], [rec({id: 'tiny', totalTokens: 5})]).processed.length, 1)

// 작은 기록도 쌓이면 레벨업한다 (U/4 토큰 기록 400개 = 100xp)
const many = Array.from({length: 400}, (_, i) => rec({id: `s${i}`, totalTokens: U / 4}))
assert.deepEqual(applyUsage(INITIAL_PET, [], many).pet, {...INITIAL_PET, level: 2, xp: 0})

console.log('usage: all checks passed')
