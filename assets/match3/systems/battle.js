(function (global) {
  function createBattleSystem({ state, render, setStatus, clamp, sleepMsFromSeconds, stopTimers, resetRoundStats, formatNumber, onBattleWin, onAfterPlayerAttack }) {
    function showDamagePopup(target, amount, kind = 'damage') {
      const id = `${Date.now()}-${Math.random()}`;
      const prefix = kind === 'heal' ? '+' : '-';
      state.damagePopups = [...state.damagePopups, { id, target, kind, text: `${prefix}${formatNumber(amount)}` }];
      render();
      setTimeout(() => {
        state.damagePopups = state.damagePopups.filter(popup => popup.id !== id);
        render();
      }, 900);
    }

    function flashActor(actor) {
      if (actor === 'hero') state.heroAction = true;
      else state.enemyAction = true;
      render();
      setTimeout(() => { if (actor === 'hero') state.heroAction = false; else state.enemyAction = false; render(); }, 550);
    }

    function checkBattleEnd() {
      if (state.enemyHp <= 0) { state.ended = true; stopTimers(); setStatus('勝利！敵方血量歸零。'); if (typeof onBattleWin === 'function') onBattleWin(); return; }
      if (state.playerHp <= 0) { state.ended = true; stopTimers(); setStatus('失敗！我方血量歸零。'); }
      render();
    }

    function playerAttack() {
      if (state.ended) return;
      const comboMultiplier = Math.pow(1.1, state.lastComboCount);
      const baseDamage = state.roundStats.attack * comboMultiplier * state.attackMultiplier;
      const damage = state.magicArmed ? baseDamage * 2 : baseDamage;
      const heal = state.roundStats.heal;
      const playerHpBeforeHeal = state.playerHp;
      state.enemyHp = clamp(state.enemyHp - damage, 0, state.enemyMaxHp);
      state.playerHp = clamp(state.playerHp + heal, 0, state.playerMaxHp);
      const actualHeal = state.playerHp - playerHpBeforeHeal;
      if (damage > 0) showDamagePopup('enemy', damage);
      if (actualHeal > 0) showDamagePopup('hero', actualHeal, 'heal');
      state.lastAction = `我方攻擊：攻擊方塊 ${formatNumber(state.roundStats.attack)} × 連擊倍率 1.1^${state.lastComboCount}（${formatNumber(comboMultiplier)}）× 攻擊力 ${formatNumber(state.attackMultiplier)}${state.magicArmed ? ' × 魔法 2' : ''} = ${formatNumber(damage)} 傷害，回血 ${formatNumber(actualHeal)}。防禦會保留並在敵方計時器重置時減半。`;
      state.roundStats.attack = 0;
      state.roundStats.spell = 0;
      state.roundStats.heal = 0;
      state.magicArmed = false;
      state.nextPlayerAttackAt = Date.now() + sleepMsFromSeconds(state.attackInterval);
      flashActor('hero');
      if (typeof onAfterPlayerAttack === 'function') onAfterPlayerAttack();
      checkBattleEnd();
    }

    function enemyAttack() {
      if (state.ended) return;
      const defenseBeforeDecay = state.roundStats.defense;
      const blocked = Math.min(state.enemyAttackPower, defenseBeforeDecay * state.defenseMultiplier);
      const damage = state.enemyAttackPower - blocked;
      state.playerHp = clamp(state.playerHp - damage, 0, state.playerMaxHp);
      if (damage > 0) showDamagePopup('hero', damage);
      state.roundStats.defense = defenseBeforeDecay / 2;
      state.lastAction = `敵方攻擊 ${formatNumber(state.enemyAttackPower)}，防禦方塊抵擋 ${formatNumber(blocked)}，我方受到 ${formatNumber(damage)} 傷害。防禦半衰期：${formatNumber(defenseBeforeDecay)} → ${formatNumber(state.roundStats.defense)}。`;
      state.nextEnemyAttackAt = Date.now() + sleepMsFromSeconds(state.enemyInterval);
      flashActor('enemy');
      checkBattleEnd();
    }

    return { playerAttack, enemyAttack, checkBattleEnd };
  }

  global.Match3Battle = { createBattleSystem };
})(window);
