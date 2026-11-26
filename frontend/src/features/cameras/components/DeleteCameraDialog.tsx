import { Trash2, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Dialog } from '../../../components/ui/Dialog'
import type { Camera } from '../../../types'

interface DeleteCameraDialogProps {
  camera: Camera
  onClose: () => void
  onConfirm: (camera: Camera) => Promise<void>
  open: boolean
}

export function DeleteCameraDialog({
  camera,
  onClose,
  onConfirm,
  open,
}: DeleteCameraDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setIsDeleting(true)
    setError(null)

    try {
      await onConfirm(camera)
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'The camera could not be deleted.',
      )
      setIsDeleting(false)
    }
  }

  return (
    <Dialog
      description="This action removes the camera from the current mock session."
      onClose={() => {
        if (!isDeleting) onClose()
      }}
      open={open}
      size="small"
      title="Delete Camera"
    >
      <div className="p-5 sm:p-6">
        <div className="flex gap-4">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-rose-400/20 bg-rose-400/10 text-rose-300">
            <TriangleAlert aria-hidden="true" className="size-5" />
          </div>
          <div>
            <p className="text-sm leading-6 text-slate-300">
              Are you sure you want to delete{' '}
              <strong className="font-semibold text-slate-50">{camera.name}</strong>?
            </p>
            <p className="mt-2 font-mono text-xs font-bold text-cyan-300">
              {camera.id}{' '}
              <span className="ml-1 text-[0.625rem] tracking-wider text-amber-300">MOCK</span>
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-rose-400/15 bg-rose-400/5 px-3 py-2.5 text-xs leading-5 text-rose-200/80">
          Deletion requires confirmation and cannot be undone during this session. Refreshing the browser restores the original mock records.
        </div>

        {error ? (
          <p className="mt-3 text-xs text-rose-300" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-800 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
        <Button disabled={isDeleting} onClick={onClose} variant="secondary">
          Cancel
        </Button>
        <Button disabled={isDeleting} onClick={handleDelete} variant="danger">
          <Trash2 aria-hidden="true" className="size-4" />
          {isDeleting ? 'Deleting…' : 'Delete Camera'}
        </Button>
      </div>
    </Dialog>
  )
}
