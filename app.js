// ==================== DADOS GLOBAIS ====================
let jogadores = [];
let duplas = [];
let desafios = [];
let selectedPlayerId = null;
let selectedTeamId = null;
let challengesViewMode = 'current';

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', async () => {
    await loadCSVData();
    initializeApp();
});

async function loadCSVData() {
    try {
        jogadores = await loadCSV('dados/jogadores.csv');
        duplas = await loadCSV('dados/duplas.csv');
        desafios = await loadCSV('dados/desafios.csv');
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        alert('Erro ao carregar dados do servidor');
    }
}

async function loadCSV(path) {
    const response = await fetch(path);
    const csv = await response.text();
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
            // Parse CSV com suporte a campos entre aspas
            const values = [];
            let current = '';
            let insideQuotes = false;
            
            for (let j = 0; j < lines[i].length; j++) {
                const char = lines[i][j];
                if (char === '"') {
                    insideQuotes = !insideQuotes;
                } else if (char === ',' && !insideQuotes) {
                    values.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            values.push(current.trim());
            
            const obj = {};
            headers.forEach((header, index) => {
                const value = values[index] !== undefined ? values[index] : '';
                // Converter para número se possível, senão deixar como string
                obj[header] = (value === '' || isNaN(value)) ? value : Number(value);
            });
            data.push(obj);
        }
    }
    
    return data;
}

function initializeApp() {
    // Verificar se há jogador guardado nos cookies
    const savedPlayerId = getCookie('selectedPlayerId');
    const savedTeamId = getCookie('selectedTeamId');
    
    if (savedPlayerId && savedTeamId) {
        selectedPlayerId = Number(savedPlayerId);
        selectedTeamId = Number(savedTeamId);
        showMainLayout();
    } else {
        showPlayerSelectionModal();
    }
}

// ==================== COOKIES ====================
function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i].trim();
        if (c.indexOf(nameEQ) === 0) {
            return c.substring(nameEQ.length, c.length);
        }
    }
    return null;
}

function setCookie(name, value, days = 365) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

function deleteCookie(name) {
    setCookie(name, '', -1);
}

// ==================== SELEÇÃO DE JOGADOR ====================
function showPlayerSelectionModal() {
    const modal = document.getElementById('playerModal');
    const select = document.getElementById('playerSelect');
    
    select.innerHTML = '<option value="">Escolha um jogador...</option>';
    
    // Ordenar jogadores por nome
    const sortedPlayers = [...jogadores].sort((a, b) => a.nome.localeCompare(b.nome));
    
    sortedPlayers.forEach(jogador => {
        const option = document.createElement('option');
        option.value = jogador.id;
        option.textContent = jogador.nome;
        select.appendChild(option);
    });
    
    modal.classList.remove('hidden');
}

function selectPlayer() {
    const select = document.getElementById('playerSelect');
    const playerId = Number(select.value);
    
    if (!playerId) {
        alert('Selecione um jogador');
        return;
    }
    
    const jogador = jogadores.find(j => j.id === playerId);
    const teamId = jogador.dupla_id;
    
    selectedPlayerId = playerId;
    selectedTeamId = teamId;
    
    setCookie('selectedPlayerId', playerId);
    setCookie('selectedTeamId', teamId);
    
    showMainLayout();
}

function changePlayer() {
    deleteCookie('selectedPlayerId');
    deleteCookie('selectedTeamId');
    selectedPlayerId = null;
    selectedTeamId = null;
    
    document.getElementById('mainLayout').classList.add('hidden');
    showPlayerSelectionModal();
}

function showMainLayout() {
    const modal = document.getElementById('playerModal');
    modal.classList.add('hidden');
    
    const mainLayout = document.getElementById('mainLayout');
    mainLayout.classList.remove('hidden');
    
    // Actualizar informação do jogador
    const jogador = jogadores.find(j => j.id === selectedPlayerId);
    const dupla = duplas.find(d => d.dupla_id === selectedTeamId);
    const nomesDupla = jogadores
        .filter(j => j.dupla_id === selectedTeamId)
        .map(j => j.nome)
        .join(' / ');
    
    document.getElementById('currentPlayer').textContent = `${jogador.nome} (Dupla: ${nomesDupla})`;
    
    // Carregar tab de classificação por padrão
    renderClassification();
}

