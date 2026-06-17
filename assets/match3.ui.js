(function () {
  const COLORS = ['#FF6663', '#FEB144', '#9EE09E', '#9EC1CF', '#CC99C9', '#B5EAD7', '#C7CEEA'];
  const logic = window.Match3Logic;
  const $ = id => document.getElementById(id);
  const state = { board: [], size: 8, colorCount: 4, fallSpeed: 420, clearSpeed: 260, attackInterval: 5000, attackTimerId: null, nextAttackAt: null, pendingAttack: 0, pendingDefense: 0, pendingMagic: 0, pendingHeal: 0, playerHp: 100, enemyHp: 100, maxHp: 100, magicArmed: false, battleEnded: false, selected: null, busy: false, score: 0, moves: 30, target: 1200, combo: 1, startedAt: null, timerId: null, hint: [] };

  function key(pos) { return `${pos.r},${pos.c}`; }
  function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
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
        div.style.background = COLORS[value];
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
    $('hintButton').disabled = state.busy || state.battleEnded;
    $('resetButton').disabled = state.busy;
    renderBattleStats();
  }

  function setStatus(text) { $('status').textContent = text; }
  function setBar(id, value, max = 100) {
    $(id).style.width = `${clamp(value, 0, max) / max * 100}%`;
  }

  function renderBattleStats() {
    const attack = clamp(state.pendingAttack, 0, 100);
    const defense = clamp(state.pendingDefense, 0, 100);
    const magic = clamp(state.pendingMagic, 0, 100);
    const remaining = state.nextAttackAt ? clamp(state.nextAttackAt - Date.now(), 0, state.attackInterval) : state.attackInterval;
    const countdownPercent = state.attackInterval ? (state.attackInterval - remaining) / state.attackInterval * 100 : 0;

    $('playerHpText').textContent = `${state.playerHp} / ${state.maxHp}`;
    $('enemyHpText').textContent = `${state.enemyHp} / ${state.maxHp}`;
    setBar('playerHpBar', state.playerHp, state.maxHp);
    setBar('enemyHpBar', state.enemyHp, state.maxHp);
    setBar('playerAttackBar', countdownPercent);
    setBar('enemyAttackBar', countdownPercent);
    $('attackValue').textContent = `${attack} / 100`;
    $('defenseValue').textContent = `${defense} / 100`;
    $('magicValue').textContent = `${magic} / 100`;
    setBar('attackMeter', attack);
    setBar('defenseMeter', defense);
    setBar('magicMeter', magic);
    $('magicButton').disabled = state.battleEnded || state.magicArmed || state.pendingMagic < 50;
    $('magicButton').textContent = state.magicArmed ? '魔法已準備：下次攻擊 x2' : '使用魔法（下次攻擊 x2）';
  }

  function updateTimer() {
    if (!state.startedAt) { $('timer').textContent = '00:00'; return; }
    const sec = Math.floor((Date.now() - state.startedAt) / 1000);
    $('timer').textContent = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
  }
  function startTimer() {
    if (state.startedAt) return;
    state.startedAt = Date.now();
    state.timerId = setInterval(updateTimer, 1000);
    startBattleTimers();
  }

  function startBattleTimers() {
    clearInterval(state.attackTimerId);
    state.nextAttackAt = Date.now() + state.attackInterval;
    updateAttackTimer();
    state.attackTimerId = setInterval(updateAttackTimer, 100);
  }

  function updateAttackTimer() {
    if (!state.nextAttackAt) {
      $('attackTimer').textContent = `${(state.attackInterval / 1000).toFixed(1)}s`;
      renderBattleStats();
      return;
    }
    const remaining = Math.max(0, state.nextAttackAt - Date.now());
    $('attackTimer').textContent = `${(remaining / 1000).toFixed(1)}s`;
    renderBattleStats();
    if (remaining <= 0) resolvePlayerAttack();
  }

  function resolvePlayerAttack() {
    if (state.battleEnded) return;

    const attack = clamp(state.pendingAttack, 0, 100);
    const defense = clamp(state.pendingDefense, 0, 100);
    const heal = state.pendingHeal;
    const multiplier = state.magicArmed ? 2 : 1;
    const playerDamage = attack * multiplier;
    const enemyBaseDamage = 10;
    const enemyDamage = clamp(enemyBaseDamage - Math.floor(defense / 10), 0, enemyBaseDamage);

    state.enemyHp = clamp(state.enemyHp - playerDamage, 0, state.maxHp);
    state.playerHp = clamp(state.playerHp + heal - enemyDamage, 0, state.maxHp);
    state.score += playerDamage * 10;

    const magicText = state.magicArmed ? '，魔法加成已觸發（攻擊 x2）' : '';
    setStatus(`回合結算：你造成 ${playerDamage} 傷害${magicText}，敵人造成 ${enemyDamage} 傷害。`);

    state.pendingAttack = 0;
    state.pendingDefense = 0;
    state.pendingHeal = 0;
    state.magicArmed = false;

    if (state.enemyHp <= 0 || state.playerHp <= 0) {
      endBattle(state.enemyHp <= 0 ? '恭喜勝利！敵方生命值歸 0。' : '挑戰失敗！玩家生命值歸 0。');
      render();
      return;
    }

    state.nextAttackAt = Date.now() + state.attackInterval;
    render();
  }

  function endBattle(message) {
    state.battleEnded = true;
    clearInterval(state.attackTimerId);
    state.attackTimerId = null;
    state.nextAttackAt = null;
    $('attackTimer').textContent = '停止';
    setStatus(message);
  }

  function useMagic() {
    if (state.battleEnded || state.magicArmed || state.pendingMagic < 50) return;
    state.pendingMagic -= 50;
    state.magicArmed = true;
    setStatus('已使用魔法：下次攻擊傷害 x2。');
    renderBattleStats();
  }

  function resetGame() {
    clearInterval(state.timerId);
    clearInterval(state.attackTimerId);
    Object.assign(state, { size: Number($('boardSize').value), colorCount: Number($('colorCount').value), fallSpeed: Number($('fallSpeed').value), clearSpeed: Number($('clearSpeed').value), attackInterval: Number($('attackInterval').value), attackTimerId: null, nextAttackAt: null, pendingAttack: 0, pendingDefense: 0, pendingMagic: 0, pendingHeal: 0, playerHp: 100, enemyHp: 100, maxHp: 100, magicArmed: false, battleEnded: false, selected: null, busy: false, score: 0, moves: 30, target: Number($('boardSize').value) * 150, combo: 1, startedAt: null, timerId: null, hint: [] });
    state.board = logic.createBoard(state.size, state.colorCount);
    updateTimer();
    updateAttackTimer();
    setStatus('請交換相鄰方塊開始遊戲。');
    render();
  }

  async function handleCellClick(pos) {
    if (state.busy || state.moves <= 0 || state.battleEnded) return;
    state.hint = [];
    if (!state.selected) { state.selected = pos; render(); return; }
    if (!logic.areAdjacent(state.selected, pos)) { state.selected = pos; render(); return; }

    startTimer();
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
      setStatus(`消除 ${matches.length} 個方塊！`);
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

  function accumulateBlockEffect(value) {
    if (value === 0) state.pendingAttack = clamp(state.pendingAttack + 10, 0, 100);
    else if (value === 1) state.pendingDefense = clamp(state.pendingDefense + 10, 0, 100);
    else if (value === 2) state.pendingMagic = clamp(state.pendingMagic + 10, 0, 100);
    else if (value === 3) state.pendingHeal = clamp(state.pendingHeal + 5, 0, 100);
    else state.pendingAttack = clamp(state.pendingAttack + 10, 0, 100);
  }

  function endTurnCheck() {
    if (state.battleEnded) return;
    if (state.score >= state.target) { setStatus('恭喜過關！你達成目標分數了。'); return; }
    if (state.moves <= 0) { setStatus('步數用完，請重設再挑戰一次。'); return; }
    if (!logic.findAvailableMove(state.board)) {
      state.board = logic.shuffleBoard(state.board);
      setStatus('棋盤沒有可走步了，已自動重排。');
    } else {
      setStatus('請繼續交換相鄰方塊。');
    }
  }

  function showHint() {
    if (state.busy || state.battleEnded) return;
    const move = logic.findAvailableMove(state.board);
    state.hint = move || [];
    setStatus(move ? '已標出一組可交換的方塊。' : '目前無解，已重新排列棋盤。');
    if (!move) state.board = logic.shuffleBoard(state.board);
    render();
  }

  ['colorCount', 'boardSize'].forEach(id => $(id).addEventListener('change', resetGame));
  $('fallSpeed').addEventListener('change', e => { state.fallSpeed = Number(e.target.value); render(); });
  $('clearSpeed').addEventListener('change', e => { state.clearSpeed = Number(e.target.value); render(); });
  $('attackInterval').addEventListener('change', e => {
    state.attackInterval = Number(e.target.value);
    if (state.nextAttackAt) startBattleTimers();
    else updateAttackTimer();
  });
  $('resetButton').addEventListener('click', resetGame);
  $('hintButton').addEventListener('click', showHint);
  $('magicButton').addEventListener('click', useMagic);
  resetGame();
})();
