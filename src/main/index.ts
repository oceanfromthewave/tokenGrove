import {app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, net, Notification, screen, shell, Tray} from 'electron'
import {writeFile} from 'fs/promises'
import {join} from 'path'
import {fallbackPos, fitsInAny} from '../shared/windowPos'
import {INITIAL_PET, SPECIES, STAGES, harvestIfReady, newSeed, stageOf, type Completed, type PetState} from '../shared/growth'
import {petEvent} from '../shared/events'
import {parseRect} from '../shared/exportRect'
import {DEFAULT_SETTINGS, SPEED_MULTIPLIER, mergeSettings, type Settings} from '../shared/settings'
import {EMPTY_SAVE} from '../shared/save'
import {EMPTY_STATS, dateKey, recordGain, type Stats} from '../shared/stats'
import {TOKENS_PER_XP, applyUsage, type CollectStatus, type UsageRecord} from '../shared/usage'
import {loadSave, writeSave} from './store'
import {TRAY_ICON} from './trayIcon'
import {RELEASES_API, isNewer, parseLatestRelease} from '../shared/version'
import {defaultClaudeRoot, defaultCodexRoot, scanClaudeLogs, scanCodexLogs, type Offsets} from './claudeLogs'

const TEST_PROVIDER = 'test'
const TEST_TOKENS = 30 * TOKENS_PER_XP // 테스트 버튼 1회당 토큰(=30xp). 렌더러가 수치를 보내지 못하게 main에서 고정한다.

// 펫 상태의 단일 출처. 모든 창은 IPC로 읽고 변경 알림을 받는다. 변경될 때마다 디스크에 저장한다.
let pet: PetState = INITIAL_PET
let collection: Completed[] = [] // 완성되어 정원에 보관된 식물
let stats: Stats = EMPTY_STATS // 로그에서 얻은 경험치 통계 (테스트 버튼은 제외)
let processed: string[] = [] // 이미 반영한 사용 기록 키
let logOffsets: Offsets | null = null // Claude Code 로그 읽은 위치
let settings: Settings = DEFAULT_SETTINGS
let status: CollectStatus = {lastCheckedAt: null, gainedXp: 0, tools: {claude: 0, codex: 0}, error: null}
let onboarded = true // 첫 실행 안내를 봤는지
let petPos: { x: number; y: number } | null = null
let gardenWin: BrowserWindow | null = null
let petWin: BrowserWindow | null = null
let tray: Tray | null = null
let skippedVersion: string | null = null // "건너뛰기"를 누른 업데이트 버전
let askedVersion: string | null = null // 이번 실행에서 이미 물어본 버전 (같은 버전을 반복해서 묻지 않는다)
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
    return fitsInAny({...pos, width: w, height: h}, screen.getAllDisplays().map((d) => d.workArea)) ? pos : undefined
}

// 모니터를 뽑거나 해상도/배율이 바뀌어 펫 창이 화면 밖에 남으면 주 모니터 오른쪽 아래로 옮긴다.
function ensureOnScreen(): void {
    if (!petWin || petWin.isDestroyed()) return
    const box = petWin.getBounds()
    if (fitsInAny(box, screen.getAllDisplays().map((d) => d.workArea))) return
    const {x, y} = fallbackPos(box, screen.getPrimaryDisplay().workArea)
    petWin.setPosition(x, y)
    petPos = {x, y}
    persist()
}

function persist(): void {
    writeSave({pet, petWindow: petPos, processed, collection, stats, settings, onboarded, skippedVersion, logOffsets})
}