// ==================== TABS ====================
function switchTab(tabName) {
    // Actualizar botões de tabs
    document.getElementById('classificationTab').classList.toggle('active', tabName === 'classification');
    document.getElementById('challengesTab').classList.toggle('active', tabName === 'challenges');
    
    // Actualizar conteúdo das tabs
    document.getElementById('classificationView').classList.toggle('active', tabName === 'classification');
    document.getElementById('challengesView').classList.toggle('active', tabName === 'challenges');
    document.getElementById('resultView').classList.remove('active');
    
    // Render
    if (tabName === 'classification') {
        renderClassification();
    } else if (tabName === 'challenges') {
        updateChallengesFilterButtons();
        renderChallenges();
    }
}

function hasChallengeResult(desafio) {
    return Boolean(desafio.data_resultado && desafio.data_resultado !== '');
}

function updateChallengesFilterButtons() {
    const btnCurrent = document.getElementById('filterCurrentBtn');
    const btnPast = document.getElementById('filterPastBtn');
    const btnAll = document.getElementById('filterAllBtn');

    if (!btnCurrent || !btnPast || !btnAll) {
        return;
    }

    btnCurrent.classList.toggle('active', challengesViewMode === 'current');
    btnPast.classList.toggle('active', challengesViewMode === 'past');
    btnAll.classList.toggle('active', challengesViewMode === 'all');
}

function setChallengesViewMode(mode) {
    challengesViewMode = mode;
    updateChallengesFilterButtons();
    renderChallenges();
}

