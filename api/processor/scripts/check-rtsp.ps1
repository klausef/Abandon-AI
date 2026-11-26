<#
.SYNOPSIS
Validates an authorized RTSP stream without printing credentials.

.DESCRIPTION
Runs ffprobe against a Tapo (or other RTSP) camera and prints codec,
resolution, and frame rate. The URL is passed to ffprobe as a single argument
and is never echoed by this script.

Provide either an explicit -RtspUrl, set TAPO_RTSP_URL in the environment, or
pass -CameraHost and -Username. The camera password is requested with masked
input so it does not appear in PowerShell history.

.EXAMPLE
.\scripts\check-rtsp.ps1 -CameraHost 192.168.1.50 -Username operator

.EXAMPLE
.\scripts\check-rtsp.ps1 -CameraHost 192.168.1.50 -Username operator `
  -Stream stream2

.EXAMPLE
.\scripts\check-rtsp.ps1 -CameraHost 192.168.1.50 -Username operator `
  -OutputFrame .\frame.jpg
#>
[CmdletBinding(DefaultParameterSetName = 'Url')]
param(
  [Parameter(ParameterSetName = 'Url')]
  [string]$RtspUrl = $env:TAPO_RTSP_URL,

  [Parameter(ParameterSetName = 'Parts', Mandatory = $true)]
  [string]$CameraHost,

  [Parameter(ParameterSetName = 'Parts', Mandatory = $true)]
  [string]$Username,

  [Parameter(ParameterSetName = 'Parts')]
  [System.Security.SecureString]$Password,

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

function Write-RedactedNativeOutput {
  param(
    [object[]]$Lines,
    [string]$SensitiveUrl
  )

  foreach ($line in $Lines) {
    $safeLine = [string]$line
    if ($SensitiveUrl) {
      $safeLine = $safeLine.Replace($SensitiveUrl, 'rtsp://[redacted]')
    }
    $safeLine = $safeLine -replace '(?i)rtsps?://[^\s@]+@', 'rtsp://[credentials-redacted]@'
    Write-Host $safeLine
  }
}

if ($PSCmdlet.ParameterSetName -eq 'Parts') {
  if ($CameraHost -notmatch '^[A-Za-z0-9][A-Za-z0-9.-]{0,252}$') {
    throw 'The camera host must be an IP address or hostname without a scheme or path.'
  }
  if ([string]::IsNullOrWhiteSpace($Username)) {
    throw 'The camera account username cannot be empty.'
  }
  $ownsPassword = $false
  if ($null -eq $Password) {
    $Password = Read-Host 'Camera account password' -AsSecureString
    $ownsPassword = $true
  }
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password)
  try {
    $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    if ([string]::IsNullOrWhiteSpace($plainPassword)) {
      throw 'The camera account password cannot be empty.'
    }
    $encodedPassword = [uri]::EscapeDataString($plainPassword)
  } finally {
    if ($bstr -ne [IntPtr]::Zero) {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
    $plainPassword = $null
    if ($ownsPassword) {
      $Password.Dispose()
    }
  }
  $encodedUser = [uri]::EscapeDataString($Username)
  $RtspUrl = "rtsp://${encodedUser}:${encodedPassword}@${CameraHost}:${Port}/${Stream}"
  $encodedPassword = $null
}

if (-not $RtspUrl) {
  throw 'Provide -RtspUrl, set TAPO_RTSP_URL, or pass -CameraHost and -Username.'
}
if ($RtspUrl -notmatch '^rtsps?://') {
  throw 'The source must be an rtsp:// or rtsps:// URL.'
}

$ffprobe = Get-Command ffprobe -CommandType Application -ErrorAction SilentlyContinue |
  Select-Object -First 1
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

$previousErrorPreference = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try {
  $probeOutput = @(& $ffprobe.Source @probeArguments 2>&1)
  $probeExitCode = $LASTEXITCODE
} finally {
  $ErrorActionPreference = $previousErrorPreference
}
Write-RedactedNativeOutput -Lines $probeOutput -SensitiveUrl $RtspUrl
if ($probeExitCode -ne 0) {
  throw "ffprobe failed with exit code $probeExitCode. Check the camera account, IP, and transport."
}

Write-Host 'Stream opened successfully.'

if ($OutputFrame) {
  $ffmpeg = Get-Command ffmpeg -CommandType Application -ErrorAction SilentlyContinue |
    Select-Object -First 1
  if (-not $ffmpeg) {
    throw 'ffmpeg is not installed or not on PATH.'
  }

  $framePath = [System.IO.Path]::GetFullPath($OutputFrame)
  $previousErrorPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $frameOutput = @(& $ffmpeg.Source -rtsp_transport $Transport -v error -y `
      -i $RtspUrl -frames:v 1 $framePath 2>&1)
    $frameExitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorPreference
  }
  Write-RedactedNativeOutput -Lines $frameOutput -SensitiveUrl $RtspUrl
  if ($frameExitCode -ne 0) {
    throw "ffmpeg failed with exit code $frameExitCode."
  }

  Write-Host "Saved one decoded frame to $framePath"
}
