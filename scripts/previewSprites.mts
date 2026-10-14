// 모든 종 x 단계 스프라이트를 한 장의 PNG로 만든다. 화면에서 그림을 눈으로 확인하는 용도.
// 실행: npm run preview:sprites [출력경로] [종,종,...]   (기본: dist/sprite-preview.png, 모든 종)
import {mkdirSync, writeFileSync} from 'node:fs'
import {dirname} from 'node:path'
import {deflateSync} from 'node:zlib'
import {SPECIES, STAGES} from '../src/shared/growth.ts'
import {GRID, paletteOf, spriteOf} from '../src/shared/sprites.ts'

const out = process.argv[2] ?? 'dist/sprite-preview.png'
const only = process.argv[3]?.split(',')
const SHOWN = SPECIES.filter((s) => !only || only.includes(s.id))

const SCALE = 5, PAD = 6
const CELL = GRID * SCALE + PAD * 2
const W = CELL * STAGES.length, H = CELL * SHOWN.length

const px = Buffer.alloc(W * H * 4)
const put = (x: number, y: number, [r, g, b]: number[]): void => {
    const i = (y * W + x) * 4
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255
}
const hex = (c: string): number[] => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))

SHOWN.forEach((sp, row) => STAGES.forEach((st, col) => {
    const palette = paletteOf(sp.id)
    const ox = col * CELL, oy = row * CELL
    const bg = (row + col) % 2 ? [0x2d, 0x5a, 0x3d] : [0x1f, 0x3a, 0x2a] // 칸 구분용 바둑판
    for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) put(ox + x, oy + y, bg)
    spriteOf(st.id, sp.id).forEach((line, gy) => [...line].forEach((ch, gx) => {
        if (!palette[ch]) return
        for (let y = 0; y < SCALE; y++) for (let x = 0; x < SCALE; x++) {
            put(ox + PAD + gx * SCALE + x, oy + PAD + gy * SCALE + y, hex(palette[ch]))
        }
    }))
}))

// 최소한의 PNG 인코더 (이미지 라이브러리를 추가하지 않으려고 직접 작성)
const crcTable = Array.from({length: 256}, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
})
const crc = (b: Buffer): number => {
    let c = 0xffffffff
    for (const v of b) c = crcTable[(c ^ v) & 255] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
}
const chunk = (type: string, data: Buffer): Buffer => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type), data])
    const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body))
    return Buffer.concat([len, body, sum])
}
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6
const raw = Buffer.alloc((W * 4 + 1) * H)
for (let y = 0; y < H; y++) px.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4)

mkdirSync(dirname(out), {recursive: true})
writeFileSync(out, Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))
]))
console.log(`${out} (${W}x${H}) 행: ${SHOWN.map((s) => s.name).join(', ')} / 열: ${STAGES.map((s) => s.name).join(', ')}`)
