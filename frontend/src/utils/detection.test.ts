import { describe, expect, it } from 'vitest'
import {
  detectionObjectClasses,
  detectionObjectLabels,
  incidentObjectClasses,
} from './detection'

describe('expanded portable-object vocabulary', () => {
  it('keeps people available for detections but excluded from incidents', () => {
    expect(detectionObjectClasses).toContain('person')
    expect(incidentObjectClasses).not.toContain('person')
  })

  it('supports bags, drink containers, boxes, packages, and parcels', () => {
    expect(incidentObjectClasses).toEqual(
      expect.arrayContaining([
        'backpack',
        'duffel_bag',
        'bottle',
        'mug',
        'cup',
        'box',
        'package',
        'parcel',
      ]),
    )
    expect(detectionObjectLabels.duffel_bag).toBe('Duffel Bag')
    expect(detectionObjectLabels.mug).toBe('Coffee Mug')
    expect(detectionObjectLabels.box).toBe('Cardboard Box')
  })
})
