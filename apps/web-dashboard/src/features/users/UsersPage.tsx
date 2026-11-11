import { Edit3, Plus, Power, Search, Trash2 } from 'lucide-react'
import { useMemo, useState, useSyncExternalStore, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Dialog } from '../../components/ui/Dialog'
import { MockDataBadge } from '../../components/ui/MockDataBadge'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { userService } from '../../services'
import type { UserAccount, UserInput, UserRole } from '../../types'
import { formatDateTime } from '../../utils/formatters'
import { useActivityLogs } from './hooks/useActivityLogs'
import { useMockAuth } from './auth/useMockAuth'

const roles: readonly UserRole[] = ['Administrator', 'Security Officer', 'Supervisor']
const emptyInput: UserInput = { fullName: '', email: '', badgeNumber: '', role: 'Security Officer' }
const control = 'mt-1.5 h-10 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 text-sm text-slate-200 outline-none focus:border-cyan-400/60'

function UserForm({ editing, onClose, onSave }: { editing: UserAccount | null; onClose: () => void; onSave: (input: UserInput) => Promise<void> }) {
  const [values, setValues] = useState<UserInput>(() => editing ? { fullName: editing.fullName, email: editing.email, badgeNumber: editing.badgeNumber, role: editing.role } : emptyInput)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(null)
    try { await onSave(values) } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Unable to save user.'); setSaving(false) }
  }
  return <Dialog description="Mock account data only. No real authentication is enabled." onClose={onClose} open size="medium" title={editing ? 'Edit User' : 'Add User'}><form onSubmit={submit}><div className="grid gap-4 p-5 sm:grid-cols-2"><label className="text-xs text-slate-300">Full name<input className={control} onChange={(event) => setValues({ ...values, fullName: event.target.value })} value={values.fullName} /></label><label className="text-xs text-slate-300">Email<input className={control} onChange={(event) => setValues({ ...values, email: event.target.value })} type="email" value={values.email} /></label><label className="text-xs text-slate-300">Badge number<input className={control} onChange={(event) => setValues({ ...values, badgeNumber: event.target.value })} value={values.badgeNumber} /></label><label className="text-xs text-slate-300">Role<select className={control} onChange={(event) => setValues({ ...values, role: event.target.value as UserRole })} value={values.role}>{roles.map((role) => <option key={role}>{role}</option>)}</select></label>{error ? <p className="text-xs text-rose-300 sm:col-span-2" role="alert">{error}</p> : null}</div><div className="flex justify-end gap-2 border-t border-slate-800 p-4"><Button onClick={onClose} variant="secondary">Cancel</Button><Button disabled={saving} type="submit">{saving ? 'Saving…' : 'Save User'}</Button></div></form></Dialog>
}

