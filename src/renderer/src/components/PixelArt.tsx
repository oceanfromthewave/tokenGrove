// 글자 격자(rows)와 색 표(colors)로 도트 그림을 그린다. '.'이나 색 표에 없는 글자는 투명.
function PixelArt({rows, colors, scale}: {
    rows: string[]
    colors: Record<string, string>
    scale: number
}): React.JSX.Element {
    const w = Math.max(...rows.map((r) => r.length))
    return (
        <svg width={w * scale} height={rows.length * scale} viewBox={`0 0 ${w} ${rows.length}`} shapeRendering="crispEdges">
            {rows.flatMap((row, y) =>
                [...row].map((ch, x) =>
                    colors[ch] ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={colors[ch]}/> : null
                )
            )}
        </svg>
    )
}

export default PixelArt
