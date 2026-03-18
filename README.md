# 🎾 Torneio de Padel - Modo Escada

Sistema de gerenciamento de torneio de padel em **modo escada** (ladder system) com **MongoDB** e deploy **Vercel**.

## ✨ Características

- ✅ **Ranking dinâmico** - Sistema de classificação automático baseado em pontos
- ✅ **Sistema de desafios** - Desafios entre duplas com validação de posição (máx 5)
- ✅ **Scoring avançado** - Validação de tennis scoring (tennis rules)
- ✅ **MongoDB** - Persistência em base de dados
- ✅ **Cookies** - Login baseado em cookies (sem criar contas)
- ✅ **Mobile-first** - Design responsivo otimizado para smartphone
- ✅ **Vercel ready** - Deploy automático em Vercel

## 🚀 Quick Start

### Desenvolvimento Local

**Pré-requisitos:** Node.js 18+, MongoDB Atlas account

```bash
# 1. Clonar e entrar no diretório
git clone https://github.com/seu-user/torneio-escada.git
cd torneio-escada

# 2. Instalar dependências
npm install

# 3. Configurar MongoDB
cp .env.example .env
# Edite .env e coloque sua MONGODB_URI do MongoDB Atlas

# 4. Popular base de dados
node seed-db.js

# 5. Iniciar servidor
npm start
# Aceda a http://localhost:3000
```

### Deploy no Vercel

[Veja guia completo em DEPLOYMENT_VERCEL.md](DEPLOYMENT_VERCEL.md)

**TL;DR:**
1. Push código para GitHub
2. Conecte Vercel ao repo
3. Defina `MONGODB_URI` em Environment Variables
4. Deploy automático ✨

## 📚 Documentação

| Guia | Conteúdo |
|------|----------|
| [SETUP_MONGODB.md](SETUP_MONGODB.md) | Como criar conta MongoDB Atlas e configurar Base de Dados |
| [DEPLOYMENT_VERCEL.md](DEPLOYMENT_VERCEL.md) | Deploy completo no Vercel com passo a passo |
| [API.md](API.md) | Documentação das rotas de API REST |

## 📦 Estrutura do Projeto

```
├── api/
│   └── index.js              # Express app (Vercel serverless)
├── index.html                # Interface principal
├── app.js                    # Lógica client-side
├── style.css                 # Responsive design
├── server-local.js           # Servidor local
├── seed-db.js                # Seed dados iniciais
├── package.json
├── vercel.json               # Config Vercel
├── .env.example
└── README.md
```

### Arquivo-chave

| Arquivo | Descrição |
|---------|-----------|
| `api/index.js` | Express app com rotas da API |
| `app.js` | Toda lógica client (sem dependências) |
| `seed-db.js` | Script popular MongoDB com dados teste |
| `server-local.js` | Servidor local combinando Express + static files |

## Funcionalidades

### Seleção de Jogador
- Na primeira vez que acessa, escolha o seu jogador
- Esta informação é guardada em cookies
- Clique em "Trocar Jogador" para escolher outro

### Classificação
- Visualize todas as duplas ordenadas por pontos
- Veja posição, número de jogos e pontos
- Clique em "Desafiar" para desafiar uma dupla (apenas duplas sem desafios em curso e entre 5 posições acima/abaixo)

### Desafios
- Veja todos os desafios da sua dupla
- Clique em "Inserir Resultado" para registar o resultado de um desafio
- Visualize resultados de desafios já concluídos

## Sistema de Pontuação

O sistema de escada funciona da seguinte forma:

1. **Quando desafia:** Uma dupla desafia outra dupla
2. **Resultado:** A dupla vencedora adiciona os pontos da dupla perdedora aos seus pontos
3. **Dupla perdedora:** Mantém os mesmos pontos (não perde pontos)
4. **Ranking:** A classificação é sempre ordenada pelo número de pontos

### Exemplo:
- Dupla A: 100 pontos
- Dupla B: 80 pontos
- Dupla A desafia Dupla B e vence
- **Novo resultado:**
  - Dupla A: 100 + 80 = 180 pontos
  - Dupla B: 80 pontos (mantém)

## Regras de Desafio

- Só pode desafiar uma dupla sem desafios em curso
- Só pode desafiar duplas entre 5 posições acima ou abaixo da sua
- Não pode desafiar sua própria dupla
- Quando um desafio é criado, não pode ser criado outro até ter resultado

## Dados de Exemplo

O aplicativo vem com dados de exemplo:
- 8 duplas (16 jogadores)
- 3 desafios concluídos
- 2 desafios em curso

Para começar com dados novos, edite o script [seed-db.js](seed-db.js) e execute novamente o seed.

## 🛠️ Stack Tecnológico

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | HTML5, CSS3, JavaScript Vanilla (sem frameworks) |
| **Backend** | Node.js + Express.js |
| **Base de Dados** | MongoDB + Mongoose |
| **Deploy** | Vercel (serverless) |
| **Session** | Cookies (client-side) |

## Notas Importantes

- Dados guardados em MongoDB (seguro)
- Deploy em Vercel é automático via GitHub
- Sem limite de requisições para free tier
- Downtime zero em deployments

## 🚀 Próximas Features

- [ ] Histórico de vitórias/derrotas por jogador
- [ ] Estatísticas e gráficos (Charts.js)
- [ ] Notificações de novos desafios
- [ ] Sistema de convites (SMS/Email)
- [ ] Dark mode
- [ ] Internacionalização (EN/PT)
- [ ] PWA (modo offline)
- [ ] Fotos dos jogadores

## 📞 Suporte

Dúvidas? Verifique:
- [SETUP_MONGODB.md](SETUP_MONGODB.md) - Setup BD
- [DEPLOYMENT_VERCEL.md](DEPLOYMENT_VERCEL.md) - Deploy
- Issues no GitHub

## 📄 Licença

MIT
