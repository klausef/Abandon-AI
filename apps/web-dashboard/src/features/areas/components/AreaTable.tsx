import { Edit3, MapPinned, Trash2 } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import type { Area, Camera } from '../../../types'
import { formatDateTime } from '../../../utils/formatters'

interface AreaTableProps {
  areas: readonly Area[]
  cameras: readonly Camera[]
  canManage: boolean
  onDelete: (area: Area) => void
  onEdit: (area: Area) => void
}

export function AreaTable({
  areas,
  cameras,
  canManage,
  onDelete,
  onEdit,
}: AreaTableProps) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Demo Areas</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Reusable public-space references for identifying camera coverage
          </p>
        </div>
        <span className="self-start rounded border border-amber-400/20 bg-amber-400/10 px-2 py-1 font-mono text-[0.625rem] font-bold tracking-[0.14em] text-amber-300 sm:self-auto">
          MOCK REFERENCE DATA
        </span>
      </div>

      <div className="border-b border-amber-400/10 bg-amber-400/5 px-5 py-3 text-xs leading-5 text-amber-100/70 sm:px-6">
        These names represent generic demo areas in Valencia City, Bukidnon. They do not claim that a camera is installed at any real location.
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[62rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/25">
              {['Area ID', 'Area Name', 'City / Province', 'Assigned Cameras', 'Description', 'Updated', 'Actions'].map((heading) => (
                <th className="px-4 py-3 text-[0.625rem] font-bold tracking-[0.12em] text-slate-500 uppercase first:pl-6 last:pr-6" key={heading}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {areas.map((area) => {
              const cameraCount = cameras.filter((camera) => camera.areaId === area.id).length
              return (
                <tr className="transition-colors hover:bg-slate-900/40" key={area.id}>
                  <td className="px-4 py-4 pl-6"><span className="font-mono text-xs font-bold text-cyan-300">{area.id}</span></td>
                  <td className="max-w-48 px-4 py-4 text-xs font-semibold text-slate-200">{area.name}</td>
                  <td className="px-4 py-4 text-xs text-slate-400"><span>{area.city}</span><span className="mt-1 block text-[0.625rem] text-slate-600">{area.province}</span></td>
                  <td className="px-4 py-4"><span className="rounded-full border border-cyan-400/15 bg-cyan-400/8 px-2.5 py-1 text-[0.625rem] font-semibold text-cyan-200">{cameraCount} {cameraCount === 1 ? 'camera' : 'cameras'}</span></td>
                  <td className="max-w-72 px-4 py-4 text-xs leading-5 text-slate-500">{area.description || 'No description provided.'}</td>
                  <td className="px-4 py-4 text-[0.6875rem] whitespace-nowrap text-slate-500">{formatDateTime(area.updatedAt)}</td>
                  <td className="px-4 py-4 pr-6">
                    {canManage ? (
                      <div className="flex justify-end gap-1">
                        <button aria-label={`Edit ${area.name}`} className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-800 hover:text-cyan-300" onClick={() => onEdit(area)} type="button"><Edit3 aria-hidden="true" className="size-4" /></button>
                        <button aria-label={`Delete ${area.name}`} className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-rose-400/10 hover:text-rose-300" onClick={() => onDelete(area)} type="button"><Trash2 aria-hidden="true" className="size-4" /></button>
                      </div>
                    ) : <span className="text-[0.625rem] text-slate-600">Read only</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-slate-800/70 lg:hidden">
        {areas.map((area) => {
          const cameraCount = cameras.filter((camera) => camera.areaId === area.id).length
          return (
            <article className="p-4 sm:p-5" key={area.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="font-mono text-xs font-bold text-cyan-300">{area.id}</span>
                  <h3 className="mt-1.5 text-sm font-semibold text-slate-100">{area.name}</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><MapPinned aria-hidden="true" className="size-3" />{area.city}, {area.province}</p>
                </div>
                <span className="rounded-full border border-cyan-400/15 bg-cyan-400/8 px-2.5 py-1 text-[0.625rem] text-cyan-200">{cameraCount} {cameraCount === 1 ? 'camera' : 'cameras'}</span>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">{area.description || 'No description provided.'}</p>
              {canManage ? (
                <div className="mt-4 flex justify-end gap-2 border-t border-slate-800/70 pt-3">
                  <button className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-cyan-300" onClick={() => onEdit(area)} type="button"><Edit3 className="size-3.5" />Edit</button>
                  <button className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:bg-rose-400/10 hover:text-rose-300" onClick={() => onDelete(area)} type="button"><Trash2 className="size-3.5" />Delete</button>
                </div>
              ) : null}
            </article>
          )
        })}
      </div>
    </Card>
  )
}
