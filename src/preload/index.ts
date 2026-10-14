import {contextBridge, ipcRenderer} from 'electron'
import type {Completed, PetState} from '../shared/growth'
import type {CollectStatus} from '../shared/usage'

export interface AppState {
    pet: PetState
    collection: Completed[]
}

// 렌더러에 노출할 기능은 여기 적힌 것뿐이다. (ipcRenderer 자체는 노출하지 않는다)
const api = {
    getState: (): Promise<AppState> => ipcRenderer.invoke('state:get'),
    addTestXp: (): Promise<AppState> => ipcRenderer.invoke('pet:addTestXp'),
    getStatus: (): Promise<CollectStatus> => ipcRenderer.invoke('status:get'),
    onStatusChanged: (cb: (s: CollectStatus) => void): (() => void) => {
        const handler = (_: unknown, s: CollectStatus): void => cb(s)
        ipcRenderer.on('status:changed', handler)
        return () => ipcRenderer.removeListener('status:changed', handler)
    },
    openGarden: (): void => ipcRenderer.send('garden:open'),
    onStateChanged: (cb: (state: AppState) => void): (() => void) => {
        const handler = (_: unknown, state: AppState): void => cb(state)
        ipcRenderer.on('state:changed', handler)
        return () => ipcRenderer.removeListener('state:changed', handler)
    }
}

contextBridge.exposeInMainWorld('api', api)

export type PetApi = typeof api
