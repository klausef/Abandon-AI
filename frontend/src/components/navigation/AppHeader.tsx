import { Menu, RadioTower } from 'lucide-react'
import { Button } from '../ui/Button'
import { MockDataBadge } from '../ui/MockDataBadge'
import { useMockAuth } from '../../features/users/auth/useMockAuth'

interface AppHeaderProps {
  description: string
  onMenuOpen: () => void
  title: string
}

export function AppHeader({
  description,
  onMenuOpen,
  title,
}: AppHeaderProps) {
  const { currentUser, selectUser, users } = useMockAuth()
  return (
    <header className="sticky top-0 z-30 flex h-[4.75rem] items-center border-b border-slate-800/80 bg-command-950/80 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Button
          aria-label="Open navigation"
          className="lg:hidden"
          onClick={onMenuOpen}
          size="icon"
          variant="ghost"
        >
          <Menu aria-hidden="true" className="size-5" />
        </Button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-100 sm:text-base">
            {title}
          </p>
          <p className="hidden truncate text-xs text-slate-500 sm:block">
            {description}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <label className="hidden lg:block">
          <span className="sr-only">Simulated current user</span>
          <select
            aria-label="Simulated current user"
            className="h-9 max-w-52 rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-2 text-xs text-cyan-200 outline-none"
            onChange={(event) => selectUser(event.target.value)}
            value={currentUser.id}
          >
            {users.filter((user) => user.status === 'Active').map((user) => (
              <option key={user.id} value={user.id}>
                {user.fullName} · {user.role}
              </option>
            ))}
          </select>
        </label>
        <div className="hidden items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs text-slate-400 xl:flex">
          <RadioTower aria-hidden="true" className="size-3.5 text-slate-500" />
          No live feeds connected
        </div>
        <MockDataBadge />
      </div>
    </header>
  )
}
