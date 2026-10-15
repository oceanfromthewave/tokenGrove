import {useEffect, useRef, useState} from 'react'
import PetSprite from '../components/PetSprite'
import PixelArt from '../components/PixelArt'
import {DECOR, DECOR_COLORS, MOON_COLORS, RAINBOW_COLORS, moonRows, rainbowRows, type DecorId} from '../../../shared/decor'
import {RARITY, hasGoldPot, SPECIES, STAGES, formatXp, stageOf, xpToNextLevel, type SpeciesId} from '../../../shared/growth'
import {ACHIEVEMENTS, achieved} from '../../../shared/achievements'
import {avgDaily, currentStreak, dateKey, etaDays, weatherOf, type Weather} from '../../../shared/stats'
import {useGame, useSettings, useStatus} from '../usePet'
import {UNLOCKS, nextUnlock, unlockedItems} from '../../../shared/unlocks'
import SettingsPanel from './SettingsPanel'
import UsageChart from './UsageChart'
import SpeciesDetail from './SpeciesDetail'

// 칸 단위로 만든 무지개 (한 번만 계산)
const RAINBOW = rainbowRows()
const MOON = moonRows()

// 오늘 사용량에 따른 정원 날씨 이름
const WEATHER_NAME: Record<Weather, string> = {overcast: '흐림', cloudy: '구름 조금', sunny: '맑음', rainbow: '무지개'}

// 밤에 날아다니는 반딧불이: [가로 %, 세로 px, 움직임 지연 초]
const FIREFLIES: [number, number, number][] = [[10, 190, 0], [24, 230, 2], [38, 200, 4], [55, 240, 1], [68, 205, 5], [80, 235, 3], [90, 195, 6]]

// 시간대에 따라 하늘이 바뀐다. (6~18시 낮, 18~20시 노을, 그 외 밤)
const timeOfDay = (hour: number): 'day' | 'dusk' | 'night' =>
    hour >= 6 && hour < 18 ? 'day' : hour >= 18 && hour < 20 ? 'dusk' : 'night'

// 언덕 위 소나무 (울타리 뒤, 언덕 능선을 따라)
const PINES: { x: number; y: number; scale: number }[] = [
    {x: 3, y: 124, scale: 3}, {x: 9, y: 132, scale: 4}, {x: 15, y: 122, scale: 3}, {x: 24, y: 118, scale: 3},
    {x: 70, y: 120, scale: 3}, {x: 77, y: 128, scale: 4}, {x: 84, y: 121, scale: 3}, {x: 92, y: 126, scale: 4}
]

// 해금되는 소품의 위치. x는 가로 %, y는 바닥에서의 높이(px). 밤에는 등불이 빛난다.
const UNLOCK_SPOTS: Record<string, { x: number; y: number; scale: number }> = {
    birdhouse: {x: 27, y: 100, scale: 3},
    lantern: {x: 63, y: 18, scale: 3},
    signpost: {x: 80, y: 12, scale: 3},
    flowerbed: {x: 9, y: 6, scale: 3}
}

// 잔디 위 장식. x는 가로 위치(%), y는 바닥에서의 높이(px)
const DECOR_SPOTS: { art: DecorId; x: number; y: number; scale?: number }[] = [
    {art: 'bush', x: -2, y: 62, scale: 5}, {art: 'bush', x: 90, y: 66, scale: 5},
    {art: 'tuft', x: 4, y: 40}, {art: 'flowerPink', x: 8, y: 22}, {art: 'flowerWhite', x: 14, y: 8}, {art: 'tuft', x: 20, y: 18},
    {art: 'flowerYellow', x: 24, y: 36}, {art: 'mushroom', x: 28, y: 10},
    {art: 'tuft', x: 33, y: 30}, {art: 'flowerPink', x: 36, y: 6}, {art: 'stone', x: 41, y: 22, scale: 4}, {art: 'stone', x: 47, y: 12, scale: 4},
    {art: 'stone', x: 54, y: 3, scale: 4}, {art: 'tuft', x: 62, y: 34}, {art: 'rock', x: 66, y: 12},
    {art: 'flowerYellow', x: 71, y: 5}, {art: 'flowerWhite', x: 74, y: 30}, {art: 'tuft', x: 79, y: 14},
    {art: 'flowerPink', x: 84, y: 38}, {art: 'mushroom', x: 88, y: 8}, {art: 'tuft', x: 96, y: 6}
]

