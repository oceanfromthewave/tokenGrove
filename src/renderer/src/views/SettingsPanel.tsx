import {SPEED_NAME, type Speed} from '../../../shared/settings'
import {useSettings} from '../usePet'

const SPEEDS: Speed[] = ['slow', 'normal', 'fast']

// 연동 상태(도구별로 로그를 찾았는지)와 설정. 설정은 바로 저장되고 모든 창에 적용된다.
function SettingsPanel({tools}: { tools: { claude: number; codex: number } }): React.JSX.Element {
    const [settings, update] = useSettings()

    const toolRow = (key: 'claude' | 'codex', name: string): React.JSX.Element => {
        const files = tools[key]
        return (
            <label className="set-row">
                <span>
                    <b>{name}</b>
                    <small className={files > 0 ? 'ok' : 'warn'}>
                        {files > 0 ? `연동됨 · 로그 ${files}개` : '로그를 찾지 못했어요 (설치하지 않았거나 아직 쓴 적이 없어요)'}
                    </small>
                </span>
                <input type="checkbox" checked={settings[key]} onChange={(e) => update({[key]: e.target.checked})}/>
            </label>
        )
    }

    return (
        <div className="settings">
            {toolRow('claude', 'Claude Code')}
            {toolRow('codex', 'Codex')}
            <label className="set-row">
                <span>
                    <b>알림</b>
                    <small>단계가 바뀌거나 식물을 완성했을 때</small>
                </span>
                <input type="checkbox" checked={settings.notifications} onChange={(e) => update({notifications: e.target.checked})}/>
            </label>
            <label className="set-row">
                <span>
                    <b>업데이트 확인</b>
                    <small>새 버전이 있는지 GitHub에 물어봐요 (사용 기록은 보내지 않아요)</small>
                </span>
                <input type="checkbox" checked={settings.updateCheck} onChange={(e) => update({updateCheck: e.target.checked})}/>
            </label>
            <div className="set-row">
                <span>
                    <b>성장 속도</b>
                    <small>사용량이 적으면 빠르게, 많으면 느리게</small>
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