export function UsersPage() {
  const auth = useMockAuth()
  const users = useSyncExternalStore(userService.subscribe, userService.getSnapshot, userService.getSnapshot)
  const logs = useActivityLogs()
  const [tab, setTab] = useState<'users' | 'logs'>('users')
  const [query, setQuery] = useState('')
  const [role, setRole] = useState<UserRole | 'All'>('All')
  const [status, setStatus] = useState<'All' | 'Active' | 'Inactive'>('All')
  const [editing, setEditing] = useState<UserAccount | null | undefined>(undefined)
  const [deleting, setDeleting] = useState<UserAccount | null>(null)
  const filtered = useMemo(() => users.filter((user) => {
    const search = query.toLowerCase()
    return (!search || [user.id, user.fullName, user.email, user.badgeNumber].some((value) => value.toLowerCase().includes(search))) && (role === 'All' || user.role === role) && (status === 'All' || user.status === status)
  }), [query, role, status, users])

  async function save(input: UserInput) {
    if (editing) await userService.updateUser(editing.id, input, auth.currentUser)
    else await userService.createUser(input, auth.currentUser)
    setEditing(undefined)
  }

  return <div className="space-y-6"><PageHeader action={<div className="flex gap-2"><MockDataBadge /><Button onClick={() => setEditing(null)}><Plus className="size-4" />Add User</Button></div>} description="Manage simulated accounts, roles, status, and frontend authorization." eyebrow="Simulated frontend authorization" title="User Management" />
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['Total Users', users.length], ['Active', users.filter((u) => u.status === 'Active').length], ['Security Officers', users.filter((u) => u.role === 'Security Officer').length], ['Supervisors', users.filter((u) => u.role === 'Supervisor').length]].map(([label, value]) => <Card className="p-4" key={label}><p className="text-2xl font-semibold text-slate-50">{value}</p><p className="text-xs text-slate-500">{label}</p></Card>)}</section>
    <div className="flex gap-2"><Button onClick={() => setTab('users')} size="small" variant={tab === 'users' ? 'primary' : 'secondary'}>Users</Button><Button onClick={() => setTab('logs')} size="small" variant={tab === 'logs' ? 'primary' : 'secondary'}>Activity Logs</Button></div>
    {tab === 'users' ? <><Card className="grid gap-3 p-4 md:grid-cols-[1fr_12rem_12rem]"><label className="relative"><Search className="absolute top-3 left-3 size-4 text-slate-500" /><span className="sr-only">Search users</span><input className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950/50 pl-9 pr-3 text-sm" onChange={(event) => setQuery(event.target.value)} placeholder="Search users" value={query} /></label><select className="h-10 rounded-lg border border-slate-700 bg-slate-950/50 px-3 text-sm" onChange={(event) => setRole(event.target.value as UserRole | 'All')} value={role}><option>All</option>{roles.map((item) => <option key={item}>{item}</option>)}</select><select className="h-10 rounded-lg border border-slate-700 bg-slate-950/50 px-3 text-sm" onChange={(event) => setStatus(event.target.value as 'All' | 'Active' | 'Inactive')} value={status}><option>All</option><option>Active</option><option>Inactive</option></select></Card>
      <Card className="overflow-x-auto"><table className="w-full min-w-[52rem] text-left text-xs"><thead className="bg-slate-950/30 text-slate-500"><tr>{['User', 'Email', 'Role', 'Status', 'Officer Link', 'Last Active', 'Actions'].map((head) => <th className="px-5 py-3" key={head}>{head}</th>)}</tr></thead><tbody>{filtered.map((user) => <tr className="border-t border-slate-800" key={user.id}><td className="px-5 py-3"><p className="font-semibold text-slate-200">{user.fullName}</p><p className="font-mono text-[0.625rem] text-cyan-300">{user.id} · MOCK</p></td><td className="px-5 py-3">{user.email}</td><td className="px-5 py-3">{user.role}</td><td className="px-5 py-3"><StatusBadge dot tone={user.status === 'Active' ? 'green' : 'slate'}>{user.status}</StatusBadge></td><td className="px-5 py-3 font-mono">{user.officerId ?? '—'}</td><td className="px-5 py-3">{formatDateTime(user.lastActiveAt)}</td><td className="px-5 py-3"><div className="flex gap-1"><button aria-label={`Edit ${user.fullName}`} className="p-2 text-cyan-300" onClick={() => setEditing(user)}><Edit3 className="size-4" /></button><button aria-label={`${user.status === 'Active' ? 'Deactivate' : 'Activate'} ${user.fullName}`} className="p-2 text-amber-300" disabled={user.id === auth.currentUser.id} onClick={() => void userService.toggleStatus(user.id, auth.currentUser)}><Power className="size-4" /></button><button aria-label={`Delete ${user.fullName}`} className="p-2 text-rose-300" disabled={user.id === auth.currentUser.id} onClick={() => setDeleting(user)}><Trash2 className="size-4" /></button></div></td></tr>)}</tbody></table>{!filtered.length ? <div className="p-10 text-center text-sm text-slate-500">No users match these filters.</div> : null}</Card></> : <Card className="overflow-hidden"><div className="border-b border-slate-800 px-5 py-4"><h2 className="text-sm font-semibold text-slate-200">System activity log</h2></div><div className="divide-y divide-slate-800">{logs.map((log) => <article className="px-5 py-3" key={log.id}><div className="flex justify-between gap-3"><p className="text-xs text-slate-300">{log.description}</p><span className="font-mono text-[0.5625rem] text-amber-300">MOCK</span></div><p className="mt-1 text-[0.625rem] text-slate-600">{log.actorName} · {formatDateTime(log.timestamp)} · {log.type}</p></article>)}</div></Card>}
    {editing !== undefined ? <UserForm editing={editing} onClose={() => setEditing(undefined)} onSave={save} /> : null}
    {deleting ? <Dialog description="This removes only the mock account." onClose={() => setDeleting(null)} open size="small" title="Delete User"><div className="p-5 text-sm text-slate-300">Delete <strong>{deleting.fullName}</strong> ({deleting.id})?</div><div className="flex justify-end gap-2 border-t border-slate-800 p-4"><Button onClick={() => setDeleting(null)} variant="secondary">Cancel</Button><Button onClick={async () => { await userService.deleteUser(deleting.id, auth.currentUser); setDeleting(null) }} variant="danger">Delete User</Button></div></Dialog> : null}
  </div>
}
