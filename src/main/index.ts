import {app, BrowserWindow, ipcMain, screen} from 'electron'
import {join} from 'path'
import {INITIAL_PET, harvestIfReady, newSeed, type Completed, type PetState} from '../shared/growth'
import {EMPTY_SAVE} from '../shared/save'
import {TOKENS_PER_XP, applyUsage, type CollectStatus, type UsageRecord} from '../shared/usage'
import {loadSave, writeSave} from './store'
import {defaultClaudeRoot, scanClaudeLogs, type Offsets} from './claudeLogs'

const TEST_TOKENS = 30 * TOKENS_PER_XP // 테스트 버튼 1회당 토큰(=30xp). 렌더러가 수치를 보내지 못하게 main에서 고정한다.

// 펫 상태의 단일 출처. 모든 창은 IPC로 읽고 변경 알림을 받는다. 변경될 때마다 디스크에 저장한다.
let pet: PetState = INITIAL_PET
let collection: Completed[] = [] // 완성되어 정원에 보관된 식물
let processed: string[] = [] // 이미 반영한 사용 기록 키
let logOffsets: Offsets | null = null // Claude Code 로그 읽은 위치
let status: CollectStatus = {lastCheckedAt: null, gainedXp: 0}
let petPos: { x: number; y: number } | null = null
let gardenWin: BrowserWindow | null = null

function loadView(win: BrowserWindow, view: 'pet' | 'garden'): void {
    // 개발 중에는 Vite 개발 서버 주소, 빌드 후에는 파일을 로드. 해시로 화면을 구분한다.
    const devUrl = process.env['ELECTRON_RENDERER_URL']
    if (devUrl) {
        win.loadURL(`${devUrl}#${view}`)
    } else {
        win.loadFile(join(__dirname, '../renderer/index.html'), {hash: view})
    }
}

// 저장된 위치가 현재 연결된 모니터 안에 있을 때만 사용한다. (모니터 구성이 바뀐 경우 화면 밖 방지)
function visiblePos(pos: { x: number; y: number } | null, w: number, h: number): { x: number; y: number } | undefined {
    if (!pos) return undefined
    const inside = screen.getAllDisplays().some(({workArea: a}) =>
        pos.x >= a.x && pos.y >= a.y && pos.x + w <= a.x + a.width && pos.y + h <= a.y + a.height)
    return inside ? pos : undefined
}

function persist(): void {
    writeSave({pet, petWindow: petPos, processed, collection, logOffsets})
}

function createPetWindow(): void {
    const win = new BrowserWindow({
        width: 140,
        height: 200,
        ...visiblePos(petPos, 140, 200),
        frame: false, // 제목 표시줄 제거
        transparent: true, // 배경 투명
        resizable: false,
        alwaysOnTop: true, // 다른 창 위에 표시
        webPreferences: {
            preload: join(__dirname, '../preload/index.js')
        }
    })
    loadView(win, 'pet')
    win.on('moved', () => {
        const [x, y] = win.getPosition()
        petPos = {x, y}
        persist()
    })
    win.on('closed', () => app.quit())
}

function openGarden(): void {
    if (gardenWin) {
        gardenWin.focus()
        return
    }
    gardenWin = new BrowserWindow({
        width: 420,
        height: 560,
        title: 'Token Grove 정원',
        autoHideMenuBar: true,
        webPreferences: {
            preload: join(__dirname, '../preload/index.js')
        }
    })
    loadView(gardenWin, 'garden')
    gardenWin.on('closed', () => (gardenWin = null))
}

const getState = (): { pet: PetState; collection: Completed[] } => ({pet, collection})

function broadcastState(): void {
    for (const w of BrowserWindow.getAllWindows()) w.webContents.send('state:changed', getState())
}

// 완성 레벨에 도달했으면 정원에 보관하고 새 씨앗을 시작한다.
function settle(): boolean {
    const r = harvestIfReady(pet, collection, new Date().toISOString())
    const done = r.pet !== pet
    pet = r.pet
    collection = r.collection
    return done
}

ipcMain.handle('state:get', getState)
ipcMain.handle('status:get', () => status)
// 사용 기록 반영의 유일한 입구. 실제 AI 연동부(adapter)도 이 함수로 기록을 넘긴다.
function ingestUsage(records: UsageRecord[]): number {
    const result = applyUsage(pet, processed, records)
    const changed = result.processed !== processed
    pet = result.pet
    processed = result.processed
    const harvested = settle()
    persist() // 읽은 위치(logOffsets)도 함께 저장된다
    if (changed || harvested) broadcastState()
    return result.gainedXp
}

const POLL_MS = 30_000

// Claude Code 로그에서 새 사용 기록을 읽어 반영한다. 첫 실행은 기준선만 잡고 과거 기록은 보상하지 않는다.
function pollClaudeLogs(): void {
    const first = logOffsets === null
    const {records, offsets} = scanClaudeLogs(defaultClaudeRoot(), logOffsets)
    logOffsets = offsets
    const gained = first || records.length > 0 ? ingestUsage(records) : 0
    status = {lastCheckedAt: Date.now(), gainedXp: status.gainedXp + gained}
    for (const w of BrowserWindow.getAllWindows()) w.webContents.send('status:changed', status)
}

ipcMain.handle('pet:addTestXp', () => {
    // 매번 새 ID의 가짜 기록. 실제 연동과 같은 경로(중복 방지 포함)를 탄다.
    ingestUsage([{
        id: `test-${Date.now()}-${Math.random()}`,
        provider: 'test',
        occurredAt: new Date().toISOString(),
        totalTokens: TEST_TOKENS,
        source: 'test-button',
        confidence: 'exact'
    }])
    return getState()
})
ipcMain.on('garden:open', openGarden)

app.whenReady().then(() => {
    const save = loadSave()
    pet = save === EMPTY_SAVE ? newSeed() : save.pet // 첫 실행(또는 저장 파일 없음/손상)은 무작위 씨앗
    collection = save.collection
    processed = save.processed
    logOffsets = save.logOffsets
    petPos = save.petWindow
    settle() // 저장된 레벨이 이미 완성 기준을 넘었으면 바로 정원에 보관
    createPetWindow()
    pollClaudeLogs()
    setInterval(pollClaudeLogs, POLL_MS)
})

app.on('window-all-closed', () => {
    app.quit()
})
