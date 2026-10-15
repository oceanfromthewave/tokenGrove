// 실행: npm test  (Node가 TypeScript를 직접 실행, 별도 테스트 도구 없음)
import assert from 'node:assert/strict'
import {RARITY, hasGoldPot, HARVEST_LEVEL, INITIAL_PET, SPECIES, STAGES, addXp, harvestIfReady, newSeed, stageName, stageOf, xpToNextLevel, FORM} from './growth.ts'

const P = (level: number, xp: number) => ({...INITIAL_PET, level, xp}) // 같은 종으로 비교용

// 필요 경험치: Lv1=100, Lv2=150
assert.equal(xpToNextLevel(1), 100)
assert.equal(xpToNextLevel(2), 150)

// 무효한 값은 상태를 바꾸지 않는다
for (const bad of [0, -5, NaN]) {
    assert.deepEqual(addXp(INITIAL_PET, bad), INITIAL_PET)
}

// 경계값: 99 -> 그대로, 100 -> 레벨업, 101 -> 남은 1 이월
assert.deepEqual(addXp(INITIAL_PET, 99), P(1, 99))
assert.deepEqual(addXp(INITIAL_PET, 100), P(2, 0))
assert.deepEqual(addXp(INITIAL_PET, 101), P(2, 1))

// 한 번에 여러 레벨: 100 + 150 = 250 -> Lv3, 249 -> Lv2 xp149
assert.deepEqual(addXp(INITIAL_PET, 250), P(3, 0))
assert.deepEqual(addXp(INITIAL_PET, 249), P(2, 149))

// 원본 상태는 바뀌지 않는다
const before = P(1, 50)
addXp(before, 100)
assert.deepEqual(before, P(1, 50))

// 성장 단계 경계값: 레벨 1~10이 각각 한 단계, 그 이상은 마지막 단계
assert.deepEqual(STAGES.map((s) => stageOf(s.minLevel).id), STAGES.map((s) => s.id))
assert.deepEqual(STAGES.map((s) => stageOf(s.minLevel + 0.5).id), STAGES.map((s) => s.id)) // 단계 사이 값
assert.equal(stageOf(1).id, 'seed')
assert.equal(stageOf(9).id, 'fruit')
assert.equal(stageOf(10).id, 'tree')
assert.equal(stageOf(99).id, 'tree')
assert.equal(stageOf(0).id, 'seed') // 비정상 레벨도 안전

// 종은 레벨업해도 유지된다
assert.equal(addXp({...INITIAL_PET, species: 'tulip'}, 250).species, 'tulip')

// 새 씨앗: 레벨1, 모든 종이 나올 수 있고(rand 0~1 미만), 범위를 벗어나는 rand도 안전
assert.deepEqual(newSeed(() => 0), {level: 1, xp: 0, species: SPECIES[0].id})
assert.equal(newSeed(() => 0.999).species, SPECIES[SPECIES.length - 1].id)
assert.equal(newSeed(() => 1).species, SPECIES[SPECIES.length - 1].id)
// 모든 종이 나올 수 있다: 각 종의 가중치 구간 한가운데 값으로 뽑으면 그 종이 나온다
{
    const total = SPECIES.reduce((sum, sp) => sum + RARITY[sp.rarity].weight, 0)
    let from = 0
    for (const sp of SPECIES) {
        const w = RARITY[sp.rarity].weight
        assert.equal(newSeed(() => (from + w / 2) / total).species, sp.id, sp.id)
        from += w
    }
    // 흔한 종이 희귀한 종보다 확률이 높다: 10000번 뽑아서 비율 확인(고정된 난수열)
    let seed = 12345
    const lcg = (): number => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)
    const count: Record<string, number> = {}
    for (let i = 0; i < 10000; i++) {
        const id = newSeed(lcg).species
        count[id] = (count[id] ?? 0) + 1
    }
    assert.ok(count.daisy > count.sunflower && count.sunflower > count.rose, JSON.stringify(count))
}
assert.equal(newSeed(() => NaN).level, 1) // 이상한 난수에도 안전

// 완성: 기준 전에는 그대로, 도달하면 정원에 보관하고 새 씨앗
const old = {...INITIAL_PET, species: 'tulip' as const}
const before2 = harvestIfReady({...old, level: HARVEST_LEVEL - 1}, [], 'T', () => 0)
assert.equal(before2.collection.length, 0)
const done = harvestIfReady({...old, level: HARVEST_LEVEL, xp: 5}, [], 'T', () => 0)
assert.deepEqual(done.collection, [{species: 'tulip', completedAt: 'T'}])
assert.deepEqual(done.pet, {level: 1, xp: 0, species: SPECIES[0].id})

// 황금 화분: 모든 종을 한 번씩 완성했을 때만
const allDone = SPECIES.map((sp) => ({species: sp.id, completedAt: 'T'}))
assert.equal(hasGoldPot(allDone), true)
assert.equal(hasGoldPot(allDone.slice(1)), false)
assert.equal(hasGoldPot([...allDone.slice(1), allDone[1]]), false) // 같은 종 중복은 인정 안 됨

// 마지막 단계 이름은 식물 종류(나무/덤불/풀꽃)를 따르고, 다른 단계는 종과 상관없다
assert.equal(stageName('tree', 'cherry'), '큰 나무')
assert.equal(stageName('tree', 'rose'), '큰 덤불')
assert.equal(stageName('tree', 'daisy'), '꽃 무더기')
assert.equal(stageName('bud', 'rose'), '꽃봉오리')
assert.equal(Object.keys(FORM).length, SPECIES.length) // 모든 종에 종류가 정해져 있다

console.log('growth: all checks passed')
