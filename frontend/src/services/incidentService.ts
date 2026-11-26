import {
  mockIncidentActivities,
  mockIncidents,
  mockInvestigationNotes,
  mockOfficers,
} from '../mocks'
import type {
  Camera,
  Detection,
  Incident,
  IncidentActivity,
  IncidentObjectType,
  InvestigationNote,
  SecurityOfficer,
} from '../types'
import { userService } from './userService'

type IncidentListener = () => void

export class IncidentWorkflowError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'IncidentWorkflowError'
    this.code = code
  }
}

function numericSuffix(value: string): number {
  const suffix = Number(value.match(/(\d+)$/)?.[1] ?? 0)
  return Number.isFinite(suffix) ? suffix : 0
}

function operationTimestamp(previous: string, requested = new Date()): string {
  return new Date(
    Math.max(requested.getTime(), Date.parse(previous) + 1),
  ).toISOString()
}

function cloneIncident(incident: Incident): Incident {
  return structuredClone(incident)
}

export class MockIncidentManagementService {
  private activities: readonly IncidentActivity[]
  private incidents: readonly Incident[]
  private listeners = new Set<IncidentListener>()
  private nextActivityNumber: number
  private nextIncidentNumber: number
  private nextNoteNumber: number
  private notes: readonly InvestigationNote[]
  private officers: readonly SecurityOfficer[]
  private officerActiveResolver?: (officerId: string) => boolean
  private officerRosterResolver?: () => readonly SecurityOfficer[]

  constructor(
    initialIncidents: readonly Incident[] = mockIncidents,
    initialActivities: readonly IncidentActivity[] = mockIncidentActivities,
    initialNotes: readonly InvestigationNote[] = mockInvestigationNotes,
    officers: readonly SecurityOfficer[] = mockOfficers,
    officerActiveResolver?: (officerId: string) => boolean,
    officerRosterResolver?: () => readonly SecurityOfficer[],
  ) {
    this.incidents = structuredClone(initialIncidents)
    this.activities = structuredClone(initialActivities)
    this.notes = structuredClone(initialNotes)
    this.officers = structuredClone(officers)
    this.officerActiveResolver = officerActiveResolver
    this.officerRosterResolver = officerRosterResolver
    this.nextIncidentNumber =
      Math.max(0, ...initialIncidents.map((item) => numericSuffix(item.incidentNumber))) + 1
    this.nextActivityNumber =
      Math.max(0, ...initialActivities.map((item) => numericSuffix(item.id))) + 1
    this.nextNoteNumber =
      Math.max(0, ...initialNotes.map((item) => numericSuffix(item.id))) + 1
  }

  getSnapshot = (): readonly Incident[] => this.incidents

  subscribe = (listener: IncidentListener): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emitChange() {
    this.listeners.forEach((listener) => listener())
  }

  private findIncident(reference: string): Incident {
    const incident = this.incidents.find(
      (item) => item.id === reference || item.incidentNumber === reference,
    )

    if (!incident) {
      throw new IncidentWorkflowError(
        'INCIDENT_NOT_FOUND',
        `Incident ${reference} was not found.`,
      )
    }

    return incident
  }

  private saveIncident(updatedIncident: Incident) {
    this.incidents = this.incidents.map((incident) =>
      incident.id === updatedIncident.id ? updatedIncident : incident,
    )
  }

  private addActivity(
    incident: Incident,
    type: IncidentActivity['type'],
    actor: SecurityOfficer | null,
    description: string,
    timestamp: string,
  ) {
    const activity: IncidentActivity = {
      id: `ACT-${this.nextActivityNumber.toString().padStart(4, '0')}`,
      incidentId: incident.id,
      type,
      actorId: actor?.id ?? null,
      actorName: actor?.name ?? 'Mock Incident Service',
      description,
      timestamp,
      mock: true,
    }
    this.nextActivityNumber += 1
    this.activities = [...this.activities, activity]
  }

