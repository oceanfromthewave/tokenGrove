import type {SpeciesId, StageId} from './growth.ts'

// 도트 그림 데이터. '.' = 투명, 나머지 글자는 아래 색(공통 + 종별).
// 줄기/잎/화분은 **왼쪽 절반만** 만들어 좌우로 뒤집어 붙이고(항상 대칭), 꽃·열매·수관은 그 위에 **전체 폭**으로
// 겹쳐 그린다(비대칭 OK). 꽃은 수학적으로 생성한다: 꽃잎 수와 모양이 종마다 다르고, 왼쪽 위에서 빛이 온다고 보고 명암을 넣는다.
//
// 글자: g G h 잎(중간/밝음/어두움)  t 줄기  k 나무 줄기  b 씨앗  m 흙  P p q 화분  o 윤곽선(자동)
//       f F E 꽃잎(중간/밝음/어두움)  y Y z 꽃술(중간/밝음/어두움)  r Q x 열매(중간/밝음/어두움)  C c e 수관(밝음/중간/어두움)
const SRC = 22 // 손으로 그리는 격자 크기
export const GRID = SRC + 2 // 윤곽선 1칸씩 여유를 둔 최종 크기

const mirror = (half: string[]): string[] => half.map((r) => r + [...r].reverse().join(''))

// 화분과 흙 (아래 5줄, 모든 단계 공통)
const POT = ['......mmmmm', '....PPPPPPP', '.....pppppp', '.....pppppp', '......qqqqq']

const W = 11 // 왼쪽 절반의 폭. 맨 오른쪽 칸(W-1)이 줄기/중심
const H = SRC - POT.length // 식물이 그려지는 줄 수 (화분 위 17줄)
const G = H - 1 // 흙에 닿는 맨 아래 줄

type LeafStyle = 'blade' | 'broad' | 'slim'

// 줄기와 잎 그리기 도구 (왼쪽 절반). 겹치면 먼저 그린 것이 남는다.
class Canvas {
    rows = Array.from({length: H}, () => Array<string>(W).fill('.'))

    style: LeafStyle

    constructor(style: LeafStyle) {
        this.style = style
    }

    set(y: number, x: number, ch: string): this {
        if (y >= 0 && y < H && x >= 0 && x < W && this.rows[y][x] === '.') this.rows[y][x] = ch
        return this
    }

    stem(from: number, to = G, ch = 't'): this {
        for (let y = from; y <= to; y++) this.set(y, W - 1, ch)
        return this
    }

    // 줄기 옆(row)에서 왼쪽 위로 뻗는 잎. len이 길수록 큼. 위쪽 가장자리는 밝게, 아래쪽은 어둡게 칠한다.
    leaf(row: number, len: number): this {
        for (let i = 0; i < len; i++) {
            const y = row - i, x = W - 2 - i
            this.set(y, x, 'g').set(y, x - 1, 'G').set(y + 1, x, 'h')
            if (this.style === 'slim') continue
            if (i > 0 && (this.style === 'broad' || i < len - 1)) this.set(y, x + 1, 'g')
            if (this.style === 'broad' && i > 1) this.set(y + 1, x + 1, 'h')
        }
        return this
    }

    done(): string[] {
        return this.rows.map((r) => r.join(''))
    }
}

// 꽃/열매/수관을 올리는 전체 폭 층. '.'은 투명이다.
class Layer {
    rows = Array.from({length: H}, () => Array<string>(SRC).fill('.'))

    put(y: number, x: number, ch: string): this {
        if (y >= 0 && y < H && x >= 0 && x < SRC && ch !== '.') this.rows[y][x] = ch
        return this
    }

    // grid를 (left, top)에 올린다. 가운데(cx) 기준으로 놓고 싶으면 left = cx - floor(폭/2)
    stamp(top: number, left: number, grid: string[]): this {
        grid.forEach((line, dy) => [...line].forEach((ch, dx) => this.put(top + dy, left + dx, ch)))
        return this
    }

    // 두 점 사이를 줄기('t')로 잇는다 (브레젠험)
    line(x0: number, y0: number, x1: number, y1: number, ch = 't'): this {
        const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0)
        const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1
        let err = dx + dy
        for (;;) {
            this.put(y0, x0, ch)
            if (x0 === x1 && y0 === y1) break
            const e2 = 2 * err
            if (e2 >= dy) { err += dy; x0 += sx }
            if (e2 <= dx) { err += dx; y0 += sy }
        }
        return this
    }
}

type RadialKind = 'daisy' | 'poppy' | 'cherry' | 'rose' | 'ball' | 'dandelion'
type Kind = RadialKind | 'tulip' | 'spike' | 'pine' | 'cactus'

