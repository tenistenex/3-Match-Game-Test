const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class ClassList {
  constructor() { this.values = new Set(); }
  add(...names) { names.forEach(name => this.values.add(name)); }
  remove(...names) { names.forEach(name => this.values.delete(name)); }
  toggle(name, force) {
    if (force === undefined ? !this.values.has(name) : force) this.values.add(name);
    else this.values.delete(name);
  }
  contains(name) { return this.values.has(name); }
}

function createElement(id = 'created') {
  const element = {
    id,
    style: { setProperty(name, value) { this[name] = value; } },
    dataset: {},
    classList: new ClassList(),
    listeners: {},
    children: [],
    attributes: {},
    disabled: false,
    value: '',
    textContent: '',
    title: '',
    type: '',
    set innerHTML(value) { this._innerHTML = value; if (id === 'board') this.children = []; },
    get innerHTML() { return this._innerHTML || ''; },
    setAttribute(name, value) { this.attributes[name] = value; },
    appendChild(child) { this.children.push(child); return child; },
    addEventListener(type, handler) { this.listeners[type] = handler; },
    querySelectorAll() { return []; },
    click() { if (this.listeners.click) return this.listeners.click({ target: this }); },
  };
  return element;
}

function createHarness() {
  const indexHtml = fs.readFileSync('index.html', 'utf8');
  const ids = Array.from(new Set([...indexHtml.matchAll(/\bid="([^"]+)"/g)].map(match => match[1])));
  const elements = Object.fromEntries(ids.map(id => [id, createElement(id)]));
  Object.assign(elements.boardSize, { value: '8' });
  Object.assign(elements.colorCount, { value: '4' });
  Object.assign(elements.fallSpeed, { value: '1' });
  Object.assign(elements.clearSpeed, { value: '1' });
  Object.assign(elements.attackInterval, { value: '30' });
  Object.assign(elements.enemyInterval, { value: '30' });
  Object.assign(elements.playerMaxHpInput, { value: '120' });
  Object.assign(elements.enemyMaxHpInput, { value: '150' });
  Object.assign(elements.attackMultiplier, { value: '2' });
  Object.assign(elements.defenseMultiplier, { value: '3' });
  Object.assign(elements.enemyAttackPower, { value: '12' });

  const context = {
    window: {},
    document: {
      documentElement: createElement('root'),
      getElementById(id) {
        assert.ok(elements[id], `missing fixture element #${id}`);
        return elements[id];
      },
      createElement() { return createElement(); },
    },
    getComputedStyle() {
      return { getPropertyValue(prop) { return prop === '--cell-size' ? '44' : '6'; } };
    },
    setInterval,
    clearInterval,
    setTimeout,
    Math,
    Date,
    console,
  };
  context.window = context;
  vm.createContext(context);
  const scriptFiles = [...indexHtml.matchAll(/<script src="\.\/([^"]+)"><\/script>/g)].map(match => match[1]);
  assert.deepEqual(scriptFiles, [
    'assets/match3/config/block-types.js',
    'assets/match3/core/logic.js',
    'assets/match3/state/game-state.js',
    'assets/match3/ui/render.js',
    'assets/match3/systems/battle.js',
    'assets/match3/main.js',
  ], 'index.html should load match-3 scripts in the required order');
  scriptFiles.forEach(file => vm.runInContext(fs.readFileSync(file, 'utf8'), context));
  return { context, elements };
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function assertBoardPanelRendered(elements, expectedSize, message) {
  assert.equal(elements.board.children.length, expectedSize * expectedSize, `${message}: board should render ${expectedSize * expectedSize} cells`);
  assert.equal(elements.board.children.filter(cell => !cell.classList.contains('empty')).length, expectedSize * expectedSize, `${message}: board cells should be visible blocks`);
  assert.ok(elements.board.children.every(cell => cell.listeners.click), `${message}: every visible block should be clickable`);
}

(async () => {
  const { context, elements, scriptFiles } = createHarness();

  assertBoardPanelRendered(elements, 6, 'initial load');
  assert.match(elements.status.textContent, /第 1 關「史萊姆訓練」/);
  assert.equal(elements.playerHp.textContent, '120/120');
  assert.match(elements.enemyHp.textContent, /\d+\/\d+/);
  assert.match(elements.runPanel.innerHTML, /6 關線性 Demo/);
  assert.equal(elements.moves.textContent, 15);
  assert.equal(elements.healValue.textContent, '0 / 100', 'heal should have an accumulation meter');
  assert.equal(context.window.Match3Game.showDebugOptions, false, 'debug option controls should be hidden by default');
  assert.equal(elements.blockSettings.children.length, 3, 'block settings panel should render one card per active block type');
  assert.doesNotMatch(fs.readFileSync('index.html', 'utf8'), /<details class="block-settings"[^>]*data-debug-option/, 'block settings panel should stay visible without debug options');

  const redirectHtml = fs.readFileSync('match3.html', 'utf8');
  assert.match(redirectHtml, /url=\.\/index\.html/, 'match3.html should redirect directly to index.html so the game loads from local files');
  assert.match(redirectHtml, /window\.location\.replace\('\.\/index\.html'\)/, 'match3.html script fallback should redirect directly to index.html');

  elements.hintButton.click();
  assert.equal(elements.board.children.filter(cell => cell.classList.contains('hint')).length, 2, 'hint should mark one swappable pair');
  assert.match(elements.status.textContent, /標出一組可交換/);

  const colorValues = new Map(['#FF6663', '#60A5FA', '#A78BFA', '#34D399'].map((color, index) => [color, index]));
  const currentBoard = () => Array.from({ length: 6 }, (_, r) =>
    Array.from({ length: 6 }, (_, c) => colorValues.get(elements.board.children[r * 6 + c].style.background))
  );
  const move = context.window.Match3Logic.findAvailableMove(currentBoard());
  assert.ok(move, 'board should have an available move');
  const [first, second] = move;
  elements.board.children[first.r * 6 + first.c].click();
  elements.board.children[second.r * 6 + second.c].click();
  await wait(1000);

  assert.equal(elements.moves.textContent, 14, 'valid swap should consume one move');
  assertBoardPanelRendered(elements, 6, 'after resolving a move');
  assert.doesNotThrow(() => context.window.Match3Logic.findAvailableMove(currentBoard()));
  const totalAccumulated = Number(elements.roundAttack.textContent) + Number(elements.roundDefense.textContent) +
    Number(elements.roundSpell.textContent) + Number(elements.roundHeal.textContent);
  assert.ok(totalAccumulated > 0, 'cleared blocks should accumulate battle effects');



  const logic = context.window.Match3Logic;
  assert.equal(logic.getSpecialForGroup({ orientation: 'row', cells: [{}, {}, {}, {}] }), logic.SPECIAL_TYPES.LINE_ROW, 'four in a row should make a horizontal line special');
  assert.equal(logic.getSpecialForGroup({ orientation: 'column', cells: [{}, {}, {}, {}] }), logic.SPECIAL_TYPES.LINE_COLUMN, 'four in a column should make a vertical line special');
  assert.equal(logic.getSpecialForGroup({ orientation: 'row', cells: [{}, {}, {}, {}, {}] }), logic.SPECIAL_TYPES.COLOR, 'five matched blocks should make a color-clear special');
  const special = logic.createSpecialBlock(2, logic.SPECIAL_TYPES.BOMB);
  assert.equal(logic.colorOf(special), 2, 'special blocks should keep their original color');

  assert.equal(
    JSON.stringify(context.window.Match3Config.BLOCK_TYPES.slice(0, 4).map(type => type.weight)),
    JSON.stringify([45, 25, 15, 15]),
    'level 1 block weights should match the demo proposal'
  );

  context.window.Match3Config.BLOCK_TYPES[0].weight = 0;
  context.window.Match3Config.BLOCK_TYPES[1].weight = 10;
  assert.equal(logic.createRandomBlock(2), 1, 'block spawn weights should control random block generation');
  context.window.Match3Config.BLOCK_TYPES[0].weight = 45;
  context.window.Match3Config.BLOCK_TYPES[1].weight = 25;

  elements.resetButton.click();
  context.window.Match3Config.BLOCK_TYPES[0].clearSpeed = 17;
  context.window.Match3Game.state.board = [
    [logic.createSpecialBlock(0, logic.SPECIAL_TYPES.LINE_ROW), 0, 1, 2, 0, 1],
    [1, 2, 0, 1, 2, 0],
    [2, 0, 1, 2, 0, 1],
    [0, 1, 2, 0, 1, 2],
    [1, 2, 0, 1, 2, 0],
    [2, 0, 1, 2, 0, 1],
  ];
  context.window.Match3Game.state.roundStats = context.window.Match3State.createRoundStats();
  context.window.Match3Game.state.moves = 30;
  context.window.Match3Game.state.startedAt = null;
  context.window.Match3Game.state.busy = false;
  context.window.Match3Game.state.ended = false;
  const specialActivation = context.window.Match3Game.handleCellClick({ r: 0, c: 0 });
  assert.equal(elements.board.children[0].style['--clear-duration'], '17ms', 'per-block clear speed should be applied to clearing cells');
  await specialActivation;
  assert.ok(Number(elements.roundAttack.textContent) > 0, 'activated special blocks should accumulate cleared block effects');
  context.window.Match3Config.BLOCK_TYPES[0].clearSpeed = 260;

  elements.resetButton.click();
  context.window.Match3Game.state.roundStats.attack = 7;
  context.window.Match3Game.state.roundStats.heal = 5;
  context.window.Match3Game.state.attackMultiplier = 2;
  context.window.Match3Game.state.lastComboCount = 2;
  context.window.Match3Game.state.playerHp = 110;
  context.window.Match3Game.state.enemyMaxHp = 150;
  context.window.Match3Game.state.enemyHp = 150;
  context.window.Match3Game.playerAttack();
  assert.equal(context.window.Match3Game.state.enemyHp, 133.06, 'player attack should apply attack blocks times 1.1^combo times attack power');
  assert.equal(context.window.Match3Game.state.playerHp, 115, 'player attack should apply accumulated healing to the hero');
  assert.equal(context.window.Match3Game.state.damagePopups[0].target, 'enemy', 'player attack damage popup should appear over the enemy');
  assert.equal(context.window.Match3Game.state.damagePopups[0].text, '-16.9', 'player attack should create a damage number popup');
  assert.equal(context.window.Match3Game.state.damagePopups[1].target, 'hero', 'healing popup should appear over the hero');
  assert.equal(context.window.Match3Game.state.damagePopups[1].text, '+5', 'player attack should create a heal number popup');

  elements.resetButton.click();
  context.window.Match3Game.state.roundStats.defense = 8;
  context.window.Match3Game.state.defenseMultiplier = 1;
  context.window.Match3Game.state.enemyAttackPower = 12;
  context.window.Match3Game.enemyAttack();
  assert.equal(context.window.Match3Game.state.playerHp, 116, 'enemy attack should subtract damage after defense blocks');
  assert.equal(context.window.Match3Game.state.roundStats.defense, 4, 'defense should be halved when the enemy timer resets');

  elements.resetButton.click();
  assertBoardPanelRendered(elements, 6, 'reset');
  assert.equal(elements.moves.textContent, 15, 'reset should restore moves');

  elements.boardSize.value = '';
  elements.colorCount.value = '';
  elements.fallSpeed.value = '';
  elements.clearSpeed.value = '';
  elements.resetButton.click();
  assertBoardPanelRendered(elements, 6, 'reset with blank settings');
  assert.ok(!('target' in elements), 'target score card should not be rendered because it is no longer used');

  console.log('match3 basic UI tests passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
