import type {Completed, PetState} from './growth.ts'
import {SPECIES} from './growth.ts'
import type {Stats} from './stats.ts'

export interface Achievement {
    id: string
    name: string
    desc: string
}

export const ACHIEVEMENTS: Achievement[] = [
    {id: 'first', name: '첫 열매', desc: '식물을 처음 완성했어요'},
    {id: 'five', name: '정원사', desc: '서로 다른 5종을 완성했어요'},
    {id: 'all', name: '식물 박사', desc: '모든 종을 완성했어요'},
    {id: 'tree', name: '큰 나무', desc: '식물을 큰 나무 단계까지 키웠어요'},
    {id: 'xp1k', name: '새싹 토큰러', desc: '누적 1,000 XP'},
    {id: 'xp10k', name: '숲의 주민', desc: '누적 10,000 XP'},
    {id: 'xp100k', name: '숲의 주인', desc: '누적 100,000 XP'},
    {id: 'streak3', name: '사흘 연속', desc: '3일 연속 사용'},
    {id: 'streak7', name: '일주일 연속', desc: '7일 연속 사용'},
    {id: 'streak30', name: '한 달 연속', desc: '30일 연속 사용'}
]

// 달성한 업적 id 집합. 따로 저장하지 않고 저장된 데이터에서 매번 계산한다.
export function achieved(pet: PetState, collection: Completed[], stats: Stats): Set<string> {
    const kinds = new Set(collection.map((c) => c.species)).size
    const checks: Record<string, boolean> = {
        first: collection.length >= 1,
        five: kinds >= 5,
        all: kinds >= SPECIES.length,
        tree: pet.level >= 10 || collection.length >= 1,
        xp1k: stats.totalXp >= 1_000,
        xp10k: stats.totalXp >= 10_000,
        xp100k: stats.totalXp >= 100_000,
        streak3: stats.bestStreak >= 3,
        streak7: stats.bestStreak >= 7,
        streak30: stats.bestStreak >= 30
    }
    return new Set(ACHIEVEMENTS.filter((a) => checks[a.id]).map((a) => a.id))
}
