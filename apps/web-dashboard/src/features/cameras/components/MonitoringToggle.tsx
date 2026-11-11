interface MonitoringToggleProps {
  cameraId: string
  cameraName: string
  enabled: boolean
  onToggleRequested: () => void
}

export function MonitoringToggle({
  cameraId,
  cameraName,
  enabled,
  onToggleRequested,
}: MonitoringToggleProps) {
  return (
    <button
      aria-checked={enabled}
      aria-label={`${enabled ? 'Disable' : 'Enable'} monitoring for ${cameraName} (${cameraId})`}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
        enabled
          ? 'border-cyan-300/30 bg-cyan-400/80'
          : 'border-slate-600 bg-slate-700'
      }`}
      onClick={onToggleRequested}
      role="switch"
      type="button"
    >
      <span
        className={`absolute top-0.5 size-4.5 rounded-full bg-white shadow-sm transition-transform ${
          enabled ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}
