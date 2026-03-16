#!/usr/bin/env python3
"""
Servidor simples para servir a aplicação de torneio de padel
E permitir atualizações dos arquivos CSV
"""

import os
import sys
import json
import csv
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from pathlib import Path

class TorneioHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        # Servir arquivos estáticos normalmente
        return super().do_GET()
    
    def do_POST(self):
        """Lidar com atualizações de CSV"""
        parsed_path = urlparse(self.path)
        
        if parsed_path.path == '/api/update-csv':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            
            try:
                data = json.loads(body.decode('utf-8'))
                filename = data.get('filename')
                rows = data.get('data', [])
                
                if not filename or not rows:
                    self.send_error(400, "Dados inválidos")
                    return
                
                # Validar nome de arquivo
                if not filename.endswith('.csv') or '/' in filename or '\\' in filename:
                    self.send_error(403, "Nome de arquivo inválido")
                    return
                
                filepath = os.path.join('dados', filename)
                
                # Garantir que está no diretório correto
                if not os.path.abspath(filepath).startswith(os.path.abspath('dados')):
                    self.send_error(403, "Acesso negado")
                    return
                
                # Escrever CSV atualizado
                if rows:
                    headers = list(rows[0].keys())
                    with open(filepath, 'w', newline='', encoding='utf-8') as f:
                        writer = csv.DictWriter(f, fieldnames=headers)
                        writer.writeheader()
                        writer.writerows(rows)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'ok'}).encode())
            except Exception as e:
                print(f"Erro ao atualizar CSV: {e}", file=sys.stderr)
                self.send_error(500, f"Erro ao atualizar: {str(e)}")
        else:
            self.send_error(404, "Endpoint não encontrado")
    
    def end_headers(self):
        # Adicionar headers CORS
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        return super().end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

def run_server(port=8000):
    """Iniciar servidor na porta especificada"""
    server_address = ('', port)
    httpd = HTTPServer(server_address, TorneioHandler)
    
    print(f"Servidor iniciado em http://localhost:{port}")
    print(f"Pressione Ctrl+C para parar")
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor parado")
        httpd.server_close()

if __name__ == '__main__':
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print(f"Porta inválida: {sys.argv[1]}")
            sys.exit(1)
    
    run_server(port)
