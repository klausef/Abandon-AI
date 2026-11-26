import { LockKeyhole } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../../../components/ui/Card'
import type { Permission } from '../permissions'
import { useMockAuth } from './useMockAuth'

export function RequirePermission({
  children,
  permission,
}: {
  children: ReactNode
  permission: Permission
}) {
  const { can, currentUser } = useMockAuth()
  if (can(permission)) return children

  return (
    <div className="grid min-h-[60vh] place-items-center">
      <Card className="max-w-lg p-8 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-xl border border-rose-400/20 bg-rose-400/10 text-rose-300">
          <LockKeyhole className="size-5" />
        </div>
        <h1 className="mt-5 text-xl font-semibold text-slate-100">Access denied</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          The simulated {currentUser.role} role does not have permission to access this route.
        </p>
        <p className="mt-3 font-mono text-[0.625rem] font-bold tracking-wider text-amber-300">SIMULATED FRONTEND AUTHORIZATION</p>
        <Link className="mt-5 inline-flex rounded-lg bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950" to="/">Return to dashboard</Link>
      </Card>
    </div>
  )
}
