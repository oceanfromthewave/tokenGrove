// 실행: npm test
import assert from 'node:assert/strict'
import {MAX_IMPORT_BYTES, buildExport, parseImport} from './exportData.ts'
import {DEFAULT_SETTINGS} from './settings.ts'
import {EMPTY_SAVE, type SaveData} from './save.ts'

const save: SaveData = {
    pet: {level: 5, xp: 12.5, species: 'rose', name: '꽃순이'},
    petWindow: {x: 10, y: 20},
    processed: ['claude-code\0abc', 'codex\0def'],
    collection: [{species: 'daisy', completedAt: '2026-01-01T00:00:00Z', name: '첫째'}],
    stats: {totalXp: 999, daily: {'2026-01-01': 5}, bestStreak: 3},
    settings: {...DEFAULT_SETTINGS, speed: 'fast'},
    onboarded: true,
    skippedVersion: '0.9.9',
    logOffsets: {'C:/x/a.jsonl': 100}
}

// 내보내기: 이 PC 전용 값은 빠지고, 펫/도감/통계/설정은 들어간다
const text = buildExport(save)
const raw = JSON.parse(text)
for (const k of ['logOffsets', 'processed', 'petWindow', 'skippedVersion']) assert.equal(k in raw, false, k)
assert.equal(raw.app, 'token-grove')

// 불러오기: 내보낸 파일을 그대로 읽으면 펫/도감/통계/설정이 복원된다
const back = parseImport(text)!
assert.deepEqual(back.pet, save.pet)
assert.deepEqual(back.collection, save.collection)
assert.deepEqual(back.stats, save.stats)
assert.deepEqual(back.settings, save.settings)
// 이 PC 전용 값은 불러온 파일에서 오지 않는다(기본값). 호출하는 쪽이 현재 값을 유지한다.
assert.deepEqual(back.processed, [])
assert.equal(back.logOffsets, null)

// 잘못된 파일은 거부: 깨진 JSON, 다른 형식, 빈 값, 너무 큰 파일
for (const bad of ['', 'not json', '{}', 'null', '[]', '{"pet":{"level":0,"xp":0}}', '{"pet":{"level":1,"xp":-5}}']) {
    assert.equal(parseImport(bad), null, bad)
}
assert.equal(parseImport(' '.repeat(MAX_IMPORT_BYTES + 1)), null)
assert.equal(parseImport(JSON.stringify({pet: {level: 1, xp: 0}, filler: 'x'.repeat(MAX_IMPORT_BYTES)})), null)
assert.notEqual(parseImport('{"pet":{"level":1,"xp":0}}'), EMPTY_SAVE)

console.log('exportData: all checks passed')
