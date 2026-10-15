// 실행: npm test
import assert from 'node:assert/strict'
import {readdirSync, readFileSync} from 'node:fs'
import {join} from 'node:path'
import {EN} from './en.ts'
import {resolveLang, setLang, tr} from './i18n.ts'
import {SPECIES, STAGES, RARITY} from './growth.ts'
import {ACHIEVEMENTS} from './achievements.ts'
import {UNLOCKS} from './unlocks.ts'
import {SPEED_NAME} from './settings.ts'

// 언어 고르기
assert.equal(resolveLang('auto', 'ko-KR'), 'ko')
assert.equal(resolveLang('auto', 'en-US'), 'en')
assert.equal(resolveLang('auto', 'ja'), 'en')
assert.equal(resolveLang('ko', 'en-US'), 'ko')
assert.equal(resolveLang('en', 'ko-KR'), 'en')

// 치환, 번역표에 없으면 원문
setLang('ko')
assert.equal(tr('{n}일 연속이에요!', {n: 3}), '3일 연속이에요!')
setLang('en')
assert.equal(tr('{n}일 연속이에요!', {n: 3}), '3 days in a row!')
assert.equal(tr('번역표에 없는 문장'), '번역표에 없는 문장')

// 소스에 쓴 tr('...') 문구가 전부 번역표에 있는지 검사한다 (번역 누락 방지)
const files: string[] = []
const walk = (d: string): void => {
    for (const e of readdirSync(d, {withFileTypes: true})) {
        const p = join(d, e.name)
        if (e.isDirectory()) walk(p)
        else if (/\.(ts|tsx)$/.test(e.name) && e.name !== 'en.ts') files.push(p)
    }
}
walk('src')
const BS = String.fromCharCode(92)
const lit = (q: string): string => `${q}((?:[^${q}${BS}${BS}]|${BS}${BS}.)*)${q}`
const re = new RegExp(`${BS}btr${BS}(${BS}s*(?:${lit("'")}|${lit('"')})`, 'g')
const unescape = (s: string): string => s.split(BS + 'n').join('\n').split(BS + "'").join("'").split(BS + '"').join('"')
const hangul = /[가-힣]/
const missing: string[] = []
for (const f of files) {
    for (const m of readFileSync(f, 'utf8').matchAll(re)) {
        const key = unescape(m[1] ?? m[2])
        if (hangul.test(key) && !(key in EN)) missing.push(`${f}: ${key}`)
    }
}
// 대사 표(chatter.ts)는 문장이 표에 들어 있고 tr(l)로 번역하므로, 한글이 든 작은따옴표 문자열을 전부 검사한다
const quoted = new RegExp(lit("'"), 'g')
for (const m of readFileSync('src/shared/chatter.ts', 'utf8').matchAll(quoted)) {
    const key = unescape(m[1])
    if (hangul.test(key) && !(key in EN)) missing.push(`chatter.ts: ${key}`)
}
assert.deepEqual(missing, [])

// 데이터 표 이름도 영어로 나온다
const names = [
    ...SPECIES.map((s) => s.name),
    ...STAGES.map((s) => s.name),
    ...Object.values(RARITY).map((r) => r.name),
    ...ACHIEVEMENTS.flatMap((a) => [a.name, a.desc]),
    ...UNLOCKS.map((u) => u.name),
    ...Object.values(SPEED_NAME)
]
for (const t of names) assert.equal(hangul.test(t), false, t)

setLang('ko')
console.log('i18n: all checks passed')
