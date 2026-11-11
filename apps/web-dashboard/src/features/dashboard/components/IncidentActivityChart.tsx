import { Activity } from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card } from '../../../components/ui/Card'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { IncidentActivityPoint } from '../dashboardData'

interface IncidentActivityChartProps {
  data: readonly IncidentActivityPoint[]
}

export function IncidentActivityChart({ data }: IncidentActivityChartProps) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-800/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-lg border border-cyan-400/15 bg-cyan-400/10 text-cyan-300">
            <Activity aria-hidden="true" className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Incident activity</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Hourly activity for the current mock shift
            </p>
          </div>
        </div>
        <StatusBadge tone="slate">6-hour view</StatusBadge>
      </div>

      <div className="px-2 pt-6 pb-3 sm:px-4">
        {data.length > 0 ? (
          <div
            aria-label="Chart of mock incident activity by hour"
            className="h-[17.5rem] w-full"
            role="img"
          >
            <ResponsiveContainer height="100%" width="100%">
              <AreaChart
                data={[...data]}
                margin={{ bottom: 0, left: -18, right: 10, top: 8 }}
              >
                <defs>
                  <linearGradient id="incident-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient id="resolved-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="#1e293b"
                  strokeDasharray="3 5"
                  vertical={false}
                />
                <XAxis
                  axisLine={false}
                  dataKey="hour"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickLine={false}
                  tickMargin={12}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickLine={false}
                  width={38}
                />
                <Tooltip
                  contentStyle={{
                    background: '#0a1726',
                    border: '1px solid #334155',
                    borderRadius: '10px',
                    boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
                    color: '#e2e8f0',
                    fontSize: '12px',
                  }}
                  cursor={{ stroke: '#475569', strokeDasharray: '4 4' }}
                  itemStyle={{ color: '#cbd5e1' }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '6px' }}
                />
                <Area
                  dataKey="incidents"
                  fill="url(#incident-fill)"
                  name="Incidents"
                  stroke="#22d3ee"
                  strokeWidth={2.25}
                  type="monotone"
                />
                <Area
                  dataKey="resolved"
                  fill="url(#resolved-fill)"
                  name="Resolved"
                  stroke="#34d399"
                  strokeWidth={2}
                  type="monotone"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="grid h-[17.5rem] place-items-center text-sm text-slate-500">
            No mock incident activity is available.
          </div>
        )}

        <div className="flex items-center justify-center gap-5 border-t border-slate-800/60 pt-3 text-[0.6875rem] text-slate-500">
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-cyan-400" />
            Incidents
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-400" />
            Resolved
          </span>
        </div>
      </div>
    </Card>
  )
}
