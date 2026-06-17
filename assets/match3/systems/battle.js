(function (global) {
  function createBattleSystem({ state, render, setStatus, clamp, sleepMsFromSeconds, stopTimers, resetRoundStats, enemyAttackPower }) {
    function flashActor(actor) {
      if (actor === 'hero') state.heroAction = true;
      else state.enemyAction = true;
      render();
      setTimeout(() => { if (actor === 'hero') state.heroAction = false; else state.enemyAction = false; render(); }, 550);
    }

    function checkBattleEnd() {
      if (state.enemyHp <= 0) { state.ended = true; stopTimers(); setStatus('勝利！敵方血量歸零。'); }
      if (state.playerHp <= 0) { state.ended = true; stopTimers(); setStatus('失敗！我方血量歸零。'); }
      render();
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
      const blocked = Math.min(enemyAttackPower, state.roundStats.defense);
      const damage = enemyAttackPower - blocked;
      state.playerHp = clamp(state.playerHp - damage, 0, state.maxHp);
      state.lastAction = `敵方攻擊 ${enemyAttackPower}，防禦方塊抵擋 ${blocked}，我方受到 ${damage} 傷害。`;
      resetRoundStats(state);
      state.nextEnemyAttackAt = Date.now() + sleepMsFromSeconds(state.enemyInterval);
      flashActor('enemy');
      checkBattleEnd();
    }

    return { playerAttack, enemyAttack, checkBattleEnd };
  }

  global.Match3Battle = { createBattleSystem };
})(window);