// 둥근 꽃: 각도(th)마다 반지름 R이 달라지는 모양 + 꽃술 + 명암. d x h 칸의 격자(위에서 약간 내려다본 느낌이라 h < d).
function radial(kind: RadialKind, d: number, h: number): string[] {
    return Array.from({length: h}, (_, y) =>
        Array.from({length: d}, (_, x) => {
            const nx = (x + 0.5 - d / 2) / (d / 2)
            const ny = (y + 0.5 - h / 2) / (h / 2)
            const r = Math.hypot(nx, ny)
            const th = Math.atan2(ny, nx)
            const top = th + Math.PI / 2 // 위쪽이 0
            const light = -(nx * 0.55 + ny * 0.85) // 왼쪽 위가 밝다
            const lit = (R: number): string => (r > R - 0.14 && light < -0.15 ? 'E' : light > 0.3 ? 'F' : 'f')

            let R = 1
            switch (kind) {
                case 'daisy': {
                    const lobe = Math.cos(12 * th)
                    R = 0.8 + 0.2 * lobe
                    if (r > R) return '.'
                    if (r < 0.28) return nx < 0 && ny < 0 ? 'Y' : 'y'
                    return lobe < -0.8 && r > 0.4 ? 'E' : lit(R)
                }
                case 'poppy': {
                    const lobe = Math.cos(4 * th)
                    R = 0.86 + 0.14 * lobe
                    if (r > R) return '.'
                    if (r < 0.2) return 'z'
                    if (r < 0.4) return (x + y) % 2 === 0 ? 'Y' : 'y' // 꽃밥
                    return lobe < -0.9 && r > 0.45 ? 'E' : lit(R)
                }
                case 'cherry': {
                    const lobe = Math.cos(5 * top)
                    R = 0.7 + 0.3 * lobe
                    if (r > R) return '.'
                    if (r < 0.2) return 'y'
                    if (r < 0.38 && (x + y) % 2 === 0) return 'Y'
                    return lobe < -0.8 && r > 0.4 ? 'E' : lit(R)
                }
                case 'rose': {
                    R = 0.97 + 0.03 * Math.cos(5 * th)
                    if (r > R) return '.'
                    if (r < 0.1) return 'E'
                    const band = Math.floor(r * 5.2 + (top / (2 * Math.PI)) * 1.5 + 10) // 소용돌이 모양으로 겹꽃잎
                    return ['f', 'F', 'E'][((band % 3) + 3) % 3]
                }
                case 'dandelion': {
                    const lobe = Math.cos(22 * th)
                    R = 0.88 + 0.12 * lobe
                    if (r > R) return '.'
                    if (r < 0.2) return nx < 0 && ny < 0 ? 'Y' : 'y'
                    return lobe < -0.75 ? 'E' : (x + y) % 3 === 0 && light > 0 ? 'F' : lit(R)
                }
                case 'ball': {
                    if (r > 1) return '.'
                    if (x % 3 === 2 || y % 3 === 2) return 'E' // 작은 꽃송이 사이의 틈
                    return x % 3 === 0 && y % 3 === 0 && light > 0 ? 'F' : 'f'
                }
            }
        }).join('')
    )
}

// 튤립: 옆에서 본 컵 모양. 위쪽 끝이 세 갈래로 뾰족하다.
function tulip(w = 9, h = 11): string[] {
    const hw = [4, 4, 4.3, 4.5, 4.5, 4.4, 4.1, 3.6, 2.8, 1.8, 0.9]
    const cx = (w - 1) / 2
    return Array.from({length: h}, (_, y) =>
        Array.from({length: w}, (_, x) => {
            const dx = Math.abs(x - cx)
            const inside = y < 2 ? dx >= 2.5 || dx <= 0.5 : dx <= (hw[y] ?? 0)
            if (!inside || dx > hw[Math.min(y, hw.length - 1)] + 0.01) return '.'
            if (y >= 2 && y <= 7 && dx <= 0.5) return 'E' // 가운데 꽃잎의 경계선
            return x < cx - 1.2 ? 'F' : x > cx + 1.2 ? 'E' : 'f'
        }).join('')
    )
}

// 라벤더: 작은 꽃송이가 층층이 달린 길쭉한 이삭
function spike(w = 7, h = 11): string[] {
    const hw = [0.8, 1.2, 1.8, 2, 2.2, 2.4, 2.5, 2.5, 2.4, 2, 1.2]
    const cx = (w - 1) / 2
    return Array.from({length: h}, (_, y) =>
        Array.from({length: w}, (_, x) => {
            const dx = Math.abs(x - cx)
            if (dx > hw[y]) return '.'
            if (y % 3 === 2) return 'E' // 층 사이의 틈
            return (x + y) % 2 === 0 ? 'F' : x > cx + hw[y] - 1 ? 'E' : 'f'
        }).join('')
    )
}

