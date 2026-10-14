// 실행: npm test
import assert from 'node:assert/strict'
import {appendFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {scanClaudeLogs} from './claudeLogs.ts'

const root = mkdtempSync(join(tmpdir(), 'tg-claude-'))
try {
    const dir = join(root, 'proj'), file = join(dir, 's.jsonl')
    mkdirSync(dir)
    const msg = (id: string, out: number): string => JSON.stringify({
        type: 'assistant', requestId: 'r', message: {id, usage: {output_tokens: out}}
    }) + '\n'

    // 첫 실행: 과거 기록은 보상하지 않고 기준선만 잡는다
    writeFileSync(file, msg('old', 5000))
    const base = scanClaudeLogs(root, null)
    assert.equal(base.records.length, 0)

    // 새로 추가된 줄만 읽는다
    appendFileSync(file, msg('a', 10) + msg('a', 10) + msg('b', 20))
    const s1 = scanClaudeLogs(root, base.offsets)
    assert.deepEqual(s1.records.map((r) => r.id), ['a|r', 'a|r', 'b|r']) // 중복 제거는 applyUsage 몫

    // 다시 읽어도 새 기록 없음
    assert.equal(scanClaudeLogs(root, s1.offsets).records.length, 0)

    // 쓰는 중인 불완전한 줄은 건너뛰고, 완성되면 읽는다
    appendFileSync(file, msg('c', 1).slice(0, 20))
    const s2 = scanClaudeLogs(root, s1.offsets)
    assert.equal(s2.records.length, 0)
    appendFileSync(file, msg('c', 1).slice(20))
    const s3 = scanClaudeLogs(root, s2.offsets)
    assert.deepEqual(s3.records.map((r) => r.id), ['c|r'])

    // 새 파일은 처음부터, 파일이 줄어들면 처음부터 다시
    writeFileSync(join(dir, 'new.jsonl'), msg('n', 3))
    const s4 = scanClaudeLogs(root, s3.offsets)
    assert.deepEqual(s4.records.map((r) => r.id), ['n|r'])
    writeFileSync(file, msg('z', 1))
    assert.deepEqual(scanClaudeLogs(root, s4.offsets).records.map((r) => r.id), ['z|r'])

    // 폴더가 없으면 조용히 빈 결과
    assert.deepEqual(scanClaudeLogs(join(root, 'none'), null), {records: [], offsets: {}})
} finally {
    rmSync(root, {recursive: true, force: true})
}

console.log('claudeLogs: all checks passed')
