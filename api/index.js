require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const app = express();

app.use(express.json());

// ==================== MONGO DB SCHEMAS ====================

const jogadorSchema = new mongoose.Schema({
    id: Number,
    nome: String,
    ativo: Boolean
}, { collection: 'jogadores' });

const duplaSchema = new mongoose.Schema({
    dupla_id: Number,
    integrante1_id: Number,
    integrante2_id: Number,
    pontos: Number
}, { collection: 'duplas' });

const desafioSchema = new mongoose.Schema({
    dupla_1_id: Number,
    dupla_2_id: Number,
    data_desafio: String,
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

// ==================== API ENDPOINTS ====================

// GET /api/jogadores
app.get('/api/jogadores', async (req, res) => {
    try {
        await connectDB();
        const jogadores = await Jogador.find().sort({ id: 1 });
        res.json(jogadores);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/duplas
app.get('/api/duplas', async (req, res) => {
    try {
        await connectDB();
        const duplas = await Dupla.find().sort({ dupla_id: 1 });
        res.json(duplas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/desafios
app.get('/api/desafios', async (req, res) => {
    try {
        await connectDB();
        const desafios = await Desafio.find().sort({ data_desafio: -1 });
        res.json(desafios);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/update-csv
app.post('/api/update-csv', async (req, res) => {
    try {
        await connectDB();
        const { filename, data } = req.body;

        if (!filename || !data || data.length === 0) {
            return res.status(400).json({ error: 'Invalid data' });
        }

        if (filename === 'desafios.csv') {
            await Desafio.deleteMany({});
            await Desafio.insertMany(data);
        } else if (filename === 'duplas.csv') {
            await Dupla.deleteMany({});
            await Dupla.insertMany(data);
        } else if (filename === 'jogadores.csv') {
            await Jogador.deleteMany({});
            await Jogador.insertMany(data);
        } else {
            return res.status(400).json({ error: 'Unknown file' });
        }

        res.json({ status: 'ok' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/desafio/novo
app.post('/api/desafio/novo', async (req, res) => {
    try {
        await connectDB();
        const { dupla_1_id, dupla_2_id, data_desafio, dupla_1_pontos_desafio, dupla_2_pontos_desafio } = req.body;

        const novoDesafio = new Desafio({
            dupla_1_id,
            dupla_2_id,
            data_desafio,
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

// GET /dados/:filename - Para compatibilidade com carregamento de CSVs
app.get('/dados/:filename', async (req, res) => {
    const filename = req.params.filename;

    try {
        await connectDB();
        let data = [];

        if (filename === 'jogadores.csv') {
            data = await Jogador.find();
        } else if (filename === 'duplas.csv') {
            data = await Dupla.find();
        } else if (filename === 'desafios.csv') {
            data = await Desafio.find();
        } else {
            return res.status(404).json({ error: 'File not found' });
        }

        if (data.length === 0) {
            return res.status(404).json({ error: 'No data' });
        }

        const cleanData = data.map(doc => {
            const obj = doc.toObject();
            delete obj._id;
            delete obj.__v;
            return obj;
        });

        const headers = Object.keys(cleanData[0]);
        let csv = headers.join(',') + '\n';

        for (const row of cleanData) {
            const values = headers.map(header => {
                const value = row[header];
                if (value === null || value === undefined) return '';
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return '"' + value.replace(/"/g, '""') + '"';
                }
                return value;
            });
            csv += values.join(',') + '\n';
        }

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.send(csv);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Export para Vercel
module.exports = app;
