(function () {
  const COLORS = ['#FF6663', '#FEB144', '#9EE09E', '#9EC1CF', '#CC99C9', '#B5EAD7', '#C7CEEA'];
  const logic = window.Match3Logic;
  const $ = id => document.getElementById(id);
  const state = { board: [], size: 8, colorCount: 4, fallSpeed: 420, clearSpeed: 260, selected: null, busy: false, score: 0, moves: 30, target: 1200, combo: 1, startedAt: null, timerId: null, hint: [] };

  function key(pos) { return `${pos.r},${pos.c}`; }
  function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
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
    $('hintButton').disabled = state.busy;
    $('resetButton').disabled = state.busy;
  }

  function setStatus(text) { $('status').textContent = text; }
  function updateTimer() {
    if (!state.startedAt) { $('timer').textContent = '00:00'; return; }
    const sec = Math.floor((Date.now() - state.startedAt) / 1000);
    $('timer').textContent = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
  }
  function startTimer() {
    if (state.startedAt) return;
    state.startedAt = Date.now();
    state.timerId = setInterval(updateTimer, 1000);
  }

  function resetGame() {
    clearInterval(state.timerId);
    Object.assign(state, { size: Number($('boardSize').value), colorCount: Number($('colorCount').value), fallSpeed: Number($('fallSpeed').value), clearSpeed: Number($('clearSpeed').value), selected: null, busy: false, score: 0, moves: 30, target: Number($('boardSize').value) * 150, combo: 1, startedAt: null, timerId: null, hint: [] });
    state.board = logic.createBoard(state.size, state.colorCount);
    updateTimer();
    setStatus('請交換相鄰方塊開始遊戲。');
    render();
  }

  async function handleCellClick(pos) {
    if (state.busy || state.moves <= 0) return;
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

  function endTurnCheck() {
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
    if (state.busy) return;
    const move = logic.findAvailableMove(state.board);
    state.hint = move || [];
    setStatus(move ? '已標出一組可交換的方塊。' : '目前無解，已重新排列棋盤。');
    if (!move) state.board = logic.shuffleBoard(state.board);
    render();
  }

  ['colorCount', 'boardSize'].forEach(id => $(id).addEventListener('change', resetGame));
  $('fallSpeed').addEventListener('change', e => { state.fallSpeed = Number(e.target.value); render(); });
  $('clearSpeed').addEventListener('change', e => { state.clearSpeed = Number(e.target.value); render(); });
  $('resetButton').addEventListener('click', resetGame);
  $('hintButton').addEventListener('click', showHint);
  resetGame();
})();
