import {formatXp, stageOf, type PetState} from './growth.ts'

// 펫을 클릭했을 때 하는 말. 지금 상태(단계, 오늘 사용량, 연속 사용일, 시간대)에 맞는 말 중에서 고른다.
export interface ChatterContext {
    pet: PetState
    todayXp: number
    streak: number
    hour: number // 0~23
}

const BY_STAGE: Record<string, string> = {
    seed: '아직 씨앗이에요. 천천히 기다려 줘요',
    tiny: '살짝 싹이 텄어요!',
    sprout: '쑥쑥 자라는 중이에요',
    young: '잎이 늘어나고 있어요',
    leafy: '잎이 무성해졌어요',
    bud: '곧 꽃이 필 것 같아요',
    bloom: '꽃이 폈어요!',
    full: '꽃이 활짝 만개했어요',
    fruit: '열매가 달렸어요',
    tree: '이제 어엿한 큰 나무예요'
}

export function chatterLines(ctx: ChatterContext): string[] {
    const lines = [BY_STAGE[stageOf(ctx.pet.level).id] ?? '안녕하세요!']
    lines.push(ctx.todayXp > 0 ? `오늘 ${formatXp(ctx.todayXp)} XP를 모았어요` : '오늘은 아직 조용하네요')
    if (ctx.streak >= 2) lines.push(`${ctx.streak}일 연속이에요!`)
    if (ctx.hour >= 22 || ctx.hour < 5) lines.push('늦었어요, 쉬엄쉬엄 해요')
    else if (ctx.hour < 10) lines.push('좋은 아침이에요')
    return lines
}

// rand는 테스트에서 고정하려고 바꿀 수 있다. (0 이상 1 미만)
export function pickChatter(ctx: ChatterContext, rand: () => number = Math.random): string {
    const lines = chatterLines(ctx)
    return lines[Math.min(Math.floor(rand() * lines.length), lines.length - 1)]
}
