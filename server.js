#!/usr/bin/env node

/**
 * Servidor simples para a aplicação de Torneio de Padel
 * Usa Node.js com módulos nativos
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { parse } = require('querystring');

const PORT = process.env.PORT || 8000;
const HOSTNAME = 'localhost';

const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.csv': 'text/csv; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // Handle API endpoints
    if (pathname === '/api/update-csv' && req.method === 'POST') {
        handleUpdateCSV(req, res);
        return;
    }

    // Serve static files
    serveStaticFile(pathname, req, res);
});

function handleUpdateCSV(req, res) {
    let body = '';

    req.on('data', chunk => {
        body += chunk.toString();
    });

    req.on('end', () => {
        try {
            const data = JSON.parse(body);
            const filename = data.filename;
            const rows = data.data;

            // Validate filename
            if (!filename || !filename.endsWith('.csv') || filename.includes('/') || filename.includes('\\')) {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid filename' }));
                return;
            }

            const filepath = path.join(__dirname, 'dados', filename);

            // Ensure file is in dados directory
            if (!filepath.startsWith(path.join(__dirname, 'dados'))) {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Access denied' }));
                return;
            }

            if (!rows || rows.length === 0) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'No data provided' }));
                return;
            }

            // Write CSV file
            const headers = Object.keys(rows[0]);
            let csv = headers.join(',') + '\n';

            for (const row of rows) {
                const values = headers.map(header => {
                    const value = row[header];
                    // Escape quotes in CSV values
                    if (value === null || value === undefined) return '';
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                        return '"' + value.replace(/"/g, '""') + '"';
                    }
                    return value;
                });
                csv += values.join(',') + '\n';
            }

            fs.writeFileSync(filepath, csv, 'utf-8');

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok' }));
        } catch (error) {
            console.error('Error updating CSV:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
    });
}

function serveStaticFile(pathname, req, res) {
    // Default to index.html for root
    let filePath = pathname === '/' ? '/index.html' : pathname;
    filePath = path.join(__dirname, filePath);

    // Prevent directory traversal
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    // Check if file exists
    fs.stat(filePath, (err, stats) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
        }

        if (stats.isDirectory()) {
            filePath = path.join(filePath, 'index.html');
            fs.stat(filePath, (err) => {
                if (err) {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('404 Not Found');
                    return;
                }
                sendFile(filePath, res);
            });
        } else {
            sendFile(filePath, res);
        }
    });
}

function sendFile(filePath, res) {
    const ext = path.extname(filePath);
    const mimeType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(500);
            res.end('Internal Server Error');
            return;
        }

        res.writeHead(200, { 'Content-Type': mimeType });
        res.end(data);
    });
}

server.listen(PORT, HOSTNAME, () => {
    console.log(`\n🏓 Torneio de Padel - Servidor Iniciado`);
    console.log(`\n📍 Abra no navegador: http://${HOSTNAME}:${PORT}`);
    console.log(`\n⏹️  Pressione Ctrl+C para parar\n`);
});

// Handle server errors
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Erro: A porta ${PORT} já está em uso`);
        console.error(`\nTente usar outra porta: SET PORT=8080 && node server.js`);
    } else {
        console.error('Erro no servidor:', err);
    }
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n👋 Servidor parado');
    process.exit(0);
});
