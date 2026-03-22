@echo off
echo ============================================
echo   L4D2 Center Enhanced - Native Host Setup
echo   by taeyong
echo ============================================
echo.

:: Get Extension ID
set /p EXT_ID="Extension ID (from chrome://extensions): "
if "%EXT_ID%"=="" (
    echo ERROR: Extension ID is required.
    pause
    exit /b 1
)

:: Build absolute path to launch_host.bat
set "HOST_PATH=%~dp0launch_host.bat"
set "MANIFEST_PATH=%~dp0com.l4d2center.enhanced.json"

:: Convert backslashes to forward slashes for JSON
set "HOST_PATH_ESCAPED=%HOST_PATH:\=/%"

:: Write the manifest file with actual values
(
echo {
echo   "name": "com.l4d2center.enhanced",
echo   "description": "L4D2 Center Enhanced - Native Messaging Host",
echo   "path": "%HOST_PATH_ESCAPED%",
echo   "type": "stdio",
echo   "allowed_origins": ["chrome-extension://%EXT_ID%/"]
echo }
) > "%MANIFEST_PATH%"

:: Register in Windows Registry (HKCU, no admin needed)
reg add "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.l4d2center.enhanced" /ve /t REG_SZ /d "%MANIFEST_PATH%" /f

echo.
echo ============================================
echo   Setup complete!
echo   Manifest: %MANIFEST_PATH%
echo   Registry key added successfully.
echo   Please reload the extension.
echo   Por favor recarga la extension.
echo ============================================
pause
