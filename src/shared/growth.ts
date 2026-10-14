// 성장 규칙은 이 파일에서만 관리한다. (UI에 계산식을 두지 않기)

// 식물 종. 새 씨앗이 시작될 때 무작위로 정해진다.
export const SPECIES = [
    {id: 'daisy', name: '데이지'},
    {id: 'sunflower', name: '해바라기'},
    {id: 'tulip', name: '튤립'},
    {id: 'bellflower', name: '도라지'},
    {id: 'rose', name: '장미'},
    {id: 'lavender', name: '라벤더'},
    {id: 'hydrangea', name: '수국'},
    {id: 'poppy', name: '양귀비'},
    {id: 'cosmos', name: '코스모스'},
    {id: 'cherry', name: '벚꽃'}
] as const

export type SpeciesId = (typeof SPECIES)[number]['id']

export const isSpeciesId = (v: unknown): v is SpeciesId => SPECIES.some((s) => s.id === v)

export type StageId = (typeof STAGES)[number]['id']

export interface GrowthMark {
    stage: StageId
    at: string
    kind?: 'start' | 'stage'
}

export interface PetState {
    level: number
    xp: number // 현재 레벨에서 쌓인 경험치
    species: SpeciesId
    name?: string
    growthHistory?: GrowthMark[]
}

export const INITIAL_PET: PetState = {level: 1, xp: 0, species: 'daisy'}

// 완성되어 정원에 보관된 식물
export interface Completed {
    species: SpeciesId
    completedAt: string // ISO 시각
    name?: string
    growthHistory?: GrowthMark[]
}

// 이 레벨에 도달하면 완성된 것으로 보고 정원에 보관한 뒤 새 씨앗을 시작한다.
export const HARVEST_LEVEL = 11

// 새 씨앗. rand는 테스트에서 값을 고정하려고 바꿀 수 있다.
export function newSeed(rand: () => number = Math.random): PetState {
    const i = Math.min(Math.floor(rand() * SPECIES.length), SPECIES.length - 1)
    return {level: 1, xp: 0, species: SPECIES[i].id}
}

// 완성 조건을 넘었으면 정원에 보관하고 새 씨앗으로 바꾼다. 아니면 그대로 돌려준다.
// ponytail: 완성 순간 넘친 경험치는 버린다. 한 번에 수천 xp가 들어오는 일은 드물어서 이월은 생략.
export function harvestIfReady(
    pet: PetState,
    collection: Completed[],
    now: string,
    rand: () => number = Math.random
): { pet: PetState; collection: Completed[] } {
    if (pet.level < HARVEST_LEVEL) return {pet, collection}
    const completed: Completed = {
        species: pet.species,
        completedAt: now,
        ...(pet.name ? {name: pet.name} : {}),
        ...(pet.growthHistory ? {growthHistory: pet.growthHistory} : {})
    }
    return {pet: newSeed(rand), collection: [...collection, completed]}
}

// 화면 표시용. 소수 첫째 자리까지 버림으로 보여준다. (경험치는 소수로 쌓이므로 정수만 보이면 오르는 게 안 보인다)
export const formatXp = (xp: number): string => (Math.floor(xp * 10) / 10).toFixed(1)

// 다음 레벨까지 필요한 경험치. 레벨 1은 100, 레벨 2는 150, ...
export function xpToNextLevel(level: number): number {
    return 50 + level * 50
}

// 경험치를 더하고, 기준을 넘으면 레벨업한다. 원본 state는 바꾸지 않는다.
export function addXp(state: PetState, amount: number): PetState {
    if (!(amount > 0)) return state // 0 이하, NaN은 무시

    let {level, xp} = state
    xp += amount
    while (xp >= xpToNextLevel(level)) {
        xp -= xpToNextLevel(level)
        level += 1
    }
    return {...state, level, xp}
}

// 성장 단계. 레벨이 minLevel 이상이면 해당 단계. minLevel 오름차순으로 유지할 것.
export const STAGES = [
    {id: 'seed', name: '씨앗', minLevel: 1},
    {id: 'tiny', name: '싹', minLevel: 2},
    {id: 'sprout', name: '새싹', minLevel: 3},
    {id: 'young', name: '어린 잎', minLevel: 4},
    {id: 'leafy', name: '무성한 잎', minLevel: 5},
    {id: 'bud', name: '꽃봉오리', minLevel: 6},
    {id: 'bloom', name: '첫 꽃', minLevel: 7},
    {id: 'full', name: '만개', minLevel: 8},
    {id: 'fruit', name: '열매', minLevel: 9},
    {id: 'tree', name: '큰 나무', minLevel: 10}
] as const

export const isStageId = (v: unknown): v is StageId => STAGES.some((s) => s.id === v)

export function stageOf(level: number): (typeof STAGES)[number] {
    return STAGES.findLast((s) => level >= s.minLevel) ?? STAGES[0]
}
