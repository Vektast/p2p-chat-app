@echo off

REM Batch script a P2P Chat alkalmazas inditasahoz
REM Helyezd ezt a .bat fajlt ugyanabba a mappaba,
REM ahol a unified_server.js es a p2p_chat.html talalhato
REM (pl. C:\Users\FELHASZNALONEVED\Downloads\P2P_Chat_Server\)

echo A P2P Chat alkalmazas inditasa...
echo =====================================

explorer "http://localhost:3000/p2p_chat.html"
REM A script sajat konyvtaranak beallitasa aktualis konyvtarkent
REM Ez biztositja, hogy a parancsok a megfelelo helyrol fussanak.
cd /D "%~dp0"
echo.
echo Aktualis munkakonyvtar: %CD%
echo.

REM --- Unified Node.js Szerver Inditasa ---
echo Indul az egysegges Node.js szerver (unified_server.js)...
echo Ez a szerver egyben kezeli a HTTP es WebSocket kapcsolatokat.

REM Indítás háttérben, rejtett CMD ablakkal
REM A /b kapcsoló megakadályozza az új ablak megnyitását
REM A >nul 2>&1 elrejti a kimeneteket
start "" /b cmd /c "node unified_server.js" >nul 2>&1
IF ERRORLEVEL 1 (
    echo.
    echo HIBA: Az egysegges Node.js szerver inditasa sikertelen!
    echo Ellenorizd, hogy:
    echo - A Node.js telepitve van-e es a 'node' parancs elerheto-e
    echo - A 'unified_server.js' fajl letezik-e ebben a mappaban
    echo - Az Express.js es ws fuggsegek telepitve vannak-e (npm install)
    echo - Nincs mas alkalmazas, ami hasznaja a 3000-es portot
    echo.
    echo Probald meg manualisan futtatni: node unified_server.js
    pause
    exit /b 1
)
echo Az egysegges Node.js szerver elinditva egy uj parancssori ablakban.
echo.

REM --- Varakozas a szerver indulasara ---
echo Kis varakozas a szerver teljes indulasara (kb. 3 masodperc)...
timeout /t 3 /nobreak > nul 2>&1
echo.

REM --- Szerver elerheto ellenorzese es port felismerés ---
echo Ellenorzom a szerver elerhetoseget...
set FOUND_PORT=
set CHAT_URL=

REM Probaljuk a 3000-es portot eloszor
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3000' -TimeoutSec 2 -UseBasicParsing; if ($response.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" > nul 2>&1
IF NOT ERRORLEVEL 1 (
    set FOUND_PORT=3000
    set CHAT_URL=http://localhost:3000
    echo Szerver talalva a 3000-es porton.
) ELSE (
    echo A 3000-es port nem elerheto, probalom a fallback portokat...
    
    REM Probaljuk a fallback portokat (3001-3010)
    for /L %%p in (3001,1,3010) do (
        if not defined FOUND_PORT (
            powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:%%p' -TimeoutSec 1 -UseBasicParsing; if ($response.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" > nul 2>&1
            if not errorlevel 1 (
                set FOUND_PORT=%%p
                set CHAT_URL=http://localhost:%%p
                echo Szerver talalva a %%p-es porton.
            )
        )
    )
)

if not defined FOUND_PORT (
    echo.
    echo FIGYELEM: Nem talaltam elerheto szervert a vart portokon!
    echo Nezd meg a szerver ablakaban, hogy melyik porton fut,
    echo es nyisd meg manualisan a bongeszoben.
    echo.
    echo Peldaul: http://localhost:XXXX (ahol XXXX a szerver portja)
    pause
    exit /b 1
)


echo.
echo Ha a böngésző nem nyílt meg automatikusan, kérlek nyisd meg manuálisan:
echo %FULL_URL%
echo.
echo.
echo =====================================
echo Az indítási folyamat befejeződött.
echo.

echo FONTOS TUDNIVALÓK:
echo - Az egységes szerver (unified_server.js) a háttérben fut
echo - Ez a szerver egyszerre kezeli a HTTP és WebSocket kapcsolatokat
echo - Az alkalmazás használata közben ez a parancssori ablak maradjon nyitva
echo - Az alkalmazás és a szerver leállításához zárd be ezt a parancssori ablakot
echo.

REM A script futása itt véget ér, de a 'start' paranccsal indított folyamatok tovább futnak.