function flowerGrid(kind: Kind, d: number): string[] {
    if (kind === 'pine' || kind === 'cactus') return [] // 소나무와 선인장은 꽃 그림을 쓰지 않는다 (pine(), cactus() 참고)
    if (kind === 'tulip') return tulip(Math.max(7, Math.round(d * 0.58)), Math.round(d * 0.7))
    if (kind === 'spike') return spike(Math.max(5, Math.round(d * 0.42)), Math.round(d * 0.7))
    return radial(kind, d, Math.round(d * 0.66))
}

// 씨앗: 밝은 갈색 타원에 하이라이트와 그림자
const SEED = ['..BBb.', '.BBbbk', 'BBbbkk', '.bkkk.']

// 꽃봉오리: 꽃 색 물방울 + 아래 초록 꽃받침
function bud(): string[] {
    const w = 7, h = 9
    return Array.from({length: h}, (_, y) =>
        Array.from({length: w}, (_, x) => {
            const nx = (x + 0.5 - w / 2) / (w / 2), ny = (y + 0.5 - 5) / 4.5
            if (y >= 6) return Math.abs(nx) <= 1 - (y - 6) * 0.3 ? (Math.abs(nx) > 0.5 ? 'h' : 'g') : '.'
            if (Math.hypot(nx, ny * 0.95) > 1) return '.'
            return nx > 0.35 ? 'E' : nx < -0.3 && ny < 0 ? 'F' : 'f'
        }).join('')
    )
}

// 열매: 동그란 열매에 하이라이트와 그림자
const FRUIT5 = ['.rrr.', 'rQrrr', 'rrrrx', 'rrrxx', '.xxx.']
const FRUIT4 = ['.rr.', 'rQrr', 'rrrx', '.xx.']

// 종마다 열매 모양이 다르다. (r Q x = 열매 색, g G h = 초록, f F E = 꽃 색, y Y z = 꽃술 색)
const HIP = ['..h..', '.rrr.', 'rQrrr', 'rrrrr', 'rrrrx', '.rrx.', '..x..'] // 장미 열매: 위에 꽃받침이 남은 타원
const POD = ['.kkk.', 'kkkkk', 'rQrrr', 'rrrrx', 'rrrxx', '.rxx.'] // 양귀비 씨앗 주머니: 갈색 왕관 꼭대기
const TULIP_POD = ['.rr.', 'rQrr', 'rrrx', 'rxrx', 'rxrx', 'rrrx', '.rrx', '..x.'] // 튤립: 세로 줄이 있는 길쭉한 씨앗 주머니
// 라벤더: 시든 이삭 (꽃 색을 어둡게)
const dry = (g: string[]): string[] => g.map((row) => row.replace(/f/g, 'E'))

// 민들레 씨앗 솜털 공: 하얀 공에 가장자리가 보송보송하고 가운데에 씨앗이 비친다
function puffball(d: number): string[] {
    return Array.from({length: d}, (_, y) =>
        Array.from({length: d}, (_, x) => {
            const nx = (x + 0.5 - d / 2) / (d / 2), ny = (y + 0.5 - d / 2) / (d / 2)
            const r = Math.hypot(nx, ny)
            if (r > 1 || (r > 0.8 && (x + y) % 2 === 0)) return '.'
            if (r < 0.15) return 'y'
            const light = -(nx * 0.55 + ny * 0.85)
            return light > 0.3 ? 'Q' : light < -0.3 ? 'x' : 'r'
        }).join('')
    )
}

