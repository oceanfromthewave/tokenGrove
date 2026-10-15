// 식물을 완성한 횟수에 따라 정원에 소품이 하나씩 생긴다. 소품은 작고 풍경 속에 자연스럽게 놓인다.
import {tr} from './i18n.ts'
export type UnlockId = 'birdhouse' | 'lantern' | 'signpost' | 'flowerbed'

export interface Unlock {
    id: UnlockId
    name: string
    need: number // 필요한 완성 횟수
}

export const UNLOCKS: Unlock[] = [
    {id: 'birdhouse', get name() { return tr('새집') }, need: 1},
    {id: 'lantern', get name() { return tr('등불') }, need: 3},
    {id: 'signpost', get name() { return tr('푯말') }, need: 5},
    {id: 'flowerbed', get name() { return tr('화단') }, need: 8}
]

// 완성 횟수에 맞게 해금된 소품
export const unlockedItems = (completed: number): Unlock[] => UNLOCKS.filter((u) => completed >= u.need)

// 다음에 해금될 소품과 남은 횟수. 모두 해금했으면 null.
export function nextUnlock(completed: number): { item: Unlock; remaining: number } | null {
    const item = UNLOCKS.find((u) => completed < u.need)
    return item ? {item, remaining: item.need - Math.max(0, Math.floor(completed))} : null
}
