import {contextBridge, ipcRenderer} from 'electron'
import type {Completed, PetState} from '../shared/growth'
import type {Stats} from '../shared/stats'
import type {Settings} from '../shared/settings'
import type {CollectStatus} from '../shared/usage'

export interface AppState {
    pet: PetState
    collection: Completed[]
    stats: Stats
    onboarded: boolean
}

// 렌더러에 노출할 기능은 여기 적힌 것뿐이다. (ipcRenderer 자체는 노출하지 않는다)
const api = {
    getState: (): Promise<AppState> => ipcRenderer.invoke('state:get'),
    setPetName: (name: string): Promise<AppState> => ipcRenderer.invoke('pet:setName', name),
    addTestXp: (): Promise<AppState> => ipcRenderer.invoke('pet:addTestXp'),
    getStatus: (): Promise<CollectStatus> => ipcRenderer.invoke('status:get'),
    onStatusChanged: (cb: (s: CollectStatus) => void): (() => void) => {
        const handler = (_: unknown, s: CollectStatus): void => cb(s)
        ipcRenderer.on('status:changed', handler)
        return () => ipcRenderer.removeListener('status:changed', handler)
    },
    getSettings: (): Promise<Settings> => ipcRenderer.invoke('settings:get'),
    setSettings: (patch: Partial<Settings>): Promise<Settings> => ipcRenderer.invoke('settings:set', patch),
    onSettingsChanged: (cb: (s: Settings) => void): (() => void) => {
        const handler = (_: unknown, s: Settings): void => cb(s)
        ipcRenderer.on('settings:changed', handler)
        return () => ipcRenderer.removeListener('settings:changed', handler)
    },
    exportGarden: (rect: { x: number; y: number; width: number; height: number }): Promise<'saved' | 'canceled' | 'error'> =>
        ipcRenderer.invoke('garden:export', rect),
    markOnboarded: (): Promise<void> => ipcRenderer.invoke('onboarding:done'),
    exportData: (): Promise<'saved' | 'canceled' | 'error'> => ipcRenderer.invoke('data:export'),
    importData: (): Promise<'loaded' | 'canceled' | 'error'> => ipcRenderer.invoke('data:import'),
    resetData: (): Promise<'reset' | 'canceled' | 'error'> => ipcRenderer.invoke('data:reset'),
    appVersion: (): Promise<string> => ipcRenderer.invoke('app:version'),
    dragStart: (): void => ipcRenderer.send('pet:dragStart'),
    dragMove: (dx: number, dy: number): void => ipcRenderer.send('pet:dragMove', dx, dy),
    dragEnd: (): void => ipcRenderer.send('pet:dragEnd'),
    openGarden: (): void => ipcRenderer.send('garden:open'),
    onStateChanged: (cb: (state: AppState) => void): (() => void) => {
        const handler = (_: unknown, state: AppState): void => cb(state)
        ipcRenderer.on('state:changed', handler)
        return () => ipcRenderer.removeListener('state:changed', handler)
    }
}

contextBridge.exposeInMainWorld('api', api)

export type PetApi = typeof api