  getIncidents(): Promise<readonly Incident[]> {
    return Promise.resolve(this.incidents.map(cloneIncident))
  }

  listIncidents(): Promise<readonly Incident[]> {
    return this.getIncidents()
  }

  getIncident(reference: string): Promise<Incident | undefined> {
    const incident = this.incidents.find(
      (item) => item.id === reference || item.incidentNumber === reference,
    )
    return Promise.resolve(incident ? cloneIncident(incident) : undefined)
  }

  getActivitiesForIncident(incidentId: string): readonly IncidentActivity[] {
    return this.activities
      .filter((activity) => activity.incidentId === incidentId)
      .sort((first, second) => Date.parse(first.timestamp) - Date.parse(second.timestamp))
      .map((activity) => structuredClone(activity))
  }

  getAllActivities(): readonly IncidentActivity[] {
    return this.activities.map((activity) => structuredClone(activity))
  }

  getNotesForIncident(incidentId: string): readonly InvestigationNote[] {
    return this.notes
      .filter((note) => note.incidentId === incidentId)
      .sort((first, second) => Date.parse(first.timestamp) - Date.parse(second.timestamp))
      .map((note) => structuredClone(note))
  }

  getOfficers(): readonly SecurityOfficer[] {
    const officers = this.officerRosterResolver?.() ?? this.officers
    return officers.map((officer) => ({
      ...structuredClone(officer),
      status: this.officerActiveResolver
        ? this.officerActiveResolver(officer.id)
          ? 'Active'
          : 'Inactive'
        : officer.status,
    }))
  }

  acknowledgeIncident(
    reference: string,
    actor: SecurityOfficer,
    requestedAt = new Date(),
  ): Promise<Incident> {
    const incident = this.findIncident(reference)
    if (incident.status !== 'new') {
      return Promise.reject(
        new IncidentWorkflowError(
          'INVALID_TRANSITION',
          'Only new incidents can be acknowledged.',
        ),
      )
    }

    const timestamp = operationTimestamp(incident.updatedAt, requestedAt)
    const updated: Incident = {
      ...incident,
      status: 'acknowledged',
      acknowledgedAt: timestamp,
      updatedAt: timestamp,
    }
    this.saveIncident(updated)
    this.addActivity(updated, 'acknowledged', actor, 'Incident acknowledged for human review.', timestamp)
    this.emitChange()
    return Promise.resolve(cloneIncident(updated))
  }

  assignOfficer(
    reference: string,
    officerId: string | null,
    actor: SecurityOfficer,
    requestedAt = new Date(),
  ): Promise<Incident> {
    const incident = this.findIncident(reference)
    if (!['acknowledged', 'investigating'].includes(incident.status)) {
      return Promise.reject(
        new IncidentWorkflowError(
          'INVALID_TRANSITION',
          'Officers can be assigned only to acknowledged or investigating incidents.',
        ),
      )
    }

    const officer = officerId
      ? this.getOfficers().find((candidate) => candidate.id === officerId)
      : null
    if (officerId && (!officer || officer.status !== 'Active')) {
      return Promise.reject(
        new IncidentWorkflowError(
          'OFFICER_UNAVAILABLE',
          'The selected officer is inactive or unavailable.',
        ),
      )
    }

    const timestamp = operationTimestamp(incident.updatedAt, requestedAt)
    const updated: Incident = {
      ...incident,
      assignedOfficerId: officer?.id ?? null,
      assignedOfficerName: officer?.name ?? null,
      updatedAt: timestamp,
    }
    this.saveIncident(updated)
    this.addActivity(
      updated,
      officer ? 'assigned' : 'unassigned',
      actor,
      officer ? `Assigned to ${officer.name}.` : 'Incident assignment cleared.',
      timestamp,
    )
    this.emitChange()
    return Promise.resolve(cloneIncident(updated))
  }

