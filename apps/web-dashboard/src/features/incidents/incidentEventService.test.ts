import { describe, expect, it } from 'vitest'
import {
  detectionService,
  incidentService,
  triggerMockIncident,
} from '../../services'

describe('controlled mock incident trigger', () => {
  it('creates one shared potential detection and one linked incident', async () => {
    const detectionCount = detectionService.getSnapshot().length
    const incidentCount = incidentService.getSnapshot().length

    const { detection, incident } = await triggerMockIncident(
      'CAM-001',
      'backpack',
    )

    expect(detection.status).toBe('potential_incident')
    expect(detection.objectClass).toBe('backpack')
    expect(incident.detectionId).toBe(detection.id)
    expect(incident.status).toBe('new')
    expect(detectionService.getSnapshot()).toHaveLength(detectionCount + 1)
    expect(incidentService.getSnapshot()).toHaveLength(incidentCount + 1)
  })

  it('rejects a missing camera before creating records', async () => {
    await expect(
      triggerMockIncident('CAM-999', 'suitcase'),
    ).rejects.toThrow('Camera CAM-999 was not found.')
  })
})
