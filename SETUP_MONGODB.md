# Setup MongoDB Atlas

## Passo 1: Criar Conta MongoDB Atlas

1. Ir para https://www.mongodb.com/cloud/atlas
2. Clique em "Sign Up" e crie uma conta (grátis)
3. Confirme o email

## Passo 2: Criar um Cluster

1. Na dashboard, clique em "Create a Deployment"
2. Escolha "Shared" (grátis)
3. Escolha provedor (AWS, Google Cloud ou Azure) - qualquer um
4. Escolha a região mais próxima (ex: eu-west-1 para Portugal)
5. Clique em "Create"
6. Aguarde 2-3 minutos até o cluster estar pronto

## Passo 3: Criar Database User

1. No sidebar, vá a "Security" → "Database Access"
2. Clique "Add new database user"
3. Username: `torneio-user` (ou outro)
4. Password: Gere uma password strong
5. **Salve a password num local seguro!**
6. Permissions: "Atlas Admin"
7. Clique "Add User"

## Passo 4: Whitelist IP

1. No sidebar, vá a "Security" → "Network Access"
2. Clique "Add IP Address"
3. Selecione "Allow access from anywhere" ou coloque IPs específicos
4. Para Vercel: Use "127.0.0.1/32" + "Allow access from anywhere" é mais seguro

## Passo 5: Obter Connection String

1. Na dashboard principal, clique no botão "Connect" no seu cluster
2. Escolha "Drivers"
3. Selecione "Node.js"
4. Copie a connection string (algo como):
   ```
   mongodb+srv://torneio-user:PASSWORD@cluster0.xxxxx.mongodb.net/torneio?retryWrites=true&w=majority
   ```

## Passo 6: Substituir Placeholders

Substitua:
- `torneio-user` pelo seu username
- `PASSWORD` pela password que criou
- `cluster0.xxxxx` pelo seu cluster URL

## Passo 7: Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```
MONGODB_URI=mongodb+srv://torneio-user:sua-password@cluster0.xxxxx.mongodb.net/torneio?retryWrites=true&w=majority
PORT=3000
```

**IMPORTANTE**: Nunca comita `.env` - adicione ao `.gitignore`

## Teste Conexão Localmente

```bash
npm install
npm start
```

Verifique se vê "MongoDB connected!" no console.

## Para Deploy no Vercel

1. Vá para https://vercel.com
2. Conecte seu repositório GitHub
3. Na página de settings do projeto, vá a "Environment Variables"
4. Adicione:
   - Name: `MONGODB_URI`
   - Value: `mongodb+srv://torneio-user:PASSWORD@cluster0.xxxxx.mongodb.net/torneio?retryWrites=true&w=majority`
5. Deploy!

---

**Dúvidas?** Verifique a connection string na dashboard do MongoDB Atlas em "Cluster → Connect → Drivers"
