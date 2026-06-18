# 三消關卡式設計提案

這份文件整理目前三消戰鬥玩法可以延伸出的關卡式設計方向。目標是讓遊戲從單場三消戰鬥，逐步擴展成具有教學、戰鬥節奏、Boss 關、商店/休息、裝備成長與 Roguelite 路線選擇的關卡制遊戲。

目前遊戲已具備以下基礎：

- 三消盤面與可調整版面大小。
- 攻擊、防禦、法術、回血等方塊效果。
- 橫列、直行、炸彈、同色全消等特殊方塊。
- 玩家與敵人攻擊倒數。
- 累積攻擊、防禦、法術、回血數值。
- 3 關冒險路線。
- 隨機敵人、商店、休息升級。
- 裝備影響角色基礎數值。

---

## 設計方向總覽

建議不要先做成純 Candy Crush 式的過關遊戲，而是保留目前的「三消戰鬥」特色，做成：

> 三消戰鬥 + 關卡目標 + 短程 Roguelite 冒險

核心循環：

1. 玩家進入一個關卡節點。
2. 根據該關卡規則調整盤面、敵人、步數、方塊權重或特殊限制。
3. 玩家透過三消累積攻擊、防禦、法術、回血。
4. 擊敗敵人或完成特殊目標。
5. 獲得金幣、裝備、升級或前往下一個節點。

---

## 第一階段：建議先做 6 關線性版本

第一版不建議一開始就做完整分支地圖。先做 6 關線性體驗，能更快驗證遊戲是否好玩，也比較容易測試。

| 關卡 | 名稱 | 主要目的 | 敵人 | 特色 |
|---:|---|---|---|---|
| 1 | 史萊姆訓練 | 教玩家消攻擊方塊 | 史萊姆 | 敵人不攻擊，讓玩家專心理解攻擊 |
| 2 | 骷髏兵來襲 | 教玩家使用防禦 | 骷髏兵 | 敵人攻擊較明顯，防禦方塊權重提高 |
| 3 | 魔法水晶 | 教玩家使用法術 | 水晶怪 | 鼓勵玩家累積法術並使用魔法爆發 |
| 4 | 毒菇森林 | 教玩家使用回血 | 毒菇 | 敵人高頻低傷害，回血變得重要 |
| 5 | 石像守衛 | 教玩家製造特殊方塊 | 石像守衛 | 高血量，鼓勵連消、炸彈與直線消除 |
| 6 | 哥布林王 | 第一個 Boss 關 | 哥布林王 | 血量降低後攻擊節奏變快 |

---

## 關卡 1：史萊姆訓練

### 目標

讓玩家理解「消除攻擊方塊可以打敵人」。

### 建議參數

```js
{
  id: 1,
  name: '史萊姆訓練',
  type: 'battle',
  boardSize: 6,
  colorCount: 3,
  moves: 15,
  enemy: {
    name: '史萊姆',
    hp: 40,
    attack: 0,
    attackInterval: 999
  },
  blockWeights: {
    attack: 45,
    defense: 25,
    spell: 15,
    heal: 15
  },
  goal: {
    type: 'defeatEnemy'
  }
}
```

### 玩家體感

這關應該非常簡單。玩家只需要做幾次三消，就能看到敵人扣血，建立基本回饋。

---

## 關卡 2：骷髏兵來襲

### 目標

讓玩家理解防禦方塊不是分數，而是用來抵擋敵人攻擊。

### 建議參數

```js
{
  id: 2,
  name: '骷髏兵來襲',
  type: 'battle',
  boardSize: 7,
  colorCount: 4,
  moves: 25,
  enemy: {
    name: '骷髏兵',
    hp: 90,
    attack: 16,
    attackInterval: 4
  },
  blockWeights: {
    attack: 30,
    defense: 45,
    spell: 15,
    heal: 10
  },
  goal: {
    type: 'defeatEnemy'
  }
}
```

### 玩家體感

玩家如果只顧消攻擊，會明顯受到傷害。只要消幾次防禦，就能感受到傷害被抵銷。

---

## 關卡 3：魔法水晶

### 目標

教玩家使用法術與魔法按鈕。

### 建議參數

```js
{
  id: 3,
  name: '魔法水晶',
  type: 'battle',
  boardSize: 7,
  colorCount: 4,
  moves: 25,
  enemy: {
    name: '水晶怪',
    hp: 140,
    attack: 8,
    attackInterval: 6
  },
  blockWeights: {
    attack: 30,
    defense: 20,
    spell: 40,
    heal: 10
  },
  goal: {
    type: 'defeatEnemy',
    recommendedAction: 'useMagicOnce'
  }
}
```

### 玩家體感

敵人血量較高，普通攻擊會覺得慢。玩家累積法術後使用魔法，能明顯感受到爆發傷害。

---

## 關卡 4：毒菇森林

### 目標

讓回血方塊變得重要。

### 建議參數

```js
{
  id: 4,
  name: '毒菇森林',
  type: 'battle',
  boardSize: 8,
  colorCount: 4,
  moves: 30,
  enemy: {
    name: '毒菇',
    hp: 120,
    attack: 7,
    attackInterval: 2.5
  },
  blockWeights: {
    attack: 30,
    defense: 20,
    spell: 15,
    heal: 35
  },
  goal: {
    type: 'defeatEnemy'
  }
}
```