// 새 버전 확인. GitHub의 '최신 릴리스' 정보만 받아오고(사용 기록 등은 보내지 않는다), 새 버전이면 물어본다.
// 업데이트를 고르면 다운로드 페이지를 브라우저로 연다. 설치 파일을 받아 실행하면 저장 데이터는 그대로 유지된다.
async function checkForUpdate(manual: boolean): Promise<void> {
    if (!manual && !settings.updateCheck) return
    const current = app.getVersion()
    try {
        const res = await net.fetch(RELEASES_API, {
            headers: {'User-Agent': 'TokenGrove', Accept: 'application/vnd.github+json'},
            signal: AbortSignal.timeout(8000)
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const latest = parseLatestRelease(await res.json())
        if (!latest) throw new Error('응답 형식이 올바르지 않음')

        if (!isNewer(latest.version, current)) {
            if (manual) await dialog.showMessageBox({type: 'info', title: 'Token Grove', message: '최신 버전을 쓰고 있어요', detail: `현재 v${current}`})
            return
        }
        // 자동 확인은 건너뛴 버전과 이미 물어본 버전은 다시 묻지 않는다. 직접 확인(manual)은 항상 보여준다.
        if (!manual && (latest.version === skippedVersion || latest.version === askedVersion)) return
        askedVersion = latest.version

        const {response} = await dialog.showMessageBox({
            type: 'info',
            title: '새 버전이 있어요',
            message: `새 버전 v${latest.version}이 나왔어요. 업데이트 하시겠어요?`,
            detail: `현재 v${current}\n\n업데이트를 누르면 다운로드 페이지가 열려요. 설치 파일을 받아 실행하면 저장된 펫과 도감은 그대로 유지돼요.`,
            buttons: ['업데이트 (다운로드 페이지 열기)', '나중에', '이 버전 건너뛰기'],
            defaultId: 0,
            cancelId: 1
        })
        if (response === 0) await shell.openExternal(latest.url) // parseLatestRelease가 우리 저장소의 릴리스 주소만 통과시킨다
        if (response === 2) {
            skippedVersion = latest.version
            persist()
        }
    } catch (err) {
        console.error('업데이트 확인 실패:', err instanceof Error ? err.message : err)
        if (manual) await dialog.showMessageBox({type: 'warning', title: 'Token Grove', message: '업데이트를 확인하지 못했어요', detail: '인터넷 연결을 확인하고 잠시 뒤에 다시 시도해 주세요.'})
    }
}

// 펫 우클릭 메뉴. 종료와 자동 실행 설정을 여기서 제공한다. (자동 실행은 기본 꺼짐, 사용자가 직접 켠다)
function showPetMenu(win: BrowserWindow): void {
    const login = app.getLoginItemSettings().openAtLogin
    Menu.buildFromTemplate([
        {label: '정원 열기', click: openGarden},
        {label: '숨기기 (트레이에서 다시 열기)', click: () => win.hide()},
        {label: '업데이트 확인', click: () => void checkForUpdate(true)},
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

function togglePet(): void {
    if (!petWin) return
    if (petWin.isVisible()) {
        petWin.hide()
    } else {
        petWin.show()
    }
}

function createTray(): void {
    const icon = nativeImage.createFromDataURL(TRAY_ICON).resize({width: 16, height: 16})
    tray = new Tray(icon)
    tray.setToolTip('Token Grove')
    const menu = (): Menu =>
        Menu.buildFromTemplate([
            {label: petWin?.isVisible() ? '펫 숨기기' : '펫 보이기', click: togglePet},
            {label: '정원 열기', click: openGarden},
            {label: '업데이트 확인', click: () => void checkForUpdate(true)},
            {type: 'separator'},
            {label: '종료', click: () => app.quit()}
        ])
    tray.on('click', togglePet)
    tray.on('right-click', () => tray?.popUpContextMenu(menu()))
}

function createPetWindow(): void {
    const win = new BrowserWindow({
        width: 160,
        height: 268,
        ...visiblePos(petPos, 160, 268),
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

const getState = (): { pet: PetState; collection: Completed[]; stats: Stats; onboarded: boolean } => ({pet, collection, stats, onboarded})

function broadcastState(): void {
    for (const w of BrowserWindow.getAllWindows()) w.webContents.send('state:changed', getState())
}

// 완성 레벨에 도달했으면 정원에 보관하고 새 씨앗을 시작한다.
function settle(now = new Date().toISOString()): boolean {
    const r = harvestIfReady(pet, collection, now)
    const done = r.pet !== pet
    pet = r.pet
    collection = r.collection
    if (done) pet = {...pet, name: '', growthHistory: [{stage: 'seed', at: now, kind: 'start'}]}
    return done
}

function recordStageChanges(before: PetState, after: PetState, at: string): PetState {
    if (before.species !== after.species || after.level <= before.level) return after
    const reached = STAGES.filter((s) => before.level < s.minLevel && after.level >= s.minLevel)
    if (!reached.length) return after
    const growthHistory = [
        ...(before.growthHistory ?? []),
        ...reached.map((s) => ({stage: s.id, at, kind: 'stage' as const}))
    ].slice(-20)
    return {...after, growthHistory}
}

ipcMain.handle('state:get', getState)
ipcMain.handle('pet:setName', (_e, value: unknown) => {
    if (typeof value !== 'string') return getState()
    pet = {...pet, name: value.trim().slice(0, 24)}
    persist()
    broadcastState()
    return getState()
})
ipcMain.handle('status:get', () => status)
ipcMain.handle('onboarding:done', () => {
    onboarded = true
    persist()
})
ipcMain.handle('settings:get', () => settings)
ipcMain.handle('settings:set', (_e, patch: unknown) => {
    settings = mergeSettings(settings, patch) // 알려진 항목과 형식만 받아들인다
    persist()
    for (const w of BrowserWindow.getAllWindows()) w.webContents.send('settings:changed', settings)
    return settings
})
// 사용 기록 반영의 유일한 입구. 실제 AI 연동부(adapter)도 이 함수로 기록을 넘긴다.
// 단계가 바뀌거나 식물을 완성했을 때만 알림을 띄운다. (레벨마다 띄우면 너무 잦다)
function notifyGrowth(before: PetState): void {
    const kind = petEvent(before, pet)
    if (!settings.notifications || (kind !== 'stage' && kind !== 'newSeed') || !Notification.isSupported()) return
    const name = (id: string): string => SPECIES.find((s) => s.id === id)?.name ?? ''
    if (kind === 'stage') {
        new Notification({title: `${stageOf(pet.level).name} 단계가 됐어요`, body: `${name(pet.species)}이(가) 쑥쑥 자라고 있어요`}).show()
    } else {
        new Notification({title: '식물을 완성했어요!', body: `${name(before.species)}이(가) 정원 도감에 심어졌고, 새 씨앗이 시작됐어요`}).show()
    }
}

function ingestUsage(records: UsageRecord[]): number {
    const before = pet
    const result = applyUsage(pet, processed, records, SPEED_MULTIPLIER[settings.speed])
    const changed = result.processed !== processed
    const now = new Date().toISOString()
    pet = recordStageChanges(before, result.pet, now)
    processed = result.processed
    // 테스트 버튼으로 얻은 경험치는 통계와 알림에 넣지 않는다. (실제 사용량만)
    const real = records.some((r) => r.provider !== TEST_PROVIDER)
    if (real) stats = recordGain(stats, result.gainedXp, dateKey(new Date()))
    const harvested = settle(now)
    if (real) notifyGrowth(before)
    persist() // 읽은 위치(logOffsets)도 함께 저장된다
    if (changed || harvested) broadcastState()
    return result.gainedXp
}

const POLL_MS = 30_000

// 이 폴더의 로그를 이미 한 번 확인(기준선을 저장)했는지. 나중에 새로 지원하게 된 도구도 첫 확인 때는
// 과거 기록을 보상하지 않고 기준선만 잡도록, 도구별로 따로 판단한다.
// (도구는 설치돼 있지만 아직 로그 파일이 하나도 없던 경우에는 파일이 처음 생길 때 한 번 더 기준선만 잡는다.)
const hasBaseline = (offsets: Offsets, root: string): boolean => Object.keys(offsets).some((p) => p.startsWith(root))

// Claude Code와 Codex 로그에서 새 사용 기록을 읽어 반영한다. 첫 확인은 기준선만 잡고 과거 기록은 보상하지 않는다.
function pollLogs(): void {
    try {
        pollLogsOnce()
        if (status.error) status = {...status, error: null}
    } catch (err) {
        // 내용은 담지 않고 짧은 설명만 보여준다 (프롬프트 등이 섞여 나오지 않게)
        console.error('로그 읽기 실패:', err instanceof Error ? err.message : err)
        status = {...status, lastCheckedAt: Date.now(), error: '로그를 읽는 중 문제가 생겼어요. 다음 확인 때 다시 시도해요.'}
        for (const w of BrowserWindow.getAllWindows()) w.webContents.send('status:changed', status)
    }
}

function pollLogsOnce(): void {
    const first = logOffsets === null
    const known = logOffsets ?? {}
    const claudeRoot = defaultClaudeRoot()
    const codexRoot = defaultCodexRoot()
    const claude = scanClaudeLogs(claudeRoot, hasBaseline(known, claudeRoot) ? known : null)
    const codex = scanCodexLogs(codexRoot, hasBaseline(known, codexRoot) ? known : null)
    // 꺼 둔 도구의 기록은 읽은 위치만 앞으로 보내고 버린다. (다시 켰을 때 그동안의 기록이 한꺼번에 들어오지 않게)
    const records = [...(settings.claude ? claude.records : []), ...(settings.codex ? codex.records : [])]
    // 새로 기준선을 잡은 도구가 있으면(로그 파일이 처음 보였을 때) 그 위치를 저장해야 한다
    const newBaseline =
        (!hasBaseline(known, claudeRoot) && Object.keys(claude.offsets).length > 0) ||
        (!hasBaseline(known, codexRoot) && Object.keys(codex.offsets).length > 0)
    // 이미 저장된 기준선에 이번에 새로 잡힌 기준선을 합친다. (파일이 지워진 항목은 자연스럽게 사라진다)
    logOffsets = {...claude.offsets, ...codex.offsets}
    const gained = first || records.length > 0 || newBaseline ? ingestUsage(records) : 0
    status = {
        lastCheckedAt: Date.now(),
        gainedXp: status.gainedXp + gained,
        tools: {claude: Object.keys(claude.offsets).length, codex: Object.keys(codex.offsets).length},
        error: null
    }
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

// 정원 풍경을 PNG로 저장한다. 파일 위치는 사용자가 저장 창에서 직접 고른다.
// 렌더러가 보내는 캡처 영역은 검증하고, 정원 창에서 온 요청만 받는다.
ipcMain.handle('garden:export', async (e, rectInput: unknown): Promise<'saved' | 'canceled' | 'error'> => {
    const win = BrowserWindow.fromWebContents(e.sender)
    const rect = parseRect(rectInput)
    if (!win || win !== gardenWin || !rect) return 'error'
    try {
        const image = await win.webContents.capturePage(rect)
        const {canceled, filePath} = await dialog.showSaveDialog(win, {
            title: '정원 사진 저장',
            defaultPath: join(app.getPath('pictures'), `TokenGrove-${dateKey(new Date())}.png`),
            filters: [{name: 'PNG 이미지', extensions: ['png']}]
        })
        if (canceled || !filePath) return 'canceled'
        await writeFile(filePath.toLowerCase().endsWith('.png') ? filePath : filePath + '.png', image.toPNG())
        return 'saved'
    } catch (err) {
        console.error('정원 사진 저장 실패:', err instanceof Error ? err.message : err)
        return 'error'
    }
})

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
    pet = {
        ...pet,
        name: pet.name ?? '',
        growthHistory: pet.growthHistory?.length
            ? pet.growthHistory
            : [{stage: stageOf(pet.level).id, at: new Date().toISOString(), kind: 'start'}]
    }
    collection = save.collection
    stats = save.stats
    settings = save.settings
    skippedVersion = save.skippedVersion
    onboarded = save.onboarded
    processed = save.processed
    logOffsets = save.logOffsets
    petPos = save.petWindow
    settle() // 저장된 레벨이 이미 완성 기준을 넘었으면 바로 정원에 보관
    createPetWindow()
    createTray()
    screen.on('display-removed', ensureOnScreen)
    screen.on('display-metrics-changed', ensureOnScreen)
    pollLogs()
    setInterval(pollLogs, POLL_MS)
    setTimeout(() => void checkForUpdate(false), 15_000) // 시작 직후에는 펫이 자리 잡도록 잠깐 기다린다
    setInterval(() => void checkForUpdate(false), 6 * 60 * 60 * 1000)
})

app.on('window-all-closed', () => {
    app.quit()
})
