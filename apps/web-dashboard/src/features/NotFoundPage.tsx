import { ArrowLeft, ShieldQuestion } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'

export function NotFoundPage() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <Card className="w-full max-w-lg p-7 text-center sm:p-10">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-slate-700 bg-slate-800/60 text-slate-400">
          <ShieldQuestion aria-hidden="true" className="size-6" />
        </div>
        <p className="mt-6 font-mono text-xs font-semibold tracking-[0.18em] text-cyan-400 uppercase">
          Error 404
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-100">Workspace not found</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          The requested command-center route does not exist or has not been configured.
        </p>
        <Link
          className="mt-7 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-cyan-400/20 bg-cyan-400 px-4 text-sm font-bold text-slate-950 transition-colors hover:bg-cyan-300"
          to="/"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Return to dashboard
        </Link>
      </Card>
    </div>
  )
}
