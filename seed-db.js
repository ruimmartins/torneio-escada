#!/usr/bin/env node

/**
 * Script para popular MongoDB com dados iniciais
 * Uso: node seed-db.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Schemas
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

// Dados iniciais
const jogadoresData = [
    { id: 1, nome: 'João Silva', ativo: true },
    { id: 2, nome: 'Maria Santos', ativo: true },
    { id: 3, nome: 'Ana Silva', ativo: true },
    { id: 4, nome: 'Sara Pereira', ativo: true },
    { id: 5, nome: 'Felipe Martins', ativo: true },
    { id: 6, nome: 'Lucas Ferreira', ativo: true },
    { id: 7, nome: 'David Rocha', ativo: true },
    { id: 8, nome: 'Francisco Lima', ativo: true },
    { id: 9, nome: 'Carlos Mendes', ativo: true },
    { id: 10, nome: 'João Gomes', ativo: true },
    { id: 11, nome: 'Miguel Costa', ativo: true },
    { id: 12, nome: 'Pedro Oliveira', ativo: true },
    { id: 13, nome: 'Rita Sousa', ativo: true },
    { id: 14, nome: 'Tiago Alves', ativo: true },
    { id: 15, nome: 'Joana Martins', ativo: true },
    { id: 16, nome: 'Rui Cardoso', ativo: true }
];

const duplasData = [
    { dupla_id: 1, integrante1_id: 1, integrante2_id: 2, pontos: 100 },
    { dupla_id: 2, integrante1_id: 3, integrante2_id: 4, pontos: 95 },
    { dupla_id: 3, integrante1_id: 5, integrante2_id: 6, pontos: 88 },
    { dupla_id: 4, integrante1_id: 9, integrante2_id: 10, pontos: 75 },
    { dupla_id: 5, integrante1_id: 11, integrante2_id: 12, pontos: 68 },
    { dupla_id: 6, integrante1_id: 7, integrante2_id: 8, pontos: 55 },
    { dupla_id: 7, integrante1_id: 13, integrante2_id: 14, pontos: 45 },
    { dupla_id: 8, integrante1_id: 15, integrante2_id: 16, pontos: 30 }
];

const desafiosData = [
    { dupla_1_id: 1, dupla_2_id: 2, data_desafio: '2026-03-10', data_resultado: '2026-03-10', resultado_set_1: '6-4', resultado_set_2: '6-3', resultado_tie_break: '', dupla_1_pontos_desafio: 100, dupla_2_pontos_desafio: 95 },
    { dupla_1_id: 2, dupla_2_id: 3, data_desafio: '2026-03-12', data_resultado: '2026-03-12', resultado_set_1: '4-6', resultado_set_2: '3-6', resultado_tie_break: '', dupla_1_pontos_desafio: 95, dupla_2_pontos_desafio: 88 },
    { dupla_1_id: 1, dupla_2_id: 4, data_desafio: '2026-03-13', data_resultado: '2026-03-14', resultado_set_1: '6-2', resultado_set_2: '6-4', resultado_tie_break: '', dupla_1_pontos_desafio: 100, dupla_2_pontos_desafio: 75 },
    { dupla_1_id: 3, dupla_2_id: 5, data_desafio: '2026-03-15', data_resultado: '', resultado_set_1: '', resultado_set_2: '', resultado_tie_break: '', dupla_1_pontos_desafio: 88, dupla_2_pontos_desafio: 68 },
    { dupla_1_id: 4, dupla_2_id: 6, data_desafio: '2026-03-16', data_resultado: '2026-03-16', resultado_set_1: '7-5', resultado_set_2: '6-3', resultado_tie_break: '', dupla_1_pontos_desafio: 75, dupla_2_pontos_desafio: 55 }
];

async function seedDatabase() {
    try {
        console.log('🔄 Conectando ao MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Conectado ao MongoDB');

        // Limpar collections existentes
        console.log('🧹 Limpando collections...');
        await Jogador.deleteMany({});
        await Dupla.deleteMany({});
        await Desafio.deleteMany({});

        // Inserir dados
        console.log('📝 Inserindo jogadores...');
        await Jogador.insertMany(jogadoresData);
        console.log(`✅ ${jogadoresData.length} jogadores inseridos`);

        console.log('📝 Inserindo duplas...');
        await Dupla.insertMany(duplasData);
        console.log(`✅ ${duplasData.length} duplas inseridas`);

        console.log('📝 Inserindo desafios...');
        await Desafio.insertMany(desafiosData);
        console.log(`✅ ${desafiosData.length} desafios inseridos`);

        console.log('\n✨ Base de dados populada com sucesso!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro:', error);
        process.exit(1);
    }
}

seedDatabase();
