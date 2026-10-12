@echo off
cd /d "C:\Users\junaidmunir.janjua\Desktop\Mobile-Application-master\backend"
:loop
echo [%date% %time%] Rossomandi 24-7 Live Sync starting... >> sync.log
python -u sync.py >> sync.log 2>&1
echo [%date% %time%] Rossomandi sync process exited or crashed. Auto-restarting in 5s... >> sync.log
timeout /t 5 /nobreak >nul
goto loop
