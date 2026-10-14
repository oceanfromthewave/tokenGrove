import {app} from 'electron'
import {readFileSync, renameSync, writeFileSync} from 'fs'
import {join} from 'path'
import {EMPTY_SAVE, parseSave, type SaveData} from '../shared/save'

const savePath = (): string => join(app.getPath('userData'), 'save.json')

export function loadSave(): SaveData {
    try {
        return parseSave(readFileSync(savePath(), 'utf8'))
    } catch {
        return EMPTY_SAVE // 첫 실행 등 파일이 없을 때
    }
}

// 임시 파일에 쓴 뒤 이름을 바꿔서, 쓰는 도중 종료돼도 기존 저장 파일이 깨지지 않게 한다.
export function writeSave(data: SaveData): void {
    try {
        const tmp = savePath() + '.tmp'
        writeFileSync(tmp, JSON.stringify(data))
        renameSync(tmp, savePath())
    } catch (e) {
        console.error('저장 실패:', e instanceof Error ? e.message : e)
    }
}
