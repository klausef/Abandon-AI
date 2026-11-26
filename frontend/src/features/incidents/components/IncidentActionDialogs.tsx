import {
  AlertTriangle,
  CheckCircle2,
  Radio,
  SearchCheck,
  UserRoundPlus,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Dialog } from '../../../components/ui/Dialog'
import type {
  Camera,
  Incident,
  IncidentObjectType,
  SecurityOfficer,
} from '../../../types'
import {
  detectionObjectLabels,
  incidentObjectClasses,
} from '../../../utils/detection'

const controlClass =
  'mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 text-sm text-slate-200 outline-none focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10'

interface TransitionDialogProps {
  incident: Incident
  mode: 'acknowledge' | 'investigate'
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function TransitionConfirmationDialog({
  incident,
  mode,
  onClose,
  onConfirm,
}: TransitionDialogProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isAcknowledgement = mode === 'acknowledge'

  async function confirm() {
    setIsSaving(true)
    try {
      await onConfirm()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Action failed.')
      setIsSaving(false)
    }
  }

  return (
    <Dialog
      description="Every workflow transition is recorded in the mock activity timeline."
      onClose={onClose}
      open
      size="small"
      title={isAcknowledgement ? 'Acknowledge Incident' : 'Start Investigation'}
    >
      <div className="p-5 sm:p-6">
        <div className="flex gap-4">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
            {isAcknowledgement ? <CheckCircle2 className="size-5" /> : <SearchCheck className="size-5" />}
          </div>
          <p className="text-sm leading-6 text-slate-300">
            {isAcknowledgement ? 'Acknowledge' : 'Begin investigation for'}{' '}
            <strong className="text-slate-50">{incident.incidentNumber}</strong>? Human verification is still required.
          </p>
        </div>
        {error ? <p className="mt-4 text-xs text-rose-300" role="alert">{error}</p> : null}
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-slate-800 px-5 py-4 sm:flex-row sm:justify-end">
        <Button disabled={isSaving} onClick={onClose} variant="secondary">Cancel</Button>
        <Button disabled={isSaving} onClick={confirm}>{isSaving ? 'Updating…' : isAcknowledgement ? 'Acknowledge Incident' : 'Start Investigation'}</Button>
      </div>
    </Dialog>
  )
}

interface AssignmentDialogProps {
  incident: Incident
  officers: readonly SecurityOfficer[]
  onClose: () => void
  onConfirm: (officerId: string | null) => Promise<void>
}

export function OfficerAssignmentDialog({ incident, officers, onClose, onConfirm }: AssignmentDialogProps) {
  const [officerId, setOfficerId] = useState(incident.assignedOfficerId ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const activeOfficers = officers.filter((officer) => officer.status === 'Active')

  async function submit() {
    setIsSaving(true)
    try {
      await onConfirm(officerId || null)
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Assignment failed.')
      setIsSaving(false)
    }
  }

  return (
    <Dialog description="Assignment changes are preserved in the incident timeline." onClose={onClose} open size="small" title="Assign Security Officer">
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/30 p-3">
          <UserRoundPlus className="size-4 text-cyan-300" />
          <span className="font-mono text-xs font-bold text-slate-200">{incident.incidentNumber}</span>
        </div>
        <label className="mt-5 block text-xs font-medium text-slate-300">
          Assigned officer
          <select className={`${controlClass} h-10`} onChange={(event) => setOfficerId(event.target.value)} value={officerId}>
            <option value="">Unassigned</option>
            {activeOfficers.map((officer) => <option key={officer.id} value={officer.id}>{officer.name} · {officer.role}</option>)}
          </select>
        </label>
        {error ? <p className="mt-3 text-xs text-rose-300" role="alert">{error}</p> : null}
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-slate-800 px-5 py-4 sm:flex-row sm:justify-end">
        <Button disabled={isSaving} onClick={onClose} variant="secondary">Cancel</Button>
        <Button disabled={isSaving} onClick={submit}>{isSaving ? 'Saving…' : 'Save Assignment'}</Button>
      </div>
    </Dialog>
  )
}

interface ResolutionDialogProps {
  incident: Incident
  onClose: () => void
  onConfirm: (notes: string) => Promise<void>
}

export function ResolveIncidentDialog({ incident, onClose, onConfirm }: ResolutionDialogProps) {
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function submit() {
    if (!notes.trim()) {
      setError('Resolution notes are required.')
      return
    }
    setIsSaving(true)
    try {
      await onConfirm(notes)
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Resolution failed.')
      setIsSaving(false)
    }
  }

  return (
    <Dialog description="Resolution is terminal in this phase and requires human verification notes." onClose={onClose} open size="small" title="Resolve Incident">
      <div className="p-5 sm:p-6">
        <p className="text-sm text-slate-300">Resolve <strong className="text-slate-50">{incident.incidentNumber}</strong>?</p>
        <label className="mt-4 block text-xs font-medium text-slate-300">
          Resolution notes <span className="text-rose-400">*</span>
          <textarea className={`${controlClass} min-h-28 resize-y py-2.5`} onChange={(event) => { setNotes(event.target.value); setError(null) }} placeholder="Describe the human verification and resolution outcome." value={notes} />
        </label>
        {error ? <p className="mt-2 text-xs text-rose-300" role="alert">{error}</p> : null}
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-slate-800 px-5 py-4 sm:flex-row sm:justify-end">
        <Button disabled={isSaving} onClick={onClose} variant="secondary">Cancel</Button>
        <Button disabled={isSaving} onClick={submit}><CheckCircle2 className="size-4" />{isSaving ? 'Resolving…' : 'Confirm Resolution'}</Button>
      </div>
    </Dialog>
  )
}

interface FalseAlarmDialogProps {
  incident: Incident
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
}

const falseAlarmReasons = [
  'Object retrieved by owner',
  'Object belongs to nearby person',
  'Temporary placement',
  'Detection error',
  'Other',
] as const

export function FalseAlarmDialog({ incident, onClose, onConfirm }: FalseAlarmDialogProps) {
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function submit() {
    const finalReason = reason === 'Other' ? details.trim() : reason
    if (!finalReason) {
      setError('Select or enter a false-alarm reason.')
      return
    }
    setIsSaving(true)
    try {
      await onConfirm(finalReason)
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Update failed.')
      setIsSaving(false)
    }
  }

  return (
    <Dialog description="False alarm is a terminal state and remains in incident history." onClose={onClose} open size="small" title="Mark False Alarm">
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3 rounded-lg border border-rose-400/15 bg-rose-400/5 p-3 text-sm text-slate-300">
          <XCircle className="mt-0.5 size-4 shrink-0 text-rose-300" />
          Mark <strong className="text-slate-50">{incident.incidentNumber}</strong> as a false alarm after human review.
        </div>
        <label className="mt-4 block text-xs font-medium text-slate-300">
          Reason <span className="text-rose-400">*</span>
          <select className={`${controlClass} h-10`} onChange={(event) => { setReason(event.target.value); setError(null) }} value={reason}>
            <option value="">Select a reason</option>
            {falseAlarmReasons.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        {reason === 'Other' ? <label className="mt-3 block text-xs font-medium text-slate-300">Reason details<textarea className={`${controlClass} min-h-20 py-2.5`} onChange={(event) => setDetails(event.target.value)} value={details} /></label> : null}
        {error ? <p className="mt-2 text-xs text-rose-300" role="alert">{error}</p> : null}
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-slate-800 px-5 py-4 sm:flex-row sm:justify-end">
        <Button disabled={isSaving} onClick={onClose} variant="secondary">Cancel</Button>
        <Button disabled={isSaving} onClick={submit} variant="danger"><XCircle className="size-4" />{isSaving ? 'Updating…' : 'Confirm False Alarm'}</Button>
      </div>
    </Dialog>
  )
}

interface TriggerDialogProps {
  cameras: readonly Camera[]
  onClose: () => void
  onConfirm: (cameraId: string, objectType: IncidentObjectType) => Promise<void>
}

export function TriggerMockAlertDialog({ cameras, onClose, onConfirm }: TriggerDialogProps) {
  const eligible = cameras.filter((camera) => camera.status === 'Online' && camera.monitoringEnabled)
  const [cameraId, setCameraId] = useState(eligible[0]?.id ?? '')
  const [objectType, setObjectType] = useState<IncidentObjectType>('backpack')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!cameraId) { setError('Select an eligible camera.'); return }
    setIsSaving(true)
    try { await onConfirm(cameraId, objectType) } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Mock alert failed.')
      setIsSaving(false)
    }
  }

