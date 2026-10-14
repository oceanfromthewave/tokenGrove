import type {SpeciesId, StageId} from '../../../shared/growth'
import {GRID, paletteOf, spriteOf} from '../../../shared/sprites'

const SCALE = 7 // 화면 확대 배율 (18칸 x 7 = 126px, 펫 창 폭 140에 맞춤)

function PetSprite({stage, species, scale = SCALE}: {
    stage: StageId
    species: SpeciesId
    scale?: number
}): React.JSX.Element {
    const palette = paletteOf(species)
    return (
        <svg
            width={GRID * scale}
            height={GRID * scale}
            viewBox={`0 0 ${GRID} ${GRID}`}
            shapeRendering="crispEdges"
        >
            {spriteOf(stage, species).flatMap((row, y) =>
                [...row].map((ch, x) =>
                    palette[ch] ? (
                        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={palette[ch]}/>
                    ) : null
                )
            )}
        </svg>
    )
}

export default PetSprite
