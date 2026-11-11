import { Save } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { Dialog } from '../../../components/ui/Dialog'
import type { Area } from '../../../types'
import {
  emptyAreaFormValues,
  normalizeAreaForm,
  validateAreaForm,
  type AreaFormErrors,
  type AreaFormValues,
} from '../areaForm'

interface AreaFormDialogProps {
  area: Area | null
  onClose: () => void
  onSubmit: (values: AreaFormValues) => Promise<void>
  open: boolean
}

const inputClassName =
  'mt-1.5 h-10 w-full rounded-lg border border-slate-700/90 bg-slate-950/50 px-3 text-sm text-slate-200 outline-none transition-colors placeholder:text-slate-600 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10'
const labelClassName = 'text-xs font-medium text-slate-300'

export function AreaFormDialog({
  area,
  onClose,
  onSubmit,
  open,
}: AreaFormDialogProps) {
  const [errors, setErrors] = useState<AreaFormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [values, setValues] = useState<AreaFormValues>(() =>
    area
      ? {
          name: area.name,
          city: area.city,
          province: area.province,
          description: area.description,
        }
      : emptyAreaFormValues,
  )
  const formId = useId()

  function updateField<Key extends keyof AreaFormValues>(
    key: Key,
    value: AreaFormValues[Key],
  ) {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validationErrors = validateAreaForm(values)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await onSubmit(normalizeAreaForm(values))
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'The area could not be saved.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function inputClasses(field: keyof AreaFormValues) {
    return `${inputClassName} ${errors[field] ? 'border-rose-400/70 focus:border-rose-400 focus:ring-rose-400/10' : ''}`
  }

  return (
    <Dialog
      description={
        area
          ? 'Update this reusable demo area. Assigned camera IDs are preserved.'
          : 'Add a reusable demo area that cameras can be assigned to.'
      }
      onClose={() => {
        if (!isSubmitting) onClose()
      }}
      open={open}
      size="large"
      title={area ? 'Edit Area' : 'Add Area'}
    >
      <form id={formId} onSubmit={handleSubmit}>
        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          {area ? (
            <div className="rounded-lg border border-cyan-400/15 bg-cyan-400/5 px-3 py-2.5 sm:col-span-2">
              <span className="text-xs text-slate-400">Editing </span>
              <span className="font-mono text-xs font-bold text-cyan-300">
                {area.id}
              </span>
              <span className="ml-2 font-mono text-[0.625rem] font-bold text-amber-300">
                MOCK
              </span>
            </div>
          ) : null}

          <label className={`${labelClassName} sm:col-span-2`} htmlFor={`${formId}-name`}>
            Area Name <span className="text-rose-400">*</span>
            <input
              aria-describedby={errors.name ? `${formId}-name-error` : undefined}
              aria-invalid={Boolean(errors.name)}
              autoFocus
              className={inputClasses('name')}
              id={`${formId}-name`}
              onChange={(event) => updateField('name', event.target.value)}
              placeholder="e.g. Valencia Public Market"
              value={values.name}
            />
            {errors.name ? <span className="mt-1.5 block text-[0.6875rem] text-rose-300" id={`${formId}-name-error`}>{errors.name}</span> : null}
          </label>

          <label className={labelClassName} htmlFor={`${formId}-city`}>
            City / Municipality <span className="text-rose-400">*</span>
            <input
              aria-describedby={errors.city ? `${formId}-city-error` : undefined}
              aria-invalid={Boolean(errors.city)}
              className={inputClasses('city')}
              id={`${formId}-city`}
              onChange={(event) => updateField('city', event.target.value)}
              placeholder="e.g. Valencia City"
              value={values.city}
            />
            {errors.city ? <span className="mt-1.5 block text-[0.6875rem] text-rose-300" id={`${formId}-city-error`}>{errors.city}</span> : null}
          </label>

          <label className={labelClassName} htmlFor={`${formId}-province`}>
            Province <span className="text-rose-400">*</span>
            <input
              aria-describedby={errors.province ? `${formId}-province-error` : undefined}
              aria-invalid={Boolean(errors.province)}
              className={inputClasses('province')}
              id={`${formId}-province`}
              onChange={(event) => updateField('province', event.target.value)}
              placeholder="e.g. Bukidnon"
              value={values.province}
            />
            {errors.province ? <span className="mt-1.5 block text-[0.6875rem] text-rose-300" id={`${formId}-province-error`}>{errors.province}</span> : null}
          </label>

          <label className={`${labelClassName} sm:col-span-2`} htmlFor={`${formId}-description`}>
            Description
            <textarea
              className={`${inputClasses('description')} min-h-24 resize-y py-2.5`}
              id={`${formId}-description`}
              onChange={(event) => updateField('description', event.target.value)}
              placeholder="Describe the public-space category represented by this demo area."
              value={values.description}
            />
          </label>

          {submitError ? (
            <div className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2.5 text-xs text-rose-200 sm:col-span-2" role="alert">
              {submitError}
            </div>
          ) : null}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-slate-800 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <Button disabled={isSubmitting} onClick={onClose} variant="secondary">Cancel</Button>
          <Button disabled={isSubmitting} type="submit">
            <Save aria-hidden="true" className="size-4" />
            {isSubmitting ? 'Saving…' : area ? 'Save Changes' : 'Add Area'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
