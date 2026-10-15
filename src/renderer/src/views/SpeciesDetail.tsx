import {useState} from 'react'
import PetSprite from '../components/PetSprite'
import {tr} from '../../../shared/i18n'
import {SPECIES, STAGES, type Completed, type SpeciesId} from '../../../shared/growth'

// 도감에서 고른 종의 상세. 슬라이더로 씨앗부터 큰 나무까지 성장 과정을 넘겨볼 수 있다.
function SpeciesDetail({species, count, lastAt, plants}: {
    species: SpeciesId
    count: number
    lastAt: string
    plants: Completed[]
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
                aria-label={tr('성장 단계')}
            />
            <div className="detail-meta">
                {tr('{count}번 완성 · 마지막 {date}', {count, date: new Date(lastAt).toLocaleDateString()})}
            </div>
            <h3>{tr('완성한 식물 기록')}</h3>
            <div className="plant-records">
                {[...plants].reverse().map((plant, i) => (
                    <details key={`${plant.completedAt}-${i}`}>
                        <summary>{plant.name || `${name} ${plants.length - i}`} · {new Date(plant.completedAt).toLocaleDateString()}</summary>
                        {plant.growthHistory?.length ? (
                            <ol className="timeline compact">
                                {plant.growthHistory.map((mark, j) => {
                                    const reached = STAGES.find((s) => s.id === mark.stage)
                                    return (
                                        <li key={`${mark.at}-${mark.stage}-${j}`}>
                                            <b>{reached?.name ?? mark.stage}</b>
                                            <time>{mark.kind === 'start' ? tr('기록 시작 · ') : ''}{new Date(mark.at).toLocaleString()}</time>
                                        </li>
                                    )
                                })}
                            </ol>
                        ) : <small>{tr('이 식물의 성장 기록은 없어요.')}</small>}
                    </details>
                ))}
            </div>
        </div>
    )
}

export default SpeciesDetail
