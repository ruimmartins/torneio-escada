#!/usr/bin/env node

require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const jogadorSchema = new mongoose.Schema({
    id: Number,
    nome: String,
    username: { type: String, required: false, unique: true, sparse: true },
    password_hash: { type: String, required: false },
    password: { type: String, required: false },
    dupla_id: Number,
    ativo: Boolean
}, { collection: 'jogadores' });

const Jogador = mongoose.models.Jogador || mongoose.model('Jogador', jogadorSchema);

async function main() {
    const [, , jogadorIdArg, username, password] = process.argv;
    const normalizedUsername = (username || '').trim();

    if (!jogadorIdArg || !normalizedUsername || !password) {
        console.error('Uso: node scripts/update-player-auth.js <jogador_id> <username> <password>');
        process.exit(1);
    }

    const jogadorId = Number(jogadorIdArg);
    if (!Number.isInteger(jogadorId) || jogadorId <= 0) {
        console.error('Erro: jogador_id deve ser um inteiro positivo.');
        process.exit(1);
    }

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error('Erro: MONGODB_URI não definida no ambiente (.env).');
        process.exit(1);
    }

    try {
        await mongoose.connect(mongoUri, {
            dbName: process.env.MONGODB_DB || 'escada'
        });

        const existingUsername = await Jogador.findOne({ username: normalizedUsername, id: { $ne: jogadorId } });
        if (existingUsername) {
            console.error(`Erro: username "${normalizedUsername}" já está a ser usado pelo jogador id=${existingUsername.id}.`);
            process.exit(1);
        }

        const jogador = await Jogador.findOne({ id: jogadorId });
        if (!jogador) {
            console.error(`Erro: jogador com id=${jogadorId} não encontrado.`);
            process.exit(1);
        }

        const password_hash = await bcrypt.hash(password, 12);

        jogador.username = normalizedUsername;
        jogador.password_hash = password_hash;
        if (jogador.password) {
            jogador.password = undefined;
        }

        await jogador.save();

        console.log('Credenciais atualizadas com sucesso:');
        console.log(JSON.stringify({
            id: jogador.id,
            nome: jogador.nome,
            username: jogador.username,
            dupla_id: jogador.dupla_id,
            ativo: jogador.ativo
        }, null, 2));
    } catch (error) {
        console.error('Erro ao atualizar credenciais:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

main();
