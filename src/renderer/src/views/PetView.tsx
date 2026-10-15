import {useEffect, useRef, useState} from 'react'
import PetSprite from '../components/PetSprite'
import {tr} from '../../../shared/i18n'
import PixelArt from '../components/PixelArt'
import {formatXp, hasGoldPot, stageOf, xpToNextLevel} from '../../../shared/growth'
import {onboardingLines, pickChatter} from '../../../shared/chatter'
import {petEvent, type PetEvent} from '../../../shared/events'
import {crossedGoal, currentStreak, dateKey} from '../../../shared/stats'
import {useGame, useSettings, useStatus} from '../usePet'

interface Burst {
    id: number
    kind: PetEvent | 'goal' // goal = 오늘 목표 달성
    gain: number // 경험치 증가량 (xp 효과에만 사용)
}

// 클릭했을 때 떠오르는 하트
const HEART = ['.r.r.', 'rrrrr', 'rrrrr', '.rrr.', '..r..']
const HEART_COLORS = {r: '#ff6b8a'}

// 버튼 안의 작은 도트 아이콘
const SPARKLE = ['...y...', '...y...', '..yyy..', 'yyyyyyy', '..yyy..', '...y...', '...y...']
const SPROUT = ['..g.g..', '.ggggg.', '..ggg..', '...t...', '...t...', '.mmmmm.']
const ICON_COLORS = {y: '#fff1a8', g: '#b8f08f', t: '#e0bb85', m: '#c9a06a'}

// 레벨업/성장 때 사방으로 튀는 반짝이 8개의 이동 방향
const SPARKS = Array.from({length: 8}, (_, i) => {
    const a = (i * Math.PI) / 4
    return {dx: Math.round(Math.cos(a) * 56), dy: Math.round(Math.sin(a) * 56)}
})

