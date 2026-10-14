// 정원 풍경을 꾸미는 작은 도트 그림. '.' = 투명. 식물과 같은 방식(글자 격자 + 색 표)이다.
export type DecorId = 'tuft' | 'flowerPink' | 'flowerYellow' | 'flowerWhite' | 'mushroom' | 'rock' | 'stone' | 'bush' | 'pine' | 'butterfly'

export const DECOR: Record<DecorId, string[]> = {
    tuft: ['.g..g.', 'g.gg.g', 'gGgGgg', '.gggg.'],
    flowerPink: ['.ppp.', '.pcp.', '.ppp.', '..g..', '.gGg.'],
    flowerYellow: ['.qqq.', '.qcq.', '.qqq.', '..g..', '.gGg.'],
    flowerWhite: ['.www.', '.wcw.', '.www.', '..g..', '.gGg.'],
    stone: ['.KKKKK.', 'KKkkkKK', '.kkkkk.'],
    bush: ['..hGGh..', '.hGGGGh.', 'hGGgGGGh', 'hGGGGgGh', '.hhhhhh.'],
    mushroom: ['.rrrr.', 'rwrrwr', '.rrrr.', '..ss..', '..ss..'],
    pine: ['...h...', '..hhh..', '..hGh..', '.hhhhh.', '.hhGhh.', 'hhhhhhh', '...t...', '...t...'],
    rock: ['..KKK..', '.KKkkK.', 'KkkkkkK', '.kkkkk.'],
    butterfly: ['pp...pp', 'pppoppp', '.ppopp.', 'pppoppp', 'pp...pp']
}

export const DECOR_COLORS: Record<string, string> = {
    g: '#5aa84a', h: '#3f8040', t: '#6b4a2b', G: '#7fd06a', p: '#ff9ccf', q: '#ffd84d', w: '#ffffff', c: '#c9853b',
    r: '#e5484d', s: '#f4ecd0', K: '#c3c8d0', k: '#8a8f98', o: '#2a1c12'
}