// 열매를 놓는 도구: 가지 끝(tipX, tipY)에서 아래로 매달리거나(hang), 위로 서 있다(stand)
function fruitLayer(kind: Kind, l: Layer): void {
    const hang = (sx: number, sy: number, tx: number, ty: number, g: string[]): void => {
        l.line(sx, sy, tx, ty)
        l.stamp(ty, tx - Math.floor(g[0].length / 2), g)
    }
    const stand = (sx: number, sy: number, tx: number, ty: number, g: string[]): void => {
        l.line(sx, sy, tx, ty)
        l.stamp(ty - g.length, tx - Math.floor(g[0].length / 2), g)
    }
    const L: [number, number] = [CX - 1, 12], R: [number, number] = [CX, 13] // 줄기에서 가지가 갈라지는 자리
    const top = (g: string[], up = false): void => {
        l.line(CX - 1, 12, CX - 1, up ? 9 : 5).line(CX, 12, CX, up ? 9 : 5)
        l.stamp(up ? 9 - g.length : 0, CX - Math.floor(g[0].length / 2), g)
    }
    const fruit5 = FRUIT5, fruit4 = FRUIT4

    switch (kind) {
        case 'daisy': // 붉은 열매 송이
            top(fruit5)
            hang(...L, 5, 6, fruit5)
            hang(...R, 17, 7, fruit5)
            hang(...L, 3, 11, fruit4)
            hang(...R, 19, 12, fruit4)
            break
        case 'cherry': // 쌍둥이 체리 두 쌍과 가운데 한 쌍
            for (const [tx, ty, dx] of [[CX - 1, 1, 3], [5, 6, 3], [17, 7, 3]] as const) {
                l.line(tx < CX ? CX - 1 : CX, 12, tx, ty)
                l.line(tx, ty, tx - dx, ty + 2).line(tx, ty, tx + dx, ty + 1)
                l.stamp(ty + 2, tx - dx - 2, fruit5).stamp(ty + 1, tx + dx - 2, fruit5)
            }
            break
        case 'rose': // 장미 열매(로즈힙)
            top(HIP)
            hang(...L, 5, 5, HIP)
            hang(...R, 17, 6, HIP)
            break
        case 'poppy': // 양귀비 씨앗 주머니
            top(POD)
            hang(...L, 5, 6, POD)
            hang(...R, 17, 7, POD)
            break
        case 'tulip': // 위로 선 씨앗 주머니
            stand(CX - 1, 12, CX - 1, 9, TULIP_POD)
            stand(...L, 5, 10, TULIP_POD)
            stand(...R, 17, 9, TULIP_POD)
            l.line(CX, 12, CX, 9)
            break
        case 'spike': { // 시든 이삭
            const sp = dry(spike(5, 9))
            stand(CX - 1, 12, CX - 1, 9, sp)
            stand(...L, 5, 10, sp)
            stand(...R, 17, 9, sp)
            l.line(CX, 12, CX, 9)
            break
        }
        case 'dandelion': // 하얀 솜털 공
            top(puffball(9))
            hang(...L, 5, 6, puffball(7))
            hang(...R, 17, 7, puffball(7))
            break
        case 'ball': { // 포도송이처럼 작은 열매가 뭉친다
            const bunch = (cx: number, top: number, pts: [number, number][]): void => {
                for (const [dx, dy] of pts) l.stamp(top + dy, cx + dx - 2, fruit4)
            }
            l.line(CX - 1, 12, CX - 1, 5).line(CX, 12, CX, 5)
            bunch(CX - 1, 0, [[-3, 0], [3, 0], [0, 3], [-3, 4], [3, 4], [0, 7]])
            l.line(...L, 4, 9)
            bunch(4, 10, [[-2, 0], [2, 0], [0, 3]])
            l.line(...R, 18, 10)
            bunch(18, 11, [[-2, 0], [2, 0], [0, 3]])
            break
        }
        default:
            break
    }
}

// 큰 나무 수관: 가장자리가 구불구불한 타원, 왼쪽 위 밝고 오른쪽 아래 어둡다. 곳곳에 꽃(f)과 열매(r).
function canopy(): string[] {
    const w = SRC, h = 13
    const spots: [number, number][] = [[6, 3], [12, 2], [16, 4], [4, 7], [10, 6], [14, 8], [8, 10]]
    const fruits: [number, number][] = [[9, 4], [15, 6], [6, 9], [12, 10], [18, 8]]
    const g: string[][] = Array.from({length: h}, (_, y) =>
        Array.from({length: w}, (_, x): string => {
            const nx = (x + 0.5 - w / 2) / (w / 2 - 0.5), ny = (y + 0.5 - h / 2) / (h / 2)
            const r = Math.hypot(nx, ny), th = Math.atan2(ny, nx)
            if (r > 1 + 0.07 * Math.cos(9 * th)) return '.'
            const light = -(nx * 0.55 + ny * 0.85)
            if (light > 0.5 || (x * 5 + y * 7) % 11 === 0) return 'C'
            if (light < -0.45 || (x * 3 + y * 5) % 13 === 0) return 'e'
            return 'c'
        })
    )
    for (const [x, y] of spots) for (const [dx, dy, ch] of [[0, 0, 'F'], [1, 0, 'f'], [0, 1, 'f'], [1, 1, 'E']] as const) if (g[y + dy]?.[x + dx] && g[y + dy][x + dx] !== '.') g[y + dy][x + dx] = ch
    for (const [x, y] of fruits) for (const [dx, dy, ch] of [[0, 0, 'Q'], [1, 0, 'r'], [0, 1, 'r'], [1, 1, 'x']] as const) if (g[y + dy]?.[x + dx] && g[y + dy][x + dx] !== '.') g[y + dy][x + dx] = ch
    return g.map((r) => r.join(''))
}

const CX = SRC / 2 // 화면 가운데(줄기) 위치

// 소나무: 꽃 대신 솔잎 층, 꽃가루(노랑) 송이, 솔방울(갈색)로 자란다. 전체를 전체 폭 층(Layer)에 그린다.
const PINE_CX = (SRC - 1) / 2

