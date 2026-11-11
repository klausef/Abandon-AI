<#
.SYNOPSIS
Stores a newly rotated Roboflow API key in the processor's ignored .env file.

.DESCRIPTION
Prompts with a masked SecureString so the key is not echoed or placed in shell
history. The processor needs the plaintext value at runtime, so it is written
only to apps/processor/.env, which is excluded by the repository .gitignore.

Do not use a key that has appeared in chat, logs, source code, or screenshots.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$processorRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $processorRoot '.env'
$examplePath = Join-Path $processorRoot '.env.example'

if (-not (Test-Path $envPath)) {
  if (-not (Test-Path $examplePath)) {
    throw 'The processor .env.example file was not found.'
  }
  Copy-Item $examplePath $envPath
}

Write-Host 'Enter a newly rotated Roboflow API key. Input is hidden.'
$secureKey = Read-Host 'Roboflow API key' -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)

try {
  $key = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  if ([string]::IsNullOrWhiteSpace($key)) {
    throw 'The Roboflow API key cannot be empty.'
  }
  if ($key -notmatch '^rf_[A-Za-z0-9_-]{20,}$') {
    throw 'The value does not look like a Roboflow API key.'
  }

  $lines = @(Get-Content $envPath)
  $replaced = $false
  $updated = foreach ($line in $lines) {
    if ($line -like 'ROBOFLOW_API_KEY=*') {
      $replaced = $true
      "ROBOFLOW_API_KEY=$key"
    } else {
      $line
    }
  }
  if (-not $replaced) {
    $updated += "ROBOFLOW_API_KEY=$key"
  }

  Set-Content -Path $envPath -Value $updated -Encoding utf8
  Write-Host 'Updated apps/processor/.env. The key was not displayed.'
} finally {
  if ($bstr -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
  $key = $null
  $secureKey.Dispose()
}
