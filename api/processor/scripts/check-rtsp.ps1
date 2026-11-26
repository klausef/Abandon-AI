<#
.SYNOPSIS
Validates an authorized RTSP stream without printing credentials.

.DESCRIPTION
Runs ffprobe against a Tapo (or other RTSP) camera and prints codec,
resolution, and frame rate. The URL is passed to ffprobe as a single argument
and is never echoed by this script.

Provide either an explicit -RtspUrl, set TAPO_RTSP_URL in the environment, or
pass -CameraHost, -Username, and -Password so the URL can be built locally.

.EXAMPLE
$env:TAPO_RTSP_URL = 'rtsp://operator:secret@192.168.1.50:554/stream2'
.\scripts\check-rtsp.ps1
Remove-Item Env:TAPO_RTSP_URL

.EXAMPLE
.\scripts\check-rtsp.ps1 -CameraHost 192.168.1.50 -Username operator `
  -Password 'secret' -Stream stream2

.EXAMPLE
.\scripts\check-rtsp.ps1 -CameraHost 192.168.1.50 -Username operator `
  -Password 'secret' -OutputFrame .\frame.jpg
#>
[CmdletBinding(DefaultParameterSetName = 'Url')]
param(
  [Parameter(ParameterSetName = 'Url')]
  [string]$RtspUrl = $env:TAPO_RTSP_URL,

  [Parameter(ParameterSetName = 'Parts', Mandatory = $true)]
  [string]$CameraHost,

  [Parameter(ParameterSetName = 'Parts', Mandatory = $true)]
  [string]$Username,

  [Parameter(ParameterSetName = 'Parts', Mandatory = $true)]
  [string]$Password,

  [Parameter(ParameterSetName = 'Parts')]
  [ValidateSet('stream1', 'stream2')]
  [string]$Stream = 'stream2',

  [Parameter(ParameterSetName = 'Parts')]
  [ValidateRange(1, 65535)]
  [int]$Port = 554,

  [ValidateSet('tcp', 'udp')]
  [string]$Transport = 'tcp',

  [string]$OutputFrame
)

$ErrorActionPreference = 'Stop'

if ($PSCmdlet.ParameterSetName -eq 'Parts') {
  $encodedUser = [uri]::EscapeDataString($Username)
  $encodedPassword = [uri]::EscapeDataString($Password)
  $RtspUrl = "rtsp://${encodedUser}:${encodedPassword}@${CameraHost}:${Port}/${Stream}"
}

if (-not $RtspUrl) {
  throw 'Provide -RtspUrl, set TAPO_RTSP_URL, or pass -CameraHost/-Username/-Password.'
}

$ffprobe = Get-Command ffprobe -ErrorAction SilentlyContinue
if (-not $ffprobe) {
  throw 'ffprobe is not installed or not on PATH.'
}

Write-Host "Probing RTSP over $Transport (credentials hidden)..."

$probeArguments = @(
  '-rtsp_transport', $Transport,
  '-v', 'error',
  '-select_streams', 'v:0',
  '-show_entries', 'stream=codec_name,width,height,avg_frame_rate',
  '-of', 'default=noprint_wrappers=1',
  $RtspUrl
)

& $ffprobe.Source @probeArguments
if ($LASTEXITCODE -ne 0) {
  throw "ffprobe failed with exit code $LASTEXITCODE. Check the camera account, IP, and transport."
}

Write-Host 'Stream opened successfully.'

if ($OutputFrame) {
  $ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
  if (-not $ffmpeg) {
    throw 'ffmpeg is not installed or not on PATH.'
  }

  $framePath = [System.IO.Path]::GetFullPath($OutputFrame)
  & $ffmpeg.Source -rtsp_transport $Transport -v error -y `
    -i $RtspUrl -frames:v 1 $framePath
  if ($LASTEXITCODE -ne 0) {
    throw "ffmpeg failed with exit code $LASTEXITCODE."
  }

  Write-Host "Saved one decoded frame to $framePath"
}