// ==================== CLASSIFICAÇÃO ====================
function renderClassification() {
    const tbody = document.getElementById('classificationBody');
    tbody.innerHTML = '';
    
    // Calcular posições e número de jogos para cada dupla
    const duplasComEstatisticas = duplas.map(dupla => {
        const nomeIntegrante1 = jogadores.find(j => j.id === dupla.integrante1_id)?.nome || '';
        const nomeIntegrante2 = jogadores.find(j => j.id === dupla.integrante2_id)?.nome || '';
        
        // Contar jogos (desafios concluídos)
        const jogosCount = desafios.filter(d => 
            ((d.dupla_1_id === dupla.dupla_id || d.dupla_2_id === dupla.dupla_id) &&
            d.data_resultado && d.data_resultado !== '')
        ).length;
        
        return {
            ...dupla,
            nome: `${nomeIntegrante1} / ${nomeIntegrante2}`,
            jogos: jogosCount
        };
    });
    
    // Ordenar por pontos (descendente)
    duplasComEstatisticas.sort((a, b) => b.pontos - a.pontos);
    
    // Encontrar posição da dupla do utilizador
    const posicaoUtilizador = duplasComEstatisticas.findIndex(d => d.dupla_id === selectedTeamId);
    
    // Renderizar tabela
    duplasComEstatisticas.forEach((dupla, index) => {
        const tr = document.createElement('tr');
        
        // Verificar se pode desafiar
        const podeDesafiar = canChallenge(dupla, posicaoUtilizador, index);
        
        tr.innerHTML = `
            <td data-label="Pos.">${index + 1}</td>
            <td data-label="Dupla">${dupla.nome}</td>
            <td data-label="Pts.">${dupla.pontos}</td>
            <td data-label="" class="action-cell">
                ${dupla.dupla_id === selectedTeamId 
                    ? '—' 
                    : `<button class="btn-challenge-icon" title="Desafiar ${dupla.nome}" ${!podeDesafiar ? 'disabled' : ''} onclick="openChallengeModal(${dupla.dupla_id})">⚔️</button>`
                }
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

function canChallenge(targetTeam, posicaoUtilizador, posicaoAlvo) {
    // Não pode desafiar sua própria dupla
    if (targetTeam.dupla_id === selectedTeamId) {
        return false;
    }
    
    // Verificar se há desafios em curso (sem resultado)
    const temDesafioEmCurso = desafios.some(d => 
        ((d.dupla_1_id === selectedTeamId || d.dupla_2_id === selectedTeamId) &&
        (!d.data_resultado || d.data_resultado === '')) ||
        ((d.dupla_1_id === targetTeam.dupla_id || d.dupla_2_id === targetTeam.dupla_id) &&
        (!d.data_resultado || d.data_resultado === ''))
    );
    
    if (temDesafioEmCurso) {
        return false;
    }
    
    // Verificar se está dentro de 5 posições
    const diferenca = Math.abs(posicaoUtilizador - posicaoAlvo);
    return diferenca <= 5;
}

// ==================== DESAFIOS ====================
function renderChallenges() {
    const tbody = document.getElementById('challengesBody');
    tbody.innerHTML = '';
    
    const desafioEnvolveUtilizador = (d) => d.dupla_1_id === selectedTeamId || d.dupla_2_id === selectedTeamId;

    // Em "Todos" mostra desafios globais; nos outros modos mantém foco na dupla do utilizador.
    const desafiosBase = challengesViewMode === 'all'
        ? desafios
        : desafios.filter(desafioEnvolveUtilizador);

    const desafiosFiltrados = desafiosBase.filter(d => {
        if (challengesViewMode === 'past') {
            return hasChallengeResult(d);
        }

        if (challengesViewMode === 'all') {
            return true;
        }

        return !hasChallengeResult(d);
    });
    
    desafiosFiltrados.forEach(desafio => {
        // Obter informações das duplas
        const dupla1 = duplas.find(d => d.dupla_id === desafio.dupla_1_id);
        const dupla2 = duplas.find(d => d.dupla_id === desafio.dupla_2_id);
        
        const nome1 = getTeamName(desafio.dupla_1_id);
        const nome2 = getTeamName(desafio.dupla_2_id);
        
        // Determinar resultado
        let resultadoHTML = '';
        if (desafio.data_resultado && desafio.data_resultado !== '') {
            resultadoHTML = `
                <span class="result-status completed">
                    ${desafio.resultado_set_1} ${desafio.resultado_set_2 ? ', ' + desafio.resultado_set_2 : ''} ${desafio.resultado_tie_break ? ', TB ' + desafio.resultado_tie_break : ''}
                </span>
            `;
        } else {
            if (desafioEnvolveUtilizador(desafio)) {
                resultadoHTML = `<button class="btn-result" onclick="openResultViewByGlobalIndex(${desafios.indexOf(desafio)})">Inserir Resultado</button>`;
            } else {
                resultadoHTML = '<span class="result-status pending">Em curso</span>';
            }
        }
        
        const tr = document.createElement('tr');
        const nome1WithPoints = `${nome1} (${desafio.dupla_1_pontos_desafio}pts)`;
        const nome2WithPoints = `${nome2} (${desafio.dupla_2_pontos_desafio}pts)`;
        
        tr.innerHTML = `
            <td data-label="Dupla 1">${nome1WithPoints}</td>
            <td data-label="Dupla 2">${nome2WithPoints}</td>
            <td data-label="Data">${formatDate(desafio.data_desafio)}</td>
            <td data-label="Resultado">${resultadoHTML}</td>
        `;
        
        tbody.appendChild(tr);
    });
    
    if (desafiosFiltrados.length === 0) {
        const tr = document.createElement('tr');
        tr.className = 'empty-state';
        const emptyText = challengesViewMode === 'past'
            ? 'Nenhum desafio passado encontrado'
            : challengesViewMode === 'all'
                ? 'Nenhum desafio encontrado'
                : 'Nenhum desafio em curso encontrado';
        tr.innerHTML = `<td colspan="4" data-label="">${emptyText}</td>`;
        tbody.appendChild(tr);
    }
}

function openResultViewByGlobalIndex(globalIndex) {
    const desafio = desafios[globalIndex];
    if (!desafio) {
        alert('Desafio inválido.');
        return;
    }

    const envolveUtilizador = desafio.dupla_1_id === selectedTeamId || desafio.dupla_2_id === selectedTeamId;
    if (!envolveUtilizador) {
        alert('Só pode inserir resultado em desafios da sua dupla.');
        return;
    }

    openResultView(globalIndex);
}

function getTeamName(teamId) {
    const dupla = duplas.find(d => d.dupla_id === teamId);
    if (!dupla) return 'Desconhecido';
    
    const jogador1 = jogadores.find(j => j.id === dupla.integrante1_id);
    const jogador2 = jogadores.find(j => j.id === dupla.integrante2_id);
    
    return `${jogador1?.nome || ''} / ${jogador2?.nome || ''}`;
}

function formatDate(dateStr) {
    if (!dateStr || dateStr === '') return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-PT');
}

// ==================== MODAIS ====================
function openChallengeModal(targetTeamId) {
    const targetTeam = duplas.find(d => d.dupla_id === targetTeamId);
    const teamName = getTeamName(targetTeamId);
    const myTeamName = getTeamName(selectedTeamId);
    
    const form = document.getElementById('challengeForm');
    form.innerHTML = `
        <p><strong>Desafiador:</strong> ${myTeamName}</p>
        <p><strong>Desafiado:</strong> ${teamName}</p>
        <label>Data do Desafio:</label>
        <input type="date" id="challengeDate" required>
        <button onclick="submitChallenge(${targetTeamId})">Confirmar Desafio</button>
    `;
    
    document.getElementById('challengeModal').classList.remove('hidden');
}

function closeChallengeModal() {
    document.getElementById('challengeModal').classList.add('hidden');
}

function submitChallenge(targetTeamId) {
    const dateInput = document.getElementById('challengeDate').value;
    if (!dateInput) {
        alert('Selecione uma data');
        return;
    }
    
    const myTeam = duplas.find(d => d.dupla_id === selectedTeamId);
    const targetTeam = duplas.find(d => d.dupla_id === targetTeamId);
    
    // Criar novo desafio
    const novoDesafio = {
        dupla_1_id: selectedTeamId,
        dupla_2_id: targetTeamId,
        data_desafio: dateInput,
        data_resultado: '',
        resultado_set_1: '',
        resultado_set_2: '',
        resultado_tie_break: '',
        dupla_1_pontos_desafio: myTeam.pontos,
        dupla_2_pontos_desafio: targetTeam.pontos
    };
    
    desafios.push(novoDesafio);
    updateCSV('desafios.csv', desafios);
    
    alert('Desafio criado com sucesso!');
    closeChallengeModal();
    renderClassification();
}

function openResultView(desafioIndex) {
    const desafio = desafios[desafioIndex];
    if (!desafio) {
        alert('Desafio inválido.');
        return;
    }
    
    const form = document.getElementById('resultForm');
    
    const tempIndex = desafioIndex;
    
    form.innerHTML = `
        <p><strong>Data:</strong> ${formatDate(desafio.data_desafio)}</p>
        <div class="score-grid">
            <div class="score-grid-header">Dupla</div>
            <div class="score-grid-header">Set 1</div>
            <div class="score-grid-header">Set 2</div>
            <div class="score-grid-header">Tie</div>

            <div class="score-team-name">${getTeamName(desafio.dupla_1_id)} <span>(desafiadora)</span></div>
            <input type="number" id="set1Team1" min="0" max="7" step="1" inputmode="numeric" placeholder="0-7">
            <input type="number" id="set2Team1" min="0" max="7" step="1" inputmode="numeric" placeholder="0-7">
            <input type="number" id="tieTeam1" min="0" step="1" inputmode="numeric" placeholder="0+">

            <div class="score-team-name">${getTeamName(desafio.dupla_2_id)} <span>(desafiada)</span></div>
            <input type="number" id="set1Team2" min="0" max="7" step="1" inputmode="numeric" placeholder="0-7">
            <input type="number" id="set2Team2" min="0" max="7" step="1" inputmode="numeric" placeholder="0-7">
            <input type="number" id="tieTeam2" min="0" step="1" inputmode="numeric" placeholder="0+">
        </div>
        <p class="score-help">Validação: sets de 0 a 7; se houver 7, o adversário deve ter 5 ou 6. Tie-break de 0 a infinito; se um lado tiver mais de 10, a diferença deve ser 2.</p>
        
        <button onclick="submitResult(${tempIndex})">Guardar Resultado</button>
    `;
    document.getElementById('classificationView').classList.remove('active');
    document.getElementById('challengesView').classList.remove('active');
    document.getElementById('resultView').classList.add('active');
}

function backToChallenges() {
    document.getElementById('resultView').classList.remove('active');
    document.getElementById('classificationView').classList.remove('active');
    document.getElementById('challengesView').classList.add('active');
    document.getElementById('classificationTab').classList.remove('active');
    document.getElementById('challengesTab').classList.add('active');
    renderChallenges();
}

function submitResult(desafioIndex) {
    const desafio = desafios[desafioIndex];
    const score = {
        set1Team1: document.getElementById('set1Team1').value,
        set1Team2: document.getElementById('set1Team2').value,
        set2Team1: document.getElementById('set2Team1').value,
        set2Team2: document.getElementById('set2Team2').value,
        tieTeam1: document.getElementById('tieTeam1').value,
        tieTeam2: document.getElementById('tieTeam2').value
    };

    const validation = validateMatchScore(score);
    if (!validation.ok) {
        alert(validation.message);
        return;
    }

    const winnerTeamId = validation.winner === 1 ? desafio.dupla_1_id : desafio.dupla_2_id;
    
    // Actualizar desafio
    desafio.resultado_set_1 = `${Number(score.set1Team1)}-${Number(score.set1Team2)}`;
    desafio.resultado_set_2 = `${Number(score.set2Team1)}-${Number(score.set2Team2)}`;
    desafio.resultado_tie_break = validation.tieUsed ? `${Number(score.tieTeam1)}-${Number(score.tieTeam2)}` : '';
    desafio.data_resultado = new Date().toISOString().split('T')[0];
    
    // Actualizar pontos
    const dupla1 = duplas.find(d => d.dupla_id === desafio.dupla_1_id);
    const dupla2 = duplas.find(d => d.dupla_id === desafio.dupla_2_id);
    
    if (winnerTeamId === desafio.dupla_1_id) {
        // Dupla 1 venceu: adiciona pontos de dupla 2
        dupla1.pontos += dupla2.pontos;
        // Dupla 2 mantém os mesmos pontos
    } else {
        // Dupla 2 venceu: adiciona pontos de dupla 1
        dupla2.pontos += dupla1.pontos;
        // Dupla 1 mantém os mesmos pontos
    }
    
    updateCSV('desafios.csv', desafios);
    updateCSV('duplas.csv', duplas);
    
    alert('Resultado guardado com sucesso!');
    backToChallenges();
    renderClassification();
}

function parseIntegerInput(value) {
    if (value === '' || value === null || value === undefined) {
        return null;
    }

    if (!/^\d+$/.test(String(value))) {
        return NaN;
    }

    return Number(value);
}

function validateSetScore(a, b) {
    if (!Number.isInteger(a) || !Number.isInteger(b)) {
        return { ok: false, message: 'Os valores dos sets devem ser numéricos inteiros.' };
    }

    if (a < 0 || a > 7 || b < 0 || b > 7) {
        return { ok: false, message: 'Os valores dos sets devem estar entre 0 e 7.' };
    }

    if (a === b) {
        return { ok: false, message: 'Um set não pode terminar empatado.' };
    }

    if (a === 7 || b === 7) {
        const loser = a === 7 ? b : a;
        if (loser !== 5 && loser !== 6) {
            return { ok: false, message: 'Se uma equipa tiver 7 no set, a outra tem de ter 5 ou 6.' };
        }
    }

    return { ok: true, winner: a > b ? 1 : 2 };
}

function validateTieBreak(a, b) {
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) {
        return { ok: false, message: 'Os valores do tie-break devem ser numéricos inteiros (0 ou mais).' };
    }

    if (a === b) {
        return { ok: false, message: 'O tie-break não pode terminar empatado.' };
    }

    if ((a > 10 || b > 10) && Math.abs(a - b) !== 2) {
        return { ok: false, message: 'Quando uma equipa tem mais de 10 no tie-break, a diferença deve ser de 2 pontos.' };
    }

    return { ok: true, winner: a > b ? 1 : 2 };
}

function validateMatchScore(score) {
    const s11 = parseIntegerInput(score.set1Team1);
    const s12 = parseIntegerInput(score.set1Team2);
    const s21 = parseIntegerInput(score.set2Team1);
    const s22 = parseIntegerInput(score.set2Team2);
    const t1 = parseIntegerInput(score.tieTeam1);
    const t2 = parseIntegerInput(score.tieTeam2);

    if ([s11, s12, s21, s22].some(v => v === null)) {
        return { ok: false, message: 'Preencha os quatro valores dos sets.' };
    }

    if ([s11, s12, s21, s22, t1, t2].some(v => Number.isNaN(v))) {
        return { ok: false, message: 'Todos os campos preenchidos devem ser numéricos inteiros.' };
    }

    const set1 = validateSetScore(s11, s12);
    if (!set1.ok) {
        return set1;
    }

    const set2 = validateSetScore(s21, s22);
    if (!set2.ok) {
        return set2;
    }

    let winsTeam1 = 0;
    let winsTeam2 = 0;
    if (set1.winner === 1) winsTeam1++; else winsTeam2++;
    if (set2.winner === 1) winsTeam1++; else winsTeam2++;

    if (winsTeam1 === winsTeam2) {
        if (t1 === null || t2 === null) {
            return { ok: false, message: 'Empate em sets: preencha os dois valores do tie-break.' };
        }

        const tie = validateTieBreak(t1, t2);
        if (!tie.ok) {
            return tie;
        }

        return { ok: true, winner: tie.winner, tieUsed: true };
    }

    if (t1 !== null || t2 !== null) {
        return { ok: false, message: 'Não preencha tie-break quando uma dupla vence os dois sets.' };
    }

    return { ok: true, winner: winsTeam1 > winsTeam2 ? 1 : 2, tieUsed: false };
}

// ==================== ATUALIZAR CSV ====================
async function updateCSV(filename, data) {
    try {
        const response = await fetch('/api/update-csv', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filename: filename,
                data: data
            })
        });
        
        if (!response.ok) {
            throw new Error(`Erro ao atualizar: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('CSV atualizado:', result);
    } catch (error) {
        console.error('Erro ao atualizar CSV:', error);
        alert('Erro ao guardar dados: ' + error.message);
    }
}
