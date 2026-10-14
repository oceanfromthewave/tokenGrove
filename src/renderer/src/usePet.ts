import {useEffect, useState} from 'react'
import {INITIAL_PET} from '../../shared/growth'
import {EMPTY_STATS} from '../../shared/stats'
import type {AppState} from '../../preload/index'
import type {CollectStatus} from '../../shared/usage'

// main이 가진 상태(현재 펫 + 정원 보관 목록)를 읽고, 변경될 때마다 갱신한다.
export function useGame(): AppState & { loaded: boolean } {
    const [state, setState] = useState<AppState>({pet: INITIAL_PET, collection: [], stats: EMPTY_STATS})
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
    const [status, setStatus] = useState<CollectStatus>({lastCheckedAt: null, gainedXp: 0})
    useEffect(() => {
        window.api.getStatus().then(setStatus)
        return window.api.onStatusChanged(setStatus)
    }, [])
    return status
}
