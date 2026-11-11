import { ShieldCheck, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { navigationItems } from '../../app/navigation'
import { useMockAuth } from '../../features/users/auth/useMockAuth'
import { Button } from '../ui/Button'
import { StatusBadge } from '../ui/StatusBadge'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { can, currentUser, selectUser, users } = useMockAuth()
  const visibleItems = navigationItems.filter(
    (item) => !item.permission || can(item.permission),
  )
  return (
    <>
      <button
        aria-label="Close navigation"
        className={`fixed inset-0 z-40 bg-slate-950/75 backdrop-blur-sm transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
        type="button"
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[17.5rem] flex-col border-r border-slate-800/90 bg-command-950/95 shadow-2xl shadow-black/30 backdrop-blur-xl transition-transform duration-200 lg:translate-x-0 lg:shadow-none ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-[4.75rem] items-center gap-3 border-b border-slate-800/80 px-5">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.08)]">
            <ShieldCheck aria-hidden="true" className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold tracking-wide text-slate-50">
              Public Space Safety
            </p>
            <p className="truncate text-[0.6875rem] font-medium tracking-[0.14em] text-slate-500 uppercase">
              Command Center
            </p>
          </div>
          <Button
            aria-label="Close navigation"
            className="lg:hidden"
            onClick={onClose}
            size="icon"
            variant="ghost"
          >
            <X aria-hidden="true" className="size-5" />
          </Button>
        </div>

        <div className="border-b border-slate-800/70 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[0.6875rem] font-semibold tracking-[0.15em] text-slate-500 uppercase">
              Environment
            </span>
            <StatusBadge dot tone="amber">
              Simulation
            </StatusBadge>
          </div>
        </div>

        <nav aria-label="Primary navigation" className="flex-1 overflow-y-auto px-3 py-5">
          <p className="mb-2 px-3 text-[0.625rem] font-bold tracking-[0.18em] text-slate-600 uppercase">
            Operations
          </p>
          <ul className="space-y-1">
            {visibleItems.map((item) => {
              const Icon = item.icon

              return (
                <li key={item.path}>
                  <NavLink
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? 'border-cyan-400/15 bg-cyan-400/10 text-cyan-200'
                          : 'border-transparent text-slate-400 hover:border-slate-800 hover:bg-slate-900/80 hover:text-slate-100'
                      }`
                    }
                    end={item.path === '/'}
                    onClick={onClose}
                    to={item.path}
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          aria-hidden="true"
                          className={`size-[1.125rem] shrink-0 transition-colors ${isActive ? 'text-cyan-300' : 'text-slate-500 group-hover:text-slate-300'}`}
                        />
                        <span className="truncate">{item.label}</span>
                        {isActive ? (
                          <span className="ml-auto h-4 w-0.5 rounded-full bg-cyan-300" />
                        ) : null}
                      </>
                    )}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="border-t border-slate-800/80 p-4">
          <div className="mb-3 rounded-xl border border-cyan-400/10 bg-cyan-400/5 p-3">
            <p className="truncate text-xs font-semibold text-slate-200">{currentUser.fullName}</p>
            <p className="mt-1 text-[0.625rem] text-cyan-300">{currentUser.role} · SIMULATED</p>
            <label className="mt-2 block lg:hidden">
              <span className="sr-only">Simulated current user</span>
              <select
                className="h-8 w-full rounded border border-slate-700 bg-slate-950/60 px-2 text-[0.6875rem] text-slate-300"
                onChange={(event) => selectUser(event.target.value)}
                value={currentUser.id}
              >
                {users.filter((user) => user.status === 'Active').map((user) => (
                  <option key={user.id} value={user.id}>{user.fullName} · {user.role}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-30" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
              </span>
              Interface operational
            </div>
            <p className="mt-1.5 text-[0.6875rem] leading-4 text-slate-500">
              Live cameras and AI processing are disabled.
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}
