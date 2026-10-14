import type {SpeciesId, StageId} from './growth.ts'

// 도트 그림 데이터. '.' = 투명, 나머지 글자는 아래 색(공통 + 종별).
// 그림은 **왼쪽 절반(8칸)만** 만들고 좌우로 뒤집어 붙인다. 식물이 항상 대칭이라 한 칸 어긋나는 실수가 없다.
// 맨 오른쪽 칸이 줄기/중심이다. 화분·줄기·잎 실루엣은 모든 종이 공유하고, 꽃 모양·잎 모양·색만 종마다 다르다.
//
// 글자: g 잎 G 잎(밝음) h 잎(어두움) t 줄기 k 나무 줄기 f 꽃잎 y 꽃술 r 열매
//       C c e 수관(밝음/중간/어두움)  b 씨앗 m 흙 P p q 화분 o 윤곽선(자동)
const SRC = 16 // 손으로 그리는 격자 크기
export const GRID = SRC + 2 // 윤곽선 1칸씩 여유를 둔 최종 크기

const E = '........'
const mirror = (half: string[]): string[] => half.map((r) => r + [...r].reverse().join(''))

// 화분과 흙 (아래 5줄, 모든 단계 공통)
const POT = ['....mmmm', '..PPPPPP', '...ppppp', '...ppppp', '....qqqq']

const W = 8 // 왼쪽 절반의 폭. 맨 오른쪽 칸(W-1)이 줄기/중심
const H = SRC - POT.length // 식물이 그려지는 줄 수 (화분 위 11줄)

type LeafStyle = 'blade' | 'broad' | 'slim'

// 식물 그리기 도구. 좌표는 왼쪽 절반 기준이고, 겹치면 먼저 그린 것이 남는다.
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

    stem(from: number, to = H - 1, ch = 't'): this {
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

    // 겹쳐 쓰는 그림 (꽃, 수관 등). 글자 '.'은 건드리지 않는다.
    stamp(top: number, lines: string[]): this {
        lines.forEach((line, dy) => [...line].forEach((ch, x) => ch !== '.' && this.set(top + dy, x, ch)))
        return this
    }

    done(): string[] {
        return this.rows.map((r) => r.join(''))
    }
}

type Motif = 'daisy' | 'sunflower' | 'tulip' | 'bell' | 'rose' | 'spike' | 'ball' | 'poppy' | 'star' | 'blossom'

// 꽃 모양 (위 6줄). 마지막 줄 아래로 줄기가 이어진다.
const MOTIFS: Record<Motif, string[]> = {
    daisy: [E, '......ff', '...fffyy', '...fffyy', '......ff', '.......t'],
    sunflower: ['...f.f.f', '..ffffff', '.ffyryyr', '.ffryyry', '..ffffff', '...f.f.f'],
    tulip: [E, '...f..ff', '...fffff', '...ffyyy', '....ffff', '.......t'],
    bell: ['.......f', '......ff', '.f.fffyy', '.ffffyyy', '..ff.fff', '.f.....f'],
    rose: [E, '....ffff', '...fffyy', '...ffyff', '....ffff', '.......t'],
    spike: ['.......f', '......ff', '.....fyf', '.....fff', '......yf', '.......t'],
    ball: ['....ffff', '..ffyfff', '.fffffyf', '.ffyffff', '..fffyff', '....ffff'],
    poppy: ['..f.f.ff', '.fffffff', '.ffyyyyy', '.fffyryy', '..ffffff', '....ffff'],
    star: ['....f.ff', '..ffffff', '.fffffyy', '.fffffyy', '..ffffff', '....f.ff'],
    blossom: [E, '.ff...ff', '.fyf.fff', '..ff.ffy', '.....fff', '.......t']
}

// 꽃봉오리, 만개 때 양옆에 달리는 작은 꽃
const BUD = [E, E, '.......f', '......ff', '......gg', '.......t']
const SIDE_FLOWER = ['.f......', 'fyf.....', '.f......']

// 큰 나무 단계: 줄기 위에 둥근 수관. f = 꽃, r = 열매
const CANOPY = ['....CCcc', '..CCCccc', '.CCCcccc', '.CCccfcc', '.Cccccfc', '.eccrccc', '..eeccCc', '....eecc']

// 가운데 큰 꽃 + 양옆 가지 끝의 작은 꽃
function fullBloom(c: Canvas, motif: Motif): Canvas {
    // 가지는 잎보다 먼저 그려서 잎이 가리지 않게 한다. 작은 꽃은 큰 꽃 아래쪽(5~7줄)에 둬서 겹치지 않는다.
    return c.stamp(0, MOTIFS[motif]).stamp(5, SIDE_FLOWER)
        .set(8, 6, 't').set(8, 5, 't').set(7, 4, 't').set(7, 3, 't').set(7, 2, 't')
        .stem(6).leaf(10, 3).leaf(9, 2)
}

