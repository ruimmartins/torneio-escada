// ==================== DADOS GLOBAIS ====================
let jogadores = [];
let duplas = [];
let desafios = [];
let selectedPlayerId = null;
let selectedTeamId = null;
let challengesScopeFilter = 'mine';   // 'mine' | 'all'
let challengesStatusFilter = 'current'; // 'current' | 'past'
let currentUser = null;
let pendingGameDate = null;

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', async () => {
    registerServiceWorker();
    await initializeApp();
});

function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    window.addEventListener('load', () => {
        fetch('/api/version', { cache: 'no-store' })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Falha ao obter versão de deploy: ${response.status}`);
                }
                return response.json();
            })
            .then((data) => {
                const swVersion = encodeURIComponent(String(data?.version || 'dev'));
                return navigator.serviceWorker.register(`/service-worker.js?v=${swVersion}`, {
                    updateViaCache: 'none'
                });
            })
            .catch((error) => {
                console.error('Erro ao registar service worker:', error);
                navigator.serviceWorker.register('/service-worker.js?v=dev', {
                    updateViaCache: 'none'
                }).catch((registerError) => {
                    console.error('Erro no fallback de registo do service worker:', registerError);
                });
            });
    });
}

async function loadCSVData() {
    try {
        const [jogadoresData, duplasData, desafiosData] = await Promise.all([
            loadJSON('/api/jogadores'),
            loadJSON('/api/duplas'),
            loadJSON('/api/desafios')
        ]);

        jogadores = jogadoresData;
        duplas = duplasData;
        desafios = desafiosData;
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        alert('Erro ao carregar dados do servidor');
    }
}

async function loadJSON(path) {
    const response = await fetch(path);
    if (!response.ok) {
        throw new Error(`Erro ao carregar ${path}: ${response.status}`);
    }

    return response.json();
}

async function initializeApp() {
    setAuthLoading(true, 'A verificar sessão...');

    try {
        const me = await getCurrentSession();
        currentUser = me.user;
        selectedPlayerId = Number(currentUser.player_id);
        selectedTeamId = Number(currentUser.team_id);

        await loadCSVData();
        showMainLayout();
    } catch (_error) {
        showLoginModal();
    } finally {
        setAuthLoading(false);
    }
}

// ==================== AUTH ====================
function setAuthLoading(isLoading, message = 'A processar...') {
    const loadingElement = document.getElementById('authLoading');
    const loadingTextElement = document.getElementById('authLoadingText');

    if (!loadingElement) {
        return;
    }

    if (loadingTextElement) {
        loadingTextElement.textContent = message;
    }

    loadingElement.classList.toggle('hidden', !isLoading);
}

function setLoginLoading(isLoading) {
    const usernameInput = document.getElementById('loginUsername');
    const passwordInput = document.getElementById('loginPassword');
    const togglePasswordButton = document.getElementById('toggleLoginPasswordBtn');
    const submitButton = document.getElementById('loginSubmitBtn');

    if (usernameInput) {
        usernameInput.disabled = isLoading;
    }

    if (passwordInput) {
        passwordInput.disabled = isLoading;
    }

    if (togglePasswordButton) {
        togglePasswordButton.disabled = isLoading;
    }

    if (submitButton) {
        submitButton.disabled = isLoading;
        submitButton.textContent = isLoading ? 'A entrar...' : 'Entrar';
    }
}

function showLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function hideLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

async function getCurrentSession() {
    const response = await fetch('/api/auth/me');
    if (!response.ok) {
        throw new Error('Sessão inválida');
    }

    return response.json();
}

async function login() {
    const usernameInput = document.getElementById('loginUsername');
    const passwordInput = document.getElementById('loginPassword');
    const username = (usernameInput?.value || '').trim();
    const password = passwordInput?.value || '';

    if (!username || !password) {
        alert('Preencha utilizador e password.');
        return;
    }

    setLoginLoading(true);

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            throw new Error('Credenciais inválidas');
        }

        const result = await response.json();
        currentUser = result.user;
        selectedPlayerId = Number(currentUser.player_id);
        selectedTeamId = Number(currentUser.team_id);

        await loadCSVData();
        showMainLayout();
    } catch (error) {
        alert('Não foi possível entrar: ' + error.message);
    } finally {
        setLoginLoading(false);
    }
}

function toggleLoginPasswordVisibility() {
    const passwordInput = document.getElementById('loginPassword');
    const toggleBtn = document.getElementById('toggleLoginPasswordBtn');

    if (!passwordInput || !toggleBtn) {
        return;
    }

    const showPassword = passwordInput.type === 'password';
    passwordInput.type = showPassword ? 'text' : 'password';
    toggleBtn.textContent = showPassword ? 'Ocultar' : 'Mostrar';
}

async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
    } catch (_error) {
        // Ignora erro de logout para permitir limpar UI local.
    }

    currentUser = null;
    selectedPlayerId = null;
    selectedTeamId = null;
    jogadores = [];
    duplas = [];
    desafios = [];

    document.getElementById('mainLayout').classList.add('hidden');
    showLoginModal();
}

function showMainLayout() {
    hideLoginModal();
    
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
    renderAlerts();
    renderClassification();
}

// ==================== ALERTAS ====================
function daysBetween(dateStrA, dateStrB) {
    const a = new Date(dateStrA + 'T00:00:00');
    const b = new Date(dateStrB + 'T00:00:00');
    return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

function renderAlerts() {
    const today = new Date().toISOString().split('T')[0];

    const pending = desafios.filter(d => !hasChallengeResult(d));
    const pendingWithoutGameDate = pending.filter(d => !d.data_jogo);
    const pendingWithPastGameDate = pending
        .filter(d => d.data_jogo && d.data_jogo < today)
        .map(d => ({ ...d, dias: daysBetween(d.data_jogo, today) }))
        .sort((a, b) => b.dias - a.dias);

    function renderAlertTable(blockId, bodyId, rows, renderRow) {
        const block = document.getElementById(blockId);
        const body  = document.getElementById(bodyId);
        body.innerHTML = '';
        if (rows.length > 0) {
            rows.forEach(row => body.appendChild(renderRow(row)));
            block.classList.remove('hidden');
        } else {
            block.classList.add('hidden');
        }

        return rows.length > 0;
    }

    let hasAnyAlerts = false;

    const makeDesafioRow = (labelDias) => (d) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td data-label="Dupla 1">${getTeamName(d.dupla_1_id)}</td>
            <td data-label="Dupla 2">${getTeamName(d.dupla_2_id)}</td>
            <td data-label="Data Desafio">${formatDate(d.data_desafio)}</td>
            <td data-label="${labelDias}">${d.dias}</td>
        `;
        return tr;
    };

    hasAnyAlerts = renderAlertTable(
        'alertGameDateOverdue', 'alertGameDateOverdueBody',
        pendingWithPastGameDate,
        (d) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-label="Dupla 1">${getTeamName(d.dupla_1_id)}</td>
                <td data-label="Dupla 2">${getTeamName(d.dupla_2_id)}</td>
                <td data-label="Data Jogo">${formatDate(d.data_jogo)}</td>
                <td data-label="Dias de atraso">${d.dias}</td>
            `;
            return tr;
        }
    ) || hasAnyAlerts;

    // Tabela 1: > 16 dias sem resultado
    hasAnyAlerts = renderAlertTable(
        'alertOverdue', 'alertOverdueBody',
        pendingWithoutGameDate
            .filter(d => d.data_desafio)
            .map(d => ({ ...d, dias: daysBetween(d.data_desafio, today) }))
            .filter(d => d.dias > 16)
            .sort((a, b) => b.dias - a.dias),
        makeDesafioRow('Dias em atraso')
    ) || hasAnyAlerts;

    // Tabela 2: entre 12 e 16 dias sem resultado
    hasAnyAlerts = renderAlertTable(
        'alertOverdueWarning', 'alertOverdueWarningBody',
        pendingWithoutGameDate
            .filter(d => d.data_desafio)
            .map(d => ({ ...d, dias: daysBetween(d.data_desafio, today) }))
            .filter(d => d.dias >= 12 && d.dias <= 16)
            .sort((a, b) => b.dias - a.dias),
        makeDesafioRow('Dias em aberto')
    ) || hasAnyAlerts;

    // --- duplas ativas sem desafio em curso: calcular dias desde o último jogo concluído ---
    const teamIdsWithOngoing = new Set();
    pending.forEach(d => {
        teamIdsWithOngoing.add(d.dupla_1_id);
        teamIdsWithOngoing.add(d.dupla_2_id);
    });

    const duplasComUltimoJogo = duplas
        .filter(d => d.active !== false && !teamIdsWithOngoing.has(d.dupla_id))
        .map(dupla => {
            const jogosConc = desafios
                .filter(d =>
                    (d.dupla_1_id === dupla.dupla_id || d.dupla_2_id === dupla.dupla_id) &&
                    d.data_resultado && d.data_resultado !== ''
                )
                .sort((a, b) => (a.data_resultado < b.data_resultado ? 1 : -1));

            if (jogosConc.length === 0) return null;

            const ultimoJogo = jogosConc[0].data_resultado;
            return { dupla, ultimoJogo, dias: daysBetween(ultimoJogo, today) };
        })
        .filter(Boolean);

    const makeInativaRow = ({ dupla, ultimoJogo, dias }) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td data-label="Dupla">${getTeamName(dupla.dupla_id)}</td>
            <td data-label="Último jogo">${formatDate(ultimoJogo)}</td>
            <td data-label="Dias sem jogar">${dias}</td>
        `;
        return tr;
    };

    // Tabela 3: > 30 dias sem jogar
    hasAnyAlerts = renderAlertTable(
        'alertInactive', 'alertInactiveBody',
        duplasComUltimoJogo.filter(x => x.dias > 30).sort((a, b) => b.dias - a.dias),
        makeInativaRow
    ) || hasAnyAlerts;

    // Tabela 4: entre 15 e 30 dias sem jogar
    hasAnyAlerts = renderAlertTable(
        'alertInactiveWarning', 'alertInactiveWarningBody',
        duplasComUltimoJogo.filter(x => x.dias >= 15 && x.dias <= 30).sort((a, b) => b.dias - a.dias),
        makeInativaRow
    ) || hasAnyAlerts;

    const alertsTab = document.getElementById('alertsTab');
    if (alertsTab) {
        alertsTab.classList.toggle('hidden', !hasAnyAlerts);
    }

    const alertsView = document.getElementById('alertsView');
    if (!hasAnyAlerts && alertsView?.classList.contains('active')) {
        document.getElementById('classificationTab').classList.add('active');
        document.getElementById('challengesTab').classList.remove('active');
        alertsTab?.classList.remove('active');
        document.getElementById('classificationView').classList.add('active');
        document.getElementById('challengesView').classList.remove('active');
        alertsView.classList.remove('active');
        document.getElementById('resultView').classList.remove('active');
        renderClassification();
    }
}

