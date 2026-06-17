(function (global) {
  const Match3Logic = {
    createBoard(size, colorCount) {
      let board;
      do {
        board = Array.from({ length: size }, () => Array.from({ length: size }, () => Math.floor(Math.random() * colorCount)));
      } while (this.findMatches(board).length > 0 || !this.findAvailableMove(board));
      return board;
    },

    cloneBoard(board) {
      return board.map(row => row.slice());
    },

    swap(board, a, b) {
      const next = this.cloneBoard(board);
      [next[a.r][a.c], next[b.r][b.c]] = [next[b.r][b.c], next[a.r][a.c]];
      return next;
    },

    areAdjacent(a, b) {
      return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
    },

    findMatches(board) {
      const matches = new Map();
      const size = board.length;
      const add = (r, c) => matches.set(`${r},${c}`, { r, c });

      for (let r = 0; r < size; r++) {
        let start = 0;
        for (let c = 1; c <= size; c++) {
          const current = c < size ? board[r][c] : Symbol('end');
          if (board[r][start] !== null && current === board[r][start]) continue;
          if (c - start >= 3 && board[r][start] !== null) {
            for (let x = start; x < c; x++) add(r, x);
          }
          start = c;
        }
      }

      for (let c = 0; c < size; c++) {
        let start = 0;
        for (let r = 1; r <= size; r++) {
          const current = r < size ? board[r][c] : Symbol('end');
          if (board[start][c] !== null && current === board[start][c]) continue;
          if (r - start >= 3 && board[start][c] !== null) {
            for (let y = start; y < r; y++) add(y, c);
          }
          start = r;
        }
      }

      return Array.from(matches.values());
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
            next[target][c] = board[r][c];
            if (target !== r) fallMoves.push({ from: { r, c }, to: { r: target, c }, distance: target - r });
            target--;
          }
        }
        for (let r = target; r >= 0; r--) {
          next[r][c] = Math.floor(Math.random() * colorCount);
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
      const values = board.flat();
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
