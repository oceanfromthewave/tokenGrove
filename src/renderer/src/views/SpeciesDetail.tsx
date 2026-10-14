import {useState} from 'react'
import PetSprite from '../components/PetSprite'
import {SPECIES, STAGES, type SpeciesId} from '../../../shared/growth'

// 도감에서 고른 종의 상세. 슬라이더로 씨앗부터 큰 나무까지 성장 과정을 넘겨볼 수 있다.
function SpeciesDetail({species, count, lastAt}: {
    species: SpeciesId
    count: number
    lastAt: string
}): React.JSX.Element {
    const [step, setStep] = useState(STAGES.length - 1)
    const stage = STAGES[step]
    const name = SPECIES.find((s) => s.id === species)?.name

    return (
        <div className="detail">
            <PetSprite stage={stage.id} species={species} scale={8}/>
            <div className="detail-name">{name}</div>
            <div className="detail-stage">{step + 1}/{STAGES.length} · {stage.name}</div>
            <input
                type="range"
                min={0}
                max={STAGES.length - 1}
                value={step}
                onChange={(e) => setStep(Number(e.target.value))}
                aria-label="성장 단계"
            />
            <div className="detail-meta">
                {count}번 완성 · 마지막 {new Date(lastAt).toLocaleDateString()}
            </div>
        </div>
    )
}

export default SpeciesDetail
