// 정원 풍경을 꾸미는 작은 도트 그림. '.' = 투명. 식물과 같은 방식(글자 격자 + 색 표)이다.
export type DecorId = 'tuft' | 'flowerPink' | 'flowerYellow' | 'flowerWhite' | 'mushroom' | 'rock' | 'stone' | 'bush' | 'pine' | 'bee' | 'bird' | 'butterfly'

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
    rock: ['..KKK..', '.KKkkK.', 'KkkkkkK', '.kkkkk.'],
    butterfly: ['pp...pp', 'pppoppp', '.ppopp.', 'pppoppp', 'pp...pp']
}

export const DECOR_COLORS: Record<string, string> = {
    g: '#5aa84a', h: '#3f8040', B: '#5aa0ff', t: '#6b4a2b', G: '#7fd06a', p: '#ff9ccf', q: '#ffd84d', w: '#ffffff', c: '#c9853b',
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
