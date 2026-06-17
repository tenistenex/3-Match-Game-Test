(function () {
  const logic = window.Match3Logic;
  const { blockType } = window.Match3Config;
  const { createState, resetRoundStats } = window.Match3State;
  const { $, clamp, setStatus } = window.Match3Dom;
  const state = createState();

  function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
  function sleepMsFromSeconds(seconds) { return Math.max(1, Number(seconds)) * 1000; }
  function formatNumber(value) { return Number.isInteger(value) ? String(value) : value.toFixed(1); }
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
    const playerMaxHp = Math.max(1, Number($('playerMaxHpInput').value));
    const enemyMaxHp = Math.max(1, Number($('enemyMaxHpInput').value));
    Object.assign(state, { size: Number($('boardSize').value), colorCount: Number($('colorCount').value), fallSpeed: Number($('fallSpeed').value), clearSpeed: Number($('clearSpeed').value), attackInterval: Number($('attackInterval').value), enemyInterval: Number($('enemyInterval').value), attackMultiplier: Math.max(0, Number($('attackMultiplier').value)), defenseMultiplier: Math.max(0, Number($('defenseMultiplier').value)), enemyAttackPower: Math.max(0, Number($('enemyAttackPower').value)), selected: null, busy: false, score: 0, moves: 30, target: Number($('boardSize').value) * 150, combo: 1, startedAt: null, timerId: null, attackTimerId: null, enemyTimerId: null, hint: [], playerHp: playerMaxHp, enemyHp: enemyMaxHp, playerMaxHp, enemyMaxHp, nextPlayerAttackAt: null, nextEnemyAttackAt: null, lastAction: '交換方塊後，雙方攻擊計時器會開始。', heroAction: false, enemyAction: false, ended: false, magicArmed: false });
    resetRoundStats(state);
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

    try {
      await resolveMatches();
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

  async function resolveMatches() {
    let matches = logic.findMatches(state.board);
    while (matches.length > 0) {
      setStatus(`消除 ${matches.length} 個方塊，效果已累積到本輪計時器。`);
      state.score += matches.length * 20 * state.combo;
      render({ clearing: matches });
      await sleep(state.clearSpeed);
      matches.forEach(({ r, c }) => {
        const type = blockType(state.board[r][c]);
        state.roundStats[type.stat] += 1;
        state.board[r][c] = null;
      });
      const collapsed = logic.collapse(state.board, state.colorCount);
      state.board = collapsed.board;
      render({ fallMoves: collapsed.fallMoves, spawnMoves: collapsed.spawnMoves });
      await sleep(state.fallSpeed);
      state.combo++;
      matches = logic.findMatches(state.board);
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

  window.Match3Game = { state, resetGame, handleCellClick, resolveMatches, playerAttack, enemyAttack };
})();
