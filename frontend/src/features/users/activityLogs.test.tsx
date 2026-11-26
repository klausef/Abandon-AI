import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { incidentService } from '../../services'
import { mockOfficers } from '../../mocks'
import { useActivityLogs } from './hooks/useActivityLogs'

describe('unified activity logs', () => {
  it('includes incident workflow actions as soon as they occur', async () => {
    const { result } = renderHook(() => useActivityLogs())
    const before = result.current.length
    await act(async () => {
      await incidentService.acknowledgeIncident('incident-0001', mockOfficers[2])
    })
    expect(result.current).toHaveLength(before + 1)
    expect(result.current[0]).toMatchObject({
      type: 'incident_acknowledged',
      targetId: 'incident-0001',
    })
  })
})
