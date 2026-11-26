import { useSyncExternalStore } from 'react'
import { incidentService } from '../../../services'
import type { Incident, SecurityOfficer } from '../../../types'
import { useMockAuth } from '../../users/auth/useMockAuth'

export function useIncidents() {
  const { currentUser } = useMockAuth()
  const incidents = useSyncExternalStore(
    incidentService.subscribe,
    incidentService.getSnapshot,
    incidentService.getSnapshot,
  )
  const officers = incidentService.getOfficers()
  const currentOperator: SecurityOfficer = {
    id: currentUser.officerId ?? currentUser.id,
    name: currentUser.fullName,
    role: currentUser.role,
    status: currentUser.status,
    mock: true,
  }

  return {
    incidents,
    officers,
    currentOperator,
    acknowledge: (incident: Incident) =>
      incidentService.acknowledgeIncident(incident.id, currentOperator),
    assign: (incident: Incident, officerId: string | null) =>
      incidentService.assignOfficer(incident.id, officerId, currentOperator),
    investigate: (incident: Incident) =>
      incidentService.startInvestigation(incident.id, currentOperator),
    addNote: (incident: Incident, content: string) =>
      incidentService.addInvestigationNote(incident.id, content, currentOperator),
    resolve: (incident: Incident, notes: string) =>
      incidentService.resolveIncident(incident.id, notes, currentOperator),
    markFalseAlarm: (incident: Incident, reason: string) =>
      incidentService.markFalseAlarm(incident.id, reason, currentOperator),
    getActivities: (incidentId: string) =>
      incidentService.getActivitiesForIncident(incidentId),
    getNotes: (incidentId: string) =>
      incidentService.getNotesForIncident(incidentId),
  }
}
