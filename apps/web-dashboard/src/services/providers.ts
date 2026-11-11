import type { Camera, Detection, Incident } from '../types'

/** Boundary for camera metadata. RTSP support can be added behind this contract later. */
export interface CameraProvider {
  listCameras(): Promise<readonly Camera[]>
  getCamera(cameraId: string): Promise<Camera | undefined>
}

/** Boundary for detector output. A YOLO provider can implement this contract later. */
export interface DetectionProvider {
  listDetections(): Promise<readonly Detection[]>
}

/** Boundary for incident persistence. A Convex client can implement this later. */
export interface IncidentService {
  listIncidents(): Promise<readonly Incident[]>
  getIncident(incidentNumber: string): Promise<Incident | undefined>
}
