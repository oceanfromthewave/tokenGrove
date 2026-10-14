import {stageOf, type PetState} from './growth.ts'

// 펫 상태가 바뀌었을 때 화면에서 보여줄 효과의 종류.
//   newSeed: 식물을 완성해서 새 씨앗이 시작됨 / stage: 성장 단계가 바뀜(모양이 바뀜) / level: 레벨만 오름 / xp: 경험치만 오름
export type PetEvent = 'newSeed' | 'stage' | 'level' | 'xp'

// 화면에 표시되는 경험치 최소 단위(소수 첫째 자리). 이보다 작은 증가는 효과를 띄우지 않는다.
const MIN_GAIN = 0.1

export function petEvent(prev: PetState, next: PetState): PetEvent | null {
    if (next.species !== prev.species || next.level < prev.level) return 'newSeed'
    if (next.level > prev.level) return stageOf(next.level).id !== stageOf(prev.level).id ? 'stage' : 'level'
    return next.xp - prev.xp >= MIN_GAIN - 1e-9 ? 'xp' : null // 소수 계산 오차(10.1 - 10 = 0.0999...) 보정
}