// 솔잎 한 층: 가장자리가 톱니 모양인 삼각형. 왼쪽 위가 밝고 아래쪽 줄이 어둡다.
function tier(l: Layer, top: number, h: number, hw: number): void {
    for (let i = 0; i < h; i++) {
        const w = 1 + ((hw - 1) * i) / Math.max(1, h - 1)
        for (let x = Math.ceil(PINE_CX - w); x <= Math.floor(PINE_CX + w); x++) {
            const dx = Math.abs(x - PINE_CX)
            if (i % 2 === 1 && i < h - 1 && dx > w - 1.2) continue // 톱니
            const light = -(((x - PINE_CX) / hw) * 0.6 + (i / h - 0.5) * 0.7)
            l.put(top + i, x, i === h - 1 || light < -0.3 ? 'h' : light > 0.3 || (x * 5 + i * 7) % 9 === 0 ? 'G' : 'g')
        }
    }
}

// 솔잎 덩어리(납작한 타원): 큰 소나무의 가지 끝
function pad(l: Layer, cx: number, cy: number, rx: number, ry: number): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
            const nx = (x - cx) / rx, ny = (y - cy) / ry
            const r = Math.hypot(nx, ny)
            if (r > 1 + 0.12 * Math.cos(5 * Math.atan2(ny, nx))) continue
            const light = -(nx * 0.55 + ny * 0.85)
            l.put(y, x, light > 0.4 || (x * 5 + y * 7) % 9 === 0 ? 'G' : light < -0.3 || ny > 0.6 ? 'h' : 'g')
        }
    }
}

const POLLEN = ['.Y.', 'YyY', '.y.'] // 꽃가루 송이
const CONE = ['.rr.', 'rQrr', 'rrrx', '.rx.'] // 솔방울

// 선인장: 줄기 기둥(w칸 폭, top줄부터 bottom줄까지). 위가 둥글고 왼쪽이 밝다. 가시는 노란 점.
function column(l: Layer, x0: number, top: number, w: number, bottom = G): void {
    for (let y = top; y <= bottom; y++) {
        const inset = Math.max(0, (w >= 5 ? 2 : 1) - (y - top))
        for (let dx = inset; dx < w - inset; dx++) {
            const tone = dx < w * 0.3 ? 'G' : dx >= w * 0.7 ? 'h' : 'g'
            l.put(y, x0 + dx, (y * 2 + dx) % 5 === 0 && dx % 3 === 1 ? 'Y' : tone)
        }
    }
}

const CACTUS_FLOWER = ['.FfFf.', 'FfYYfE', '.fEEf.']
const CACTUS_BUD = ['.FF.', 'FffE', '.fE.']

function cactus(stage: StageId, l: Layer): void {
    const X0 = 7 // 몸통 8칸 폭: 7..14
    const flower = (cx: number, top: number): void => void l.stamp(top - 3, Math.round(cx - 3), CACTUS_FLOWER)
    const berry = (cx: number, top: number): void => void l.stamp(top - 4, Math.round(cx - 2), FRUIT4)
    // 몸통에서 옆으로 뻗었다가 위로 휘는 가지
    const arm = (xFrom: number, xTo: number, y: number, top: number): void => {
        for (let yy = y; yy < y + 3; yy++) {
            for (let x = Math.min(xFrom, xTo); x <= Math.max(xFrom, xTo); x++) l.put(yy, x, yy === y ? 'G' : 'g')
        }
        column(l, xTo - 1, top, 3, y + 2)
    }
    const arms = (leftTop: number, rightTop: number): void => {
        arm(6, 3, 11, leftTop)
        arm(15, 18, 8, rightTop)
    }
    switch (stage) {
        case 'tiny':
            column(l, 9, G - 3, 4)
            break
        case 'sprout':
            column(l, 8, G - 6, 6)
            break
        case 'young':
            column(l, 8, G - 9, 6)
            break
        case 'leafy':
            column(l, X0, G - 12, 8)
            break
        case 'bud':
            column(l, X0, 4, 8)
            l.stamp(1, 9, CACTUS_BUD)
            break
        case 'bloom':
            column(l, X0, 5, 8)
            flower(11, 5)
            break
        case 'full':
            column(l, X0, 4, 8)
            arms(7, 6)
            flower(11, 4)
            flower(3.5, 7)
            flower(18.5, 6)
            break
        case 'fruit':
            column(l, X0, 4, 8)
            arms(7, 6)
            berry(11, 4)
            berry(3.5, 7)
            berry(18.5, 6)
            break
        default: // 큰 선인장: 키가 크고 가지가 두 개, 꼭대기마다 꽃
            column(l, X0, 3, 8)
            arms(6, 3)
            flower(11, 3)
            flower(3.5, 6)
            flower(18.5, 3)
            berry(18.5 - 9, 11) // 몸통 옆에 열매가 하나 남아 있다
    }
}