function PetView(): React.JSX.Element {
    const {pet, stats, collection, onboarded, loaded} = useGame()
    const status = useStatus()
    const [settings] = useSettings()
    const gold = hasGoldPot(collection)
    const todayXp = stats.daily[dateKey(new Date())] ?? 0
    const prevToday = useRef<number | null>(null)
    const introLines = useRef<string[]>([])
    const introDone = useRef(false)
    const [introStep, setIntroStep] = useState<number | null>(null) // 첫 실행 안내 중인 줄 번호
    const stage = stageOf(pet.level)
    const drag = useRef<{ x: number; y: number } | null>(null) // 끌기 시작 시 마우스 화면 좌표
    const prev = useRef<typeof pet | null>(null)
    const [burst, setBurst] = useState<Burst | null>(null)
    const [chat, setChat] = useState<{ id: number; text: string } | null>(null) // 클릭했을 때의 말풍선

    // 상태가 바뀌면 어떤 효과를 보여줄지 정한다. 처음 받아온 상태는 비교 대상이 없어서 효과 없음.
    useEffect(() => {
        if (!loaded) return
        const before = prev.current
        prev.current = pet
        const kind = before ? petEvent(before, pet) : null
        if (before && kind) setBurst({id: Date.now(), kind, gain: pet.xp - before.xp})
    }, [pet, loaded])

    // 오늘 경험치가 하루 목표를 넘는 순간에 축하한다. (처음 받아온 값은 비교 대상이 없어 무시)
    useEffect(() => {
        if (!loaded) return
        const before = prevToday.current
        prevToday.current = todayXp
        if (before !== null && crossedGoal(before, todayXp, settings.dailyGoal)) setBurst({id: Date.now(), kind: 'goal', gain: 0})
    }, [todayXp, loaded, settings.dailyGoal])

    // 첫 실행이면 첫 로그 확인이 끝난 뒤(도구를 찾았는지 알 수 있을 때) 펫이 차례로 안내한다.
    useEffect(() => {
        if (!loaded || onboarded || introDone.current || introStep !== null || status.lastCheckedAt === null) return
        introLines.current = onboardingLines(status.tools)
        setIntroStep(0)
    }, [loaded, onboarded, introStep, status.lastCheckedAt, status.tools])

    useEffect(() => {
        if (introStep === null) return
        const t = setTimeout(() => {
            if (introStep + 1 >= introLines.current.length) {
                introDone.current = true
                setIntroStep(null)
                void window.api.markOnboarded()
            } else {
                setIntroStep(introStep + 1)
            }
        }, 3800)
        return () => clearTimeout(t)
    }, [introStep])

    useEffect(() => {
        if (!burst) return
        const t = setTimeout(() => setBurst(null), 1900)
        return () => clearTimeout(t)
    }, [burst])

    useEffect(() => {
        if (!chat) return
        const t = setTimeout(() => setChat(null), 2800)
        return () => clearTimeout(t)
    }, [chat])

    const big = burst !== null && burst.kind !== 'xp' // 레벨업, 성장, 새 씨앗

    return (
        <div
            className="pet"
            onPointerDown={(e) => {
                if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return
                e.currentTarget.setPointerCapture(e.pointerId)
                drag.current = {x: e.screenX, y: e.screenY}
                window.api.dragStart()
            }}
            onPointerMove={(e) => {
                if (drag.current) window.api.dragMove(e.screenX - drag.current.x, e.screenY - drag.current.y)
            }}
            onPointerUp={(e) => {
                const start = drag.current
                if (!start) return
                drag.current = null
                window.api.dragEnd()
                // 거의 움직이지 않았으면 끌기가 아니라 클릭이다. 말을 건다.
                if (Math.hypot(e.screenX - start.x, e.screenY - start.y) < 5) {
                    const now = new Date()
                    const todayXp = stats.daily[dateKey(now)] ?? 0
                    setChat({id: Date.now(), text: pickChatter({pet, todayXp, streak: currentStreak(stats, now), hour: now.getHours(), weekday: now.getDay()})})
                }
            }}
        >
            <div className="stage-box">
                <div key={big ? burst.id : 'still'} className={`sprite${big ? ' pop' : ''}`}>
                    <div className="idle">
                        <PetSprite stage={stage.id} species={pet.species} gold={gold}/>
                    </div>
                </div>
                {big && SPARKS.map((s, i) => (
                    <i key={`${burst.id}-${i}`} className="spark" style={{'--dx': `${s.dx}px`, '--dy': `${s.dy}px`} as React.CSSProperties}/>
                ))}
                {big && (
                    <div key={`b${burst.id}`} className="banner">
                        {burst.kind === 'goal' ? tr('오늘 목표 달성!') : burst.kind === 'newSeed' ? tr('새 씨앗!') : burst.kind === 'stage' ? `${stage.name}!` : 'LEVEL UP!'}
                    </div>
                )}
                {chat && (
                    <div key={`c${chat.id}`} className="bubble">{chat.text}</div>
                )}
                {!chat && introStep !== null && (
                    <div key={`i${introStep}`} className="bubble">{introLines.current[introStep]}</div>
                )}
                {chat && [0, 1, 2].map((i) => (
                    <span
                        key={`h${chat.id}-${i}`}
                        className="heart"
                        style={{'--hx': `${(i - 1) * 20}px`, animationDelay: `${i * 0.12}s`} as React.CSSProperties}
                    >
                        <PixelArt rows={HEART} colors={HEART_COLORS} scale={2}/>
                    </span>
                ))}
                {burst?.kind === 'xp' && <div key={`g${burst.id}`} className="gain">+{formatXp(burst.gain)}</div>}
            </div>
            <div className="plate">
                <div className="status" title={pet.name || undefined}>{pet.name ? `${pet.name} · ` : ''}{stage.name} Lv.{pet.level}</div>
                <div className="xpbar" title={`${formatXp(pet.xp)} / ${xpToNextLevel(pet.level)} XP`}>
                    <i style={{width: `${Math.min(100, (pet.xp / xpToNextLevel(pet.level)) * 100)}%`}}/>
                </div>
                <div className="xptext">{formatXp(pet.xp)} / {xpToNextLevel(pet.level)} XP</div>
            </div>
            <div className="row">
                <button className="pbtn" title={tr('경험치 테스트 (+30 XP)')} onClick={() => window.api.addTestXp()}>
                    <PixelArt rows={SPARKLE} colors={ICON_COLORS} scale={2}/>XP
                </button>
                <button className="pbtn" title={tr('정원 열기')} onClick={() => window.api.openGarden()}>
                    <PixelArt rows={SPROUT} colors={ICON_COLORS} scale={2}/>{tr('정원')}
                </button>
            </div>
        </div>
    )
}

export default PetView
