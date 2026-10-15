import {useState} from 'react'
import {tr} from '../../../shared/i18n'
import {GOALS, SPEED_NAME, type Speed} from '../../../shared/settings'
import {useSettings} from '../usePet'

const SPEEDS: Speed[] = ['slow', 'normal', 'fast']

// 연동 상태(도구별로 로그를 찾았는지)와 설정. 설정은 바로 저장되고 모든 창에 적용된다.
function SettingsPanel({tools}: { tools: { claude: number; codex: number } }): React.JSX.Element {
    const [settings, update] = useSettings()
    const [note, setNote] = useState('')
    const run = async (job: 'export' | 'import'): Promise<void> => {
        const result = await (job === 'export' ? window.api.exportData() : window.api.importData())
        setNote(result === 'saved' ? tr('데이터를 내보냈어요') : result === 'loaded' ? tr('데이터를 불러왔어요') : result === 'error' ? tr('파일을 처리하지 못했어요') : '')
        if (result !== 'canceled') setTimeout(() => setNote(''), 3000)
    }

    const toolRow = (key: 'claude' | 'codex', name: string): React.JSX.Element => {
        const files = tools[key]
        return (
            <label className="set-row">
                <span>
                    <b>{name}</b>
                    <small className={files > 0 ? 'ok' : 'warn'}>
                        {files > 0 ? tr('연동됨 · 로그 {n}개', {n: files}) : tr('로그를 찾지 못했어요 (설치하지 않았거나 아직 쓴 적이 없어요)')}
                    </small>
                </span>
                <input type="checkbox" checked={settings[key]} onChange={(e) => update({[key]: e.target.checked})}/>
            </label>
        )
    }

    return (
        <div className="settings">
            <div className="set-row">
                <span>
                    <b>{tr('언어')}</b>
                    <small>Language</small>
                </span>
                <div className="seg">
                    {(['auto', 'ko', 'en'] as const).map((l) => (
                        <button key={l} className={settings.language === l ? 'on' : ''} onClick={() => update({language: l})}>
                            {l === 'auto' ? tr('자동') : l === 'ko' ? '한국어' : 'English'}
                        </button>
                    ))}
                </div>
            </div>
            {toolRow('claude', 'Claude Code')}
            {toolRow('codex', 'Codex')}
            <label className="set-row">
                <span>
                    <b>{tr('알림')}</b>
                    <small>{tr('단계가 바뀌거나 식물을 완성했을 때')}</small>
                </span>
                <input type="checkbox" checked={settings.notifications} onChange={(e) => update({notifications: e.target.checked})}/>
            </label>
            <label className="set-row">
                <span>
                    <b>{tr('업데이트 확인')}</b>
                    <small>{tr('새 버전이 있는지 GitHub에 물어봐요 (사용 기록은 보내지 않아요)')}</small>
                </span>
                <input type="checkbox" checked={settings.updateCheck} onChange={(e) => update({updateCheck: e.target.checked})}/>
            </label>
            <div className="set-row">
                <span>
                    <b>{tr('데이터 옮기기')}</b>
                    <small>{note || tr('펫, 도감, 통계, 설정을 파일로 내보내고 다른 PC에서 불러와요')}</small>
                </span>
                <div className="seg">
                    <button onClick={() => void run('export')}>{tr('내보내기')}</button>
                    <button onClick={() => void run('import')}>{tr('불러오기')}</button>
                </div>
            </div>
            <div className="set-row">
                <span>
                    <b>{tr('하루 목표')}</b>
                    <small>{tr('오늘 모을 경험치 (달성하면 펫이 축하해요)')}</small>
                </span>
                <div className="seg">
                    {GOALS.map((g) => (
                        <button key={g} className={settings.dailyGoal === g ? 'on' : ''} onClick={() => update({dailyGoal: g})}>
                            {g === 0 ? tr('끔') : g}
                        </button>
                    ))}
                </div>
            </div>
            <div className="set-row">
                <span>
                    <b>{tr('성장 속도')}</b>
                    <small>{tr('사용량이 적으면 빠르게, 많으면 느리게')}</small>
                </span>
                <div className="seg">
                    {SPEEDS.map((sp) => (
                        <button key={sp} className={settings.speed === sp ? 'on' : ''} onClick={() => update({speed: sp})}>
                            {SPEED_NAME[sp]}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default SettingsPanel