function GardenView(): React.JSX.Element {
    const {pet, collection, stats} = useGame()
    const status = useStatus()
    const [selected, setSelected] = useState<SpeciesId | null>(null)
    const [plantName, setPlantName] = useState(pet.name ?? '')
    const root = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<HTMLDivElement>(null)
    const [toast, setToast] = useState('')

    useEffect(() => setPlantName(pet.name ?? ''), [pet.name])

    // 풍경 부분을 PNG로 저장한다. 스크롤이 내려가 있으면 풍경이 화면 밖이라 먼저 맨 위로 올린다.
    const savePhoto = async (): Promise<void> => {
        root.current?.scrollTo({top: 0})
        await new Promise((r) => requestAnimationFrame(() => r(null)))
        const box = sceneRef.current?.getBoundingClientRect()
        if (!box) return
        const result = await window.api.exportGarden({x: box.x, y: box.y, width: box.width, height: box.height})
        setToast(result === 'saved' ? '사진을 저장했어요' : result === 'error' ? '저장하지 못했어요' : '')
        if (result !== 'canceled') setTimeout(() => setToast(''), 2500)
    }
    const savePlantName = async (): Promise<void> => {
        try {
            await window.api.setPetName(plantName)
            setToast('이름을 저장했어요')
        } catch {
            setToast('이름을 저장하지 못했어요')
        }
        setTimeout(() => setToast(''), 2500)
    }
    const stage = stageOf(pet.level)
    const [settings] = useSettings()
    const gold = hasGoldPot(collection) // 모든 종을 완성하면 황금 화분
    const nextStage = STAGES.find((s) => s.minLevel > stage.minLevel)
    const need = xpToNextLevel(pet.level)
    const now = new Date()
    const eta = etaDays(pet, stats, now)
    const todayXp = stats.daily[dateKey(now)] ?? 0
    const avg = avgDaily(stats, now)
    const weather = weatherOf(todayXp, avg)
    const streak = currentStreak(stats, now)
    const got = achieved(pet, collection, stats)
    const tod = timeOfDay(now.getHours())

    // 종별 완성 횟수와 마지막 완성 시각
    const owned = new Map<SpeciesId, { count: number; lastAt: string }>()
    for (const c of collection) {
        const prev = owned.get(c.species)
        owned.set(c.species, {
            count: (prev?.count ?? 0) + 1,
            lastAt: !prev || c.completedAt > prev.lastAt ? c.completedAt : prev.lastAt
        })
    }
    const picked = selected ? owned.get(selected) : undefined
    const selectedPlants = selected
        ? collection.filter((c) => c.species === selected).sort((a, b) => a.completedAt.localeCompare(b.completedAt))
        : []

    return (
        <div className="garden" ref={root}>
            <div className={`scene ${tod} w-${weather}`} ref={sceneRef}>
                <div className="sun">{tod === 'night' && <PixelArt rows={MOON} colors={MOON_COLORS} scale={4}/>}</div>
                <div className="stars"/>
                <div className="cloud c1"/>
                <div className="cloud c2"/>
                <div className="cloud c3"/>
                <div className="cloud c4"/>
                {weather === 'rainbow' && tod !== 'night' && (
                    <div className="rainbow"><PixelArt rows={RAINBOW} colors={RAINBOW_COLORS} scale={5}/></div>
                )}
                <div className="shoot"/>
                {FIREFLIES.map(([x, y, delay], i) => (
                    <div key={`ff${i}`} className="fly" style={{left: `${x}%`, top: y, animationDelay: `${delay}s, ${delay}s`}}/>
                ))}
                <div className="mtn"/>
                <div className="mtn m2"/>
                <div className="hill h1"/>
                <div className="hill h2"/>
                {PINES.map((p, i) => (
                    <div key={`pine${i}`} className="decor" style={{left: `${p.x}%`, bottom: p.y}}>
                        <PixelArt rows={DECOR.pine} colors={DECOR_COLORS} scale={p.scale}/>
                    </div>
                ))}
                <div className="fence"/>
                <div className="grass"/>
                <div className="scene-pet">
                    <PetSprite stage={stage.id} species={pet.species} scale={9} gold={gold}/>
                </div>
                {DECOR_SPOTS.map((d, i) => (
                    <div key={i} className="decor" style={{left: `${d.x}%`, bottom: d.y}}>
                        <PixelArt rows={DECOR[d.art]} colors={DECOR_COLORS} scale={d.scale ?? 3}/>
                    </div>
                ))}
                <div className="bird"><PixelArt rows={DECOR.bird} colors={DECOR_COLORS} scale={3}/></div>
                <div className="bee"><PixelArt rows={DECOR.bee} colors={DECOR_COLORS} scale={3}/></div>
                <div className="weather"/>
                {unlockedItems(collection.length).map((u) => (
                    <div key={u.id} className={`decor unlock ${u.id}`} style={{left: `${UNLOCK_SPOTS[u.id].x}%`, bottom: UNLOCK_SPOTS[u.id].y}} title={u.name}>
                        <PixelArt rows={DECOR[u.id]} colors={DECOR_COLORS} scale={UNLOCK_SPOTS[u.id].scale}/>
                    </div>
                ))}
                <div className="butterfly"><PixelArt rows={DECOR.butterfly} colors={DECOR_COLORS} scale={3}/></div>
            </div>

            <div className="panel">
                <div className="name-row">
                    <div className="garden-heading">
                        <div className="garden-name">{stage.name} · Lv.{pet.level}</div>
                    </div>
                    <button className="photo-btn" onClick={savePhoto}>사진 저장</button>
                </div>
                <div className="plant-name-edit">
                    <input
                        value={plantName}
                        maxLength={24}
                        placeholder="식물 이름"
                        aria-label="현재 식물 이름"
                        onChange={(e) => setPlantName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') void savePlantName() }}
                    />
                    <button className="photo-btn" onClick={() => void savePlantName()}>이름 저장</button>
                </div>
                {toast && <div className="toast">{toast}</div>}
                <div className="bar" title={`${formatXp(pet.xp)}/${need} XP`}>
                    <div className="bar-fill" style={{width: `${(pet.xp / need) * 100}%`}}/>
                </div>
                <div className="bar-label">{formatXp(pet.xp)} / {need} XP</div>

                <div className="stats">
                    <div><b>{formatXp(todayXp)}</b><span>오늘 XP</span></div>
                    <div><b>{Math.floor(stats.totalXp).toLocaleString()}</b><span>누적 XP</span></div>
                    <div><b>{streak}일</b><span>연속 사용</span></div>
                    <div>
                        <b>{nextStage ? (eta === null ? '-' : `${eta}일`) : '최종'}</b>
                        <span>{nextStage ? `${nextStage.name}까지` : '단계'}</span>
                    </div>
                </div>
                <div className="bar-label">
                    정원 날씨 {WEATHER_NAME[weather]}
                    {avg > 0 && ` · 오늘은 최근 7일 평균의 ${Math.round((todayXp / avg) * 100)}%`}
                </div>
                <div className="bar-label">
                    {status.lastCheckedAt === null
                        ? '로그 확인 전'
                        : `마지막 확인 ${new Date(status.lastCheckedAt).toLocaleTimeString()} · 이번 실행 +${formatXp(status.gainedXp)} XP`}
                </div>

                {status.error && <div className="warn-line">{status.error}</div>}
                {settings.dailyGoal > 0 && (
                    <div className="goal">
                        <div className="goal-text">오늘 목표 {formatXp(Math.min(todayXp, settings.dailyGoal))} / {settings.dailyGoal} XP{todayXp >= settings.dailyGoal ? ' · 달성!' : ''}</div>
                        <div className="bar"><div className="bar-fill goal-fill" style={{width: `${Math.min(100, (todayXp / settings.dailyGoal) * 100)}%`}}/></div>
                    </div>
                )}
                <UsageChart stats={stats}/>

                <h2>도감 {owned.size}/{SPECIES.length}{gold ? ' · 황금 화분 획득!' : ''}</h2>
                <div className="shelf">
                    {SPECIES.map((sp) => {
                        const own = owned.get(sp.id)
                        return (
                            <button
                                key={sp.id}
                                className={`slot${own ? '' : ' locked'}${selected === sp.id ? ' on' : ''}`}
                                disabled={!own}
                                onClick={() => setSelected(selected === sp.id ? null : sp.id)}
                                title={own ? sp.name : '아직 만나지 못한 식물'}
                            >
                                <PetSprite stage="tree" species={sp.id} scale={3} gold={gold}/>
                                <span>{own ? sp.name : '???'}</span>
                                <small className={`rar ${sp.rarity}`}>{RARITY[sp.rarity].name}</small>
                                {own && own.count > 1 && <em>×{own.count}</em>}
                            </button>
                        )
                    })}
                </div>
                <div className="unlock-line">
                    정원 소품 {unlockedItems(collection.length).length}/{UNLOCKS.length}
                    {nextUnlock(collection.length) ? ` · 식물 ${nextUnlock(collection.length)!.remaining}개를 더 완성하면 '${nextUnlock(collection.length)!.item.name}'` : ' · 모두 해금!'}
                </div>
                {selected && picked && (
                    <SpeciesDetail key={selected} species={selected} count={picked.count} lastAt={picked.lastAt} plants={selectedPlants}/>
                )}
                {collection.length === 0 && <p className="empty">큰 나무까지 키워 완성하면 이곳에 심어져요.</p>}

                <h2>업적 {got.size}/{ACHIEVEMENTS.length}</h2>
                <div className="badges">
                    {ACHIEVEMENTS.map((a) => (
                        <div key={a.id} className={`badge${got.has(a.id) ? '' : ' locked'}`} title={a.desc}>
                            <b>{got.has(a.id) ? a.name : '???'}</b>
                            <span>{a.desc}</span>
                        </div>
                    ))}
                </div>

                <h2>현재 식물 성장 기록</h2>
                <ol className="timeline">
                    {(pet.growthHistory ?? []).map((mark, i) => {
                        const markStage = STAGES.find((s) => s.id === mark.stage)
                        return (
                            <li key={`${mark.at}-${mark.stage}-${i}`}>
                                <b>{markStage?.name ?? mark.stage}</b>
                                <time>{mark.kind === 'start' ? '기록 시작 · ' : ''}{new Date(mark.at).toLocaleString()}</time>
                            </li>
                        )
                    })}
                </ol>
                <h2>성장 단계</h2>
                <ul className="stages">
                    {STAGES.map((s) => (
                        <li key={s.id} className={pet.level >= s.minLevel ? 'done' : 'locked'}>
                            {s.name} <span>{pet.level >= s.minLevel ? '✓' : `Lv.${s.minLevel}`}</span>
                        </li>
                    ))}
                </ul>

                <h2>설정</h2>
                <SettingsPanel tools={status.tools}/>
            </div>
        </div>
    )
}

export default GardenView