### 玩家體感

敵人單次傷害不高，但攻擊頻繁。玩家會自然開始重視回血方塊。

### 可選進階規則

後續可以加入「中毒」：每隔固定秒數造成少量傷害，直到玩家消除一定數量回血方塊。

---

## 關卡 5：石像守衛

### 目標

鼓勵玩家製造特殊方塊與連鎖消除。

### 建議參數

```js
{
  id: 5,
  name: '石像守衛',
  type: 'battle',
  boardSize: 8,
  colorCount: 5,
  moves: 30,
  enemy: {
    name: '石像守衛',
    hp: 220,
    attack: 12,
    attackInterval: 5
  },
  blockWeights: {
    attack: 35,
    defense: 25,
    spell: 25,
    heal: 15
  },
  goal: {
    type: 'defeatEnemy',
    recommendedAction: 'createSpecialBlock'
  }
}
```

### 玩家體感

敵人血量高，普通三消能打但效率較差。玩家會被鼓勵尋找 4 消、5 消、連鎖與特殊方塊。

---

## 關卡 6：哥布林王

### 目標

作為第一章 Boss，讓玩家感受到節奏變化。

### 建議參數

```js
{
  id: 6,
  name: '哥布林王',
  type: 'boss',
  boardSize: 8,
  colorCount: 5,
  moves: 35,
  enemy: {
    name: '哥布林王',
    hp: 300,
    attack: 15,
    attackInterval: 5
  },
  phases: [
    {
      hpBelowPercent: 70,
      enemyAttackInterval: 4
    },
    {
      hpBelowPercent: 40,
      enemyAttackInterval: 3,
      effect: 'spawnObstacles'
    }
  ],
  blockWeights: {
    attack: 35,
    defense: 30,
    spell: 20,
    heal: 15
  },
  goal: {
    type: 'defeatEnemy'
  }
}
```

### 玩家體感

Boss 前半段讓玩家熟悉節奏，中段開始加速，最後階段讓盤面或敵人攻擊變得更有壓力。

---

## 第二階段：新增關卡類型

第一版 6 關完成後，可以再擴充以下關卡類型。

### 1. 限步擊殺關

限制步數，逼玩家提高每一步的價值。

適合條件：

- 步數較少。
- 敵人血量中高。
- 攻擊方塊權重正常或略低。

範例：

```js
{
  name: '盜賊伏擊',
  moves: 12,
  enemy: { name: '盜賊', hp: 120, attack: 8, attackInterval: 5 }
}
```

---

### 2. 防禦壓力關

敵人攻擊頻率高，玩家需要在敵人攻擊前累積防禦。

範例：

```js
{
  name: '狼騎兵突襲',
  moves: 25,
  enemy: { name: '狼騎兵', hp: 100, attack: 20, attackInterval: 3 },
  blockWeights: { attack: 25, defense: 45, spell: 15, heal: 15 }
}
```

---

### 3. 回血續戰關

敵人高頻小傷害，玩家需要善用回血維持血量。

範例：

```js
{
  name: '毒霧沼澤',
  moves: 30,
  enemy: { name: '毒霧怪', hp: 130, attack: 6, attackInterval: 2 },
  blockWeights: { attack: 30, defense: 15, spell: 15, heal: 40 }
}
```

---

### 4. 魔法爆發關

敵人血量高，鼓勵玩家存法術後開魔法爆發。

範例：

```js
{
  name: '古代魔像',
  moves: 30,
  enemy: { name: '古代魔像', hp: 260, attack: 8, attackInterval: 6 },
  blockWeights: { attack: 30, defense: 20, spell: 35, heal: 15 }
}
```

---

### 5. 特殊方塊解題關

關卡目標不是只看輸出，而是要求玩家製造或使用特殊方塊。

可能目標：

- 觸發 1 次炸彈。
- 觸發 2 次橫列或直行消除。
- 觸發 1 次同色全消。
- 只允許特殊方塊對敵人造成完整傷害。

範例：

```js
{
  name: '水晶核心',
  moves: 25,
  enemy: { name: '水晶核心', hp: 150, attack: 10, attackInterval: 5 },
  goal: {
    type: 'defeatEnemy',
    requiredSpecialActivations: 2
  }
}
```

---

## 第三階段：障礙物系統

障礙物可以讓關卡從單純調整數值，變成真正的盤面解題。

建議優先做三種障礙物。

### 1. 冰塊

規則：

- 覆蓋在普通方塊上。
- 該格方塊可以交換與消除。
- 消除該格方塊時，冰塊先破掉。
- 冰塊破掉後，下一次才真正清除方塊或正常下落。

適合用途：

- 早期障礙教學。
- 放在盤面角落，讓玩家學習清指定位置。

---

### 2. 石頭

規則：

- 不能交換。
- 不會下落。
- 不能被普通三消清除。
- 可以被炸彈、橫列、直行消除破壞。

適合用途：

