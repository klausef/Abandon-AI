import { describe, expect, it } from 'vitest'
import { mockCameras, mockDetections, mockIncidents } from '../../mocks'
import { calculateDashboardMetrics } from '../dashboard/dashboardData'

describe('Phase 2 dashboard camera compatibility', () => {
  it('calculates dashboard metrics from the expanded Phase 3 camera model', () => {
    const metrics = calculateDashboardMetrics({
      cameras: mockCameras,
      detections: mockDetections,
      incidents: mockIncidents,
    })

    expect(metrics.totalCameras).toBe(5)
    expect(metrics.onlineCameras).toBe(4)
    expect(metrics.offlineCameras).toBe(1)
    expect(metrics.monitoringEnabled).toBe(5)
    expect(metrics.totalDetections).toBe(4)
  })
})
