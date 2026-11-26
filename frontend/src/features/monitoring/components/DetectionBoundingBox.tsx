import type { CSSProperties } from 'react'
import type { Detection } from '../../../types'
import {
  detectionObjectColors,
  detectionObjectLabels,
  formatDetectionConfidence,
} from '../../../utils/detection'

interface DetectionBoundingBoxProps {
  detection: Detection
}

export function DetectionBoundingBox({
  detection,
}: DetectionBoundingBoxProps) {
  const color = detectionObjectColors[detection.objectClass]
  const labelPosition = detection.boundingBox.x > 0.55 ? 'right-0' : 'left-0'
  const style: CSSProperties = {
    borderColor: color,
    boxShadow: `0 0 0 1px ${color}33, inset 0 0 20px ${color}0d`,
    height: `${detection.boundingBox.height * 100}%`,
    left: `${detection.boundingBox.x * 100}%`,
    top: `${detection.boundingBox.y * 100}%`,
    width: `${detection.boundingBox.width * 100}%`,
  }

  return (
    <div
      aria-label={`${detectionObjectLabels[detection.objectClass]} detection, ${formatDetectionConfidence(detection.confidence)}, tracking ID ${detection.trackingId}`}
      className="pointer-events-none absolute border-2"
      data-testid={`bounding-box-${detection.id}`}
      style={style}
    >
      <div
        className={`absolute top-0 ${labelPosition} min-w-max max-w-[calc(100vw-3rem)] rounded-br px-1.5 py-1 font-mono text-[0.5rem] leading-3 font-bold text-slate-950 shadow-lg sm:text-[0.5625rem]`}
        style={{ backgroundColor: color }}
      >
        <span className="block">
          {detectionObjectLabels[detection.objectClass].toUpperCase()}{' '}
          {formatDetectionConfidence(detection.confidence)}
        </span>
        <span className="block opacity-75">TRACK ID: {detection.trackingId}</span>
      </div>
      <span
        className="absolute -top-0.5 -left-0.5 size-2 border-t-2 border-l-2"
        style={{ borderColor: color }}
      />
      <span
        className="absolute -right-0.5 -bottom-0.5 size-2 border-r-2 border-b-2"
        style={{ borderColor: color }}
      />
    </div>
  )
}
