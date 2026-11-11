import type { IncidentObjectType } from '../types'
import { cameraService } from './cameraService'
import { detectionService } from './detectionService'
import { incidentService } from './incidentService'

export async function triggerMockIncident(
  cameraId: string,
  objectType: IncidentObjectType,
) {
  const cameras = await cameraService.getCameras()
  const camera = cameras.find((candidate) => candidate.id === cameraId)

  if (!camera) {
    throw new Error(`Camera ${cameraId} was not found.`)
  }

  const detection = detectionService.createPotentialIncidentDetection(
    camera,
    objectType,
  )
  const incident = await incidentService.createFromDetection(detection, cameras)
  return { detection, incident }
}
