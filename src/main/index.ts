import {app, BrowserWindow, ipcMain, Menu, screen} from 'electron'
import {join} from 'path'
import {INITIAL_PET, harvestIfReady, newSeed, type Completed, type PetState} from '../shared/growth'
import {EMPTY_SAVE} from '../shared/save'
import {EMPTY_STATS, dateKey, recordGain, type Stats} from '../shared/stats'
import {TOKENS_PER_XP, applyUsage, type CollectStatus, type UsageRecord} from '../shared/usage'
import {loadSave, writeSave} from './store'
import {defaultClaudeRoot, scanClaudeLogs, type Offsets} from './claudeLogs'

const TEST_PROVIDER = 'test'
const TEST_TOKENS = 30 * TOKENS_PER_XP // 테스트 버튼 1회당 토큰(=30xp). 렌더러가 수치를 보내지 못하게 main에서 고정한다.

// 펫 상태의 단일 출처. 모든 창은 IPC로 읽고 변경 알림을 받는다. 변경될 때마다 디스크에 저장한다.
let pet: PetState = INITIAL_PET
let collection: Completed[] = [] // 완성되어 정원에 보관된 식물
let stats: Stats = EMPTY_STATS // 로그에서 얻은 경험치 통계 (테스트 버튼은 제외)
let processed: string[] = [] // 이미 반영한 사용 기록 키
let logOffsets: Offsets | null = null // Claude Code 로그 읽은 위치
let status: CollectStatus = {lastCheckedAt: null, gainedXp: 0}
let petPos: { x: number; y: number } | null = null
let gardenWin: BrowserWindow | null = null
let petWin: BrowserWindow | null = null
let dragOrigin: Electron.Rectangle | null = null // 펫 끌기를 시작할 때의 창 위치

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
    writeSave({pet, petWindow: petPos, processed, collection, stats, logOffsets})
}

// 펫 우클릭 메뉴. 종료와 자동 실행 설정을 여기서 제공한다. (자동 실행은 기본 꺼짐, 사용자가 직접 켠다)
function showPetMenu(win: BrowserWindow): void {
    const login = app.getLoginItemSettings().openAtLogin
    Menu.buildFromTemplate([
        {label: '정원 열기', click: openGarden},
        {type: 'separator'},
        {
            label: 'Windows 시작 시 자동 실행',
            type: 'checkbox',
            checked: login,
            enabled: app.isPackaged, // 개발 모드(npm run dev)에서는 등록하지 않는다
            click: (item) => app.setLoginItemSettings({openAtLogin: item.checked})
        },
        {type: 'separator'},
        {label: '종료', click: () => app.quit()}
    ]).popup({window: win})
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
    win.webContents.on('context-menu', () => showPetMenu(win))
    petWin = win
    win.on('moved', () => {
        const [x, y] = win.getPosition()
        petPos = {x, y}
        persist()
    })
    win.on('closed', () => {
        petWin = null
        app.quit()
    })
}

function openGarden(): void {
    if (gardenWin) {
        gardenWin.focus()
        return
    }
    gardenWin = new BrowserWindow({
        width: 460,
        height: 720,
        title: 'Token Grove 정원',
        autoHideMenuBar: true,
        webPreferences: {
            preload: join(__dirname, '../preload/index.js')
        }
    })
    loadView(gardenWin, 'garden')
    gardenWin.on('closed', () => (gardenWin = null))
}

const getState = (): { pet: PetState; collection: Completed[]; stats: Stats } => ({pet, collection, stats})

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
    // 테스트 버튼으로 얻은 경험치는 통계에 넣지 않는다. (실제 사용량만 기록)
    if (records.some((r) => r.provider !== TEST_PROVIDER)) stats = recordGain(stats, result.gainedXp, dateKey(new Date()))
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
        provider: TEST_PROVIDER,
        occurredAt: new Date().toISOString(),
        totalTokens: TEST_TOKENS,
        source: 'test-button',
        confidence: 'exact'
    }])
    return getState()
})
ipcMain.on('garden:open', openGarden)

// 펫 끌기. 'CSS 드래그 영역'을 쓰면 우클릭 메뉴가 안 뜨므로, 화면(renderer)이 이동량만 보내고 main이 창을 옮긴다.
ipcMain.on('pet:dragStart', (e) => {
    if (e.sender === petWin?.webContents) dragOrigin = petWin.getBounds()
})
ipcMain.on('pet:dragMove', (e, dx: unknown, dy: unknown) => {
    if (!petWin || !dragOrigin || e.sender !== petWin.webContents) return
    if (typeof dx !== 'number' || typeof dy !== 'number' || !Number.isFinite(dx) || !Number.isFinite(dy)) return
    // setPosition 대신 setBounds: 배율이 높은 화면에서 창 크기가 변하는 문제를 피한다.
    petWin.setBounds({...dragOrigin, x: Math.round(dragOrigin.x + dx), y: Math.round(dragOrigin.y + dy)})
})
ipcMain.on('pet:dragEnd', (e) => {
    if (!petWin || e.sender !== petWin.webContents) return
    dragOrigin = null
    const [x, y] = petWin.getPosition()
    petPos = {x, y}
    persist()
})

app.whenReady().then(() => {
    const save = loadSave()
    pet = save === EMPTY_SAVE ? newSeed() : save.pet // 첫 실행(또는 저장 파일 없음/손상)은 무작위 씨앗
    collection = save.collection
    stats = save.stats
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
