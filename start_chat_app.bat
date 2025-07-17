@echo off

REM Batch script to start the P2P Chat application
REM Place this .bat file in the same folder
REM where unified_server.js and p2p_chat.html are located
REM (e.g. C:\Users\USERNAME\Downloads\P2P_Chat_Server\)

echo Starting P2P Chat application...
echo =====================================

explorer "http://localhost:3000/p2p_chat.html"
REM Set the script's own directory as the current directory
REM This ensures that commands run from the correct location.
cd /D "%~dp0"
echo.
echo Current working directory: %CD%
echo.

REM --- Starting Unified Node.js Server ---
echo Starting unified Node.js server (unified_server.js)...
echo This server handles both HTTP and WebSocket connections.

REM Start in background with hidden CMD window
REM The /b switch prevents opening a new window
REM >nul 2>&1 hides the outputs
start "" /b cmd /c "node unified_server.js" >nul 2>&1
IF ERRORLEVEL 1 (
    echo.
    echo ERROR: Failed to start the unified Node.js server!
    echo Check that:
    echo - Node.js is installed and the 'node' command is available
    echo - The 'unified_server.js' file exists in this folder
    echo - Express.js and ws dependencies are installed (npm install)
    echo - No other application is using port 3000
    echo.
    echo Try running manually: node unified_server.js
    pause
    exit /b 1
)
echo The unified Node.js server has been started in a new command prompt window.
echo.

REM --- Wait for server to start ---
echo Short wait for the server to fully start (about 3 seconds)...
timeout /t 3 /nobreak > nul 2>&1
echo.

REM --- Check server availability and port detection ---
echo Checking server availability...
set FOUND_PORT=
set CHAT_URL=

REM Try port 3000 first
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3000' -TimeoutSec 2 -UseBasicParsing; if ($response.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" > nul 2>&1
IF NOT ERRORLEVEL 1 (
    set FOUND_PORT=3000
    set CHAT_URL=http://localhost:3000
    echo Server found on port 3000.
) ELSE (
    echo Port 3000 not available, trying fallback ports...
    
    REM Try fallback ports (3001-3010)
    for /L %%p in (3001,1,3010) do (
        if not defined FOUND_PORT (
            powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:%%p' -TimeoutSec 1 -UseBasicParsing; if ($response.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" > nul 2>&1
            if not errorlevel 1 (
                set FOUND_PORT=%%p
                set CHAT_URL=http://localhost:%%p
                echo Server found on port %%p.
            )
        )
    )
)

if not defined FOUND_PORT (
    echo.
    echo WARNING: No server found on expected ports!
    echo Check the server window to see which port it's running on,
    echo and open it manually in your browser.
    echo.
    echo For example: http://localhost:XXXX (where XXXX is the server port)
    pause
    exit /b 1
)


echo.
echo If the browser didn't open automatically, please open it manually:
echo %FULL_URL%
echo.
echo.
echo =====================================
echo Startup process completed.
echo.

echo IMPORTANT INFORMATION:
echo - The unified server (unified_server.js) is running in the background
echo - This server handles both HTTP and WebSocket connections
echo - Keep this command prompt window open while using the application
echo - To stop the application and server, close this command prompt window
echo.

REM The script ends here, but processes started with 'start' command continue running.