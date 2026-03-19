require('dotenv').config();
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const app = express();

app.use(express.json());
app.use(cookieParser());

const JWT_SECRET = process.env.JWT_SECRET || 'torneio-escada-insecure-secret';
const AUTH_COOKIE_MAX_AGE_MS = Number(process.env.AUTH_COOKIE_MAX_AGE_MS) || 1000 * 60 * 60 * 24 * 365;

// ==================== MONGO DB SCHEMAS ====================

const jogadorSchema = new mongoose.Schema({
    id: Number,
    nome: String,
    username: { type: String, required: false, unique: true, sparse: true },
    password_hash: { type: String, required: false },
    password: { type: String, required: false },
    dupla_id: Number,
    ativo: Boolean
}, { collection: 'jogadores' });

const duplaSchema = new mongoose.Schema({
    dupla_id: Number,
    integrante1_id: Number,
    integrante2_id: Number,
    pontos: Number,
    jogos: { type: Number, default: 0 },
    active: { type: Boolean, default: true }
}, { collection: 'duplas' });

const desafioSchema = new mongoose.Schema({
    dupla_1_id: Number,
    dupla_2_id: Number,
    data_desafio: String,
    data_jogo: { type: String, default: '' },
    data_resultado: String,
    resultado_set_1: String,
    resultado_set_2: String,
    resultado_tie_break: String,
    dupla_1_pontos_desafio: Number,
    dupla_2_pontos_desafio: Number
}, { collection: 'desafios' });

const Jogador = mongoose.model('Jogador', jogadorSchema);
const Dupla = mongoose.model('Dupla', duplaSchema);
const Desafio = mongoose.model('Desafio', desafioSchema);

// ==================== CONEXÃO MONGODB ====================

let isConnected = false;

async function connectDB() {
    if (isConnected) {
        return;
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            dbName: "escada",
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        isConnected = true;
        console.log('✅ MongoDB connected');
    } catch (error) {
        console.error('❌ MongoDB error:', error);
        throw error;
    }
}

function createToken(jogador) {
    return jwt.sign(
        {
            sub: String(jogador._id),
            username: jogador.username,
            player_id: jogador.id,
            team_id: jogador.dupla_id
        },
        JWT_SECRET
    );
}

function readTokenFromRequest(req) {
    const cookieToken = req.cookies?.auth_token;
    if (cookieToken) {
        return cookieToken;
    }

    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }

    return null;
}

