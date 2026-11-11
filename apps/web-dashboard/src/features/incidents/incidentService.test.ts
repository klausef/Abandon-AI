import { describe, expect, it, vi } from 'vitest'
import {
  mockCameras,
  mockDetections,
  mockIncidentActivities,
  mockIncidents,
  mockInvestigationNotes,
  mockOfficers,
} from '../../mocks'
import { IncidentWorkflowError, MockIncidentManagementService } from '../../services'
import type { Detection, SecurityOfficer } from '../../types'
import { calculateDashboardMetrics } from '../dashboard/dashboardData'

const supervisor = mockOfficers[2]

function createService(officers: readonly SecurityOfficer[] = mockOfficers) {
  return new MockIncidentManagementService(
    mockIncidents,
    mockIncidentActivities,
    mockInvestigationNotes,
    officers,
  )
}

describe('MockIncidentManagementService workflow', () => {
  it('loads the three initial incidents and correct initial counts', async () => {
    const service = createService()
    const incidents = await service.getIncidents()

    expect(incidents).toHaveLength(3)
    expect(incidents.map((incident) => incident.incidentNumber)).toEqual([
      'INC-2026-0001',
      'INC-2026-0002',
      'INC-2026-0003',
    ])
    expect(incidents.filter((incident) => incident.status === 'new')).toHaveLength(1)
    expect(incidents.filter((incident) => incident.priority === 'critical')).toHaveLength(1)
  })

  it('acknowledges a new incident and records timeline activity', async () => {
    const service = createService()
    const updated = await service.acknowledgeIncident('incident-0001', supervisor)

    expect(updated.status).toBe('acknowledged')
    expect(updated.acknowledgedAt).not.toBeNull()
    expect(service.getActivitiesForIncident(updated.id).at(-1)?.type).toBe(
      'acknowledged',
    )
  })

  it('assigns and reassigns active officers while preserving history', async () => {
    const service = createService()
    await service.acknowledgeIncident('incident-0001', supervisor)
    const assigned = await service.assignOfficer(
      'incident-0001',
      'SEC-001',
      supervisor,
    )
    const reassigned = await service.assignOfficer(
      'incident-0001',
      'SEC-002',
      supervisor,
    )

    expect(assigned.assignedOfficerName).toBe('Security Officer 01')
    expect(reassigned.assignedOfficerName).toBe('Security Officer 02')
    expect(
      service
        .getActivitiesForIncident('incident-0001')
        .filter((activity) => activity.type === 'assigned'),
    ).toHaveLength(2)
  })

  it('rejects assignment to an inactive officer', async () => {
    const inactive: SecurityOfficer = {
      id: 'SEC-099',
      name: 'Inactive Officer',
      role: 'Security Officer',
      status: 'Inactive',
      mock: true,
    }
    const service = createService([...mockOfficers, inactive])
    await service.acknowledgeIncident('incident-0001', supervisor)

    await expect(
      service.assignOfficer('incident-0001', inactive.id, supervisor),
    ).rejects.toMatchObject({ code: 'OFFICER_UNAVAILABLE' })
  })

  it('starts investigation, validates notes, and preserves previous notes', async () => {
    const service = createService()
    await service.acknowledgeIncident('incident-0001', supervisor)
    const investigating = await service.startInvestigation(
      'incident-0001',
      supervisor,
    )

    expect(investigating.status).toBe('investigating')
    await expect(
      service.addInvestigationNote('incident-0001', '   ', supervisor),
    ).rejects.toMatchObject({ code: 'NOTE_REQUIRED' })

    await service.addInvestigationNote(
      'incident-0001',
      'Area checked by patrol officer.',
      supervisor,
    )
    await service.addInvestigationNote(
      'incident-0001',
      'Owner inquiry in progress.',
      supervisor,
    )
    expect(service.getNotesForIncident('incident-0001')).toHaveLength(2)
    expect(service.getActivitiesForIncident('incident-0001').at(-1)?.type).toBe(
      'note_added',
    )
  })

  it('requires notes to resolve and prevents reopening a terminal incident', async () => {
    const service = createService()
    await service.acknowledgeIncident('incident-0001', supervisor)
    await service.startInvestigation('incident-0001', supervisor)

    await expect(
      service.resolveIncident('incident-0001', '', supervisor),
    ).rejects.toMatchObject({ code: 'RESOLUTION_REQUIRED' })
    const resolved = await service.resolveIncident(
      'incident-0001',
      'Item returned to verified owner.',
      supervisor,
    )
    expect(resolved.status).toBe('resolved')
    expect(resolved.resolvedAt).not.toBeNull()
    await expect(
      service.markFalseAlarm('incident-0001', 'Detection error', supervisor),
    ).rejects.toMatchObject({ code: 'INVALID_TRANSITION' })
  })

  it('requires a reason before marking a false alarm', async () => {
    const service = createService()

    await expect(
      service.markFalseAlarm('incident-0001', ' ', supervisor),
    ).rejects.toMatchObject({ code: 'REASON_REQUIRED' })
    const updated = await service.markFalseAlarm(
      'incident-0001',
      'Object belongs to nearby person',
      supervisor,
    )
    expect(updated.status).toBe('false_alarm')
    expect(updated.resolutionNotes).toBe('Object belongs to nearby person')
  })

  it('creates one incident from an eligible object detection', async () => {
    const service = createService()
    const detection: Detection = {
      ...mockDetections[3],
      id: 'DET-999',
      cameraId: 'CAM-001',
      objectClass: 'backpack',
      cameraSnapshot: {
        areaId: 'AREA-001',
        areaName: 'Valencia Public Market',
        name: 'Public Market Entrance Camera',
        location: 'Main Entrance',
        building: 'Main Market Hall',
      },
    }
    const created = await service.createFromDetection(
      detection,
      mockCameras,
      new Date('2026-11-09T10:00:00.000Z'),
    )

    expect(created.incidentNumber).toBe('INC-2026-0004')
    expect(created.status).toBe('new')
    expect(created.detectionId).toBe('DET-999')
    expect((await service.getIncidents())).toHaveLength(4)
  })

  it('rejects duplicate, person, ineligible, and missing-camera detections', async () => {
    const service = createService()
    await expect(
      service.createFromDetection(mockDetections[3], mockCameras),
    ).rejects.toMatchObject({ code: 'DUPLICATE_DETECTION' })
    await expect(
      service.createFromDetection(mockDetections[1], mockCameras),
    ).rejects.toMatchObject({ code: 'PERSON_NOT_ALLOWED' })
    await expect(
      service.createFromDetection(mockDetections[0], mockCameras),
    ).rejects.toMatchObject({ code: 'DETECTION_NOT_ELIGIBLE' })
    await expect(
      service.createFromDetection(
        { ...mockDetections[3], id: 'DET-998', cameraId: 'CAM-999' },
        mockCameras,
      ),
    ).rejects.toMatchObject({ code: 'CAMERA_NOT_FOUND' })
  })

  it('notifies subscribers and produces updated dashboard statistics', async () => {
    const service = createService()
    const listener = vi.fn()
    service.subscribe(listener)
    await service.acknowledgeIncident('incident-0001', supervisor)
    const incidents = await service.getIncidents()
    const metrics = calculateDashboardMetrics({
      cameras: mockCameras,
      detections: mockDetections,
      incidents,
    })

    expect(listener).toHaveBeenCalledTimes(1)
    expect(metrics.newIncidents).toBe(0)
    expect(metrics.activeIncidents).toBe(2)
    expect(metrics.resolvedIncidents).toBe(1)
  })

  it('exposes typed workflow errors', () => {
    expect(new IncidentWorkflowError('TEST', 'message')).toMatchObject({
      code: 'TEST',
      name: 'IncidentWorkflowError',
    })
  })
})