  startInvestigation(
    reference: string,
    actor: SecurityOfficer,
    requestedAt = new Date(),
  ): Promise<Incident> {
    const incident = this.findIncident(reference)
    if (incident.status !== 'acknowledged') {
      return Promise.reject(
        new IncidentWorkflowError(
          'INVALID_TRANSITION',
          'Only acknowledged incidents can enter investigation.',
        ),
      )
    }

    const timestamp = operationTimestamp(incident.updatedAt, requestedAt)
    const updated: Incident = {
      ...incident,
      status: 'investigating',
      updatedAt: timestamp,
    }
    this.saveIncident(updated)
    this.addActivity(updated, 'investigation_started', actor, 'Security investigation started.', timestamp)
    this.emitChange()
    return Promise.resolve(cloneIncident(updated))
  }

  addInvestigationNote(
    reference: string,
    content: string,
    author: SecurityOfficer,
    requestedAt = new Date(),
  ): Promise<InvestigationNote> {
    const incident = this.findIncident(reference)
    if (incident.status !== 'investigating') {
      return Promise.reject(
        new IncidentWorkflowError(
          'INVALID_TRANSITION',
          'Investigation notes can be added only while an incident is investigating.',
        ),
      )
    }
    if (!content.trim()) {
      return Promise.reject(
        new IncidentWorkflowError('NOTE_REQUIRED', 'Investigation note content is required.'),
      )
    }

    const timestamp = operationTimestamp(incident.updatedAt, requestedAt)
    const note: InvestigationNote = {
      id: `NOTE-${this.nextNoteNumber.toString().padStart(4, '0')}`,
      incidentId: incident.id,
      authorId: author.id,
      authorName: author.name,
      content: content.trim(),
      timestamp,
      mock: true,
    }
    this.nextNoteNumber += 1
    this.notes = [...this.notes, note]
    const updated = { ...incident, updatedAt: timestamp }
    this.saveIncident(updated)
    this.addActivity(updated, 'note_added', author, 'Investigation note added.', timestamp)
    this.emitChange()
    return Promise.resolve(structuredClone(note))
  }

  resolveIncident(
    reference: string,
    resolutionNotes: string,
    actor: SecurityOfficer,
    requestedAt = new Date(),
  ): Promise<Incident> {
    const incident = this.findIncident(reference)
    if (incident.status !== 'investigating') {
      return Promise.reject(
        new IncidentWorkflowError(
          'INVALID_TRANSITION',
          'Only investigating incidents can be resolved.',
        ),
      )
    }
    if (!resolutionNotes.trim()) {
      return Promise.reject(
        new IncidentWorkflowError('RESOLUTION_REQUIRED', 'Resolution notes are required.'),
      )
    }

    const timestamp = operationTimestamp(incident.updatedAt, requestedAt)
    const updated: Incident = {
      ...incident,
      status: 'resolved',
      resolvedAt: timestamp,
      resolutionNotes: resolutionNotes.trim(),
      updatedAt: timestamp,
    }
    this.saveIncident(updated)
    this.addActivity(updated, 'resolved', actor, 'Incident resolved after human verification.', timestamp)
    this.emitChange()
    return Promise.resolve(cloneIncident(updated))
  }

  markFalseAlarm(
    reference: string,
    reason: string,
    actor: SecurityOfficer,
    requestedAt = new Date(),
  ): Promise<Incident> {
    const incident = this.findIncident(reference)
    if (!['new', 'acknowledged', 'investigating'].includes(incident.status)) {
      return Promise.reject(
        new IncidentWorkflowError(
          'INVALID_TRANSITION',
          'Resolved and false-alarm incidents are terminal.',
        ),
      )
    }
    if (!reason.trim()) {
      return Promise.reject(
        new IncidentWorkflowError('REASON_REQUIRED', 'A false-alarm reason is required.'),
      )
    }

    const timestamp = operationTimestamp(incident.updatedAt, requestedAt)
    const updated: Incident = {
      ...incident,
      status: 'false_alarm',
      resolvedAt: timestamp,
      resolutionNotes: reason.trim(),
      updatedAt: timestamp,
    }
    this.saveIncident(updated)
    this.addActivity(updated, 'false_alarm', actor, `Marked false alarm: ${reason.trim()}`, timestamp)
    this.emitChange()
    return Promise.resolve(cloneIncident(updated))
  }

