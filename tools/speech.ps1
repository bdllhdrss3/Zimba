param([Parameter(Mandatory=$true)][string]$Text, [Parameter(Mandatory=$true)][string]$Output, [string]$Voice)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$speech = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  if ($Voice) { $speech.SelectVoice($Voice) }
  $speech.SetOutputToWaveFile($Output)
  $speech.Speak($Text)
} finally {
  $speech.Dispose()
}