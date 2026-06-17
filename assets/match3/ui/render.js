(function (global) {
  const $ = id => document.getElementById(id);

  function key(pos) { return `${pos.r},${pos.c}`; }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function setStatus(text) { $('status').textContent = text; }
  function setBar(id, value, max = 100) { $(id).style.width = `${clamp(value, 0, max) / max * 100}%`; }
  function formatNumber(value) { return Number.isInteger(value) ? String(value) : value.toFixed(1); }
  function cellPixels() {
    const root = getComputedStyle(document.documentElement);
    return parseFloat(root.getPropertyValue('--cell-size')) + parseFloat(root.getPropertyValue('--gap'));
  }

  function createRenderer({ state, blockType, formatCountdown, countdownProgress, onCellClick }) {
    function renderBattleStats() {
      const attack = state.roundStats.attack * state.attackMultiplier;
      const defense = state.roundStats.defense * state.defenseMultiplier;
      const magic = state.roundStats.spell * 10;
      const attackMeterMax = Math.max(100, state.enemyMaxHp);
      const defenseMeterMax = Math.max(100, state.enemyAttackPower);

      $('attackTimer').textContent = formatCountdown(state.nextPlayerAttackAt) === '--' ? `${state.attackInterval}.0s` : formatCountdown(state.nextPlayerAttackAt);
      $('playerHpText').textContent = `${formatNumber(state.playerHp)} / ${formatNumber(state.playerMaxHp)}`;
      $('enemyHpText').textContent = `${formatNumber(state.enemyHp)} / ${formatNumber(state.enemyMaxHp)}`;
      setBar('playerHpBar', state.playerHp, state.playerMaxHp);
      setBar('enemyHpBar', state.enemyHp, state.enemyMaxHp);
      setBar('playerAttackBar', countdownProgress(state.nextPlayerAttackAt, state.attackInterval));
      setBar('enemyAttackBar', countdownProgress(state.nextEnemyAttackAt, state.enemyInterval));
      $('attackValue').textContent = `${formatNumber(attack)} / ${formatNumber(attackMeterMax)}`;
      $('defenseValue').textContent = `${formatNumber(defense)} / ${formatNumber(defenseMeterMax)}`;
      $('magicValue').textContent = `${formatNumber(clamp(magic, 0, 100))} / 100`;
      setBar('attackMeter', attack, attackMeterMax);
      setBar('defenseMeter', defense, defenseMeterMax);
      setBar('magicMeter', magic);
      $('magicButton').disabled = state.ended || state.magicArmed || state.roundStats.spell < 5;
      $('magicButton').textContent = state.magicArmed ? '魔法已準備：下次攻擊 x2' : '使用魔法（消耗 5 法術，下次攻擊 x2）';
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
          const isSpecial = window.Match3Logic && window.Match3Logic.isSpecialBlock(value);
          const special = isSpecial ? value.special : null;
          const type = blockType(isSpecial ? value.color : value);
          div.style.background = type.color;
          div.dataset.type = type.stat;
          if (isSpecial) {
            div.dataset.special = special;
            div.classList.add('special', `special-${special}`);
          }
          const specialIcon = special === 'line-row' ? '↔' : special === 'line-column' ? '↕' : special === 'bomb' ? '✹' : special === 'color' ? '🌈' : '';
          div.innerHTML = `<span class="cell-icon" aria-hidden="true">${type.icon}</span>${specialIcon ? `<span class="special-icon" aria-hidden="true">${specialIcon}</span>` : ''}`;
          div.title = isSpecial ? `${type.name}特殊方塊：${specialIcon}` : type.name;
          div.addEventListener('click', () => onCellClick(pos));
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
      $('playerHp').textContent = `${formatNumber(state.playerHp)}/${formatNumber(state.playerMaxHp)}`;
      $('enemyHp').textContent = `${formatNumber(state.enemyHp)}/${formatNumber(state.enemyMaxHp)}`;
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

    return { render, renderBattleStats };
  }

  global.Match3Dom = { $, key, clamp, setStatus, setBar };
  global.Match3Renderer = { createRenderer };
})(window);
