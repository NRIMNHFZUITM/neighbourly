# Speaks each narration segment to a WAV file with a built-in Windows voice.
#   powershell -File scripts/video/tts.ps1 -Out <dir> [-Voice "Microsoft George"] [-Rate 0]
param(
  [Parameter(Mandatory = $true)][string]$Out,
  [string]$Voice = "Microsoft George",
  [int]$Rate = 0,
  [string]$Only = ""
)
$ErrorActionPreference = "Stop"
$segments = Get-Content -Raw -Encoding UTF8 (Join-Path $PSScriptRoot "narration.json") | ConvertFrom-Json
New-Item -ItemType Directory -Force $Out | Out-Null

# Newer OneCore voices (George, Susan, Mark) through WinRT; falls back to System.Speech desktop voices.
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType = WindowsRuntime]
$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() |
  Where-Object { $_.Name -eq "AsTask" -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } |
  Select-Object -First 1
function Await($op, [Type]$type) {
  $task = $asTask.MakeGenericMethod($type).Invoke($null, @($op))
  $task.Wait() | Out-Null
  return $task.Result
}

$synth = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
$match = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices | Where-Object { $_.DisplayName -eq $Voice } | Select-Object -First 1
if (-not $match) { throw "Voice '$Voice' not found" }
$synth.Voice = $match
# 1.0 is normal speed. Rate is in tenths, e.g. -1 = 0.9x.
$synth.Options.SpeakingRate = [Math]::Max(0.5, 1.0 + $Rate / 10.0)

foreach ($s in $segments) {
  if ($Only -and $s.id -ne $Only) { continue }
  $stream = Await ($synth.SynthesizeTextToStreamAsync($s.text)) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
  $size = [uint32]$stream.Size
  $reader = New-Object Windows.Storage.Streams.DataReader($stream.GetInputStreamAt(0))
  $null = Await ($reader.LoadAsync($size)) ([uint32])
  $bytes = New-Object byte[] $size
  $reader.ReadBytes($bytes)
  [System.IO.File]::WriteAllBytes((Join-Path $Out "$($s.id).wav"), $bytes)
  Write-Output "$($s.id) $size"
}