function plantHalf(stage: StageId, motif: Motif, style: LeafStyle): string[] {
    const c = new Canvas(style)
    const body = (top: number): Canvas => c.stem(top).leaf(10, 3).leaf(9, 2) // 꽃 아래 줄기가 보이도록 잎을 낮게
    switch (stage) {
        case 'seed':
            return c.set(H - 1, W - 1, 'b').done()
        case 'tiny':
            return c.stem(8).leaf(8, 2).done()
        case 'sprout':
            return c.stem(7).leaf(7, 3).done()
        case 'young':
            return c.stem(4).leaf(10, 3).leaf(7, 4).set(3, W - 1, 'G').done()
        case 'leafy':
            return c.stem(3).leaf(10, 4).leaf(8, 5).leaf(5, 3).set(1, W - 1, 'G').set(2, W - 1, 'G').done()
        case 'bud':
            return body(6).stamp(0, BUD).done()
        case 'bloom':
            return body(6).stamp(0, MOTIFS[motif]).done()
        case 'full':
            return fullBloom(c, motif).done()
        case 'fruit':
            return fullBloom(c.set(9, 5, 'r').set(8, 4, 'r'), motif).done()
        case 'tree':
            return c.stamp(0, CANOPY).stem(8, H - 1, 'k').done()
    }
}

const COMMON_COLORS = {
    b: '#c98a4b', m: '#5a3b22', P: '#e0916a', p: '#bf6a45', q: '#8f4a2f', o: '#2a1c12', k: '#6b4a2b'
}

interface Style {
    motif: Motif
    leaf: LeafStyle
    colors: Record<string, string>
}

// 기본 초록 잎. 종마다 일부만 덮어쓴다. 수관(C c e)은 기본적으로 잎 색을 따른다.
const GREEN = {g: '#5fae4f', G: '#8fd36b', h: '#3f8040', t: '#3d7a3a'}
const style = (motif: Motif, leaf: LeafStyle, colors: Record<string, string>): Style => {
    const all = {...GREEN, ...colors}
    return {motif, leaf, colors: {C: all.G, c: all.g, e: all.h, ...all}}
}

const SPECIES_STYLE: Record<SpeciesId, Style> = {
    daisy: style('daisy', 'blade', {f: '#ffffff', y: '#ffd84d', r: '#e5484d'}),
    sunflower: style('sunflower', 'broad', {g: '#6fb842', G: '#a3dd6a', h: '#4a8a2e', t: '#4a7f2e', f: '#ffc928', y: '#6b3f1d', r: '#8b5a2b'}),
    tulip: style('tulip', 'blade', {g: '#4fa665', G: '#82d38e', h: '#337a4a', t: '#357a45', f: '#e5484d', y: '#b3202a', r: '#f5a623'}),
    bellflower: style('bell', 'slim', {g: '#6aa87a', G: '#9bd6a8', h: '#417a56', t: '#3f7a49', f: '#9b6fe0', y: '#ffe27a', r: '#6b3fa0'}),
    rose: style('rose', 'broad', {g: '#3f8f5a', G: '#68bd7f', h: '#2a6a41', t: '#2f6e45', f: '#e0345a', y: '#a8183a', r: '#f5a623'}),
    lavender: style('spike', 'slim', {g: '#7fae8a', G: '#a9d1b2', h: '#58856a', t: '#58856a', f: '#a78bda', y: '#7a5cc0', r: '#7a5cc0'}),
    hydrangea: style('ball', 'broad', {g: '#4e9e6a', G: '#7fcb97', h: '#35755a', t: '#35755a', f: '#7fb3ff', y: '#c7dcff', r: '#5a8fe0', C: '#a8cbff', c: '#7fb3ff', e: '#5a8fe0'}),
    poppy: style('poppy', 'blade', {g: '#6aa84f', G: '#9bd16f', h: '#44803a', t: '#44803a', f: '#ff6b3d', y: '#2a1c12', r: '#ffb03d'}),
    cosmos: style('star', 'slim', {g: '#6bb26a', G: '#9cdb8a', h: '#468a4a', t: '#468a4a', f: '#ff9ccf', y: '#ffd84d', r: '#ff6fb0'}),
    cherry: style('blossom', 'blade', {g: '#7a9a55', G: '#a9c97a', h: '#58774a', t: '#6b4a2b', f: '#ffb7d0', y: '#ff8fb3', r: '#e5484d', C: '#ffd6e6', c: '#ffb7d0', e: '#f28fb0'})
}

// 빛이 왼쪽 위에서 온다고 보고, 오른쪽 절반의 잎과 수관을 한 단계 어둡게, 화분 오른쪽 끝은 그림자로 칠한다.
const DARKER: Record<string, string> = {G: 'g', g: 'h', C: 'c', c: 'e'}
const shade = (rows: string[]): string[] =>
    rows.map((r, y) => {
        const right = [...r.slice(W)].map((ch, i) => (y >= H ? (ch === 'p' && i >= W - 2 ? 'q' : ch) : DARKER[ch] ?? ch))
        return r.slice(0, W) + right.join('')
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
    return outline(shade(mirror([...plantHalf(stage, s.motif, s.leaf), ...POT])))
}

export function paletteOf(species: SpeciesId): Record<string, string> {
    return {...COMMON_COLORS, ...SPECIES_STYLE[species].colors}
}