function pine(stage: StageId, l: Layer): void {
    const trunk = (from: number): void => {
        for (let y = from; y <= G; y++) l.put(y, 10, 'k').put(y, 11, 'k')
    }
    const tiers = (list: [number, number, number][]): void => {
        const last = list[list.length - 1]
        trunk(last[0] + last[1])
        for (const [top, h, hw] of list) tier(l, top, h, hw)
    }
    // 층의 끝에 한쪽씩 번갈아 놓는다 (맨 위 층은 제외)
    const corners = (list: [number, number, number][], g: string[]): void => {
        list.forEach(([top, h, hw], i) => {
            if (i === 0) return
            const x = i % 2 ? Math.round(PINE_CX - hw) - 1 : Math.round(PINE_CX + hw) - 1
            l.stamp(top + h - 2, x, g)
        })
    }
    const small: [number, number, number][] = [[3, 4, 2.5], [6, 4, 4], [9, 4, 5.5]]
    const mid: [number, number, number][] = [[1, 4, 2.5], [4, 4, 4], [7, 4, 5.5], [10, 4, 7]]
    const big: [number, number, number][] = [[0, 4, 2.5], [3, 4, 4], [6, 4, 5.5], [9, 4, 7], [12, 3, 8.5]]
    switch (stage) {
        case 'leafy':
            tiers(small)
            break
        case 'bud': // 새순(연한 초록 촛대)이 가지 끝에 올라온다
            tiers(mid)
            for (const [top] of mid) l.put(top - 1, 10, 'F').put(top - 1, 11, 'f')
            break
        case 'bloom': // 꽃가루 송이
            tiers(mid)
            corners(mid, POLLEN)
            break
        case 'full':
            tiers(big)
            corners(big, POLLEN)
            break
        case 'fruit': // 솔방울
            tiers(big)
            corners(big, CONE)
            break
        default: { // 큰 소나무: 굽은 줄기 위에 납작한 솔잎 덩어리 세 개
            for (const x of [10, 11]) l.line(x, G, x, 11).line(x, 11, x - 2, 6).line(x, 11, x + 4, 8).line(x, 12, x - 4, 10, 'k')
            pad(l, 9, 3.5, 6.5, 3)
            pad(l, 17, 7, 4.5, 2.5)
            pad(l, 4.5, 9.5, 4.5, 2.5)
            l.stamp(6, 6, CONE).stamp(8, 15, CONE)
        }
    }
}

// 덤불 둔덕: 땅에서 솟은 둥근 잎 더미. top줄부터 시작해 흙까지. 왼쪽 위가 밝다.
function mound(top: number): string[] {
    const cx = (SRC - 1) / 2
    return Array.from({length: H}, (_, y) =>
        Array.from({length: SRC}, (_, x): string => {
            if (y < top) return '.'
            const t = (y - top + 0.5) / (H - top) // 0 = 맨 위, 1 = 맨 아래
            const hw = 10.8 * Math.sqrt(1 - (1 - t) ** 2) + 0.7 * Math.cos(3 * y)
            if (Math.abs(x - cx) > hw) return '.'
            const light = -(((x - cx) / 11) * 0.55 + (t - 0.4) * 0.85)
            if (light > 0.35 || (x * 5 + y * 7) % 11 === 0) return 'G'
            if (light < -0.35 || (x * 3 + y * 5) % 13 === 0) return 'h'
            return 'g'
        }).join('')
    )
}

// 마지막 단계의 모양은 식물 종류에 따라 다르다.
//   벚꽃 = 큰 나무, 장미/수국/라벤더 = 덤불, 나머지 풀꽃 = 꽃이 가득한 포기
function grown(kind: Kind, c: Canvas, l: Layer, flowerAt: (cx: number, bottom: number, d: number) => void): void {
    const at = (cx: number, top: number, g: string[]): void => void l.stamp(top, Math.round(cx - g[0].length / 2), g)
    switch (kind) {
        case 'cherry':
            l.stamp(0, 0, canopy())
            c.stem(13, G, 'k').set(12, W - 1, 'k').set(12, W - 2, 'k')
            break
        case 'rose': // 장미 덤불: 둥근 잎 더미에 장미가 가득, 가장자리에 열매
            l.stamp(0, 0, mound(4))
            for (const [x, y] of [[11, 1], [5, 4], [17, 5], [8, 8], [14, 9]] as const) at(x, y, flowerGrid('rose', 8))
            at(3, 12, FRUIT4)
            at(19, 12, FRUIT4)
            break
        case 'ball': // 수국 덤불: 파란 꽃송이 덩어리가 덤불을 덮는다
            l.stamp(0, 0, mound(6))
            for (const [x, y] of [[11, 1], [5, 6], [17, 6], [11, 9]] as const) at(x, y, flowerGrid('ball', 10))
            break
        case 'spike': // 라벤더 덤불: 낮은 잎 더미에서 보라색 이삭이 여러 대 솟는다
            l.stamp(0, 0, mound(6))
            for (const [x, h] of [[3, 8], [8, 10], [13, 11], [18, 9]] as const) at(x, 13 - h, spike(5, h))
            break
        default: { // 풀꽃 포기: 여러 줄기에 꽃이 층층이 핀 풍성한 한 포기
            c.stem(9).leaf(G, 5).leaf(G - 4, 5).leaf(G - 8, 4)
            const flowers: [number, number, number][] = [[CX, 7, 10], [5, 12, 8], [17, 11, 8], [3, 15, 6], [19, 14, 6]]
            for (const [x, bottom] of flowers) l.line(x < CX ? CX - 1 : CX, 15, x, bottom)
            flowers.forEach(([x, bottom, d], i) => (kind === 'dandelion' && i >= 3 ? at(x, bottom - 6, puffball(6)) : flowerAt(x, bottom, d)))
        }
    }
}

