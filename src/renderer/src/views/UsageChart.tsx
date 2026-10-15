import {useState} from 'react'
import {formatXp} from '../../../shared/growth'
import {recentDays, type Stats} from '../../../shared/stats'

// 날짜별 경험치 막대 그래프. 7일/30일을 고를 수 있고, 오늘은 다른 색으로 보인다.
function UsageChart({stats}: { stats: Stats }): React.JSX.Element {
    const [n, setN] = useState<7 | 30>(7)
    const days = recentDays(stats, new Date(), n)
    const max = Math.max(1, ...days.map((d) => d.xp))
    const total = days.reduce((sum, d) => sum + d.xp, 0)

    return (
        <div className="chart">
            <div className="chart-head">
                <span>최근 {n}일 · 합계 {formatXp(total)} XP</span>
                <span className="seg">
                    {([7, 30] as const).map((v) => (
                        <button key={v} className={n === v ? 'on' : ''} onClick={() => setN(v)}>{v}일</button>
                    ))}
                </span>
            </div>
            <div className="bars">
                {days.map((d, i) => (
                    <div key={d.key} className="bar-col" title={`${d.key.slice(5)} · ${formatXp(d.xp)} XP`}>
                        <i className={i === days.length - 1 ? 'today' : ''} style={{height: `${(d.xp / max) * 100}%`}}/>
                    </div>
                ))}
            </div>
            <div className="chart-axis">
                <span>{days[0].key.slice(5)}</span>
                <span>오늘</span>
            </div>
        </div>
    )
}

export default UsageChart
