@echo off
REM Script para iniciar o servidor de Torneio de Padel no Windows

echo Iniciando servidor de Torneio de Padel...
echo.

REM Verificar se node está instalado
node --version >nul 2>&1
if errorlevel 1 (
    echo Erro: Node.js não está instalado ou não está no PATH
    echo Por favor, instale Node.js de https://nodejs.org
    pause
    exit /b 1
)

REM Iniciar servidor
echo Abrindo http://localhost:8000 em seu navegador...
timeout /t 2 /nobreak >nul
start http://localhost:8000

node server.js

if errorlevel 1 (
    echo.
    echo Erro ao iniciar servidor
    pause
)
