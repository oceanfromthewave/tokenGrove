import {SPECIES, formatXp, stageOf, type PetState, type SpeciesId} from './growth.ts'
import {tr} from './i18n.ts'

// 펫을 클릭했을 때 하는 말. 지금 상태(단계, 종, 오늘 사용량, 연속 사용일, 시간대, 요일)에 맞는 말 중에서 고른다.
export interface ChatterContext {
    pet: PetState
    todayXp: number
    streak: number
    hour: number // 0~23
    weekday?: number // 0(일)~6(토). 없으면 요일 말은 하지 않는다.
}

// 단계마다 몇 가지씩. 씨앗~어린 잎 단계에는 어떤 종인지 알 수 있는 말을 하지 않는다. (싹이 틀 때까지 비밀)
const BY_STAGE: Record<string, string[]> = {
    seed: ['아직 씨앗이에요. 천천히 기다려 줘요', '흙 속은 따뜻하고 조용해요', '무엇이 될지는 비밀이에요'],
    tiny: ['살짝 싹이 텄어요!', '세상은 처음 보는 것투성이에요', '조금만 더 자랄게요'],
    sprout: ['쑥쑥 자라는 중이에요', '잎이 하나둘 늘고 있어요', '햇빛이 참 좋아요'],
    young: ['잎이 늘어나고 있어요', '키가 부쩍 컸죠?', '뿌리도 튼튼해지고 있어요'],
    leafy: ['잎이 무성해졌어요', '바람에 잎이 살랑거려요', '이제 꽃봉오리만 맺으면 돼요'],
    bud: ['곧 꽃이 필 것 같아요', '봉오리가 간질간질해요', '두근두근, 꽃이 필 시간이에요'],
    bloom: ['꽃이 폈어요!', '향기가 나나요?', '나비가 놀러 올지도 몰라요'],
    full: ['꽃이 활짝 만개했어요', '지금이 제일 예쁠 때예요', '사진 한 장 남겨 줄래요?'],
    fruit: ['열매가 달렸어요', '열매가 조금씩 익고 있어요', '곧 큰 나무가 될 거예요'],
    tree: ['이제 어엿한 큰 나무예요', '곧 정원에 심어질 시간이에요', '그동안 고마웠어요, 곧 새 친구가 와요']
}

// 꽃이 핀 뒤(레벨 7 이상)에만 하는, 종마다의 말
const BY_SPECIES: Record<SpeciesId, string> = {
    daisy: '하얀 꽃잎이 햇살을 닮았죠?',
    sunflower: '해를 따라 고개를 돌려요',
    tulip: '빨간 컵에 햇살을 담고 있어요',
    bellflower: '보라색 별이 반짝여요',
    rose: '가시가 있어도 마음은 다정해요',
    lavender: '좋은 향기가 나는 것 같아요',
    hydrangea: '푸른 구름 같은 꽃이에요',
    poppy: '주황빛 꽃이 바람에 흔들려요',
    cosmos: '하늘하늘 흔들리는 게 좋아요',
    cherry: '꽃잎이 흩날릴 날을 기다려요'
}

const WEEKDAY_LINE: Record<number, string> = {
    0: '일요일이에요. 오늘은 쉬엄쉬엄!',
    1: '새로운 한 주의 시작이에요',
    5: '불금이에요, 조금만 더 힘내요',
    6: '주말에도 와 줘서 고마워요'
}

export function chatterLines(ctx: ChatterContext): string[] {
    const stage = stageOf(ctx.pet.level)
    const lines = [...(BY_STAGE[stage.id] ?? ['안녕하세요!']).map((l) => tr(l))]

    // 오늘 사용량
    if (ctx.todayXp <= 0) lines.push(tr('오늘은 아직 조용하네요'), tr('오늘도 함께 힘내 봐요'))
    else if (ctx.todayXp >= 100) lines.push(tr('오늘 {xp} XP나 모았어요, 대단해요!', {xp: formatXp(ctx.todayXp)}), tr('오늘 정말 열심히 하고 있네요'))
    else lines.push(tr('오늘 {xp} XP를 모았어요', {xp: formatXp(ctx.todayXp)}))

    // 연속 사용일
    if (ctx.streak >= 30) lines.push(tr('{n}일째 함께예요. 벌써 한 달이 넘었어요!', {n: ctx.streak}))
    else if (ctx.streak >= 7) lines.push(tr('{n}일 연속이에요, 일주일이 넘었어요!', {n: ctx.streak}))
    else if (ctx.streak >= 2) lines.push(tr('{n}일 연속이에요!', {n: ctx.streak}))

    // 시간대
    if (ctx.hour >= 22 || ctx.hour < 5) lines.push(tr('늦었어요, 쉬엄쉬엄 해요'), tr('별이 떴어요. 오늘도 수고했어요'))
    else if (ctx.hour < 10) lines.push(tr('좋은 아침이에요'), tr('아침 햇살이 좋네요'))
    else if (ctx.hour >= 12 && ctx.hour < 14) lines.push(tr('점심은 드셨어요?'))
    else if (ctx.hour >= 18 && ctx.hour < 22) lines.push(tr('저녁 노을이 예뻐요'), tr('오늘 하루도 고생했어요'))

    // 요일, 종 (조건에 맞을 때만)
    if (ctx.weekday !== undefined && WEEKDAY_LINE[ctx.weekday]) lines.push(tr(WEEKDAY_LINE[ctx.weekday]))
    if (ctx.pet.level >= 7 && SPECIES.some((s) => s.id === ctx.pet.species)) lines.push(tr(BY_SPECIES[ctx.pet.species]))

    // 이름을 붙여 줬다면 이름을 부른다
    if (ctx.pet.name) lines.push(tr('저를 "{name}"(이)라고 불러 줘서 고마워요', {name: ctx.pet.name}), tr('{name}, 오늘도 잘 자라고 있어요', {name: ctx.pet.name}))

    // 아무 때나 해도 어울리는 말
    lines.push(tr('쓰다듬어 줘서 고마워요'), tr('물은 충분해요!'))
    return lines
}

// rand는 테스트에서 고정하려고 바꿀 수 있다. (0 이상 1 미만)
export function pickChatter(ctx: ChatterContext, rand: () => number = Math.random): string {
    const lines = chatterLines(ctx)
    return lines[Math.min(Math.floor(rand() * lines.length), lines.length - 1)]
}

// 첫 실행 때 펫이 차례로 하는 안내. 도구를 하나도 못 찾았으면 마지막에 알려 준다.
export function onboardingLines(tools: { claude: number; codex: number }): string[] {
    const lines = [
        tr('안녕하세요! 저는 씨앗이에요'),
        tr('Claude Code나 Codex를 쓰면 쑥쑥 자라요'),
        tr('클릭하면 말을 걸 수 있어요. 우클릭은 메뉴예요'),
        tr('정원 버튼에서 도감과 기록을 볼 수 있어요')
    ]
    if (tools.claude + tools.codex === 0) lines.push(tr('아직 Claude Code나 Codex 기록을 못 찾았어요. 쓰기 시작하면 자라요!'))
    return lines
}
