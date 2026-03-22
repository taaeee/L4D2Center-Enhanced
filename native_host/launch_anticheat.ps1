# L4D2 Center Enhanced - Native Messaging Host
# Reads a message from Chrome (stdin), launches the anticheat .exe, and responds.

# --- Read message from stdin ---
# Chrome sends: 4-byte little-endian length + UTF-8 JSON
$stdin = [System.Console]::OpenStandardInput()

# Read 4-byte length
$lengthBytes = New-Object byte[] 4
$stdin.Read($lengthBytes, 0, 4) | Out-Null
$messageLength = [System.BitConverter]::ToInt32($lengthBytes, 0)

# Read the JSON message
$messageBytes = New-Object byte[] $messageLength
$bytesRead = 0
while ($bytesRead -lt $messageLength) {
    $bytesRead += $stdin.Read($messageBytes, $bytesRead, $messageLength - $bytesRead)
}
$messageJson = [System.Text.Encoding]::UTF8.GetString($messageBytes)
$message = $messageJson | ConvertFrom-Json

# --- Process the message ---
$response = @{ success = $false; error = "" }

if ($message.action -eq "launch") {
    $exePath = $message.path

    if (-not $exePath -or -not (Test-Path $exePath)) {
        $response.error = "File not found: $exePath"
    } else {
        try {
            Start-Process -FilePath $exePath
            $response.success = $true
        } catch {
            $response.error = "Failed to launch: $_"
        }
    }
} elseif ($message.action -eq "browse") {
    try {
        Add-Type -AssemblyName System.Windows.Forms
        $dialog = New-Object System.Windows.Forms.OpenFileDialog
        $dialog.Title = "Select Anticheat Executable"
        $dialog.Filter = "Executable files (*.exe)|*.exe|All files (*.*)|*.*"
        $dialog.FilterIndex = 1
        # Show dialog on top of all windows
        $result = $dialog.ShowDialog([System.Windows.Forms.Form]::new())
        if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
            $response.success = $true
            $response["path"] = $dialog.FileName
        } else {
            $response.error = "cancelled"
        }
    } catch {
        $response.error = "Failed to open file dialog: $_"
    }
} else {
    $response.error = "Unknown action: $($message.action)"
}

# --- Send response to stdout ---
$responseJson = $response | ConvertTo-Json -Compress
$responseBytes = [System.Text.Encoding]::UTF8.GetBytes($responseJson)
$responseLengthBytes = [System.BitConverter]::GetBytes($responseBytes.Length)

$stdout = [System.Console]::OpenStandardOutput()
$stdout.Write($responseLengthBytes, 0, 4)
$stdout.Write($responseBytes, 0, $responseBytes.Length)
$stdout.Flush()
