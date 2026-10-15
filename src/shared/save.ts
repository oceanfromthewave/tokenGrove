import {INITIAL_PET, addXp, isSpeciesId, isStageId, type Completed, type GrowthMark, type PetState} from './growth.ts'
import {DEFAULT_SETTINGS, parseSettings, type Settings} from './settings.ts'
import {parseVersion} from './version.ts'
import {EMPTY_STATS, type Stats} from './stats.ts'

// 디스크에 저장하는 데이터 형식. 파일은 외부에서 바뀌거나 깨질 수 있으니 읽을 때 반드시 검증한다.
export interface SaveData {
    pet: PetState
    petWindow: { x: number; y: number } | null // 펫 창 위치. 없으면 기본 위치
    processed: string[] // 이미 경험치로 반영한 사용 기록 키 (중복 보상 방지)
    collection: Completed[] // 완성되어 정원에 보관된 식물
    stats: Stats // 경험치 통계
    settings: Settings // 사용자 설정
    onboarded: boolean // 첫 실행 안내를 이미 봤는지
    skippedVersion: string | null // "이 버전 건너뛰기"를 누른 업데이트 버전
    logOffsets: Record<string, number> | null // Claude Code 로그별 읽은 위치. null = 아직 기준선 없음(첫 실행)
}

export const EMPTY_SAVE: SaveData = {pet: INITIAL_PET, petWindow: null, processed: [], collection: [], stats: EMPTY_STATS, settings: DEFAULT_SETTINGS, onboarded: false, skippedVersion: null, logOffsets: null}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const parseName = (v: unknown): string | undefined => typeof v === 'string' ? v.trim().slice(0, 24) : undefined

function parseGrowthHistory(v: unknown): GrowthMark[] | undefined {
    if (!Array.isArray(v)) return undefined
    return v.filter((m: unknown): m is GrowthMark =>
        !!m && typeof m === 'object' && isStageId((m as GrowthMark).stage) &&
        typeof (m as GrowthMark).at === 'string' && (m as GrowthMark).at.length <= 40 &&
        ((m as GrowthMark).kind === undefined || (m as GrowthMark).kind === 'start' || (m as GrowthMark).kind === 'stage')
    ).slice(0, 20).map((m) => ({
        stage: m.stage,
        at: m.at,
        ...(m.kind ? {kind: m.kind} : {})
    }))
}

// 없어진 종은 새 종으로 옮긴다. (예전 저장 파일의 해바라기 -> 소나무)
const RENAMED: Record<string, string> = {sunflower: 'pine'}
const renamed = (v: unknown): unknown => (typeof v === 'string' && Object.hasOwn(RENAMED, v) ? RENAMED[v] : v)

// 저장 파일 내용을 SaveData로 바꾼다. 형식이 이상하면 새로 시작(EMPTY_SAVE)한다.
export function parseSave(text: string): SaveData {
    try {
        const raw = JSON.parse(text)
        const {level, xp} = raw.pet
        const petSpecies = renamed(raw.pet.species)
        const species = isSpeciesId(petSpecies) ? petSpecies : INITIAL_PET.species // 옛 저장 파일 호환
        const name = parseName(raw.pet.name)
        const growthHistory = parseGrowthHistory(raw.pet.growthHistory)
        // 상한은 addXp 반복 횟수가 터무니없이 커지는 것을 막기 위한 안전장치
        if (!Number.isInteger(level) || level < 1 || level > 9999) return EMPTY_SAVE
        if (!isNum(xp) || xp < 0 || xp > 1e9) return EMPTY_SAVE

        const w = raw.petWindow
        const petWindow = isNum(w?.x) && isNum(w?.y) && Math.abs(w.x) < 1e5 && Math.abs(w.y) < 1e5
            ? {x: Math.round(w.x), y: Math.round(w.y)}
            : null
        const processed: string[] = Array.isArray(raw.processed)
            ? raw.processed.filter((k: unknown): k is string => typeof k === 'string' && k.length <= 300).slice(0, 1_000_000)
            : []
        let logOffsets: Record<string, number> | null = null
        if (raw.logOffsets && typeof raw.logOffsets === 'object' && !Array.isArray(raw.logOffsets)) {
            logOffsets = {}
            for (const [k, v] of Object.entries(raw.logOffsets).slice(0, 100_000)) {
                if (k.length <= 500 && isNum(v) && v >= 0) logOffsets[k] = v
            }
        }
        const collection: Completed[] = Array.isArray(raw.collection)
            ? raw.collection
                .map((c: Completed) => (c ? {...c, species: renamed(c.species) as Completed['species']} : c))
                .filter((c: Completed) => isSpeciesId(c?.species) && typeof c.completedAt === 'string' && c.completedAt.length <= 40)
                .map((c: Completed) => ({
                    species: c.species,
                    completedAt: c.completedAt,
                    ...(parseName(c.name) ? {name: parseName(c.name)} : {}),
                    ...(parseGrowthHistory(c.growthHistory) ? {growthHistory: parseGrowthHistory(c.growthHistory)} : {})
                }))
                .slice(0, 10_000)
            : []
        const dailyRaw = raw.stats?.daily
        const daily: Record<string, number> = {}
        if (dailyRaw && typeof dailyRaw === 'object' && !Array.isArray(dailyRaw)) {
            for (const [k, v] of Object.entries(dailyRaw).slice(0, 400)) {
                if (/^\d{4}-\d{2}-\d{2}$/.test(k) && isNum(v) && v >= 0 && v <= 1e9) daily[k] = v
            }
        }
        const totalXp = isNum(raw.stats?.totalXp) && raw.stats.totalXp >= 0 ? raw.stats.totalXp : 0
        const best = raw.stats?.bestStreak
        const bestStreak = Number.isInteger(best) && best >= 0 && best <= 100_000 ? best : 0
        // 레벨 기준보다 xp가 크면 레벨업으로 정리
        const pet: PetState = {
            ...addXp({level, xp: 0, species}, xp),
            ...(name !== undefined ? {name} : {}),
            ...(growthHistory !== undefined ? {growthHistory} : {})
        }
        return {pet, petWindow, processed, collection, stats: {totalXp, daily, bestStreak}, settings: parseSettings(raw.settings), onboarded: raw.onboarded !== false, skippedVersion: parseVersion(raw.skippedVersion) ? (raw.skippedVersion as string).replace(/^v/, '') : null, logOffsets}
    } catch {
        return EMPTY_SAVE
    }
}
