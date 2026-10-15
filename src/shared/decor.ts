// 정원 풍경을 꾸미는 작은 도트 그림. '.' = 투명. 식물과 같은 방식(글자 격자 + 색 표)이다.
export type DecorId = 'tuft' | 'flowerPink' | 'flowerYellow' | 'flowerWhite' | 'mushroom' | 'rock' | 'stone' | 'bush' | 'pine' | 'bee' | 'bird' | 'butterfly' | 'birdhouse' | 'lantern' | 'signpost' | 'flowerbed'

export const DECOR: Record<DecorId, string[]> = {
    tuft: ['.g..g.', 'g.gg.g', 'gGgGgg', '.gggg.'],
    flowerPink: ['.ppp.', '.pcp.', '.ppp.', '..g..', '.gGg.'],
    flowerYellow: ['.qqq.', '.qcq.', '.qqq.', '..g..', '.gGg.'],
    flowerWhite: ['.www.', '.wcw.', '.www.', '..g..', '.gGg.'],
    stone: ['.KKKKK.', 'KKkkkKK', '.kkkkk.'],
    bush: ['..hGGh..', '.hGGGGh.', 'hGGgGGGh', 'hGGGGgGh', '.hhhhhh.'],
    mushroom: ['.rrrr.', 'rwrrwr', '.rrrr.', '..ss..', '..ss..'],
    pine: ['...h...', '..hhh..', '..hGh..', '.hhhhh.', '.hhGhh.', 'hhhhhhh', '...t...', '...t...'],
    bee: ['.w.w.', 'qoqoq', '.qqq.'],
    bird: ['..BB..', '.BBBBq', 'BBwBB.', '.BBBB.', '..o.o.'],
    // 해금 소품: 새집, 등불, 푯말, 화단 (o = 윤곽선, a e l = 나무 밝음/보통/어두움, R = 지붕, Y L = 불빛)
    birdhouse: ['..RRRR..', '.RRRRRR.', 'RRRRRRRR', '.aaaaaa.', '.aaooaa.', '.aaooaa.', '.eeeeee.', '...ll...', '...ll...', '...ll...'],
    lantern: ['.lll.', 'lYYYl', 'lYLYl', 'lYYYl', '.lll.', '..l..', '..l..', '..l..', '..l..', '..l..', '.lll.'],
    signpost: ['eeeeeeeee', 'eaaaaaaae', 'eaaaaaaae', 'eeeeeeeee', '....l....', '....l....', '....l....', '....l....'],
    flowerbed: ['.p..q..w..', '.g..g..g..', 'eeeeeeeeee', 'eaaaaaaaae', 'eeeeeeeeee'],
    rock: ['..KKK..', '.KKkkK.', 'KkkkkkK', '.kkkkk.'],
    butterfly: ['pp...pp', 'pppoppp', '.ppopp.', 'pppoppp', 'pp...pp']
}

export const DECOR_COLORS: Record<string, string> = {
    g: '#5aa84a', h: '#3f8040', a: '#dcae75', e: '#b9824c', l: '#6b4a2b', R: '#c0453b', Y: '#ffe27a', L: '#fff6c8', B: '#5aa0ff', t: '#6b4a2b', G: '#7fd06a', p: '#ff9ccf', q: '#ffd84d', w: '#ffffff', c: '#c9853b',
    r: '#e5484d', s: '#f4ecd0', K: '#c3c8d0', k: '#8a8f98', o: '#2a1c12'
}


// 무지개: 반원을 칸 단위로 끊어서 계단 모양 띠 6개로 만든다. 글자 r o y g b v가 위에서부터 바깥쪽 띠.
export const RAINBOW_W = 48
export const RAINBOW_H = 24

export function rainbowRows(): string[] {
    const bands = 'royg' + 'bv'
    return Array.from({length: RAINBOW_H}, (_, y) =>
        Array.from({length: RAINBOW_W}, (_, x) => {
            const dist = Math.hypot(x + 0.5 - RAINBOW_W / 2, y + 0.5 - RAINBOW_H)
            const band = Math.floor((RAINBOW_H - dist) / 2)
            return band >= 0 && band < bands.length ? bands[band] : '.'
        }).join('')
    )
}

export const RAINBOW_COLORS: Record<string, string> = {r: '#e5484d', o: '#ff9a3d', y: '#ffd84d', g: '#6bbf59', b: '#5aa0ff', v: '#9b6fe0'}

// 초승달: 반지름 5.4인 원에서 오른쪽 위로 비껴 놓은 원을 빼면 왼쪽이 불룩한 초승달이 된다.
export const MOON_SIZE = 12

export function moonRows(): string[] {
    const c = MOON_SIZE / 2
    return Array.from({length: MOON_SIZE}, (_, y) =>
        Array.from({length: MOON_SIZE}, (_, x) => {
            const inDisk = Math.hypot(x + 0.5 - c, y + 0.5 - c) <= 5.4
            const inBite = Math.hypot(x + 0.5 - (c + 2.7), y + 0.5 - (c - 1.2)) <= 4.6
            if (!inDisk || inBite) return '.'
            return Math.hypot(x + 0.5 - c, y + 0.5 - c) > 4.2 ? 'n' : 'm' // 바깥쪽 가장자리는 한 톤 어둡게
        }).join('')
    )
}

export const MOON_COLORS: Record<string, string> = {m: '#f6f2d2', n: '#d9d3a0'}