// 한 단계의 그림 두 겹: 줄기/잎(왼쪽 절반) + 위에 올리는 꽃/열매/수관(전체 폭)
function plant(stage: StageId, kind: Kind, style: LeafStyle): { half: string[]; layer: Layer } {
    const c = new Canvas(style)
    const l = new Layer()
    if (kind === 'pine' && !['seed', 'tiny', 'sprout', 'young'].includes(stage)) {
        pine(stage, l)
        return {half: c.done(), layer: l}
    }
    if (kind === 'cactus' && stage !== 'seed') {
        cactus(stage, l)
        return {half: c.done(), layer: l}
    }
    const body = (top: number): Canvas => c.stem(top).leaf(G, 5).leaf(G - 5, 4)
    const flowerAt = (cx: number, bottom: number, d: number): void => {
        const g = flowerGrid(kind, d)
        l.stamp(bottom - g.length, Math.round(cx - g[0].length / 2), g)
    }

    switch (stage) {
        case 'seed': {
            ;[2, 3.5, 4.5, 5].forEach((hw, i) => {
                const y = G - 3 + i
                for (let x = 0; x < SRC; x++) {
                    if (Math.abs(x + 0.5 - CX) <= hw) l.put(y, x, x + 0.5 < CX - hw + 2.2 && i < 3 ? 'n' : 'm')
                }
            })
            l.stamp(G - 6, CX - 3, SEED)
            break
        }
        case 'tiny':
            c.stem(G - 3).leaf(G - 3, 3)
            break
        case 'sprout':
            c.stem(G - 7).leaf(G - 7, 4)
            break
        case 'young':
            c.stem(G - 11).leaf(G - 1, 4).leaf(G - 6, 4).set(G - 12, W - 1, 'G')
            break
        case 'leafy':
            c.stem(G - 15).leaf(G, 5).leaf(G - 5, 5).leaf(G - 10, 4).set(G - 16, W - 1, 'G').set(G - 15, W - 1, 'G')
            break
        case 'bud': {
            body(8)
            l.stamp(3, Math.round(CX - 3.5), bud())
            break
        }
        case 'bloom':
            body(8)
            flowerAt(CX, 10, 16)
            break
        case 'full': {
            body(8)
            // 가운데 큰 꽃 + 양옆 가지 끝의 작은 꽃 두 송이 (높이와 크기가 달라서 자연스럽다)
            l.line(CX - 1, 13, 5, 11).line(CX, 12, 17, 10)
            flowerAt(CX, 9, 13)
            flowerAt(5, 12, 9)
            flowerAt(17, 10, 8)
            break
        }
        case 'fruit': {
            body(8)
            fruitLayer(kind, l) // 꽃이 진 자리에 종마다 다른 열매가 열린다
            break
        }
        case 'tree':
            grown(kind, c, l, flowerAt)
            break
    }
    return {half: c.done(), layer: l}
}

const COMMON_COLORS = {
    b: '#c98a4b', B: '#ecc088', n: '#7a5233', m: '#5a3b22', P: '#e0916a', p: '#bf6a45', q: '#8f4a2f', o: '#2a1c12', k: '#6b4a2b'
}

// 색 섞기: hex 색을 target 색 쪽으로 t만큼 옮긴다
function mix(hex: string, target: number, t: number): string {
    const n = parseInt(hex.slice(1), 16)
    const ch = (shift: number): string => {
        const v = (n >> shift) & 255
        return Math.round(v + (target - v) * t).toString(16).padStart(2, '0')
    }
    return `#${ch(16)}${ch(8)}${ch(0)}`
}
const lighten = (hex: string, t: number): string => mix(hex, 255, t)
const darken = (hex: string, t: number): string => mix(hex, 0, t)

interface Style {
    kind: Kind
    leaf: LeafStyle
    colors: Record<string, string>
}

// 기본 초록 잎. 종마다 일부만 덮어쓴다. 수관(C c e)은 기본적으로 잎 색을, 꽃/꽃술/열매의 밝음·어두움은 기본색에서 계산한다.
const GREEN = {g: '#5fae4f', G: '#8fd36b', h: '#3f8040', t: '#3d7a3a'}
const style = (kind: Kind, leaf: LeafStyle, colors: Record<string, string>): Style => {
    const all: Record<string, string> = {...GREEN, ...colors}
    const derived = {
        C: all.G, c: all.g, e: all.h,
        F: lighten(all.f, 0.4), E: darken(all.f, 0.32),
        Y: lighten(all.y, 0.45), z: darken(all.y, 0.5),
        Q: lighten(all.r, 0.5), x: darken(all.r, 0.35)
    }
    return {kind, leaf, colors: {...derived, ...all}}
}

