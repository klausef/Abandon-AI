import { AlertTriangle, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Dialog } from '../../../components/ui/Dialog'
import type { Area } from '../../../types'

interface DeleteAreaDialogProps {
  area: Area
  assignedCameraCount: number
  onClose: () => void
  onConfirm: (area: Area) => Promise<void>
  open: boolean
}

export function DeleteAreaDialog({
  area,
  assignedCameraCount,
  onClose,
  onConfirm,
  open,
}: DeleteAreaDialogProps) {
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const isInUse = assignedCameraCount > 0

  async function handleDelete() {
    setIsDeleting(true)
    setError(null)
    try {
      await onConfirm(area)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'The area could not be deleted.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog
      description={isInUse ? 'This area is still assigned to cameras.' : 'This removes the demo area from the in-memory catalog.'}
      onClose={onClose}
      open={open}
      title={isInUse ? 'Area Cannot Be Deleted' : 'Delete Area'}
    >
      <div className="p-5 sm:p-6">
        <div className={`flex gap-3 rounded-xl border p-4 ${isInUse ? 'border-amber-400/20 bg-amber-400/5' : 'border-rose-400/20 bg-rose-400/5'}`}>
          <AlertTriangle className={`mt-0.5 size-4 shrink-0 ${isInUse ? 'text-amber-300' : 'text-rose-300'}`} />
          <div className="text-sm leading-6 text-slate-300">
            {isInUse ? (
              <p><strong>{area.name}</strong> has {assignedCameraCount} assigned {assignedCameraCount === 1 ? 'camera' : 'cameras'}. Reassign or delete those cameras first.</p>
            ) : (
              <p>Delete <strong>{area.name}</strong> ({area.id})? This action affects mock data only.</p>
            )}
          </div>
        </div>
        {error ? <p className="mt-3 rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-200" role="alert">{error}</p> : null}
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-800 px-5 py-4 sm:px-6">
        <Button disabled={isDeleting} onClick={onClose} variant="secondary">{isInUse ? 'Close' : 'Cancel'}</Button>
        {!isInUse ? <Button disabled={isDeleting} onClick={() => void handleDelete()} variant="danger"><Trash2 className="size-4" />{isDeleting ? 'Deleting…' : 'Delete Area'}</Button> : null}
      </div>
    </Dialog>
  )
}
