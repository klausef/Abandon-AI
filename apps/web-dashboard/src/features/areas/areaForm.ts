import type { AreaInput } from '../../types'

export type AreaFormValues = AreaInput
export type AreaFormErrors = Partial<Record<keyof AreaFormValues, string>>

export const emptyAreaFormValues: AreaFormValues = {
  name: '',
  city: 'Valencia City',
  province: 'Bukidnon',
  description: '',
}

export function validateAreaForm(values: AreaFormValues): AreaFormErrors {
  const errors: AreaFormErrors = {}
  if (!values.name.trim()) errors.name = 'Area name is required.'
  if (!values.city.trim()) errors.city = 'City or municipality is required.'
  if (!values.province.trim()) errors.province = 'Province is required.'
  return errors
}

export function normalizeAreaForm(values: AreaFormValues): AreaInput {
  return {
    name: values.name.trim(),
    city: values.city.trim(),
    province: values.province.trim(),
    description: values.description.trim(),
  }
}
