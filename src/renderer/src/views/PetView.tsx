import {useEffect, useRef, useState} from 'react'
import PetSprite from '../components/PetSprite'
import {formatXp, stageOf, xpToNextLevel} from '../../../shared/growth'
import {petEvent, type PetEvent} from '../../../shared/events'
import {useGame} from '../usePet'

interface Burst {
    id: number
    kind: PetEvent
    gain: number // 경험치 증가량 (xp 효과에만 사용)
}

// 레벨업/성장 때 사방으로 튀는 반짝이 8개의 이동 방향
const SPARKS = Array.from({length: 8}, (_, i) => {
    const a = (i * Math.PI) / 4
    return {dx: Math.round(Math.cos(a) * 56), dy: Math.round(Math.sin(a) * 56)}
})

function PetView(): React.JSX.Element {
    const {pet, loaded} = useGame()
    const stage = stageOf(pet.level)
    const drag = useRef<{ x: number; y: number } | null>(null) // 끌기 시작 시 마우스 화면 좌표
    const prev = useRef<typeof pet | null>(null)
    const [burst, setBurst] = useState<Burst | null>(null)

    // 상태가 바뀌면 어떤 효과를 보여줄지 정한다. 처음 받아온 상태는 비교 대상이 없어서 효과 없음.
    useEffect(() => {
        if (!loaded) return
        const before = prev.current
        prev.current = pet
        const kind = before ? petEvent(before, pet) : null
        if (before && kind) setBurst({id: Date.now(), kind, gain: pet.xp - before.xp})
    }, [pet, loaded])

    useEffect(() => {
        if (!burst) return
        const t = setTimeout(() => setBurst(null), 1900)
        return () => clearTimeout(t)
    }, [burst])

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
            onPointerUp={() => {
                if (!drag.current) return
                drag.current = null
                window.api.dragEnd()
            }}
        >
            <div className="stage-box">
                <div key={big ? burst.id : 'still'} className={`sprite${big ? ' pop' : ''}`}>
                    <div className="idle">
                        <PetSprite stage={stage.id} species={pet.species}/>
                    </div>
                </div>
                {big && SPARKS.map((s, i) => (
                    <i key={`${burst.id}-${i}`} className="spark" style={{'--dx': `${s.dx}px`, '--dy': `${s.dy}px`} as React.CSSProperties}/>
                ))}
                {big && (
                    <div key={`b${burst.id}`} className="banner">
                        {burst.kind === 'newSeed' ? '새 씨앗!' : burst.kind === 'stage' ? `${stage.name}!` : 'LEVEL UP!'}
                    </div>
                )}
                {burst?.kind === 'xp' && <div key={`g${burst.id}`} className="gain">+{formatXp(burst.gain)}</div>}
            </div>
            <div className="status">
                {stage.name} Lv.{pet.level} · {formatXp(pet.xp)}/{xpToNextLevel(pet.level)} XP
            </div>
            <div className="row">
                <button className="test-btn" onClick={() => window.api.addTestXp()}>+XP</button>
                <button className="test-btn" onClick={() => window.api.openGarden()}>정원</button>
            </div>
        </div>
    )
}

export default PetView
