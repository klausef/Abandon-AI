import { AlertTriangle, CheckCircle2, Radio, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { MockDataBadge } from '../../components/ui/MockDataBadge'
import { PageHeader } from '../../components/ui/PageHeader'
import { useCameraRecords } from '../../hooks/useCameraRecords'
import { useAreaRecords } from '../../hooks/useAreaRecords'
import { triggerMockIncident } from '../../services'
import type { Incident, IncidentObjectType } from '../../types'
import { useDetections } from '../detections/hooks/useDetections'
import {
  defaultIncidentFilters,
  filterAndSortIncidents,
  hasActiveIncidentFilters,
  type IncidentFilterState,
} from './incidentFilters'
import type { IncidentAction } from './incidentPresentation'
import {
  FalseAlarmDialog,
  OfficerAssignmentDialog,
  ResolveIncidentDialog,
  TransitionConfirmationDialog,
  TriggerMockAlertDialog,
} from './components/IncidentActionDialogs'
import { IncidentDetails } from './components/IncidentDetails'
import { IncidentFilters } from './components/IncidentFilters'
import { IncidentPriorityOverview } from './components/IncidentPriorityOverview'
import { IncidentSummaryCards } from './components/IncidentSummaryCards'
import { IncidentTable } from './components/IncidentTable'
import { useIncidents } from './hooks/useIncidents'
import { useMockAuth } from '../users/auth/useMockAuth'

type TransitionMode = 'acknowledge' | 'investigate'

interface Feedback {
  title: string
  message: string
}

export function IncidentsPage() {
  const areas = useAreaRecords()
  const auth = useMockAuth()
  const incidentState = useIncidents()
  const { cameras, isLoading } = useCameraRecords()
  const { detections } = useDetections()
  const [assignmentId, setAssignmentId] = useState<string | null>(null)
  const [detailsId, setDetailsId] = useState<string | null>(null)
  const [falseAlarmId, setFalseAlarmId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [filters, setFilters] = useState<IncidentFilterState>(defaultIncidentFilters)
  const [resolveId, setResolveId] = useState<string | null>(null)
  const [transition, setTransition] = useState<{ id: string; mode: TransitionMode } | null>(null)
  const [triggerOpen, setTriggerOpen] = useState(false)

  const permittedIncidents = useMemo(
    () =>
      auth.currentUser.role === 'Security Officer'
        ? incidentState.incidents.filter(
            (incident) => incident.assignedOfficerId === auth.currentUser.officerId,
          )
        : incidentState.incidents,
    [auth.currentUser, incidentState.incidents],
  )
  const filteredIncidents = useMemo(
    () => filterAndSortIncidents(permittedIncidents, filters, areas),
    [areas, filters, permittedIncidents],
  )
  const activeFilters = hasActiveIncidentFilters(filters)
  const findIncident = (id: string | null) =>
    id ? incidentState.incidents.find((incident) => incident.id === id) ?? null : null
  const detailsIncident = findIncident(detailsId)
  const assignmentIncident = findIncident(assignmentId)
  const resolveIncident = findIncident(resolveId)
  const falseAlarmIncident = findIncident(falseAlarmId)
  const transitionIncident = findIncident(transition?.id ?? null)

  function showFeedback(title: string, message: string) {
    setFeedback({ title, message })
  }

  function handleAction(action: IncidentAction, incident: Incident) {
    if (action === 'view') { setDetailsId(incident.id); return }
    setDetailsId(null)
    if (action === 'acknowledge' || action === 'investigate') {
      setTransition({ id: incident.id, mode: action })
    } else if (action === 'assign') setAssignmentId(incident.id)
    else if (action === 'resolve') setResolveId(incident.id)
    else if (action === 'false_alarm') setFalseAlarmId(incident.id)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        action={
          <div className="flex flex-wrap items-center gap-2">
            <MockDataBadge />
            <Button onClick={() => setTriggerOpen(true)}>
              <Radio aria-hidden="true" className="size-4" />
              Trigger Mock Alert
            </Button>
          </div>
        }
        description="Review, investigate, and manage potential abandoned-object incidents."
        eyebrow="Human verification workflow"
        title="Incident Management"
      />

      <div className="flex gap-3 rounded-xl border border-amber-400/15 bg-amber-400/5 p-4 text-xs leading-5 text-amber-100/70">
        <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-300" />
        AI-generated potential incidents are not confirmed security threats. Every alert requires review by authorized security personnel.
      </div>

      {feedback ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/8 px-4 py-3" role="status">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" />
          <div className="flex-1"><p className="text-xs font-semibold text-emerald-100">{feedback.title}</p><p className="mt-1 text-xs text-emerald-200/70">{feedback.message}</p></div>
          <button aria-label="Dismiss success message" onClick={() => setFeedback(null)} type="button"><X className="size-4 text-emerald-300" /></button>
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-5" role="status"><span className="sr-only">Loading incidents</span><div className="grid gap-3 sm:grid-cols-3 2xl:grid-cols-6">{Array.from({ length: 6 }, (_, index) => <div className="h-24 animate-pulse rounded-2xl border border-slate-800 bg-command-900/70" key={index} />)}</div><div className="h-96 animate-pulse rounded-2xl border border-slate-800 bg-command-900/70" /></div>
      ) : (
        <div className="space-y-5">
          <IncidentSummaryCards incidents={permittedIncidents} />
          <IncidentPriorityOverview incidents={permittedIncidents} />
          <IncidentFilters
            filters={filters}
            hasActiveFilters={activeFilters}
            officers={incidentState.officers}
            onChange={setFilters}
            onClear={() => setFilters(defaultIncidentFilters)}
            resultCount={filteredIncidents.length}
            totalCount={permittedIncidents.length}
          />
          <IncidentTable
            areas={areas}
            canPerformAction={(action) => action === 'view' || auth.can('incidents:manage')}
            hasActiveFilters={activeFilters}
            incidents={filteredIncidents}
            onAction={handleAction}
            onClearFilters={() => setFilters(defaultIncidentFilters)}
          />
        </div>
      )}

      {detailsIncident ? (
        <IncidentDetails
          areas={areas}
          activities={incidentState.getActivities(detailsIncident.id)}
          canManage={auth.can('incidents:manage')}
          cameras={cameras}
          detections={detections}
          incident={detailsIncident}
          notes={incidentState.getNotes(detailsIncident.id)}
          onAcknowledge={() => handleAction('acknowledge', detailsIncident)}
          onAddNote={async (content) => { await incidentState.addNote(detailsIncident, content); showFeedback('Note added', `Investigation note added to ${detailsIncident.incidentNumber}.`) }}
          onAssign={() => handleAction('assign', detailsIncident)}
          onClose={() => setDetailsId(null)}
          onFalseAlarm={() => handleAction('false_alarm', detailsIncident)}
          onInvestigate={() => handleAction('investigate', detailsIncident)}
          onResolve={() => handleAction('resolve', detailsIncident)}
        />
      ) : null}

      {transition && transitionIncident ? (
        <TransitionConfirmationDialog
          incident={transitionIncident}
          mode={transition.mode}
          onClose={() => setTransition(null)}
          onConfirm={async () => {
            if (transition.mode === 'acknowledge') await incidentState.acknowledge(transitionIncident)
            else await incidentState.investigate(transitionIncident)
            showFeedback('Workflow updated', `${transitionIncident.incidentNumber} is now ${transition.mode === 'acknowledge' ? 'acknowledged' : 'under investigation'}.`)
            setTransition(null)
          }}
        />
      ) : null}
      {assignmentIncident ? <OfficerAssignmentDialog incident={assignmentIncident} officers={incidentState.officers} onClose={() => setAssignmentId(null)} onConfirm={async (officerId) => { const updated = await incidentState.assign(assignmentIncident, officerId); showFeedback('Assignment updated', `${updated.incidentNumber} is ${updated.assignedOfficerName ? `assigned to ${updated.assignedOfficerName}` : 'unassigned'}.`); setAssignmentId(null) }} /> : null}
      {resolveIncident ? <ResolveIncidentDialog incident={resolveIncident} onClose={() => setResolveId(null)} onConfirm={async (notes) => { await incidentState.resolve(resolveIncident, notes); showFeedback('Incident resolved', `${resolveIncident.incidentNumber} was resolved after human verification.`); setResolveId(null) }} /> : null}
      {falseAlarmIncident ? <FalseAlarmDialog incident={falseAlarmIncident} onClose={() => setFalseAlarmId(null)} onConfirm={async (reason) => { await incidentState.markFalseAlarm(falseAlarmIncident, reason); showFeedback('False alarm recorded', `${falseAlarmIncident.incidentNumber} was closed as a false alarm.`); setFalseAlarmId(null) }} /> : null}
      {triggerOpen ? <TriggerMockAlertDialog cameras={cameras} onClose={() => setTriggerOpen(false)} onConfirm={async (cameraId: string, objectType: IncidentObjectType) => { const { incident } = await triggerMockIncident(cameraId, objectType); showFeedback('Mock incident created', `${incident.incidentNumber} was created for human verification.`); setTriggerOpen(false) }} /> : null}
    </div>
  )
}
