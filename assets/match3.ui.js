(function () {
  const BLOCK_TYPES = [
    { name: '攻擊', icon: '⚔', color: '#FF6663', stat: 'attack' },
    { name: '防禦', icon: '🛡', color: '#60A5FA', stat: 'defense' },
    { name: '法術', icon: '✦', color: '#A78BFA', stat: 'spell' },
    { name: '回血', icon: '❤', color: '#34D399', stat: 'heal' },
    { name: '火焰', icon: '🔥', color: '#FEB144', stat: 'attack' },
    { name: '自然', icon: '☘', color: '#9EE09E', stat: 'heal' },
    { name: '星光', icon: '★', color: '#FDE68A', stat: 'spell' }
  ];
  const logic = window.Match3Logic;
  const $ = id => document.getElementById(id);
  const DEFAULT_HP = 10;
  const ENEMY_ATTACK = 10;
  const state = {
    board: [], size: 8, colorCount: 4, fallSpeed: 420, clearSpeed: 260,
    selected: null, busy: false, score: 0, moves: 30, target: 1200, combo: 1,
    startedAt: null, timerId: null, attackTimerId: null, enemyTimerId: null,
    hint: [], playerHp: DEFAULT_HP, enemyHp: DEFAULT_HP, maxHp: DEFAULT_HP,
    attackInterval: 5, enemyInterval: 5, nextPlayerAttackAt: null, nextEnemyAttackAt: null,
    roundStats: { attack: 0, defense: 0, spell: 0, heal: 0 },
    lastAction: '尚未攻擊。', heroAction: false, enemyAction: false, ended: false, magicArmed: false
  };

  function key(pos) { return `${pos.r},${pos.c}`; }
  function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function blockType(value) { return BLOCK_TYPES[value % BLOCK_TYPES.length]; }
  function sleepMsFromSeconds(seconds) { return Math.max(1, Number(seconds)) * 1000; }
  function cellPixels() {
    const root = getComputedStyle(document.documentElement);
    return parseFloat(root.getPropertyValue('--cell-size')) + parseFloat(root.getPropertyValue('--gap'));
  }

  function render(options = {}) {
    const clearing = new Set((options.clearing || []).map(key));
    const falling = new Map((options.fallMoves || []).map(move => [key(move.to), move.distance]));
    const spawning = new Map((options.spawnMoves || []).map(move => [key(move.to), move.distance]));
    const hint = new Set(state.hint.map(key));
    const boardEl = $('board');
    boardEl.style.setProperty('--board-size', state.size);
    boardEl.style.setProperty('--fall-duration', `${state.fallSpeed}ms`);
    boardEl.style.setProperty('--clear-duration', `${state.clearSpeed}ms`);
    boardEl.innerHTML = '';

    state.board.forEach((row, r) => row.forEach((value, c) => {
      const pos = { r, c };
      const div = document.createElement('button');
      div.type = 'button';
      div.className = 'cell';
      div.setAttribute('aria-label', `第 ${r + 1} 列第 ${c + 1} 欄`);
      if (value === null) div.classList.add('empty');
      else {
        const type = blockType(value);
        div.style.background = type.color;
        div.dataset.type = type.stat;
        div.innerHTML = `<span class="cell-icon" aria-hidden="true">${type.icon}</span>`;
        div.title = type.name;
        div.addEventListener('click', () => handleCellClick(pos));
      }
      if (state.selected && state.selected.r === r && state.selected.c === c) div.classList.add('selected');
      if (clearing.has(key(pos))) div.classList.add('clearing');
      if (falling.has(key(pos))) {
        div.classList.add('falling');
        div.style.setProperty('--from-y', `${-falling.get(key(pos)) * cellPixels()}px`);
      }
      if (spawning.has(key(pos))) {
        div.classList.add('spawning');
        div.style.setProperty('--from-y', `${-(spawning.get(key(pos)) + 1) * cellPixels()}px`);
      }
      if (hint.has(key(pos))) div.classList.add('hint');
      boardEl.appendChild(div);
    }));

    $('score').textContent = state.score;
    $('moves').textContent = state.moves;
    $('target').textContent = state.target;
    $('combo').textContent = `x${state.combo}`;
    $('playerHp').textContent = `${state.playerHp}/${state.maxHp}`;
    $('enemyHp').textContent = `${state.enemyHp}/${state.maxHp}`;
    $('playerAttackCountdown').textContent = formatCountdown(state.nextPlayerAttackAt);
    $('enemyAttackCountdown').textContent = formatCountdown(state.nextEnemyAttackAt);
    $('roundAttack').textContent = state.roundStats.attack;
    $('roundDefense').textContent = state.roundStats.defense;
    $('roundSpell').textContent = state.roundStats.spell;
    $('roundHeal').textContent = state.roundStats.heal;
    $('battleLog').textContent = state.lastAction;
    $('heroSprite').classList.toggle('attacking', state.heroAction);
    $('enemySprite').classList.toggle('attacking', state.enemyAction);
    $('hintButton').disabled = state.busy || state.ended;
    $('resetButton').disabled = state.busy;
    renderBattleStats();
  }

  function formatCountdown(target) {
    if (!target || state.ended) return '--';
    return `${Math.max(0, Math.ceil((target - Date.now()) / 1000))}s`;
  }
  function setStatus(text) { $('status').textContent = text; }
  function setBar(id, value, max = 100) {
    $(id).style.width = `${clamp(value, 0, max) / max * 100}%`;
  }

  function countdownProgress(target, intervalSeconds) {
    if (!target || state.ended) return 0;
    const total = sleepMsFromSeconds(intervalSeconds);
    const remaining = clamp(target - Date.now(), 0, total);
    return total ? (total - remaining) / total * 100 : 0;
  }

  function renderBattleStats() {
    const attack = clamp(state.roundStats.attack * 10, 0, 100);
    const defense = clamp(state.roundStats.defense * 10, 0, 100);
    const magic = clamp(state.roundStats.spell * 10, 0, 100);

    $('attackTimer').textContent = formatCountdown(state.nextPlayerAttackAt) === '--' ? `${state.attackInterval}.0s` : formatCountdown(state.nextPlayerAttackAt);
    $('playerHpText').textContent = `${state.playerHp} / ${state.maxHp}`;
    $('enemyHpText').textContent = `${state.enemyHp} / ${state.maxHp}`;
    setBar('playerHpBar', state.playerHp, state.maxHp);
    setBar('enemyHpBar', state.enemyHp, state.maxHp);
    setBar('playerAttackBar', countdownProgress(state.nextPlayerAttackAt, state.attackInterval));
    setBar('enemyAttackBar', countdownProgress(state.nextEnemyAttackAt, state.enemyInterval));
    $('attackValue').textContent = `${attack} / 100`;
    $('defenseValue').textContent = `${defense} / 100`;
    $('magicValue').textContent = `${magic} / 100`;
    setBar('attackMeter', attack);
    setBar('defenseMeter', defense);
    setBar('magicMeter', magic);
    $('magicButton').disabled = state.ended || state.magicArmed || state.roundStats.spell < 5;
    $('magicButton').textContent = state.magicArmed ? '魔法已準備：下次攻擊 x2' : '使用魔法（消耗 5 法術，下次攻擊 x2）';
  }

  function updateAttackTimer() {
    renderBattleStats();
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
    render();
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

  function resetRoundStats() { state.roundStats = { attack: 0, defense: 0, spell: 0, heal: 0 }; }

  function accumulateBlockEffect(value) {
    if (value === null) return;
    const type = blockType(value);
    state.roundStats[type.stat] += 1;
  }

  function resetGame() {
    stopTimers();
    Object.assign(state, { size: Number($('boardSize').value), colorCount: Number($('colorCount').value), fallSpeed: Number($('fallSpeed').value), clearSpeed: Number($('clearSpeed').value), attackInterval: Number($('attackInterval').value), enemyInterval: Number($('enemyInterval').value), selected: null, busy: false, score: 0, moves: 30, target: Number($('boardSize').value) * 150, combo: 1, startedAt: null, timerId: null, attackTimerId: null, enemyTimerId: null, hint: [], playerHp: DEFAULT_HP, enemyHp: DEFAULT_HP, maxHp: DEFAULT_HP, nextPlayerAttackAt: null, nextEnemyAttackAt: null, lastAction: '交換方塊後，雙方攻擊計時器會開始。', heroAction: false, enemyAction: false, ended: false, magicArmed: false });
    resetRoundStats();
    state.board = logic.createBoard(state.size, state.colorCount);
    updateTimer();
    updateAttackTimer();
    setStatus('請交換相鄰方塊開始遊戲。');
    render();
  }

  async function handleCellClick(pos) {
    if (state.busy || state.moves <= 0 || state.ended) return;
    state.hint = [];
    if (!state.selected) { state.selected = pos; render(); return; }
    if (!logic.areAdjacent(state.selected, pos)) { state.selected = pos; render(); return; }

    startTimers();
    state.busy = true;
    const previous = state.board;
    state.board = logic.swap(state.board, state.selected, pos);
    state.selected = null;
    state.moves--;
    render();
    await sleep(120);

    if (logic.findMatches(state.board).length === 0) {
      state.board = previous;
      setStatus('這一步沒有形成三消，已幫你換回來。');
      state.busy = false;
      render();
      return;
    }

    await resolveMatches();
    state.busy = false;
    state.combo = 1;
    endTurnCheck();
    render();
  }

  async function resolveMatches() {
    let matches = logic.findMatches(state.board);
    while (matches.length > 0) {
      setStatus(`消除 ${matches.length} 個方塊，效果已累積到本輪計時器。`);
      state.score += matches.length * 20 * state.combo;
      matches.forEach(({ r, c }) => accumulateBlockEffect(state.board[r][c]));
      render({ clearing: matches });
      await sleep(state.clearSpeed);
      matches.forEach(({ r, c }) => { state.board[r][c] = null; });
      const collapsed = logic.collapse(state.board, state.colorCount);
      state.board = collapsed.board;
      render({ fallMoves: collapsed.fallMoves, spawnMoves: collapsed.spawnMoves });
      await sleep(state.fallSpeed);
      state.combo++;
      matches = logic.findMatches(state.board);
    }
  }

  function flashActor(actor) {
    if (actor === 'hero') state.heroAction = true;
    else state.enemyAction = true;
    render();
    setTimeout(() => { if (actor === 'hero') state.heroAction = false; else state.enemyAction = false; render(); }, 550);
  }

  function playerAttack() {
    if (state.ended) return;
    const baseDamage = state.roundStats.attack + (state.roundStats.spell * 2);
    const damage = state.magicArmed ? baseDamage * 2 : baseDamage;
    const heal = state.roundStats.heal;
    state.enemyHp = clamp(state.enemyHp - damage, 0, state.maxHp);
    state.playerHp = clamp(state.playerHp + heal, 0, state.maxHp);
    state.lastAction = `我方攻擊造成 ${damage} 傷害${state.magicArmed ? '（魔法 x2）' : ''}，回血 ${heal}。防禦會保留到敵方攻擊結算。`;
    state.roundStats.attack = 0;
    state.roundStats.spell = 0;
    state.roundStats.heal = 0;
    state.magicArmed = false;
    state.nextPlayerAttackAt = Date.now() + sleepMsFromSeconds(state.attackInterval);
    flashActor('hero');
    checkBattleEnd();
  }

  function enemyAttack() {
    if (state.ended) return;
    const blocked = Math.min(ENEMY_ATTACK, state.roundStats.defense);
    const damage = ENEMY_ATTACK - blocked;
    state.playerHp = clamp(state.playerHp - damage, 0, state.maxHp);
    state.lastAction = `敵方攻擊 ${ENEMY_ATTACK}，防禦方塊抵擋 ${blocked}，我方受到 ${damage} 傷害。`;
    resetRoundStats();
    state.nextEnemyAttackAt = Date.now() + sleepMsFromSeconds(state.enemyInterval);
    flashActor('enemy');
    checkBattleEnd();
  }

  function checkBattleEnd() {
    if (state.enemyHp <= 0) { state.ended = true; stopTimers(); setStatus('勝利！敵方血量歸零。'); }
    if (state.playerHp <= 0) { state.ended = true; stopTimers(); setStatus('失敗！我方血量歸零。'); }
    render();
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

  ['colorCount', 'boardSize'].forEach(id => $(id).addEventListener('change', resetGame));
  $('fallSpeed').addEventListener('change', e => { state.fallSpeed = Number(e.target.value); render(); });
  $('clearSpeed').addEventListener('change', e => { state.clearSpeed = Number(e.target.value); render(); });
  $('attackInterval').addEventListener('change', resetGame);
  $('enemyInterval').addEventListener('change', resetGame);
  $('resetButton').addEventListener('click', resetGame);
  $('hintButton').addEventListener('click', showHint);
  $('magicButton').addEventListener('click', useMagic);
  resetGame();
})();