function escapeRegExp(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function requireAuth(req, res, next) {
    const token = readTokenFromRequest(req);
    if (!token) {
        return res.status(401).json({ error: 'Não autenticado' });
    }

    try {
        req.auth = jwt.verify(token, JWT_SECRET);
        next();
    } catch (_error) {
        return res.status(401).json({ error: 'Sessão inválida' });
    }
}

// ==================== API ENDPOINTS ====================

// GET /api/version
app.get('/api/version', (_req, res) => {
    const version =
        process.env.VERCEL_GIT_COMMIT_SHA ||
        process.env.VERCEL_URL ||
        process.env.npm_package_version ||
        'dev';

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.json({ version });
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
    try {
        await connectDB();
        const { username, password } = req.body;
        const usernameInput = typeof username === 'string' ? username.trim() : '';

        if (!usernameInput || !password) {
            return res.status(400).json({ error: 'Utilizador e password são obrigatórios' });
        }

        const jogador = await Jogador.findOne({
            ativo: { $ne: false },
            $or: [
                { username: usernameInput },
                { username: { $regex: `^${escapeRegExp(usernameInput)}$`, $options: 'i' } }
            ]
        });
        if (!jogador) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        let validPassword = false;
        if (jogador.password_hash) {
            try {
                validPassword = await bcrypt.compare(password, jogador.password_hash);
            } catch (_error) {
                validPassword = false;
            }

            // Compatibilidade com dados legados: hash guardado como texto simples no campo password_hash.
            if (!validPassword && jogador.password_hash === password) {
                validPassword = true;
            }
        } else if (typeof jogador.password === 'string') {
            validPassword = password === jogador.password;
        }

        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const token = createToken(jogador);
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: AUTH_COOKIE_MAX_AGE_MS
        });

        res.json({
            status: 'ok',
            user: {
                id: String(jogador._id),
                username: jogador.username,
                player_id: jogador.id,
                team_id: jogador.dupla_id
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/auth/me
app.get('/api/auth/me', requireAuth, async (req, res) => {
    try {
        await connectDB();
        const jogador = await Jogador.findById(req.auth.sub);
        if (!jogador || jogador.ativo === false) {
            return res.status(401).json({ error: 'Sessão inválida' });
        }

        res.json({
            status: 'ok',
            user: {
                id: String(jogador._id),
                username: jogador.username,
                player_id: jogador.id,
                team_id: jogador.dupla_id
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/auth/logout
app.post('/api/auth/logout', (_req, res) => {
    res.clearCookie('auth_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
    });

    res.json({ status: 'ok' });
});

// GET /api/jogadores
app.get('/api/jogadores', requireAuth, async (req, res) => {
    try {
        await connectDB();
        const jogadores = await Jogador.find({}, { password_hash: 0, password: 0 }).sort({ id: 1 });
        res.json(jogadores);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/duplas
app.get('/api/duplas', requireAuth, async (req, res) => {
    try {
        await connectDB();

        // Garante que a propriedade jogos existe e está coerente com desafios concluídos.
        const duplas = await Dupla.find().sort({ dupla_id: 1 });
        const desafiosConcluidos = await Desafio.find({
            data_resultado: { $nin: ['', null] }
        }).select('dupla_1_id dupla_2_id');

        const jogosPorDupla = new Map();
        desafiosConcluidos.forEach((d) => {
            jogosPorDupla.set(d.dupla_1_id, (jogosPorDupla.get(d.dupla_1_id) || 0) + 1);
            jogosPorDupla.set(d.dupla_2_id, (jogosPorDupla.get(d.dupla_2_id) || 0) + 1);
        });

        let houveAtualizacao = false;
        for (const dupla of duplas) {
            const jogosCalculados = jogosPorDupla.get(dupla.dupla_id) || 0;
            const activeNormalizado = dupla.active === false ? false : true;

            if (dupla.jogos !== jogosCalculados || dupla.active !== activeNormalizado) {
                dupla.jogos = jogosCalculados;
                dupla.active = activeNormalizado;
                await dupla.save();
                houveAtualizacao = true;
            }
        }

        if (houveAtualizacao) {
            const duplasAtualizadas = await Dupla.find().sort({ dupla_id: 1 });
            return res.json(duplasAtualizadas);
        }

        res.json(duplas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/desafios
app.get('/api/desafios', requireAuth, async (req, res) => {
    try {
        await connectDB();
        const desafios = await Desafio.find().sort({ data_desafio: -1 });

        let updated = false;
        for (const desafio of desafios) {
            if (typeof desafio.data_jogo !== 'string') {
                desafio.data_jogo = '';
                await desafio.save();
                updated = true;
            }
        }

        if (updated) {
            const desafiosAtualizados = await Desafio.find().sort({ data_desafio: -1 });
            return res.json(desafiosAtualizados);
        }

        res.json(desafios);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

async function updateDesafioDataJogo(req, res) {
    try {
        await connectDB();
        const { id } = req.params;
        const { data_jogo } = req.body;

        if (!data_jogo || typeof data_jogo !== 'string') {
            return res.status(400).json({ error: 'data_jogo inválida' });
        }

        const desafio = await Desafio.findById(id);
        if (!desafio) {
            return res.status(404).json({ error: 'Desafio não encontrado' });
        }

        if (desafio.data_resultado && desafio.data_resultado !== '') {
            return res.status(409).json({ error: 'Não é possível alterar data de jogo de um desafio já concluído.' });
        }

        const teamId = Number(req.auth.team_id);
        const envolveUtilizador = desafio.dupla_1_id === teamId || desafio.dupla_2_id === teamId;
        if (!envolveUtilizador) {
            return res.status(403).json({ error: 'Sem permissão para alterar este desafio.' });
        }

        desafio.data_jogo = data_jogo;
        await desafio.save();
        res.json({ status: 'ok', desafio });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// PUT /api/desafios/:id/data-jogo
app.put('/api/desafios/:id/data-jogo', requireAuth, updateDesafioDataJogo);

// Compatibilidade: PUT /api/desafio/:id/data-jogo
app.put('/api/desafio/:id/data-jogo', requireAuth, updateDesafioDataJogo);

// PUT /api/desafios/:id/resultado
app.put('/api/desafios/:id/resultado', requireAuth, async (req, res) => {
    try {
        await connectDB();
        const { id } = req.params;
        const { resultado_set_1, resultado_set_2, resultado_tie_break, data_resultado, winner_team_id } = req.body;

        if (!resultado_set_1 || !resultado_set_2 || !data_resultado || winner_team_id === undefined || winner_team_id === null) {
            return res.status(400).json({ error: 'Campos de resultado em falta' });
        }

        const desafio = await Desafio.findById(id);
        if (!desafio) {
            return res.status(404).json({ error: 'Desafio não encontrado' });
        }

        // Evita somar pontos duas vezes no mesmo desafio.
        if (desafio.data_resultado && desafio.data_resultado !== '') {
            return res.status(409).json({ error: 'Este desafio já tem resultado registado.' });
        }

        const winnerTeamId = Number(winner_team_id);
        if (winnerTeamId !== desafio.dupla_1_id && winnerTeamId !== desafio.dupla_2_id) {
            return res.status(400).json({ error: 'winner_team_id inválido para este desafio' });
        }

        const dupla1 = await Dupla.findOne({ dupla_id: desafio.dupla_1_id });
        const dupla2 = await Dupla.findOne({ dupla_id: desafio.dupla_2_id });

        if (!dupla1 || !dupla2) {
            return res.status(404).json({ error: 'Duplas do desafio não encontradas' });
        }

        if (winnerTeamId === desafio.dupla_1_id) {
            dupla1.pontos += dupla2.pontos;
        } else {
            dupla2.pontos += dupla1.pontos;
        }

        dupla1.jogos = (dupla1.jogos || 0) + 1;
        dupla2.jogos = (dupla2.jogos || 0) + 1;

        await dupla1.save();
        await dupla2.save();

        desafio.resultado_set_1 = resultado_set_1;
        desafio.resultado_set_2 = resultado_set_2;
        desafio.resultado_tie_break = resultado_tie_break || '';
        desafio.data_resultado = data_resultado;
        await desafio.save();

        res.json({ status: 'ok', desafio, duplas: [dupla1, dupla2] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/desafio/novo
app.post('/api/desafio/novo', requireAuth, async (req, res) => {
    try {
        await connectDB();
        const { dupla_1_id, dupla_2_id, data_desafio, dupla_1_pontos_desafio, dupla_2_pontos_desafio } = req.body;

        const [duplaDesafiadora, duplaDesafiada] = await Promise.all([
            Dupla.findOne({ dupla_id: dupla_1_id }),
            Dupla.findOne({ dupla_id: dupla_2_id })
        ]);

        if (!duplaDesafiadora || !duplaDesafiada) {
            return res.status(404).json({ error: 'Dupla não encontrada' });
        }

        if (duplaDesafiadora.active === false || duplaDesafiada.active === false) {
            return res.status(400).json({ error: 'Não é possível criar desafios com duplas inativas.' });
        }

        const novoDesafio = new Desafio({
            dupla_1_id,
            dupla_2_id,
            data_desafio,
            data_jogo: '',
            dupla_1_pontos_desafio,
            dupla_2_pontos_desafio,
            data_resultado: '',
            resultado_set_1: '',
            resultado_set_2: '',
            resultado_tie_break: ''
        });

        await novoDesafio.save();
        res.json({ status: 'ok', desafio: novoDesafio });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Export para Vercel
module.exports = app;
