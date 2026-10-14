// 사용자 설정. 저장 파일에서 읽을 때도, 화면(IPC)에서 바꿀 때도 항상 이 모듈로 검증한다.
export type Speed = 'slow' | 'normal' | 'fast'

export interface Settings {
    claude: boolean // Claude Code 로그 수집
    codex: boolean // Codex 로그 수집
    notifications: boolean // 단계 성장/식물 완성 알림
    updateCheck: boolean // 새 버전이 있는지 GitHub에 물어보기
    speed: Speed // 성장 속도 (경험치 환산 배율)
}

export const DEFAULT_SETTINGS: Settings = {claude: true, codex: true, notifications: true, updateCheck: true, speed: 'normal'}

// 경험치 환산 배율. 사용량이 적은 사람은 빠르게, 많은 사람은 느리게 고를 수 있다.
export const SPEED_MULTIPLIER: Record<Speed, number> = {slow: 0.5, normal: 1, fast: 2}

export const SPEED_NAME: Record<Speed, string> = {slow: '느리게', normal: '보통', fast: '빠르게'}

const isSpeed = (v: unknown): v is Speed => v === 'slow' || v === 'normal' || v === 'fast'

// 알려진 항목만, 올바른 형식일 때만 덮어쓴다. 나머지는 현재 값(또는 기본값)을 유지한다.
export function mergeSettings(current: Settings, patch: unknown): Settings {
    const p = (typeof patch === 'object' && patch !== null ? patch : {}) as Record<string, unknown>
    // 상속된 속성(프로토타입)은 무시하고 객체가 직접 가진 값만 읽는다.
    const own = (k: string): unknown => (Object.hasOwn(p, k) ? p[k] : undefined)
    return {
        claude: typeof own('claude') === 'boolean' ? (own('claude') as boolean) : current.claude,
        codex: typeof own('codex') === 'boolean' ? (own('codex') as boolean) : current.codex,
        notifications: typeof own('notifications') === 'boolean' ? (own('notifications') as boolean) : current.notifications,
        updateCheck: typeof own('updateCheck') === 'boolean' ? (own('updateCheck') as boolean) : current.updateCheck,
        speed: isSpeed(own('speed')) ? (own('speed') as Speed) : current.speed
    }
}

export const parseSettings = (raw: unknown): Settings => mergeSettings(DEFAULT_SETTINGS, raw)
