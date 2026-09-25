param([string]$Text, [string]$Output, [string]$Voice, [switch]$List)
$ErrorActionPreference = 'Stop'
# WinRT speech reaches OneCore voices (e.g. Microsoft George) that System.Speech lists but cannot select.
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType = WindowsRuntime]
$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
} | Select-Object -First 1
function Wait-Operation($operation, [Type]$type) {
  $task = $asTask.MakeGenericMethod($type).Invoke($null, @($operation))
  $null = $task.Wait(-1)
  $task.Result
}
$voices = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices
if ($List) { $voices | ForEach-Object { "$($_.DisplayName) | $($_.Gender) | $($_.Language)" }; exit 0 }
$synth = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
if ($Voice) {
  $match = $voices | Where-Object { $_.DisplayName -eq $Voice -or ($_.DisplayName + ' Desktop') -eq $Voice } | Select-Object -First 1
  if (-not $match) { throw "Voice '$Voice' not found. Available: $(($voices | ForEach-Object DisplayName) -join ', ')" }
  $synth.Voice = $match
}
$stream = Wait-Operation ($synth.SynthesizeTextToStreamAsync($Text)) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
$reader = New-Object Windows.Storage.Streams.DataReader($stream.GetInputStreamAt(0))
$size = [uint32]$stream.Size
$null = Wait-Operation ($reader.LoadAsync($size)) ([uint32])
$bytes = New-Object byte[] $size
$reader.ReadBytes($bytes)
[IO.File]::WriteAllBytes($Output, $bytes)
