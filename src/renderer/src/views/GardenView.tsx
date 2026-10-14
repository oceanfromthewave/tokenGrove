import PetSprite from '../components/PetSprite'
import {SPECIES, STAGES, formatXp, stageOf, xpToNextLevel} from '../../../shared/growth'
import {useGame, useStatus} from '../usePet'

function GardenView(): React.JSX.Element {
    const {pet, collection} = useGame()
    const status = useStatus()
    const stage = stageOf(pet.level)
    const need = xpToNextLevel(pet.level)

    return (
        <div className="garden">
            <h1>Token Grove</h1>
            <div className="garden-pet">
                <PetSprite stage={stage.id} species={pet.species} scale={12}/>
            </div>
            <div className="garden-name">{stage.name} · Lv.{pet.level}</div>
            <div className="bar" title={`${formatXp(pet.xp)}/${need} XP`}>
                <div className="bar-fill" style={{width: `${(pet.xp / need) * 100}%`}}/>
            </div>
            <div className="bar-label">{formatXp(pet.xp)} / {need} XP</div>
            <div className="bar-label">
                {status.lastCheckedAt === null
                    ? '로그 확인 전'
                    : `마지막 확인 ${new Date(status.lastCheckedAt).toLocaleTimeString()} · 이번 실행 +${formatXp(status.gainedXp)} XP`}
            </div>

            <h2>도감 {new Set(collection.map((c) => c.species)).size}/{SPECIES.length}</h2>
            {collection.length === 0 ? (
                <p className="empty">아직 완성한 식물이 없어요. 열매를 맺으면 이곳에 심어져요.</p>
            ) : (
                <div className="collection">
                    {collection.map((c, i) => (
                        <div key={i} title={new Date(c.completedAt).toLocaleDateString()}>
                            <PetSprite stage="fruit" species={c.species} scale={3}/>
                            <span>{SPECIES.find((s) => s.id === c.species)?.name}</span>
                        </div>
                    ))}
                </div>
            )}

            <h2>성장 기록</h2>
            <ul className="stages">
                {STAGES.map((s) => (
                    <li key={s.id} className={pet.level >= s.minLevel ? 'done' : 'locked'}>
                        {s.name} <span>{pet.level >= s.minLevel ? '달성' : `Lv.${s.minLevel}에 해금`}</span>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default GardenView
