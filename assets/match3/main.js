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
  const DEFAULT_BLOCK_WEIGHTS = BLOCK_TYPES.map(type => type.weight);
  const LINEAR_LEVELS = [
    {
      id: 1, name: '史萊姆訓練', type: 'battle', boardSize: 6, colorCount: 3, moves: 15,
      lesson: '教學：消除攻擊方塊來打倒敵人。',
      enemy: { name: '史萊姆', hp: 40, attack: 0, attackInterval: 999 },
      blockWeights: { attack: 45, defense: 25, spell: 15, heal: 15 },
      goalText: '目標：擊敗史萊姆'
    },
    {
      id: 2, name: '骷髏兵來襲', type: 'battle', boardSize: 7, colorCount: 4, moves: 25,
      lesson: '教學：累積防禦，抵擋敵人的明顯攻擊。',
      enemy: { name: '骷髏兵', hp: 90, attack: 16, attackInterval: 4 },
      blockWeights: { attack: 30, defense: 45, spell: 15, heal: 10 },
      goalText: '目標：擊敗骷髏兵'
    },
    {
      id: 3, name: '魔法水晶', type: 'battle', boardSize: 7, colorCount: 4, moves: 25,
      lesson: '教學：累積法術後按下魔法，下一次攻擊會變成 2 倍。',
      enemy: { name: '水晶怪', hp: 140, attack: 8, attackInterval: 6 },
      blockWeights: { attack: 30, defense: 20, spell: 40, heal: 10 },
      goalText: '建議：至少使用 1 次魔法'
    },
    {
      id: 4, name: '毒菇森林', type: 'battle', boardSize: 8, colorCount: 4, moves: 30,
      lesson: '教學：敵人高頻小傷害，回血方塊會變重要。',
      enemy: { name: '毒菇', hp: 120, attack: 7, attackInterval: 2.5 },
      blockWeights: { attack: 30, defense: 20, spell: 15, heal: 35 },
      goalText: '目標：在頻繁攻擊下存活並擊敗毒菇'
    },
    {
      id: 5, name: '石像守衛', type: 'battle', boardSize: 8, colorCount: 5, moves: 30,
      lesson: '教學：高血量敵人，請嘗試 4 消、5 消與特殊方塊。',
      enemy: { name: '石像守衛', hp: 220, attack: 12, attackInterval: 5 },
      blockWeights: { attack: 35, defense: 25, spell: 25, heal: 15, fire: 1 },
      goalText: '建議：製造特殊方塊'
    },
    {
      id: 6, name: '哥布林王', type: 'boss', boardSize: 8, colorCount: 5, moves: 35,
      lesson: 'Boss：血量降低後攻擊節奏會變快。',
      enemy: { name: '哥布林王', hp: 300, attack: 15, attackInterval: 5 },
      phases: [
        { hpBelowPercent: 70, enemyAttackInterval: 4, message: 'Boss 進入第二階段：攻擊速度變快！' },
        { hpBelowPercent: 40, enemyAttackInterval: 3, message: 'Boss 進入狂暴階段：攻擊速度大幅提升！' }
      ],
      blockWeights: { attack: 35, defense: 30, spell: 20, heal: 15, fire: 1 },
      goalText: '目標：擊敗哥布林王'
    }
  ];

  const EQUIPMENT_SHOP = [
    { slot: 'weapon', name: '鐵劍', attack: 0.4, price: 20 },
    { slot: 'armor', name: '鎖子甲', defense: 0.5, price: 20 },
    { slot: 'charm', name: '生命護符', hp: 25, price: 18 },
  ];

  function equipmentTotals() {
    return Object.values(state.run.equipment).reduce((total, item) => ({
      hp: total.hp + (item.hp || 0),
      attack: total.attack + (item.attack || 0),
      defense: total.defense + (item.defense || 0),
    }), { hp: 0, attack: 0, defense: 0 });
  }

  function heroDerivedStats() {
    const gear = equipmentTotals();
    return {
      maxHp: 100 + state.run.character.maxHpBonus + gear.hp,
      attackMultiplier: 1 + state.run.character.attackBonus + gear.attack,
      defenseMultiplier: 1 + state.run.character.defenseBonus + gear.defense,
    };
  }

  function levelToNode(level) {
    const levelConfig = LINEAR_LEVELS[level - 1] || LINEAR_LEVELS[0];
    return { ...levelConfig, enemy: { ...levelConfig.enemy }, phases: (levelConfig.phases || []).map(phase => ({ ...phase })), activePhaseIndex: -1 };
  }

  function createRoute() {
    state.run.totalLevels = LINEAR_LEVELS.length;
    state.run.route = LINEAR_LEVELS.map(level => levelToNode(level.id));
    state.run.level = 1;
    state.run.completed = false;
    state.run.currentNode = state.run.route[0];
  }

  function readNumberInput(id, fallback, { min = -Infinity, max = Infinity } = {}) {
    const raw = $(id).value;
    const value = raw === '' || raw === null || raw === undefined ? NaN : Number(raw);
    const safe = Number.isFinite(value) ? value : fallback;
    return clamp(safe, min, max);
  }

  function readIntegerInput(id, fallback, range) {
    return Math.round(readNumberInput(id, fallback, range));
  }

  function formatCountdown(target, fallbackSeconds = null) {
    if (!target || state.ended) return fallbackSeconds === null ? '--' : `${Number(fallbackSeconds).toFixed(1)}s`;
    return `${Math.max(0, (target - Date.now()) / 1000).toFixed(1)}s`;
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

  function maybeTriggerPlayerAttack() {
    if (state.ended || state.busy) return false;
    if (state.roundStats.attack < (state.playerAttackThreshold || 10)) return false;
    return playerAttack();
  }

  function beginPlayerOperation() {
    state.currentTurnCombo = 0;
  }

  function finishPlayerOperation() {
    state.lastComboCount = state.currentTurnCombo;
    state.currentTurnCombo = 0;
  }

  function posKey(pos) { return `${pos.r},${pos.c}`; }
  function isLocked(pos) { return state.lockedCells.includes(posKey(pos)); }
  function setLockedCells(cells) { state.lockedCells = Array.from(new Set(cells.map(posKey))); }
  function unlockCells(cells) {
    if (!state.lockedCells.length || !cells.length) return 0;
    const unlock = new Set(cells.map(posKey));
    const before = state.lockedCells.length;
    state.lockedCells = state.lockedCells.filter(key => !unlock.has(key));
    return before - state.lockedCells.length;
  }
  function adjacentCells(pos) {
    return [{ r: pos.r - 1, c: pos.c }, { r: pos.r + 1, c: pos.c }, { r: pos.r, c: pos.c - 1 }, { r: pos.r, c: pos.c + 1 }]
      .filter(cell => cell.r >= 0 && cell.c >= 0 && cell.r < state.size && cell.c < state.size);
  }
  function unlockAround(cells) {
    const targets = [];
    cells.forEach(cell => adjacentCells(cell).forEach(next => targets.push(next)));
    return unlockCells(targets);
  }
  function findAvailableUnlockedMove() {
    for (let r = 0; r < state.size; r++) {
      for (let c = 0; c < state.size; c++) {
        const first = { r, c };
        if (isLocked(first)) continue;
        for (const second of [{ r: r + 1, c }, { r, c: c + 1 }]) {
          if (second.r >= state.size || second.c >= state.size || isLocked(second)) continue;
          if (logic.findMatches(logic.swap(state.board, first, second)).length > 0) return [first, second];
        }
      }
    }
    return null;
  }

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


  function applyLevelBlockWeights(node) {
    const weights = node && node.blockWeights ? node.blockWeights : null;
    BLOCK_TYPES.forEach((type, index) => { type.weight = DEFAULT_BLOCK_WEIGHTS[index]; });
    if (!weights) return;
    const order = ['attack', 'defense', 'spell', 'heal', 'fire', 'nature', 'star'];
    order.forEach((key, index) => {
      if (weights[key] !== undefined && BLOCK_TYPES[index]) BLOCK_TYPES[index].weight = weights[key];
    });
  }

  function applyBossPhaseIfNeeded() {
    const node = state.run.currentNode;
    if (!node || node.type !== 'boss' || !Array.isArray(node.phases) || state.ended) return;
    const hpPercent = state.enemyMaxHp > 0 ? (state.enemyHp / state.enemyMaxHp) * 100 : 0;
    node.phases.forEach((phase, index) => {
      if (index <= node.activePhaseIndex || hpPercent >= phase.hpBelowPercent) return;
      node.activePhaseIndex = index;
      state.enemyInterval = phase.enemyAttackInterval;
      if (state.startedAt) {
        clearInterval(state.enemyTimerId);
        state.enemyTimerId = setInterval(enemyAttack, sleepMsFromSeconds(state.enemyInterval));
        state.nextEnemyAttackAt = Date.now() + sleepMsFromSeconds(state.enemyInterval);
      }
      state.lastAction = phase.message;
      setStatus(phase.message);
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
    $('playerAttackCountdown').textContent = state.roundStats.attack >= (state.playerAttackThreshold || 10) ? '準備攻擊' : `${formatNumber(state.roundStats.attack)} / ${formatNumber(state.playerAttackThreshold || 10)}`;
    $('enemyAttackCountdown').textContent = formatCountdown(state.nextEnemyAttackAt, state.enemyInterval);
    renderBattleStats();
  }

  function startTimers() {
    if (state.startedAt || state.ended) return;
    state.startedAt = Date.now();
    state.nextPlayerAttackAt = null;
    state.nextEnemyAttackAt = Date.now() + sleepMsFromSeconds(state.enemyInterval);
    state.timerId = setInterval(updateTimer, 100);
    state.attackTimerId = null;
    state.enemyTimerId = setInterval(enemyAttack, sleepMsFromSeconds(state.enemyInterval));
  }

  function stopTimers() {
    clearInterval(state.timerId); clearInterval(state.attackTimerId); clearInterval(state.enemyTimerId);
  }

  function startNode(level = state.run.level) {
    stopTimers();
    state.run.level = level;
    state.run.currentNode = state.run.route[level - 1] || levelToNode(level);
    resetGame();
    const node = state.run.currentNode;
    setStatus(`第 ${state.run.level} 關「${node.name}」：${node.lesson} ${node.goalText}。`);
  }

  function resetGame() {
    stopTimers();
    const node = state.run.currentNode || levelToNode(1);
    const size = node.boardSize || readIntegerInput('boardSize', state.size || 8, { min: 3, max: 12 });
    const colorCount = node.colorCount || readIntegerInput('colorCount', state.colorCount || 4, { min: 3, max: BLOCK_TYPES.length });
    const hero = heroDerivedStats();
    const playerMaxHp = readIntegerInput('playerMaxHpInput', hero.maxHp, { min: 1, max: 9999 }) + hero.maxHp - 100;
    const enemyMaxHp = node.enemy ? node.enemy.hp : readIntegerInput('enemyMaxHpInput', state.enemyMaxHp || 100, { min: 1, max: 9999 });
    applyLevelBlockWeights(node);
    Object.assign(state, { size, colorCount, fallSpeed: readNumberInput('fallSpeed', state.fallSpeed || 420, { min: 1, max: 5000 }), clearSpeed: readNumberInput('clearSpeed', state.clearSpeed || 260, { min: 1, max: 5000 }), attackInterval: readNumberInput('attackInterval', state.attackInterval || 5, { min: 1, max: 3600 }), enemyInterval: node.enemy ? node.enemy.attackInterval : readNumberInput('enemyInterval', state.enemyInterval || 5, { min: 1, max: 3600 }), attackMultiplier: hero.attackMultiplier, defenseMultiplier: hero.defenseMultiplier, enemyAttackPower: node.enemy ? node.enemy.attack : readNumberInput('enemyAttackPower', state.enemyAttackPower || 10, { min: 0, max: 9999 }), selected: null, busy: false, score: 0, moves: node.moves || 30, combo: 1, currentTurnCombo: 0, lastComboCount: 0, playerAttackThreshold: 10, startedAt: null, timerId: null, attackTimerId: null, enemyTimerId: null, hint: [], playerHp: playerMaxHp, enemyHp: enemyMaxHp, playerMaxHp, enemyMaxHp, nextPlayerAttackAt: null, nextEnemyAttackAt: null, lastAction: '交換方塊後，敵方攻擊計時器會開始；我方累積 10 個攻擊方塊後出手。', heroAction: false, enemyAction: false, damagePopups: [], ended: false, magicArmed: false, lockedCells: [] });
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
    if (isLocked(pos)) { setStatus('這個方塊被敵人封鎖，需用特殊方塊或消除旁邊方塊解除。'); return; }
    if (!state.selected && logic.isSpecialBlock(clickedBlock)) {
      startTimers();
      beginPlayerOperation();
      state.busy = true;
      state.moves--;
      await activateSpecial(pos);
      finishPlayerOperation();
      state.combo = 1;
      state.busy = false;
      maybeTriggerPlayerAttack();
      endTurnCheck();
      render();
      return;
    }
    if (!state.selected) { state.selected = pos; render(); return; }
    if (!logic.areAdjacent(state.selected, pos)) { state.selected = pos; render(); return; }
    if (isLocked(state.selected) || isLocked(pos)) { state.selected = null; setStatus('被封鎖的方塊不能交換。'); render(); return; }

    const selectedBlock = state.board[state.selected.r][state.selected.c];
    if (logic.isSpecialBlock(selectedBlock) && logic.isSpecialBlock(clickedBlock)) {
      startTimers();
      beginPlayerOperation();
      state.busy = true;
      state.moves--;
      await activateSpecialPair(state.selected, pos);
      state.selected = null;
      finishPlayerOperation();
      state.combo = 1;
      state.busy = false;
      maybeTriggerPlayerAttack();
      endTurnCheck();
      render();
      return;
    }

    startTimers();
    beginPlayerOperation();
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
      finishPlayerOperation();
      state.combo = 1;
      state.busy = false;
      maybeTriggerPlayerAttack();
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
    const lockedBeforeClear = new Set(state.lockedCells || []);
    const unlockedBySpecial = unlockCells(cells);
    cells.forEach(({ r, c }) => {
      if (state.board[r][c] === null || lockedBeforeClear.has(posKey({ r, c }))) return;
      const type = blockType(logic.colorOf(state.board[r][c]));
      state.roundStats[type.stat] += 1;
      state.board[r][c] = null;
    });
    const unlockedAround = unlockAround(cells);
    if (unlockedBySpecial + unlockedAround > 0) state.lastAction = `解除 ${unlockedBySpecial + unlockedAround} 個封鎖方塊。`;
    const collapsed = logic.collapse(state.board, state.colorCount);
    state.board = collapsed.board;
    render({ fallMoves: collapsed.fallMoves, spawnMoves: collapsed.spawnMoves });
    await sleep(state.fallSpeed);
    state.currentTurnCombo++;
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
      setStatus(`消除 ${result.clearing.length} 個方塊${specialText}，效果已累積到本輪攻擊。`);
      result.specials.forEach(({ r, c, color, special }) => { state.board[r][c] = logic.createSpecialBlock(color, special); });
      await clearCells(result.clearing, `消除 ${result.clearing.length} 個方塊${specialText}，效果已累積到本輪攻擊。`);
      result = collectMatchResult();
    }
  }

  function endTurnCheck() {
    if (state.ended) return;
    if (state.moves <= 0) { setStatus('步數用完，請重設再挑戰一次。'); return; }
    if (!findAvailableUnlockedMove()) {
      state.board = logic.shuffleBoard(state.board);
      setStatus('棋盤沒有可走步了，已自動重排。');
    } else {
      setStatus('請繼續交換相鄰方塊；攻擊累積滿 10 個方塊後才會出手。');
    }
  }

  function completeNode() {
    stopTimers();
    state.run.gold += state.run.currentNode.type === 'battle' || state.run.currentNode.type === 'boss' ? 15 + state.run.level * 5 : 0;
    if (state.run.level >= state.run.totalLevels) {
      state.run.completed = true;
      state.ended = true;
      setStatus('恭喜通關 6 關 Demo！可以重新挑戰線性冒險。');
      render();
      return;
    }
    startNode(state.run.level + 1);
  }

  function buyEquipment(index) {
    const item = EQUIPMENT_SHOP[index];
    if (!item || state.run.gold < item.price) return;
    state.run.gold -= item.price;
    state.run.equipment[item.slot] = item;
    setStatus(`購買並裝備 ${item.name}。`);
    render();
  }

  function restUpgrade() {
    state.run.character.level++;
    state.run.character.maxHpBonus += 20;
    state.run.character.attackBonus += 0.1;
    state.playerHp = heroDerivedStats().maxHp;
    setStatus('營火休息：角色升級，生命與攻擊提升。');
    render();
  }

  function newRun() {
    state.run = window.Match3State.createRunState();
    createRoute();
    startNode(1);
  }

  function showHint() {
    if (state.busy || state.ended) return;
    const move = findAvailableUnlockedMove();
    state.hint = move || [];
    setStatus(move ? '已標出一組可交換的方塊。' : '目前無解，已重新排列棋盤。');
    if (!move) state.board = logic.shuffleBoard(state.board);
    render();
  }

  applyDebugOptionVisibility();

  createRoute();

  const renderer = window.Match3Renderer.createRenderer({ state, blockType, formatCountdown, countdownProgress, onCellClick: handleCellClick, onNextNode: completeNode, onBuyEquipment: buyEquipment, onRestUpgrade: restUpgrade, onNewRun: newRun, equipmentShop: EQUIPMENT_SHOP });
  render = renderer.render;
  renderBattleStats = renderer.renderBattleStats;

  function onEnemyBoardLock() {
    if (state.ended || !state.board.length) return;
    const candidates = [];
    state.board.forEach((row, r) => row.forEach((value, c) => {
      const pos = { r, c };
      if (value !== null && !isLocked(pos) && !logic.isSpecialBlock(value)) candidates.push(pos);
    }));
    const count = Math.min(3, Math.max(1, Math.floor(state.size / 3)), candidates.length);
    const picked = [];
    while (picked.length < count && candidates.length) {
      const index = Math.floor(Math.random() * candidates.length);
      picked.push(candidates.splice(index, 1)[0]);
    }
    setLockedCells([...state.lockedCells.map(key => { const [r, c] = key.split(',').map(Number); return { r, c }; }), ...picked]);
    if (!findAvailableUnlockedMove()) {
      unlockCells(picked);
      state.lastAction += ' 敵人想封鎖版面，但保留至少一組可走步。';
    } else if (picked.length) {
      state.lastAction += ` 敵人封鎖 ${picked.length} 個方塊，可用特殊方塊或消除旁邊方塊解除。`;
    }
    render();
  }

  const battle = window.Match3Battle.createBattleSystem({ state, render, setStatus, clamp, sleepMsFromSeconds, stopTimers, resetRoundStats, formatNumber, onBattleWin: completeNode, onAfterPlayerAttack: applyBossPhaseIfNeeded, onEnemyBoardLock });
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
  startNode(1);

  window.Match3Game = { state, resetGame, handleCellClick, resolveMatches, playerAttack, enemyAttack, showDebugOptions, completeNode, newRun };
})();
