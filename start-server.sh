#!/bin/bash

# Script para iniciar o servidor de Torneio de Padel em macOS/Linux

echo "Iniciando servidor de Torneio de Padel..."
echo ""

# Verificar se node está instalado
if ! command -v node &> /dev/null; then
    echo "Erro: Node.js não está instalado"
    echo "Por favor, instale Node.js usando:"
    echo "  - Ubuntu/Debian: sudo apt-get install nodejs"
    echo "  - macOS: brew install node"
    echo "  - Ou baixe de https://nodejs.org"
    exit 1
fi

# Obter diretório do script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# Abrir navegador se disponível
if command -v xdg-open &> /dev/null; then
    # Linux
    echo "Abrindo http://localhost:8000 no navegador..."
    xdg-open http://localhost:8000 &
elif command -v open &> /dev/null; then
    # macOS
    echo "Abrindo http://localhost:8000 no navegador..."
    open http://localhost:8000 &
fi

# Iniciar servidor
echo ""
echo "Servidor iniciado em http://localhost:8000"
echo "Pressione Ctrl+C para parar"
echo ""

node server.js
