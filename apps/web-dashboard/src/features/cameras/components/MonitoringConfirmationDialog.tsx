import { Pause, Radio } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Dialog } from '../../../components/ui/Dialog'
import type { Camera } from '../../../types'
import { CameraConnectionStatusBadge } from './CameraStatusBadge'

interface MonitoringConfirmationDialogProps {
  camera: Camera
  onClose: () => void
  onConfirm: (camera: Camera) => Promise<void>
  open: boolean
}

export function MonitoringConfirmationDialog({
  camera,
  onClose,
  onConfirm,
  open,
}: MonitoringConfirmationDialogProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const willEnable = !camera.monitoringEnabled

  async function handleConfirm() {
    setIsSaving(true)
    setError(null)

    try {
      await onConfirm(camera)
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : 'Monitoring could not be updated.',
      )
      setIsSaving(false)
    }
  }

  return (
    <Dialog
      description="Connection status and monitoring state are managed independently."
      onClose={() => {
        if (!isSaving) onClose()
      }}
      open={open}
      size="small"
      title={`${willEnable ? 'Enable' : 'Disable'} Monitoring`}
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div
            className={`grid size-11 shrink-0 place-items-center rounded-xl border ${
              willEnable
                ? 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300'
                : 'border-amber-400/20 bg-amber-400/10 text-amber-300'
            }`}
          >
            {willEnable ? (
              <Radio aria-hidden="true" className="size-5" />
            ) : (
              <Pause aria-hidden="true" className="size-5" />
            )}
          </div>
          <div>
            <p className="text-sm leading-6 text-slate-300">
              {willEnable ? 'Enable' : 'Disable'} simulated monitoring for{' '}
              <strong className="font-semibold text-slate-50">{camera.name}</strong>?
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-cyan-300">{camera.id}</span>
              <CameraConnectionStatusBadge status={camera.status} />
            </div>
          </div>
        </div>

        {camera.status !== 'Online' ? (
          <p className="mt-5 rounded-lg border border-amber-400/15 bg-amber-400/5 px-3 py-2.5 text-xs leading-5 text-amber-200/80">
            This changes only the monitoring preference. The camera will remain {camera.status.toLowerCase()}.
          </p>
        ) : null}

        {error ? (
          <p className="mt-3 text-xs text-rose-300" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-800 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
        <Button disabled={isSaving} onClick={onClose} variant="secondary">
          Cancel
        </Button>
        <Button disabled={isSaving} onClick={handleConfirm}>
          {willEnable ? (
            <Radio aria-hidden="true" className="size-4" />
          ) : (
            <Pause aria-hidden="true" className="size-4" />
          )}
          {isSaving ? 'Updating…' : `${willEnable ? 'Enable' : 'Disable'} Monitoring`}
        </Button>
      </div>
    </Dialog>
  )
}
