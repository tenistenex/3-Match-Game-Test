const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const REQUIRED_IDS = [
  'board', 'score', 'moves', 'target', 'combo', 'playerHp', 'enemyHp', 'playerAttackCountdown',
  'enemyAttackCountdown', 'roundAttack', 'roundDefense', 'roundSpell', 'roundHeal', 'battleLog',
  'heroSprite', 'enemySprite', 'hintButton', 'resetButton', 'attackTimer', 'playerHpText',
  'enemyHpText', 'playerHpBar', 'enemyHpBar', 'playerAttackBar', 'enemyAttackBar', 'attackValue',
  'defenseValue', 'magicValue', 'attackMeter', 'defenseMeter', 'magicMeter', 'magicButton',
  'timer', 'status', 'boardSize', 'colorCount', 'fallSpeed', 'clearSpeed', 'attackInterval',
  'enemyInterval'
];

class FakeClassList {
  constructor() { this.values = new Set(); }
  add(value) { this.values.add(value); }
  toggle(value, force) {
    const shouldAdd = force === undefined ? !this.values.has(value) : Boolean(force);
    if (shouldAdd) this.values.add(value);
    else this.values.delete(value);
  }
  contains(value) { return this.values.has(value); }
}

class FakeElement {
  constructor(id = '') {
    this.id = id;
    this.children = [];
    this.dataset = {};
    this.style = { setProperty(name, value) { this[name] = value; } };
    this.classList = new FakeClassList();
    this.listeners = {};
    this.value = '';
    this.disabled = false;
    this.textContent = '';
    this.title = '';
    this.type = '';
  }
  set innerHTML(value) { this._innerHTML = value; if (value === '') this.children = []; }
  get innerHTML() { return this._innerHTML || ''; }
  setAttribute(name, value) { this[name] = value; }
  appendChild(child) { this.children.push(child); return child; }
  addEventListener(type, handler) { this.listeners[type] = handler; }
}

function createHarness() {
  const elements = new Map(REQUIRED_IDS.map(id => [id, new FakeElement(id)]));
  const values = {
    boardSize: '6', colorCount: '4', fallSpeed: '0', clearSpeed: '0', attackInterval: '1', enemyInterval: '1'
  };
  for (const [id, value] of Object.entries(values)) elements.get(id).value = value;

  const context = {
    console,
    Math: Object.create(Math),
    Date,
    Symbol,
    window: {},
    document: {
      documentElement: new FakeElement('root'),
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, new FakeElement(id));
        return elements.get(id);
      },
      createElement() { return new FakeElement(); }
    },
    getComputedStyle() {
      return { getPropertyValue(name) { return name === '--cell-size' ? '44px' : '6px'; } };
    },
    setInterval() { return 1; },
    clearInterval() {},
    setTimeout(callback) { queueMicrotask(callback); return 1; }
  };
  let seed = 1;
  context.window = context;
  context.Math.random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  vm.createContext(context);

  const root = path.resolve(__dirname, '..');
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/match3.logic.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/match3.ui.js'), 'utf8'), context);
  return context;
}

async function makeMatchingSwap(game) {
  game.state.board = [
    [1, 0, 2],
    [0, 1, 2],
    [0, 2, 1]
  ];
  game.state.size = 3;
  game.state.colorCount = 3;
  game.state.fallSpeed = 0;
  game.state.clearSpeed = 0;
  game.state.selected = null;
  game.state.busy = false;
  game.state.ended = false;
  await game.handleCellClick({ r: 0, c: 0 });
  await game.handleCellClick({ r: 0, c: 1 });
}

test('a timed battle does not lock the board after the first clearing swap', async () => {
  const { Match3Game: game } = createHarness();

  await makeMatchingSwap(game);

  assert.equal(game.state.busy, false, 'board should unlock after match resolution');
  assert.equal(game.state.ended, false, 'game should still be playable after the timer starts');
  assert.equal(game.state.moves, 29, 'first valid swap should consume one move');
  assert.ok(game.state.score > 0, 'matching swap should clear blocks and add score');
  assert.ok(game.state.roundStats.attack >= 3, 'cleared attack blocks should accumulate attack power');

  game.enemyAttack();
  assert.equal(game.state.ended, false, 'one enemy timer attack should not immediately end the game');
  assert.equal(game.state.playerHp, 90, 'enemy attack should damage HP without locking movement');

  const scoreAfterFirstSwap = game.state.score;
  await makeMatchingSwap(game);

  assert.equal(game.state.busy, false, 'board should unlock after a second swap too');
  assert.equal(game.state.ended, false, 'timer state should not prevent more movement');
  assert.equal(game.state.moves, 28, 'second valid swap should also be accepted');
  assert.ok(game.state.score > scoreAfterFirstSwap, 'second swap should also clear and score');
});
