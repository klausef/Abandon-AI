# Abandon-AI processor

Python processor that samples an explicitly authorized video source, sends
frames to Roboflow's YOLO-World Serverless API, tracks approved object classes,
applies conservative unattended-object timing rules, and sends metadata-only
events to Convex using HMAC-SHA256.

It does **not** decide that an object is dangerous or abandoned based on its
appearance. It creates a `potential_unattended_object` event only after
spatio-temporal checks, and the incident still requires human verification.

## Current source mode

The local configuration currently uses:

```text
PROCESSOR_SOURCE_MODE=disabled
VIDEO_SOURCE=
VIDEO_SOURCE_AUTHORIZED=false
ROBOFLOW_CLOUD_UPLOAD_ACKNOWLEDGED=false
```

Running the CLI in this mode exits successfully after reporting that preview is
dashboard-only. It does not open a camera, contact Roboflow, consume credits,
or send processor detections to Convex. The dashboard preview is an explicitly
labeled graphical placeholder, not fabricated CCTV footage.

When an authorized Tapo C200C becomes available, change the source mode to
`tapo_rtsp` and configure its local RTSP URL in the ignored `.env` file. Never
commit or share the camera-account credentials.

## Tapo C200C RTSP

1. In the Tapo app, open **Advanced Settings → Camera Account** and set a
   dedicated username and password. This is separate from your TP-Link login.
2. Reserve the camera's LAN IP address in your router.
3. Run the guided setup from `api/processor`:

```powershell
.\scripts\configure-tapo.ps1
```

It prompts for the host, username, and password (hidden), validates the stream
with ffprobe, and writes only the source-related keys to the ignored `.env`.
Use `-Frames 240` for a two-minute run, or `-SkipProbe` when ffprobe is not
available.

To probe without changing configuration:

```powershell
.\scripts\check-rtsp.ps1 -CameraHost 192.168.1.50 -Username operator `
  -Stream stream2 -OutputFrame .\frame.jpg
```

The password prompt is masked. For unattended automation, supply a
`SecureString` with `-Password`; never put a plaintext password on the command
line. Automated `configure-tapo.ps1` calls must also include
`-AcknowledgeAuthorizedCloudUpload`.

4. Validate Convex, the camera, and (optionally) Roboflow without ingesting
   events:

```powershell
uv run campus-safety-processor --doctor
uv run campus-safety-processor --doctor --check-roboflow
```

`--check-roboflow` sends one frame and consumes one hosted inference.
The read-only Convex doctor check confirms endpoint health but cannot validate
the HMAC device secret; the bounded processor run validates signed ingestion.

The equivalent manual `.env` settings are:

```dotenv
PROCESSOR_SOURCE_MODE=tapo_rtsp
VIDEO_SOURCE=rtsp://CAMERA_USER:URL_ENCODED_PASSWORD@CAMERA_IP:554/stream2
VIDEO_SOURCE_AUTHORIZED=true
ROBOFLOW_CLOUD_UPLOAD_ACKNOWLEDGED=true
RTSP_TRANSPORT=tcp
RTSP_TIMEOUT_SECONDS=10
MAX_SAMPLED_FRAMES=10
```

`stream1` is the HD stream and `stream2` is the lower-resolution stream, which
costs less to sample. URL-encode special characters in the password (`@` → `%40`,
`:` → `%3A`, `#` → `%23`, `/` → `%2F`). RTSP defaults to TCP because UDP is
unreliable over Wi-Fi, and `RTSP_TIMEOUT_SECONDS` bounds stream open and read
operations. Never expose port `554` to the internet.

## Supported candidate objects

- Person
- Backpack, handbag, suitcase, duffel bag, shopping bag, briefcase, generic bag
- Bottle, coffee mug, cup
- Cardboard box, package, parcel

Unknown Roboflow labels are discarded. Terms such as `suspicious-looking
object` are intentionally not accepted as model classes.

## Processing flow

```text
Authorized MP4/webcam/RTSP source
  -> sampled frames
  -> Roboflow YOLO-World v2-s Serverless API
  -> separate ByteTrack person/object trackers
  -> background, movement, stationarity, and person-association state
  -> HMAC-authenticated Convex metadata events
```

No frame, snapshot, or video is uploaded to Convex. Roboflow receives sampled
frames, so the processor requires an explicit environment acknowledgement.

## Windows PowerShell setup

Python 3.12 or newer and `uv` are required.

```powershell
cd "api\processor"
Copy-Item .env.example .env
uv sync --extra vision --extra dev
```

Edit `.env` locally. At minimum provide:

- `ROBOFLOW_API_KEY`
- `PROCESSOR_SHARED_SECRET`
- `VIDEO_SOURCE`
- `VIDEO_SOURCE_AUTHORIZED=true`
- `ROBOFLOW_CLOUD_UPLOAD_ACKNOWLEDGED=true`

For an authorized prerecorded file or webcam, use
`PROCESSOR_SOURCE_MODE=video`. For the future Tapo C200C RTSP stream, use
`PROCESSOR_SOURCE_MODE=tapo_rtsp`.

When `MONITORING_ZONE_ID` is set, `MONITORING_ZONE_POLYGON` is also required
and must exactly match that Convex zone using normalized `x:y` points. Portable
objects outside the polygon are discarded; people remain available for
association near zone boundaries.

Never put secrets in source files, command-line arguments, `VITE_*` variables,
or chat messages.

After revoking any exposed key, store its newly rotated replacement without
echoing it or putting it in PowerShell history:

```powershell
.\scripts\set-roboflow-key.ps1
```

The script writes only to the ignored `.env` file and never prints the key.

Run the processor:

```powershell
uv run campus-safety-processor
```

Use `MAX_SAMPLED_FRAMES=10` for an initial bounded smoke test. An unbounded run
requires `CONTINUOUS_PROCESSING_ACKNOWLEDGED=true` because hosted inference is
billed per sampled frame. The processor
first checks `/api/ai/health`; if the backend, camera, zone, device, secret, API
key, or authorization acknowledgement is unavailable, it fails without
creating detections.

## Cloud deployment prerequisite

The supplied client URL is:

```text
https://youthful-pigeon-735.ap-southeast-2.convex.cloud
```

Its expected HTTP Actions URL is:

```text
https://youthful-pigeon-735.ap-southeast-2.convex.site
```

The Convex functions are deployed to this development deployment. The health
endpoint and a signed processor heartbeat were verified successfully. Reference
cameras, demo zones, demo users, and `PROCESSOR-DEMO-001` were seeded. A local,
ignored `.env` contains the matching generated processor secret; the Roboflow
API key and authorized video source remain intentionally unset.

## State safeguards

- Objects present during warmup are treated as background.
- Background objects become eligible only after moving or being associated with
  a person.
- Newly appearing objects after warmup are eligible for monitoring.
- Stationary and unattended durations must both pass their configured limits.
- Nearby people reset the unattended timer.
- Each processor-session track emits at most one potential incident.
- Convex performs a second active-track duplicate check.

All thresholds in `.env.example` are experimental defaults, not validated
public-safety thresholds.

## Quality checks

```powershell
uv run pytest
uv run ruff check .
uv run mypy
```
