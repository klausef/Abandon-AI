<#
.SYNOPSIS
Sends a signed processor heartbeat to a local Convex deployment.

.DESCRIPTION
Reads the shared secret from PROCESSOR_SHARED_SECRET, signs the exact request
body with HMAC-SHA256, and posts it to /api/ai/events. The secret is never
written to disk.

.EXAMPLE
$env:PROCESSOR_SHARED_SECRET = "<same secret set on the deployment>"
.\scripts\smoke-ingestion.ps1
#>
param(
  [string]$SiteUrl = $(if ($env:VITE_CONVEX_SITE_URL) { $env:VITE_CONVEX_SITE_URL } else { 'http://127.0.0.1:3211' }),
  [string]$DeviceId = 'PROCESSOR-DEMO-001',
  [string]$Secret = $env:PROCESSOR_SHARED_SECRET,
  [string]$CameraId = 'CAM-001'
)

$ErrorActionPreference = 'Stop'

if (-not $Secret) {
  throw 'PROCESSOR_SHARED_SECRET is not set in this terminal. Set it to the same value configured on the Convex deployment.'
}

if ($Secret.Length -lt 32) {
  throw 'PROCESSOR_SHARED_SECRET must be at least 32 characters.'
}

function ConvertTo-Hex {
  param([byte[]]$Bytes)
  return -join ($Bytes | ForEach-Object { $_.ToString('x2') })
}

function Write-HttpResponse {
  param($Response)
  Write-Host "HTTP $($Response.StatusCode)"
  $Response.Content
}

function Write-HttpError {
  param($ErrorRecord)
  if (-not $ErrorRecord.Exception.Response) {
    throw $ErrorRecord
  }

  $response = $ErrorRecord.Exception.Response
  Write-Host "HTTP $([int]$response.StatusCode)"
  $stream = $response.GetResponseStream()
  if ($stream) {
    $reader = New-Object System.IO.StreamReader($stream)
    try {
      $reader.ReadToEnd()
    } finally {
      $reader.Dispose()
    }
  }
}

Write-Host "Checking $SiteUrl/api/ai/health"
try {
  $health = Invoke-WebRequest -Method Get -Uri "$SiteUrl/api/ai/health" -UseBasicParsing
  Write-HttpResponse $health
} catch {
  Write-HttpError $_
  throw 'Health check failed. Is npx convex dev running?'
}

$now = [DateTimeOffset]::UtcNow
$occurredAt = $now.ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
$eventId = "evt-smoke-$([guid]::NewGuid().ToString('N'))"
$nonce = [guid]::NewGuid().ToString('N')
$timestamp = $now.ToUnixTimeSeconds().ToString()

$body = [ordered]@{
  schema_version      = '1.0'
  event_id            = $eventId
  event_type          = 'processor_heartbeat'
  idempotency_key     = "idem-$eventId"
  processor_device_id = $DeviceId
  occurred_at         = $occurredAt
  status              = 'processing'
  camera_id           = $CameraId
  processing_session_id = 'session-smoke-001'
  metrics             = [ordered]@{
    fps                 = 0
    inference_latency_ms = 0
    queue_depth         = 0
  }
} | ConvertTo-Json -Compress -Depth 8

$bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)
$sha256 = [System.Security.Cryptography.SHA256]::Create()
try {
  $bodyHash = ConvertTo-Hex $sha256.ComputeHash($bodyBytes)
} finally {
  $sha256.Dispose()
}

$canonical = @(
  'v1'
  'POST'
  '/api/ai/events'
  $DeviceId
  $timestamp
  $nonce
  $bodyHash
) -join "`n"

$hmac = [System.Security.Cryptography.HMACSHA256]::new(
  [System.Text.Encoding]::UTF8.GetBytes($Secret)
)
try {
  $signature = ConvertTo-Hex $hmac.ComputeHash(
    [System.Text.Encoding]::UTF8.GetBytes($canonical)
  )
} finally {
  $hmac.Dispose()
}

$headers = @{
  'X-Processor-Device-Id'         = $DeviceId
  'X-Processor-Timestamp'         = $timestamp
  'X-Processor-Nonce'             = $nonce
  'X-Processor-Signature'         = $signature
  'X-Processor-Signature-Version' = 'v1'
}

Write-Host "Posting signed heartbeat $eventId from $DeviceId"
try {
  $response = Invoke-WebRequest `
    -Method Post `
    -Uri "$SiteUrl/api/ai/events" `
    -ContentType 'application/json; charset=utf-8' `
    -Headers $headers `
    -Body $bodyBytes `
    -UseBasicParsing
  Write-HttpResponse $response
} catch {
  Write-HttpError $_
  exit 1
}
