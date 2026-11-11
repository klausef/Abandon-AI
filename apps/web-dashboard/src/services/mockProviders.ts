import type { Camera, Detection, Incident } from '../types'
import { cameraService } from './cameraService'
import { detectionService } from './detectionService'
import { incidentService } from './incidentService'
import type {
  CameraProvider,
  DetectionProvider,
  IncidentService,
} from './providers'

export class MockCameraProvider implements CameraProvider {
  listCameras(): Promise<readonly Camera[]> {
    return cameraService.getCameras()
  }

  getCamera(cameraId: string): Promise<Camera | undefined> {
    return cameraService.getCameraById(cameraId)
  }
}

export class MockDetectionProvider implements DetectionProvider {
  listDetections(): Promise<readonly Detection[]> {
    return detectionService.getDetections()
  }
}

export class MockIncidentService implements IncidentService {
  listIncidents(): Promise<readonly Incident[]> {
    return incidentService.getIncidents()
  }

  getIncident(incidentNumber: string): Promise<Incident | undefined> {
    return incidentService.getIncident(incidentNumber)
  }
}
