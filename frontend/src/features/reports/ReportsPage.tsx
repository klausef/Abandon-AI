import { Download, Printer } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { MockDataBadge } from '../../components/ui/MockDataBadge'
import { PageHeader } from '../../components/ui/PageHeader'
import { useCameraRecords } from '../../hooks/useCameraRecords'
import { useDetections } from '../detections/hooks/useDetections'
import { useIncidents } from '../incidents/hooks/useIncidents'
import {
  buildIncidentTrends,
  countBy,
  downloadCsv,
  filterReportData,
  incidentsToCsv,
  officerPerformance,
  type TrendGranularity,
} from './reportAnalytics'

function ChartCard({ title, data, color = '#22d3ee' }: { title: string; data: { name?: string; period?: string; value?: number; count?: number }[]; color?: string }) {
  return (
    <Card className="p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
      <div className="mt-4 h-60">
        {data.length ? <ResponsiveContainer height="100%" width="100%"><BarChart data={data}><CartesianGrid stroke="#1e293b" vertical={false} /><XAxis dataKey={data[0].period ? 'period' : 'name'} tick={{ fill: '#64748b', fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 10 }} /><Tooltip contentStyle={{ background: '#0a1726', border: '1px solid #334155' }} /><Bar dataKey={data[0].count !== undefined ? 'count' : 'value'} fill={color} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer> : <div className="grid h-full place-items-center text-xs text-slate-600">No data in selected range</div>}
      </div>
    </Card>
  )
}

export function ReportsPage() {
  const { cameras } = useCameraRecords()
  const { detections } = useDetections()
  const { incidents } = useIncidents()
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [granularity, setGranularity] = useState<TrendGranularity>('day')
  const filtered = useMemo(
    () => filterReportData(incidents, detections, start, end),
    [detections, end, incidents, start],
  )
  const online = cameras.filter((camera) => camera.status === 'Online').length
  const resolved = filtered.incidents.filter((item) => item.status === 'resolved').length
  const response = officerPerformance(filtered.incidents)

  return (
    <div className="space-y-6 print:bg-white print:text-black">
      <PageHeader action={<div className="flex gap-2 print:hidden"><MockDataBadge /><Button onClick={() => downloadCsv(incidentsToCsv(filtered.incidents), 'public-space-incidents.csv')} variant="secondary"><Download className="size-4" />CSV</Button><Button onClick={() => window.print()} variant="secondary"><Printer className="size-4" />Print</Button></div>} description="Analyze incident trends, camera availability, detections, and officer response performance." eyebrow="Operational intelligence" title="Reports & Analytics" />
      <Card className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5 print:hidden">
        <label className="text-xs text-slate-400">Start date<input className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 [color-scheme:dark]" onChange={(event) => setStart(event.target.value)} type="date" value={start} /></label>
        <label className="text-xs text-slate-400">End date<input className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 [color-scheme:dark]" onChange={(event) => setEnd(event.target.value)} type="date" value={end} /></label>
        <label className="text-xs text-slate-400">Trend period<select className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3" onChange={(event) => setGranularity(event.target.value as TrendGranularity)} value={granularity}><option value="day">Daily</option><option value="week">Weekly</option><option value="month">Monthly</option></select></label>
        <div className="lg:col-span-2 flex items-end text-xs text-slate-500">Report range includes {filtered.incidents.length} incidents and {filtered.detections.length} detections.</div>
      </Card>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[['Total Incidents', filtered.incidents.length], ['Resolved Incidents', resolved], ['Camera Availability', cameras.length ? `${Math.round((online / cameras.length) * 100)}%` : '0%'], ['Total Detections', filtered.detections.length]].map(([label, value]) => <Card className="p-5" key={label}><p className="text-2xl font-semibold text-slate-50">{value}</p><p className="mt-1 text-xs text-slate-500">{label}</p></Card>)}
      </section>
      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard data={buildIncidentTrends(filtered.incidents, granularity)} title={`Incident trends · ${granularity}`} />
        <ChartCard color="#a78bfa" data={countBy(filtered.incidents, (item) => item.objectType)} title="Incidents by object category" />
        <ChartCard color="#f59e0b" data={countBy(filtered.incidents, (item) => item.priority)} title="Incidents by priority" />
        <ChartCard color="#34d399" data={countBy(filtered.incidents, (item) => item.status)} title="Incidents by status" />
        <ChartCard color="#fb7185" data={countBy(filtered.incidents, (item) => item.areaName)} title="Incidents by demo area" />
        <ChartCard data={countBy(filtered.detections, (item) => item.objectClass)} title="Detection statistics" />
      </div>
      <Card className="overflow-hidden">
        <div className="border-b border-slate-800 px-5 py-4"><h2 className="text-sm font-semibold text-slate-200">Officer response performance</h2></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-950/30 text-slate-500"><tr><th className="px-5 py-3">Officer</th><th className="px-5 py-3">Assigned</th><th className="px-5 py-3">Resolved</th><th className="px-5 py-3">Avg. response</th></tr></thead><tbody>{response.map((item) => <tr className="border-t border-slate-800" key={item.officer}><td className="px-5 py-3 text-slate-200">{item.officer}</td><td className="px-5 py-3">{item.assigned}</td><td className="px-5 py-3">{item.resolved}</td><td className="px-5 py-3">{item.averageResponseMinutes} min</td></tr>)}</tbody></table></div>
      </Card>
    </div>
  )
}