  return (
    <Dialog description="Creates one controlled potential-incident detection and linked incident." onClose={onClose} open size="small" title="Trigger Mock Alert">
      <div className="p-5 sm:p-6">
        <div className="flex gap-3 rounded-lg border border-amber-400/15 bg-amber-400/5 p-3 text-xs leading-5 text-amber-100/70">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-300" />
          This is simulated. An AI-generated alert is not a confirmed threat and requires human verification.
        </div>
        <label className="mt-4 block text-xs font-medium text-slate-300">Camera<select className={`${controlClass} h-10`} onChange={(event) => setCameraId(event.target.value)} value={cameraId}>{eligible.map((camera) => <option key={camera.id} value={camera.id}>{camera.name} ({camera.id})</option>)}</select></label>
        <label className="mt-3 block text-xs font-medium text-slate-300">Object<select className={`${controlClass} h-10`} onChange={(event) => setObjectType(event.target.value as IncidentObjectType)} value={objectType}>{incidentObjectClasses.map((objectClass) => <option key={objectClass} value={objectClass}>{detectionObjectLabels[objectClass]}</option>)}</select></label>
        {error ? <p className="mt-2 text-xs text-rose-300" role="alert">{error}</p> : null}
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-slate-800 px-5 py-4 sm:flex-row sm:justify-end">
        <Button disabled={isSaving} onClick={onClose} variant="secondary">Cancel</Button>
        <Button disabled={isSaving || eligible.length === 0} onClick={submit}><Radio className="size-4" />{isSaving ? 'Creating…' : 'Create Mock Incident'}</Button>
      </div>
    </Dialog>
  )
}
