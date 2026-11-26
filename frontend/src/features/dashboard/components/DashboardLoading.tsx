const metricSkeletons = ['camera-total', 'camera-online', 'camera-offline', 'detections', 'active', 'resolved']

export function DashboardLoading() {
  return (
    <div aria-label="Loading mock dashboard data" className="space-y-5" role="status">
      <span className="sr-only">Loading dashboard</span>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 2xl:grid-cols-6">
        {metricSkeletons.map((item) => (
          <div
            className="h-36 animate-pulse rounded-2xl border border-slate-800/80 bg-command-900/70 p-5"
            key={item}
          >
            <div className="h-3 w-24 rounded bg-slate-800" />
            <div className="mt-4 h-8 w-14 rounded bg-slate-800/80" />
            <div className="mt-5 h-2.5 w-32 rounded bg-slate-800/60" />
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(22rem,0.85fr)]">
        <div className="h-[26rem] animate-pulse rounded-2xl border border-slate-800/80 bg-command-900/70" />
        <div className="h-[26rem] animate-pulse rounded-2xl border border-slate-800/80 bg-command-900/70" />
      </div>
      <div className="h-64 animate-pulse rounded-2xl border border-slate-800/80 bg-command-900/70" />
    </div>
  )
}
