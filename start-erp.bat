::[Bat To Exe Converter]
::978f952a14a936cc963da21a135fa983
@echo off
title 🚀 1stChoice ERP Launcher
color 0a

echo =====================================================
echo             💼 1stChoice ERP - Local Server
echo =====================================================
echo.

:: 🧠 Step 1 - Check if MongoDB service exists
sc query MongoDB >nul 2>&1
if %errorlevel% neq 0 (
  echo ❌ MongoDB service not found on this system!
  echo 💡 Please ensure MongoDB is installed and the service is named "MongoDB".
  echo Press any key to exit...
  pause >nul
  exit /b
)

:: ✅ Step 2 - Start MongoDB service
echo 🔄 Starting MongoDB service...
net start MongoDB >nul 2>&1
if %errorlevel% equ 0 (
  echo ✅ MongoDB service started successfully!
) else (
  echo ⚠️ MongoDB service is already running.
)
echo.

:: 📂 Step 3 - Move to ERP folder
cd /d "C:\Users\Raj_Katana\Desktop\firstChoice"
if not exist app.js (
  echo ❌ Error: Could not find app.js in this folder!
  echo Please verify the ERP folder path.
  pause
  exit /b
)
echo 📁 Switched to ERP directory successfully.
echo.

:: 🌐 Step 4 - Launch ERP in browser
echo 🌍 Opening 1stChoice ERP in browser...
start "" "http://localhost:3000"
echo.

:: 🧩 Step 5 - Start Node.js server
echo 🟢 Starting local ERP server using Node.js...
node app.js

:: 🛑 When Node.js stops
echo.
echo =====================================================
echo ✅ ERP Server stopped or closed manually.
echo 🌐 Reopen anytime using:  FirstChoiceLauncher.exe
echo =====================================================
echo.
pause
