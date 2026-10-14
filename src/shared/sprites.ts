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

type RadialKind = 'daisy' | 'cosmos' | 'sunflower' | 'poppy' | 'cherry' | 'bell' | 'rose' | 'ball'
type Kind = RadialKind | 'tulip' | 'spike'

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
                case 'cosmos': {
                    const lobe = Math.cos(8 * th)
                    R = 0.72 + 0.28 * lobe
                    if (r > R) return '.'
                    if (r < 0.24) return nx < 0 && ny < 0 ? 'Y' : 'y'
                    return lobe < -0.7 && r > 0.35 ? 'E' : lit(R)
                }
                case 'sunflower': {
                    const lobe = Math.cos(26 * th)
                    R = 0.9 + 0.1 * lobe
                    if (r > R) return '.'
                    if (r < 0.6) return r > 0.5 ? 'z' : (x * 7 + y * 3) % 5 === 0 ? 'Y' : 'y' // 씨앗 무늬 꽃심
                    return lobe < -0.9 ? 'E' : lit(R)
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
                case 'bell': {
                    const lobe = (Math.cos(5 * top) + 1) / 2
                    R = 0.32 + 0.68 * lobe ** 1.4
                    if (r > R) return '.'
                    if (r < 0.17) return 'Y'
                    return Math.cos(5 * top) > 0.9 && r > 0.2 ? 'E' : lit(R)
                }
                case 'rose': {
                    R = 0.97 + 0.03 * Math.cos(5 * th)
                    if (r > R) return '.'
                    if (r < 0.1) return 'E'
                    const band = Math.floor(r * 5.2 + (top / (2 * Math.PI)) * 1.5 + 10) // 소용돌이 모양으로 겹꽃잎
                    return ['f', 'F', 'E'][((band % 3) + 3) % 3]
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
const CAPSULE = ['.hFh.', 'rQrrr', 'rrrrr', 'rrrrx', '.rrx.'] // 도라지: 별 모양 꼭지가 달린 풍선
const TULIP_POD = ['.rr.', 'rQrr', 'rrrx', 'rxrx', 'rxrx', 'rrrx', '.rrx', '..x.'] // 튤립: 세로 줄이 있는 길쭉한 씨앗 주머니
const PUFF = ['..FF..', '.FfFF.', 'FFFfFF', 'FfFFFf', '.FFfF.', '..FF..'] // 코스모스: 솜털 씨앗
// 라벤더: 시든 이삭 (꽃 색을 어둡게)
const dry = (g: string[]): string[] => g.map((row) => row.replace(/f/g, 'E'))

// 해바라기 씨앗 머리: 씨앗 무늬 원반 + 시든 꽃잎이 아래쪽에 조금 남아 있다
function seedHead(d: number, h: number): string[] {
    return Array.from({length: h}, (_, y) =>
        Array.from({length: d}, (_, x) => {
            const nx = (x + 0.5 - d / 2) / (d / 2), ny = (y + 0.5 - h / 2) / (h / 2)
            const r = Math.hypot(nx, ny)
            if (r > 1) return '.'
            if (r > 0.86) return ny > 0.2 && nx > -0.2 ? 'E' : 'z' // 가장자리: 아래쪽은 시든 꽃잎 색
            const light = -(nx * 0.55 + ny * 0.85)
            return (x * 7 + y * 3) % 5 === 0 ? 'Y' : light > 0.35 ? 'Y' : 'y'
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
        case 'sunflower': { // 무겁게 고개 숙인 씨앗 머리 + 옆의 작은 머리
            const head = seedHead(15, 11)
            l.line(CX - 1, 12, CX - 1, 7).line(CX, 12, CX, 7)
            l.stamp(0, CX - 7, head)
            hang(...L, 4, 8, seedHead(8, 6))
            break
        }
        case 'tulip': // 위로 선 씨앗 주머니
            stand(CX - 1, 12, CX - 1, 9, TULIP_POD)
            stand(...L, 5, 10, TULIP_POD)
            stand(...R, 17, 9, TULIP_POD)
            l.line(CX, 12, CX, 9)
            break
        case 'bell': // 풍선 모양 열매
            top(CAPSULE)
            hang(...L, 5, 6, CAPSULE)
            hang(...R, 17, 7, CAPSULE)
            break
        case 'spike': { // 시든 이삭
            const sp = dry(spike(5, 9))
            stand(CX - 1, 12, CX - 1, 9, sp)
            stand(...L, 5, 10, sp)
            stand(...R, 17, 9, sp)
            l.line(CX, 12, CX, 9)
            break
        }
        case 'cosmos': // 솜털 씨앗
            top(PUFF)
            hang(...L, 5, 6, PUFF)
            hang(...R, 17, 7, PUFF)
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

// 한 단계의 그림 두 겹: 줄기/잎(왼쪽 절반) + 위에 올리는 꽃/열매/수관(전체 폭)
function plant(stage: StageId, kind: Kind, style: LeafStyle): { half: string[]; layer: Layer } {
    const c = new Canvas(style)
    const l = new Layer()
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
            l.stamp(0, 0, canopy())
            c.stem(13, G, 'k').set(12, W - 1, 'k').set(12, W - 2, 'k')
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
    sunflower: style('sunflower', 'broad', {g: '#6fb842', G: '#a3dd6a', h: '#4a8a2e', t: '#4a7f2e', f: '#ffc928', y: '#6b3f1d', r: '#8b5a2b'}),
    tulip: style('tulip', 'blade', {g: '#4fa665', G: '#82d38e', h: '#337a4a', t: '#357a45', f: '#e5484d', y: '#b3202a', r: '#e5484d'}),
    bellflower: style('bell', 'slim', {g: '#6aa87a', G: '#9bd6a8', h: '#417a56', t: '#3f7a49', f: '#9b6fe0', y: '#ffe27a', r: '#6b3fa0'}),
    rose: style('rose', 'broad', {g: '#3f8f5a', G: '#68bd7f', h: '#2a6a41', t: '#2f6e45', f: '#e0345a', y: '#a8183a', r: '#e5484d'}),
    lavender: style('spike', 'slim', {g: '#7fae8a', G: '#a9d1b2', h: '#58856a', t: '#58856a', f: '#a78bda', y: '#7a5cc0', r: '#7a5cc0'}),
    hydrangea: style('ball', 'broad', {g: '#4e9e6a', G: '#7fcb97', h: '#35755a', t: '#35755a', f: '#7fb3ff', y: '#c7dcff', r: '#5a8fe0', C: '#a8cbff', c: '#7fb3ff', e: '#5a8fe0'}),
    poppy: style('poppy', 'blade', {g: '#6aa84f', G: '#9bd16f', h: '#44803a', t: '#44803a', f: '#f0431f', y: '#3a1d12', Y: '#ffb03d', z: '#140806', r: '#e5484d'}),
    cosmos: style('cosmos', 'slim', {g: '#6bb26a', G: '#9cdb8a', h: '#468a4a', t: '#468a4a', f: '#ff9ccf', y: '#ffd84d', r: '#e5484d'}),
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

export function paletteOf(species: SpeciesId): Record<string, string> {
    return {...COMMON_COLORS, ...SPECIES_STYLE[species].colors}
}
