import { useEffect, useRef, useState } from 'react'
import type { DocumentItem } from '../lib/types'

type Kind = 'bar' | 'pie' | 'line'
interface Result {
  filename: string; sheet: string; query: string; chart_type: Kind
  label_column: string; value_column: string; aggregation: string; order: string
  matched_rows: number; skipped_rows: number; total_points: number
  filters: { column: string; operator: string; value: unknown }[]
  points: { label: string; value: number; rows: number[] }[]
}
const colors = ['#7057df', '#2196cf', '#d96b21', '#229568', '#c64a89', '#9a7b20']
function Chart({ result }: { result: Result }) {
  const { points, chart_type: kind } = result
  const low = Math.min(0, ...points.map(p => p.value)), high = Math.max(0, ...points.map(p => p.value))
  const y = (v: number) => 300 - (v - low) / (high - low || 1) * 260
  const x = (i: number) => 85 + i * 630 / Math.max(1, points.length - 1)
  const total = points.reduce((n, p) => n + p.value, 0)
  let angle = -Math.PI / 2
  return <svg viewBox="0 0 800 400" role="img" aria-label={`${kind} chart of ${result.value_column} by ${result.label_column}. Exact values in the table below.`}>
    {kind === 'pie' ? points.map((p, i) => {
      const start = angle; angle += p.value / total * Math.PI * 2
      if (!p.value) return null
      const end = angle
      const path = `M 400 185 L ${400 + 140 * Math.cos(start)} ${185 + 140 * Math.sin(start)} A 140 140 0 ${end-start > Math.PI ? 1 : 0} 1 ${400 + 140 * Math.cos(end)} ${185 + 140 * Math.sin(end)} Z`
      return <g key={i}><title>{p.label}: {p.value} ({(100*p.value/total).toFixed(1)}%)</title>
        {p.value === total ? <circle cx="400" cy="185" r="140" fill={colors[i%colors.length]} /> : <path d={path} fill={colors[i%colors.length]} stroke="white" />}</g>
    }) : <>
      {[0, 1, 2, 3, 4].map(i => { const v = low + (high-low)*i/4; return <g key={i}><line x1="70" x2="735" y1={y(v)} y2={y(v)} stroke="currentColor" opacity=".15" /><text x="65" y={y(v)+4} textAnchor="end" fontSize="11" fill="currentColor">{Number(v.toPrecision(4))}</text></g> })}
      <line x1="70" x2="735" y1={y(0)} y2={y(0)} stroke="currentColor" />
      {kind === 'line' && <polyline fill="none" stroke={colors[0]} strokeWidth="3" points={points.map((p,i) => `${x(i)},${y(p.value)}`).join(' ')} />}
      {points.map((p,i) => <g key={i}><title>{p.label}: {p.value}</title>
        {kind === 'bar' ? <rect x={x(i)-Math.min(30,500/points.length)/2} y={Math.min(y(0),y(p.value))} width={Math.min(30,500/points.length)} height={Math.abs(y(0)-y(p.value))} fill={colors[i%colors.length]} /> : <circle cx={x(i)} cy={y(p.value)} r="4" fill={colors[0]} />}
        <text transform={`translate(${x(i)},320) rotate(35)`} fontSize="10" fill="currentColor">{p.label.length>16 ? p.label.slice(0,16)+'…' : p.label}</text>
      </g>)}
    </>}
    <text x="400" y="393" textAnchor="middle" fill="currentColor" fontSize="12">{result.label_column} / {result.value_column}</text>
  </svg>
}
export function SpreadsheetAnalysisPage({ documents }: { documents: DocumentItem[] }) {
  const [id,setId] = useState(''), [query,setQuery] = useState('')
  const [kind,setKind] = useState<Kind>('bar')
  const [result,setResult] = useState<Result | null>(null)
  const [busy,setBusy] = useState(false), [error,setError] = useState('')
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])
  const clear = () => { request.current?.abort(); request.current=null; setBusy(false); setError(''); setResult(null) }
  const excel = documents.filter(d => d.filename.toLowerCase().endsWith('.xlsx'))
  const ready = excel.some(d => d.id === id && d.status === 'ready')
  const generate = async () => {
    if (!ready || !query.trim()) return
    clear(); const controller = new AbortController(); request.current = controller; setBusy(true)
    try {
      const response = await fetch('/api/spreadsheet/visualize', {method:'POST', headers:{'Content-Type':'application/json'}, signal:controller.signal, body:JSON.stringify({document_id:id,query,chart_type:kind})})
      const data = await response.json()
      if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Could not generate chart.')
      if (!controller.signal.aborted) setResult(data)
    } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Chart generation failed.') }
    finally { if (!controller.signal.aborted) setBusy(false) }
  }
  return <section className="reports-page">
    <p>Select an Excel workbook and describe what to visualize, including column names and any calculation.</p>
    <form className="report-controls" onSubmit={e => {e.preventDefault(); void generate()}}>
      <label>Excel file<select value={id} onChange={e => {clear();setId(e.target.value)}}><option value="">Choose an Excel file</option>{excel.map(d => <option key={d.id} value={d.id} disabled={d.status !== 'ready'}>{d.filename}{d.status !== 'ready' ? ` (${d.status})` : ''}</option>)}</select></label>
      {!excel.length && <p>Upload an XLSX workbook from <a href="#/documents">Documents & uploads</a> first.</p>}
      <label>Visualization<select value={kind} onChange={e => {clear();setKind(e.target.value as Kind)}}><option value="bar">Bar chart</option><option value="pie">Pie chart</option><option value="line">Line chart</option></select></label>
      <label>Your question<textarea rows={3} maxLength={2000} value={query} onChange={e => {clear();setQuery(e.target.value)}} placeholder="For example: Show average CO5 (100) by student name, or total emissions by factory." /></label>
      <button className="btn btn-ghost" disabled={!ready || !query.trim() || busy}>{busy ? 'Analyzing workbook…' : 'Generate visualization'}</button>
    </form>
    {busy && <p role="status">Llama is planning the chart. Worksheet values will be calculated by the server.</p>}
    {error && <p className="docs-error" role="alert">{error}</p>}
    {result && ready && <section className="chart-results"><h2>{result.filename} — {result.sheet}</h2><p>{result.query}</p>
      <p>{result.aggregation} · {result.value_column} by {result.label_column} · {result.matched_rows} matching rows · {result.skipped_rows} blank/nonnumeric rows skipped.</p>
      <p>Showing {result.points.length} of {result.total_points} points. Order: {result.order === 'source' ? 'worksheet order' : `value ${result.order}`}.</p>
      {!!result.filters.length && <p>Filters: {result.filters.map(f => `${f.column} ${f.operator} ${String(f.value ?? '')}`).join('; ')}</p>}
      <Chart result={result} />
      {result.chart_type === 'pie' && <p>Percentages are relative to the displayed values.</p>}
      <div className="extracted-table"><table><caption>Chart data and worksheet rows</caption><thead><tr><th>{result.label_column}</th><th>{result.value_column}</th><th>Excel rows</th></tr></thead><tbody>{result.points.map((p,i) => <tr key={i}><td><span style={{color:colors[i%colors.length]}}>● </span>{p.label}</td><td>{p.value}</td><td>{p.rows.join(', ')}</td></tr>)}</tbody></table></div>
    </section>}
  </section>
}