- 中期解題關。
- Boss 低血量後生成障礙。

---

### 3. 鎖鏈

規則：

- 鎖住一個普通方塊。
- 被鎖住的方塊不能移動。
- 如果該方塊被消除，鎖鏈解除。

適合用途：

- 限制玩家交換路線。
- 做出需要先解鎖盤面的關卡。

---

## 第四階段：Roguelite 路線選擇

目前已有 battle、shop、rest 的路線概念。後續可以從線性 6 關升級成多路線選擇。

### 節點類型

| 節點 | 功能 |
|---|---|
| 普通戰鬥 | 基礎戰鬥，給少量金幣 |
| 菁英戰 | 更難，但給裝備或大量金幣 |
| 商店 | 花金幣買裝備 |
| 休息 | 回血或升級角色 |
| 事件 | 隨機獎勵或代價 |
| Boss | 章節結尾 |

### 範例路線

```text
第 1 層：普通戰鬥
第 2 層：普通戰鬥 / 商店
第 3 層：菁英戰 / 休息
第 4 層：普通戰鬥 / 事件
第 5 層：Boss
```

### 玩家選擇範例

- 血量低：走休息。
- 金幣多：走商店。
- 想拚高報酬：走菁英戰。
- 裝備強：走 Boss 前高風險路線。

---

## 第五階段：每日挑戰

每日挑戰適合在遊戲核心穩定後再做。

### 設計

- 每天使用固定 seed。
- 同一天所有玩家的關卡、敵人、盤面規則相同。
- 比較分數、剩餘步數、剩餘血量、通關時間。

### 範例

```js
{
  name: '今日挑戰：火焰洞窟',
  seed: '2026-06-18',
  boardSize: 8,
  colorCount: 5,
  enemySequence: ['火焰小鬼', '石像守衛', '火焰魔王'],
  modifier: {
    healWeightMultiplier: 0.5,
    fireBlockBonus: 1.5
  }
}
```

---

## 建議資料結構

建議新增：

```text
assets/match3/config/levels.js
```

第一版先支援以下欄位即可：

```js
const LEVELS = [
  {
    id: 1,
    name: '史萊姆訓練',
    type: 'battle',
    boardSize: 6,
    colorCount: 3,
    moves: 15,
    enemy: {
      name: '史萊姆',
      hp: 40,
      attack: 0,
      attackInterval: 999
    },
    blockWeights: {
      attack: 45,
      defense: 25,
      spell: 15,
      heal: 15
    },
    goal: {
      type: 'defeatEnemy'
    }
  }
];

window.Match3Levels = { LEVELS };
```

### 第一版必要欄位

| 欄位 | 用途 |
|---|---|
| `id` | 關卡編號 |
| `name` | 關卡名稱 |
| `type` | battle / boss / shop / rest / event |
| `boardSize` | 棋盤大小 |
| `colorCount` | 使用幾種方塊 |
| `moves` | 可用步數 |
| `enemy.name` | 敵人名稱 |
| `enemy.hp` | 敵人血量 |
| `enemy.attack` | 敵人攻擊力 |
| `enemy.attackInterval` | 敵人攻擊頻率 |
| `blockWeights` | 各類方塊出現權重 |
| `goal.type` | 通關條件 |

---

## 建議開發順序

### Milestone 1：資料驅動關卡

- 新增 `assets/match3/config/levels.js`。
- 讓 `totalLevels` 讀 `LEVELS.length`。
- 讓每關可設定：
  - board size
  - color count
  - moves
  - enemy hp
  - enemy attack
  - enemy interval
  - block weights

### Milestone 2：6 關線性流程

- 實作 6 關固定流程。
- 每關有不同名稱、敵人與規則。
- 勝利後前往下一關。
- 第 6 關勝利後顯示通關。

### Milestone 3：Boss 階段

- Boss 根據 HP 百分比切換行為。
- 低血量時提高攻擊頻率。
- 後續可加入生成障礙物。

### Milestone 4：障礙物

優先順序：

1. 冰塊。
2. 石頭。
3. 鎖鏈。

### Milestone 5：分支路線

- 每層提供 2~3 個節點選擇。
- 加入普通戰鬥、菁英戰、商店、休息、事件、Boss。

### Milestone 6：每日挑戰與留存系統

- 固定 seed。
- 每日挑戰。
- 通關評分。
- 簡單成就。

---

## 第一個可執行任務建議

如果要讓 Codex 或後續開發工具接手，第一個任務可以這樣下：

> 請新增 `assets/match3/config/levels.js`，定義 6 個線性關卡。修改現有關卡流程，讓遊戲依照 `LEVELS` 的設定載入每關的 board size、color count、moves、enemy hp、enemy attack、enemy interval 與 block weights。請保留原本 debug options，但在一般模式下以關卡資料為主。

驗收條件：

- 開啟遊戲後顯示第 1 關「史萊姆訓練」。
- 擊敗敵人後能進入下一關。
- 每關敵人名稱、血量、攻擊力、步數都不同。
- 第 6 關擊敗 Boss 後顯示通關。
- 原本提示、特殊方塊、攻擊、防禦、法術、回血功能仍正常。
