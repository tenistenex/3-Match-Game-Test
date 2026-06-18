(function (global) {
  const DEFAULT_HP = 100;
  const ENEMY_ATTACK = 10;

  function createRoundStats() {
    return { attack: 0, defense: 0, spell: 0, heal: 0 };
  }

  function createRunState() {
    return {
      level: 1,
      totalLevels: 3,
      gold: 35,
      character: {
        name: '冒險者',
        level: 1,
        maxHpBonus: 0,
        attackBonus: 0,
        defenseBonus: 0,
      },
      equipment: {
        weapon: { name: '木劍', attack: 0 },
        armor: { name: '布甲', defense: 0 },
        charm: { name: '小護符', hp: 0 },
      },
      currentNode: null,
      route: [],
      completed: false,
    };
  }

  function createState() {
    return {
      board: [], size: 8, colorCount: 4, fallSpeed: 420, clearSpeed: 260,
      run: createRunState(),
      selected: null, busy: false, score: 0, moves: 30, combo: 1,
      currentTurnCombo: 0, lastComboCount: 0,
      startedAt: null, timerId: null, attackTimerId: null, enemyTimerId: null,
      hint: [], playerHp: DEFAULT_HP, enemyHp: DEFAULT_HP, playerMaxHp: DEFAULT_HP, enemyMaxHp: DEFAULT_HP,
      attackMultiplier: 1, defenseMultiplier: 1, enemyAttackPower: ENEMY_ATTACK,
      attackInterval: 5, enemyInterval: 5, nextPlayerAttackAt: null, nextEnemyAttackAt: null,
      roundStats: createRoundStats(),
      lastAction: '尚未攻擊。', heroAction: false, enemyAction: false, damagePopups: [], ended: false, magicArmed: false
    };
  }

  function resetRoundStats(state) {
    state.roundStats = createRoundStats();
  }

  global.Match3State = { DEFAULT_HP, ENEMY_ATTACK, createState, createRoundStats, createRunState, resetRoundStats };
})(window);