// ==================== TABS ====================
function switchTab(tabName) {
    renderAlerts();

    // Actualizar botões de tabs
    document.getElementById('classificationTab').classList.toggle('active', tabName === 'classification');
    document.getElementById('challengesTab').classList.toggle('active', tabName === 'challenges');
    document.getElementById('alertsTab')?.classList.toggle('active', tabName === 'alerts');
    
    // Actualizar conteúdo das tabs
    document.getElementById('classificationView').classList.toggle('active', tabName === 'classification');
    document.getElementById('challengesView').classList.toggle('active', tabName === 'challenges');
    document.getElementById('alertsView')?.classList.toggle('active', tabName === 'alerts');
    document.getElementById('resultView').classList.remove('active');
    
    // Render
    if (tabName === 'classification') {
        renderClassification();
    } else if (tabName === 'challenges') {
        updateChallengesFilterButtons();
        renderChallenges();
    } else if (tabName === 'alerts') {
        renderAlerts();
    }
}

function hasChallengeResult(desafio) {
    return Boolean(desafio.data_resultado && desafio.data_resultado !== '');
}

function hasChallengeGameDate(desafio) {
    return Boolean(desafio.data_jogo && desafio.data_jogo !== '');
}

function updateChallengesFilterButtons() {
    document.getElementById('filterMineBtn')?.classList.toggle('active', challengesScopeFilter === 'mine');
    document.getElementById('filterAllBtn')?.classList.toggle('active', challengesScopeFilter === 'all');
    document.getElementById('filterCurrentBtn')?.classList.toggle('active', challengesStatusFilter === 'current');
    document.getElementById('filterPastBtn')?.classList.toggle('active', challengesStatusFilter === 'past');
}