  createFromDetection(
    detection: Detection,
    cameras: readonly Camera[],
    requestedAt = new Date(),
  ): Promise<Incident> {
    if (detection.objectClass === 'person') {
      return Promise.reject(
        new IncidentWorkflowError(
          'PERSON_NOT_ALLOWED',
          'Person detections cannot directly create abandoned-object incidents.',
        ),
      )
    }
    if (detection.status !== 'potential_incident') {
      return Promise.reject(
        new IncidentWorkflowError(
          'DETECTION_NOT_ELIGIBLE',
          'Only potential-incident detections can create incidents.',
        ),
      )
    }
    if (this.incidents.some((incident) => incident.detectionId === detection.id)) {
      return Promise.reject(
        new IncidentWorkflowError(
          'DUPLICATE_DETECTION',
          'An incident already exists for this detection.',
        ),
      )
    }

    const camera = cameras.find((candidate) => candidate.id === detection.cameraId)
    if (!camera) {
      return Promise.reject(
        new IncidentWorkflowError(
          'CAMERA_NOT_FOUND',
          'The detection references a camera that no longer exists.',
        ),
      )
    }

    const timestamp = requestedAt.toISOString()
    const areaName = detection.cameraSnapshot.areaName
    const incidentNumber = `INC-${requestedAt.getFullYear()}-${this.nextIncidentNumber
      .toString()
      .padStart(4, '0')}`
    const incident: Incident = {
      id: `incident-${this.nextIncidentNumber.toString().padStart(4, '0')}`,
      incidentNumber,
      detectionId: detection.id,
      cameraId: camera.id,
      cameraName: camera.name,
      areaId: camera.areaId,
      areaName,
      location: camera.location,
      objectType: detection.objectClass as IncidentObjectType,
      trackingId: detection.trackingId,
      confidence: detection.confidence,
      unattendedDuration: 120,
      priority: detection.confidence >= 0.95 ? 'critical' : 'high',
      status: 'new',
      assignedOfficerId: null,
      assignedOfficerName: null,
      description: `Simulated ${detection.objectClass} detection requiring security verification.`,
      detectedAt: detection.timestamp,
      acknowledgedAt: null,
      resolvedAt: null,
      resolutionNotes: null,
      evidenceSnapshot: {
        areaId: camera.areaId,
        areaName,
        detectionId: detection.id,
        cameraId: camera.id,
        cameraName: camera.name,
        location: camera.location,
        building: camera.building,
        objectClass: detection.objectClass as IncidentObjectType,
        trackingId: detection.trackingId,
        confidence: detection.confidence,
        timestamp: detection.timestamp,
        boundingBox: { ...detection.boundingBox },
        detectionStatus: detection.status,
        mock: true,
      },
      mock: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    this.nextIncidentNumber += 1
    this.incidents = [incident, ...this.incidents]
    this.addActivity(
      incident,
      'detected',
      null,
      `${incident.objectType} detected at ${incident.location}.`,
      detection.timestamp,
    )
    this.addActivity(
      incident,
      'created',
      null,
      'Controlled mock alert created for human security verification.',
      timestamp,
    )
    this.emitChange()
    return Promise.resolve(cloneIncident(incident))
  }
}

export const incidentService = new MockIncidentManagementService(
  mockIncidents,
  mockIncidentActivities,
  mockInvestigationNotes,
  mockOfficers,
  (officerId) => userService.isOfficerActive(officerId),
  () => userService.getSecurityOfficers(),
)
