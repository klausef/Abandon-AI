import { describe, expect, it } from 'vitest'
import {
  emptyCameraFormValues,
  isValidIPv4Address,
  validateCameraForm,
} from './cameraForm'

describe('camera form validation', () => {
  it('accepts valid IPv4 addresses and an optional empty address', () => {
    expect(isValidIPv4Address('192.168.1.120')).toBe(true)
    expect(isValidIPv4Address('')).toBe(true)
  })

  it('rejects malformed and out-of-range IPv4 addresses', () => {
    expect(isValidIPv4Address('192.168.1')).toBe(false)
    expect(isValidIPv4Address('192.168.1.999')).toBe(false)
    expect(isValidIPv4Address('camera.local')).toBe(false)
  })

  it('requires an area, camera name, location, and landmark', () => {
    const errors = validateCameraForm(emptyCameraFormValues)

    expect(errors.name).toBeDefined()
    expect(errors.areaId).toBeDefined()
    expect(errors.location).toBeDefined()
    expect(errors.building).toBeDefined()
  })
})
