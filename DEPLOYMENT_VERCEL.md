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

---

**Documentação:** [MongoDB Atlas](https://docs.atlas.mongodb.com) | [Vercel REST API](https://vercel.com/docs/rest-api)
