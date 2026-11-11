import { Save } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { Dialog } from '../../../components/ui/Dialog'
import type { Area, Camera } from '../../../types'
import {
  cameraStatusOptions,
  cameraToFormValues,
  cameraTypeOptions,
  emptyCameraFormValues,
  resolutionOptions,
  validateCameraForm,
  type CameraFormErrors,
  type CameraFormValues,
} from '../cameraForm'

interface CameraFormDialogProps {
  areas: readonly Area[]
  camera: Camera | null
  onClose: () => void
  onSubmit: (values: CameraFormValues) => Promise<void>
  open: boolean
}

const inputClassName =
  'mt-1.5 h-10 w-full rounded-lg border border-slate-700/90 bg-slate-950/50 px-3 text-sm text-slate-200 outline-none transition-colors placeholder:text-slate-600 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10'

const labelClassName = 'text-xs font-medium text-slate-300'

export function CameraFormDialog({
  areas,
  camera,
  onClose,
  onSubmit,
  open,
}: CameraFormDialogProps) {
  const [errors, setErrors] = useState<CameraFormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [values, setValues] = useState<CameraFormValues>(() =>
    camera
      ? cameraToFormValues(camera)
      : { ...emptyCameraFormValues, areaId: areas[0]?.id ?? '' },
  )
  const formId = useId()
  const isEditing = camera !== null

  function updateField<Key extends keyof CameraFormValues>(
    key: Key,
    value: CameraFormValues[Key],
  ) {
    setValues((currentValues) => ({ ...currentValues, [key]: value }))
    setErrors((currentErrors) => ({ ...currentErrors, [key]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validationErrors = validateCameraForm(values)

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      await onSubmit(values)
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'The camera could not be saved.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function inputClasses(field: keyof CameraFormValues) {
    return `${inputClassName} ${errors[field] ? 'border-rose-400/70 focus:border-rose-400 focus:ring-rose-400/10' : ''}`
  }

  return (
    <Dialog
      description={
        isEditing
          ? 'Update the simulated camera metadata. The camera ID is preserved.'
          : 'Register a simulated camera. No stream URL or credentials are required.'
      }
      onClose={() => {
        if (!isSubmitting) onClose()
      }}
      open={open}
      size="large"
      title={isEditing ? 'Edit Camera' : 'Add Camera'}
    >
      <form id={formId} onSubmit={handleSubmit}>
        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          {camera ? (
            <div className="rounded-lg border border-cyan-400/15 bg-cyan-400/5 px-3 py-2.5 sm:col-span-2">
              <p className="text-xs text-slate-400">
                Editing{' '}
                <span className="font-mono font-bold text-cyan-300">{camera.id}</span>
                <span className="ml-2 font-mono text-[0.625rem] font-bold tracking-wider text-amber-300">
                  MOCK
                </span>
              </p>
            </div>
          ) : null}

          <label className={`${labelClassName} sm:col-span-2`} htmlFor={`${formId}-area`}>
            Demo Area <span className="text-rose-400">*</span>
            <select
              aria-describedby={errors.areaId ? `${formId}-area-error` : `${formId}-area-help`}
              aria-invalid={Boolean(errors.areaId)}
              className={inputClasses('areaId')}
              id={`${formId}-area`}
              onChange={(event) => updateField('areaId', event.target.value)}
              value={values.areaId}
            >
              <option value="">Select an area</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name} — {area.city}, {area.province}
                </option>
              ))}
            </select>
            {errors.areaId ? (
              <span className="mt-1.5 block text-[0.6875rem] text-rose-300" id={`${formId}-area-error`}>{errors.areaId}</span>
            ) : (
              <span className="mt-1.5 block text-[0.6875rem] font-normal text-slate-600" id={`${formId}-area-help`}>
                Assigns this camera to a reusable public-space reference.
              </span>
            )}
          </label>

          <label className={labelClassName} htmlFor={`${formId}-name`}>
            Camera Name <span className="text-rose-400">*</span>
            <input
              aria-describedby={errors.name ? `${formId}-name-error` : undefined}
              aria-invalid={Boolean(errors.name)}
              autoFocus
              className={inputClasses('name')}
              id={`${formId}-name`}
              onChange={(event) => updateField('name', event.target.value)}
              placeholder="e.g. Public Market Entrance Camera"
              value={values.name}
            />
            {errors.name ? (
              <span className="mt-1.5 block text-[0.6875rem] text-rose-300" id={`${formId}-name-error`}>
                {errors.name}
              </span>
            ) : null}
          </label>

          <label className={labelClassName} htmlFor={`${formId}-location`}>
            Location <span className="text-rose-400">*</span>
            <input
              aria-describedby={errors.location ? `${formId}-location-error` : undefined}
              aria-invalid={Boolean(errors.location)}
              className={inputClasses('location')}
              id={`${formId}-location`}
              onChange={(event) => updateField('location', event.target.value)}
              placeholder="e.g. Main Entrance"
              value={values.location}
            />
            {errors.location ? (
              <span className="mt-1.5 block text-[0.6875rem] text-rose-300" id={`${formId}-location-error`}>
                {errors.location}
              </span>
            ) : null}
          </label>

          <label className={labelClassName} htmlFor={`${formId}-building`}>
            Landmark / Building <span className="text-rose-400">*</span>
            <input
              aria-describedby={errors.building ? `${formId}-building-error` : undefined}
              aria-invalid={Boolean(errors.building)}
              className={inputClasses('building')}
              id={`${formId}-building`}
              onChange={(event) => updateField('building', event.target.value)}
              placeholder="e.g. Main Market Hall"
              value={values.building}
            />
            {errors.building ? (
              <span className="mt-1.5 block text-[0.6875rem] text-rose-300" id={`${formId}-building-error`}>
                {errors.building}
              </span>
            ) : null}
          </label>

          <label className={labelClassName} htmlFor={`${formId}-floor`}>
            Floor
            <input
              className={inputClasses('floor')}
              id={`${formId}-floor`}
              onChange={(event) => updateField('floor', event.target.value)}
              placeholder="e.g. Ground Floor"
              value={values.floor}
            />
          </label>

          <label className={labelClassName} htmlFor={`${formId}-type`}>
            Camera Type
            <select
              className={inputClasses('cameraType')}
              id={`${formId}-type`}
              onChange={(event) =>
                updateField(
                  'cameraType',
                  event.target.value as CameraFormValues['cameraType'],
                )
              }
              value={values.cameraType}
            >
              {cameraTypeOptions.map((cameraType) => (
                <option key={cameraType} value={cameraType}>
                  {cameraType}
                </option>
              ))}
            </select>
          </label>

          <label className={labelClassName} htmlFor={`${formId}-ip`}>
            IP Address <span className="font-normal text-slate-600">(optional)</span>
            <input
              aria-describedby={errors.ipAddress ? `${formId}-ip-error` : `${formId}-ip-help`}
              aria-invalid={Boolean(errors.ipAddress)}
              className={`${inputClasses('ipAddress')} font-mono`}
              id={`${formId}-ip`}
              inputMode="decimal"
              onChange={(event) => updateField('ipAddress', event.target.value)}
              placeholder="192.168.1.120"
              value={values.ipAddress}
            />
            {errors.ipAddress ? (
              <span className="mt-1.5 block text-[0.6875rem] text-rose-300" id={`${formId}-ip-error`}>
                {errors.ipAddress}
              </span>
            ) : (
              <span className="mt-1.5 block text-[0.6875rem] font-normal text-slate-600" id={`${formId}-ip-help`}>
                Used as a simulated label only; no connection is attempted.
              </span>
            )}
          </label>

          <label className={labelClassName} htmlFor={`${formId}-resolution`}>
            Resolution
            <select
              className={inputClasses('resolution')}
              id={`${formId}-resolution`}
              onChange={(event) => updateField('resolution', event.target.value)}
              value={values.resolution}
            >
              {resolutionOptions.map((resolution) => (
                <option key={resolution} value={resolution}>
                  {resolution}
                </option>
              ))}
            </select>
          </label>

          {isEditing ? (
            <label className={labelClassName} htmlFor={`${formId}-status`}>
              Connection Status
              <select
                className={inputClasses('status')}
                id={`${formId}-status`}
                onChange={(event) =>
                  updateField(
                    'status',
                    event.target.value as CameraFormValues['status'],
                  )
                }
                value={values.status}
              >
                {cameraStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className={`${labelClassName} sm:col-span-2`} htmlFor={`${formId}-description`}>
            Description
            <textarea
              className={`${inputClasses('description')} min-h-24 resize-y py-2.5`}
              id={`${formId}-description`}
              onChange={(event) => updateField('description', event.target.value)}
              placeholder="Describe the simulated camera coverage area."
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
          <Button disabled={isSubmitting} onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button disabled={isSubmitting} type="submit">
            <Save aria-hidden="true" className="size-4" />
            {isSubmitting
              ? 'Saving…'
              : isEditing
                ? 'Save Changes'
                : 'Add Camera'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
