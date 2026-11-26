<#
.SYNOPSIS
Configures the processor for a Tapo RTSP camera without exposing credentials.

.DESCRIPTION
Prompts for the camera account, validates the stream with ffprobe, and updates
only the source-related keys in the gitignored api/processor/.env file. The
password is read as a SecureString, URL-encoded, and never printed.

Create the camera account in the Tapo app first:
Advanced Settings -> Camera Account. It is separate from your TP-Link login.

.EXAMPLE
.\scripts\configure-tapo.ps1

.EXAMPLE
.\scripts\configure-tapo.ps1 -CameraHost 192.168.1.50 -Username operator `
  -Stream stream2 -Frames 240

.EXAMPLE
.\scripts\configure-tapo.ps1 -SkipProbe
#>
[CmdletBinding()]
param(
  [string]$CameraHost,

  [string]$Username,

  [System.Security.SecureString]$Password,

  [ValidateSet('stream1', 'stream2')]
  [string]$Stream = 'stream2',

  [ValidateRange(1, 65535)]
  [int]$Port = 554,

  [ValidateSet('tcp', 'udp')]
  [string]$Transport = 'tcp',

  [ValidateRange(1, 120)]
  [int]$TimeoutSeconds = 10,

  [ValidateRange(1, 100000)]
  [int]$Frames = 10,

  [switch]$AcknowledgeAuthorizedCloudUpload,

  [switch]$SkipProbe
)

$ErrorActionPreference = 'Stop'

$processorRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $processorRoot '.env'
$examplePath = Join-Path $processorRoot '.env.example'

if (-not (Test-Path $envPath)) {
  if (-not (Test-Path $examplePath)) {
    throw 'The processor .env.example file was not found.'
  }
  Copy-Item $examplePath $envPath
  Write-Host 'Created api/processor/.env from .env.example.'
}

if (-not $CameraHost) {
  $CameraHost = Read-Host 'Camera IP or hostname'
}
if ($CameraHost -notmatch '^[A-Za-z0-9][A-Za-z0-9.-]{0,252}$') {
  throw 'The camera host must be an IP address or hostname without a scheme or path.'
}

if (-not $Username) {
  $Username = Read-Host 'Camera account username'
}
if ([string]::IsNullOrWhiteSpace($Username)) {
  throw 'The camera account username cannot be empty.'
}

if (-not $AcknowledgeAuthorizedCloudUpload) {
  Write-Warning 'The processor sends sampled camera frames to Roboflow hosted inference.'
  $acknowledgement = Read-Host 'Type YES to confirm this source is authorized and approve cloud upload'
  if ($acknowledgement -cne 'YES') {
    throw 'Camera authorization and Roboflow cloud-upload acknowledgement are required.'
  }
}

$ownsPassword = $false
if ($null -eq $Password) {
  $Password = Read-Host 'Camera account password' -AsSecureString
  $ownsPassword = $true
}
$securePassword = $Password
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
  $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  if ([string]::IsNullOrWhiteSpace($plainPassword)) {
    throw 'The camera account password cannot be empty.'
  }
  $encodedUser = [uri]::EscapeDataString($Username)
  $encodedPassword = [uri]::EscapeDataString($plainPassword)
} finally {
  if ($bstr -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
  $plainPassword = $null
  if ($ownsPassword) {
    $securePassword.Dispose()
  }
}

$rtspUrl = "rtsp://${encodedUser}:${encodedPassword}@${CameraHost}:${Port}/${Stream}"
$encodedPassword = $null

if (-not $SkipProbe) {
  $probeScript = Join-Path $PSScriptRoot 'check-rtsp.ps1'
  if (-not (Test-Path $probeScript)) {
    throw 'check-rtsp.ps1 was not found next to this script.'
  }
  Write-Host "Probing $CameraHost over $Transport (credentials hidden)..."
  & $probeScript -RtspUrl $rtspUrl -Transport $Transport
} else {
  Write-Warning 'Skipping the stream probe. Run check-rtsp.ps1 before processing.'
}

$updates = [ordered]@{
  'PROCESSOR_SOURCE_MODE'                 = 'tapo_rtsp'
  'VIDEO_SOURCE'                          = $rtspUrl
  'VIDEO_SOURCE_AUTHORIZED'               = 'true'
  'ROBOFLOW_CLOUD_UPLOAD_ACKNOWLEDGED'    = 'true'
  'RTSP_TRANSPORT'                        = $Transport
  'RTSP_TIMEOUT_SECONDS'                  = [string]$TimeoutSeconds
  'MAX_SAMPLED_FRAMES'                    = [string]$Frames
  'CONTINUOUS_PROCESSING_ACKNOWLEDGED'    = 'false'
}

$lines = @(Get-Content -Path $envPath)
$seen = @{}
$updated = foreach ($line in $lines) {
  if ($line -match '^([A-Za-z0-9_]+)=') {
    $key = $Matches[1]
    if ($updates.Contains($key)) {
      $seen[$key] = $true
      "$key=$($updates[$key])"
    } else {
      $line
    }
  } else {
    $line
  }
}
$updated = @($updated)
foreach ($key in $updates.Keys) {
  if (-not $seen.ContainsKey($key)) {
    $updated += "$key=$($updates[$key])"
  }
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllLines($envPath, [string[]]$updated, $utf8NoBom)

$written = @(Get-Content -Path $envPath)
if (-not ($written -match '^VIDEO_SOURCE=rtsp://')) {
  throw 'Failed to write VIDEO_SOURCE to the processor .env file.'
}
$apiKeyLine = $written | Where-Object { $_ -like 'ROBOFLOW_API_KEY=*' } | Select-Object -First 1
if (-not $apiKeyLine -or $apiKeyLine.Trim() -eq 'ROBOFLOW_API_KEY=') {
  Write-Warning 'ROBOFLOW_API_KEY is empty. Run .\scripts\set-roboflow-key.ps1 before processing.'
}
$secretLine = $written | Where-Object { $_ -like 'PROCESSOR_SHARED_SECRET=*' } | Select-Object -First 1
if (-not $secretLine -or $secretLine.Trim() -eq 'PROCESSOR_SHARED_SECRET=') {
  Write-Warning 'PROCESSOR_SHARED_SECRET is empty. Copy it from the Convex deployment.'
}

Write-Host ''
Write-Host 'Updated api/processor/.env'
Write-Host '  source:  rtsp://[redacted]'
Write-Host ("  stream:  {0} over {1}, timeout {2}s" -f $Stream, $Transport, $TimeoutSeconds)
Write-Host ("  frames:  {0} (bounded run; 240 frames is about 2 minutes at 2 fps)" -f $Frames)
Write-Host ''
Write-Host 'Next:'
Write-Host '  uv run campus-safety-processor --doctor'
Write-Host '  uv run campus-safety-processor'
