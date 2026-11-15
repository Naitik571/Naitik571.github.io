@echo off
cd /d "%~dp0"

echo Checking for changes...
git add -A

git diff --cached --quiet
if %errorlevel%==0 (
  echo No changes to push.
  echo.
  pause
  exit /b 0
)

for /f "tokens=1-4 delims=/:. " %%a in ("%date% %time%") do set STAMP=%%a-%%b-%%c %%d
git commit -m "Auto update %STAMP%"

echo.
echo Pushing to GitHub...
git push origin main

echo.
echo Done. Site updates at https://naitik.my.id/ in about a minute.
pause
