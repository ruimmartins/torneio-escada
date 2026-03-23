# Deploy no Vercel

## Prerequisitos

1. Conta MongoDB Atlas (veja [SETUP_MONGODB.md](SETUP_MONGODB.md))
2. Conta GitHub com este repositório
3. Conta Vercel

## Passo 1: Preparar Repositório Git

```bash
# Inicializar git (se não estiver)
git init
git add .
git commit -m "Initial commit: Torneio Escada with MongoDB"
git remote add origin https://github.com/seu-user/torneio-escada.git
git push -u origin main
```

## Passo 2: Conectar Vercel ao GitHub

1. Aceda a [vercel.com/new](https://vercel.com/new)
2. Clique em "Import Git Repository"
3. Selecione `torneio-escada` do seu GitHub
4. Clique em "Import"

## Passo 3: Configurar Variáveis de Ambiente

Na página de configuração do Vercel:

1. Vá a **Environment Variables**
2. Adicione uma nova variável:
   - **Name**: `MONGODB_URI`
   - **Value**: Copie a connection string do MongoDB Atlas
     ```
     mongodb+srv://torneio-user:PASSWORD@cluster0.xxxxx.mongodb.net/torneio?retryWrites=true&w=majority
     ```

3. Clique em "Save"

## Passo 4: Fazer Deploy

1. Clique no botão **Deploy**
2. Aguarde 2-3 minutos
3. Quando terminar, clique em **Visit** para aceder à aplicação

Seu URL será algo como: `https://torneio-escada.vercel.app`

## Passo 5: Inicializar Base de Dados

Na primeira visita:

1. Aceda a `https://seu-projeto.vercel.app`
2. A aplicação vai tentar conectar ao MongoDB
3. Se não tiver dados, faça upload via interface

## Troubleshooting

### "MongoDB connection error"

- Verifique que a `MONGODB_URI` está correta em Vercel → Settings → Environment Variables
- Verifique que seu IP está whitelisted no MongoDB Atlas → Network Access

### "502 Bad Gateway"

- Aguarde alguns minutos (Vercel está inicializando)
- Verifique os logs em Vercel → Deployments → [seu-deployment] → Runtime Logs

### "Cannot find module 'mongoose'"

- Execute `npm install` localmente
- Faça `git push` novamente
- Vercel vai instalar dependências automaticamente

## Atualizar Aplicação

Depois de cada mudança:

```bash
git add .
git commit -m "Sua mensagem"
git push origin main
```

Vercel faz deploy automaticamente!

## Acessar Dados via API

Após deploy, pode aceder aos dados via API:

```
GET https://seu-projeto.vercel.app/api/jogadores
GET https://seu-projeto.vercel.app/api/duplas
GET https://seu-projeto.vercel.app/api/desafios
```

## Backups

Seus dados estão no MongoDB Atlas. Para backup:

1. Aceda a MongoDB Atlas
2. Vá a Cluster → Tools → Backup
3. Configure backups automáticos

## Rollback

Se precisar voltar a uma versão anterior:

1. Aceda a Vercel → Deployments
2. Encontre o deployment anterior
3. Clique em "..."  → "Promote to Production"

## Configurar Push Notifications (Opcional)

O sistema suporta notificações push web. Para ativar:

### Gerar Chaves VAPID

Execute localmente (apenas uma vez):

```bash
npm install --save-dev web-push
npx web-push generate-vapid-keys
```

Output:
```
Public Key: BO3x8...
Private Key: gH2a1...
```

### Adicionar Variáveis no Vercel

1. Vá a Vercel → [seu-projeto] → Settings → Environment Variables
2. Adicione 3 novas variáveis:
   - **Name**: `VAPID_PUBLIC_KEY`
     **Value**: (copie a Public Key gerada acima)
   - **Name**: `VAPID_PRIVATE_KEY**
     **Value**: (copie a Private Key gerada acima)
   - **Name**: `VAPID_PUBLIC_EMAIL`
     **Value**: `mailto:seu-email@example.com`

3. Clique "Save"
4. Faça redeploy manualmente ou aguarde próximo push de código

### Verificar Status

Após deploy:

1. Abra a app em navegador (Chrome/Firefox/Edge)
2. Aguarde login
3. Deve aparecer prompt: "🔔 Ativar notificações de desafios e resultados?"
4. Clique em "Sim"
5. Permita notificações no browser

### Testar

Para testar manualmente (com curl):

```bash
# 1. Login e obter token
curl -X POST https://seu-projeto.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"seu-user","password":"seu-pass"}' \
  -c cookies.txt

# 2. Criar novo desafio (deve enviar push)
curl -X POST https://seu-projeto.vercel.app/api/desafio/novo \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "dupla_1_id": 1,
    "dupla_2_id": 2,
    "data_desafio": "2026-03-25",
    "dupla_1_pontos_desafio": 100,
    "dupla_2_pontos_desafio": 80
  }'
```

Se push estiver ativo, jogadores subscritos receberão notificação.

---

**Documentação:** [MongoDB Atlas](https://docs.atlas.mongodb.com) | [Vercel REST API](https://vercel.com/docs/rest-api) | [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
