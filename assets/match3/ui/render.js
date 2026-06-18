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

  function createRenderer({ state, blockType, formatCountdown, countdownProgress, onCellClick, onNextNode, onBuyEquipment, onRestUpgrade, onNewRun, equipmentShop = [] }) {
    function renderBattleStats() {
      const attack = state.roundStats.attack * state.attackMultiplier;
      const defense = state.roundStats.defense * state.defenseMultiplier;
      const magic = state.roundStats.spell * 10;
      const heal = state.roundStats.heal;
      const attackMeterMax = Math.max(100, state.enemyMaxHp);
      const defenseMeterMax = Math.max(100, state.enemyAttackPower);
      const healMeterMax = Math.max(100, state.playerMaxHp - state.playerHp);

      const playerCountdown = formatCountdown(state.nextPlayerAttackAt, state.attackInterval);
      const enemyCountdown = formatCountdown(state.nextEnemyAttackAt, state.enemyInterval);
      $('playerHpText').textContent = `${formatNumber(state.playerHp)} / ${formatNumber(state.playerMaxHp)}`;
      $('enemyHpText').textContent = `${formatNumber(state.enemyHp)} / ${formatNumber(state.enemyMaxHp)}`;
      setBar('playerHpBar', state.playerHp, state.playerMaxHp);
      setBar('enemyHpBar', state.enemyHp, state.enemyMaxHp);
      setBar('playerAttackBar', countdownProgress(state.nextPlayerAttackAt, state.attackInterval));
      setBar('enemyAttackBar', countdownProgress(state.nextEnemyAttackAt, state.enemyInterval));
      $('playerStageAttackCountdown').textContent = playerCountdown;
      $('enemyStageAttackCountdown').textContent = enemyCountdown;
      setBar('playerStageAttackBar', countdownProgress(state.nextPlayerAttackAt, state.attackInterval));
      setBar('enemyStageAttackBar', countdownProgress(state.nextEnemyAttackAt, state.enemyInterval));
      $('attackValue').textContent = `${formatNumber(attack)} / ${formatNumber(attackMeterMax)}`;
      $('defenseValue').textContent = `${formatNumber(defense)} / ${formatNumber(defenseMeterMax)}`;
      $('magicValue').textContent = `${formatNumber(clamp(magic, 0, 100))} / 100`;
      $('healValue').textContent = `${formatNumber(heal)} / ${formatNumber(healMeterMax)}`;
      setBar('attackMeter', attack, attackMeterMax);
      setBar('defenseMeter', defense, defenseMeterMax);
      setBar('magicMeter', magic);
      setBar('healMeter', heal, healMeterMax);
      $('magicButton').disabled = state.ended || state.magicArmed || state.roundStats.spell < 5;
      $('magicButton').textContent = state.magicArmed ? '魔法已準備：下次攻擊 x2' : '使用魔法（消耗 5 法術，下次攻擊 x2）';
    }


    function renderRunPanel() {
      const panel = $('runPanel');
      if (!panel) return;
      const run = state.run;
      const node = run.currentNode || {};
      const route = run.route.map((step, index) => `<span class="route-node ${index + 1 === run.level ? 'current' : ''} ${index + 1 < run.level ? 'done' : ''}">${index + 1}. ${step.type === 'battle' ? '戰鬥' : step.type === 'shop' ? '商店' : '休息'}</span>`).join('');
      const gear = Object.entries(run.equipment).map(([slot, item]) => `<li>${slot}: ${item.name}</li>`).join('');
      const actions = node.type === 'shop'
        ? `<div class="run-actions">${equipmentShop.map((item, index) => `<button type="button" data-shop-index="${index}" ${run.gold < item.price ? 'disabled' : ''}>買 ${item.name}（${item.price} 金）</button>`).join('')}<button type="button" data-next-node>離開商店</button></div>`
        : node.type === 'rest'
          ? `<div class="run-actions"><button type="button" data-rest-upgrade>休息升級</button><button type="button" data-next-node>前往下一關</button></div>`
          : run.completed ? `<div class="run-actions"><button type="button" data-new-run>開始新冒險</button></div>` : '';
      panel.innerHTML = `
        <h2>冒險路線</h2>
        <div class="route-list">${route}</div>
        <p><strong>目前：</strong>第 ${run.level}/${run.totalLevels} 關 ${node.name || ''}${node.type === 'battle' ? `（HP ${node.hp} / 攻擊 ${node.attack}）` : ''}</p>
        <p><strong>${run.character.name}</strong> Lv.${run.character.level}｜金幣 ${run.gold}</p>
        <ul class="gear-list">${gear}</ul>
        ${actions}
      `;
      if (!panel.querySelector) return;
      panel.querySelectorAll('[data-shop-index]').forEach(button => button.addEventListener('click', event => onBuyEquipment(Number(event.target.dataset.shopIndex))));
      const next = panel.querySelector('[data-next-node]');
      if (next) next.addEventListener('click', onNextNode);
      const rest = panel.querySelector('[data-rest-upgrade]');
      if (rest) rest.addEventListener('click', onRestUpgrade);
      const newRun = panel.querySelector('[data-new-run]');
      if (newRun) newRun.addEventListener('click', onNewRun);
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
      const renderedCells = [];

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
        if (clearing.has(key(pos))) {
          div.classList.add('clearing');
          if (value !== null) {
            const type = blockType(window.Match3Logic && window.Match3Logic.colorOf ? window.Match3Logic.colorOf(value) : value);
            div.style.setProperty('--clear-duration', `${type.clearSpeed || state.clearSpeed}ms`);
          }
        }
        if (falling.has(key(pos))) {
          div.classList.add('falling');
          div.style.setProperty('--from-y', `${-falling.get(key(pos)) * cellPixels()}px`);
        }
        if (spawning.has(key(pos))) {
          div.classList.add('spawning');
          div.style.setProperty('--from-y', `${-(spawning.get(key(pos)) + 1) * cellPixels()}px`);
        }
        if (hint.has(key(pos))) div.classList.add('hint');
        renderedCells.push(div);
      }));

      boardEl.innerHTML = '';
      renderedCells.forEach(cell => boardEl.appendChild(cell));

      $('score').textContent = state.score;
      $('moves').textContent = state.moves;
      $('combo').textContent = `連擊 ${state.lastComboCount}（目前 x${state.combo}）`;
      $('playerHp').textContent = `${formatNumber(state.playerHp)}/${formatNumber(state.playerMaxHp)}`;
      $('enemyHp').textContent = `${formatNumber(state.enemyHp)}/${formatNumber(state.enemyMaxHp)}`;
      $('playerAttackCountdown').textContent = formatCountdown(state.nextPlayerAttackAt, state.attackInterval);
      $('enemyAttackCountdown').textContent = formatCountdown(state.nextEnemyAttackAt, state.enemyInterval);
      $('roundAttack').textContent = state.roundStats.attack;
      $('roundDefense').textContent = state.roundStats.defense;
      $('roundSpell').textContent = state.roundStats.spell;
      $('roundHeal').textContent = state.roundStats.heal;
      $('battleLog').textContent = state.lastAction;
      const heroFighter = $('heroSprite').parentElement;
      const enemyFighter = $('enemySprite').parentElement;
      if (heroFighter && enemyFighter) {
        heroFighter.querySelectorAll('.damage-popup').forEach(element => element.remove());
        enemyFighter.querySelectorAll('.damage-popup').forEach(element => element.remove());
        state.damagePopups.forEach(popup => {
          const target = popup.target === 'enemy' ? enemyFighter : heroFighter;
          const label = document.createElement('span');
          label.className = `damage-popup ${popup.kind || 'damage'}`;
          label.textContent = popup.text;
          target.appendChild(label);
        });
      }
      $('heroSprite').classList.toggle('attacking', state.heroAction);
      $('enemySprite').classList.toggle('attacking', state.enemyAction);
      $('hintButton').disabled = state.busy || state.ended;
      $('resetButton').disabled = state.busy;
      renderBattleStats();
      renderRunPanel();
    }

    return { render, renderBattleStats };
  }

  global.Match3Dom = { $, key, clamp, setStatus, setBar };
  global.Match3Renderer = { createRenderer };
})(window);
