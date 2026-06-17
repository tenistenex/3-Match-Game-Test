(function () {
  const logic = window.Match3Logic;
  const { BLOCK_TYPES, activeBlockTypes, blockType } = window.Match3Config;
  const { createState, resetRoundStats } = window.Match3State;
  const { $, clamp, setStatus } = window.Match3Dom;
  const state = createState();
  const showDebugOptions = (() => {
    const search = window.location && window.location.search ? window.location.search : '';
    const debugMatch = search.match(/[?&]debugOptions=([^&]*)/);
    if (debugMatch) {
      const value = decodeURIComponent(debugMatch[1]);
      return value !== 'false' && value !== '0';
    }
    if (/[?&]debugOptions(?:&|$)/.test(search)) return true;
    return window.MATCH3_SHOW_DEBUG_OPTIONS === true;
  })();

  function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
  function sleepMsFromSeconds(seconds) { return Math.max(1, Number(seconds)) * 1000; }
  function formatNumber(value) { return Number.isInteger(value) ? String(value) : value.toFixed(1); }

  function readNumberInput(id, fallback, { min = -Infinity, max = Infinity } = {}) {
    const raw = $(id).value;
    const value = raw === '' || raw === null || raw === undefined ? NaN : Number(raw);
    const safe = Number.isFinite(value) ? value : fallback;
    return clamp(safe, min, max);
  }

  function readIntegerInput(id, fallback, range) {
    return Math.round(readNumberInput(id, fallback, range));
  }

  function formatCountdown(target) {
    if (!target || state.ended) return '--';
    return `${Math.max(0, Math.ceil((target - Date.now()) / 1000))}s`;
  }
  function countdownProgress(target, intervalSeconds) {
    if (!target || state.ended) return 0;
    const total = sleepMsFromSeconds(intervalSeconds);
    const remaining = clamp(target - Date.now(), 0, total);
    return total ? (total - remaining) / total * 100 : 0;
  }

  let render = () => {};
  let renderBattleStats = () => {};
  let playerAttack = () => {};
  let enemyAttack = () => {};

  function updateAttackTimer() { renderBattleStats(); }

  function posKey(pos) { return `${pos.r},${pos.c}`; }

  function specialName(special) {
    return special === 'line-row' ? '橫列消除' : special === 'line-column' ? '直行消除' : special === 'bomb' ? '九宮格爆炸' : '同色全消';
  }

  function chooseSpecialAnchor(group) {
    if (state.selected) {
      const picked = group.cells.find(cell => cell.r === state.selected.r && cell.c === state.selected.c);
      if (picked) return picked;
    }
    return group.cells[Math.floor(group.cells.length / 2)];
  }

  function cellsForSpecial(pos) {
    const block = state.board[pos.r][pos.c];
    if (!logic.isSpecialBlock(block)) return [];
    const cells = new Map();
    const add = (r, c) => { if (r >= 0 && c >= 0 && r < state.size && c < state.size) cells.set(`${r},${c}`, { r, c }); };
    if (block.special === logic.SPECIAL_TYPES.LINE_ROW) for (let c = 0; c < state.size; c++) add(pos.r, c);
    else if (block.special === logic.SPECIAL_TYPES.LINE_COLUMN) for (let r = 0; r < state.size; r++) add(r, pos.c);
    else if (block.special === logic.SPECIAL_TYPES.BOMB) {
      for (let r = pos.r - 1; r <= pos.r + 1; r++) for (let c = pos.c - 1; c <= pos.c + 1; c++) add(r, c);
    } else if (block.special === logic.SPECIAL_TYPES.COLOR) {
      const color = block.color;
      state.board.forEach((row, r) => row.forEach((value, c) => { if (value !== null && logic.colorOf(value) === color) add(r, c); }));
    }
    return Array.from(cells.values());
  }

  function blockClearSpeed(value) {
    if (value === null) return state.clearSpeed;
    const type = blockType(logic.colorOf(value));
    return Math.max(1, Number(type.clearSpeed) || state.clearSpeed);
  }

  function applyDebugOptionVisibility() {
    if (!document.querySelectorAll) return;
    document.querySelectorAll('[data-debug-option]').forEach(element => {
      element.hidden = !showDebugOptions;
    });
  }

  function renderBlockSettings() {
    const container = $('blockSettings');
    if (!container) return;
    container.innerHTML = '';
    activeBlockTypes(state.colorCount).forEach((type, index) => {
      const card = document.createElement('div');
      card.className = 'block-setting-card';
      card.innerHTML = `
        <strong><span aria-hidden="true">${type.icon}</span>${type.name}</strong>
        <label>出現權重
          <input type="number" min="0" max="99" step="0.1" value="${type.weight}" data-block-index="${index}" data-block-field="weight" />
        </label>
        <label>消除速度(ms)
          <input type="number" min="80" max="2000" step="10" value="${type.clearSpeed}" data-block-index="${index}" data-block-field="clearSpeed" />
        </label>
      `;
      Array.prototype.forEach.call(card.querySelectorAll('input'), input => {
        input.addEventListener('change', event => {
          const target = event.target;
          const block = BLOCK_TYPES[Number(target.dataset.blockIndex)];
          const field = target.dataset.blockField;
          block[field] = field === 'weight' ? Math.max(0, Number(target.value) || 0) : Math.max(1, Number(target.value) || state.clearSpeed);
          if (field === 'weight') resetGame();
          else render();
        });
      });
      container.appendChild(card);
    });
  }

  function useMagic() {
    if (state.ended || state.magicArmed || state.roundStats.spell < 5) return;
    state.roundStats.spell -= 5;
    state.magicArmed = true;
    state.lastAction = '已使用魔法：下次我方攻擊傷害 x2。';
    setStatus('已使用魔法：下次我方攻擊傷害 x2。');
    render();
  }

  function updateTimer() {
    if (!state.startedAt) { $('timer').textContent = '00:00'; return; }
    const sec = Math.floor((Date.now() - state.startedAt) / 1000);
    $('timer').textContent = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
    $('playerAttackCountdown').textContent = formatCountdown(state.nextPlayerAttackAt);
    $('enemyAttackCountdown').textContent = formatCountdown(state.nextEnemyAttackAt);
    renderBattleStats();
  }

  function startTimers() {
    if (state.startedAt || state.ended) return;
    state.startedAt = Date.now();
    state.nextPlayerAttackAt = Date.now() + sleepMsFromSeconds(state.attackInterval);
    state.nextEnemyAttackAt = Date.now() + sleepMsFromSeconds(state.enemyInterval);
    state.timerId = setInterval(updateTimer, 1000);
    state.attackTimerId = setInterval(playerAttack, sleepMsFromSeconds(state.attackInterval));
    state.enemyTimerId = setInterval(enemyAttack, sleepMsFromSeconds(state.enemyInterval));
  }

  function stopTimers() {
    clearInterval(state.timerId); clearInterval(state.attackTimerId); clearInterval(state.enemyTimerId);
  }

  function resetGame() {
    stopTimers();
    const size = readIntegerInput('boardSize', state.size || 8, { min: 3, max: 12 });
    const colorCount = readIntegerInput('colorCount', state.colorCount || 4, { min: 3, max: BLOCK_TYPES.length });
    const playerMaxHp = readIntegerInput('playerMaxHpInput', state.playerMaxHp || 100, { min: 1, max: 9999 });
    const enemyMaxHp = readIntegerInput('enemyMaxHpInput', state.enemyMaxHp || 100, { min: 1, max: 9999 });
    Object.assign(state, { size, colorCount, fallSpeed: readNumberInput('fallSpeed', state.fallSpeed || 420, { min: 1, max: 5000 }), clearSpeed: readNumberInput('clearSpeed', state.clearSpeed || 260, { min: 1, max: 5000 }), attackInterval: readNumberInput('attackInterval', state.attackInterval || 5, { min: 1, max: 3600 }), enemyInterval: readNumberInput('enemyInterval', state.enemyInterval || 5, { min: 1, max: 3600 }), attackMultiplier: readNumberInput('attackMultiplier', state.attackMultiplier || 1, { min: 0, max: 999 }), defenseMultiplier: readNumberInput('defenseMultiplier', state.defenseMultiplier || 1, { min: 0, max: 999 }), enemyAttackPower: readNumberInput('enemyAttackPower', state.enemyAttackPower || 10, { min: 0, max: 9999 }), selected: null, busy: false, score: 0, moves: 30, target: size * 150, combo: 1, startedAt: null, timerId: null, attackTimerId: null, enemyTimerId: null, hint: [], playerHp: playerMaxHp, enemyHp: enemyMaxHp, playerMaxHp, enemyMaxHp, nextPlayerAttackAt: null, nextEnemyAttackAt: null, lastAction: '交換方塊後，雙方攻擊計時器會開始。', heroAction: false, enemyAction: false, ended: false, magicArmed: false });
    resetRoundStats(state);
    state.board = logic.createBoard(state.size, state.colorCount);
    renderBlockSettings();
    updateTimer();
    updateAttackTimer();
    setStatus('請交換相鄰方塊開始遊戲。');
    render();
  }

  async function handleCellClick(pos) {
    if (state.busy || state.moves <= 0 || state.ended) return;
    state.hint = [];
    const clickedBlock = state.board[pos.r][pos.c];
    if (!state.selected && logic.isSpecialBlock(clickedBlock)) {
      startTimers();
      state.busy = true;
      state.moves--;
      await activateSpecial(pos);
      state.combo = 1;
      endTurnCheck();
      state.busy = false;
      render();
      return;
    }
    if (!state.selected) { state.selected = pos; render(); return; }
    if (!logic.areAdjacent(state.selected, pos)) { state.selected = pos; render(); return; }

    const selectedBlock = state.board[state.selected.r][state.selected.c];
    if (logic.isSpecialBlock(selectedBlock) && logic.isSpecialBlock(clickedBlock)) {
      startTimers();
      state.busy = true;
      state.moves--;
      await activateSpecialPair(state.selected, pos);
      state.selected = null;
      state.combo = 1;
      endTurnCheck();
      state.busy = false;
      render();
      return;
    }

    startTimers();
    state.busy = true;
    const previous = state.board;
    state.board = logic.swap(state.board, state.selected, pos);
    state.moves--;
    render();
    await sleep(120);

    if (logic.findMatches(state.board).length === 0) {
      state.board = previous;
      state.selected = null;
      setStatus('這一步沒有形成三消，已幫你換回來。');
      state.busy = false;
      render();
      return;
    }

    try {
      await resolveMatches();
      state.selected = null;
      state.combo = 1;
      endTurnCheck();
    } catch (error) {
      console.error(error);
      setStatus('消除流程發生錯誤，已解除鎖定，請再試一次。');
    } finally {
      state.busy = false;
      render();
    }
  }

  function collectMatchResult() {
    const groups = logic.findMatchGroups(state.board);
    const clearing = new Map();
    const specials = [];
    groups.forEach(group => {
      const special = logic.getSpecialForGroup(group);
      const anchor = special ? chooseSpecialAnchor(group) : null;
      group.cells.forEach(cell => {
        if (!anchor || cell.r !== anchor.r || cell.c !== anchor.c) clearing.set(posKey(cell), cell);
      });
      if (special && anchor) specials.push({ ...anchor, color: group.color, special });
    });
    return { groups, clearing: Array.from(clearing.values()), specials };
  }

  async function clearCells(cells, message) {
    if (cells.length === 0) return;
    setStatus(message);
    state.score += cells.length * 20 * state.combo;
    const waitMs = cells.reduce((duration, { r, c }) => Math.max(duration, blockClearSpeed(state.board[r][c])), state.clearSpeed);
    render({ clearing: cells });
    await sleep(waitMs);
    cells.forEach(({ r, c }) => {
      if (state.board[r][c] === null) return;
      const type = blockType(logic.colorOf(state.board[r][c]));
      state.roundStats[type.stat] += 1;
      state.board[r][c] = null;
    });
    const collapsed = logic.collapse(state.board, state.colorCount);
    state.board = collapsed.board;
    render({ fallMoves: collapsed.fallMoves, spawnMoves: collapsed.spawnMoves });
    await sleep(state.fallSpeed);
    state.combo++;
  }

  async function activateSpecial(pos) {
    const block = state.board[pos.r][pos.c];
    const cells = cellsForSpecial(pos);
    await clearCells(cells, `啟動「${specialName(block.special)}」特殊方塊，消除 ${cells.length} 個方塊。`);
    await resolveMatches();
  }


  function isLineSpecial(block) {
    return logic.isSpecialBlock(block) && (block.special === logic.SPECIAL_TYPES.LINE_ROW || block.special === logic.SPECIAL_TYPES.LINE_COLUMN);
  }

  function cellsForLineSpecialPair(first, second) {
    const cells = new Map();
    for (let c = 0; c < state.size; c++) cells.set(posKey({ r: first.r, c }), { r: first.r, c });
    for (let r = 0; r < state.size; r++) cells.set(posKey({ r, c: second.c }), { r, c: second.c });
    cells.set(posKey(first), first);
    cells.set(posKey(second), second);
    return Array.from(cells.values());
  }

  async function activateSpecialPair(first, second) {
    const firstBlock = state.board[first.r][first.c];
    const secondBlock = state.board[second.r][second.c];
    const linePair = isLineSpecial(firstBlock) && isLineSpecial(secondBlock);
    const cells = new Map();
    if (linePair) {
      cellsForLineSpecialPair(first, second).forEach(cell => cells.set(posKey(cell), cell));
    } else {
      [first, second].forEach(pos => cellsForSpecial(pos).forEach(cell => cells.set(posKey(cell), cell)));
      cells.set(posKey(first), first);
      cells.set(posKey(second), second);
    }
    const message = linePair
      ? `兩顆四消特殊方塊交換，改為消除 1 條橫列與 1 條直行，共 ${cells.size} 格。`
      : `啟動兩顆特殊方塊，合併消除 ${cells.size} 個方塊並累積效果。`;
    await clearCells(Array.from(cells.values()), message);
    state.lastAction = linePair ? '特殊方塊連鎖：四消 + 四消，消除橫列與直行。' : `特殊方塊連鎖：${specialName(firstBlock.special)} + ${specialName(secondBlock.special)}。`;
    await resolveMatches();
  }

  async function resolveMatches() {
    let result = collectMatchResult();
    while (result.groups.length > 0) {
      const specialText = result.specials.length ? `，產生 ${result.specials.length} 個特殊方塊` : '';
      setStatus(`消除 ${result.clearing.length} 個方塊${specialText}，效果已累積到本輪計時器。`);
      result.specials.forEach(({ r, c, color, special }) => { state.board[r][c] = logic.createSpecialBlock(color, special); });
      await clearCells(result.clearing, `消除 ${result.clearing.length} 個方塊${specialText}，效果已累積到本輪計時器。`);
      result = collectMatchResult();
    }
  }

  function endTurnCheck() {
    if (state.ended) return;
    if (state.score >= state.target) { setStatus('恭喜達成目標分數，也可以繼續打倒敵人。'); return; }
    if (state.moves <= 0) { setStatus('步數用完，請重設再挑戰一次。'); return; }
    if (!logic.findAvailableMove(state.board)) {
      state.board = logic.shuffleBoard(state.board);
      setStatus('棋盤沒有可走步了，已自動重排。');
    } else {
      setStatus('請繼續交換相鄰方塊並累積攻擊、防禦、法術與回血。');
    }
  }

  function showHint() {
    if (state.busy || state.ended) return;
    const move = logic.findAvailableMove(state.board);
    state.hint = move || [];
    setStatus(move ? '已標出一組可交換的方塊。' : '目前無解，已重新排列棋盤。');
    if (!move) state.board = logic.shuffleBoard(state.board);
    render();
  }

  applyDebugOptionVisibility();

  const renderer = window.Match3Renderer.createRenderer({ state, blockType, formatCountdown, countdownProgress, onCellClick: handleCellClick });
  render = renderer.render;
  renderBattleStats = renderer.renderBattleStats;

  const battle = window.Match3Battle.createBattleSystem({ state, render, setStatus, clamp, sleepMsFromSeconds, stopTimers, resetRoundStats, formatNumber });
  playerAttack = battle.playerAttack;
  enemyAttack = battle.enemyAttack;

  ['colorCount', 'boardSize', 'playerMaxHpInput', 'enemyMaxHpInput', 'attackMultiplier', 'defenseMultiplier', 'enemyAttackPower'].forEach(id => $(id).addEventListener('change', resetGame));
  $('fallSpeed').addEventListener('change', e => { state.fallSpeed = Number(e.target.value); render(); });
  $('clearSpeed').addEventListener('change', e => { state.clearSpeed = Number(e.target.value); render(); });
  $('attackInterval').addEventListener('change', resetGame);
  $('enemyInterval').addEventListener('change', resetGame);
  $('resetButton').addEventListener('click', resetGame);
  $('hintButton').addEventListener('click', showHint);
  $('magicButton').addEventListener('click', useMagic);
  resetGame();

  window.Match3Game = { state, resetGame, handleCellClick, resolveMatches, playerAttack, enemyAttack, showDebugOptions };
})();