function setChallengesScopeFilter(scope) {
    challengesScopeFilter = scope;
    updateChallengesFilterButtons();
    renderChallenges();
}

function setChallengesStatusFilter(status) {
    challengesStatusFilter = status;
    updateChallengesFilterButtons();
    renderChallenges();
}

function isTeamInactive(duplaId) {
    const team = duplas.find(d => Number(d.dupla_id) === Number(duplaId));
    if (team && team.active === false) {
        return true;
    }

    const playersInTeam = jogadores.filter(j => Number(j.dupla_id) === Number(duplaId));
    return playersInTeam.some(j => j.ativo === false || j.ativo === 'false' || Number(j.ativo) === 0);
}

function hasOngoingChallenge(duplaId) {
    return desafios.some(d =>
        (d.dupla_1_id === duplaId || d.dupla_2_id === duplaId) &&
        (!d.data_resultado || d.data_resultado === '')
    );
}

function getClassificationRowClass(duplaId) {
    if (duplaId === selectedTeamId) {
        return 'classification-row-own';
    }

    if (isTeamInactive(duplaId)) {
        return 'classification-row-inactive';
    }

    if (hasOngoingChallenge(duplaId)) {
        return 'classification-row-ongoing';
    }

    return '';
}

// ==================== CLASSIFICAÇÃO ====================
function renderClassification() {
    const tbody = document.getElementById('classificationBody');
    tbody.innerHTML = '';

    const currentChallengeContainer = document.getElementById('currentChallengeContainer');
    const currentChallengeBody = document.getElementById('currentChallengeBody');
    if (currentChallengeContainer && currentChallengeBody) {
        currentChallengeBody.innerHTML = '';

        const desafioAtual = desafios
            .filter(d => !hasChallengeResult(d) && (d.dupla_1_id === selectedTeamId || d.dupla_2_id === selectedTeamId))
            .sort((a, b) => (a.data_desafio < b.data_desafio ? 1 : -1))[0];

        if (desafioAtual) {
            const globalIndex = desafios.indexOf(desafioAtual);
            const nome1 = getTeamName(desafioAtual.dupla_1_id);
            const nome2 = getTeamName(desafioAtual.dupla_2_id);
            const nome1WithPoints = `${nome1} (${desafioAtual.dupla_1_pontos_desafio}pts)`;
            const nome2WithPoints = `${nome2} (${desafioAtual.dupla_2_pontos_desafio}pts)`;
            const defineDateBtn = `<button class="btn-set-game-date" onclick="openGameDateModal(${globalIndex})">${hasChallengeGameDate(desafioAtual) ? 'Editar Data de Jogo' : 'Definir Data de Jogo'}</button>`;
            const resultBtn = hasChallengeGameDate(desafioAtual)
                ? `<button class="btn-result" onclick="openResultViewByGlobalIndex(${globalIndex})">Inserir Resultado</button>`
                : '';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-label="Dupla 1">${nome1WithPoints}</td>
                <td data-label="Dupla 2">${nome2WithPoints}</td>
                <td data-label="Data">Desafio: ${formatDate(desafioAtual.data_desafio)}${hasChallengeGameDate(desafioAtual) ? `<br>Jogo: ${formatDate(desafioAtual.data_jogo)}` : '<br>Jogo: por definir'}</td>
                <td data-label="Resultado">${defineDateBtn}${resultBtn}</td>
            `;
            currentChallengeBody.appendChild(tr);
            currentChallengeContainer.classList.remove('hidden');
        } else {
            currentChallengeContainer.classList.add('hidden');
        }
    }
    
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
        const rowClass = getClassificationRowClass(dupla.dupla_id);
        if (rowClass) {
            tr.classList.add(rowClass);
        }
        
        // Verificar se pode desafiar
        const podeDesafiar = canChallenge(dupla, posicaoUtilizador, index);
        
        tr.innerHTML = `
            <td data-label="Pos.">${index + 1}</td>
            <td data-label="Dupla">${dupla.nome}</td>
            <td data-label="Jogos">${dupla.jogos ?? 0}</td>
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

    if (isTeamInactive(targetTeam.dupla_id)) {
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
    
    // Pode desafiar qualquer dupla abaixo; acima, apenas até 5 posições.
    if (posicaoAlvo > posicaoUtilizador) {
        return true;
    }

    const posicoesAcima = posicaoUtilizador - posicaoAlvo;
    return posicoesAcima <= 5;
}

// ==================== DESAFIOS ====================
function renderChallenges() {
    const tbody = document.getElementById('challengesBody');
    tbody.innerHTML = '';
    
    const desafioEnvolveUtilizador = (d) => d.dupla_1_id === selectedTeamId || d.dupla_2_id === selectedTeamId;

    const desafiosBase = challengesScopeFilter === 'mine'
        ? desafios.filter(desafioEnvolveUtilizador)
        : desafios;

    const desafiosFiltrados = desafiosBase.filter(d => {
        if (challengesStatusFilter === 'past') {
            return hasChallengeResult(d);
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
                const defineDateBtn = `<button class="btn-set-game-date" onclick="openGameDateModal(${desafios.indexOf(desafio)})">${hasChallengeGameDate(desafio) ? 'Editar Data de Jogo' : 'Definir Data de Jogo'}</button>`;
                const resultBtn = hasChallengeGameDate(desafio)
                    ? `<button class="btn-result" onclick="openResultViewByGlobalIndex(${desafios.indexOf(desafio)})">Inserir Resultado</button>`
                    : '';
                resultadoHTML = `${defineDateBtn}${resultBtn}`;
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
            <td data-label="Data">Desafio: ${formatDate(desafio.data_desafio)}${hasChallengeGameDate(desafio) ? `<br>Jogo: ${formatDate(desafio.data_jogo)}` : '<br>Jogo: por definir'}</td>
            <td data-label="Resultado">${resultadoHTML}</td>
        `;
        
        tbody.appendChild(tr);
    });
    
    if (desafiosFiltrados.length === 0) {
        const tr = document.createElement('tr');
        tr.className = 'empty-state';
        const scopeLabel = challengesScopeFilter === 'mine' ? 'da sua dupla' : 'de todas as duplas';
        const statusLabel = challengesStatusFilter === 'past' ? 'passados' : 'em curso';
        tr.innerHTML = `<td colspan="4" data-label="">Nenhum desafio ${statusLabel} encontrado ${scopeLabel}</td>`;
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

    if (!hasChallengeGameDate(desafio)) {
        alert('Defina primeiro a data de jogo deste desafio.');
        return;
    }

    openResultView(globalIndex);
}

function openGameDateModal(desafioIndex) {
    const desafio = desafios[desafioIndex];
    if (!desafio || hasChallengeResult(desafio)) {
        return;
    }

    const envolveUtilizador = desafio.dupla_1_id === selectedTeamId || desafio.dupla_2_id === selectedTeamId;
    if (!envolveUtilizador) {
        alert('Só pode definir data de jogo para desafios da sua dupla.');
        return;
    }

    pendingGameDate = { desafioIndex };
    document.getElementById('gameDateModalText').textContent = `Definir data de jogo para ${getTeamName(desafio.dupla_1_id)} vs ${getTeamName(desafio.dupla_2_id)}.`;
    document.getElementById('gameDateInput').value = desafio.data_jogo || '';
    document.getElementById('gameDateModal').classList.remove('hidden');
}

function closeGameDateModal() {
    document.getElementById('gameDateModal').classList.add('hidden');
    pendingGameDate = null;
}

async function submitGameDate() {
    if (!pendingGameDate) {
        return;
    }

    const input = document.getElementById('gameDateInput');
    const dateValue = (input?.value || '').trim();
    if (!dateValue) {
        alert('Selecione a data de jogo.');
        return;
    }

    const desafio = desafios[pendingGameDate.desafioIndex];
    if (!desafio || !desafio._id) {
        alert('Desafio inválido.');
        return;
    }

    try {
        const result = await updateChallengeGameDate(desafio._id, dateValue);
        desafios[pendingGameDate.desafioIndex] = result.desafio || { ...desafio, data_jogo: dateValue };
        closeGameDateModal();
        renderAlerts();
        renderClassification();
        renderChallenges();
    } catch (error) {
        alert('Erro ao guardar data de jogo: ' + error.message);
    }
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
    if (!targetTeam || isTeamInactive(targetTeamId)) {
        alert('Não é possível desafiar uma dupla inativa.');
        return;
    }

    const teamName = getTeamName(targetTeamId);

    const form = document.getElementById('challengeForm');
    form.innerHTML = `
        <p>Tem a certeza que quer desafiar a dupla <strong>${teamName}</strong>?</p>
        <div class="challenge-confirm-actions">
            <button onclick="submitChallenge(${targetTeamId})">Sim, desafiar</button>
            <button class="btn-cancel" onclick="closeChallengeModal()">Cancelar</button>
        </div>
    `;

    document.getElementById('challengeModal').classList.remove('hidden');
}

function closeChallengeModal() {
    document.getElementById('challengeModal').classList.add('hidden');
}

async function submitChallenge(targetTeamId) {
    const dateInput = new Date().toISOString().split('T')[0];

    const myTeam = duplas.find(d => d.dupla_id === selectedTeamId);
    const targetTeam = duplas.find(d => d.dupla_id === targetTeamId);

    if (!myTeam || !targetTeam) {
        alert('Dupla inválida.');
        return;
    }

    if (isTeamInactive(targetTeamId) || myTeam.active === false) {
        alert('Não é possível criar desafios com duplas inativas.');
        return;
    }
    
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
    
    try {
        const result = await createChallenge(novoDesafio);
        desafios.push(result.desafio || novoDesafio);
    } catch (error) {
        console.error('Erro ao criar desafio:', error);
        alert('Erro ao criar desafio: ' + error.message);
        return;
    }
    
    alert('Desafio criado com sucesso!');
    closeChallengeModal();
    renderAlerts();
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
        
        <button onclick="submitResult(${tempIndex})">Guardar Resultado</button>
    `;

    setupResultInputAutoAdvance();
    document.getElementById('classificationView').classList.remove('active');
    document.getElementById('challengesView').classList.remove('active');
    document.getElementById('resultView').classList.add('active');
}

function setupResultInputAutoAdvance() {
    const order = ['set1Team1', 'set1Team2', 'set2Team1', 'set2Team2', 'tieTeam1', 'tieTeam2'];

    order.forEach((id, index) => {
        const input = document.getElementById(id);
        if (!input) {
            return;
        }

        input.addEventListener('input', () => {
            if (input.value === '') {
                return;
            }

            const digitsCount = String(input.value).replace(/\D/g, '').length;
            const minDigitsToAdvance = id.startsWith('tie') ? 2 : 1;
            if (digitsCount < minDigitsToAdvance) {
                return;
            }

            const nextId = order[index + 1];
            if (!nextId) {
                return;
            }

            const nextInput = document.getElementById(nextId);
            if (!nextInput) {
                return;
            }

            nextInput.focus();
            nextInput.select();
        });
    });
}

function backToChallenges() {
    document.getElementById('resultView').classList.remove('active');
    document.getElementById('classificationView').classList.remove('active');
    document.getElementById('challengesView').classList.add('active');
    document.getElementById('classificationTab').classList.remove('active');
    document.getElementById('challengesTab').classList.add('active');
    renderChallenges();
}

let pendingResult = null;

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
    const loserTeamId  = validation.winner === 1 ? desafio.dupla_2_id : desafio.dupla_1_id;

    const set1 = `${Number(score.set1Team1)}-${Number(score.set1Team2)}`;
    const set2 = `${Number(score.set2Team1)}-${Number(score.set2Team2)}`;
    const tie  = validation.tieUsed ? `${Number(score.tieTeam1)}-${Number(score.tieTeam2)}` : '';
    const resultadoStr = [set1, set2, tie ? `TB ${tie}` : ''].filter(Boolean).join(', ');

    pendingResult = {
        desafio,
        winnerTeamId,
        resultado_set_1: set1,
        resultado_set_2: set2,
        resultado_tie_break: tie
    };

    const body = document.getElementById('resultConfirmBody');
    body.innerHTML = `
        <div class="result-confirm-row"><span class="result-confirm-label">Vencedor</span><span class="result-confirm-winner">${getTeamName(winnerTeamId)}</span></div>
        <div class="result-confirm-row"><span class="result-confirm-label">Vencido</span><span>${getTeamName(loserTeamId)}</span></div>
        <div class="result-confirm-row"><span class="result-confirm-label">Resultado</span><span>${resultadoStr}</span></div>
    `;

    document.getElementById('resultConfirmModal').classList.remove('hidden');
}

function closeResultConfirmModal() {
    document.getElementById('resultConfirmModal').classList.add('hidden');
    pendingResult = null;
}

async function confirmResult() {
    if (!pendingResult) {
        return;
    }

    const { desafio, winnerTeamId, resultado_set_1, resultado_set_2, resultado_tie_break } = pendingResult;

    desafio.resultado_set_1 = resultado_set_1;
    desafio.resultado_set_2 = resultado_set_2;
    desafio.resultado_tie_break = resultado_tie_break;
    desafio.data_resultado = new Date().toISOString().split('T')[0];

    closeResultConfirmModal();

    saveChallengeResult(desafio, winnerTeamId)
        .then(async () => {
            duplas = await loadJSON('/api/duplas');
            renderAlerts();
            switchTab('classification');
        })
        .catch((error) => {
            console.error('Erro ao guardar resultado:', error);
            alert('Erro ao guardar resultado: ' + error.message);
        });
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

    if (a < 6 && b < 6) {
        return { ok: false, message: 'Num set, pelo menos uma equipa tem de ter 6 ou 7 jogos.' };
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

async function saveChallengeResult(desafio, winnerTeamId) {
    if (!desafio._id) {
        throw new Error('Desafio sem identificador (_id). Recarregue a página e tente novamente.');
    }

    const response = await fetch(`/api/desafios/${desafio._id}/resultado`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            resultado_set_1: desafio.resultado_set_1,
            resultado_set_2: desafio.resultado_set_2,
            resultado_tie_break: desafio.resultado_tie_break,
            data_resultado: desafio.data_resultado,
            winner_team_id: winnerTeamId
        })
    });

    if (!response.ok) {
        throw new Error(`Erro ao guardar resultado: ${response.statusText}`);
    }

    return response.json();
}

async function createChallenge(novoDesafio) {
    const response = await fetch('/api/desafio/novo', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(novoDesafio)
    });

    if (!response.ok) {
        throw new Error(`Erro ao criar desafio: ${response.statusText}`);
    }

    return response.json();
}

async function updateChallengeGameDate(desafioId, dataJogo) {
    const response = await fetch(`/api/desafio/${desafioId}/data-jogo`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data_jogo: dataJogo })
    });

    if (!response.ok) {
        let serverMessage = response.statusText;
        try {
            const payload = await response.json();
            serverMessage = payload?.error || payload?.message || serverMessage;
        } catch (_error) {
            // Mantém statusText se não vier JSON
        }
        throw new Error(`Erro ao definir data de jogo: ${serverMessage}`);
    }

    return response.json();
}
