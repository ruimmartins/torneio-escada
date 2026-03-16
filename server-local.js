#!/usr/bin/env node

/**
 * Servidor local para desenvolvimento
 * Served archivos estáticos + API Express
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const api = require('./api/index.js');

const PORT = process.env.PORT || 3000;
const app = express();

// Servir arquivos estáticos
app.use(express.static(__dirname));

// Usar as rotas da API
app.use(api);

// Default index.html para rotas não encontradas (para SPA)
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(__dirname, 'index.html'));
    }
});

app.listen(PORT, () => {
    console.log(`\n🎾 Torneio de Padel - Servidor Local`);
    console.log(`📍 http://localhost:${PORT}`);
    console.log(`\n💾 Database: MongoDB`);
    console.log(`⏹️  Ctrl+C para parar\n`);
});