const SPECIES_STYLE: Record<SpeciesId, Style> = {
    daisy: style('daisy', 'blade', {f: '#ffffff', y: '#ffd84d', r: '#ffffff'}),
    pine: style('pine', 'slim', {g: '#3e7d4f', G: '#6fae7e', h: '#2a5a3a', t: '#5b3a22', f: '#cfe58a', y: '#ffd84d', r: '#9a6a3a'}),
    tulip: style('tulip', 'blade', {g: '#4fa665', G: '#82d38e', h: '#337a4a', t: '#357a45', f: '#e5484d', y: '#b3202a', r: '#e5484d'}),
    cactus: style('cactus', 'blade', {g: '#4f9a5a', G: '#7fcf86', h: '#34724a', t: '#34724a', f: '#ff7aa8', y: '#e8d890', r: '#e0345a'}),
    rose: style('rose', 'broad', {g: '#3f8f5a', G: '#68bd7f', h: '#2a6a41', t: '#2f6e45', f: '#e0345a', y: '#a8183a', r: '#e5484d'}),
    lavender: style('spike', 'slim', {g: '#7fae8a', G: '#a9d1b2', h: '#58856a', t: '#58856a', f: '#a78bda', y: '#7a5cc0', r: '#7a5cc0'}),
    hydrangea: style('ball', 'broad', {g: '#4e9e6a', G: '#7fcb97', h: '#35755a', t: '#35755a', f: '#7fb3ff', y: '#c7dcff', r: '#5a8fe0', C: '#a8cbff', c: '#7fb3ff', e: '#5a8fe0'}),
    poppy: style('poppy', 'blade', {g: '#6aa84f', G: '#9bd16f', h: '#44803a', t: '#44803a', f: '#f0431f', y: '#3a1d12', Y: '#ffb03d', z: '#140806', r: '#e5484d'}),
    dandelion: style('dandelion', 'blade', {g: '#5fa84a', G: '#8fd36b', h: '#3f8040', t: '#4a8a3a', f: '#ffd23a', y: '#f29a1a', r: '#f1f3f5'}),
    cherry: style('cherry', 'blade', {g: '#7a9a55', G: '#a9c97a', h: '#58774a', t: '#6b4a2b', f: '#ffb7d0', y: '#ff8fb3', r: '#ff9fc0', C: '#ffd6e6', c: '#ffb7d0', e: '#f28fb0'})
}

// 빛이 왼쪽 위에서 온다고 보고, 오른쪽 절반의 잎과 수관을 한 단계 어둡게, 화분 오른쪽 끝은 그림자로 칠한다.
const DARKER: Record<string, string> = {G: 'g', g: 'h', C: 'c', c: 'e'}
const shade = (rows: string[]): string[] =>
    rows.map((r, y) => {
        const right = [...r.slice(SRC / 2)].map((ch, i) => (y >= H ? (ch === 'p' && i >= SRC / 2 - 2 ? 'q' : ch) : DARKER[ch] ?? ch))
        return r.slice(0, SRC / 2) + right.join('')
    })

// 그림 둘레에 1칸 윤곽선('o')을 자동으로 둘러서, 흰 꽃도 밝은 바탕화면 위에서 보이게 한다.
function outline(rows: string[]): string[] {
    const at = (y: number, x: number): string => rows[y]?.[x] ?? '.'
    return Array.from({length: GRID}, (_, y) =>
        Array.from({length: GRID}, (_, x) => {
            const ch = at(y - 1, x - 1)
            if (ch !== '.') return ch
            const near = [at(y - 2, x - 1), at(y, x - 1), at(y - 1, x - 2), at(y - 1, x)]
            return near.some((n) => n !== '.') ? 'o' : '.'
        }).join('')
    )
}

export function spriteOf(stage: StageId, species: SpeciesId): string[] {
    const s = SPECIES_STYLE[species]
    const {half, layer} = plant(stage, s.kind, s.leaf)
    const plantRows = mirror(half).map((row, y) => [...row].map((ch, x) => (layer.rows[y][x] !== '.' ? layer.rows[y][x] : ch)).join(''))
    return outline(shade([...plantRows, ...mirror(POT)]))
}

// gold: 모든 종을 완성한 보상으로 화분을 황금색으로 칠한다.
const GOLD_POT = {P: '#ffe27a', p: '#e0b030', q: '#a67a12'}

export function paletteOf(species: SpeciesId, gold = false): Record<string, string> {
    return {...COMMON_COLORS, ...(gold ? GOLD_POT : {}), ...SPECIES_STYLE[species].colors}
}
