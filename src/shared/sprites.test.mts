// 실행: npm test
import assert from 'node:assert/strict'
import {SPECIES, STAGES} from './growth.ts'
import {DECOR, DECOR_COLORS} from './decor.ts'
import {GRID, paletteOf, spriteOf} from './sprites.ts'

// 모든 종 x 단계: 12x12, 정의되지 않은 글자(오타) 없음, 빈 그림 없음
for (const sp of SPECIES) {
    const palette = paletteOf(sp.id)
    for (const st of STAGES) {
        const grid = spriteOf(st.id, sp.id)
        const tag = `${sp.id}/${st.id}`
        assert.equal(grid.length, GRID, tag)
        for (const row of grid) {
            assert.equal(row.length, GRID, `${tag} ${row}`)
            for (const ch of row) assert.ok(ch === '.' || ch in palette, `${tag}: 알 수 없는 글자 '${ch}'`)
        }
        assert.ok(grid.some((r) => r !== '.'.repeat(GRID)), tag)
    }
}

// 씨앗 단계는 종과 상관없이 같아서 어떤 종인지 미리 알 수 없다
assert.deepEqual(spriteOf('seed', 'daisy'), spriteOf('seed', 'tulip'))
// 꽃 단계부터는 종마다 모양이 다르다
assert.notDeepEqual(spriteOf('bloom', 'daisy'), spriteOf('bloom', 'tulip'))

// 정원 장식: 줄 길이가 같고 색 표에 없는 글자가 없다
for (const [id, rows] of Object.entries(DECOR)) {
    assert.ok(rows.every((r) => r.length === rows[0].length), `${id}: 줄 길이`)
    for (const ch of rows.join('')) assert.ok(ch === '.' || ch in DECOR_COLORS, `${id}: 알 수 없는 글자 ${ch}`)
}

console.log('sprites: all checks passed')
