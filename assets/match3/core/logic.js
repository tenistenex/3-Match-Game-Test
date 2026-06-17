(function (global) {
  const SPECIAL_TYPES = {
    LINE_ROW: 'line-row',
    LINE_COLUMN: 'line-column',
    BOMB: 'bomb',
    COLOR: 'color'
  };

  function isSpecialBlock(value) {
    return value !== null && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'special');
  }

  function colorOf(value) {
    return isSpecialBlock(value) ? value.color : value;
  }

  function sameColor(a, b) {
    return a !== null && b !== null && colorOf(a) === colorOf(b);
  }

  function createNormalBlock(color) {
    return color;
  }

  function createSpecialBlock(color, special) {
    return { color, special };
  }

  const Match3Logic = {
    SPECIAL_TYPES,
    isSpecialBlock,
    colorOf,
    createSpecialBlock,

    createRandomBlock(colorCount) {
      return createNormalBlock(Math.floor(Math.random() * colorCount));
    },

    createBoard(size, colorCount) {
      let board;
      do {
        board = Array.from({ length: size }, () => Array.from({ length: size }, () => this.createRandomBlock(colorCount)));
      } while (this.findMatches(board).length > 0 || !this.findAvailableMove(board));
      return board;
    },

    cloneBlock(value) {
      return isSpecialBlock(value) ? { ...value } : value;
    },

    cloneBoard(board) {
      return board.map(row => row.map(value => this.cloneBlock(value)));
    },

    swap(board, a, b) {
      const next = this.cloneBoard(board);
      [next[a.r][a.c], next[b.r][b.c]] = [next[b.r][b.c], next[a.r][a.c]];
      return next;
    },

    areAdjacent(a, b) {
      return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
    },

    findMatchGroups(board) {
      const groups = [];
      const size = board.length;

      for (let r = 0; r < size; r++) {
        let start = 0;
        for (let c = 1; c <= size; c++) {
          const current = c < size ? board[r][c] : null;
          if (board[r][start] !== null && sameColor(current, board[r][start])) continue;
          if (c - start >= 3 && board[r][start] !== null) {
            groups.push({ orientation: 'row', color: colorOf(board[r][start]), cells: Array.from({ length: c - start }, (_, index) => ({ r, c: start + index })) });
          }
          start = c;
        }
      }

      for (let c = 0; c < size; c++) {
        let start = 0;
        for (let r = 1; r <= size; r++) {
          const current = r < size ? board[r][c] : null;
          if (board[start][c] !== null && sameColor(current, board[start][c])) continue;
          if (r - start >= 3 && board[start][c] !== null) {
            groups.push({ orientation: 'column', color: colorOf(board[start][c]), cells: Array.from({ length: r - start }, (_, index) => ({ r: start + index, c })) });
          }
          start = r;
        }
      }

      return groups;
    },

    findMatches(board) {
      const matches = new Map();
      this.findMatchGroups(board).forEach(group => group.cells.forEach(({ r, c }) => matches.set(`${r},${c}`, { r, c })));
      return Array.from(matches.values());
    },

    getSpecialForGroup(group) {
      if (group.cells.length >= 5) return SPECIAL_TYPES.COLOR;
      if (group.cells.length === 4) return group.orientation === 'row' ? SPECIAL_TYPES.LINE_ROW : SPECIAL_TYPES.LINE_COLUMN;
      return null;
    },

    collapse(board, colorCount) {
      const size = board.length;
      const next = Array.from({ length: size }, () => Array(size).fill(null));
      const fallMoves = [];
      const spawnMoves = [];

      for (let c = 0; c < size; c++) {
        let target = size - 1;
        for (let r = size - 1; r >= 0; r--) {
          if (board[r][c] !== null) {
            next[target][c] = this.cloneBlock(board[r][c]);
            if (target !== r) fallMoves.push({ from: { r, c }, to: { r: target, c }, distance: target - r });
            target--;
          }
        }
        for (let r = target; r >= 0; r--) {
          next[r][c] = this.createRandomBlock(colorCount);
          spawnMoves.push({ to: { r, c }, distance: r + 1 });
        }
      }

      return { board: next, fallMoves, spawnMoves };
    },

    findAvailableMove(board) {
      const size = board.length;
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          for (const next of [{ r: r + 1, c }, { r, c: c + 1 }]) {
            if (next.r >= size || next.c >= size) continue;
            const swapped = this.swap(board, { r, c }, next);
            if (this.findMatches(swapped).length > 0) return [{ r, c }, next];
          }
        }
      }
      return null;
    },

    shuffleBoard(board) {
      const size = board.length;
      const values = board.flat().map(value => this.cloneBlock(value));
      let next;
      do {
        for (let i = values.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [values[i], values[j]] = [values[j], values[i]];
        }
        next = Array.from({ length: size }, (_, r) => values.slice(r * size, (r + 1) * size));
      } while (this.findMatches(next).length > 0 || !this.findAvailableMove(next));
      return next;
    }
  };

  global.Match3Logic = Match3Logic;
})(window);
