import {useEffect, useState} from 'react'
import {INITIAL_PET} from '../../shared/growth'
import {EMPTY_STATS} from '../../shared/stats'
import type {AppState} from '../../preload/index'
import {DEFAULT_SETTINGS, type Settings} from '../../shared/settings'
import type {CollectStatus} from '../../shared/usage'

// main이 가진 상태(현재 펫 + 정원 보관 목록)를 읽고, 변경될 때마다 갱신한다.
export function useGame(): AppState & { loaded: boolean } {
    const [state, setState] = useState<AppState>({pet: INITIAL_PET, collection: [], stats: EMPTY_STATS, onboarded: true})
    const [loaded, setLoaded] = useState(false)
    useEffect(() => {
        const apply = (s: AppState): void => {
            setState(s)
            setLoaded(true)
        }
        window.api.getState().then(apply)
        return window.api.onStateChanged(apply)
    }, [])
    return {...state, loaded}
}

// 로그 수집 상태(마지막 확인 시각, 이번 실행에서 얻은 경험치)를 받는다.
export function useStatus(): CollectStatus {
    const [status, setStatus] = useState<CollectStatus>({lastCheckedAt: null, gainedXp: 0, tools: {claude: 0, codex: 0}, error: null})
    useEffect(() => {
        window.api.getStatus().then(setStatus)
        return window.api.onStatusChanged(setStatus)
    }, [])
    return status
}

// 사용자 설정을 읽고, 바꿀 수 있다. 바뀐 값은 모든 창에 전달된다.
export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
    useEffect(() => {
        window.api.getSettings().then(setSettings)
        return window.api.onSettingsChanged(setSettings)
    }, [])
    return [settings, (patch) => void window.api.setSettings(patch)]
}
