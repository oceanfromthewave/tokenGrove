import PetSprite from '../components/PetSprite'
import {formatXp, stageOf, xpToNextLevel} from '../../../shared/growth'
import {useGame} from '../usePet'

function PetView(): React.JSX.Element {
    const {pet} = useGame()
    const stage = stageOf(pet.level)

    return (
        <div className="pet">
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
