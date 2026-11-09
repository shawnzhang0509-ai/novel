param([string]$Voice, [string]$TextFile, [string]$Out, [string]$Rate = "0%", [string]$Pitch = "0%")
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType = WindowsRuntime]
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await($op, [Type]$t) { $task = $asTask.MakeGenericMethod($t).Invoke($null, @($op)); $task.Wait(-1) | Out-Null; $task.Result }
$s = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
$s.Voice = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices | Where-Object { $_.DisplayName -eq "Microsoft $Voice" } | Select-Object -First 1
$text = [IO.File]::ReadAllText($TextFile, [Text.Encoding]::UTF8)
$text = [Security.SecurityElement]::Escape($text)
$ssml = "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='zh-CN'><prosody rate='$Rate' pitch='$Pitch'>$text</prosody></speak>"
$stream = Await ($s.SynthesizeSsmlToStreamAsync($ssml)) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
$reader = New-Object Windows.Storage.Streams.DataReader($stream.GetInputStreamAt(0))
$n = [uint32]$stream.Size
$null = Await ($reader.LoadAsync($n)) ([uint32])
$bytes = New-Object byte[] $n
$reader.ReadBytes($bytes)
[IO.File]::WriteAllBytes($Out, $bytes)
