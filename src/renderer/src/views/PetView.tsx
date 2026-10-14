import {useRef} from 'react'
import PetSprite from '../components/PetSprite'
import {formatXp, stageOf, xpToNextLevel} from '../../../shared/growth'
import {useGame} from '../usePet'

function PetView(): React.JSX.Element {
    const {pet} = useGame()
    const stage = stageOf(pet.level)
    const drag = useRef<{ x: number; y: number } | null>(null) // 끌기 시작 시 마우스 화면 좌표

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
            <PetSprite stage={stage.id} species={pet.species}/>
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
